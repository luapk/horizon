import { useState } from "react";
import { T, FONT } from "../theme.js";
import { api, IS_DEMO } from "../api.js";
import { GrainOverlay } from "./GrainOverlay.js";
import { LONGVIEW_LOGO } from "../logo.js";

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
    <div style={{ minHeight: "100vh", background: T.bgAbyss, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, position: "relative", overflow: "hidden" }}>
      <div className="orb orb--blue" />
      <div className="orb orb--violet" />
      <div className="orb orb--pink" />
      <GrainOverlay />
      <div className="glass--strong" style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeUp 600ms ease", padding: "56px 64px", borderRadius: 20 }}>
        <img src={LONGVIEW_LOGO} alt="Longview" style={{ height: 48, width: "auto", display: "block", margin: "0 auto 14px" }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted, letterSpacing: 3.5, marginBottom: 44 }}>
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
              background: "rgba(10, 13, 24, 0.65)",
              border: `1px solid ${error ? T.coral : T.glassBorderStrong}`,
              borderRadius: 8, padding: "13px 20px", fontSize: 13, color: T.textPrimary,
              fontFamily: FONT.mono, letterSpacing: 2, width: 262,
              outline: "none", textAlign: "center", transition: "border-color 300ms ease",
            }}
          />
          <button className="btn-primary" onClick={submit} disabled={busy} style={{ padding: "13px 20px", fontSize: 13, fontFamily: FONT.mono, fontWeight: 600 }}>
            {busy ? "·" : "→"}
          </button>
        </div>
        {error && (
          <div style={{ color: T.coral, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 2, marginTop: 14 }}>ACCESS DENIED</div>
        )}
        <div style={{ marginTop: 48, fontSize: 10, color: T.textMuted, fontFamily: FONT.mono, letterSpacing: 2 }}>
          SIGNALS · CLUSTERS · DRIVERS · SCENARIOS · STRATEGY
        </div>
        {IS_DEMO && (
          <div style={{ marginTop: 14, fontSize: 10, color: T.peach, fontFamily: FONT.mono, letterSpacing: 1.5 }}>
            DEMO BUILD · ACCESS CODE: demo · ALL DATA SIMULATED IN-BROWSER
          </div>
        )}
      </div>
    </div>
  );
}
