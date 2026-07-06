import { llmCostUsd, embeddingCostUsd, searchCostUsd, type UsageEvent } from "@horizon/shared";
import { buildSearchProvider } from "./search.js";
import { buildEmbeddingProvider } from "./embedding.js";
import { buildLlmProvider } from "./llm.js";
import type { SearchProvider, EmbeddingProvider, LlmProvider } from "./types.js";

export * from "./types.js";
export * from "./search.js";
export * from "./embedding.js";
export * from "./llm.js";

export interface Providers {
  search: SearchProvider;
  embedding: EmbeddingProvider;
  llm: LlmProvider;
  /** Whether a real embedding provider is configured. When false, the
   * dedupe/cluster stage groups signals with the LLM instead of embeddings --
   * so the pipeline needs no separate embeddings vendor (Anthropic offers no
   * embeddings API; Voyage was the recommended pairing but is optional). */
  embeddingsAvailable: boolean;
}

export function buildProviders(): Providers {
  return {
    search: buildSearchProvider(),
    embedding: buildEmbeddingProvider(),
    llm: buildLlmProvider(),
    embeddingsAvailable: Boolean(process.env.VOYAGE_API_KEY),
  };
}

/** Collects real per-call usage during a scan so actual cost can be reported
 * next to the pre-scan estimate, instead of only ever estimating. */
export class UsageTracker {
  private events: UsageEvent[] = [];

  recordSearch(stage: UsageEvent["stage"], calls: number) {
    this.events.push({ stage, provider: "search", calls, costUsd: searchCostUsd(calls), inputTokens: 0, outputTokens: 0 });
  }

  recordLlm(stage: UsageEvent["stage"], model: string, inputTokens: number, outputTokens: number) {
    const costUsd = /mock/i.test(model) ? 0 : llmCostUsd(model, inputTokens, outputTokens);
    this.events.push({ stage, provider: "llm", model, inputTokens, outputTokens, calls: 1, costUsd });
  }

  recordEmbedding(stage: UsageEvent["stage"], tokens: number) {
    this.events.push({ stage, provider: "embedding", inputTokens: tokens, outputTokens: 0, calls: 1, costUsd: embeddingCostUsd(tokens) });
  }

  all(): UsageEvent[] {
    return this.events;
  }

  totalUsd(): number {
    return Math.round(this.events.reduce((s, e) => s + e.costUsd, 0) * 10000) / 10000;
  }
}
