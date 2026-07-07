import { z } from "zod";

export const SteepCategory = z.enum(["S", "T", "Ec", "En", "P"]);
export type SteepCategory = z.infer<typeof SteepCategory>;

export const SignalType = z.enum(["Positive", "Negative", "Absence", "Counter-Signal"]);
export type SignalType = z.infer<typeof SignalType>;

export const Confidence = z.enum(["Verified", "Probable", "Contested"]);
export type Confidence = z.infer<typeof Confidence>;

/** A brand is the customer this scan is run for -- generic replacement for the
 * hardcoded "Mars Pet Care" strings in the v3.0 prototype. */
export const BrandConfig = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  description: z.string(),
  businessUnits: z.array(z.string()).min(1),
  competitors: z.array(z.string()).default([]),
  geographies: z.array(z.string()).min(1),
  /** Trusted domains (trade press, regulators, journals). When non-empty,
   * most ingestion queries are restricted to these; a smaller open-web
   * sweep still runs for surprises. */
  curatedSources: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});
export type BrandConfig = z.infer<typeof BrandConfig>;

/** Tunable knobs that determine both scan depth and pre-scan cost estimate. */
export const ScanScope = z.object({
  sourceQueries: z.number().int().min(1).max(60).default(20),
  docsPerQuery: z.number().int().min(1).max(20).default(6),
  driverCount: z.number().int().min(3).max(15).default(9),
  scenarioCount: z.number().int().min(3).max(15).default(9),
  includeMatrix: z.boolean().default(true),
});
export type ScanScope = z.infer<typeof ScanScope>;

export const Signal = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  geo: z.string(),
  category: SteepCategory,
  surprise: z.number().int().min(1).max(3),
  confidence: Confidence,
  type: SignalType,
  source: z.string(),
  summary: z.string(),
  soWhat: z.string(),
  publishedAt: z.string().datetime().optional(),
});
export type Signal = z.infer<typeof Signal>;

export const Cluster = z.object({
  id: z.string(),
  label: z.string(),
  signalIds: z.array(z.string()).min(1),
  method: z.enum(["embedding", "llm-named"]),
  coherence: z.number().min(0).max(1).optional(),
});
export type Cluster = z.infer<typeof Cluster>;

export const Driver = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  steep: SteepCategory,
  trajectory: z.enum(["Accelerating", "Nascent", "Stable", "Declining"]),
  signalIds: z.array(z.string()),
  clusterIds: z.array(z.string()),
});
export type Driver = z.infer<typeof Driver>;

export const ScenarioTier = z.enum(["Probable", "Deep", "Cassandra"]);
export type ScenarioTier = z.infer<typeof ScenarioTier>;

export const Scenario = z.object({
  id: z.number().int(),
  tier: ScenarioTier,
  title: z.string(),
  tagline: z.string(),
  driverIds: z.array(z.string()),
  confidence: Confidence,
  dispatch: z.string(),
  shadow: z.string(),
  killerAssumption: z.string(),
  /** Signal IDs the dispatch actually cites -- the evidence trail. Empty
   * means the narrative is ungrounded and should be treated as such. */
  citedSignalIds: z.array(z.string()).default([]),
  /** Concrete recommended actions; these feed the timeline instead of
   * repeating the scenario title. */
  actions: z.array(z.object({
    label: z.string(),
    lane: z.enum(["now", "monitor", "prepare"]),
  })).default([]),
  dimensions: z.object({
    discoverability: z.number().min(0).max(100),
    appeal: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    availability: z.number().min(0).max(100),
  }),
});
export type Scenario = z.infer<typeof Scenario>;

export const MatrixCellType = z.enum(["opp", "threat", "mon"]);
export type MatrixCellType = z.infer<typeof MatrixCellType>;

export const MatrixRow = z.object({
  businessUnit: z.string(),
  scores: z.array(z.number().int().min(1).max(4)),
  types: z.array(MatrixCellType),
});
export type MatrixRow = z.infer<typeof MatrixRow>;

export const TimelineLane = z.enum(["now", "monitor", "prepare"]);
export type TimelineLane = z.infer<typeof TimelineLane>;

export const TimelineItem = z.object({
  label: z.string(),
  lane: TimelineLane,
  year: z.number().int(),
  scenarioId: z.number().int(),
});
export type TimelineItem = z.infer<typeof TimelineItem>;

/** Per-call usage a provider reports back, used to build the actual-cost total. */
export const UsageEvent = z.object({
  stage: z.enum(["query_design", "ingest", "extract", "dedupe_cluster", "gap_analysis", "cluster_name", "driver_synthesis", "scenario_generation", "matrix_timeline"]),
  provider: z.enum(["search", "llm", "embedding"]),
  model: z.string().optional(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  calls: z.number().int().min(0).default(1),
  costUsd: z.number().min(0),
});
export type UsageEvent = z.infer<typeof UsageEvent>;

export const CostBreakdown = z.object({
  stage: z.string(),
  lowUsd: z.number().min(0),
  highUsd: z.number().min(0),
});
export type CostBreakdown = z.infer<typeof CostBreakdown>;

export const CostEstimate = z.object({
  lowUsd: z.number().min(0),
  highUsd: z.number().min(0),
  byStage: z.array(CostBreakdown),
  assumptions: z.record(z.string(), z.union([z.string(), z.number()])),
});
export type CostEstimate = z.infer<typeof CostEstimate>;

export const ScanStatus = z.enum(["pending", "running", "completed", "failed"]);
export type ScanStatus = z.infer<typeof ScanStatus>;

export const ScanProgress = z.object({
  stage: UsageEvent.shape.stage,
  status: z.enum(["pending", "in_progress", "done", "failed"]),
  detail: z.string().optional(),
});
export type ScanProgress = z.infer<typeof ScanProgress>;

export const ScanResult = z.object({
  id: z.string(),
  brandId: z.string(),
  status: ScanStatus,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  scope: ScanScope,
  estimate: CostEstimate,
  actualCostUsd: z.number().min(0).optional(),
  usage: z.array(UsageEvent).default([]),
  progress: z.array(ScanProgress).default([]),
  signals: z.array(Signal).default([]),
  clusters: z.array(Cluster).default([]),
  drivers: z.array(Driver).default([]),
  scenarios: z.array(Scenario).default([]),
  matrix: z.array(MatrixRow).default([]),
  timeline: z.array(TimelineItem).default([]),
  error: z.string().optional(),
  /** Server-side resumable-pipeline state (intermediate docs/signals, next
   * stage, step lock). Never sent to clients -- stripped in the API layer. */
  checkpoint: z.unknown().optional(),
  /** When the pipeline last advanced a step; drives staleness detection. */
  lastStepAt: z.string().optional(),
});
export type ScanResult = z.infer<typeof ScanResult>;
