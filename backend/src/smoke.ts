/** Runs the full pipeline against mock providers only -- no API keys, no
 * network, no spend. Verifies the plumbing (ingest -> extract -> dedupe ->
 * cluster -> driver synth -> scenario gen -> matrix -> timeline) end to end. */
import type { BrandConfig, ScanScope } from "@horizon/shared";
import { buildProviders } from "./providers/index.js";
import { runScan } from "./pipeline/run.js";

const brand: BrandConfig = {
  id: "smoke-brand",
  name: "Acme Test Co",
  industry: "test widgets",
  description: "Smoke-test brand",
  businessUnits: ["Widgets", "Gadgets"],
  competitors: ["Beta Corp"],
  geographies: ["US"],
  curatedSources: ["example-trade-journal.com"],
  createdAt: new Date().toISOString(),
};

const scope: ScanScope = {
  sourceQueries: 5,
  docsPerQuery: 2,
  driverCount: 3,
  scenarioCount: 3,
  includeMatrix: true,
};

const providers = buildProviders();
console.log(`Using providers: search=${providers.search.name} llm=${providers.llm.name} embedding=${providers.embedding.name}`);

const result = await runScan("smoke-scan", brand, scope, providers, (stage, status, detail) => {
  console.log(`[${status}] ${stage}${detail ? " -- " + detail : ""}`);
});

console.log("\n--- RESULT SUMMARY ---");
console.log(`status: ${result.status}`);
console.log(`signals: ${result.signals.length}, clusters: ${result.clusters.length}, drivers: ${result.drivers.length}, scenarios: ${result.scenarios.length}, matrix rows: ${result.matrix.length}, timeline items: ${result.timeline.length}`);
console.log(`estimate: $${result.estimate.lowUsd} - $${result.estimate.highUsd}`);
console.log(`actual cost: $${result.actualCostUsd}`);
if (result.error) console.error(`error: ${result.error}`);

if (result.status !== "completed") {
  process.exitCode = 1;
}
