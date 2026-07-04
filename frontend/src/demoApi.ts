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

function makeSignals(brand: BrandConfig): Signal[] {
  const ind = brand.industry;
  const unit = (i: number) => pick(brand.businessUnits, i);
  const geo = (i: number) => pick(brand.geographies, i);
  const rival = brand.competitors[0] ?? "a leading competitor";

  const base: Array<Partial<Signal> & { title: string; summary: string; soWhat: string }> = [
    { title: `Regulator signals stricter ${ind} disclosure rules`, category: "P", type: "Positive", confidence: "Verified", surprise: 2, summary: `Simulated: a regulator in ${geo(0)} has opened consultation on new disclosure requirements affecting ${ind}.`, soWhat: `Compliance becomes a moat for whoever moves first in ${ind}.` },
    { title: `Venture funding surge into ${ind} automation startups`, category: "T", type: "Positive", confidence: "Probable", surprise: 2, summary: `Simulated: funding into ${ind} automation doubled year-on-year, concentrated in ${geo(1)}.`, soWhat: `The build-vs-buy window for ${unit(0)} tooling is narrowing.` },
    { title: `${rival} pilots a subscription model in ${geo(0)}`, category: "Ec", type: "Positive", confidence: "Probable", surprise: 3, summary: `Simulated: ${rival} is testing recurring-revenue packaging around ${unit(0)}.`, soWhat: `If subscriptions stick, lifetime value replaces unit share as the metric that matters.` },
    { title: `Consumer trust survey shows generational split on ${ind}`, category: "S", type: "Negative", confidence: "Verified", surprise: 1, summary: `Simulated: under-30s report significantly lower trust in incumbent ${ind} brands than over-50s.`, soWhat: `Brand equity may not transfer to the next customer cohort.` },
    { title: `Supply chain stress test reveals ${ind} single-source risk`, category: "En", type: "Negative", confidence: "Probable", surprise: 2, summary: `Simulated: climate volatility exposed single-source dependencies in ${ind} inputs.`, soWhat: `Sourcing resilience is becoming a board-level question.` },
    { title: `${geo(1)} emerges as lead market for ${unit(0)} innovation`, category: "S", type: "Positive", confidence: "Verified", surprise: 3, summary: `Simulated: adoption curves in ${geo(1)} run 3-5 years ahead for ${unit(0)}-adjacent products.`, soWhat: `What happens in ${geo(1)} now is your roadmap preview.` },
    { title: `Open-data mandate could unbundle ${ind} customer lock-in`, category: "P", type: "Negative", confidence: "Contested", surprise: 3, summary: `Simulated: proposed portability rules would force ${ind} platforms to open customer data.`, soWhat: `Data moats built on lock-in may be legislated away.` },
    { title: `AI copilots reach production in ${unit(1)} workflows`, category: "T", type: "Positive", confidence: "Verified", surprise: 2, summary: `Simulated: multiple firms report AI assistance is now standard in ${unit(1)} operations.`, soWhat: `The productivity baseline just moved; laggards pay a widening tax.` },
    { title: `Margin compression accelerates in commodity ${ind} segments`, category: "Ec", type: "Negative", confidence: "Verified", surprise: 1, summary: `Simulated: price competition is hollowing out undifferentiated ${ind} offerings.`, soWhat: `The middle of the market is where margins go to die.` },
    { title: `Academic labs demonstrate next-gen approach to ${unit(0)}`, category: "T", type: "Positive", confidence: "Contested", surprise: 3, summary: `Simulated: early-stage research suggests a step-change approach to ${unit(0)}, unproven at scale.`, soWhat: `A 5-year watch item that could reset the category if it scales.` },
  ];

  const signals: Signal[] = base.map((s, i) => ({
    id: `S-${String(i + 1).padStart(3, "0")}`,
    title: s.title,
    geo: geo(i),
    category: s.category as Signal["category"],
    surprise: (s.surprise ?? 2) as Signal["surprise"],
    confidence: s.confidence as Signal["confidence"],
    type: s.type as Signal["type"],
    source: "Demo corpus (simulated)",
    summary: s.summary,
    soWhat: s.soWhat,
  }));

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

function makeScenarios(brand: BrandConfig, count: number, signals: Signal[]): Scenario[] {
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
      driverIds: [`D-0${(i % 3) + 1}`],
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

  push("query_design", "done", "simulated");
  push("ingest", "in_progress");
  await sleep(700);
  push("ingest", "done", `${scope.sourceQueries * 3} documents retrieved (simulated)`);
  push("extract", "in_progress");
  await sleep(900);

  const signals = makeSignals(brand);
  push("extract", "done", `${signals.length - 2} signals extracted (simulated)`);
  push("dedupe_cluster", "in_progress");
  await sleep(600);
  push("dedupe_cluster", "done", "2 duplicates removed (simulated)");
  push("gap_analysis", "in_progress");
  await sleep(700);
  push("gap_analysis", "done", "1 absence + 1 counter-signal derived (simulated)");
  await sleep(500);

  const clusterDefs = [
    { label: "Technology Acceleration", cat: "T" },
    { label: "Regulatory Tightening", cat: "P" },
    { label: "Market Restructuring", cat: "Ec" },
  ];
  const clusters = clusterDefs.map((c, i) => ({
    id: `C-0${i + 1}`,
    label: c.label,
    signalIds: signals.filter((_, idx) => idx % 3 === i).map((s) => s.id),
    method: "embedding" as const,
    coherence: 0.62 + i * 0.07,
  }));
  const drivers = clusters.map((c, i) => ({
    id: `D-0${i + 1}`,
    name: ["The Capability Race", "The Compliance Moat", "The Margin Squeeze"][i],
    desc: `Simulated driver synthesized from cluster "${c.label}" -- in a real scan this is an LLM synthesis of the structural force the cluster's signals reveal for ${brand.name}.`,
    steep: clusterDefs[i].cat as never,
    trajectory: (["Accelerating", "Nascent", "Accelerating"] as const)[i],
    signalIds: c.signalIds,
    clusterIds: [c.id],
  }));

  push("driver_synthesis", "done", `${drivers.length} drivers synthesized (simulated)`);
  push("scenario_generation", "in_progress");
  await sleep(1100);

  const scenarios = makeScenarios(brand, scope.scenarioCount, signals);
  push("scenario_generation", "done", `${scenarios.length} scenarios generated (simulated)`);
  push("matrix_timeline", "in_progress");
  await sleep(500);

  const matrix = brand.businessUnits.map((bu, r) => ({
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
  async getScan(id: string): Promise<ScanResult> {
    const scan = scans.get(id);
    if (!scan) throw new Error("not found");
    return structuredClone(scan);
  },
  async listScans(brandId?: string): Promise<ScanResult[]> {
    return [...scans.values()].filter((s) => !brandId || s.brandId === brandId);
  },
};
