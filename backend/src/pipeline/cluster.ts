import { DEFAULT_EXTRACTION_MODEL, type Signal, type Cluster } from "@horizon/shared";
import { completeJson, cosineSimilarity, type Providers, type UsageTracker } from "../providers/index.js";

const DUPLICATE_SIMILARITY_THRESHOLD = 0.93;

/** Near-duplicate removal -- the automatic check the hand-authored v3.0
 * prototype never had (it shipped 16 near-duplicate signals padded to hit a
 * marketing number). Uses embeddings when a real embedding provider is
 * configured, otherwise asks the LLM to flag duplicate groups. */
export async function dedupeSignals(
  signals: Signal[],
  providers: Providers,
  usage: UsageTracker
): Promise<Signal[]> {
  if (signals.length === 0) return [];
  return providers.embeddingsAvailable
    ? dedupeByEmbedding(signals, providers, usage)
    : dedupeByLlm(signals, providers, usage);
}

async function dedupeByEmbedding(signals: Signal[], providers: Providers, usage: UsageTracker): Promise<Signal[]> {
  const { vectors, tokens } = await providers.embedding.embed(signals.map((s) => `${s.title}. ${s.summary}`));
  usage.recordEmbedding("dedupe_cluster", tokens);

  const kept: Signal[] = [];
  const keptVectors: number[][] = [];
  for (let i = 0; i < signals.length; i++) {
    const isDup = keptVectors.some((kv) => cosineSimilarity(kv, vectors[i]) >= DUPLICATE_SIMILARITY_THRESHOLD);
    if (!isDup) {
      kept.push(signals[i]);
      keptVectors.push(vectors[i]);
    }
  }
  return kept;
}

const DEDUPE_SYSTEM = `You are deduplicating a list of strategic signals. Two signals are duplicates only if they describe the same underlying event or claim -- not merely the same theme. Respond with JSON only: {"duplicateGroups": string[][]} where each inner array lists the ids of signals that are near-duplicates of each other. Omit signals that have no duplicate. Never put a signal in more than one group.`;

/** LLM-based dedupe: the model flags groups of near-duplicate ids; we keep the
 * earliest signal in each group and drop the rest. Deterministic removal from
 * the model's grouping -- the model decides similarity, code decides survivors. */
async function dedupeByLlm(signals: Signal[], providers: Providers, usage: UsageTracker): Promise<Signal[]> {
  const parsed = await completeJson<{ duplicateGroups?: string[][] }>(
    providers.llm,
    {
      system: DEDUPE_SYSTEM,
      prompt: signals.map((s) => `${s.id}: ${s.title} -- ${s.summary}`).join("\n"),
      maxTokens: 1500,
      model: DEFAULT_EXTRACTION_MODEL,
      kind: "cluster-dedupe",
    },
    (r) => usage.recordLlm("dedupe_cluster", r.model, r.inputTokens, r.outputTokens)
  );

  const validIds = new Set(signals.map((s) => s.id));
  const order = new Map(signals.map((s, i) => [s.id, i]));
  const dropped = new Set<string>();
  for (const group of parsed.duplicateGroups ?? []) {
    const members = group.filter((id) => validIds.has(id));
    if (members.length < 2) continue;
    // Keep the earliest-indexed member; drop the rest.
    const survivor = members.reduce((a, b) => ((order.get(a)! <= order.get(b)!) ? a : b));
    for (const id of members) if (id !== survivor) dropped.add(id);
  }
  return signals.filter((s) => !dropped.has(s.id));
}

/** Greedy agglomerative clustering down to `targetClusters` groups, using
 * average-linkage cosine similarity. Proposes clusters from embeddings first;
 * naming (a separate LLM pass) happens afterward -- this keeps the grouping
 * decision data-driven rather than an LLM free-associating clusters with no
 * stability guarantee. */
