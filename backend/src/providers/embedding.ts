import type { EmbeddingProvider, EmbeddingResult } from "./types.js";

/** Deterministic bag-of-words hashing "embedding" -- zero cost, zero network.
 * Good enough to exercise the clustering code path; not a real embedding. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "mock-embedding";
  private readonly dims = 64;

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const vectors = texts.map((t) => this.hashEmbed(t));
    const tokens = texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
    return { vectors, tokens };
  }

  private hashEmbed(text: string): number[] {
    const vec = new Array(this.dims).fill(0);
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    for (const w of words) {
      let h = 0;
      for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
      vec[h % this.dims] += 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}

/** Voyage AI embeddings -- recommended pairing with Anthropic models. https://voyageai.com */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = "voyage";
  constructor(private readonly apiKey: string, private readonly model = "voyage-3.5") {}

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });
    if (!res.ok) {
      throw new Error(`Voyage embeddings failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as {
      data: { embedding: number[] }[];
      usage: { total_tokens: number };
    };
    return { vectors: body.data.map((d) => d.embedding), tokens: body.usage.total_tokens };
  }
}

export function buildEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.VOYAGE_API_KEY;
  return apiKey ? new VoyageEmbeddingProvider(apiKey) : new MockEmbeddingProvider();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
