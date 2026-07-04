import { useEffect, useState } from "react";
import type { BrandConfig, CostEstimate, ScanScope } from "@horizon/shared";
import { T, FONT, card, eyebrow, goldButton, inputStyle } from "../theme.js";
import { api } from "../api.js";

const DEFAULT_SCOPE: ScanScope = {
  sourceQueries: 20,
  docsPerQuery: 6,
  driverCount: 9,
  scenarioCount: 9,
  includeMatrix: true,
};

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ ...eyebrow(T.textSecondary) }}>{label}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 13, color: T.gold, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
    </div>
  );
}

export function ScanLauncher({ brands, onScanStarted }: { brands: BrandConfig[]; onScanStarted: (scanId: string) => void }) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [scope, setScope] = useState<ScanScope>(DEFAULT_SCOPE);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.estimateScan(scope).then(setEstimate).catch(() => setEstimate(null));
    }, 180);
    return () => clearTimeout(handle);
  }, [scope]);

  const start = async () => {
    if (!brandId) return;
    setStarting(true);
    setStartError(null);
    try {
      const scan = await api.startScan(brandId, scope);
      onScanStarted(scan.id);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const maxHigh = estimate ? Math.max(...estimate.byStage.map((s) => s.highUsd), 0.0001) : 1;
  const brand = brands.find((b) => b.id === brandId);

  return (
    <div style={{ animation: "fadeUp 400ms ease" }}>
      <div style={{ ...eyebrow(T.gold), marginBottom: 10 }}>MISSION CONTROL</div>
      <h1 style={{ fontFamily: FONT.display, fontSize: 40, fontWeight: 400, color: T.textHeading, margin: "0 0 6px" }}>
        Launch a scan{brand ? <> for <span style={{ fontStyle: "italic", color: T.gold }}>{brand.name}</span></> : ""}
      </h1>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: "0 0 32px" }}>
        Scope the scan on the left; the projected cost answers on the right, before anything is spent.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 7fr) minmax(300px, 5fr)", gap: 20, alignItems: "start" }}>
        <div style={{ ...card, padding: 32, display: "grid", gap: 24 }}>
          <div>
            <label style={{ ...eyebrow(T.textSecondary), display: "block", marginBottom: 7 }}>Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name} — {b.industry}</option>
              ))}
            </select>
          </div>

          <Slider label="Source queries" value={scope.sourceQueries} min={3} max={60} onChange={(v) => setScope((s) => ({ ...s, sourceQueries: v }))} />
          <Slider label="Docs per query" value={scope.docsPerQuery} min={1} max={20} onChange={(v) => setScope((s) => ({ ...s, docsPerQuery: v }))} />
          <Slider label="Drivers · target clusters" value={scope.driverCount} min={3} max={15} onChange={(v) => setScope((s) => ({ ...s, driverCount: v }))} />
          <Slider label="Scenarios" value={scope.scenarioCount} min={3} max={15} onChange={(v) => setScope((s) => ({ ...s, scenarioCount: v }))} />

          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", ...eyebrow(T.textSecondary) }}>
            <input type="checkbox" checked={scope.includeMatrix} onChange={(e) => setScope((s) => ({ ...s, includeMatrix: e.target.checked }))} />
            STRATEGIC IMPACT MATRIX
          </label>

          <div>
            <button onClick={start} disabled={starting || !brandId} style={{ ...goldButton, opacity: starting || !brandId ? 0.45 : 1 }}>
              {starting ? "STARTING…" : "RUN SCAN →"}
            </button>
            {startError && <div style={{ marginTop: 12, fontSize: 12, color: T.red, lineHeight: 1.55 }}>{startError}</div>}
          </div>
        </div>

        <div style={{ ...card, padding: 28, position: "sticky", top: 84 }}>
          <div style={{ ...eyebrow(), marginBottom: 18 }}>PROJECTED COST</div>
          {estimate ? (
            <>
              <div style={{ fontFamily: FONT.mono, fontSize: 30, color: T.gold, marginBottom: 4, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>
                ${estimate.lowUsd.toFixed(2)}<span style={{ color: T.textMuted, fontSize: 20 }}> – </span>${estimate.highUsd.toFixed(2)}
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
                    <div style={{ height: 3, background: T.bgPrimary, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.max((s.highUsd / maxHigh) * 100, 1.5)}%`,
                        background: `linear-gradient(90deg, ${T.gold}CC, ${T.gold}55)`,
                        borderRadius: 2,
                        transition: "width 350ms ease",
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
    </div>
  );
}
