import { useEffect, useMemo, useRef, useState } from "react";
import type { Signal } from "@horizon/shared";
import { T, FONT, STEEP_COLORS, STEEP_INFO, eyebrow } from "../theme.js";
import { landDots } from "../landmask.js";
import { resolveGeo } from "../geo.js";

interface Marker { lat: number; lng: number; name: string; signals: Signal[]; color: string; }
interface Hover { marker: Marker; x: number; y: number; }
export interface Arc { a: { lat: number; lng: number }; b: { lat: number; lng: number }; color: string; }

const DEG = Math.PI / 180;
const TILT = -0.42;
const wrap01 = (v: number) => ((v % 1) + 1) % 1;

function geoToVec(lat: number, lng: number): [number, number, number] {
  const phi = lat * DEG, lam = lng * DEG;
  return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
}

function buildMarkers(signals: Signal[]): { markers: Marker[]; unplotted: Signal[] } {
  const byLoc = new Map<string, Marker>();
  const unplotted: Signal[] = [];
  for (const s of signals) {
    const points = resolveGeo(s.geo);
    if (points.length === 0) { unplotted.push(s); continue; }
    for (const p of points) {
      const key = `${p.lat},${p.lng}`;
      const existing = byLoc.get(key);
      if (existing) existing.signals.push(s);
      else byLoc.set(key, { lat: p.lat, lng: p.lng, name: p.name, signals: [s], color: STEEP_COLORS[s.category] ?? T.violet });
    }
  }
  for (const m of byLoc.values()) {
    const counts = new Map<string, number>();
    for (const s of m.signals) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    m.color = STEEP_COLORS[dominant ?? ""] ?? T.violet;
  }
  return { markers: [...byLoc.values()], unplotted };
}