export async function clusterSignals(
  signals: Signal[],
  targetClusters: number,
  providers: Providers,
  usage: UsageTracker
): Promise<{ clusters: Cluster[]; vectorsBySignalId: Map<string, number[]> }> {
  if (signals.length === 0) return { clusters: [], vectorsBySignalId: new Map() };
  if (!providers.embeddingsAvailable) {
    return { clusters: await clusterByLlm(signals, targetClusters, providers, usage), vectorsBySignalId: new Map() };
  }

  const { vectors, tokens } = await providers.embedding.embed(signals.map((s) => `${s.title}. ${s.summary}`));
  usage.recordEmbedding("dedupe_cluster", tokens);

  const vectorsBySignalId = new Map(signals.map((s, i) => [s.id, vectors[i]]));

  type Group = { signalIds: string[]; vectors: number[][] };
  let groups: Group[] = signals.map((s, i) => ({ signalIds: [s.id], vectors: [vectors[i]] }));

  const centroid = (g: Group): number[] => {
    const dims = g.vectors[0].length;
    const c = new Array(dims).fill(0);
    for (const v of g.vectors) for (let d = 0; d < dims; d++) c[d] += v[d];
    return c.map((x) => x / g.vectors.length);
  };

  const clampedTarget = Math.max(1, Math.min(targetClusters, groups.length));
  while (groups.length > clampedTarget) {
    let bestI = 0, bestJ = 1, bestSim = -Infinity;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const sim = cosineSimilarity(centroid(groups[i]), centroid(groups[j]));
        if (sim > bestSim) { bestSim = sim; bestI = i; bestJ = j; }
      }
    }
    const merged: Group = {
      signalIds: [...groups[bestI].signalIds, ...groups[bestJ].signalIds],
      vectors: [...groups[bestI].vectors, ...groups[bestJ].vectors],
    };
    groups = groups.filter((_, idx) => idx !== bestI && idx !== bestJ);
    groups.push(merged);
  }

  const clusters: Cluster[] = groups.map((g, i) => ({
    id: `C-${String(i + 1).padStart(2, "0")}`,
    label: `Cluster ${i + 1}`,
    signalIds: g.signalIds,
    method: "embedding",
    coherence: avgPairwiseSimilarity(g.vectors),
  }));

  return { clusters, vectorsBySignalId };
}

const GROUP_SYSTEM = (n: number) => `You are grouping strategic signals into exactly ${n} thematic clusters by the structural force each reveals (not by surface topic). Respond with JSON only: {"clusters": [{"label": string (3-5 word theme), "signalIds": string[]}]}. Assign every signal id to exactly one cluster. Return exactly ${n} clusters unless there are fewer signals than ${n}.`;

/** LLM-based clustering: the model assigns every signal to one of `targetClusters`
 * thematic groups. We validate the assignment (every signal placed exactly once)
 * and repair gaps with round-robin, so a malformed or partial LLM response still
 * yields well-formed, non-degenerate clusters. Replaces the embedding path when
 * no embeddings provider is configured. */
async function clusterByLlm(
  signals: Signal[],
  targetClusters: number,
  providers: Providers,
  usage: UsageTracker
): Promise<Cluster[]> {
  const target = Math.max(1, Math.min(targetClusters, signals.length));

  const parsed = await completeJson<{ clusters?: { label?: string; signalIds?: string[] }[] }>(
    providers.llm,
    {
      system: GROUP_SYSTEM(target),
      prompt: signals.map((s) => `${s.id} [${s.category}]: ${s.title} -- ${s.summary}`).join("\n"),
      maxTokens: 2000,
      model: DEFAULT_EXTRACTION_MODEL,
      kind: "cluster-group",
    },
    (r) => usage.recordLlm("dedupe_cluster", r.model, r.inputTokens, r.outputTokens)
  );

  const validIds = new Set(signals.map((s) => s.id));
  const assigned = new Set<string>();
  // Seed exactly `target` buckets; the LLM's first `target` groups fill them.
  const buckets: { label: string; signalIds: string[] }[] = Array.from({ length: target }, (_, i) => ({
    label: `Cluster ${i + 1}`,
    signalIds: [],
  }));
  (parsed.clusters ?? []).slice(0, target).forEach((c, i) => {
    if (c.label) buckets[i].label = c.label;
    for (const id of c.signalIds ?? []) {
      if (validIds.has(id) && !assigned.has(id)) {
        buckets[i].signalIds.push(id);
        assigned.add(id);
      }
    }
  });

  // Repair: place any signal the LLM dropped into the smallest bucket, keeping
  // clusters balanced and guaranteeing every signal lands somewhere.
  for (const s of signals) {
    if (assigned.has(s.id)) continue;
    const smallest = buckets.reduce((a, b) => (a.signalIds.length <= b.signalIds.length ? a : b));
    smallest.signalIds.push(s.id);
    assigned.add(s.id);
  }

  return buckets
    .filter((b) => b.signalIds.length > 0)
    .map((b, i) => ({
      id: `C-${String(i + 1).padStart(2, "0")}`,
      label: b.label,
      signalIds: b.signalIds,
      method: "llm-named" as const,
    }));
}

function avgPairwiseSimilarity(vectors: number[][]): number {
  if (vectors.length <= 1) return 1;
  let sum = 0, count = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      sum += cosineSimilarity(vectors[i], vectors[j]);
      count++;
    }
  }
  return count === 0 ? 1 : sum / count;
}
