import { estimateScanCost, type BrandConfig, type ScanResult, type ScanScope } from "@horizon/shared";
import { UsageTracker, type Providers } from "../providers/index.js";
import { runIngest } from "./ingest.js";
import { runExtract } from "./extract.js";
import { dedupeSignals, clusterSignals } from "./cluster.js";
import { synthesizeDrivers } from "./drivers.js";
import { generateScenarios } from "./scenarios.js";
import { buildMatrix } from "./matrix.js";
import { buildTimeline } from "./timeline.js";

export type ProgressCallback = (stage: string, status: "in_progress" | "done" | "failed", detail?: string) => void;

export async function runScan(
  id: string,
  brand: BrandConfig,
  scope: ScanScope,
  providers: Providers,
  onProgress: ProgressCallback
): Promise<ScanResult> {
  const usage = new UsageTracker();
  const estimate = estimateScanCost(scope);

  try {
    onProgress("ingest", "in_progress");
    const docs = await runIngest(brand, scope, providers, usage);
    onProgress("ingest", "done", `${docs.length} documents retrieved`);

    onProgress("extract", "in_progress");
    const rawSignals = await runExtract(docs, brand, providers, usage);
    onProgress("extract", "done", `${rawSignals.length} signals extracted`);

    onProgress("dedupe_cluster", "in_progress");
    const signals = await dedupeSignals(rawSignals, providers, usage);
    const { clusters } = await clusterSignals(signals, scope.driverCount, providers, usage);
    onProgress("dedupe_cluster", "done", `${rawSignals.length - signals.length} duplicates removed, ${clusters.length} clusters proposed`);

    onProgress("cluster_name", "in_progress");
    const drivers = await synthesizeDrivers(clusters, signals, providers, usage);
    onProgress("cluster_name", "done");
    onProgress("driver_synthesis", "done", `${drivers.length} drivers synthesized`);

    onProgress("scenario_generation", "in_progress");
    const scenarios = await generateScenarios(brand, drivers, scope.scenarioCount, providers, usage);
    onProgress("scenario_generation", "done", `${scenarios.length} scenarios generated`);

    let matrix: Awaited<ReturnType<typeof buildMatrix>> = [];
    if (scope.includeMatrix) {
      onProgress("matrix_timeline", "in_progress");
      matrix = await buildMatrix(brand, scenarios, providers, usage);
    }
    const timeline = buildTimeline(scenarios);
    onProgress("matrix_timeline", "done");

    return {
      id,
      brandId: brand.id,
      status: "completed",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scope,
      estimate,
      actualCostUsd: usage.totalUsd(),
      usage: usage.all(),
      progress: [],
      signals,
      clusters,
      drivers,
      scenarios,
      matrix,
      timeline,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onProgress("ingest", "failed", message);
    return {
      id,
      brandId: brand.id,
      status: "failed",
      createdAt: new Date().toISOString(),
      scope,
      estimate,
      actualCostUsd: usage.totalUsd(),
      usage: usage.all(),
      progress: [],
      signals: [],
      clusters: [],
      drivers: [],
      scenarios: [],
      matrix: [],
      timeline: [],
      error: message,
    };
  }
}
