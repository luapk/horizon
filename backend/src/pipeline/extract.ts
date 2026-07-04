import { DEFAULT_EXTRACTION_MODEL, type Signal, type BrandConfig } from "@horizon/shared";
import { completeJson, mapWithConcurrency, type Providers, type UsageTracker } from "../providers/index.js";
import type { RawDoc } from "./ingest.js";

const EXTRACTION_CONCURRENCY = 5;

const SYSTEM = `You are a horizon-scanning analyst. Given a single source document, extract one strategic signal as JSON only -- no prose, no markdown fences.
Schema: {"title": string, "summary": string (2-3 sentences), "soWhat": string (one strategic implication as a question or claim), "category": "S"|"T"|"Ec"|"En"|"P", "type": "Positive"|"Negative"|"Counter-Signal", "confidence": "Verified"|"Probable"|"Contested", "surprise": 1|2|3, "geo": string (the geography this signal is actually about, e.g. "US", "EU", "Japan", "South Korea"; use "Global" only if genuinely global or unclear)}
Rules: confidence "Verified" only if the source itself is authoritative (regulator, peer-reviewed study, company primary announcement); news aggregation or analyst speculation is "Probable"; disputed or thinly-sourced claims are "Contested". Do not invent facts not present in the source.`;

interface ExtractedFields {
  title: string;
  summary: string;
  soWhat: string;
  category: Signal["category"];
  type: Signal["type"];
  confidence: Signal["confidence"];
  surprise: 1 | 2 | 3;
  geo: string;
}

export interface ExtractOutcome {
  signals: Signal[];
  failedDocs: number;
}

export async function runExtract(
  docs: RawDoc[],
  brand: BrandConfig,
  providers: Providers,
  usage: UsageTracker
): Promise<ExtractOutcome> {
  const { results, failures } = await mapWithConcurrency(docs, EXTRACTION_CONCURRENCY, async (doc, index) => {
    const parsed = await completeJson<ExtractedFields>(
      providers.llm,
      {
        system: SYSTEM,
        prompt: `Brand context: ${brand.name} (${brand.industry}).\nSource title: ${doc.title}\nSource URL: ${doc.url}\nSource content: ${doc.snippet}`,
        maxTokens: 500,
        model: DEFAULT_EXTRACTION_MODEL,
        kind: "signal-extract",
      },
      (r) => usage.recordLlm("extract", r.model, r.inputTokens, r.outputTokens)
    );
    return { index, doc, parsed };
  });

  // Restore source order, then assign stable sequential IDs.
  results.sort((a, b) => a.index - b.index);
  const signals: Signal[] = results.map(({ doc, parsed }, i) => ({
    id: `S-${String(i + 1).padStart(3, "0")}`,
    title: parsed.title,
    url: doc.url,
    geo: parsed.geo || "Global",
    category: parsed.category,
    surprise: parsed.surprise,
    confidence: parsed.confidence,
    type: parsed.type,
    source: doc.query,
    summary: parsed.summary,
    soWhat: parsed.soWhat,
    publishedAt: doc.publishedAt,
  }));

  return { signals, failedDocs: failures.length };
}
