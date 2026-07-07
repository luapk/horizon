import {
  ScanScope,
  estimateScanCost,
  type BrandConfig,
  type CostEstimate,
  type Scenario,
  type ScanResult,
  type Signal,
} from "@horizon/shared";

/** In-browser stand-in for the backend, used only in demo builds
 * (VITE_DEMO=1). Simulates the pipeline stages with delays and generates
 * clearly-simulated data shaped by the brand config -- no network, no keys,
 * no spend. The real product runs this server-side against live search and
 * LLM providers. */

const LOGIN_FLAG = "horizon-demo-authed";
const BRANDS_KEY = "horizon-demo-brands";

const scans = new Map<string, ScanResult>();

function loadBrands(): BrandConfig[] {
  try {
    return JSON.parse(localStorage.getItem(BRANDS_KEY) ?? "[]") as BrandConfig[];
  } catch {
    return [];
  }
}

function saveBrands(brands: BrandConfig[]): void {
  localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

/** A futures scan surfaces signals wherever they emerge, not just in the
 * brand's home markets -- so the simulated corpus spreads across the world
 * (brand geographies first for relevance, then a diverse global pool), which
 * also keeps the signal globe populated for a brand that lists only one geo. */
const WORLD_ORIGINS = [
  "United States", "Western Europe", "Japan", "South Korea", "China", "Singapore",
  "United Kingdom", "India", "Brazil", "Germany", "Australia", "Canada",
];

type SignalSeed = { title: string; summary: string; soWhat: string; category: Signal["category"]; type: Signal["type"]; confidence: Signal["confidence"]; surprise: 1 | 2 | 3 };

/** Ten signal archetypes, parameterized by geography/business-unit so the
 * generator can cycle them to any tier depth (50/100 signals) with plausible
 * variety -- later rounds are geo-prefixed so titles stay distinct. */
const SIGNAL_TEMPLATES: Array<(g: string, u: string, rival: string, ind: string) => SignalSeed> = [
  (g, u, r, ind) => ({ title: `Regulator signals stricter ${ind} disclosure rules`, category: "P", type: "Positive", confidence: "Verified", surprise: 2, summary: `Simulated: a regulator in ${g} has opened consultation on new disclosure requirements affecting ${ind}.`, soWhat: `Compliance becomes a moat for whoever moves first in ${ind}.` }),
  (g, u, r, ind) => ({ title: `Venture funding surge into ${ind} automation startups`, category: "T", type: "Positive", confidence: "Probable", surprise: 2, summary: `Simulated: funding into ${ind} automation doubled year-on-year, concentrated in ${g}.`, soWhat: `The build-vs-buy window for ${u} tooling is narrowing.` }),
  (g, u, r, ind) => ({ title: `${r} pilots a subscription model in ${g}`, category: "Ec", type: "Positive", confidence: "Probable", surprise: 3, summary: `Simulated: ${r} is testing recurring-revenue packaging around ${u}.`, soWhat: `If subscriptions stick, lifetime value replaces unit share as the metric that matters.` }),
  (g, u, r, ind) => ({ title: `Consumer trust survey shows generational split on ${ind}`, category: "S", type: "Negative", confidence: "Verified", surprise: 1, summary: `Simulated: under-30s in ${g} report significantly lower trust in incumbent ${ind} brands than over-50s.`, soWhat: `Brand equity may not transfer to the next customer cohort.` }),
  (g, u, r, ind) => ({ title: `Supply chain stress test reveals ${ind} single-source risk`, category: "En", type: "Negative", confidence: "Probable", surprise: 2, summary: `Simulated: climate volatility exposed single-source dependencies in ${ind} inputs routed through ${g}.`, soWhat: `Sourcing resilience is becoming a board-level question.` }),
  (g, u, r, ind) => ({ title: `${g} emerges as lead market for ${u} innovation`, category: "S", type: "Positive", confidence: "Verified", surprise: 3, summary: `Simulated: adoption curves in ${g} run 3-5 years ahead for ${u}-adjacent products.`, soWhat: `What happens in ${g} now is your roadmap preview.` }),
  (g, u, r, ind) => ({ title: `Open-data mandate could unbundle ${ind} customer lock-in`, category: "P", type: "Negative", confidence: "Contested", surprise: 3, summary: `Simulated: proposed portability rules in ${g} would force ${ind} platforms to open customer data.`, soWhat: `Data moats built on lock-in may be legislated away.` }),
  (g, u, r, ind) => ({ title: `AI copilots reach production in ${u} workflows`, category: "T", type: "Positive", confidence: "Verified", surprise: 2, summary: `Simulated: multiple firms in ${g} report AI assistance is now standard in ${u} operations.`, soWhat: `The productivity baseline just moved; laggards pay a widening tax.` }),
  (g, u, r, ind) => ({ title: `Margin compression accelerates in commodity ${ind} segments`, category: "Ec", type: "Negative", confidence: "Verified", surprise: 1, summary: `Simulated: price competition in ${g} is hollowing out undifferentiated ${ind} offerings.`, soWhat: `The middle of the market is where margins go to die.` }),
  (g, u, r, ind) => ({ title: `Academic labs demonstrate next-gen approach to ${u}`, category: "T", type: "Positive", confidence: "Contested", surprise: 3, summary: `Simulated: early-stage research in ${g} suggests a step-change approach to ${u}, unproven at scale.`, soWhat: `A 5-year watch item that could reset the category if it scales.` }),
];

function makeSignals(brand: BrandConfig, targetTotal: number): Signal[] {
  const ind = brand.industry;
  const units = brand.businessUnits.length ? brand.businessUnits : ["the core business"];
  const unit = (i: number) => pick(units, i);
  const geoPool = Array.from(new Set([...brand.geographies, ...WORLD_ORIGINS])).filter(Boolean);
  const geo = (i: number) => geoPool[i % geoPool.length] ?? "Global";
  const rival = brand.competitors[0] ?? "a leading competitor";

  const baseCount = Math.max(10, targetTotal - 2); // leave room for the 2 gap-analysis signals
  const signals: Signal[] = [];
  for (let i = 0; i < baseCount; i++) {
    const g = geo(i);
    const s = SIGNAL_TEMPLATES[i % SIGNAL_TEMPLATES.length](g, unit(i), rival, ind);
    signals.push({
      id: `S-${String(i + 1).padStart(3, "0")}`,
      // Later template rounds get a geo prefix so titles stay distinct.
      title: i < SIGNAL_TEMPLATES.length ? s.title : `${g}: ${s.title}`,
      geo: g,
      category: s.category,
      surprise: s.surprise,
      confidence: s.confidence,
      type: s.type,
      source: "Demo corpus (simulated)",
      summary: s.summary,
      soWhat: s.soWhat,
    });
  }

  signals.push({
    id: `S-${String(signals.length + 1).padStart(3, "0")}`,
    title: `Absence: nobody links ${unit(0)} data to ${unit(1)} pricing`,
    geo: "Global",
    category: "Ec",
    surprise: 3,
    confidence: "Probable",
    type: "Absence",
    source: "corpus gap analysis (implied by S-002, S-003, S-008)",
    summary: `Simulated absence signal: the data and the pricing infrastructure both exist in ${ind}, but no player has connected them.`,
    soWhat: "The most valuable product in the category may be the one nobody has built.",
  });
  signals.push({
    id: `S-${String(signals.length + 1).padStart(3, "0")}`,
    title: `Counter-signal: ${ind} tech adoption stalls outside early adopters`,
    geo: geo(2),
    category: "S",
    surprise: 2,
    confidence: "Probable",
    type: "Counter-Signal",
    source: "corpus gap analysis (implied by S-004, S-009)",
    summary: `Simulated counter-signal: mainstream adoption is slower than the funding narrative implies.`,
    soWhat: "The hype curve and the adoption curve are not the same curve.",
  });

  return signals;
}

function makeScenarios(brand: BrandConfig, count: number, signals: Signal[], driverCount: number): Scenario[] {
  const tiers: Scenario["tier"][] = [];
  const probable = Math.max(1, Math.round(count * 0.55));
  const cassandra = count >= 4 ? 1 : 0;
  for (let i = 0; i < probable; i++) tiers.push("Probable");
  for (let i = 0; i < count - probable - cassandra; i++) tiers.push("Deep");
  for (let i = 0; i < cassandra; i++) tiers.push("Cassandra");

  return tiers.map((tier, i) => {
    const cited = [pick(signals, i * 3).id, pick(signals, i * 3 + 1).id, pick(signals, i * 3 + 2).id];
    return {
      id: i + 1,
      tier,
      title: `${tier === "Cassandra" ? "The Backlash" : tier === "Deep" ? "The Long Shift" : "The Near Future"} ${i + 1}: ${brand.industry} rewired`,
      tagline: `A simulated ${tier.toLowerCase()} scenario for ${brand.name} -- run a real scan for live analysis.`,
      driverIds: [`D-${String((i % driverCount) + 1).padStart(2, "0")}`],
      confidence: tier === "Cassandra" ? "Contested" : "Probable",
      dispatch: `This is simulated demo prose, generated in your browser without any live research.\n\nIn a real scan, this dispatch is a grounded narrative in which every concrete fact is cited from evidence signals like ${cited[0]} and ${cited[1]}, with the citations validated against the scan corpus and rendered as clickable sources below.\n\nThe demo exists to show the shape of the product: signals feed clusters, clusters feed drivers, drivers feed scenarios like this one, and scenarios feed the strategy matrix and action timeline [${cited[2]}].`,
      shadow: "Simulated downside: every scenario in the real product carries an explicit shadow side.",
      killerAssumption: "Simulated killer assumption: and an explicit statement of what would prove it wrong.",
      citedSignalIds: cited,
      actions: [
        { label: `Scope a ${brand.businessUnits[0] ?? "core"} response to this scenario`, lane: "now" },
        { label: `Track the leading indicator behind ${cited[0]}`, lane: "monitor" },
        { label: "Prepare the capability this future would demand", lane: "prepare" },
      ],
      dimensions: {
        discoverability: 40 + ((i * 17) % 50),
        appeal: 35 + ((i * 23) % 55),
        relevance: 50 + ((i * 13) % 45),
        availability: 30 + ((i * 29) % 55),
      },
    };
  });
}

async function simulateScan(scan: ScanResult, brand: BrandConfig): Promise<void> {
  const scope = scan.scope;
  const push = (stage: string, status: "in_progress" | "done", detail?: string) => {
    const current = scans.get(scan.id);
    if (!current) return;
    scans.set(scan.id, {
      ...current,
      status: "running",
      progress: [...current.progress, { stage: stage as never, status, detail }],
    });
  };

  // The tier's document budget sets how many signals the demo generates,
  // mirroring how the real pipeline's yield scales with corpus size.
  const docBudget = scope.sourceQueries * scope.docsPerQuery;
  const targetTotal = Math.max(12, Math.min(100, docBudget));
  const dupesRemoved = Math.max(2, Math.round(targetTotal * 0.06));

  push("query_design", "done", "simulated");
  push("ingest", "in_progress");
  await sleep(700);
  push("ingest", "done", `${docBudget} documents retrieved (simulated)`);
  push("extract", "in_progress");
  await sleep(900);

  const signals = makeSignals(brand, targetTotal);
  push("extract", "done", `${signals.length - 2 + dupesRemoved} signals extracted (simulated)`);
  push("dedupe_cluster", "in_progress");
  await sleep(600);
  push("dedupe_cluster", "done", `${dupesRemoved} duplicates removed (simulated)`);
  push("gap_analysis", "in_progress");
  await sleep(700);
  push("gap_analysis", "done", "1 absence + 1 counter-signal derived (simulated)");
  await sleep(500);

  const clusterDefs = [
    { label: "Technology Acceleration", name: "The Capability Race", cat: "T" },
    { label: "Regulatory Tightening", name: "The Compliance Moat", cat: "P" },
    { label: "Market Restructuring", name: "The Margin Squeeze", cat: "Ec" },
    { label: "Trust Realignment", name: "The Cohort Cliff", cat: "S" },
    { label: "Resilience Pressure", name: "The Sourcing Reckoning", cat: "En" },
    { label: "Revenue Model Shift", name: "The Subscription Turn", cat: "Ec" },
    { label: "Data Openness", name: "The Unbundling", cat: "P" },
    { label: "Automation Baseline", name: "The Productivity Reset", cat: "T" },
    { label: "Lead-Market Divergence", name: "The Geography Split", cat: "S" },
    { label: "Frontier Research", name: "The Long Bet", cat: "T" },
    { label: "Commodity Pressure", name: "The Hollow Middle", cat: "Ec" },
    { label: "Adoption Reality Gap", name: "The Hype Correction", cat: "S" },
  ];
  const driverN = Math.min(Math.max(scope.driverCount, 3), clusterDefs.length);
  const clusters = clusterDefs.slice(0, driverN).map((c, i) => ({
    id: `C-${String(i + 1).padStart(2, "0")}`,
    label: c.label,
    signalIds: signals.filter((_, idx) => idx % driverN === i).map((s) => s.id),
    method: "embedding" as const,
    coherence: 0.58 + ((i * 7) % 30) / 100,
  }));
  const drivers = clusters.map((c, i) => ({
    id: `D-${String(i + 1).padStart(2, "0")}`,
    name: clusterDefs[i].name,
    desc: `Simulated driver synthesized from cluster "${c.label}" -- in a real scan this is an LLM synthesis of the structural force the cluster's signals reveal for ${brand.name}.`,
    steep: clusterDefs[i].cat as never,
    trajectory: (i % 3 === 1 ? "Nascent" : "Accelerating") as "Accelerating" | "Nascent",
    signalIds: c.signalIds,
    clusterIds: [c.id],
  }));
  // Ring cross-link: each driver shares one signal with its neighbor, so the
  // network reads as connected the way a real corpus does.
  for (let i = 0; i < drivers.length; i++) {
    const donor = drivers[(i + 1) % drivers.length];
    if (donor.signalIds[0] && !drivers[i].signalIds.includes(donor.signalIds[0])) {
      drivers[i].signalIds = [...drivers[i].signalIds, donor.signalIds[0]];
    }
  }

  push("driver_synthesis", "done", `${drivers.length} drivers synthesized (simulated)`);
  push("scenario_generation", "in_progress");
  await sleep(1100);

  const scenarios = makeScenarios(brand, scope.scenarioCount, signals, drivers.length);
  push("scenario_generation", "done", `${scenarios.length} scenarios generated (simulated)`);
  push("matrix_timeline", "in_progress");
  await sleep(500);

  const matrixUnits = brand.businessUnits.length ? brand.businessUnits : ["Core business"];
  const matrix = matrixUnits.map((bu, r) => ({
    businessUnit: bu,
    scores: scenarios.map((_, c) => ((r * 7 + c * 3) % 4) + 1),
    types: scenarios.map((_, c) => (["opp", "mon", "threat"] as const)[(r + c) % 3]),
  }));
  const currentYear = new Date().getFullYear();
  const timeline = scenarios.flatMap((s) =>
    s.actions.map((a) => ({
      label: a.label,
      lane: a.lane,
      year: currentYear + (a.lane === "now" ? 0 : a.lane === "monitor" ? 1 : 3),
      scenarioId: s.id,
    }))
  );
  push("matrix_timeline", "done");

  const current = scans.get(scan.id);
  if (!current) return;
  scans.set(scan.id, {
    ...current,
    status: "completed",
    completedAt: new Date().toISOString(),
    actualCostUsd: 0,
    signals,
    clusters,
    drivers,
    scenarios,
    matrix,
    timeline,
  });
}

export const demoApi = {
  async login(password: string): Promise<{ ok: true }> {
    if (password !== "demo") throw new Error("invalid password");
    sessionStorage.setItem(LOGIN_FLAG, "1");
    return { ok: true };
  },
  async logout(): Promise<{ ok: true }> {
    sessionStorage.removeItem(LOGIN_FLAG);
    return { ok: true };
  },
  async me(): Promise<{ ok: true }> {
    if (sessionStorage.getItem(LOGIN_FLAG) !== "1") throw new Error("not authenticated");
    return { ok: true };
  },

  async createBrand(brand: Omit<BrandConfig, "id" | "createdAt">): Promise<BrandConfig> {
    const created: BrandConfig = {
      ...brand,
      curatedSources: brand.curatedSources ?? [],
      competitors: brand.competitors ?? [],
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveBrands([...loadBrands(), created]);
    return created;
  },
  async listBrands(): Promise<BrandConfig[]> {
    return loadBrands();
  },

  async estimateScan(scope: Partial<ScanScope>): Promise<CostEstimate> {
    return estimateScanCost(ScanScope.parse(scope));
  },
  async startScan(brandId: string, scopeInput: Partial<ScanScope>): Promise<ScanResult> {
    const brand = loadBrands().find((b) => b.id === brandId);
    if (!brand) throw new Error("brand not found");
    const scope = ScanScope.parse(scopeInput);
    const scan: ScanResult = {
      id: crypto.randomUUID(),
      brandId,
      status: "pending",
      createdAt: new Date().toISOString(),
      scope,
      estimate: estimateScanCost(scope),
      usage: [],
      progress: [],
      signals: [],
      clusters: [],
      drivers: [],
      scenarios: [],
      matrix: [],
      timeline: [],
    };
    scans.set(scan.id, scan);
    void simulateScan(scan, brand);
    return scan;
  },
  async stepScan(id: string): Promise<{ done: boolean; busy?: boolean; status: string }> {
    // Demo scans advance themselves inside startScan's simulated pipeline; the
    // step call just reports whether they're finished (API-shape parity).
    const scan = scans.get(id);
    if (!scan) throw new Error("not found");
    const done = scan.status === "completed" || scan.status === "failed";
    return { done, status: scan.status };
  },
  async getScan(id: string): Promise<ScanResult> {
    const scan = scans.get(id);
    if (!scan) throw new Error("not found");
    return structuredClone(scan);
  },
  async listScans(brandId?: string): Promise<ScanResult[]> {
    return [...scans.values()].filter((s) => !brandId || s.brandId === brandId);
  },
};
