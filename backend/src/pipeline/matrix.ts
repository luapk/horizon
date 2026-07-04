import { DEFAULT_SYNTHESIS_MODEL, type BrandConfig, type MatrixRow, type Scenario } from "@horizon/shared";
import { completeJson, type Providers, type UsageTracker } from "../providers/index.js";

const SYSTEM = `You are a strategy analyst scoring cross-portfolio impact. Given one business unit and a list of scenarios, respond with JSON only:
{"scores": number[] (1-4 impact magnitude, one per scenario, in the given order), "types": ("opp"|"threat"|"mon")[] (one per scenario, in the given order)}`;

export async function buildMatrix(
  brand: BrandConfig,
  scenarios: Scenario[],
  providers: Providers,
  usage: UsageTracker
): Promise<MatrixRow[]> {
  const rows: MatrixRow[] = [];
  const scenarioList = scenarios.map((s, i) => `${i + 1}. ${s.title} -- ${s.tagline}`).join("\n");

  for (const businessUnit of brand.businessUnits) {
    const parsed = await completeJson<{ scores: number[]; types: MatrixRow["types"] }>(
      providers.llm,
      {
        system: SYSTEM,
        prompt: `Business unit: ${businessUnit}\nScenarios:\n${scenarioList}`,
        maxTokens: 300,
        model: DEFAULT_SYNTHESIS_MODEL,
        kind: "matrix-gen",
      },
      (r) => usage.recordLlm("matrix_timeline", r.model, r.inputTokens, r.outputTokens)
    );
    rows.push({ businessUnit, scores: parsed.scores, types: parsed.types });
  }

  return rows;
}
