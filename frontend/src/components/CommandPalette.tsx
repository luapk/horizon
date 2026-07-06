import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanResult } from "@horizon/shared";
import { T, FONT, eyebrow, STEEP_COLORS, TIER_COLORS } from "../theme.js";

export interface Nav { view: string; scenarioId?: number; filter?: string; }

interface Item { kind: string; label: string; sub: string; color: string; nav: Nav; }

/** ⌘K / Ctrl-K palette: jump to any tab, signal, driver or scenario. */
export function CommandPalette({ scan, onGo }: { scan: ScanResult; onGo: (n: Nav) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const tabs = ["Overview", "Signals", "Drivers", "Scenarios", "Strategy", "Timeline", "Story"];
    const out: Item[] = tabs.map((v) => ({ kind: "TAB", label: v, sub: "Jump to tab", color: T.textSecondary, nav: { view: v } }));
    for (const d of scan.drivers) out.push({ kind: "DRIVER", label: d.name, sub: `${d.id} · ${d.trajectory}`, color: STEEP_COLORS[d.steep] ?? T.violet, nav: { view: "Drivers" } });
    for (const s of scan.scenarios) out.push({ kind: "SCENARIO", label: s.title, sub: `${s.tier} · S${s.id}`, color: TIER_COLORS[s.tier], nav: { view: "Scenarios", scenarioId: s.id } });
    for (const sig of scan.signals) out.push({ kind: "SIGNAL", label: sig.title, sub: `${sig.id} · ${sig.geo}`, color: STEEP_COLORS[sig.category] ?? T.textMuted, nav: { view: "Signals", filter: sig.type === "Absence" ? "Absence" : sig.type === "Counter-Signal" ? "Counter" : sig.category } });
    return out;
  }, [scan]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 40);
    return items.filter((it) => it.label.toLowerCase().includes(s) || it.sub.toLowerCase().includes(s) || it.kind.toLowerCase().includes(s)).slice(0, 40);
  }, [q, items]);

  if (!open) return null;

  const go = (it: Item) => { onGo(it.nav); setOpen(false); };

  return (
    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,5,12,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", animation: "fadeIn 120ms ease" }}>
      <div className="glass--strong" onClick={(e) => e.stopPropagation()} style={{ width: "min(640px, 92vw)", borderRadius: 14, overflow: "hidden", animation: "slideUp 200ms cubic-bezier(0.2,0.8,0.2,1)" }}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && filtered[active]) go(filtered[active]);
          }}
          placeholder="Jump to a tab, signal, driver or scenario…"
          style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${T.glassBorder}`, padding: "18px 22px", fontSize: 15, color: T.textPrimary, outline: "none", fontFamily: FONT.body }}
        />
        <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ padding: "20px 22px", color: T.textMuted, fontSize: 13 }}>No matches.</div>}
          {filtered.map((it, i) => (
            <button
              key={i}
              onClick={() => go(it)}
              onMouseEnter={() => setActive(i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer",
                background: i === active ? "rgba(179,157,255,0.1)" : "transparent", border: "none",
                borderLeft: `2px solid ${i === active ? it.color : "transparent"}`, padding: "11px 20px",
              }}
            >
              <span style={{ ...eyebrow(it.color, 8.5), width: 62, flexShrink: 0 }}>{it.kind}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, color: T.textHeading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                <span style={{ display: "block", fontFamily: FONT.mono, fontSize: 9.5, color: T.textMuted }}>{it.sub}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, padding: "10px 20px", borderTop: `1px solid ${T.glassBorder}`, ...eyebrow(T.textMuted, 8.5) }}>
          <span>↑↓ NAVIGATE</span><span>↵ OPEN</span><span>ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
}
