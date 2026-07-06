import { useEffect, useState } from "react";
import type { BrandConfig, CostEstimate, ScanResult, ScanScope } from "@horizon/shared";
import { T, FONT, eyebrow, display, inputStyle, primaryButton, ghostButtonStyle } from "../theme.js";
import { api } from "../api.js";
import { useIsNarrow } from "../hooks.js";

/** The launcher asks the two questions an analyst actually has — which brand,
 * and how deep — and answers the one they care about: what it will cost.
 * Pipeline internals (queries × docs, driver/scenario counts) are derived
 * from the chosen depth, not exposed as sliders. */

type TierKey = "standard" | "deep";

const TIERS: Record<TierKey, { label: string; strap: string; signals: number; scope: ScanScope }> = {
  standard: {
    label: "STANDARD",
    strap: "The regular pulse — brand reviews, quarterly planning.",
    signals: 50,
    scope: { sourceQueries: 10, docsPerQuery: 5, driverCount: 9, scenarioCount: 9, includeMatrix: true },
  },
  deep: {
    label: "DEEP",
    strap: "Board-grade — pitches, annual strategy, new-market entry.",
    signals: 100,
    scope: { sourceQueries: 20, docsPerQuery: 5, driverCount: 12, scenarioCount: 12, includeMatrix: true },
  },
};

const STATUS_COLORS: Record<string, string> = { completed: T.mint, failed: T.rose, running: T.violet, pending: T.violet };

