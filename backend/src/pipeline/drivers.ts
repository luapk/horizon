import { DEFAULT_SYNTHESIS_MODEL, DEFAULT_EXTRACTION_MODEL, type Signal, type Cluster, type Driver } from "@horizon/shared";
import { completeJson, type Providers, type UsageTracker } from "../providers/index.js";

const NAME_SYSTEM = `Given a list of related strategic signal titles, respond with JSON only: {"label": string} -- a short (3-5 word) evocative name for the cluster of themes they share.`;

const DRIVER_SYSTEM = `You are a strategy analyst synthesizing a macro "driver" from a cluster of related signals. Respond with JSON only: {"name": string (short evocative driver name), "desc": string (2-4 sentences on the structural force these signals reveal and why it matters), "trajectory": "Accelerating"|"Nascent"|"Stable"|"Declining"}`;

export async function synthesizeDrivers(
  clusters: Cluster[],
  signals: Signal[],
  providers: Providers,
  usage: UsageTracker
): Promise<Driver[]> {
  const signalsById = new Map(signals.map((s) => [s.id, s]));
  const drivers: Driver[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const members = cluster.signalIds.map((id) => signalsById.get(id)).filter((s): s is Signal => !!s);
    if (members.length === 0) continue;

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

    drivers.push({
      id: `D-${String(i + 1).padStart(2, "0")}`,
      name: parsed.name,
      desc: parsed.desc,
      steep: dominantSteep as Driver["steep"],
      trajectory: parsed.trajectory,
      signalIds: cluster.signalIds,
      clusterIds: [cluster.id],
    });
  }

  return drivers;
}
