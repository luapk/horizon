import { Router } from "express";
import { randomUUID } from "node:crypto";
import { BrandConfig, ScanScope, estimateScanCost } from "@horizon/shared";
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

router.post("/brands", (req, res) => {
  const parsed = BrandConfig.omit({ id: true, createdAt: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const brand: BrandConfig = { ...parsed.data, id: randomUUID(), createdAt: new Date().toISOString() };
  saveBrand(brand);
  res.status(201).json(brand);
});

router.get("/brands", (_req, res) => {
  res.json(listBrands());
});

router.get("/brands/:id", (req, res) => {
  const brand = getBrand(req.params.id);
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

router.post("/scans", (req, res) => {
  const brand = getBrand(req.body?.brandId);
  if (!brand) { res.status(404).json({ error: "brand not found" }); return; }
  const scope = ScanScope.parse(req.body?.scope ?? {});

  const id = randomUUID();
  const pending = {
    id,
    brandId: brand.id,
    status: "pending" as const,
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
  saveScan(pending);
  res.status(202).json(pending);

  // Fire-and-forget: run the pipeline in the background, persisting progress
  // as it goes so GET /scans/:id reflects live status.
  const providers = buildProviders();
  const progress: { stage: string; status: string; detail?: string }[] = [];
  runScan(id, brand, scope, providers, (stage, status, detail) => {
    progress.push({ stage, status, detail });
    const current = getScan(id);
    if (current) saveScan({ ...current, status: "running", progress: progress as never });
  })
    .then((result) => saveScan({ ...result, progress: progress as never }))
    .catch((err) => {
      saveScan({ ...pending, status: "failed", error: err instanceof Error ? err.message : String(err), progress: progress as never });
    });
});

router.get("/scans", (req, res) => {
  const brandId = typeof req.query.brandId === "string" ? req.query.brandId : undefined;
  res.json(listScans(brandId));
});

router.get("/scans/:id", (req, res) => {
  const scan = getScan(req.params.id);
  if (!scan) { res.status(404).json({ error: "not found" }); return; }
  res.json(scan);
});
