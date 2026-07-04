import Anthropic from "@anthropic-ai/sdk";
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "./types.js";

/** Zero-cost stand-in that returns structurally valid stub JSON per response
 * kind, so the pipeline can be run and its plumbing verified without an
 * ANTHROPIC_API_KEY or any spend. It is not an analysis engine. */
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
    switch (req.kind) {
      case "signal-extract":
        return JSON.stringify({
          title: "[MOCK] Untitled signal extracted from source",
          summary: "Mock extraction -- set ANTHROPIC_API_KEY for real signal extraction.",
          soWhat: "Mock so-what.",
          category: "T",
          type: "Positive",
          confidence: "Probable",
          surprise: 2,
        });
      case "cluster-name":
        return JSON.stringify({ label: "[MOCK] Unnamed Cluster" });
      case "driver-synth":
        return JSON.stringify({
          name: "[MOCK] Unnamed Driver",
          desc: "Mock driver synthesis -- set ANTHROPIC_API_KEY for real analysis.",
          trajectory: "Nascent",
        });
      case "scenario-gen":
        return JSON.stringify({
          title: "[MOCK] Unnamed Scenario",
          tagline: "Mock tagline.",
          dispatch: "Mock narrative dispatch -- set ANTHROPIC_API_KEY for real scenario generation.",
          shadow: "Mock downside risk.",
          killerAssumption: "Mock invalidating assumption.",
          dimensions: { discoverability: 50, appeal: 50, relevance: 50, availability: 50 },
        });
      case "matrix-gen":
        return JSON.stringify({ scores: [], types: [] });
      default:
        return "[MOCK] freeform response";
    }
  }
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
