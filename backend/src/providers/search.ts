import type { SearchProvider, SearchResult } from "./types.js";

/** No paid calls, no network -- deterministic stand-in so the pipeline can be
 * exercised end-to-end without a Tavily/Exa/Serper API key. */
export class MockSearchProvider implements SearchProvider {
  readonly name = "mock-search";

  async search(query: string, maxResults: number): Promise<{ results: SearchResult[]; calls: number }> {
    const results: SearchResult[] = Array.from({ length: Math.min(maxResults, 3) }, (_, i) => ({
      title: `[MOCK] ${query} -- finding ${i + 1}`,
      url: `https://example.invalid/mock/${encodeURIComponent(query)}/${i + 1}`,
      snippet: `This is a mock search result standing in for a real "${query}" query. Configure TAVILY_API_KEY for live ingestion.`,
      publishedAt: new Date().toISOString(),
    }));
    return { results, calls: 1 };
  }
}

/** Tavily's search API -- simple REST, no SDK. https://tavily.com */
export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily";
  constructor(private readonly apiKey: string) {}

  async search(query: string, maxResults: number): Promise<{ results: SearchResult[]; calls: number }> {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        search_depth: "advanced",
      }),
    });
    if (!res.ok) {
      throw new Error(`Tavily search failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as {
      results: { title: string; url: string; content: string; published_date?: string }[];
    };
    const results: SearchResult[] = body.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      publishedAt: r.published_date,
    }));
    return { results, calls: 1 };
  }
}

export function buildSearchProvider(): SearchProvider {
  const apiKey = process.env.TAVILY_API_KEY;
  return apiKey ? new TavilySearchProvider(apiKey) : new MockSearchProvider();
}
