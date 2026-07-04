import { ScanScope, CostEstimate } from "./schema.js";
import {
  DEFAULT_EXTRACTION_MODEL,
  DEFAULT_SYNTHESIS_MODEL,
  llmCostUsd,
  embeddingCostUsd,
  searchCostUsd,
} from "./pricing.js";

/** Rough token shapes per pipeline stage, used only to project a pre-scan
 * range. Real usage is measured and reported per-call at run time -- this
 * function never claims to be exact, only a range driven by scan scope. */
const AVG_DOC_TOKENS = 1200;
const EXTRACTION_OUTPUT_TOKENS_PER_DOC = 220;
const DRIVER_SYNTH_INPUT_TOKENS_PER_DRIVER = 1800;
const DRIVER_SYNTH_OUTPUT_TOKENS_PER_DRIVER = 500;
const SCENARIO_INPUT_TOKENS = 2200;
const SCENARIO_OUTPUT_TOKENS = 1400;
const MATRIX_INPUT_TOKENS = 3000;
const MATRIX_OUTPUT_TOKENS = 900;

/** Low/high bounds come from the two real unknowns: how many documents a
 * query actually returns (0..docsPerQuery) and how much the LLM stages vary
 * in practice (+/-35%). */
export function estimateScanCost(scope: ScanScope): CostEstimate {
  const docsLow = scope.sourceQueries * 1;
  const docsHigh = scope.sourceQueries * scope.docsPerQuery;

  const ingestLow = searchCostUsd(scope.sourceQueries);
  const ingestHigh = searchCostUsd(scope.sourceQueries);

  const extractLow = docsLow * (
    llmCostUsd(DEFAULT_EXTRACTION_MODEL, AVG_DOC_TOKENS, EXTRACTION_OUTPUT_TOKENS_PER_DOC)
  );
  const extractHigh = docsHigh * (
    llmCostUsd(DEFAULT_EXTRACTION_MODEL, AVG_DOC_TOKENS, EXTRACTION_OUTPUT_TOKENS_PER_DOC) * 1.35
  );

  const embedTokensLow = docsLow * AVG_DOC_TOKENS;
  const embedTokensHigh = docsHigh * AVG_DOC_TOKENS;
  const clusterLow = embeddingCostUsd(embedTokensLow);
  const clusterHigh = embeddingCostUsd(embedTokensHigh);

  const clusterNameLow = scope.driverCount * llmCostUsd(DEFAULT_EXTRACTION_MODEL, 800, 60);
  const clusterNameHigh = scope.driverCount * llmCostUsd(DEFAULT_EXTRACTION_MODEL, 800, 60) * 1.35;

  const driverLow = scope.driverCount * llmCostUsd(
    DEFAULT_SYNTHESIS_MODEL, DRIVER_SYNTH_INPUT_TOKENS_PER_DRIVER, DRIVER_SYNTH_OUTPUT_TOKENS_PER_DRIVER
  );
  const driverHigh = driverLow * 1.35;

  const scenarioLow = scope.scenarioCount * llmCostUsd(DEFAULT_SYNTHESIS_MODEL, SCENARIO_INPUT_TOKENS, SCENARIO_OUTPUT_TOKENS);
  const scenarioHigh = scenarioLow * 1.35;

  const matrixLow = scope.includeMatrix ? llmCostUsd(DEFAULT_SYNTHESIS_MODEL, MATRIX_INPUT_TOKENS, MATRIX_OUTPUT_TOKENS) : 0;
  const matrixHigh = matrixLow * 1.35;

  const byStage = [
    { stage: "ingest (search)", lowUsd: round(ingestLow), highUsd: round(ingestHigh) },
    { stage: "extract (LLM)", lowUsd: round(extractLow), highUsd: round(extractHigh) },
    { stage: "dedupe/cluster (embeddings)", lowUsd: round(clusterLow), highUsd: round(clusterHigh) },
    { stage: "cluster naming (LLM)", lowUsd: round(clusterNameLow), highUsd: round(clusterNameHigh) },
    { stage: "driver synthesis (LLM)", lowUsd: round(driverLow), highUsd: round(driverHigh) },
    { stage: "scenario generation (LLM)", lowUsd: round(scenarioLow), highUsd: round(scenarioHigh) },
    { stage: "strategic matrix (LLM)", lowUsd: round(matrixLow), highUsd: round(matrixHigh) },
  ];

  return {
    lowUsd: round(byStage.reduce((s, b) => s + b.lowUsd, 0)),
    highUsd: round(byStage.reduce((s, b) => s + b.highUsd, 0)),
    byStage,
    assumptions: {
      docsAssumedLow: docsLow,
      docsAssumedHigh: docsHigh,
      extractionModel: DEFAULT_EXTRACTION_MODEL,
      synthesisModel: DEFAULT_SYNTHESIS_MODEL,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
