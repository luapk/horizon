import type { BrandConfig, ScanProgress, ScanResult, Signal } from "@horizon/shared";
import { UsageTracker, buildProviders } from "../providers/index.js";
import { runIngest, type RawDoc } from "./ingest.js";
import { runExtract } from "./extract.js";
import { dedupeSignals, clusterSignals } from "./cluster.js";
import { runGapAnalysis } from "./gaps.js";
import { synthesizeDrivers } from "./drivers.js";
import { generateScenarioBatch } from "./scenarios.js";
import { buildMatrix } from "./matrix.js";
import { buildTimeline } from "./timeline.js";

/** The pipeline as a resumable state machine. Each call to advanceScan runs
 * exactly ONE bounded stage (a minute or two at most, well inside any
 * serverless function limit) and returns the updated scan with its checkpoint
 * pointing at the next stage. The client's poll loop keeps calling the step
 * endpoint until the scan is terminal -- so there is no background execution,
 * no single long-lived request, and an interrupted scan resumes from its last
 * completed stage instead of hanging or losing paid-for work. */

export interface Checkpoint {
  stage: "ingest" | "extract" | "analyze" | "drivers" | "scenarios" | "finish";
  docs?: RawDoc[];
  rawSignals?: Signal[];
  scenariosAttempted?: number;
  /** Consecutive failed step attempts; the route fails the scan at 3. */
  failuresInARow?: number;
  /** Step lock: set while an invocation is executing a stage so a concurrent
   * step call (second tab, double poll) doesn't duplicate paid work. */
  lockedAt?: string;
  lockToken?: string;
}

/** How many scenario LLM calls one step performs. Small enough that a step
 * stays comfortably inside the function limit even on the Deep tier. */
const SCENARIOS_PER_STEP = 3;

export function readCheckpoint(scan: ScanResult): Checkpoint {
  const cp = scan.checkpoint as Checkpoint | undefined;
  return cp && typeof cp === "object" && "stage" in cp ? cp : { stage: "ingest" };
}

/** One progress line per stage, updated in place, so the client's progress
 * panel reads as a checklist rather than an append-only log. */
function setProgress(progress: ScanProgress[], stage: ScanProgress["stage"], status: ScanProgress["status"], detail?: string): ScanProgress[] {
  const next = progress.filter((p) => p.stage !== stage);
  next.push({ stage, status, detail });
  return next;
}

export async function advanceScan(scan: ScanResult, brand: BrandConfig): Promise<{ scan: ScanResult; done: boolean }> {
  const providers = buildProviders();
  const usage = new UsageTracker(scan.usage);
  const cp = readCheckpoint(scan);
  let progress = [...scan.progress];
  const scope = scan.scope;

  console.log(`[scan ${scan.id}] step: ${cp.stage}`);
  let next: Checkpoint | undefined;
  let done = false;
  const updates: Partial<ScanResult> = {};

  switch (cp.stage) {
    case "ingest": {
      progress = setProgress(progress, "ingest", "in_progress");
      const docs = await runIngest(brand, scope, providers, usage);
      progress = setProgress(progress, "ingest", "done", `${docs.length} documents retrieved`);
      next = { stage: "extract", docs };
      break;
    }
    case "extract": {
      const { signals: rawSignals, failedDocs } = await runExtract(cp.docs ?? [], brand, providers, usage);
      progress = setProgress(progress, "extract", "done", `${rawSignals.length} signals extracted${failedDocs > 0 ? `, ${failedDocs} docs skipped` : ""}`);
      next = { stage: "analyze", rawSignals };
      break;
    }
    case "analyze": {
      const raw = cp.rawSignals ?? [];
      const deduped = await dedupeSignals(raw, providers, usage);
      progress = setProgress(progress, "dedupe_cluster", "done", `${raw.length - deduped.length} duplicates removed`);
      const gapSignals = await runGapAnalysis(brand, deduped, providers, usage);
      const signals = [...deduped, ...gapSignals];
      progress = setProgress(
        progress, "gap_analysis", "done",
        `${gapSignals.filter((s) => s.type === "Absence").length} absence + ${gapSignals.filter((s) => s.type === "Counter-Signal").length} counter-signals derived`
      );
      const { clusters } = await clusterSignals(signals, scope.driverCount, providers, usage);
      updates.signals = signals;
      updates.clusters = clusters;
      next = { stage: "drivers" };
      break;
    }
    case "drivers": {
      const drivers = await synthesizeDrivers(scan.clusters, scan.signals, providers, usage);
      progress = setProgress(progress, "cluster_name", "done");
      progress = setProgress(progress, "driver_synthesis", "done", `${drivers.length} drivers synthesized`);
      updates.drivers = drivers;
      next = { stage: "scenarios", scenariosAttempted: 0 };
      break;
    }
    case "scenarios": {
      const from = cp.scenariosAttempted ?? 0;
      const to = Math.min(from + SCENARIOS_PER_STEP, scope.scenarioCount);
      const { scenarios: batch } = await generateScenarioBatch(
        brand, scan.drivers, scan.signals, scope.scenarioCount, from, to, providers, usage
      );
      const scenarios = [...scan.scenarios, ...batch].map((s, k) => ({ ...s, id: k + 1 }));
      updates.scenarios = scenarios;
      if (to >= scope.scenarioCount) {
        if (scenarios.length === 0) throw new Error("all scenarios failed to generate");
        progress = setProgress(progress, "scenario_generation", "done", `${scenarios.length} scenarios generated`);
        next = { stage: "finish" };
      } else {
        progress = setProgress(progress, "scenario_generation", "in_progress", `${scenarios.length}/${scope.scenarioCount} scenarios written`);
        next = { stage: "scenarios", scenariosAttempted: to };
      }
      break;
    }
    case "finish": {
      const scenarios = scan.scenarios;
      updates.matrix = scope.includeMatrix ? await buildMatrix(brand, scenarios, providers, usage) : [];
      updates.timeline = buildTimeline(scenarios);
      progress = setProgress(progress, "matrix_timeline", "done");
      updates.completedAt = new Date().toISOString();
      next = undefined;
      done = true;
      break;
    }
  }

  const result: ScanResult = {
    ...scan,
    ...updates,
    status: done ? "completed" : "running",
    usage: usage.all(),
    actualCostUsd: usage.totalUsd(),
    progress,
    lastStepAt: new Date().toISOString(),
    checkpoint: next,
  };
  console.log(`[scan ${scan.id}] step ${cp.stage} done -> ${next?.stage ?? "completed"} ($${result.actualCostUsd?.toFixed(3)})`);
  return { scan: result, done };
}
