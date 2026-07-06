import { useEffect, useRef } from "react";
import type { ScanResult } from "@horizon/shared";
import { T, FONT, eyebrow, display, LANE_COLORS } from "../theme.js";
import { Globe } from "./Globe.js";
import { DriverConstellation } from "./DriverConstellation.js";
import { ScenarioField } from "./ScenarioField.js";
import { AnimatedNumber } from "./AnimatedNumber.js";
import { executiveSummary } from "../lib/scanSummary.js";
import type { Nav } from "./CommandPalette.js";

/** A scroll-choreographed readout: the dossier assembles itself as you scroll
 * — signals → drivers → scenarios → the move. Each section reveals on entry
 * (reduced-motion shows everything at once). */
export function StoryMode({ scan, brandName, onGo }: { scan: ScanResult; brandName: string; onGo: (n: Nav) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".story-sec");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.25 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [scan]);

  const nowActions = scan.timeline.filter((t) => t.lane === "now").slice(0, 4);

  return (
    <div ref={rootRef} style={{ animation: "fadeIn 300ms ease" }}>
      {/* 1 — intro */}
      <section className="story-sec" style={{ minHeight: "62vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 900 }}>
        <div style={{ ...eyebrow(T.violet), marginBottom: 18 }}>STORY MODE · SCROLL TO UNFOLD</div>
        <h1 style={{ ...display(64), margin: "0 0 22px" }}>
          {brandName},<br /><span style={{ background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>the decade ahead.</span>
        </h1>
        <p style={{ ...display(22, T.textSecondary, 400), lineHeight: 1.5, maxWidth: "58ch" }}>{executiveSummary(scan, brandName)}</p>
      </section>

      {/* 2 — signals */}
      <section className="story-sec" style={{ minHeight: "72vh", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
        <div>
          <div style={{ ...eyebrow(T.blue), marginBottom: 14 }}>STEP ONE · THE SCAN</div>
          <div style={{ ...display(120, T.blue), lineHeight: 0.85 }}><AnimatedNumber value={scan.signals.length} /></div>
          <p style={{ ...display(26, T.textHeading, 500), margin: "10px 0 8px" }}>signals read across {new Set(scan.signals.map((s) => s.geo)).size} geographies.</p>
          <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, maxWidth: "44ch" }}>
            Weak signals from live sources — deduplicated, then mined for the absences and counter-signals a
            simple news sweep would miss. Drag the globe; every point is a real place.
          </p>
        </div>
        <div><Globe signals={scan.signals} size={380} /></div>
      </section>

      {/* 3 — drivers */}
      <section className="story-sec" style={{ minHeight: "72vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...eyebrow(T.violet), marginBottom: 14 }}>STEP TWO · THE FORCES</div>
        <h2 style={{ ...display(40), margin: "0 0 6px" }}>{scan.drivers.length} structural drivers</h2>
        <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 20, maxWidth: "56ch" }}>
          Signals cluster by meaning; each cluster resolves into a force. Linked drivers share evidence —
          hover the map to trace the connections.
        </p>
        <DriverConstellation drivers={scan.drivers} height={340} />
      </section>

      {/* 4 — scenarios */}
      <section className="story-sec" style={{ minHeight: "72vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...eyebrow(T.mint), marginBottom: 14 }}>STEP THREE · THE FUTURES</div>
        <h2 style={{ ...display(40), margin: "0 0 6px" }}>{scan.scenarios.length} scenarios, ranked</h2>
        <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 20, maxWidth: "56ch" }}>
          Drivers combine into evidence-cited futures, plotted by how likely and how consequential they are.
          Click any bubble to read the full dispatch.
        </p>
        <ScenarioField scenarios={scan.scenarios} selectedId={null} onSelect={(id) => onGo({ view: "Scenarios", scenarioId: id })} />
      </section>

      {/* 5 — the move */}
      <section className="story-sec" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 900 }}>
        <div style={{ ...eyebrow(T.pink), marginBottom: 14 }}>THE MOVE</div>
        <h2 style={{ ...display(46), margin: "0 0 24px" }}>What to do now.</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {nowActions.map((a, i) => (
            <button key={i} className="glass lift-sm" onClick={() => onGo({ view: "Scenarios", scenarioId: a.scenarioId })}
              style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer", padding: "16px 20px", borderLeft: `2px solid ${LANE_COLORS.now}` }}>
              <span style={{ ...eyebrow(LANE_COLORS.now, 10), width: 44 }}>NOW</span>
              <span style={{ ...display(18, T.textHeading, 500) }}>{a.label}</span>
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => onGo({ view: "Overview" })}
          style={{ marginTop: 28, alignSelf: "flex-start", padding: "12px 22px", fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
          ↑ BACK TO THE DOSSIER
        </button>
      </section>
    </div>
  );
}
