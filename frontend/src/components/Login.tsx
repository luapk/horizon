import { useState } from "react";
import { T } from "../theme.js";
import { api } from "../api.js";

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.login(password);
      onLoggedIn();
    } catch {
      setError(true);
      setTimeout(() => setError(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bgAbyss, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: 8, color: T.gold, marginBottom: 8 }}>HORIZON ENGINE</div>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: T.textMuted, letterSpacing: 3, marginBottom: 40 }}>MULTI-BRAND FUTURES INTELLIGENCE</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ACCESS CODE"
            autoFocus
            style={{ background: T.bgCard, border: `1px solid ${error ? T.red : T.glassBorder}`, borderRadius: 4, padding: "12px 20px", fontSize: 13, color: T.textPrimary, width: 260, textAlign: "center" }}
          />
          <button onClick={submit} disabled={busy} style={{ background: T.gold + "20", border: `1px solid ${T.gold}40`, borderRadius: 4, padding: "12px 20px", color: T.gold, cursor: "pointer" }}>
            {busy ? "..." : "→"}
          </button>
        </div>
        {error && <div style={{ color: T.red, fontSize: 11, marginTop: 12 }}>ACCESS DENIED</div>}
      </div>
    </div>
  );
}
