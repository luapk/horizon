import { DEFAULT_SYNTHESIS_MODEL, type BrandConfig, type Signal } from "@horizon/shared";
import { completeJson, type Providers, type UsageTracker } from "../providers/index.js";

/** Absence signals and counter-signals cannot come from single-document
 * extraction: an absence is defined by what the WHOLE corpus fails to
 * contain, and a counter-signal by tension against the corpus consensus.
 * This pass reasons over all extracted signals at once -- it is the
 * analytical move that distinguishes this tool from a news summarizer. */

const SYSTEM = `You are a foresight analyst reviewing a complete signal corpus from a horizon scan. Your job is the two hardest analytical moves:

1. ABSENCE SIGNALS: Given everything the scan found, what should exist but demonstrably doesn't? Look for: capabilities where all ingredients exist but nobody has combined them; markets adjacent fields have proven that this industry hasn't entered; data/infrastructure that exists but isn't connected. An absence must be inferable from the corpus -- name the signals that imply the gap.

2. COUNTER-SIGNALS: Where does evidence in the corpus cut against its own dominant narrative? Find signals (or credible readings of them) that contradict what most of the corpus implies.

Respond with JSON only:
{"absences": [{"title": string (start with what's missing), "summary": string (2-3 sentences: what exists, what's missing, why the gap is strategically interesting), "soWhat": string, "category": "S"|"T"|"Ec"|"En"|"P", "geo": string, "impliedBy": string[] (signal IDs that imply this gap)}], "counters": [{"title": string, "summary": string, "soWhat": string, "category": "S"|"T"|"Ec"|"En"|"P", "geo": string, "impliedBy": string[]}]}
Up to 4 absences and 3 counters. Quality over quantity -- return fewer if the corpus doesn't support more. Do not invent facts.`;

interface GapEntry {
  title: string;
  summary: string;
  soWhat: string;
  category: Signal["category"];
  geo: string;
  impliedBy?: string[];
}

export async function runGapAnalysis(
  brand: BrandConfig,
  signals: Signal[],
  providers: Providers,
  usage: UsageTracker
): Promise<Signal[]> {
  if (signals.length < 3) return [];

  const corpus = signals
    .map((s) => `${s.id} [${s.category}/${s.geo}] ${s.title} -- ${s.summary}`)
    .join("\n");

  let parsed: { absences?: GapEntry[]; counters?: GapEntry[] };
  try {
    parsed = await completeJson(
      providers.llm,
      {
        system: SYSTEM,
        prompt: `Brand: ${brand.name} (${brand.industry}). ${brand.description}\nBusiness units: ${brand.businessUnits.join(", ")}\n\nSignal corpus:\n${corpus}`,
        maxTokens: 1200,
        model: DEFAULT_SYNTHESIS_MODEL,
        kind: "gap-analysis",
      },
      (r) => usage.recordLlm("gap_analysis", r.model, r.inputTokens, r.outputTokens)
    );
  } catch {
    // Gap analysis failing shouldn't kill a paid scan -- the run just lacks
    // absence/counter signals, which the UI makes visible by their absence.
    return [];
  }

  const startIndex = signals.length + 1;
  const toSignal = (entry: GapEntry, type: Signal["type"], offset: number): Signal => ({
    id: `S-${String(startIndex + offset).padStart(3, "0")}`,
    title: entry.title,
    geo: entry.geo || "Global",
    category: entry.category,
    surprise: 3,
    // Derived by reasoning over the corpus, not observed in a source --
    // never mark these Verified.
    confidence: "Probable",
    type,
    source: `corpus gap analysis${entry.impliedBy?.length ? ` (implied by ${entry.impliedBy.join(", ")})` : ""}`,
    summary: entry.summary,
    soWhat: entry.soWhat,
  });

  const absences = (parsed.absences ?? []).slice(0, 4).map((e, i) => toSignal(e, "Absence", i));
  const counters = (parsed.counters ?? []).slice(0, 3).map((e, i) => toSignal(e, "Counter-Signal", absences.length + i));
  return [...absences, ...counters];
}
