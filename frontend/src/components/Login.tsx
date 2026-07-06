import { useState } from "react";
import { T, FONT } from "../theme.js";
import { api, IS_DEMO } from "../api.js";
import { useIsNarrow } from "../hooks.js";
import { GrainOverlay } from "./GrainOverlay.js";
import { LONGVIEW_LOGO } from "../logo.js";

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const narrow = useIsNarrow();

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
      {/* Full-bleed ocean photograph. cover via backgroundSize fills any viewport
          without distortion; fails silently to the abyss background if the asset
          can't load (e.g. the inlined demo build). */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "url(/login-bg.jpg)",
          backgroundSize: "cover", backgroundPosition: "center",
          animation: "fadeIn 1200ms ease",
        }}
      />
      {/* Vignette + tint so the glass card and mono type hold contrast over the
          bright water, with cinematic edge fall-off. */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          background:
            "radial-gradient(ellipse at center, rgba(5,7,15,0.28) 0%, rgba(5,7,15,0.62) 100%), linear-gradient(180deg, rgba(5,7,15,0.35) 0%, rgba(5,7,15,0.12) 45%, rgba(5,7,15,0.55) 100%)",
        }}
      />
      <GrainOverlay />
      <div className="glass--strong" style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeUp 600ms ease", padding: narrow ? "40px 26px" : "56px 64px", borderRadius: 20, width: narrow ? "calc(100vw - 28px)" : "auto", maxWidth: 460 }}>
        <img src={LONGVIEW_LOGO} alt="Longview" style={{ width: narrow ? 200 : 288, maxWidth: "100%", height: "auto", display: "block", margin: "0 auto 14px" }} />
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
              border: `1px solid ${error ? T.rose : T.glassBorderStrong}`,
              borderRadius: 8, padding: "13px 20px", fontSize: 13, color: T.textPrimary,
              fontFamily: FONT.mono, letterSpacing: 2, width: narrow ? "auto" : 262,
              flex: narrow ? 1 : "none", minWidth: 0,
              outline: "none", textAlign: "center", transition: "border-color 300ms ease",
            }}
          />
          <button className="btn-primary" onClick={submit} disabled={busy} style={{ padding: "13px 20px", fontSize: 13, fontFamily: FONT.mono, fontWeight: 600 }}>
            {busy ? "·" : "→"}
          </button>
        </div>
        {error && (
          <div style={{ color: T.rose, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 2, marginTop: 14 }}>ACCESS DENIED</div>
        )}
        <div style={{ marginTop: 48, fontSize: 10, color: T.textMuted, fontFamily: FONT.mono, letterSpacing: 2 }}>
          SIGNALS · CLUSTERS · DRIVERS · SCENARIOS · STRATEGY
        </div>
        {IS_DEMO && (
          <div style={{ marginTop: 14, fontSize: 10, color: T.cyan, fontFamily: FONT.mono, letterSpacing: 1.5 }}>
            DEMO BUILD · ACCESS CODE: demo · ALL DATA SIMULATED IN-BROWSER
          </div>
        )}
      </div>
    </div>
  );
}
