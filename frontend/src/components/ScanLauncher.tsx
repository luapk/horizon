import { useEffect, useState } from "react";
import type { BrandConfig, CostEstimate, ScanScope } from "@horizon/shared";
import { T } from "../theme.js";
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: T.gold, fontFamily: "monospace" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}

export function ScanLauncher({ brands, onScanStarted }: { brands: BrandConfig[]; onScanStarted: (scanId: string) => void }) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [scope, setScope] = useState<ScanScope>(DEFAULT_SCOPE);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.estimateScan(scope).then(setEstimate).catch(() => setEstimate(null));
    }, 200);
    return () => clearTimeout(handle);
  }, [scope]);

  const start = async () => {
    if (!brandId) return;
    setStarting(true);
    try {
      const scan = await api.startScan(brandId, scope);
      onScanStarted(scan.id);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, maxWidth: 900 }}>
      <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 32 }}>
        <h2 style={{ color: T.textHeading, margin: "0 0 24px", fontWeight: 400 }}>Launch a scan</h2>
        <label style={{ fontSize: 11, color: T.textSecondary, display: "block", marginBottom: 6 }}>Brand</label>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ width: "100%", marginBottom: 24, background: T.bgElevated, color: T.textPrimary, border: `1px solid ${T.glassBorder}`, borderRadius: 4, padding: "10px 12px" }}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.industry})</option>
          ))}
        </select>

        <Slider label="Source queries" value={scope.sourceQueries} min={3} max={60} onChange={(v) => setScope((s) => ({ ...s, sourceQueries: v }))} />
        <Slider label="Docs per query" value={scope.docsPerQuery} min={1} max={20} onChange={(v) => setScope((s) => ({ ...s, docsPerQuery: v }))} />
        <Slider label="Drivers (target clusters)" value={scope.driverCount} min={3} max={15} onChange={(v) => setScope((s) => ({ ...s, driverCount: v }))} />
        <Slider label="Scenarios" value={scope.scenarioCount} min={3} max={15} onChange={(v) => setScope((s) => ({ ...s, scenarioCount: v }))} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textSecondary, marginTop: 8 }}>
          <input type="checkbox" checked={scope.includeMatrix} onChange={(e) => setScope((s) => ({ ...s, includeMatrix: e.target.checked }))} />
          Include strategic impact matrix
        </label>

        <button
          onClick={start}
          disabled={starting || !brandId}
          style={{ marginTop: 24, background: T.gold + "20", border: `1px solid ${T.gold}40`, borderRadius: 4, padding: "10px 20px", color: T.gold, cursor: "pointer" }}
        >
          {starting ? "Starting..." : "Run scan"}
        </button>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 24, height: "fit-content" }}>
        <h3 style={{ fontSize: 11, color: T.textMuted, letterSpacing: 2, margin: "0 0 16px" }}>ESTIMATED COST</h3>
        {estimate ? (
          <>
            <div style={{ fontSize: 28, fontFamily: "monospace", color: T.gold, marginBottom: 16 }}>
              ${estimate.lowUsd.toFixed(2)} – ${estimate.highUsd.toFixed(2)}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {estimate.byStage.map((s) => (
                <div key={s.stage} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSecondary }}>
                  <span>{s.stage}</span>
                  <span style={{ fontFamily: "monospace" }}>${s.lowUsd.toFixed(3)}–${s.highUsd.toFixed(3)}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: T.textMuted, marginTop: 16, lineHeight: 1.5 }}>
              Range reflects retrieval yield (docs found per query) and LLM output variance. Actual cost is measured per-call and shown after the run.
            </p>
          </>
        ) : (
          <div style={{ color: T.textMuted, fontSize: 12 }}>Calculating...</div>
        )}
      </div>
    </div>
  );
}
