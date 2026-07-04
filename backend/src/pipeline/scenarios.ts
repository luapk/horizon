import { DEFAULT_SYNTHESIS_MODEL, type BrandConfig, type Driver, type Scenario, type ScenarioTier } from "@horizon/shared";
import { extractJson, type Providers, type UsageTracker } from "../providers/index.js";

const SYSTEM = `You are a foresight analyst writing one scenario for a strategic futures report. Respond with JSON only:
{"title": string, "tagline": string (one punchy sentence), "dispatch": string (a 4-6 paragraph grounded narrative vignette set a few years in the future, written like a piece of journalism, citing the driver evidence naturalistically), "shadow": string (2-3 sentences on the downside risk), "killerAssumption": string (1-2 sentences on what would invalidate this scenario), "dimensions": {"discoverability": number 0-100, "appeal": number 0-100, "relevance": number 0-100, "availability": number 0-100}}`;

/** Proportions roughly mirror the original hand-authored report (5 Probable :
 * 3 Deep : 1 Cassandra out of 9) without hardcoding the count of 9. */
function assignTiers(count: number): ScenarioTier[] {
  const probableCount = Math.max(1, Math.round(count * 0.55));
  const cassandraCount = count >= 4 ? 1 : 0;
  const deepCount = Math.max(0, count - probableCount - cassandraCount);
  return [
    ...Array(probableCount).fill("Probable" as const),
    ...Array(deepCount).fill("Deep" as const),
    ...Array(cassandraCount).fill("Cassandra" as const),
  ];
}

function pickDrivers(drivers: Driver[], index: number): Driver[] {
  if (drivers.length <= 3) return drivers;
  const picked: Driver[] = [];
  for (let k = 0; k < 3; k++) picked.push(drivers[(index * 2 + k) % drivers.length]);
  return [...new Set(picked)];
}

export async function generateScenarios(
  brand: BrandConfig,
  drivers: Driver[],
  count: number,
  providers: Providers,
  usage: UsageTracker
): Promise<Scenario[]> {
  const tiers = assignTiers(count);
  const scenarios: Scenario[] = [];

  for (let i = 0; i < count; i++) {
    const chosenDrivers = pickDrivers(drivers, i);
    const tier = tiers[i] ?? "Probable";
    const prompt = `Brand: ${brand.name} (${brand.industry}).\nScenario tier: ${tier} (${tier === "Cassandra" ? "a cautionary/adversarial scenario" : tier === "Deep" ? "a longer-horizon, less certain scenario" : "a near-term, well-evidenced scenario"}).\nDrivers to weave together:\n${chosenDrivers.map((d) => `- ${d.name}: ${d.desc}`).join("\n")}`;

    const result = await providers.llm.complete({
      system: SYSTEM,
      prompt,
      maxTokens: 1400,
      model: DEFAULT_SYNTHESIS_MODEL,
      kind: "scenario-gen",
    });
    usage.recordLlm("scenario_generation", result.model, result.inputTokens, result.outputTokens);

    const parsed = extractJson<{
      title: string;
      tagline: string;
      dispatch: string;
      shadow: string;
      killerAssumption: string;
      dimensions: Scenario["dimensions"];
    }>(result.text);

    scenarios.push({
      id: i + 1,
      tier,
      title: parsed.title,
      tagline: parsed.tagline,
      driverIds: chosenDrivers.map((d) => d.id),
      confidence: tier === "Cassandra" ? "Contested" : tier === "Deep" ? "Probable" : "Verified",
      dispatch: parsed.dispatch,
      shadow: parsed.shadow,
      killerAssumption: parsed.killerAssumption,
      dimensions: parsed.dimensions,
    });
  }

  return scenarios;
}