export function Globe({ signals, size = 460, arcs = [], focus = null }: {
  signals: Signal[];
  size?: number;
  arcs?: Arc[];
  focus?: { lat: number; lng: number } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const { markers, unplotted } = useMemo(() => buildMarkers(signals), [signals]);

  const state = useRef({ rotY: 0.6, tilt: TILT, dragging: false, lastX: 0, lastY: 0, idleAt: -10000, markers, arcs, focus });
  state.current.markers = markers;
  state.current.arcs = arcs;
  state.current.focus = focus;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dots = landDots();
    const cx = size / 2, cy = size / 2, R = size * 0.4;
    let raf = 0;
    const start = performance.now();

    const projectVec = (v: [number, number, number], rotY: number, tilt: number, lift = 1) => {
      const [vx, vy, vz] = v;
      const x = vx * Math.cos(rotY) + vz * Math.sin(rotY);
      const z = -vx * Math.sin(rotY) + vz * Math.cos(rotY);
      const y = vy;
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return { sx: cx + x * R * lift, sy: cy - y2 * R * lift, depth: z2 };
    };
    const project = (lat: number, lng: number, rotY: number, tilt: number) => projectVec(geoToVec(lat, lng), rotY, tilt);

    const frame = (now: number) => {
      const s = state.current;
      const t = (now - start) / 1000;

      // Camera: ease toward a focus point, else idle auto-rotate.
      if (s.focus && !s.dragging) {
        const targetRot = -s.focus.lng * DEG;
        let d = targetRot - s.rotY;
        d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest angular path
        s.rotY += d * 0.08;
        const targetTilt = Math.max(-1.1, Math.min(1.1, s.focus.lat * DEG));
        s.tilt += (targetTilt - s.tilt) * 0.08;
      } else if (!s.dragging && now - s.idleAt > 2000) {
        s.rotY += 0.0034;
      }

      // Sun longitude for the day/night terminator (world-fixed, slow drift).
      const sunLng = t * 0.05;
      const sun: [number, number, number] = [Math.sin(sunLng), 0, Math.cos(sunLng)];

      ctx.clearRect(0, 0, size, size);

      const halo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.22);
      halo.addColorStop(0, "rgba(143,184,255,0)"); halo.addColorStop(0.75, "rgba(143,184,255,0.055)"); halo.addColorStop(1, "rgba(179,157,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();

      const grad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      grad.addColorStop(0, "rgba(38,48,76,0.6)"); grad.addColorStop(1, "rgba(8,11,22,0.92)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = "rgba(179,157,255,0.16)"; ctx.lineWidth = 1; ctx.stroke();

      // Land dots — depth-cued and day/night shaded by the terminator.
      for (const d of dots) {
        const v = geoToVec(d.lat, d.lng);
        const p = projectVec(v, s.rotY, s.tilt);
        if (p.depth <= 0.02) continue;
        const illum = Math.max(0, v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2]);
        const a = (0.08 + p.depth * 0.5) * (0.32 + 0.68 * illum);
        ctx.fillStyle = `rgba(139,158,196,${a.toFixed(3)})`;
        ctx.fillRect(p.sx - 0.7, p.sy - 0.7, 1.4, 1.4);
      }

      // Great-circle arcs between related signal locations.
      for (const arc of s.arcs) {
        const v0 = geoToVec(arc.a.lat, arc.a.lng);
        const v1 = geoToVec(arc.b.lat, arc.b.lng);
        const dot = Math.max(-1, Math.min(1, v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2]));
        const omega = Math.acos(dot);
        if (omega < 0.02) continue;
        const steps = 26;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= steps; i++) {
          const f = i / steps;
          const s0 = Math.sin((1 - f) * omega) / Math.sin(omega);
          const s1 = Math.sin(f * omega) / Math.sin(omega);
          const v: [number, number, number] = [v0[0] * s0 + v1[0] * s1, v0[1] * s0 + v1[1] * s1, v0[2] * s0 + v1[2] * s1];
          const lift = 1 + 0.14 * Math.sin(f * Math.PI); // bow the arc off the surface
          const p = projectVec(v, s.rotY, s.tilt, lift);
          if (p.depth <= 0.0) { started = false; continue; }
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; } else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = arc.color + "66"; ctx.lineWidth = 1; ctx.stroke();
      }

      // Signal markers.
      for (const m of s.markers) {
        const p = project(m.lat, m.lng, s.rotY, s.tilt);
        if (p.depth <= 0.02) continue;
        const base = Math.min(2.6 + m.signals.length * 0.7, 6.5);
        const pulse = wrap01(t * 0.5 + (m.lat + m.lng) * 0.01);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, base + pulse * 12, 0, Math.PI * 2);
        ctx.strokeStyle = m.color + Math.round((1 - pulse) * 120).toString(16).padStart(2, "0"); ctx.lineWidth = 1.2; ctx.stroke();
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, base * 2.6);
        glow.addColorStop(0, m.color + "55"); glow.addColorStop(1, m.color + "00");
        ctx.beginPath(); ctx.arc(p.sx, p.sy, base * 2.6, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        ctx.beginPath(); ctx.arc(p.sx, p.sy, base, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.globalAlpha = 0.45 + p.depth * 0.55; ctx.fill(); ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const findMarker = (mx: number, my: number): Marker | null => {
      const s = state.current;
      let best: Marker | null = null, bestDist = 14;
      for (const m of s.markers) {
        const p = project(m.lat, m.lng, s.rotY, s.tilt);
        if (p.depth <= 0.02) continue;
        const dist = Math.hypot(p.sx - mx, p.sy - my);
        if (dist < bestDist) { bestDist = dist; best = m; }
      }
      return best;
    };

    const onDown = (e: PointerEvent) => {
      const s = state.current; s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      const s = state.current; const rect = canvas.getBoundingClientRect();
      if (s.dragging) {
        s.rotY += (e.clientX - s.lastX) * 0.005;
        s.tilt = Math.max(-1.2, Math.min(1.2, s.tilt + (e.clientY - s.lastY) * 0.004));
        s.lastX = e.clientX; s.lastY = e.clientY; s.idleAt = performance.now(); setHover(null);
      } else {
        const m = findMarker(e.clientX - rect.left, e.clientY - rect.top);
        setHover(m ? { marker: m, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
        canvas.style.cursor = m ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      state.current.dragging = false; state.current.idleAt = performance.now(); canvas.style.cursor = "grab";
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ok */ }
    };
    const onLeave = () => setHover(null);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [size]);

  const categories = [...new Set(signals.flatMap((s) => (resolveGeo(s.geo).length ? [s.category] : [])))];

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: size, height: size, display: "block", margin: "0 auto", cursor: "grab", touchAction: "none" }} />
      {hover && (
        <div className="glass--strong" style={{
          position: "absolute", left: Math.min(hover.x + 14, size - 224), top: hover.y + 10, width: 214,
          borderRadius: 10, padding: "11px 13px", pointerEvents: "none", zIndex: 5, animation: "fadeIn 150ms ease",
        }}>
          <div style={{ ...eyebrow(hover.marker.color), marginBottom: 7 }}>
            {hover.marker.name} · {hover.marker.signals.length} signal{hover.marker.signals.length > 1 ? "s" : ""}
          </div>
          {hover.marker.signals.slice(0, 3).map((s) => (
            <div key={s.id} style={{ fontSize: 11, color: T.textPrimary, lineHeight: 1.45, marginBottom: 4 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted }}>{s.id}</span> {s.title}
            </div>
          ))}
          {hover.marker.signals.length > 3 && (
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: T.textMuted }}>+{hover.marker.signals.length - 3} more</div>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, minHeight: 18 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {categories.map((c) => (
            <span key={c} data-tip={STEEP_INFO[c]} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: T.textSecondary }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: STEEP_COLORS[c], boxShadow: `0 0 8px ${STEEP_COLORS[c]}66` }} />{c}
            </span>
          ))}
        </div>
        {unplotted.length > 0 && (
          <span data-tip="Signals tagged Global or without a specific geography — real, but not plottable on the globe" style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: T.textMuted }}>◌ {unplotted.length} GLOBAL / UNMAPPED</span>
        )}
      </div>
    </div>
  );
}
