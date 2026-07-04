import type { Scenario, TimelineItem, TimelineLane } from "@horizon/shared";

/** Mechanical, not LLM-generated -- tier already encodes urgency/certainty,
 * so deriving the lane from it is cheaper and just as defensible as asking
 * an LLM to re-derive the same signal. */
export function buildTimeline(scenarios: Scenario[]): TimelineItem[] {
  const currentYear = new Date().getFullYear();
  const laneFor: Record<Scenario["tier"], TimelineLane> = {
    Probable: "now",
    Cassandra: "monitor",
    Deep: "prepare",
  };
  const yearOffsetFor: Record<Scenario["tier"], number> = {
    Probable: 0,
    Cassandra: 1,
    Deep: 3,
  };

  return scenarios.map((s) => ({
    label: s.title,
    lane: laneFor[s.tier],
    year: currentYear + yearOffsetFor[s.tier],
    scenarioId: s.id,
  }));
}
