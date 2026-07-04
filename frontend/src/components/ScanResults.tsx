import { useEffect, useState } from "react";
import type { ScanResult } from "@horizon/shared";
import { T, STEEP_COLORS, TIER_COLORS } from "../theme.js";
import { api } from "../api.js";

const NAV = ["Overview", "Signals", "Drivers", "Scenarios", "Strategy", "Timeline"] as const;

export function ScanResults({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [view, setView] = useState<(typeof NAV)[number]>("Overview");
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const s = await api.getScan(scanId);
      if (cancelled) return;
      setScan(s);
      if (s.status === "pending" || s.status === "running") {
        setTimeout(poll, 1500);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [scanId]);

  if (!scan) return <div style={{ color: T.textMuted }}>Loading...</div>;

  if (scan.status === "pending" || scan.status === "running") {
    return (
      <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 32, maxWidth: 600 }}>
        <h3 style={{ color: T.textHeading, fontWeight: 400 }}>Scan running…</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {scan.progress.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: p.status === "failed" ? T.red : T.textSecondary }}>
              [{p.status}] {p.stage} {p.detail ? `-- ${p.detail}` : ""}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div style={{ background: T.bgCard, border: `1px solid ${T.red}40`, borderRadius: 6, padding: 32, maxWidth: 600, color: T.red }}>
        Scan failed: {scan.error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.glassBorder}` }}>
        {NAV.map((n) => (
          <button
            key={n}
            onClick={() => setView(n)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 13,
              color: view === n ? T.textHeading : T.textMuted,
              borderBottom: view === n ? `2px solid ${T.gold}` : "2px solid transparent",
            }}
          >{n}</button>
        ))}
      </div>

      {view === "Overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              ["Signals", scan.signals.length],
              ["Clusters", scan.clusters.length],
              ["Drivers", scan.drivers.length],
              ["Scenarios", scan.scenarios.length],
              ["Actual cost", `$${scan.actualCostUsd?.toFixed(3) ?? "0"}`],
            ].map(([label, value]) => (
              <div key={label as string} style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: 24, fontFamily: "monospace", color: T.gold }}>{value}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary }}>
            Estimated ${scan.estimate.lowUsd.toFixed(2)}–${scan.estimate.highUsd.toFixed(2)} · Actual ${scan.actualCostUsd?.toFixed(3)}
          </div>
        </div>
      )}

      {view === "Signals" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {scan.signals.map((s) => {
            const isAbsence = s.type === "Absence";
            const isCounter = s.type === "Counter-Signal";
            return (
              <div key={s.id} style={{
                background: T.bgCard,
                border: `1px solid ${isAbsence ? T.amber + "40" : isCounter ? T.red + "40" : T.glassBorder}`,
                borderStyle: isAbsence || isCounter ? "dashed" : "solid",
                borderLeft: `3px ${isAbsence || isCounter ? "dashed" : "solid"} ${isAbsence ? T.amber : isCounter ? T.red : STEEP_COLORS[s.category] ?? T.textMuted}`,
                borderRadius: 6, padding: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textMuted, fontFamily: "monospace", marginBottom: 6 }}>
                  <span>{s.id} · {s.geo}</span>
                  <span style={{ color: isAbsence ? T.amber : isCounter ? T.red : T.textMuted }}>
                    {isAbsence ? "ABSENCE" : isCounter ? "COUNTER" : s.category} · {s.confidence}
                  </span>
                </div>
                <h4 style={{ fontSize: 14, color: T.textHeading, margin: "0 0 6px" }}>{s.title}</h4>
                <p style={{ fontSize: 12, color: T.textSecondary, margin: "0 0 8px" }}>{s.summary}</p>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.blue, textDecoration: "none" }}>source ↗</a>
                ) : (
                  <span style={{ fontSize: 10, color: T.textMuted }}>{s.source}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "Drivers" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {scan.drivers.map((d) => (
            <div key={d.id} style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderLeft: `3px solid ${STEEP_COLORS[d.steep] ?? T.textMuted}`, borderRadius: 6, padding: 20 }}>
              <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace", marginBottom: 8 }}>{d.id} · {d.trajectory}</div>
              <h3 style={{ fontSize: 18, color: T.textHeading, margin: "0 0 8px", fontWeight: 400 }}>{d.name}</h3>
              <p style={{ fontSize: 13, color: T.textSecondary }}>{d.desc}</p>
            </div>
          ))}
        </div>
      )}

      {view === "Scenarios" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {scan.scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderTop: `3px solid ${TIER_COLORS[s.tier]}`, borderRadius: 6, padding: 20, cursor: "pointer" }}
              >
                <div style={{ fontSize: 10, color: TIER_COLORS[s.tier], fontFamily: "monospace", marginBottom: 8 }}>{s.tier.toUpperCase()}</div>
                <h3 style={{ fontSize: 16, color: T.textHeading, margin: "0 0 8px", fontWeight: 400 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: T.textSecondary, fontStyle: "italic" }}>{s.tagline}</p>
              </div>
            ))}
          </div>
          {selectedScenario != null && (() => {
            const s = scan.scenarios.find((x) => x.id === selectedScenario);
            if (!s) return null;
            const evidence = s.citedSignalIds
              .map((id) => scan.signals.find((sig) => sig.id === id))
              .filter((sig): sig is NonNullable<typeof sig> => !!sig);
            return (
              <div style={{ marginTop: 24, background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 8, padding: 32 }}>
                <button onClick={() => setSelectedScenario(null)} style={{ float: "right", background: "none", border: "none", color: T.textMuted, cursor: "pointer" }}>×</button>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: TIER_COLORS[s.tier], marginBottom: 4 }}>
                  {s.tier.toUpperCase()} · confidence: {s.confidence}
                  {evidence.length === 0 && <span style={{ color: T.red }}> · UNGROUNDED -- no evidence citations</span>}
                </div>
                <h2 style={{ color: T.textHeading, fontWeight: 400 }}>{s.title}</h2>
                <p style={{ whiteSpace: "pre-wrap", color: T.textPrimary, lineHeight: 1.7, fontSize: 14 }}>{s.dispatch}</p>
                <div style={{ marginTop: 16, fontSize: 13, color: T.amber }}><strong>Shadow:</strong> {s.shadow}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: T.red }}><strong>Killer assumption:</strong> {s.killerAssumption}</div>
                {evidence.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.glassBorder}` }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: 2, color: T.textMuted, marginBottom: 10 }}>EVIDENCE CITED</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {evidence.map((sig) => (
                        <div key={sig.id} style={{ fontSize: 12, color: T.textSecondary }}>
                          <span style={{ fontFamily: "monospace", color: T.gold }}>{sig.id}</span>{" "}
                          {sig.url ? <a href={sig.url} target="_blank" rel="noreferrer" style={{ color: T.textPrimary, textDecoration: "none" }}>{sig.title} ↗</a> : sig.title}
                          <span style={{ color: T.textMuted }}> · {sig.confidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {s.actions.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: 2, color: T.textMuted, marginBottom: 10 }}>RECOMMENDED ACTIONS</div>
                    {s.actions.map((a, i) => (
                      <div key={i} style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: a.lane === "now" ? T.green : a.lane === "monitor" ? T.amber : T.violet, textTransform: "uppercase" }}>{a.lane}</span>{" "}
                        {a.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {view === "Strategy" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: T.textMuted }}>Business unit</th>
                {scan.scenarios.map((s) => <th key={s.id} style={{ padding: 8, color: T.textMuted, fontWeight: 400 }}>S{s.id}</th>)}
              </tr>
            </thead>
            <tbody>
              {scan.matrix.map((row) => (
                <tr key={row.businessUnit}>
                  <td style={{ padding: 8, color: T.textPrimary }}>{row.businessUnit}</td>
                  {row.scores.map((score, i) => (
                    <td key={i} style={{ padding: 8, textAlign: "center", color: row.types[i] === "threat" ? T.red : row.types[i] === "opp" ? T.green : T.textMuted }}>
                      {score} ({row.types[i]})
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "Timeline" && (
        <div style={{ display: "grid", gap: 8 }}>
          {scan.timeline.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: t.lane === "now" ? T.green : t.lane === "monitor" ? T.amber : T.violet, textTransform: "uppercase", width: 70 }}>{t.lane}</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: T.textMuted, width: 50 }}>{t.year}</span>
              <span style={{ fontSize: 13, color: T.textPrimary }}>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
