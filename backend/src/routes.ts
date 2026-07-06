import { Router } from "express";
import { randomUUID } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { BrandConfig, ScanScope, estimateScanCost, type ScanResult } from "@horizon/shared";
import { requireAuth, verifyPassword, issueSessionCookie, clearSessionCookie } from "./auth.js";
import { saveBrand, getBrand, listBrands, saveScan, getScan, listScans } from "./db.js";
import { buildProviders } from "./providers/index.js";
import { runScan } from "./pipeline/run.js";

export const router = Router();

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
  const brand: BrandConfig = { ...parsed.data, id: randomUUID(), createdAt: new Date().toISOString() };
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

router.post("/scans", async (req, res) => {
  const brand = await getBrand(req.body?.brandId);
  if (!brand) { res.status(404).json({ error: "brand not found" }); return; }
  const scope = ScanScope.parse(req.body?.scope ?? {});

  const capViolation = await spendCapViolation(estimateScanCost(scope).highUsd);
  if (capViolation) { res.status(403).json({ error: capViolation }); return; }

  const id = randomUUID();
  const pending: ScanResult = {
    id,
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

  // Run the pipeline in the background, persisting progress as it goes so
  // GET /scans/:id reflects live status. waitUntil keeps the serverless
  // instance alive after the response; locally it is a no-op and the
  // long-lived process carries the promise anyway.
  const providers = buildProviders();
  const progress: { stage: string; status: string; detail?: string }[] = [];
  // Saves are read-modify-write against async storage, so serialize them —
  // otherwise a progress save that read the scan mid-flight can land after
  // the final result save and clobber "completed" back to "running".
  let saveChain: Promise<unknown> = Promise.resolve();
  const enqueueSave = (fn: () => Promise<unknown>) => {
    saveChain = saveChain.then(fn, fn);
    return saveChain;
  };
  const pipeline = runScan(id, brand, scope, providers, (stage, status, detail) => {
    progress.push({ stage, status, detail });
    void enqueueSave(async () => {
      const current = await getScan(id);
      if (current && current.status !== "completed" && current.status !== "failed") {
        await saveScan({ ...current, status: "running", progress: progress as never });
      }
    });
  })
    .then((result) => enqueueSave(() => saveScan({ ...result, progress: progress as never })))
    .catch((err) =>
      enqueueSave(() =>
        saveScan({ ...pending, status: "failed", error: err instanceof Error ? err.message : String(err), progress: progress as never })
      )
    );
  waitUntil(pipeline.then(() => saveChain));
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
