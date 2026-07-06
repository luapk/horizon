import type { ScanResult } from "@horizon/shared";

/** Composes a one-paragraph executive summary from a completed scan. Derived
 * deterministically from the result (counts, dominant drivers, lead scenario)
 * so it works in the demo and in production without a separate LLM call —
 * in production the pipeline can replace this with a written summary stage. */
export function executiveSummary(scan: ScanResult, brandName: string): string {
  const geos = new Set(scan.signals.map((s) => s.geo)).size;
  const absences = scan.signals.filter((s) => s.type === "Absence").length;
  const counters = scan.signals.filter((s) => s.type === "Counter-Signal").length;

  const drivers = scan.drivers.map((d) => d.name);
  const driverPhrase =
    drivers.length >= 3 ? `${drivers[0]}, ${drivers[1]} and ${drivers[2]}` :
    drivers.length === 2 ? `${drivers[0]} and ${drivers[1]}` :
    drivers[0] ?? "the emerging forces";

  const probable = scan.scenarios.find((s) => s.tier === "Probable");
  const cassandra = scan.scenarios.find((s) => s.tier === "Cassandra");

  const parts: string[] = [];
  parts.push(
    `This scan read ${scan.signals.length} signals across ${geos} ${geos === 1 ? "geography" : "geographies"} to map how the next decade could reshape ${brandName}.`
  );
  parts.push(
    `They resolve into ${scan.drivers.length} structural drivers — led by ${driverPhrase} — and ${scan.scenarios.length} evidence-cited scenarios.`
  );
  if (probable) {
    parts.push(`The most probable near-term path, "${probable.title}", holds that ${lowerFirst(stripPeriod(probable.tagline))}.`);
  }
  if (absences || counters) {
    const bits: string[] = [];
    if (absences) bits.push(`${absences} strategic ${absences === 1 ? "absence" : "absences"} (${absences === 1 ? "a capability" : "capabilities"} the evidence implies should exist but ${absences === 1 ? "doesn't" : "don't"})`);
    if (counters) bits.push(`${counters} counter-${counters === 1 ? "signal" : "signals"} cutting against the consensus`);
    parts.push(`The scan also surfaces ${bits.join(" and ")}.`);
  }
  if (cassandra) {
    parts.push(`The principal downside to watch is the "${cassandra.title}" scenario.`);
  }
  return parts.join(" ");
}

function stripPeriod(s: string): string {
  return s.replace(/\.\s*$/, "");
}
function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}
