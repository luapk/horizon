import type { CSSProperties } from "react";

export const T = {
  bgAbyss: "#060A12",
  bgPrimary: "#0A0E17",
  bgSecondary: "#111827",
  bgCard: "#10161F",
  bgElevated: "#1A2332",
  bgHover: "#243044",
  textPrimary: "#E8ECF1",
  textHeading: "#F5F7FA",
  textSecondary: "#7A8698",
  textMuted: "#3D4B5E",
  gold: "#D4A853",
  blue: "#2D9CDB",
  red: "#E85D4A",
  green: "#27AE60",
  violet: "#9B6DFF",
  amber: "#F5A623",
  cyan: "#00BCD4",
  glassBorder: "rgba(255, 255, 255, 0.06)",
  glassBorderStrong: "rgba(255, 255, 255, 0.11)",
};

export const FONT = {
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  body: "'DM Sans', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
};

export const STEEP_COLORS: Record<string, string> = { S: T.blue, T: T.gold, Ec: T.amber, En: T.green, P: T.red };
export const STEEP_LABELS: Record<string, string> = { S: "SOCIAL", T: "TECH", Ec: "ECON", En: "ENVIRO", P: "POLICY" };
export const TIER_COLORS: Record<string, string> = { Probable: T.blue, Deep: T.green, Cassandra: T.violet };
export const LANE_COLORS: Record<string, string> = { now: T.green, monitor: T.amber, prepare: T.violet };

/** Uppercase mono eyebrow -- the system's structural voice. */
export function eyebrow(color: string = T.textMuted, size = 10): CSSProperties {
  return { fontFamily: FONT.mono, fontSize: size, fontWeight: 600, letterSpacing: 3, color, textTransform: "uppercase" };
}

export const card: CSSProperties = {
  background: T.bgCard,
  border: `1px solid ${T.glassBorder}`,
  borderRadius: 8,
};

export const inputStyle: CSSProperties = {
  background: T.bgPrimary,
  border: `1px solid ${T.glassBorderStrong}`,
  borderRadius: 5,
  padding: "11px 13px",
  color: T.textPrimary,
  fontSize: 13,
  width: "100%",
  fontFamily: FONT.body,
};

export function ghostButton(color = T.textSecondary): CSSProperties {
  return {
    background: "none",
    border: `1px solid ${T.glassBorderStrong}`,
    borderRadius: 5,
    padding: "8px 16px",
    color,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT.mono,
    letterSpacing: 1,
  };
}

export const goldButton: CSSProperties = {
  background: `linear-gradient(180deg, ${T.gold}2E, ${T.gold}1A)`,
  border: `1px solid ${T.gold}55`,
  borderRadius: 5,
  padding: "11px 22px",
  color: T.gold,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: FONT.mono,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
};
