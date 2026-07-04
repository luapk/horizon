import { useEffect, useState } from "react";
import type { BrandConfig } from "@horizon/shared";
import { T } from "./theme.js";
import { api } from "./api.js";
import { Login } from "./components/Login.js";
import { BrandForm } from "./components/BrandForm.js";
import { ScanLauncher } from "./components/ScanLauncher.js";
import { ScanResults } from "./components/ScanResults.js";

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
    <div style={{ minHeight: "100vh", background: T.bgAbyss, color: T.textPrimary, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: `1px solid ${T.glassBorder}` }}>
        <div style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: 4, color: T.gold }}>HORIZON ENGINE</div>
        <button
          onClick={() => { setActiveScanId(null); setShowBrandForm(false); }}
          style={{ background: "none", border: `1px solid ${T.glassBorder}`, borderRadius: 4, padding: "6px 14px", color: T.textSecondary, cursor: "pointer" }}
        >
          Home
        </button>
      </header>

      <main style={{ padding: 32, maxWidth: 1400, margin: "0 auto" }}>
        {activeScanId ? (
          <ScanResults scanId={activeScanId} />
        ) : showBrandForm ? (
          <BrandForm onCreated={(b) => { setBrands((prev) => [...prev, b]); setShowBrandForm(false); }} />
        ) : brands.length === 0 ? (
          <div>
            <p style={{ color: T.textSecondary, marginBottom: 16 }}>No brands yet. Create one to run your first scan.</p>
            <button onClick={() => setShowBrandForm(true)} style={{ background: T.gold + "20", border: `1px solid ${T.gold}40`, borderRadius: 4, padding: "10px 16px", color: T.gold, cursor: "pointer" }}>
              + New brand
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setShowBrandForm(true)} style={{ background: "none", border: `1px solid ${T.glassBorder}`, borderRadius: 4, padding: "6px 14px", color: T.textSecondary, cursor: "pointer" }}>
                + New brand
              </button>
            </div>
            <ScanLauncher brands={brands} onScanStarted={setActiveScanId} />
          </div>
        )}
      </main>
    </div>
  );
}
