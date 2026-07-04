import { useState } from "react";
import { T, FONT } from "../theme.js";
import { api, IS_DEMO } from "../api.js";
import { GrainOverlay } from "./GrainOverlay.js";

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
    <div style={{ minHeight: "100vh", background: T.bgAbyss, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body }}>
      <GrainOverlay />
      <div style={{ textAlign: "center", animation: "fadeUp 600ms ease" }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, fontWeight: 700, letterSpacing: 10, color: T.gold, marginBottom: 10 }}>HORIZON</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, letterSpacing: 3.5, marginBottom: 48 }}>
          MULTI-BRAND FUTURES INTELLIGENCE ENGINE
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", animation: error ? "shake 300ms ease" : "none" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ENTER ACCESS CODE"
            autoFocus
            style={{
              background: T.bgCard,
              border: `1px solid ${error ? T.red : T.glassBorderStrong}`,
              borderRadius: 5, padding: "13px 20px", fontSize: 13, color: T.textPrimary,
              fontFamily: FONT.mono, letterSpacing: 2, width: 264,
              outline: "none", textAlign: "center", transition: "border-color 300ms ease",
            }}
          />
          <button
            onClick={submit}
            disabled={busy}
            style={{
              background: `linear-gradient(180deg, ${T.gold}2E, ${T.gold}14)`,
              border: `1px solid ${T.gold}50`, borderRadius: 5,
              padding: "13px 20px", color: T.gold, fontSize: 13, cursor: "pointer",
              fontFamily: FONT.mono, fontWeight: 600,
            }}
          >
            {busy ? "·" : "→"}
          </button>
        </div>
        {error && (
          <div style={{ color: T.red, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 2, marginTop: 14 }}>ACCESS DENIED</div>
        )}
        <div style={{ marginTop: 56, fontSize: 10, color: T.textMuted, fontFamily: FONT.mono, letterSpacing: 2 }}>
          SIGNALS · CLUSTERS · DRIVERS · SCENARIOS · STRATEGY
        </div>
        {IS_DEMO && (
          <div style={{ marginTop: 14, fontSize: 10, color: T.amber, fontFamily: FONT.mono, letterSpacing: 1.5 }}>
            DEMO BUILD · ACCESS CODE: demo · ALL DATA SIMULATED IN-BROWSER
          </div>
        )}
      </div>
    </div>
  );
}
