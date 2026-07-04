/**
 * Unit prices behind the cost estimator. LLM prices are sourced from Anthropic's
 * published per-model rates (2026-06-24 cache). Search/embedding prices are not
 * pinned to a specific vendor -- they're operator-configurable via env vars
 * because provider choice (Tavily/Exa/Serper, Voyage/etc.) is a deployment
 * decision, not something this codebase should hardcode as fact.
 */

export interface LlmPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const LLM_PRICING: Record<string, LlmPrice> = {
  "claude-haiku-4-5": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  "claude-sonnet-5": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  "claude-opus-4-8": { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  "claude-fable-5": { inputPerMTok: 10.0, outputPerMTok: 50.0 },
};

export const DEFAULT_EXTRACTION_MODEL = "claude-haiku-4-5";
export const DEFAULT_SYNTHESIS_MODEL = "claude-sonnet-5";

/** Env access that survives the browser (shared is bundled into the frontend). */
const env = (key: string): string | undefined =>
  typeof process !== "undefined" && process.env ? process.env[key] : undefined;

/** USD per 1M embedding tokens. Placeholder -- override via EMBEDDING_PRICE_PER_MTOK. */
export const DEFAULT_EMBEDDING_PRICE_PER_MTOK = Number(env("EMBEDDING_PRICE_PER_MTOK") ?? 0.06);

/** USD per search-API call (one query -> one page of results). Placeholder -- override via SEARCH_PRICE_PER_CALL. */
export const DEFAULT_SEARCH_PRICE_PER_CALL = Number(env("SEARCH_PRICE_PER_CALL") ?? 0.008);

export function llmCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = LLM_PRICING[model];
  if (!price) throw new Error(`No pricing entry for model "${model}"`);
  return (inputTokens / 1_000_000) * price.inputPerMTok + (outputTokens / 1_000_000) * price.outputPerMTok;
}

export function embeddingCostUsd(tokens: number, pricePerMTok = DEFAULT_EMBEDDING_PRICE_PER_MTOK): number {
  return (tokens / 1_000_000) * pricePerMTok;
}

export function searchCostUsd(calls: number, pricePerCall = DEFAULT_SEARCH_PRICE_PER_CALL): number {
  return calls * pricePerCall;
}
