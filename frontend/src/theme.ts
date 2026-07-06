import type { CSSProperties } from "react";

/** Pastel-on-abyss system — all-cool palette (no warm/orange tones): powder
 * blue / lavender / rose-pink / mint / sky-cyan over a violet-tinted near-black,
 * rendered through layered glass. */
export const T = {
  bgAbyss: "#05070F",
  bgPrimary: "#0A0D18",
  bgElevated: "#151B2C",
  textPrimary: "#E6EAF2",
  textHeading: "#F7F9FC",
  textSecondary: "#8B97AF",
  textMuted: "#55637D",
  blue: "#8FB8FF",
  violet: "#B39DFF",
  pink: "#F2A6C9",
  mint: "#93E6C3",
  cyan: "#7FD4F5",
  rose: "#FF7A9A", // cool pink-red for threats / negatives — replaces warm coral
  glassBorder: "rgba(255, 255, 255, 0.085)",
  glassBorderStrong: "rgba(255, 255, 255, 0.14)",
};

export const ACCENT = T.violet;

/** Swiss / International-style type: a neutral grotesque for display & body,
 * a mono for data and labels. Exaggerated size contrast (huge figures, tiny
 * uppercase labels) carries the hierarchy. Arimo is a metric-compatible
 * Helvetica; it loads in real deployments and falls back to the system
 * Helvetica/Arial stack (which is itself the authentic Swiss face). */
export const FONT = {
  display: "'Arimo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "'Arimo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
};

/** Big display headline — tight tracking, heavy weight (Swiss poster feel). */
export function display(size: number, color = T.textHeading, weight = 700): CSSProperties {
  return {
    fontFamily: FONT.display,
    fontSize: size,
    fontWeight: weight,
    color,
    letterSpacing: size >= 40 ? -1.5 : size >= 24 ? -0.8 : -0.3,
    lineHeight: 1.02,
  };
}

export const STEEP_COLORS: Record<string, string> = { S: T.blue, T: T.violet, Ec: T.pink, En: T.mint, P: T.rose };
export const STEEP_LABELS: Record<string, string> = { S: "SOCIAL", T: "TECH", Ec: "ECON", En: "ENVIRO", P: "POLICY" };
export const TIER_COLORS: Record<string, string> = { Probable: T.blue, Deep: T.mint, Cassandra: T.pink };
export const LANE_COLORS: Record<string, string> = { now: T.mint, monitor: T.cyan, prepare: T.violet };

/** Uppercase mono eyebrow — the system's structural voice. */
export function eyebrow(color: string = T.textMuted, size = 10): CSSProperties {
  return { fontFamily: FONT.mono, fontSize: size, fontWeight: 600, letterSpacing: 3, color, textTransform: "uppercase" };
}

export const inputStyle: CSSProperties = {
  background: "rgba(10, 13, 24, 0.6)",
  border: `1px solid ${T.glassBorderStrong}`,
  borderRadius: 7,
  padding: "11px 13px",
  color: T.textPrimary,
  fontSize: 13,
  width: "100%",
  fontFamily: FONT.body,
  transition: "border-color 180ms ease",
};

export const primaryButton: CSSProperties = {
  padding: "12px 24px",
  fontSize: 12,
  fontFamily: FONT.mono,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
};

export const ghostButtonStyle: CSSProperties = {
  padding: "8px 16px",
  color: T.textSecondary,
  fontSize: 11,
  fontFamily: FONT.mono,
  letterSpacing: 1,
};
