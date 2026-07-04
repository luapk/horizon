import Anthropic from "@anthropic-ai/sdk";
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "./types.js";

/** Zero-cost stand-in that returns structurally valid stub JSON per response
 * kind, so the pipeline can be run and its plumbing verified without an
 * ANTHROPIC_API_KEY or any spend. It is not an analysis engine. Stubs vary
 * deterministically with the prompt so dedupe/clustering stay non-degenerate
 * in demos. */
export class MockLlmProvider implements LlmProvider {
  readonly name = "mock-llm";

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const text = this.stub(req);
    return {
      text,
      inputTokens: Math.ceil((req.system.length + req.prompt.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      model: "mock-llm",
    };
  }

  private stub(req: LlmCompletionRequest): string {
    const h = hashString(req.prompt);
    const categories = ["S", "T", "Ec", "En", "P"] as const;
    switch (req.kind) {
      case "query-design":
        // Empty: ingest merges these with template queries, so mock runs
        // keep the deterministic template behavior.
        return JSON.stringify({ queries: [] });
      case "signal-extract":
        return JSON.stringify({
          title: `[MOCK] Signal ${h % 997} extracted from source`,
          summary: `Mock extraction variant ${h % 97} -- set ANTHROPIC_API_KEY for real signal extraction. Angle: ${["technology", "policy", "market", "social", "environmental"][h % 5]}.`,
          soWhat: `Mock so-what ${h % 89}.`,
          category: categories[h % categories.length],
          type: "Positive",
          confidence: "Probable",
          surprise: (h % 3) + 1,
          geo: "Global",
        });
      case "gap-analysis":
        return JSON.stringify({
          absences: [{
            title: "[MOCK] Absence: expected capability not observed in corpus",
            summary: "Mock absence signal -- set ANTHROPIC_API_KEY for real gap analysis.",
            soWhat: "Mock absence so-what.",
            category: "T",
            geo: "Global",
          }],
          counters: [{
            title: "[MOCK] Counter-signal: evidence cutting against the corpus consensus",
            summary: "Mock counter-signal -- set ANTHROPIC_API_KEY for real gap analysis.",
            soWhat: "Mock counter so-what.",
            category: "Ec",
            geo: "Global",
          }],
        });
      case "cluster-name":
        return JSON.stringify({ label: `[MOCK] Cluster Theme ${h % 97}` });
      case "driver-synth":
        return JSON.stringify({
          name: `[MOCK] Driver ${h % 97}`,
          desc: "Mock driver synthesis -- set ANTHROPIC_API_KEY for real analysis.",
          trajectory: "Nascent",
        });
      case "scenario-gen":
        return JSON.stringify({
          title: `[MOCK] Scenario ${h % 97}`,
          tagline: "Mock tagline.",
          dispatch: "Mock narrative dispatch citing [S-001] -- set ANTHROPIC_API_KEY for real scenario generation.",
          shadow: "Mock downside risk.",
          killerAssumption: "Mock invalidating assumption.",
          confidence: "Probable",
          citedSignalIds: ["S-001"],
          actions: [
            { label: "[MOCK] Immediate action", lane: "now" },
            { label: "[MOCK] Watch item", lane: "monitor" },
          ],
          dimensions: { discoverability: 50, appeal: 50, relevance: 50, availability: 50 },
        });
      case "matrix-gen":
        return JSON.stringify({ scores: [], types: [] });
      default:
        return "[MOCK] freeform response";
    }
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export class AnthropicLlmProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const message = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return {
      text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      model: req.model,
    };
  }
}

export function buildLlmProvider(): LlmProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new AnthropicLlmProvider(apiKey) : new MockLlmProvider();
}

/** Anthropic sometimes wraps JSON in prose or markdown fences even when asked
 * for raw JSON -- extract the first {...} or [...] block before parsing. */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error(`No JSON found in LLM response: ${text.slice(0, 200)}`);
  const trimmed = candidate.slice(start);
  return JSON.parse(trimmed) as T;
}

/** Complete + parse with one retry on malformed JSON. Every attempt's usage
 * is reported via onUsage so retries are billed honestly, not hidden. */
export async function completeJson<T>(
  llm: LlmProvider,
  req: LlmCompletionRequest,
  onUsage: (result: LlmCompletionResult) => void
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await llm.complete(req);
    onUsage(result);
    try {
      return extractJson<T>(result.text);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Minimal promise pool -- run tasks with bounded concurrency, collecting
 * failures instead of failing the whole batch. */
export async function mapWithConcurrency<In, Out>(
  items: In[],
  concurrency: number,
  fn: (item: In, index: number) => Promise<Out>
): Promise<{ results: Out[]; failures: { index: number; error: string }[] }> {
  const results: Out[] = [];
  const failures: { index: number; error: string }[] = [];
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results.push(await fn(items[index], index));
      } catch (err) {
        failures.push({ index, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { results, failures };
}
