import { useEffect, useState } from "react";
import type { BrandConfig } from "@horizon/shared";
import { T, FONT, ghostButtonStyle } from "./theme.js";
import { api, IS_DEMO } from "./api.js";
import { useIsNarrow } from "./hooks.js";
import { LONGVIEW_LOGO } from "./logo.js";
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
  const narrow = useIsNarrow();

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
    <div style={{ minHeight: "100vh", background: T.bgAbyss, color: T.textPrimary, fontFamily: FONT.body, position: "relative" }}>
      <div className="orb orb--blue" />
      <div className="orb orb--violet" />
      <div className="orb orb--pink" />
      <GrainOverlay />

      <header className="glass--strong" style={{
        position: "sticky", top: 0, zIndex: 50,
        borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none",
        boxShadow: "0 12px 40px rgba(2, 4, 10, 0.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, padding: narrow ? "0 16px" : "0 32px", maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => { setActiveScanId(null); setShowBrandForm(false); }}
              aria-label="Longview — home"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
            >
              <img src={LONGVIEW_LOGO} alt="Longview" style={{ height: 26, width: "auto", display: "block" }} />
            </button>
            {!narrow && <div style={{ width: 1, height: 20, background: T.glassBorder }} />}
            {!narrow && <span style={{ fontSize: 11, color: T.textMuted, letterSpacing: 0.3 }}>Multi-brand futures intelligence</span>}
            {IS_DEMO && (
              <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: T.cyan, border: `1px solid ${T.cyan}35`, borderRadius: 4, padding: "3px 8px" }}>
                DEMO · SIMULATED DATA
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: T.textMuted }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.mint, boxShadow: `0 0 8px ${T.mint}88`, animation: "pulse 2s ease infinite" }} />
              OPERATIONAL
            </span>
            <button className="btn-ghost" onClick={() => { setShowBrandForm(true); setActiveScanId(null); }} style={ghostButtonStyle}>+ BRAND</button>
          </div>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, padding: narrow ? "24px 16px 80px" : "40px 32px 96px", maxWidth: 1440, margin: "0 auto" }}>
        {activeScanId ? (
          <ScanResults scanId={activeScanId} brands={brands} />
        ) : showBrandForm ? (
          <BrandForm onCreated={(b) => { setBrands((prev) => [...prev, b]); setShowBrandForm(false); }} />
        ) : brands.length === 0 ? (
          <div style={{ maxWidth: 640, margin: "72px auto 0", textAlign: "center", animation: "fadeUp 500ms ease" }}>
            <h1 style={{ fontFamily: FONT.display, fontSize: 48, fontWeight: 700, color: T.textHeading, lineHeight: 1.12, margin: "0 0 18px", textWrap: "balance" as never }}>
              Futures intelligence,<br />
              <span style={{
                background: `linear-gradient(90deg, ${T.blue}, ${T.violet}, ${T.pink})`,
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>for any brand.</span>
            </h1>
            <p style={{ fontSize: 15, color: T.textSecondary, lineHeight: 1.7, margin: "0 0 36px" }}>
              Point the engine at a brand and it scans live sources for signals, derives the structural
              drivers, writes evidence-cited scenarios — and shows you the cost before you spend a cent.
            </p>
            <button className="btn-primary" onClick={() => setShowBrandForm(true)} style={{ padding: "14px 30px", fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, letterSpacing: 2 }}>
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
