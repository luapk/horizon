import pptxgen from "pptxgenjs";
import type { ScanResult } from "@horizon/shared";
import { executiveSummary } from "./scanSummary.js";

/** Client-side PPTX export of a completed scan. Runs entirely in the browser
 * (pptxgenjs), so it works in the demo and in production with no backend. */

const ABYSS = "05070F";
const PANEL = "0E1320";
const HEAD = "F7F9FC";
const BODY = "C7CFE0";
const MUTE = "8B97AF";
const FAINT = "55637D";
const BLUE = "8FB8FF";
const VIOLET = "B39DFF";
const PINK = "F2A6C9";
const MINT = "93E6C3";
const CYAN = "7FD4F5";
const ROSE = "FF7A9A";

const TIER_HEX: Record<string, string> = { Probable: BLUE, Deep: MINT, Cassandra: PINK };
const LANE_HEX: Record<string, string> = { now: MINT, monitor: CYAN, prepare: VIOLET };

export async function downloadScanPpt(scan: ScanResult, brandName: string): Promise<void> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "LV", width: 13.333, height: 7.5 });
  pptx.layout = "LV";
  pptx.author = "Longview";
  pptx.company = "Longview";

  const foot = (s: pptxgen.Slide, n: string) => {
    s.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.05, fill: { color: VIOLET } });
    s.addText("LONGVIEW · FUTURES INTELLIGENCE", { x: 0.5, y: 7.12, w: 9, h: 0.3, fontFace: "Consolas", fontSize: 8, color: FAINT });
    s.addText(n, { x: 12, y: 7.12, w: 0.83, h: 0.3, align: "right", fontFace: "Consolas", fontSize: 8, color: FAINT });
  };
  const eyebrow = (s: pptxgen.Slide, t: string, c = VIOLET, y = 0.45) =>
    s.addText(t.toUpperCase(), { x: 0.5, y, w: 12, h: 0.3, fontFace: "Consolas", fontSize: 11, bold: true, color: c, charSpacing: 2 });
  const title = (s: pptxgen.Slide, t: string, y = 0.78) =>
    s.addText(t, { x: 0.5, y, w: 12.3, h: 0.8, fontFace: "Arial", fontSize: 30, bold: true, color: HEAD });

  // ── Title ──
  let s = pptx.addSlide(); s.background = { color: ABYSS };
  s.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: VIOLET } });
  s.addText("MULTI-BRAND FUTURES INTELLIGENCE", { x: 0.6, y: 2.0, w: 12, h: 0.4, fontFace: "Consolas", fontSize: 12, bold: true, color: VIOLET, charSpacing: 3 });
  s.addText("Longview", { x: 0.55, y: 2.4, w: 12, h: 1.3, fontFace: "Arial", fontSize: 66, bold: true, color: HEAD });
  s.addText(`${brandName}: the decade ahead`, { x: 0.6, y: 3.9, w: 12, h: 0.7, fontFace: "Arial", fontSize: 24, color: BLUE });
  s.addText(`${new Date(scan.createdAt).toLocaleDateString()}  ·  ${scan.signals.length} signals · ${scan.drivers.length} drivers · ${scan.scenarios.length} scenarios`,
    { x: 0.6, y: 4.7, w: 12, h: 0.4, fontFace: "Consolas", fontSize: 12, color: MUTE });

  // ── Executive summary ──
  s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, "02");
  eyebrow(s, "Executive summary", VIOLET); title(s, "The one-paragraph read");
  s.addShape("roundRect", { x: 0.5, y: 1.75, w: 12.33, h: 3.2, rectRadius: 0.08, fill: { color: PANEL }, line: { color: "FFFFFF", transparency: 90 } });
  s.addText(executiveSummary(scan, brandName), { x: 0.9, y: 2.05, w: 11.5, h: 2.6, fontFace: "Arial", fontSize: 18, color: BODY, lineSpacingMultiple: 1.3, valign: "top" });
  const cost = scan.actualCostUsd != null ? `Actual provider cost: $${scan.actualCostUsd.toFixed(3)}` : "";
  s.addText(`Estimate $${scan.estimate.lowUsd.toFixed(2)}–$${scan.estimate.highUsd.toFixed(2)}   ${cost}`,
    { x: 0.5, y: 5.2, w: 12, h: 0.4, fontFace: "Consolas", fontSize: 12, color: MINT });

  // ── Drivers ──
  s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, "03");
  eyebrow(s, "Structural drivers", BLUE); title(s, "The forces shaping the decade");
  const dcols = 2;
  scan.drivers.slice(0, 8).forEach((d, i) => {
    const col = i % dcols, row = Math.floor(i / dcols);
    const x = 0.5 + col * 6.25, y = 1.7 + row * 1.28;
    s.addShape("roundRect", { x, y, w: 6.0, h: 1.15, rectRadius: 0.06, fill: { color: PANEL }, line: { color: "FFFFFF", transparency: 92 } });
    s.addShape("rect", { x, y, w: 0.05, h: 1.15, fill: { color: BLUE } });
    s.addText([{ text: `${d.id}  `, options: { color: BLUE, bold: true } }, { text: d.name, options: { color: HEAD, bold: true } }],
      { x: x + 0.2, y: y + 0.1, w: 5.6, h: 0.35, fontFace: "Arial", fontSize: 13 });
    s.addText(d.desc, { x: x + 0.2, y: y + 0.45, w: 5.6, h: 0.65, fontFace: "Arial", fontSize: 9.5, color: BODY, valign: "top" });
  });

  // ── Scenarios overview ──
  s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, "04");
  eyebrow(s, "Scenario portfolio", MINT); title(s, `${scan.scenarios.length} evidence-cited futures`);
  const srows: pptxgen.TableRow[] = [[
    { text: "TIER", options: { fontFace: "Consolas", fontSize: 10, color: MUTE, bold: true, fill: { color: PANEL } } },
    { text: "SCENARIO", options: { fontFace: "Consolas", fontSize: 10, color: MUTE, bold: true, fill: { color: PANEL } } },
    { text: "CITED", options: { fontFace: "Consolas", fontSize: 10, color: MUTE, bold: true, fill: { color: PANEL }, align: "center" } },
    { text: "CONFIDENCE", options: { fontFace: "Consolas", fontSize: 10, color: MUTE, bold: true, fill: { color: PANEL }, align: "center" } },
  ]];
  scan.scenarios.forEach((sc, i) => {
    const bg = i % 2 === 0 ? ABYSS : PANEL;
    srows.push([
      { text: sc.tier, options: { fontFace: "Consolas", fontSize: 10, color: TIER_HEX[sc.tier] ?? BLUE, bold: true, fill: { color: bg } } },
      { text: `${sc.title} — ${sc.tagline}`, options: { fontFace: "Arial", fontSize: 10, color: BODY, fill: { color: bg } } },
      { text: String(sc.citedSignalIds.length), options: { fontFace: "Consolas", fontSize: 10, color: MUTE, align: "center", fill: { color: bg } } },
      { text: sc.confidence, options: { fontFace: "Consolas", fontSize: 9, color: MUTE, align: "center", fill: { color: bg } } },
    ]);
  });
  s.addTable(srows, { x: 0.5, y: 1.7, w: 12.33, colW: [1.6, 8.13, 1.3, 1.3], border: { type: "solid", color: "1A2233", pt: 1 }, rowH: 0.4, valign: "middle" });

  // ── Per-scenario dispatches (probable + cassandra) ──
  const featured = scan.scenarios.filter((sc) => sc.tier === "Probable" || sc.tier === "Cassandra").slice(0, 4);
  featured.forEach((sc, i) => {
    s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, String(5 + i).padStart(2, "0"));
    eyebrow(s, `${sc.tier} scenario`, TIER_HEX[sc.tier] ?? BLUE);
    title(s, sc.title);
    s.addText(sc.tagline, { x: 0.5, y: 1.5, w: 12.3, h: 0.5, fontFace: "Arial", fontSize: 14, italic: true, color: MUTE });
    s.addText(sc.dispatch.replace(/\[(S-\d{3})\]/g, "[$1]"), { x: 0.5, y: 2.1, w: 8.0, h: 4.7, fontFace: "Arial", fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.28, valign: "top" });
    s.addShape("roundRect", { x: 8.7, y: 2.1, w: 4.13, h: 2.1, rectRadius: 0.06, fill: { color: "1A0E14" }, line: { color: ROSE, transparency: 60 } });
    s.addText("KILLER ASSUMPTION", { x: 8.9, y: 2.25, w: 3.8, h: 0.3, fontFace: "Consolas", fontSize: 9, bold: true, color: ROSE, charSpacing: 1 });
    s.addText(sc.killerAssumption, { x: 8.9, y: 2.55, w: 3.75, h: 1.5, fontFace: "Arial", fontSize: 10.5, color: BODY, valign: "top" });
    s.addShape("roundRect", { x: 8.7, y: 4.4, w: 4.13, h: 2.1, rectRadius: 0.06, fill: { color: "0E1622" }, line: { color: CYAN, transparency: 60 } });
    s.addText("SHADOW SIDE", { x: 8.9, y: 4.55, w: 3.8, h: 0.3, fontFace: "Consolas", fontSize: 9, bold: true, color: CYAN, charSpacing: 1 });
    s.addText(sc.shadow, { x: 8.9, y: 4.85, w: 3.75, h: 1.5, fontFace: "Arial", fontSize: 10.5, color: BODY, valign: "top" });
  });

  // ── Strategy matrix ──
  if (scan.matrix.length) {
    s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, "09");
    eyebrow(s, "Strategic impact matrix", PINK); title(s, "Scenarios × business units");
    const head: pptxgen.TableCell[] = [{ text: "BUSINESS UNIT", options: { fontFace: "Consolas", fontSize: 9, color: MUTE, bold: true, fill: { color: PANEL } } }];
    scan.scenarios.forEach((sc) => head.push({ text: `S${sc.id}`, options: { fontFace: "Consolas", fontSize: 9, color: TIER_HEX[sc.tier] ?? BLUE, align: "center", fill: { color: PANEL } } }));
    const mrows: pptxgen.TableRow[] = [head];
    scan.matrix.forEach((row) => {
      const cells: pptxgen.TableCell[] = [{ text: row.businessUnit, options: { fontFace: "Arial", fontSize: 10, color: HEAD, fill: { color: ABYSS } } }];
      row.scores.forEach((sc, i) => {
        const t = row.types[i];
        const c = t === "opp" ? MINT : t === "threat" ? ROSE : MUTE;
        cells.push({ text: String(sc), options: { fontFace: "Consolas", fontSize: 11, color: c, align: "center", fill: { color: ABYSS } } });
      });
      mrows.push(cells);
    });
    const colW = [2.4, ...scan.scenarios.map(() => (12.33 - 2.4) / scan.scenarios.length)];
    s.addTable(mrows, { x: 0.5, y: 1.7, w: 12.33, colW, border: { type: "solid", color: "1A2233", pt: 1 }, rowH: 0.45, valign: "middle" });
    s.addText("Green = opportunity · Rose = threat · Grey = monitor · cell value = impact 1–4",
      { x: 0.5, y: 6.3, w: 12, h: 0.3, fontFace: "Consolas", fontSize: 9, color: MUTE });
  }

  // ── Timeline ──
  s = pptx.addSlide(); s.background = { color: ABYSS }; foot(s, "10");
  eyebrow(s, "Action timeline", MINT); title(s, "Now · Monitor · Prepare");
  (["now", "monitor", "prepare"] as const).forEach((lane, li) => {
    const x = 0.5 + li * 4.16;
    s.addText(lane.toUpperCase(), { x, y: 1.7, w: 3.9, h: 0.35, fontFace: "Consolas", fontSize: 12, bold: true, color: LANE_HEX[lane], charSpacing: 2 });
    s.addShape("rect", { x, y: 2.05, w: 3.9, h: 0.03, fill: { color: LANE_HEX[lane] } });
    const items = scan.timeline.filter((t) => t.lane === lane).slice(0, 6);
    items.forEach((t, i) => {
      const y = 2.25 + i * 0.75;
      s.addShape("roundRect", { x, y, w: 3.9, h: 0.65, rectRadius: 0.05, fill: { color: PANEL }, line: { color: "FFFFFF", transparency: 93 } });
      s.addText(`${t.year} · S${t.scenarioId}`, { x: x + 0.15, y: y + 0.06, w: 3.6, h: 0.25, fontFace: "Consolas", fontSize: 8, color: FAINT });
      s.addText(t.label, { x: x + 0.15, y: y + 0.28, w: 3.6, h: 0.34, fontFace: "Arial", fontSize: 9.5, color: BODY, valign: "top" });
    });
  });

  const safe = brandName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "brand";
  await pptx.writeFile({ fileName: `Longview-${safe}-foresight.pptx` });
}
