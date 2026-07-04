import { DEFAULT_EXTRACTION_MODEL, type BrandConfig, type ScanScope } from "@horizon/shared";
import { completeJson, type Providers, type SearchResult, type UsageTracker } from "../providers/index.js";

export interface RawDoc extends SearchResult {
  query: string;
}

const QUERY_DESIGN_SYSTEM = `You are a horizon-scanning researcher designing search queries for a strategic futures scan. Given a brand and its template queries, propose ADDITIONAL queries the templates miss: adjacent-field probes (what's happening in neighboring industries that could spill over), regulatory/patent angles, contrarian angles ("X backlash", "X failure"), and lead-market geographies. Respond with JSON only: {"queries": string[]} -- up to the requested count, no duplicates of the templates.`;

/** Deterministic template queries derived from brand config -- the floor,
 * not the ceiling. An LLM pass augments these with adjacent-field and
 * contrarian probes the templates can't anticipate. */
export function buildTemplateQueries(brand: BrandConfig): string[] {
  const queries: string[] = [
    `${brand.industry} emerging trends`,
    `${brand.industry} regulatory changes`,
    `${brand.industry} technology disruption`,
    `${brand.industry} consumer behavior shift`,
    `${brand.industry} supply chain risk`,
  ];
  for (const unit of brand.businessUnits) queries.push(`${unit} innovation ${brand.industry}`);
  for (const competitor of brand.competitors) queries.push(`${competitor} strategy news`);
  for (const geo of brand.geographies) queries.push(`${brand.industry} ${geo} market signal`);
  return Array.from(new Set(queries));
}

export async function designQueries(
  brand: BrandConfig,
  scope: ScanScope,
  providers: Providers,
  usage: UsageTracker
): Promise<string[]> {
  const templates = buildTemplateQueries(brand);
  // Reserve ~40% of the query budget for LLM-designed probes; templates fill the rest.
  const templateBudget = Math.max(1, Math.ceil(scope.sourceQueries * 0.6));
  const llmBudget = scope.sourceQueries - Math.min(templateBudget, templates.length);

  let designed: string[] = [];
  if (llmBudget > 0) {
    try {
      const parsed = await completeJson<{ queries: string[] }>(
        providers.llm,
        {
          system: QUERY_DESIGN_SYSTEM,
          prompt: `Brand: ${brand.name} (${brand.industry}). ${brand.description}\nBusiness units: ${brand.businessUnits.join(", ")}\nCompetitors: ${brand.competitors.join(", ") || "none listed"}\nGeographies: ${brand.geographies.join(", ")}\nTemplate queries already planned:\n${templates.map((q) => `- ${q}`).join("\n")}\nPropose up to ${llmBudget} additional queries.`,
          maxTokens: 500,
          model: DEFAULT_EXTRACTION_MODEL,
          kind: "query-design",
        },
        (r) => usage.recordLlm("query_design", r.model, r.inputTokens, r.outputTokens)
      );
      designed = (parsed.queries ?? []).filter((q) => typeof q === "string" && q.trim().length > 0);
    } catch {
      // Query design is an enhancement, not a dependency -- fall back to templates.
      designed = [];
    }
  }

  // Templates lead, designed probes follow, and unused templates backfill
  // if the LLM proposed fewer probes than its reserved share of the budget.
  return Array.from(new Set([...templates.slice(0, templateBudget), ...designed, ...templates])).slice(0, scope.sourceQueries);
}

export async function runIngest(
  brand: BrandConfig,
  scope: ScanScope,
  providers: Providers,
  usage: UsageTracker
): Promise<RawDoc[]> {
  const queries = await designQueries(brand, scope, providers, usage);
  const curated = brand.curatedSources ?? [];
  // Curated-core + open-discovery: when the brand has trusted sources, run
  // ~70% of queries restricted to them and keep the rest open for surprises.
  const curatedCount = curated.length > 0 ? Math.ceil(queries.length * 0.7) : 0;

  const docs: RawDoc[] = [];
  const seenUrls = new Set<string>();
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const options = i < curatedCount ? { includeDomains: curated } : undefined;
    try {
      const { results, calls } = await providers.search.search(query, scope.docsPerQuery, options);
      usage.recordSearch("ingest", calls);
      for (const r of results) {
        if (seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        docs.push({ ...r, query });
      }
    } catch {
      // One failed query shouldn't kill a paid scan; the doc count in the
      // progress detail makes shortfalls visible.
    }
  }
  return docs;
}
