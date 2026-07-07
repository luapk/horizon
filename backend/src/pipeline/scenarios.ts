import { DEFAULT_SYNTHESIS_MODEL, type BrandConfig, type Driver, type Scenario, type ScenarioTier, type Signal } from "@horizon/shared";
import { completeJson, mapWithConcurrency, type Providers, type UsageTracker } from "../providers/index.js";

const MAX_EVIDENCE_SIGNALS_PER_SCENARIO = 12;
/** How many scenario LLM calls run at once. Enough to collapse wall-clock,
 * conservative enough to stay well under Anthropic per-minute rate limits. */
const SCENARIO_CONCURRENCY = 4;

const SYSTEM = `You are a foresight analyst writing one scenario for a strategic futures report. You are given drivers AND the underlying evidence signals with IDs. Ground the narrative in that evidence.

Respond with JSON only:
{"title": string,
 "tagline": string (one punchy sentence),
 "dispatch": string (a 4-6 paragraph narrative vignette set a few years in the future, written like journalism. CRITICAL: every concrete fact -- company, statistic, regulation, product -- must come from the provided evidence signals, cited inline like [S-004]. Do NOT invent companies, numbers, or events not present in the evidence. Fictional characters experiencing the future are fine; fictional facts are not.),
 "shadow": string (2-3 sentences on the downside risk),
 "killerAssumption": string (1-2 sentences on what would invalidate this scenario),
 "confidence": "Verified"|"Probable"|"Contested" (Verified only if multiple Verified-confidence signals directly support the core claim; Contested if the evidence is thin or contradicted by counter-signals),
 "citedSignalIds": string[] (every signal ID actually cited in the dispatch),
 "actions": [{"label": string (a specific recommended action for the brand, not a restatement of the scenario), "lane": "now"|"monitor"|"prepare"}] (2-3 actions),
 "dimensions": {"discoverability": number 0-100, "appeal": number 0-100, "relevance": number 0-100, "availability": number 0-100}}`;

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

/** Evidence pack: the concrete signals behind the chosen drivers, surprise-
 * weighted so the most interesting evidence makes the cut when truncating. */
function evidenceFor(chosenDrivers: Driver[], signalsById: Map<string, Signal>): Signal[] {
  const ids = new Set(chosenDrivers.flatMap((d) => d.signalIds));
  return [...ids]
    .map((id) => signalsById.get(id))
    .filter((s): s is Signal => !!s)
    .sort((a, b) => b.surprise - a.surprise)
    .slice(0, MAX_EVIDENCE_SIGNALS_PER_SCENARIO);
}

export async function generateScenarios(
  brand: BrandConfig,
  drivers: Driver[],
  signals: Signal[],
  count: number,
  providers: Providers,
  usage: UsageTracker
): Promise<Scenario[]> {
  const { scenarios, failures } = await generateScenarioBatch(brand, drivers, signals, count, 0, count, providers, usage);
  if (scenarios.length === 0 && failures > 0) {
    throw new Error(`all ${failures} scenarios failed to generate`);
  }
  return scenarios.map((s, k) => ({ ...s, id: k + 1 }));
}

/** Generate scenarios for indices [fromIndex, toIndex) of a `totalCount`-sized
 * plan. Tier assignment is computed over the full plan so batches from a
 * resumable pipeline agree on which indices are Probable/Deep/Cassandra.
 * Per-scenario failures are skipped (counted), never thrown -- the corpus and
 * every other scenario have already been paid for. */
export async function generateScenarioBatch(
  brand: BrandConfig,
  drivers: Driver[],
  signals: Signal[],
  totalCount: number,
  fromIndex: number,
  toIndex: number,
  providers: Providers,
  usage: UsageTracker
): Promise<{ scenarios: Scenario[]; failures: number }> {
  const tiers = assignTiers(totalCount);
  const signalsById = new Map(signals.map((s) => [s.id, s]));

  // Each scenario is an independent LLM call -- generate them concurrently so
  // wall-clock is the slowest call, not the sum. Sequential generation was the
  // long pole that pushed scans past the serverless function time limit.
  const buildOne = async (i: number): Promise<{ index: number; scenario: Scenario }> => {
    const chosenDrivers = pickDrivers(drivers, i);
    const tier = tiers[i] ?? "Probable";
    const evidence = evidenceFor(chosenDrivers, signalsById);
    const evidenceBlock = evidence
      .map((s) => `${s.id} [${s.confidence}/${s.geo}] ${s.title} -- ${s.summary} (source: ${s.source}${s.url ? `, ${s.url}` : ""})`)
      .join("\n");

    const prompt = `Brand: ${brand.name} (${brand.industry}).\nScenario tier: ${tier} (${tier === "Cassandra" ? "a cautionary/adversarial scenario -- what breaks the brand's current strategy" : tier === "Deep" ? "a longer-horizon, less certain scenario" : "a near-term, well-evidenced scenario"}).\n\nDrivers to weave together:\n${chosenDrivers.map((d) => `- ${d.id} ${d.name}: ${d.desc}`).join("\n")}\n\nEvidence signals (cite these by ID; do not invent facts beyond them):\n${evidenceBlock}`;

    const parsed = await completeJson<{
      title: string;
      tagline: string;
      dispatch: string;
      shadow: string;
      killerAssumption: string;
      confidence: Scenario["confidence"];
      citedSignalIds: string[];
      actions: Scenario["actions"];
      dimensions: Scenario["dimensions"];
    }>(
      providers.llm,
      // Room for a 4-6 paragraph dispatch plus the other fields; too tight a
      // cap truncates the JSON mid-string and the response fails to parse.
      { system: SYSTEM, prompt, maxTokens: 3200, model: DEFAULT_SYNTHESIS_MODEL, kind: "scenario-gen" },
      (r) => usage.recordLlm("scenario_generation", r.model, r.inputTokens, r.outputTokens)
    );

    // Trust the dispatch text over the LLM's self-reported citation list,
    // and only keep IDs that exist in this scan.
    const citedInText = new Set([...(parsed.dispatch ?? "").matchAll(/\[?(S-\d{3})\]?/g)].map((m) => m[1]));
    for (const id of parsed.citedSignalIds ?? []) citedInText.add(id);
    const citedSignalIds = [...citedInText].filter((id) => signalsById.has(id));

    return {
      index: i,
      scenario: {
        id: i + 1, // provisional; renumbered contiguously after failures drop out
        tier,
        title: parsed.title,
        tagline: parsed.tagline,
        driverIds: chosenDrivers.map((d) => d.id),
        // An ungrounded narrative doesn't get to call itself anything better
        // than Contested, whatever the LLM claimed.
        confidence: citedSignalIds.length === 0 ? "Contested" : parsed.confidence,
        dispatch: parsed.dispatch,
        shadow: parsed.shadow,
        killerAssumption: parsed.killerAssumption,
        citedSignalIds,
        actions: (parsed.actions ?? []).slice(0, 3),
        dimensions: parsed.dimensions,
      },
    };
  };

  // A single malformed scenario must never fail the batch -- mapWith-
  // Concurrency collects failures instead of throwing, so the rest survive.
  const lo = Math.max(0, fromIndex);
  const hi = Math.min(totalCount, toIndex);
  const indices = Array.from({ length: Math.max(0, hi - lo) }, (_, k) => lo + k);
  const { results, failures } = await mapWithConcurrency(indices, SCENARIO_CONCURRENCY, (i) => buildOne(i));

  // Restore the tier ordering (probable-first) that concurrency scrambles.
  return {
    scenarios: results.sort((a, b) => a.index - b.index).map((r) => r.scenario),
    failures: failures.length,
  };
}
