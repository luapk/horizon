import { useEffect, useRef, useState } from "react";
import type { Driver } from "@horizon/shared";
import { T, FONT, eyebrow, STEEP_COLORS } from "../theme.js";
import { usePrefersReducedMotion } from "../hooks.js";

/** Force-directed map of the drivers. Nodes sized by signal count; an edge
 * links two drivers that share signals (weight = shared count). Gentle
 * physics keeps it alive; hover isolates a driver and its links. */

interface Node { id: string; d: Driver; x: number; y: number; vx: number; vy: number; r: number; color: string; }
interface Link { a: number; b: number; w: number; }

export function DriverConstellation({ drivers, height = 300 }: { drivers: Driver[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();

  const sim = useRef<{ nodes: Node[]; links: Link[]; hover: number; w: number; h: number }>({ nodes: [], links: [], hover: -1, w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = wrap.clientWidth, h = height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.current.w = w; sim.current.h = h;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    const w = sim.current.w, h = sim.current.h;
    const maxSig = Math.max(...drivers.map((d) => d.signalIds.length), 1);
    const nodes: Node[] = drivers.map((d, i) => {
      const a = (i / drivers.length) * Math.PI * 2;
      return {
        id: d.id, d,
        x: w / 2 + Math.cos(a) * w * 0.22, y: h / 2 + Math.sin(a) * h * 0.28,
        vx: 0, vy: 0,
        r: 9 + (d.signalIds.length / maxSig) * 20,
        color: STEEP_COLORS[d.steep] ?? T.violet,
      };
    });
    const links: Link[] = [];
    for (let i = 0; i < drivers.length; i++)
      for (let j = i + 1; j < drivers.length; j++) {
        const shared = drivers[i].signalIds.filter((s) => drivers[j].signalIds.includes(s)).length;
        if (shared > 0) links.push({ a: i, b: j, w: shared });
      }
    sim.current.nodes = nodes; sim.current.links = links;

    let raf = 0, ticks = 0;
    const step = () => {
      const S = sim.current; const N = S.nodes; const cx = S.w / 2, cy = S.h / 2;
      if (!reduced && ticks < 600) {
        // repulsion
        for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
          const dx = N[j].x - N[i].x, dy = N[j].y - N[i].y;
          const dist = Math.hypot(dx, dy) || 1; const f = 1400 / (dist * dist);
          const ux = dx / dist, uy = dy / dist;
          N[i].vx -= ux * f; N[i].vy -= uy * f; N[j].vx += ux * f; N[j].vy += uy * f;
        }
        // springs
        for (const l of S.links) {
          const A = N[l.a], B = N[l.b]; const dx = B.x - A.x, dy = B.y - A.y;
          const dist = Math.hypot(dx, dy) || 1; const target = 90 + 30 * l.w;
          const f = (dist - target) * 0.008; const ux = dx / dist, uy = dy / dist;
          A.vx += ux * f; A.vy += uy * f; B.vx -= ux * f; B.vy -= uy * f;
        }
        for (const n of N) {
          n.vx += (cx - n.x) * 0.004; n.vy += (cy - n.y) * 0.004; // centering
          n.vx *= 0.86; n.vy *= 0.86;
          n.x += n.vx; n.y += n.vy;
          n.x = Math.max(n.r + 4, Math.min(S.w - n.r - 4, n.x));
          n.y = Math.max(n.r + 4, Math.min(S.h - n.r - 4, n.y));
        }
        ticks++;
      }

      ctx.clearRect(0, 0, S.w, S.h);
      // links
      for (const l of S.links) {
        const A = N[l.a], B = N[l.b];
        const lit = S.hover === l.a || S.hover === l.b;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.strokeStyle = lit ? "rgba(179,157,255,0.55)" : "rgba(139,151,175,0.14)";
        ctx.lineWidth = lit ? 1.4 : 0.6 + l.w * 0.15;
        ctx.stroke();
      }
      // nodes
      for (let i = 0; i < N.length; i++) {
        const n = N[i]; const dim = S.hover >= 0 && S.hover !== i && !S.links.some((l) => (l.a === S.hover && l.b === i) || (l.b === S.hover && l.a === i));
        ctx.globalAlpha = dim ? 0.3 : 1;
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.4);
        glow.addColorStop(0, n.color + "44"); glow.addColorStop(1, n.color + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color; ctx.fill();
        ctx.lineWidth = S.hover === i ? 2 : 0.8; ctx.strokeStyle = S.hover === i ? "#fff" : n.color; ctx.stroke();
        ctx.fillStyle = "#0A0D18"; ctx.font = `700 ${Math.max(8, n.r * 0.62)}px ${FONT.mono}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.id.replace("D-", ""), n.x, n.y);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const pick = (mx: number, my: number) => {
      const N = sim.current.nodes;
      for (let i = 0; i < N.length; i++) if (Math.hypot(N[i].x - mx, N[i].y - my) < N[i].r + 4) return i;
      return -1;
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const i = pick(e.clientX - rect.left, e.clientY - rect.top);
      sim.current.hover = i;
      setHoverName(i >= 0 ? sim.current.nodes[i].d.name : null);
      canvas.style.cursor = i >= 0 ? "pointer" : "default";
    };
    const onLeave = () => { sim.current.hover = -1; setHoverName(null); };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave); };
  }, [drivers, height, reduced]);

  return (
    <div className="glass--strong" style={{ padding: "20px 22px 16px", marginBottom: 24, animation: "fadeUp 450ms both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ ...eyebrow() }}>DRIVER CONSTELLATION</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: hoverName ? T.violet : T.textMuted, transition: "color 150ms", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hoverName ?? "NODE = DRIVER · SIZE = SIGNALS · LINK = SHARED SIGNALS"}
        </span>
      </div>
      <div ref={wrapRef} style={{ width: "100%", height }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
