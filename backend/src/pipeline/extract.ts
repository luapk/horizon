import { DEFAULT_EXTRACTION_MODEL, type Signal, type BrandConfig } from "@horizon/shared";
import { extractJson, type Providers, type UsageTracker } from "../providers/index.js";
import type { RawDoc } from "./ingest.js";

const SYSTEM = `You are a horizon-scanning analyst. Given a single source document, extract one strategic signal as JSON only -- no prose, no markdown fences.
Schema: {"title": string, "summary": string (2-3 sentences), "soWhat": string (one strategic implication as a question or claim), "category": "S"|"T"|"Ec"|"En"|"P", "type": "Positive"|"Negative"|"Absence"|"Counter-Signal", "confidence": "Verified"|"Probable"|"Contested", "surprise": 1|2|3}`;

export async function extractSignal(
  doc: RawDoc,
  brand: BrandConfig,
  idIndex: number,
  providers: Providers,
  usage: UsageTracker
): Promise<Signal> {
  const prompt = `Brand context: ${brand.name} (${brand.industry}).\nSource title: ${doc.title}\nSource URL: ${doc.url}\nSource content: ${doc.snippet}`;
  const result = await providers.llm.complete({
    system: SYSTEM,
    prompt,
    maxTokens: 500,
    model: DEFAULT_EXTRACTION_MODEL,
    kind: "signal-extract",
  });
  usage.recordLlm("extract", result.model, result.inputTokens, result.outputTokens);

  const parsed = extractJson<{
    title: string;
    summary: string;
    soWhat: string;
    category: Signal["category"];
    type: Signal["type"];
    confidence: Signal["confidence"];
    surprise: 1 | 2 | 3;
  }>(result.text);

  return {
    id: `S-${String(idIndex).padStart(3, "0")}`,
    title: parsed.title,
    url: doc.url,
    geo: brand.geographies[idIndex % brand.geographies.length] ?? "Global",
    category: parsed.category,
    surprise: parsed.surprise,
    confidence: parsed.confidence,
    type: parsed.type,
    source: doc.query,
    summary: parsed.summary,
    soWhat: parsed.soWhat,
    publishedAt: doc.publishedAt,
  };
}

export async function runExtract(
  docs: RawDoc[],
  brand: BrandConfig,
  providers: Providers,
  usage: UsageTracker
): Promise<Signal[]> {
  const signals: Signal[] = [];
  for (let i = 0; i < docs.length; i++) {
    signals.push(await extractSignal(docs[i], brand, i + 1, providers, usage));
  }
  return signals;
}
