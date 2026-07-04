import { Fragment, useEffect, useMemo, useState } from "react";
import type { BrandConfig, ScanResult, Signal } from "@horizon/shared";
import { T, FONT, card, eyebrow, STEEP_COLORS, STEEP_LABELS, TIER_COLORS, LANE_COLORS } from "../theme.js";
import { api } from "../api.js";
import { Globe } from "./Globe.js";
import { AnimatedNumber } from "./AnimatedNumber.js";

const NAV = ["Overview", "Signals", "Drivers", "Scenarios", "Strategy", "Timeline"] as const;
type View = (typeof NAV)[number];

const STAGE_LABELS: Record<string, string> = {
  query_design: "Designing queries",
  ingest: "Ingesting sources",
  extract: "Extracting signals",
  dedupe_cluster: "Deduplicating",
  gap_analysis: "Hunting absences & counter-signals",
  cluster_name: "Naming clusters",
  driver_synthesis: "Synthesizing drivers",
  scenario_generation: "Writing scenarios",
  matrix_timeline: "Scoring strategy matrix",
};

/** Render dispatch prose with [S-00x] citations as gold mono chips. */
function Dispatch({ text }: { text: string }) {
  const parts = text.split(/(\[S-\d{3}\])/g);
  return (
    <p style={{ whiteSpace: "pre-wrap", color: T.textPrimary, lineHeight: 1.85, fontSize: 15.5, fontFamily: FONT.display, maxWidth: "68ch", margin: "0 0 4px" }}>
      {parts.map((part, i) =>
        /^\[S-\d{3}\]$/.test(part) ? (
          <span key={i} style={{ fontFamily: FONT.mono, fontSize: 10.5, color: T.gold, background: `${T.gold}14`, border: `1px solid ${T.gold}30`, borderRadius: 3, padding: "1px 5px", margin: "0 2px", verticalAlign: "1px", whiteSpace: "nowrap" }}>
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </p>
  );
}

function SurpriseDots({ level }: { level: number }) {
  return (
    <span style={{ fontFamily: FONT.mono, letterSpacing: 2, fontSize: 9 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ color: i <= level ? T.gold : T.textMuted }}>●</span>
      ))}
    </span>
  );
}

function SignalCard({ s }: { s: Signal }) {
  const isAbsence = s.type === "Absence";
  const isCounter = s.type === "Counter-Signal";
  const edge = isAbsence ? T.amber : isCounter ? T.red : STEEP_COLORS[s.category] ?? T.textMuted;
  return (
    <div style={{
      background: T.bgCard,
      border: `1px ${isAbsence || isCounter ? "dashed" : "solid"} ${isAbsence ? T.amber + "45" : isCounter ? T.red + "45" : T.glassBorder}`,
      borderLeft: `3px ${isAbsence || isCounter ? "dashed" : "solid"} ${edge}`,
      borderRadius: 7, padding: "14px 16px", transition: "background 180ms ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted, letterSpacing: 1 }}>{s.id} · {s.geo}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SurpriseDots level={s.surprise} />
          <span style={{ ...eyebrow(edge, 9) }}>{isAbsence ? "ABSENCE" : isCounter ? "COUNTER" : STEEP_LABELS[s.category] ?? s.category}</span>
        </span>
      </div>
      <h4 style={{ fontSize: 13.5, fontWeight: 500, color: T.textHeading, margin: "0 0 6px", lineHeight: 1.35 }}>{s.title}</h4>
      <p style={{ fontSize: 12, color: T.textSecondary, margin: "0 0 8px", lineHeight: 1.55 }}>{s.summary}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, letterSpacing: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.confidence.toUpperCase()}
        </span>
        {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.blue, textDecoration: "none", flexShrink: 0 }}>source ↗</a>}
      </div>
    </div>
  );
}

