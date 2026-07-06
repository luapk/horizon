import { useEffect, useRef } from "react";
import type { ScanResult } from "@horizon/shared";
import { T, FONT, eyebrow, display, LANE_COLORS, STEEP_COLORS } from "../theme.js";
import { Globe } from "./Globe.js";
import { ScenarioField } from "./ScenarioField.js";
import { AnimatedNumber } from "./AnimatedNumber.js";
import { CostReconciliation } from "./CostReconciliation.js";
import { executiveSummary } from "../lib/scanSummary.js";
import { useIsNarrow } from "../hooks.js";
import type { Nav } from "./CommandPalette.js";

/** The Summary tab: a scroll-choreographed readout that assembles the dossier
 * — the read, the scan, the forces, the futures, the move — with each section
 * revealing on entry (reduced-motion shows everything at once). */
export function StoryMode({ scan, brandName, onGo }: { scan: ScanResult; brandName: string; onGo: (n: Nav) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const narrow = useIsNarrow();

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".story-sec");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [scan]);

  const absenceCount = scan.signals.filter((s) => s.type === "Absence").length;
  const counterCount = scan.signals.filter((s) => s.type === "Counter-Signal").length;
  const nowActions = scan.timeline.filter((t) => t.lane === "now").slice(0, 4);

  const metrics = [
    { label: "Signals", value: scan.signals.length, color: T.blue },
    { label: "Absences", value: absenceCount, color: T.cyan },
    { label: "Counter-signals", value: counterCount, color: T.rose },
    { label: "Drivers", value: scan.drivers.length, color: T.violet },
    { label: "Scenarios", value: scan.scenarios.length, color: T.mint },
    { label: "Actions", value: scan.timeline.length, color: T.pink },
  ];

  return (
    <div ref={rootRef} style={{ animation: "fadeIn 300ms ease" }}>
      {/* 1 — the read */}
      <section className="story-sec" style={{ minHeight: "58vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...eyebrow(T.violet), marginBottom: 18 }}>SUMMARY · SCROLL TO UNFOLD</div>
        <h1 style={{ ...display(narrow ? 40 : 64), margin: "0 0 22px", maxWidth: 900 }}>
          {brandName},<br /><span style={{ background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>the decade ahead.</span>
        </h1>
        <p style={{ ...display(narrow ? 17 : 22, T.textSecondary, 400), lineHeight: 1.5, maxWidth: "58ch", marginBottom: 34 }}>{executiveSummary(scan, brandName)}</p>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={m.label} className="glass--flat" style={{ padding: "14px 14px 12px", borderTop: `2px solid ${m.color}66` }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 700, color: m.color, lineHeight: 0.95, letterSpacing: -1.5 }}>
                <AnimatedNumber value={m.value} delay={i * 90} />
              </div>
              <div style={{ ...eyebrow(T.textMuted, 8.5), marginTop: 8 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2 — the scan */}
      <section className="story-sec" style={{ minHeight: "72vh", display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center" }}>
        <div>
          <div style={{ ...eyebrow(T.blue), marginBottom: 14 }}>STEP ONE · THE SCAN</div>
          <div style={{ ...display(narrow ? 80 : 120, T.blue), lineHeight: 0.85 }}><AnimatedNumber value={scan.signals.length} /></div>
          <p style={{ ...display(26, T.textHeading, 500), margin: "10px 0 8px" }}>signals read across {new Set(scan.signals.map((s) => s.geo)).size} geographies.</p>
          <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, maxWidth: "44ch" }}>
            Weak signals from live sources — deduplicated, then mined for the absences and counter-signals a
            simple news sweep would miss. Drag the globe; every point is a real place.
          </p>
        </div>
        <div><Globe signals={scan.signals} size={narrow ? 320 : 380} /></div>
      </section>

      {/* 3 — the forces */}
      <section className="story-sec" style={{ minHeight: "62vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...eyebrow(T.violet), marginBottom: 14 }}>STEP TWO · THE FORCES</div>
        <h2 style={{ ...display(narrow ? 30 : 40), margin: "0 0 6px" }}>{scan.drivers.length} structural drivers</h2>
        <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 24, maxWidth: "56ch" }}>
          Signals cluster by meaning; each cluster resolves into a force with a name and a direction.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {scan.drivers.map((d, i) => (
            <button key={d.id} className="glass--flat lift-sm" onClick={() => onGo({ view: "Drivers" })}
              style={{ display: "flex", alignItems: "baseline", gap: narrow ? 12 : 22, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderLeft: `2px solid ${STEEP_COLORS[d.steep] ?? T.violet}` }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: STEEP_COLORS[d.steep] ?? T.violet, flexShrink: 0, width: 40 }}>{d.id}</span>
              <span style={{ ...display(narrow ? 18 : 24, T.textHeading, 600), flex: 1, minWidth: 0 }}>{d.name}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: d.trajectory === "Accelerating" ? T.mint : T.cyan, flexShrink: 0 }}>
                {d.trajectory === "Accelerating" ? "↑" : "○"} {d.trajectory.toUpperCase()}
              </span>
              {!narrow && (
                <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted, flexShrink: 0 }}>{d.signalIds.length} SIG</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 4 — the futures */}
      <section className="story-sec" style={{ minHeight: "72vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...eyebrow(T.mint), marginBottom: 14 }}>STEP THREE · THE FUTURES</div>
        <h2 style={{ ...display(narrow ? 30 : 40), margin: "0 0 6px" }}>{scan.scenarios.length} scenarios, ranked</h2>
        <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 20, maxWidth: "56ch" }}>
          Drivers combine into evidence-cited futures, plotted by how likely and how consequential they are.
          Click any bubble to read the full dispatch.
        </p>
        <ScenarioField scenarios={scan.scenarios} selectedId={null} onSelect={(id) => onGo({ view: "Scenarios", scenarioId: id })} />
      </section>

      {/* 5 — the move */}
      <section className="story-sec" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 900 }}>
        <div style={{ ...eyebrow(T.pink), marginBottom: 14 }}>THE MOVE</div>
        <h2 style={{ ...display(narrow ? 32 : 46), margin: "0 0 24px" }}>What to do now.</h2>
        <div style={{ display: "grid", gap: 12, marginBottom: 26 }}>
          {nowActions.map((a, i) => (
            <button key={i} className="glass lift-sm" onClick={() => onGo({ view: "Scenarios", scenarioId: a.scenarioId })}
              style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer", padding: "16px 20px", borderLeft: `2px solid ${LANE_COLORS.now}` }}>
              <span style={{ ...eyebrow(LANE_COLORS.now, 10), width: 44, flexShrink: 0 }}>NOW</span>
              <span style={{ ...display(narrow ? 15 : 18, T.textHeading, 500) }}>{a.label}</span>
            </button>
          ))}
        </div>
        <CostReconciliation scan={scan} />
        <button className="btn-primary" onClick={() => onGo({ view: "Signals" })}
          style={{ marginTop: 26, alignSelf: "flex-start", padding: "12px 22px", fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
          EXPLORE THE FULL DOSSIER →
        </button>
      </section>
    </div>
  );
}