export function ScanLauncher({ brands, onScanStarted, onNewBrand }: {
  brands: BrandConfig[];
  onScanStarted: (scanId: string) => void;
  onNewBrand: () => void;
}) {
  const [brandId, setBrandId] = useState(brands[brands.length - 1]?.id ?? "");
  const [tier, setTier] = useState<TierKey>("standard");
  const [estimates, setEstimates] = useState<Partial<Record<TierKey, CostEstimate>>>({});
  const [recent, setRecent] = useState<ScanResult[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const narrow = useIsNarrow();

  useEffect(() => {
    (Object.keys(TIERS) as TierKey[]).forEach((k) => {
      api.estimateScan(TIERS[k].scope).then((e) => setEstimates((prev) => ({ ...prev, [k]: e }))).catch(() => undefined);
    });
    api.listScans().then((all) => {
      setRecent([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6));
    }).catch(() => undefined);
  }, []);

  const start = async () => {
    if (!brandId) return;
    setStarting(true);
    setStartError(null);
    try {
      const scan = await api.startScan(brandId, TIERS[tier].scope);
      onScanStarted(scan.id);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const estimate = estimates[tier];
  const maxHigh = estimate ? Math.max(...estimate.byStage.map((s) => s.highUsd), 0.0001) : 1;
  const brand = brands.find((b) => b.id === brandId);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "Unknown brand";

  return (
    <div style={{ animation: "fadeUp 400ms ease" }}>
      <div style={{ ...eyebrow(T.violet), marginBottom: 10 }}>MISSION CONTROL</div>
      <h1 style={{ ...display(narrow ? 34 : 46), margin: "0 0 6px" }}>
        Launch a scan{brand ? <> for <span style={{ color: T.violet }}>{brand.name}</span></> : ""}
      </h1>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: "0 0 32px" }}>
        Pick the brand, pick the depth — the projected cost answers before anything is spent.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(340px, 7fr) minmax(300px, 5fr)", gap: 20, alignItems: "start" }}>
        <div className="glass" style={{ padding: narrow ? 22 : 32, display: "grid", gap: 26, animation: "fadeUp 450ms 60ms both" }}>
          <div>
            <label style={{ ...eyebrow(T.textSecondary), display: "block", marginBottom: 7 }}>Brand</label>
            <div style={{ display: "flex", gap: 10 }}>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: 1 }}>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} — {b.industry}</option>
                ))}
              </select>
              <button className="btn-ghost" onClick={onNewBrand} style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }}>+ NEW BRAND</button>
            </div>
          </div>

          <div>
            <label style={{ ...eyebrow(T.textSecondary), display: "block", marginBottom: 10 }}>Scan depth</label>
            <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12 }}>
              {(Object.keys(TIERS) as TierKey[]).map((k) => {
                const t = TIERS[k];
                const e = estimates[k];
                const active = tier === k;
                return (
                  <button
                    key={k}
                    className="lift-sm"
                    onClick={() => setTier(k)}
                    style={{
                      textAlign: "left", cursor: "pointer", padding: "18px 20px", borderRadius: 12,
                      background: active ? "rgba(179,157,255,0.1)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${active ? T.violet + "66" : T.glassBorder}`,
                      boxShadow: active ? `0 0 24px ${T.violet}22` : "none",
                      transition: "all 200ms ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ ...eyebrow(active ? T.violet : T.textSecondary) }}>{t.label}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.mint, fontVariantNumeric: "tabular-nums" }}>
                        {e ? `$${e.lowUsd.toFixed(2)}–$${e.highUsd.toFixed(2)}` : "…"}
                      </span>
                    </div>
                    <div style={{ ...display(38, active ? T.textHeading : T.textSecondary), margin: "10px 0 2px" }}>
                      {t.signals}<span style={{ fontSize: 15, fontWeight: 500, color: T.textMuted, letterSpacing: 0 }}> signals</span>
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted, letterSpacing: 1, marginBottom: 8 }}>
                      {t.scope.driverCount} DRIVERS · {t.scope.scenarioCount} SCENARIOS · MATRIX
                    </div>
                    <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>{t.strap}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button className="btn-primary" onClick={start} disabled={starting || !brandId} style={{ ...primaryButton, opacity: starting || !brandId ? 0.45 : 1 }}>
              {starting ? "STARTING…" : "RUN SCAN →"}
            </button>
            {startError && <div style={{ marginTop: 12, fontSize: 12, color: T.rose, lineHeight: 1.55 }}>{startError}</div>}
          </div>
        </div>

        <div className="glass--strong" style={{ padding: 28, position: narrow ? "static" : "sticky", top: 84, animation: "fadeUp 450ms 140ms both" }}>
          <div style={{ ...eyebrow(), marginBottom: 18 }}>PROJECTED COST · {TIERS[tier].label}</div>
          {estimate ? (
            <>
              <div style={{ fontFamily: FONT.mono, fontSize: 30, marginBottom: 4, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5,
                background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`,
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                ${estimate.lowUsd.toFixed(2)} – ${estimate.highUsd.toFixed(2)}
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginBottom: 22 }}>
                range = retrieval yield × LLM output variance
              </div>

              <div style={{ display: "grid", gap: 11 }}>
                {estimate.byStage.map((s) => (
                  <div key={s.stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 10.5, color: T.textSecondary }}>{s.stage}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted, fontVariantNumeric: "tabular-nums" }}>
                        ${s.lowUsd.toFixed(3)}–${s.highUsd.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.max((s.highUsd / maxHigh) * 100, 1.5)}%`,
                        background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`,
                        borderRadius: 2,
                        transition: "width 380ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 10, color: T.textMuted, marginTop: 20, marginBottom: 0, lineHeight: 1.6 }}>
                Actual usage is metered per-call during the run and reconciled against this estimate on the results page.
              </p>
            </>
          ) : (
            <div style={{ color: T.textMuted, fontSize: 12, fontFamily: FONT.mono }}>CALCULATING…</div>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div style={{ marginTop: 28, animation: "fadeUp 450ms 220ms both" }}>
          <div style={{ ...eyebrow(), marginBottom: 12 }}>RECENT SCANS</div>
          <div style={{ display: "grid", gap: 8 }}>
            {recent.map((s) => (
              <button key={s.id} className="glass--flat lift-sm" onClick={() => onScanStarted(s.id)}
                style={{ display: "flex", alignItems: "center", gap: narrow ? 12 : 20, cursor: "pointer", textAlign: "left", padding: "13px 18px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: STATUS_COLORS[s.status] ?? T.textMuted, boxShadow: `0 0 8px ${STATUS_COLORS[s.status] ?? T.textMuted}66`, animation: s.status === "running" || s.status === "pending" ? "pulse 1.4s ease infinite" : "none" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: T.textHeading, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {brandName(s.brandId)}
                </span>
                {!narrow && (
                  <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted }}>
                    {s.signals.length > 0 ? `${s.signals.length} SIGNALS · ${s.scenarios.length} SCENARIOS` : s.status.toUpperCase()}
                  </span>
                )}
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.textMuted, fontVariantNumeric: "tabular-nums" }}>
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: T.mint, fontVariantNumeric: "tabular-nums", width: 62, textAlign: "right" }}>
                  {s.actualCostUsd != null ? `$${s.actualCostUsd.toFixed(2)}` : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
