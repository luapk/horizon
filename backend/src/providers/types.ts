export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, maxResults: number): Promise<{ results: SearchResult[]; calls: number }>;
}

export type LlmResponseKind = "signal-extract" | "cluster-name" | "driver-synth" | "scenario-gen" | "matrix-gen" | "freeform";

export interface LlmCompletionRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  model: string;
  /** Lets the mock provider return a structurally valid stub without guessing intent from prose. */
  kind: LlmResponseKind;
}

export interface LlmCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

export interface EmbeddingResult {
  vectors: number[][];
  tokens: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[]): Promise<EmbeddingResult>;
}
