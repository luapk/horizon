import { useEffect, useState } from "react";
import type { BrandConfig } from "@horizon/shared";
import { T, FONT, ghostButton } from "./theme.js";
import { api, IS_DEMO } from "./api.js";
import { Login } from "./components/Login.js";
import { BrandForm } from "./components/BrandForm.js";
import { ScanLauncher } from "./components/ScanLauncher.js";
import { ScanResults } from "./components/ScanResults.js";
import { GrainOverlay } from "./components/GrainOverlay.js";

type Page = "checking" | "login" | "app";

export default function App() {
  const [page, setPage] = useState<Page>("checking");
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [showBrandForm, setShowBrandForm] = useState(false);

  useEffect(() => {
    api.me().then(() => refreshBrands().then(() => setPage("app"))).catch(() => setPage("login"));
  }, []);

  const refreshBrands = async () => {
    const list = await api.listBrands();
    setBrands(list);
    return list;
  };

  if (page === "checking") return null;
  if (page === "login") {
    return <Login onLoggedIn={() => refreshBrands().then(() => setPage("app"))} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bgAbyss, color: T.textPrimary, fontFamily: FONT.body }}>
      <GrainOverlay />

      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6, 10, 18, 0.88)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.glassBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, padding: "0 32px", maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => { setActiveScanId(null); setShowBrandForm(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, letterSpacing: 6, color: T.gold }}
            >
              HORIZON
            </button>
            <div style={{ width: 1, height: 20, background: T.glassBorder }} />
            <span style={{ fontSize: 11, color: T.textMuted, letterSpacing: 0.3 }}>Multi-brand futures intelligence</span>
            {IS_DEMO && (
              <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: T.amber, border: `1px solid ${T.amber}35`, borderRadius: 3, padding: "3px 8px" }}>
                DEMO · SIMULATED DATA
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: T.textMuted }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s ease infinite" }} />
              OPERATIONAL
            </span>
            <button onClick={() => { setShowBrandForm(true); setActiveScanId(null); }} style={ghostButton(T.textSecondary)}>+ BRAND</button>
          </div>
        </div>
      </header>

      <main style={{ padding: "40px 32px 96px", maxWidth: 1440, margin: "0 auto" }}>
        {activeScanId ? (
          <ScanResults scanId={activeScanId} brands={brands} />
        ) : showBrandForm ? (
          <BrandForm onCreated={(b) => { setBrands((prev) => [...prev, b]); setShowBrandForm(false); }} />
        ) : brands.length === 0 ? (
          <div style={{ maxWidth: 620, margin: "80px auto 0", textAlign: "center", animation: "fadeUp 500ms ease" }}>
            <h1 style={{ fontFamily: FONT.display, fontSize: 46, fontWeight: 400, color: T.textHeading, lineHeight: 1.12, margin: "0 0 18px", textWrap: "balance" as never }}>
              Futures intelligence,<br /><span style={{ color: T.gold, fontStyle: "italic" }}>for any brand.</span>
            </h1>
            <p style={{ fontSize: 15, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 36px" }}>
              Point the engine at a brand and it scans live sources for signals, derives the structural
              drivers, writes evidence-cited scenarios — and shows you the cost before you spend a cent.
            </p>
            <button
              onClick={() => setShowBrandForm(true)}
              style={{
                background: `linear-gradient(180deg, ${T.gold}2E, ${T.gold}14)`, border: `1px solid ${T.gold}55`,
                borderRadius: 5, padding: "13px 28px", color: T.gold, cursor: "pointer",
                fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, letterSpacing: 2,
              }}
            >
              CONFIGURE FIRST BRAND →
            </button>
          </div>
        ) : (
          <ScanLauncher brands={brands} onScanStarted={setActiveScanId} />
        )}
      </main>
    </div>
  );
}
