import { useState } from "react";
import type { Scenario } from "@horizon/shared";
import { T, FONT, eyebrow, TIER_COLORS } from "../theme.js";

/** Plots every scenario on a likelihood × impact field. Likelihood is read
 * from tier + confidence; impact from the scenario's own relevance/appeal
 * dimensions; bubble size = evidence cited. One glance ranks the portfolio. */

function likelihood(s: Scenario): number {
  const base = s.tier === "Probable" ? 0.82 : s.tier === "Deep" ? 0.5 : 0.32;
  const adj = s.confidence === "Verified" ? 0.08 : s.confidence === "Contested" ? -0.1 : 0;
  return Math.max(0.06, Math.min(0.96, base + adj));
}
function impact(s: Scenario): number {
  const v = (s.dimensions.relevance * 0.6 + s.dimensions.appeal * 0.4) / 100;
  return Math.max(0.06, Math.min(0.96, v));
}

export function ScenarioField({ scenarios, selectedId, onSelect }: {
  scenarios: Scenario[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const PAD = 8; // % inset for axes

  return (
    <div className="glass--strong" style={{ padding: "22px 26px 16px", marginBottom: 24, animation: "fadeUp 450ms both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ ...eyebrow() }}>SCENARIO FIELD · LIKELIHOOD × IMPACT</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted }}>BUBBLE = EVIDENCE CITED · CLICK TO OPEN</span>
      </div>

      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", minHeight: 240 }}>
        {/* grid + axis frame */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[25, 50, 75].map((g) => (
            <g key={g}>
              <line x1={g} y1={PAD} x2={g} y2={100 - PAD} stroke="rgba(255,255,255,0.05)" strokeWidth={0.2} />
              <line x1={PAD} y1={g} x2={100 - PAD} y2={g} stroke="rgba(255,255,255,0.05)" strokeWidth={0.2} />
            </g>
          ))}
          <line x1={PAD} y1={100 - PAD} x2={100 - PAD} y2={100 - PAD} stroke="rgba(255,255,255,0.14)" strokeWidth={0.3} />
          <line x1={PAD} y1={PAD} x2={PAD} y2={100 - PAD} stroke="rgba(255,255,255,0.14)" strokeWidth={0.3} />
        </svg>

        {/* axis labels */}
        <span style={{ position: "absolute", left: "50%", bottom: -2, transform: "translateX(-50%)", ...eyebrow(T.textMuted, 9) }}>LIKELIHOOD →</span>
        <span style={{ position: "absolute", left: -6, top: "50%", transform: "rotate(-90deg) translateX(50%)", transformOrigin: "left center", ...eyebrow(T.textMuted, 9) }}>IMPACT →</span>

        {/* bubbles */}
        {scenarios.map((s, i) => {
          const lx = PAD + likelihood(s) * (100 - 2 * PAD);
          const ly = (100 - PAD) - impact(s) * (100 - 2 * PAD);
          const size = 20 + s.citedSignalIds.length * 5;
          const c = TIER_COLORS[s.tier];
          const active = selectedId === s.id || hover === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "absolute", left: `${lx}%`, top: `${ly}%`,
                width: size, height: size, transform: "translate(-50%, -50%)",
                borderRadius: "50%", cursor: "pointer", padding: 0,
                background: `radial-gradient(circle at 35% 30%, ${c}E6, ${c}55)`,
                border: `1.5px solid ${active ? "#fff" : c}`,
                boxShadow: active ? `0 0 22px ${c}` : `0 0 12px ${c}66`,
                transition: "box-shadow 200ms ease, transform 200ms cubic-bezier(0.2,0.8,0.2,1), border-color 200ms",
                animation: `pop 500ms ${i * 60}ms both`,
                zIndex: active ? 3 : 1,
              }}
            >
              <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, color: "#0A0D18" }}>
                {s.id}
              </span>
            </button>
          );
        })}

        {/* hover tooltip */}
        {hover != null && (() => {
          const s = scenarios.find((x) => x.id === hover)!;
          const lx = PAD + likelihood(s) * (100 - 2 * PAD);
          const ly = (100 - PAD) - impact(s) * (100 - 2 * PAD);
          return (
            <div className="glass--strong" style={{
              position: "absolute", left: `${Math.min(lx, 70)}%`, top: `${Math.max(ly - 6, 4)}%`,
              transform: "translate(0, -115%)", maxWidth: 240, padding: "9px 12px", borderRadius: 8,
              pointerEvents: "none", zIndex: 5, borderColor: `${TIER_COLORS[s.tier]}55`,
            }}>
              <div style={{ ...eyebrow(TIER_COLORS[s.tier], 9), marginBottom: 4 }}>{s.tier} · S{s.id}</div>
              <div style={{ fontSize: 12.5, color: T.textHeading, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</div>
            </div>
          );
        })()}
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
        {(["Probable", "Deep", "Cassandra"] as const).map((t) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, ...eyebrow(TIER_COLORS[t], 9) }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLORS[t] }} />{t}
          </span>
        ))}
      </div>
    </div>
  );
}
