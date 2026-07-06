import { DEFAULT_SYNTHESIS_MODEL, type BrandConfig, type Driver, type Scenario, type ScenarioTier, type Signal } from "@horizon/shared";
import { completeJson, type Providers, type UsageTracker } from "../providers/index.js";

const MAX_EVIDENCE_SIGNALS_PER_SCENARIO = 12;

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
  const tiers = assignTiers(count);
  const signalsById = new Map(signals.map((s) => [s.id, s]));
  const scenarios: Scenario[] = [];
  const failures: string[] = [];

  for (let i = 0; i < count; i++) {
    const chosenDrivers = pickDrivers(drivers, i);
    const tier = tiers[i] ?? "Probable";
    const evidence = evidenceFor(chosenDrivers, signalsById);
    const evidenceBlock = evidence
      .map((s) => `${s.id} [${s.confidence}/${s.geo}] ${s.title} -- ${s.summary} (source: ${s.source}${s.url ? `, ${s.url}` : ""})`)
      .join("\n");

    const prompt = `Brand: ${brand.name} (${brand.industry}).\nScenario tier: ${tier} (${tier === "Cassandra" ? "a cautionary/adversarial scenario -- what breaks the brand's current strategy" : tier === "Deep" ? "a longer-horizon, less certain scenario" : "a near-term, well-evidenced scenario"}).\n\nDrivers to weave together:\n${chosenDrivers.map((d) => `- ${d.id} ${d.name}: ${d.desc}`).join("\n")}\n\nEvidence signals (cite these by ID; do not invent facts beyond them):\n${evidenceBlock}`;

    // One malformed scenario must never fail the whole scan -- the corpus,
    // clusters, drivers, and every other scenario have already been paid for.
    // Skip a bad one and keep the rest.
    try {
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

      scenarios.push({
        id: scenarios.length + 1,
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
      });
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  // Only surface as a hard failure if we couldn't produce a single scenario --
  // otherwise a partial set is a usable dossier, not a wasted scan.
  if (scenarios.length === 0 && failures.length > 0) {
    throw new Error(`all ${failures.length} scenarios failed to generate: ${failures[0]}`);
  }

  return scenarios;
}
