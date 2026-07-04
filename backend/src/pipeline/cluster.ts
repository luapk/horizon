import type { Signal, Cluster } from "@horizon/shared";
import { cosineSimilarity, type Providers, type UsageTracker } from "../providers/index.js";

const DUPLICATE_SIMILARITY_THRESHOLD = 0.93;

/** Embedding-based near-duplicate removal -- this is the automatic check the
 * hand-authored v3.0 prototype never had (it shipped 16 near-duplicate
 * signals padded to hit a marketing number). */
export async function dedupeSignals(
  signals: Signal[],
  providers: Providers,
  usage: UsageTracker
): Promise<Signal[]> {
  if (signals.length === 0) return [];
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
