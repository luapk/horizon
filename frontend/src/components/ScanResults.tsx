import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { BrandConfig, ScanResult, Signal } from "@horizon/shared";
import { T, FONT, eyebrow, display, STEEP_COLORS, STEEP_LABELS, TIER_COLORS, LANE_COLORS } from "../theme.js";
import { api } from "../api.js";
import { Globe, type Arc } from "./Globe.js";
import { AnimatedNumber } from "./AnimatedNumber.js";
import { ScenarioField } from "./ScenarioField.js";
import { DriverConstellation } from "./DriverConstellation.js";
import { StoryMode } from "./StoryMode.js";
import { CommandPalette, type Nav } from "./CommandPalette.js";
import { executiveSummary } from "../lib/scanSummary.js";
import { downloadScanPpt } from "../lib/exportPpt.js";
import { resolveGeo } from "../geo.js";
import { useIsNarrow } from "../hooks.js";

const NAV = ["Overview", "Signals", "Drivers", "Scenarios", "Strategy", "Timeline", "Story"] as const;
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

/** Render dispatch prose with [S-00x] citations as violet mono chips. */
function Dispatch({ text }: { text: string }) {
  const parts = text.split(/(\[S-\d{3}\])/g);
  return (
    <p style={{ whiteSpace: "pre-wrap", color: T.textPrimary, lineHeight: 1.85, fontSize: 15.5, fontFamily: FONT.display, maxWidth: "68ch", margin: "0 0 4px" }}>
      {parts.map((part, i) =>
        /^\[S-\d{3}\]$/.test(part) ? (
          <span key={i} style={{ fontFamily: FONT.mono, fontSize: 10.5, color: T.violet, background: `${T.violet}16`, border: `1px solid ${T.violet}35`, borderRadius: 4, padding: "1px 5px", margin: "0 2px", verticalAlign: "1px", whiteSpace: "nowrap" }}>
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
        <span key={i} style={{ color: i <= level ? T.violet : T.textMuted }}>●</span>
      ))}
    </span>
  );
}

