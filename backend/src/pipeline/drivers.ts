import { DEFAULT_SYNTHESIS_MODEL, DEFAULT_EXTRACTION_MODEL, type Signal, type Cluster, type Driver } from "@horizon/shared";
import { completeJson, mapWithConcurrency, type Providers, type UsageTracker } from "../providers/index.js";

const DRIVER_CONCURRENCY = 4;

const NAME_SYSTEM = `Given a list of related strategic signal titles, respond with JSON only: {"label": string} -- a short (3-5 word) evocative name for the cluster of themes they share.`;

const DRIVER_SYSTEM = `You are a strategy analyst synthesizing a macro "driver" from a cluster of related signals. Respond with JSON only: {"name": string (short evocative driver name), "desc": string (2-4 sentences on the structural force these signals reveal and why it matters), "trajectory": "Accelerating"|"Nascent"|"Stable"|"Declining"}`;

export async function synthesizeDrivers(
  clusters: Cluster[],
  signals: Signal[],
  providers: Providers,
  usage: UsageTracker
): Promise<Driver[]> {
  const signalsById = new Map(signals.map((s) => [s.id, s]));

  // Each cluster's naming + synthesis is independent -- run clusters
  // concurrently so a scan's driver stage is one call deep, not N.
  const buildDriver = async (i: number): Promise<{ index: number; driver: Driver }> => {
    const cluster = clusters[i];
    const members = cluster.signalIds.map((id) => signalsById.get(id)).filter((s): s is Signal => !!s);

    const { label } = await completeJson<{ label: string }>(
      providers.llm,
      {
        system: NAME_SYSTEM,
        prompt: members.map((m) => `- ${m.title}`).join("\n"),
        maxTokens: 60,
        model: DEFAULT_EXTRACTION_MODEL,
        kind: "cluster-name",
      },
      (r) => usage.recordLlm("cluster_name", r.model, r.inputTokens, r.outputTokens)
    );
    cluster.label = label;

    const parsed = await completeJson<{ name: string; desc: string; trajectory: Driver["trajectory"] }>(
      providers.llm,
      {
        system: DRIVER_SYSTEM,
        prompt: members.map((m) => `- [${m.category}] ${m.title}: ${m.summary}`).join("\n"),
        maxTokens: 400,
        model: DEFAULT_SYNTHESIS_MODEL,
        kind: "driver-synth",
      },
      (r) => usage.recordLlm("driver_synthesis", r.model, r.inputTokens, r.outputTokens)
    );

    const steepCounts = new Map<string, number>();
    for (const m of members) steepCounts.set(m.category, (steepCounts.get(m.category) ?? 0) + 1);
    const dominantSteep = [...steepCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "T";

    return {
      index: i,
      driver: {
        id: `D-${String(i + 1).padStart(2, "0")}`,
        name: parsed.name,
        desc: parsed.desc,
        steep: dominantSteep as Driver["steep"],
        trajectory: parsed.trajectory,
        signalIds: cluster.signalIds,
        clusterIds: [cluster.id],
      },
    };
  };

  const populatedIdx = clusters
    .map((c, i) => ({ i, hasMembers: c.signalIds.some((id) => signalsById.has(id)) }))
    .filter((c) => c.hasMembers)
    .map((c) => c.i);

  const { results, failures } = await mapWithConcurrency(populatedIdx, DRIVER_CONCURRENCY, (i) => buildDriver(i));
  if (results.length === 0 && failures.length > 0) {
    throw new Error(`all ${failures.length} drivers failed to synthesize: ${failures[0].error}`);
  }

  return results.sort((a, b) => a.index - b.index).map((r) => r.driver);
}
