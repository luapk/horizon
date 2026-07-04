import type { BrandConfig, ScanScope } from "@horizon/shared";
import type { Providers, SearchResult } from "../providers/index.js";
import type { UsageTracker } from "../providers/index.js";

export interface RawDoc extends SearchResult {
  query: string;
}

/** Builds source queries from the brand config -- this is the one place that
 * used to be a hand-typed "Mars Pet Care" signal list. Everything downstream
 * is brand-agnostic. */
export function buildQueries(brand: BrandConfig, scope: ScanScope): string[] {
  const queries: string[] = [];
  const topics = [
    `${brand.industry} emerging trends`,
    `${brand.industry} regulatory changes`,
    `${brand.industry} technology disruption`,
    `${brand.industry} consumer behavior shift`,
    `${brand.industry} supply chain risk`,
  ];
  for (const t of topics) queries.push(t);
  for (const unit of brand.businessUnits) queries.push(`${unit} innovation ${brand.industry}`);
  for (const competitor of brand.competitors) queries.push(`${competitor} strategy news`);
  for (const geo of brand.geographies) queries.push(`${brand.industry} ${geo} market signal`);

  // Deterministic: take the first N distinct queries the scope allows.
  return Array.from(new Set(queries)).slice(0, scope.sourceQueries);
}

export async function runIngest(
  brand: BrandConfig,
  scope: ScanScope,
  providers: Providers,
  usage: UsageTracker
): Promise<RawDoc[]> {
  const queries = buildQueries(brand, scope);
  const docs: RawDoc[] = [];
  for (const query of queries) {
    const { results, calls } = await providers.search.search(query, scope.docsPerQuery);
    usage.recordSearch("ingest", calls);
    for (const r of results) docs.push({ ...r, query });
  }
  return docs;
}