function SignalCard({ s, index }: { s: Signal; index: number }) {
  const isAbsence = s.type === "Absence";
  const isCounter = s.type === "Counter-Signal";
  const edge = isAbsence ? T.cyan : isCounter ? T.rose : STEEP_COLORS[s.category] ?? T.textMuted;
  return (
    <div className="glass--flat lift-sm" style={{
      borderStyle: isAbsence || isCounter ? "dashed" : "solid",
      borderColor: isAbsence ? `${T.cyan}50` : isCounter ? `${T.rose}50` : undefined,
      borderLeft: `3px ${isAbsence || isCounter ? "dashed" : "solid"} ${edge}`,
      padding: "14px 16px",
      animation: `fadeUp 400ms ${Math.min(index * 40, 400)}ms both`,
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
    <div className="glass" style={{ padding: "22px 26px", animation: "fadeUp 450ms 200ms both" }}>
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

export function ScanResults({ scanId, brands }: { scanId: string; brands: BrandConfig[] }) {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");
  const [exporting, setExporting] = useState(false);
  const [focusGeo, setFocusGeo] = useState<{ lat: number; lng: number } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const narrow = useIsNarrow();

  const goTo = (n: Nav) => {
    setView(n.view as View);
    if (n.scenarioId != null) setSelectedScenario(n.scenarioId);
    if (n.filter) setFilter(n.filter);
  };

  // Selecting a scenario opens a full dispatch below the card grid; on tall
  // grids that lands off-screen, so bring it into view (accounting for the
  // sticky header via scroll-margin on the panel).
  useEffect(() => {
    if (selectedScenario != null) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedScenario]);

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
        <div style={{ ...eyebrow(T.violet), marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.violet, boxShadow: `0 0 10px ${T.violet}`, animation: "pulse 1.4s ease infinite" }} />
          SCAN IN PROGRESS · {brandName.toUpperCase()}
        </div>
        <div className="glass--strong" style={{ padding: "26px 30px", fontFamily: FONT.mono }}>
          {scan.progress.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", fontSize: 12, padding: "5px 0", color: p.status === "failed" ? T.rose : p.status === "done" ? T.textSecondary : T.violet, animation: "fadeIn 300ms ease" }}>
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
      <div className="glass" style={{ borderColor: `${T.rose}45`, padding: 32, maxWidth: 640, margin: "40px auto 0" }}>
        <div style={{ ...eyebrow(T.rose), marginBottom: 10 }}>SCAN FAILED</div>
        <div style={{ color: T.textPrimary, fontSize: 13, lineHeight: 1.6 }}>{scan.error}</div>
        {(scan.actualCostUsd ?? 0) > 0 && (
          <div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 11, color: T.textMuted }}>spend before failure: ${scan.actualCostUsd?.toFixed(3)}</div>
        )}
      </div>
    );
  }

  const absenceCount = scan.signals.filter((s) => s.type === "Absence").length;
  const counterCount = scan.signals.filter((s) => s.type === "Counter-Signal").length;

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadScanPpt(scan, brandName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 300ms ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...eyebrow(T.violet), marginBottom: 10 }}>SCAN COMPLETE · {new Date(scan.createdAt).toLocaleDateString()}</div>
          <h1 style={{ ...display(52), margin: 0 }}>
            {brandName}<span style={{ color: T.textMuted }}>:</span>{" "}
            <span style={{
              background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>the decade ahead</span>
          </h1>
        </div>
        <button className="btn-primary" onClick={onExport} disabled={exporting}
          style={{ padding: "11px 20px", fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", opacity: exporting ? 0.5 : 1, whiteSpace: "nowrap" }}>
          {exporting ? "BUILDING…" : "↓ DOWNLOAD PPT"}
        </button>
      </div>

      <nav style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.glassBorder}`, margin: "24px 0 32px" }}>
        {NAV.map((n) => (
          <button key={n} className={`navtab${view === n ? " active" : ""}`} onClick={() => setView(n)}>
            {n}
          </button>
        ))}
      </nav>

      {view === "Overview" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div className="glass--strong" style={{ padding: "30px 34px", animation: "fadeUp 450ms both" }}>
            <div style={{ ...eyebrow(T.violet), marginBottom: 16 }}>EXECUTIVE SUMMARY</div>
            <p style={{ ...display(23, T.textHeading, 500), letterSpacing: -0.4, lineHeight: 1.5, margin: 0, maxWidth: "60ch" }}>
              {executiveSummary(scan, brandName)}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 14 }}>
            {[
              { label: "Signals", value: scan.signals.length, color: T.blue },
              { label: "Absences", value: absenceCount, color: T.cyan },
              { label: "Counter-signals", value: counterCount, color: T.rose },
              { label: "Drivers", value: scan.drivers.length, color: T.violet },
              { label: "Scenarios", value: scan.scenarios.length, color: T.mint },
              { label: "Actions", value: scan.timeline.length, color: T.pink },
            ].map((m, i) => (
              <div key={m.label} className="glass lift" style={{ padding: "20px 18px 16px", borderTop: `2px solid ${m.color}66`, animation: `fadeUp 450ms ${120 + i * 70}ms both` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 46, fontWeight: 700, color: m.color, lineHeight: 0.95, letterSpacing: -2, textShadow: `0 0 28px ${m.color}44` }}>
                  <AnimatedNumber value={m.value} delay={i * 110} />
                </div>
                <div style={{ ...eyebrow(T.textMuted, 9), marginTop: 10 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <CostReconciliation scan={scan} />
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 20 }}>
            <div className="glass" style={{ padding: 26, animation: "fadeUp 450ms 280ms both" }}>
              <div style={{ ...eyebrow(), marginBottom: 16 }}>DRIVERS AT A GLANCE</div>
              <div style={{ display: "grid", gap: 10 }}>
                {scan.drivers.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: STEEP_COLORS[d.steep] ?? T.violet, flexShrink: 0 }}>{d.id}</span>
                    <span style={{ fontSize: 13, color: T.textPrimary, flex: 1 }}>{d.name}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: d.trajectory === "Accelerating" ? T.mint : T.cyan, flexShrink: 0 }}>
                      {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass" style={{ padding: 26, animation: "fadeUp 450ms 360ms both" }}>
              <div style={{ ...eyebrow(), marginBottom: 16 }}>SCENARIO PORTFOLIO</div>
              <div style={{ display: "grid", gap: 10 }}>
                {scan.scenarios.map((s) => (
                  <button key={s.id} className="lift-sm" onClick={() => { setView("Scenarios"); setSelectedScenario(s.id); }}
                    style={{ display: "flex", alignItems: "baseline", gap: 10, background: "none", border: "none", borderRadius: 6, cursor: "pointer", padding: "2px 4px", textAlign: "left" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(400px, 5fr) 7fr", gap: 20, alignItems: "start" }}>
          <div className="glass--strong" style={{ padding: "22px 22px 16px", position: narrow ? "static" : "sticky", top: 84, animation: "fadeUp 400ms both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ ...eyebrow() }}>SIGNAL ATLAS</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted }}>{scan.signals.length} SIGNALS · DRAG TO ROTATE</span>
            </div>
            <Globe signals={filteredSignals} size={narrow ? 320 : 430} arcs={buildArcs(scan)} focus={focusGeo} />
          </div>

          <div>
            <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
              {["All", "S", "T", "Ec", "En", "P", "Absence", "Counter"].map((f) => (
                <button key={f} className="chip" onClick={() => setFilter(f)} style={{
                  background: filter === f ? "rgba(179,157,255,0.12)" : "transparent",
                  border: `1px solid ${filter === f ? T.violet + "55" : T.glassBorder}`,
                  color: filter === f ? T.textHeading : T.textMuted,
                  padding: "6px 13px", fontSize: 10,
                  fontFamily: FONT.mono, letterSpacing: 1,
                }}>
                  {f === "Absence" ? "◌ ABSENCE" : f === "Counter" ? "✕ COUNTER" : f.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12 }}>
              {filteredSignals.map((s, i) => (
                <div key={s.id}
                  onMouseEnter={() => { const g = resolveGeo(s.geo)[0]; if (g) setFocusGeo({ lat: g.lat, lng: g.lng }); }}
                  onMouseLeave={() => setFocusGeo(null)}>
                  <SignalCard s={s} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "Drivers" && (
        <div>
        <DriverConstellation drivers={scan.drivers} />
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16 }}>
          {scan.drivers.map((d, i) => (
            <div key={d.id} className="glass lift" style={{ padding: 26, borderLeft: `3px solid ${STEEP_COLORS[d.steep] ?? T.textMuted}`, animation: `fadeUp 450ms ${i * 80}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: STEEP_COLORS[d.steep] ?? T.violet, fontWeight: 600, letterSpacing: 1 }}>{d.id}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ ...eyebrow(STEEP_COLORS[d.steep] ?? T.textSecondary, 9) }}>{STEEP_LABELS[d.steep] ?? d.steep}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: d.trajectory === "Accelerating" ? T.mint : T.cyan }}>
                    {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory.toUpperCase()}
                  </span>
                </div>
              </div>
              <h3 style={{ fontFamily: FONT.display, fontSize: 23, fontWeight: 700, color: T.textHeading, margin: "0 0 10px" }}>{d.name}</h3>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.65, margin: "0 0 14px" }}>{d.desc}</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {d.signalIds.map((sid) => (
                  <span key={sid} style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4, letterSpacing: 0.5 }}>{sid}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {view === "Scenarios" && (
        <div>
          <ScenarioField scenarios={scan.scenarios} selectedId={selectedScenario} onSelect={(id) => setSelectedScenario(selectedScenario === id ? null : id)} />
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
            {scan.scenarios.map((s, i) => (
              <button key={s.id} className="glass lift" onClick={() => setSelectedScenario(selectedScenario === s.id ? null : s.id)}
                style={{
                  padding: 22, cursor: "pointer", textAlign: "left",
                  borderTop: `3px solid ${TIER_COLORS[s.tier]}`,
                  outline: selectedScenario === s.id ? `1px solid ${TIER_COLORS[s.tier]}77` : "none",
                  animation: `fadeUp 450ms ${i * 60}ms both`,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted }}>S{s.id}</span>
                  <span style={{ ...eyebrow(TIER_COLORS[s.tier], 9) }}>{s.tier === "Cassandra" ? "⚠ CASSANDRA" : s.tier}</span>
                </div>
                <h3 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: T.textHeading, margin: "0 0 8px", lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.55 }}>{s.tagline}</p>
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
              <div ref={detailRef} className="glass--strong" style={{ marginTop: 24, padding: "42px 48px", position: "relative", borderColor: `${TIER_COLORS[s.tier]}35`, scrollMarginTop: 80, animation: "slideUp 380ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
                <button onClick={() => setSelectedScenario(null)} style={{ position: "absolute", top: 18, right: 24, background: "none", border: "none", color: T.textMuted, fontSize: 22, cursor: "pointer", transition: "color 150ms ease" }}>×</button>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                  <div style={{ width: 46, height: 3, background: `linear-gradient(90deg, ${TIER_COLORS[s.tier]}, transparent)`, borderRadius: 2 }} />
                  <span style={{ ...eyebrow(TIER_COLORS[s.tier]) }}>{s.tier === "Cassandra" ? "⚠ CASSANDRA" : s.tier}</span>
                  <span style={{ ...eyebrow() }}>CONFIDENCE: {s.confidence}</span>
                  {evidence.length === 0 && <span style={{ ...eyebrow(T.rose) }}>UNGROUNDED — NO EVIDENCE CITED</span>}
                </div>
                <h2 style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 700, color: T.textHeading, margin: "0 0 4px" }}>{s.title}</h2>
                <p style={{ fontFamily: FONT.display, fontSize: 16, color: T.textSecondary, margin: "0 0 26px" }}>{s.tagline}</p>

                <Dispatch text={s.dispatch} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, margin: "28px 0" }}>
                  <div className="glass--flat" style={{ borderColor: `${T.cyan}30`, background: `${T.cyan}0A`, padding: "16px 18px" }}>
                    <div style={{ ...eyebrow(T.cyan), marginBottom: 8 }}>SHADOW SIDE</div>
                    <p style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.6, margin: 0 }}>{s.shadow}</p>
                  </div>
                  <div className="glass--flat" style={{ borderColor: `${T.rose}30`, background: `${T.rose}0A`, padding: "16px 18px" }}>
                    <div style={{ ...eyebrow(T.rose), marginBottom: 8 }}>KILLER ASSUMPTION</div>
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
                      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${v}%`, background: TIER_COLORS[s.tier], borderRadius: 2, opacity: 0.8, boxShadow: `0 0 8px ${TIER_COLORS[s.tier]}66` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {evidence.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.glassBorder}`, paddingTop: 22, marginBottom: 22 }}>
                    <div style={{ ...eyebrow(T.violet), marginBottom: 12 }}>EVIDENCE CITED</div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {evidence.map((sig) => (
                        <div key={sig.id} style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>
                          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.violet }}>{sig.id}</span>{" "}
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
        <div style={{ animation: "fadeUp 400ms both" }}>
          <div className="glass" style={{ padding: 30, overflowX: "auto" }}>
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
                      const hue = type === "opp" ? T.mint : type === "threat" ? T.rose : T.textMuted;
                      const alpha = type === "mon" ? 0.06 : 0.08 + score * 0.055;
                      return (
                        <td key={i} style={{
                          padding: "10px 6px", textAlign: "center", borderRadius: 6,
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
            {[["OPPORTUNITY", T.mint], ["THREAT", T.rose], ["MONITOR", T.textMuted]].map(([label, color]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 7, ...eyebrow(color as string, 9) }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: `${color}44` }} />
                {label}
              </span>
            ))}
            <span style={{ ...eyebrow(T.textMuted, 9) }}>CELL VALUE = IMPACT MAGNITUDE 1–4</span>
          </div>
        </div>
      )}

      {view === "Story" && <StoryMode scan={scan} brandName={brandName} onGo={goTo} />}

      {view === "Timeline" && (
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          {(["now", "monitor", "prepare"] as const).map((lane, laneIdx) => {
            const items = scan.timeline.filter((t) => t.lane === lane);
            const captions = { now: "Evidence strong. Fund and build.", monitor: "Track the leading indicators.", prepare: "Scenario-dependent capabilities." };
            return (
              <div key={lane} style={{ animation: `fadeUp 450ms ${laneIdx * 100}ms both` }}>
                <div style={{ borderBottom: `2px solid ${LANE_COLORS[lane]}66`, paddingBottom: 10, marginBottom: 14 }}>
                  <div style={{ ...eyebrow(LANE_COLORS[lane], 11) }}>{lane === "now" ? "NOW" : lane === "monitor" ? "MONITOR" : "PREPARE FOR"}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{captions[lane]}</div>
                </div>
                <div style={{ display: "grid", gap: 9 }}>
                  {items.map((t, i) => (
                    <button key={i} className="glass--flat lift-sm" onClick={() => { setView("Scenarios"); setSelectedScenario(t.scenarioId); }}
                      style={{ padding: "13px 15px", cursor: "pointer", textAlign: "left", borderLeft: `2px solid ${LANE_COLORS[lane]}66` }}>
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

      <CommandPalette scan={scan} onGo={goTo} />
      <div style={{ position: "fixed", right: 20, bottom: 18, zIndex: 60, ...eyebrow(T.textMuted, 9), pointerEvents: "none" }}>
        ⌘K · JUMP TO ANYTHING
      </div>
    </div>
  );
}

/** Great-circle links between the geographies a driver spans — the visible
 * "these forces connect these places" layer on the globe. */
function buildArcs(scan: ScanResult): Arc[] {
  const byId = new Map(scan.signals.map((s) => [s.id, s]));
  const arcs: Arc[] = [];
  for (const d of scan.drivers) {
    const pts: { lat: number; lng: number }[] = [];
    const seen = new Set<string>();
    for (const sid of d.signalIds) {
      const sig = byId.get(sid);
      if (!sig) continue;
      const g = resolveGeo(sig.geo)[0];
      if (!g) continue;
      const key = `${g.lat},${g.lng}`;
      if (seen.has(key)) continue;
      seen.add(key); pts.push({ lat: g.lat, lng: g.lng });
    }
    const color = STEEP_COLORS[d.steep] ?? T.violet;
    for (let i = 0; i < pts.length - 1 && arcs.length < 22; i++) {
      arcs.push({ a: pts[i], b: pts[i + 1], color });
    }
  }
  return arcs;
}
