import type { ScanResult } from "@horizon/shared";
import { T, FONT, eyebrow } from "../theme.js";

/** Estimate range bar with the measured actual plotted against it — the
 * "we told you what it would cost, here's what it did" moment. */
export function CostReconciliation({ scan }: { scan: ScanResult }) {
  const { estimate, actualCostUsd = 0 } = scan;
  const scaleMax = Math.max(estimate.highUsd * 1.15, actualCostUsd * 1.15, 0.0001);
  const pct = (v: number) => `${(v / scaleMax) * 100}%`;
  const withinRange = actualCostUsd >= estimate.lowUsd && actualCostUsd <= estimate.highUsd;
  return (
    <div className="glass" style={{ padding: "22px 26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ ...eyebrow() }}>COST · ESTIMATE VS ACTUAL</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: withinRange || actualCostUsd < estimate.lowUsd ? T.mint : T.cyan }}>
          {actualCostUsd === 0 ? "FREE RUN" : withinRange ? "WITHIN ESTIMATE" : actualCostUsd < estimate.lowUsd ? "UNDER ESTIMATE" : "OVER ESTIMATE"}
        </span>
      </div>
      <div style={{ position: "relative", height: 26 }}>
        <div style={{ position: "absolute", top: 11, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 11, left: pct(estimate.lowUsd), width: `calc(${pct(estimate.highUsd)} - ${pct(estimate.lowUsd)})`, height: 4, background: `linear-gradient(90deg, ${T.blue}66, ${T.violet}66, ${T.pink}66)`, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 4, left: pct(actualCostUsd), width: 2, height: 18, background: T.mint, boxShadow: `0 0 10px ${T.mint}88`, transform: "translateX(-1px)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 10, color: T.textMuted, fontVariantNumeric: "tabular-nums" }}>
        <span>est ${estimate.lowUsd.toFixed(2)}–${estimate.highUsd.toFixed(2)}</span>
        <span style={{ color: T.mint }}>actual ${actualCostUsd.toFixed(3)}</span>
      </div>
    </div>
  );
}
