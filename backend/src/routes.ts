import { Router } from "express";
import { randomUUID } from "node:crypto";
import { BrandConfig, ScanScope, estimateScanCost, type ScanResult } from "@horizon/shared";
import { requireAuth, verifyPassword, issueSessionCookie, clearSessionCookie } from "./auth.js";
import { saveBrand, getBrand, listBrands, saveScan, getScan, listScans, storageBackend } from "./db.js";
import { advanceScan } from "./pipeline/steps.js";

export const router = Router();

/** Unauthenticated liveness probe that also exercises the storage layer, so
 * a broken native module or unreachable Postgres surfaces here instead of as
 * a mystery 500 after login. Reports which backend is active, nothing else. */
router.get("/health", async (_req, res) => {
  try {
    await listBrands();
    res.json({ ok: true, storage: storageBackend });
  } catch (err) {
    res.status(500).json({ ok: false, storage: storageBackend, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/login", async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || !(await verifyPassword(password))) {
    res.status(401).json({ error: "invalid password" });
    return;
  }
  issueSessionCookie(res);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true });
});

router.use(requireAuth);

router.post("/brands", async (req, res) => {
  const parsed = BrandConfig.omit({ id: true, createdAt: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const brand = BrandConfig.parse({ ...parsed.data, id: randomUUID(), createdAt: new Date().toISOString() });
  await saveBrand(brand);
  res.status(201).json(brand);
});

router.get("/brands", async (_req, res) => {
  res.json(await listBrands());
});

router.get("/brands/:id", async (req, res) => {
  const brand = await getBrand(req.params.id);
  if (!brand) { res.status(404).json({ error: "not found" }); return; }
  res.json(brand);
});

router.post("/scans/estimate", (req, res) => {
  const parsed = ScanScope.partial().safeParse(req.body?.scope ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const scope = ScanScope.parse(parsed.data);
  res.json(estimateScanCost(scope));
});

/** Optional spend governance, off by default. MAX_SCAN_USD blocks any scan
 * whose high estimate exceeds it; MONTHLY_BUDGET_USD blocks new scans once
 * this month's committed spend (actuals for finished scans, high estimates
 * for in-flight ones) would exceed the budget. */
async function spendCapViolation(estimateHighUsd: number): Promise<string | null> {
  const maxScan = Number(process.env.MAX_SCAN_USD ?? 0);
  if (maxScan > 0 && estimateHighUsd > maxScan) {
    return `scan estimate high bound ($${estimateHighUsd.toFixed(2)}) exceeds the per-scan cap ($${maxScan.toFixed(2)}) -- reduce scan scope`;
  }
  const monthlyBudget = Number(process.env.MONTHLY_BUDGET_USD ?? 0);
  if (monthlyBudget > 0) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const committed = (await listScans())
      .filter((s) => new Date(s.createdAt) >= monthStart)
      .reduce((sum, s) => sum + (s.status === "completed" || s.status === "failed" ? (s.actualCostUsd ?? 0) : s.estimate.highUsd), 0);
    if (committed + estimateHighUsd > monthlyBudget) {
      return `monthly budget ($${monthlyBudget.toFixed(2)}) would be exceeded: $${committed.toFixed(2)} already committed this month + $${estimateHighUsd.toFixed(2)} for this scan`;
    }
  }
  return null;
}

/** Client-visible view of a scan: the resumable-pipeline checkpoint holds bulky
 * intermediate state (raw docs, unclustered signals) and is server-internal. */
function publicScan(scan: ScanResult): Omit<ScanResult, "checkpoint"> {
  const { checkpoint: _checkpoint, ...rest } = scan;
  return rest;
}

/** A scan whose pipeline hasn't advanced in this long has no live driver (the
 * page that was stepping it is gone) -- surface it as failed rather than
 * letting a client poll it indefinitely. Fresh activity is measured by
 * lastStepAt, so a long scan that IS advancing never trips this. */
const STALE_SCAN_MS = 10 * 60 * 1000;
function isStale(scan: ScanResult): boolean {
  const lastActivity = scan.lastStepAt ?? scan.createdAt;
  return (
    (scan.status === "pending" || scan.status === "running") &&
    Date.now() - new Date(lastActivity).getTime() > STALE_SCAN_MS
  );
}
async function withStaleGuard(scan: ScanResult): Promise<ScanResult> {
  if (!isStale(scan)) return scan;
  const failed: ScanResult = { ...scan, status: "failed", error: "scan was interrupted (no pipeline activity for 10 minutes)", checkpoint: undefined };
  await saveScan(failed);
  return failed;
}

/** How long a step lock is honored before it's presumed dead and stolen. Must
 * exceed the longest single stage under real providers. */
const STEP_LOCK_MS = 150 * 1000;

/** Advance a scan's pipeline by one bounded stage. Concurrency-safe via a
 * claim-then-verify lock in the checkpoint; a competing step call gets
 * {busy: true} instead of duplicating paid LLM work. Transient stage errors
 * leave the scan resumable and only fail it after 3 consecutive failures. */
async function stepOnce(id: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const scan = await getScan(id);
  if (!scan) return { status: 404, body: { error: "not found" } };
  if (scan.status === "completed" || scan.status === "failed") {
    return { status: 200, body: { done: true, status: scan.status } };
  }
  if (isStale(scan)) {
    const failed = await withStaleGuard(scan);
    return { status: 200, body: { done: true, status: failed.status } };
  }
  const brand = await getBrand(scan.brandId);
  if (!brand) return { status: 404, body: { error: "brand not found" } };

  const cp = (scan.checkpoint ?? {}) as { lockedAt?: string; lockToken?: string; failuresInARow?: number; stage?: string };
  if (cp.lockedAt && Date.now() - new Date(cp.lockedAt).getTime() < STEP_LOCK_MS) {
    return { status: 200, body: { done: false, busy: true, status: scan.status } };
  }

  // Claim, then re-read to verify the claim stuck (best-effort guard against
  // two instances claiming in the same instant).
  const token = randomUUID();
  await saveScan({
    ...scan,
    status: "running",
    lastStepAt: new Date().toISOString(),
    checkpoint: { stage: "ingest", ...cp, lockedAt: new Date().toISOString(), lockToken: token },
  });
  const claimed = await getScan(id);
  const claimedCp = (claimed?.checkpoint ?? {}) as { lockToken?: string };
  if (!claimed || claimedCp.lockToken !== token) {
    return { status: 200, body: { done: false, busy: true, status: claimed?.status ?? "running" } };
  }

  try {
    const { scan: next, done } = await advanceScan(claimed, brand);
    // Clear the lock (and any failure streak) on the way out.
    const nextCp = next.checkpoint as Record<string, unknown> | undefined;
    const released: ScanResult = {
      ...next,
      checkpoint: done || !nextCp ? undefined : { ...nextCp, lockedAt: undefined, lockToken: undefined, failuresInARow: undefined },
    };
    await saveScan(released);
    return { status: 200, body: { done, status: released.status } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scan ${id}] step error:`, message);
    const failures = (cp.failuresInARow ?? 0) + 1;
    const fatal = failures >= 3;
    await saveScan({
      ...claimed,
      status: fatal ? "failed" : "running",
      error: fatal ? message : undefined,
      lastStepAt: new Date().toISOString(),
      checkpoint: fatal ? undefined : { ...cp, failuresInARow: failures, lockedAt: undefined, lockToken: undefined },
    });
    return { status: 200, body: { done: fatal, status: fatal ? "failed" : "running", error: message } };
  }
}

router.post("/scans", async (req, res) => {
  const brand = await getBrand(req.body?.brandId);
  if (!brand) { res.status(404).json({ error: "brand not found" }); return; }
  const scope = ScanScope.parse(req.body?.scope ?? {});

  const capViolation = await spendCapViolation(estimateScanCost(scope).highUsd);
  if (capViolation) { res.status(403).json({ error: capViolation }); return; }

  const pending: ScanResult = {
    id: randomUUID(),
    brandId: brand.id,
    status: "pending",
    createdAt: new Date().toISOString(),
    scope,
    estimate: estimateScanCost(scope),
    usage: [],
    progress: [],
    signals: [],
    clusters: [],
    drivers: [],
    scenarios: [],
    matrix: [],
    timeline: [],
  };
  await saveScan(pending);
  res.status(202).json(publicScan(pending));
});

/** Advance the scan's pipeline by exactly one bounded stage. The client's
 * poll loop calls this repeatedly until {done: true} -- each call is short,
 * so no request ever fights a serverless duration limit, and an interrupted
 * scan resumes from its checkpoint on the next call. */
router.post("/scans/:id/step", async (req, res) => {
  const { status, body } = await stepOnce(req.params.id);
  res.status(status).json(body);
});

/** Back-compat for clients on an older bundle: run the pipeline to completion
 * within this request by stepping until done. */
router.post("/scans/:id/run", async (req, res) => {
  let last: Record<string, unknown> = {};
  for (let i = 0; i < 60; i++) {
    const { status, body } = await stepOnce(req.params.id);
    if (status !== 200) { res.status(status).json(body); return; }
    last = body;
    if (body.done) break;
    if (body.busy) await new Promise((r) => setTimeout(r, 2000));
  }
  res.json({ ok: true, status: last.status ?? "running" });
});

router.get("/scans", async (req, res) => {
  const brandId = typeof req.query.brandId === "string" ? req.query.brandId : undefined;
  const scans = await Promise.all((await listScans(brandId)).map(withStaleGuard));
  res.json(scans.map(publicScan));
});

router.get("/scans/:id", async (req, res) => {
  const scan = await getScan(req.params.id);
  if (!scan) { res.status(404).json({ error: "not found" }); return; }
  res.json(publicScan(await withStaleGuard(scan)));
});
