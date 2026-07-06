import { Router } from "express";
import { randomUUID } from "node:crypto";
import { BrandConfig, ScanScope, estimateScanCost, type ScanResult } from "@horizon/shared";
import { requireAuth, verifyPassword, issueSessionCookie, clearSessionCookie } from "./auth.js";
import { saveBrand, getBrand, listBrands, saveScan, getScan, listScans, storageBackend } from "./db.js";
import { buildProviders } from "./providers/index.js";
import { runScan } from "./pipeline/run.js";

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

/** On serverless a scan orphaned by a killed instance would show "running"
 * forever (there is no boot sweep). Anything unfinished past the platform's
 * max function duration cannot still be alive — surface it as failed. */
const STALE_SCAN_MS = 20 * 60 * 1000;
async function withStaleGuard(scan: ScanResult): Promise<ScanResult> {
  const stale =
    (scan.status === "pending" || scan.status === "running") &&
    Date.now() - new Date(scan.createdAt).getTime() > STALE_SCAN_MS;
  if (!stale) return scan;
  const failed: ScanResult = { ...scan, status: "failed", error: "scan timed out or was interrupted" };
  await saveScan(failed);
  return failed;
}

/** Runs the full pipeline for a claimed scan, persisting progress as it goes so
 * GET /scans/:id reflects live status. Saves are read-modify-write against async
 * storage, so serialize them -- otherwise a progress save that read the scan
 * mid-flight can land after the final result save and clobber a terminal state.
 * Returns the finished scan. */
async function executeScan(id: string, brand: BrandConfig, scope: ScanScope): Promise<ScanResult> {
  const providers = buildProviders();
  const progress: { stage: string; status: string; detail?: string }[] = [];
  let saveChain: Promise<unknown> = Promise.resolve();
  const enqueueSave = (fn: () => Promise<unknown>) => {
    saveChain = saveChain.then(fn, fn);
    return saveChain;
  };
  console.log(`[scan ${id}] execute (scope: ${scope.sourceQueries}q x ${scope.docsPerQuery}d, ${scope.driverCount} drivers, ${scope.scenarioCount} scenarios)`);

  let final: ScanResult;
  try {
    final = await runScan(id, brand, scope, providers, (stage, status, detail) => {
      console.log(`[scan ${id}] ${stage}:${status}${detail ? ` -- ${detail}` : ""}`);
      progress.push({ stage, status, detail });
      void enqueueSave(async () => {
        const current = await getScan(id);
        if (current && current.status !== "completed" && current.status !== "failed") {
          await saveScan({ ...current, status: "running", progress: progress as never });
        }
      });
    });
    console.log(`[scan ${id}] complete: ${final.status}, $${final.actualCostUsd?.toFixed(3)}`);
    final = { ...final, progress: progress as never };
  } catch (err) {
    console.error(`[scan ${id}] pipeline error:`, err);
    const current = await getScan(id);
    final = {
      ...(current ?? ({ id, brandId: brand.id } as ScanResult)),
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      progress: progress as never,
    };
  }
  await enqueueSave(() => saveScan(final));
  await saveChain;
  return final;
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
  res.status(202).json(pending);
});

/** Runs a pending scan's pipeline synchronously. The client fires this without
 * awaiting and keeps the request open; an in-flight request is guaranteed to
 * keep the serverless instance alive for the whole pipeline (up to the function
 * maxDuration), which post-response waitUntil is not. Progress is read via the
 * GET poll. Idempotent: a scan already past "pending" returns immediately. */
router.post("/scans/:id/run", async (req, res) => {
  const scan = await getScan(req.params.id);
  if (!scan) { res.status(404).json({ error: "not found" }); return; }
  if (scan.status !== "pending") { res.json({ ok: true, status: scan.status }); return; }
  const brand = await getBrand(scan.brandId);
  if (!brand) { res.status(404).json({ error: "brand not found" }); return; }

  // Claim it so a duplicate /run (double-fire, retry) can't start a second pass.
  await saveScan({ ...scan, status: "running" });
  const final = await executeScan(scan.id, brand, scan.scope);
  res.json({ ok: true, status: final.status });
});

router.get("/scans", async (req, res) => {
  const brandId = typeof req.query.brandId === "string" ? req.query.brandId : undefined;
  res.json(await Promise.all((await listScans(brandId)).map(withStaleGuard)));
});

router.get("/scans/:id", async (req, res) => {
  const scan = await getScan(req.params.id);
  if (!scan) { res.status(404).json({ error: "not found" }); return; }
  res.json(await withStaleGuard(scan));
});
