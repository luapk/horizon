import type { Scenario, TimelineItem, TimelineLane } from "@horizon/shared";

const YEAR_OFFSET: Record<TimelineLane, number> = { now: 0, monitor: 1, prepare: 3 };

/** Built from each scenario's recommended actions (specific things the brand
 * should do), falling back to the scenario title only when a scenario came
 * back without actions. */
export function buildTimeline(scenarios: Scenario[]): TimelineItem[] {
  const currentYear = new Date().getFullYear();
  const items: TimelineItem[] = [];

  for (const s of scenarios) {
    if (s.actions.length > 0) {
      for (const action of s.actions) {
        items.push({
          label: action.label,
          lane: action.lane,
          year: currentYear + YEAR_OFFSET[action.lane],
          scenarioId: s.id,
        });
      }
    } else {
      const lane: TimelineLane = s.tier === "Probable" ? "now" : s.tier === "Cassandra" ? "monitor" : "prepare";
      items.push({ label: s.title, lane, year: currentYear + YEAR_OFFSET[lane], scenarioId: s.id });
    }
  }

  const laneOrder: Record<TimelineLane, number> = { now: 0, monitor: 1, prepare: 2 };
  return items.sort((a, b) => laneOrder[a.lane] - laneOrder[b.lane] || a.year - b.year);
}