/** Estimate range bar with the measured actual plotted against it. */
function CostReconciliation({ scan }: { scan: ScanResult }) {
  const { estimate, actualCostUsd = 0 } = scan;
  const scaleMax = Math.max(estimate.highUsd * 1.15, actualCostUsd * 1.15, 0.0001);
  const pct = (v: number) => `${(v / scaleMax) * 100}%`;
  const withinRange = actualCostUsd >= estimate.lowUsd && actualCostUsd <= estimate.highUsd;
  return (
    <div style={{ ...card, padding: "22px 26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ ...eyebrow() }}>COST · ESTIMATE VS ACTUAL</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: withinRange || actualCostUsd < estimate.lowUsd ? T.green : T.amber }}>
          {actualCostUsd === 0 ? "FREE RUN" : withinRange ? "WITHIN ESTIMATE" : actualCostUsd < estimate.lowUsd ? "UNDER ESTIMATE" : "OVER ESTIMATE"}
        </span>
      </div>
      <div style={{ position: "relative", height: 26 }}>
        <div style={{ position: "absolute", top: 11, left: 0, right: 0, height: 4, background: T.bgPrimary, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 11, left: pct(estimate.lowUsd), width: `calc(${pct(estimate.highUsd)} - ${pct(estimate.lowUsd)})`, height: 4, background: `${T.gold}50`, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 4, left: pct(actualCostUsd), width: 2, height: 18, background: T.green, transform: "translateX(-1px)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 10, color: T.textMuted, fontVariantNumeric: "tabular-nums" }}>
        <span>est ${estimate.lowUsd.toFixed(2)}–${estimate.highUsd.toFixed(2)}</span>
        <span style={{ color: T.green }}>actual ${actualCostUsd.toFixed(3)}</span>
      </div>
    </div>
  );
}

export function ScanResults({ scanId, brands }: { scanId: string; brands: BrandConfig[] }) {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const s = await api.getScan(scanId);
      if (cancelled) return;
      setScan(s);
      if (s.status === "pending" || s.status === "running") setTimeout(poll, 1200);
    };
    poll();
    return () => { cancelled = true; };
  }, [scanId]);

  const filteredSignals = useMemo(() => {
    if (!scan) return [];
    if (filter === "All") return scan.signals;
    if (filter === "Absence") return scan.signals.filter((s) => s.type === "Absence");
    if (filter === "Counter") return scan.signals.filter((s) => s.type === "Counter-Signal");
    return scan.signals.filter((s) => s.category === filter);
  }, [scan, filter]);

  if (!scan) return <div style={{ color: T.textMuted, fontFamily: FONT.mono, fontSize: 12 }}>LOADING…</div>;

  const brandName = brands.find((b) => b.id === scan.brandId)?.name ?? "Unknown brand";

  if (scan.status === "pending" || scan.status === "running") {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto 0", animation: "fadeUp 400ms ease" }}>
        <div style={{ ...eyebrow(T.gold), marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, animation: "pulse 1.4s ease infinite" }} />
          SCAN IN PROGRESS · {brandName.toUpperCase()}
        </div>
        <div style={{ ...card, padding: "26px 30px", fontFamily: FONT.mono }}>
          {scan.progress.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", fontSize: 12, padding: "5px 0", color: p.status === "failed" ? T.red : p.status === "done" ? T.textSecondary : T.gold }}>
              <span style={{ width: 14, flexShrink: 0 }}>
                {p.status === "done" ? "▸" : p.status === "failed" ? "✕" : <span style={{ animation: "pulse 1.2s ease infinite" }}>●</span>}
              </span>
              <span style={{ flex: 1 }}>{STAGE_LABELS[p.stage] ?? p.stage}</span>
              {p.detail && <span style={{ fontSize: 10, color: T.textMuted, textAlign: "right" }}>{p.detail}</span>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: T.textMuted, marginTop: 14, fontFamily: FONT.mono, letterSpacing: 0.5 }}>
          est ${scan.estimate.lowUsd.toFixed(2)}–${scan.estimate.highUsd.toFixed(2)} · metering actual usage per call
        </p>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div style={{ ...card, borderColor: `${T.red}40`, padding: 32, maxWidth: 640, margin: "40px auto 0" }}>
        <div style={{ ...eyebrow(T.red), marginBottom: 10 }}>SCAN FAILED</div>
        <div style={{ color: T.textPrimary, fontSize: 13, lineHeight: 1.6 }}>{scan.error}</div>
        {(scan.actualCostUsd ?? 0) > 0 && (
          <div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 11, color: T.textMuted }}>spend before failure: ${scan.actualCostUsd?.toFixed(3)}</div>
        )}
      </div>
    );
  }

  const absenceCount = scan.signals.filter((s) => s.type === "Absence").length;
  const counterCount = scan.signals.filter((s) => s.type === "Counter-Signal").length;

  return (
    <div style={{ animation: "fadeIn 300ms ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
        <div>
          <div style={{ ...eyebrow(T.gold), marginBottom: 8 }}>SCAN COMPLETE · {new Date(scan.createdAt).toLocaleDateString()}</div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 38, fontWeight: 400, color: T.textHeading, margin: 0, lineHeight: 1.1 }}>
            {brandName}<span style={{ color: T.textMuted }}>:</span> <span style={{ fontStyle: "italic", color: T.gold }}>the decade ahead</span>
          </h1>
        </div>
      </div>

      <nav style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.glassBorder}`, margin: "24px 0 32px" }}>
        {NAV.map((n) => (
          <button
            key={n}
            onClick={() => setView(n)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "11px 18px", fontSize: 13,
              fontFamily: FONT.body, fontWeight: 500,
              color: view === n ? T.textHeading : T.textMuted,
              borderBottom: view === n ? `2px solid ${T.gold}` : "2px solid transparent",
              marginBottom: -1, transition: "color 150ms ease",
            }}
          >{n}</button>
        ))}
      </nav>

      {view === "Overview" && (
        <div style={{ display: "grid", gap: 20, animation: "fadeUp 350ms ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
            {[
              { label: "Signals", value: scan.signals.length, color: T.blue },
              { label: "Absences", value: absenceCount, color: T.amber },
              { label: "Counter-signals", value: counterCount, color: T.red },
              { label: "Drivers", value: scan.drivers.length, color: T.gold },
              { label: "Scenarios", value: scan.scenarios.length, color: T.green },
              { label: "Actions", value: scan.timeline.length, color: T.violet },
            ].map((m, i) => (
              <div key={m.label} style={{ ...card, padding: "18px 18px 14px", borderTop: `2px solid ${m.color}55` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: m.color, lineHeight: 1 }}>
                  <AnimatedNumber value={m.value} delay={i * 110} />
                </div>
                <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 7, letterSpacing: 0.3 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <CostReconciliation scan={scan} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ ...card, padding: 26 }}>
              <div style={{ ...eyebrow(), marginBottom: 16 }}>DRIVERS AT A GLANCE</div>
              <div style={{ display: "grid", gap: 10 }}>
                {scan.drivers.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: STEEP_COLORS[d.steep] ?? T.gold, flexShrink: 0 }}>{d.id}</span>
                    <span style={{ fontSize: 13, color: T.textPrimary, flex: 1 }}>{d.name}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: d.trajectory === "Accelerating" ? T.green : T.amber, flexShrink: 0 }}>
                      {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: 26 }}>
              <div style={{ ...eyebrow(), marginBottom: 16 }}>SCENARIO PORTFOLIO</div>
              <div style={{ display: "grid", gap: 10 }}>
                {scan.scenarios.map((s) => (
                  <button key={s.id} onClick={() => { setView("Scenarios"); setSelectedScenario(s.id); }}
                    style={{ display: "flex", alignItems: "baseline", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                    <span style={{ ...eyebrow(TIER_COLORS[s.tier], 9), flexShrink: 0, width: 74 }}>{s.tier}</span>
                    <span style={{ fontSize: 13, color: T.textPrimary, fontFamily: FONT.body }}>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "Signals" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(400px, 5fr) 7fr", gap: 20, alignItems: "start", animation: "fadeUp 350ms ease" }}>
          <div style={{ ...card, padding: "22px 22px 16px", position: "sticky", top: 84 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ ...eyebrow() }}>SIGNAL ATLAS</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted }}>{scan.signals.length} SIGNALS · DRAG TO ROTATE</span>
            </div>
            <Globe signals={filteredSignals} size={430} />
          </div>

          <div>
            <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
              {["All", "S", "T", "Ec", "En", "P", "Absence", "Counter"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? T.bgElevated : "transparent",
                  border: `1px solid ${filter === f ? T.gold + "45" : T.glassBorder}`,
                  color: filter === f ? T.textHeading : T.textMuted,
                  padding: "6px 13px", fontSize: 10, cursor: "pointer", borderRadius: 4,
                  fontFamily: FONT.mono, letterSpacing: 1, transition: "all 150ms ease",
                }}>
                  {f === "Absence" ? "◌ ABSENCE" : f === "Counter" ? "✕ COUNTER" : f.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {filteredSignals.map((s) => <SignalCard key={s.id} s={s} />)}
            </div>
          </div>
        </div>
      )}

      {view === "Drivers" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, animation: "fadeUp 350ms ease" }}>
          {scan.drivers.map((d, i) => (
            <div key={d.id} style={{ ...card, padding: 26, borderLeft: `3px solid ${STEEP_COLORS[d.steep] ?? T.textMuted}`, animation: `fadeUp 400ms ${i * 70}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: STEEP_COLORS[d.steep] ?? T.gold, fontWeight: 600, letterSpacing: 1 }}>{d.id}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ ...eyebrow(STEEP_COLORS[d.steep] ?? T.textSecondary, 9) }}>{STEEP_LABELS[d.steep] ?? d.steep}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: d.trajectory === "Accelerating" ? T.green : T.amber }}>
                    {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory.toUpperCase()}
                  </span>
                </div>
              </div>
              <h3 style={{ fontFamily: FONT.display, fontSize: 23, fontWeight: 400, color: T.textHeading, margin: "0 0 10px" }}>{d.name}</h3>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.65, margin: "0 0 14px" }}>{d.desc}</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {d.signalIds.map((sid) => (
                  <span key={sid} style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, background: T.bgPrimary, padding: "2px 7px", borderRadius: 3, letterSpacing: 0.5 }}>{sid}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "Scenarios" && (
        <div style={{ animation: "fadeUp 350ms ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {scan.scenarios.map((s) => (
              <button key={s.id} onClick={() => setSelectedScenario(selectedScenario === s.id ? null : s.id)}
                style={{
                  ...card, padding: 22, cursor: "pointer", textAlign: "left",
                  borderTop: `3px solid ${TIER_COLORS[s.tier]}`,
                  outline: selectedScenario === s.id ? `1px solid ${TIER_COLORS[s.tier]}66` : "none",
                  transition: "transform 180ms ease",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted }}>S{s.id}</span>
                  <span style={{ ...eyebrow(TIER_COLORS[s.tier], 9) }}>{s.tier === "Cassandra" ? "⚠ CASSANDRA" : s.tier}</span>
                </div>
                <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 400, color: T.textHeading, margin: "0 0 8px", lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.55, fontStyle: "italic" }}>{s.tagline}</p>
                <div style={{ display: "flex", gap: 12, marginTop: 12, fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted }}>
                  <span>{s.citedSignalIds.length} CITED</span>
                  <span>{s.confidence.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedScenario != null && (() => {
            const s = scan.scenarios.find((x) => x.id === selectedScenario);
            if (!s) return null;
            const evidence = s.citedSignalIds
              .map((id) => scan.signals.find((sig) => sig.id === id))
              .filter((sig): sig is Signal => !!sig);
            return (
              <div style={{ ...card, marginTop: 24, padding: "42px 48px", position: "relative", borderColor: `${TIER_COLORS[s.tier]}30`, animation: "slideUp 350ms ease" }}>
                <button onClick={() => setSelectedScenario(null)} style={{ position: "absolute", top: 18, right: 24, background: "none", border: "none", color: T.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 46, height: 3, background: TIER_COLORS[s.tier], borderRadius: 2 }} />
                  <span style={{ ...eyebrow(TIER_COLORS[s.tier]) }}>{s.tier === "Cassandra" ? "⚠ CASSANDRA" : s.tier}</span>
                  <span style={{ ...eyebrow() }}>CONFIDENCE: {s.confidence}</span>
                  {evidence.length === 0 && <span style={{ ...eyebrow(T.red) }}>UNGROUNDED — NO EVIDENCE CITED</span>}
                </div>
                <h2 style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 400, color: T.textHeading, margin: "0 0 4px" }}>{s.title}</h2>
                <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 16, color: T.textSecondary, margin: "0 0 26px" }}>{s.tagline}</p>

                <Dispatch text={s.dispatch} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, margin: "28px 0" }}>
                  <div style={{ background: `${T.amber}0D`, border: `1px solid ${T.amber}28`, borderRadius: 6, padding: "16px 18px" }}>
                    <div style={{ ...eyebrow(T.amber), marginBottom: 8 }}>SHADOW SIDE</div>
                    <p style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.6, margin: 0 }}>{s.shadow}</p>
                  </div>
                  <div style={{ background: `${T.red}0D`, border: `1px solid ${T.red}28`, borderRadius: 6, padding: "16px 18px" }}>
                    <div style={{ ...eyebrow(T.red), marginBottom: 8 }}>KILLER ASSUMPTION</div>
                    <p style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.6, margin: 0 }}>{s.killerAssumption}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                  {Object.entries(s.dimensions).map(([dim, v]) => (
                    <div key={dim}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ ...eyebrow(T.textMuted, 9) }}>{dim}</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textSecondary }}>{v}</span>
                      </div>
                      <div style={{ height: 3, background: T.bgPrimary, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${v}%`, background: TIER_COLORS[s.tier], borderRadius: 2, opacity: 0.75 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {evidence.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.glassBorder}`, paddingTop: 22, marginBottom: 22 }}>
                    <div style={{ ...eyebrow(T.gold), marginBottom: 12 }}>EVIDENCE CITED</div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {evidence.map((sig) => (
                        <div key={sig.id} style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>
                          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.gold }}>{sig.id}</span>{" "}
                          {sig.url ? (
                            <a href={sig.url} target="_blank" rel="noreferrer" style={{ color: T.textPrimary, textDecoration: "none", borderBottom: `1px solid ${T.glassBorderStrong}` }}>{sig.title} ↗</a>
                          ) : (
                            <span style={{ color: T.textPrimary }}>{sig.title}</span>
                          )}
                          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted }}> · {sig.confidence.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {s.actions.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.glassBorder}`, paddingTop: 22 }}>
                    <div style={{ ...eyebrow(), marginBottom: 12 }}>RECOMMENDED ACTIONS</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {s.actions.map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                          <span style={{ ...eyebrow(LANE_COLORS[a.lane], 9), width: 66, flexShrink: 0 }}>{a.lane}</span>
                          <span style={{ fontSize: 13, color: T.textPrimary }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {view === "Strategy" && (
        <div style={{ animation: "fadeUp 350ms ease" }}>
          <div style={{ ...card, padding: 30, overflowX: "auto" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 3, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", ...eyebrow() }}>BUSINESS UNIT</th>
                  {scan.scenarios.map((s) => (
                    <th key={s.id} title={s.title} style={{ padding: "8px 6px", fontFamily: FONT.mono, fontSize: 10, fontWeight: 500, color: TIER_COLORS[s.tier], cursor: "default" }}>S{s.id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scan.matrix.map((row) => (
                  <tr key={row.businessUnit}>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: T.textPrimary, whiteSpace: "nowrap" }}>{row.businessUnit}</td>
                    {row.scores.map((score, i) => {
                      const type = row.types[i];
                      const hue = type === "opp" ? T.green : type === "threat" ? T.red : T.textMuted;
                      const alpha = type === "mon" ? 0.06 : 0.07 + score * 0.055;
                      return (
                        <td key={i} style={{
                          padding: "10px 6px", textAlign: "center", borderRadius: 4,
                          background: `${hue}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`,
                          fontFamily: FONT.mono, fontSize: 11.5, color: type === "mon" ? T.textMuted : hue,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {score}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16, paddingLeft: 4 }}>
            {[["OPPORTUNITY", T.green], ["THREAT", T.red], ["MONITOR", T.textMuted]].map(([label, color]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 7, ...eyebrow(color as string, 9) }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: `${color}44` }} />
                {label}
              </span>
            ))}
            <span style={{ ...eyebrow(T.textMuted, 9) }}>CELL VALUE = IMPACT MAGNITUDE 1–4</span>
          </div>
        </div>
      )}

      {view === "Timeline" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, animation: "fadeUp 350ms ease" }}>
          {(["now", "monitor", "prepare"] as const).map((lane) => {
            const items = scan.timeline.filter((t) => t.lane === lane);
            const captions = { now: "Evidence strong. Fund and build.", monitor: "Track the leading indicators.", prepare: "Scenario-dependent capabilities." };
            return (
              <div key={lane}>
                <div style={{ borderBottom: `2px solid ${LANE_COLORS[lane]}66`, paddingBottom: 10, marginBottom: 14 }}>
                  <div style={{ ...eyebrow(LANE_COLORS[lane], 11) }}>{lane === "now" ? "NOW" : lane === "monitor" ? "MONITOR" : "PREPARE FOR"}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{captions[lane]}</div>
                </div>
                <div style={{ display: "grid", gap: 9 }}>
                  {items.map((t, i) => (
                    <button key={i} onClick={() => { setView("Scenarios"); setSelectedScenario(t.scenarioId); }}
                      style={{ ...card, padding: "13px 15px", cursor: "pointer", textAlign: "left", borderLeft: `2px solid ${LANE_COLORS[lane]}55` }}>
                      <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, marginBottom: 5, letterSpacing: 1 }}>{t.year} · S{t.scenarioId}</div>
                      <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.45 }}>{t.label}</div>
                    </button>
                  ))}
                  {items.length === 0 && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted }}>NONE</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
