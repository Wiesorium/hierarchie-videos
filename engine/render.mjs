// Frame renderer. Reads a resolved timeline (made by build.py) and writes raw RGBA frames to stdout,
// or PNG stills with --png. Usage:
//   node engine/render.mjs resolved.json --variant a --from 0 --to 120 > frames.rgba
//   node engine/render.mjs resolved.json --variant a --png 0,90,300 --out dir
//   node engine/render.mjs resolved.json --tail --from 0 --to 200   (shared main part, main-time frames)
import fs from 'node:fs';
import path from 'node:path';
import { W, H, C, FPS, makeCanvas, lifeAlpha, popScale, smooth, clamp, easeInOutCubic, easeOutCubic, lerp, hop, wobble, hash } from './lib/core.mjs';
import { landscape, clouds, drawProp } from './lib/stage.mjs';
import { drawFigure, figureMetrics } from './lib/figures.mjs';
import { layoutCabinet, layoutTree, layoutNode, drawCabinet, drawTree, drawNode, drawLink, drawCard, drawBubble, drawThought,
  drawStamp, drawIcon, drawSparks, tagPill, stateAt } from './lib/elements.mjs';
import { drawZoom, universeIdle, ZMAX } from './lib/universe.mjs';
import { drawHookCard, drawSubtitles, drawQuestion, drawEndCard, ENDCARDS } from './lib/overlay.mjs';

const args = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const isTail = args.includes('--tail');
const V = isTail ? null : R.variants[opt('variant', 'a')];

// ---------- layout ----------
const REG = {}; // id -> rect for links
const Z_ORDER = { prop: 0, cabinet: 1, tree: 1, node: 2, figure: 3, link: 4, arrow: 4, card: 5, bubble: 6, thought: 6, stamp: 7, tag: 7, icon: 7 };
const ELS = R.elements.map((e, i) => ({ ...e, _i: i }));
for (const e of ELS) {
  if (e.type === 'cabinet') Object.assign(REG, layoutCabinet(e));
  else if (e.type === 'tree') Object.assign(REG, layoutTree(e));
  else if (e.type === 'node') Object.assign(REG, layoutNode(e));
}
ELS.sort((a, b) => ((a.z ?? Z_ORDER[a.type] ?? 5) - (b.z ?? Z_ORDER[b.type] ?? 5)) || a._i - b._i);
const BYID = Object.fromEntries(ELS.map(e => [e.id, e]));

function moveOffset(e, tm) {
  let x = 0, y = 0; for (const m of e._moves || []) { if (tm < m.t) break; const u = easeInOutCubic((tm - m.t) / (m.dur || 0.8)); x = lerp(x, m.dx, u); y = lerp(y, m.dy, u); }
  return { x, y };
}
function envAt(tm) { const env = R.envelope || []; const i = Math.round(tm * FPS); return env[i] ?? 0; }

function enterTransform(e, tm) {
  const en = e.enter || (['figure'].includes(e.type) ? 'slide' : ['prop', 'link', 'arrow'].includes(e.type) ? 'fade' : e.type === 'cabinet' || e.type === 'tree' ? 'slide' : 'pop');
  const tin = e._tin; const res = { dx: 0, dy: 0, sc: 1 };
  if (tin <= -50 || tm < tin) return res;
  const u = (tm - tin);
  if (en === 'pop') res.sc = popScale(tm, tin, 0.42);
  else if (en === 'hop') { res.sc = popScale(tm, tin, 0.42); res.dy = -hop(tm, tin, 0.5); }
  else if (en === 'slide') { const fromRight = (e.x ?? 540) > W / 2; const d = (1 - easeOutCubic(u / 0.8)) * (fromRight ? 1 : -1) * 700; res.dx = d; }
  else if (en === 'slide-up') res.dy = (1 - easeOutCubic(u / 0.6)) * 500;
  return res;
}

function headOf(id, tm) {
  const f = BYID[id]; if (!f || f.type !== 'figure') return null; const m = figureMetrics(f); const o = moveOffset(f, tm);
  return { x: m.headX + o.x, y: m.headY + o.y, r: m.headR };
}

function moodAt(f, tm) { let m = f.mood || 'smile'; for (const k of f._moods || []) if (k.t <= tm) m = k.mood; return m; }
function gestureAt(f, tm) { for (const g of f._gestures || []) { const d = g.dur || 1.4; if (tm >= g.t && tm <= g.t + d) return { kind: g.kind, phase: (tm - g.t) / d }; } return null; }
function talking(f, tm) { for (const [a, b] of f._talk || []) if (tm >= a && tm <= b) return true; return false; }

function drawElement(ctx, e, tm) {
  const a = lifeAlpha(tm, e._tin, e._tout, e.type === 'figure' ? 0.4 : 0.25, 0.3); if (a <= 0.003) return;
  const tr = enterTransform(e, tm); const mo = moveOffset(e, tm); const wb = (e.type === 'figure' || e.type === 'link') ? { dx: 0, dy: 0, rot: 0 } : wobble(tm, hash(e.id), e.wobble ?? 1);
  ctx.save(); ctx.globalAlpha *= a;
  const px = (e.x ?? W / 2) + mo.x, py = (e.y ?? 960) + mo.y;
  ctx.translate(mo.x + tr.dx + wb.dx, mo.y + tr.dy + wb.dy);
  if (tr.sc !== 1 || wb.rot) { ctx.translate(px - mo.x, py - mo.y); ctx.rotate(wb.rot); ctx.scale(tr.sc, tr.sc); ctx.translate(-(px - mo.x), -(py - mo.y)); }
  if (tr.sc <= 0.001) { ctx.restore(); return; }
  const offsets = {}; for (const el of ELS) offsets[el.id] = moveOffset(el, tm);
  switch (e.type) {
    case 'figure': {
      const look = e.look === 'left' ? -1 : e.look === 'right' ? 1 : typeof e.look === 'number' ? e.look : 0;
      drawFigure(ctx, e, { t: tm, mood: moodAt(e, tm), gesture: gestureAt(e, tm), talk: talking(e, tm) ? envAt(tm) : 0, lookX: look, hopT: hop(tm, e._hopT ?? -99, 0.5) });
      break; }
    case 'prop': drawProp(ctx, e, tm); break;
    case 'cabinet': drawCabinet(ctx, e, tm); break;
    case 'tree': drawTree(ctx, e, tm, REG); break;
    case 'node': drawNode(ctx, e, tm); break;
    case 'link': case 'arrow': ctx.restore(); ctx.save(); ctx.globalAlpha *= a; drawLink(ctx, { ...e, from: e.from, to: e.to }, tm, REG, offsets); break;
    case 'card': drawCard(ctx, e, tm); break;
    case 'bubble': { ctx.restore(); ctx.save(); ctx.globalAlpha *= a; const hd = e.from ? headOf(e.from, tm) : null;
      drawBubble(ctx, e, tm, hd, tr.sc); break; }
    case 'thought': { ctx.restore(); ctx.save(); ctx.globalAlpha *= a * clamp(tr.sc); drawThought(ctx, e, tm, e.from ? headOf(e.from, tm) : null); break; }
    case 'stamp': drawStamp(ctx, e, tm); break;
    case 'tag': tagPill(ctx, e.text, e.x, e.y, e.size ?? 40, e.color ? (C[e.color] || e.color) : C.plum); break;
    case 'icon': drawIcon(ctx, e, tm); break;
    default: throw new Error('Unbekannter Element-Typ: ' + e.type);
  }
  ctx.restore();
}

function cameraPulse(tm) { let s = 1; for (const h of R.hits) { const d = tm - h.t; if (d >= 0 && d < 0.9) s += 0.045 * (1 - Math.exp(-d / 0.03)) * Math.exp(-d / 0.17); } return s; }

const [sceneCv, sctx] = makeCanvas();
function drawScene(ctx, tm, withPulse = true) {
  ctx.save();
  const s = withPulse ? cameraPulse(tm) : 1; if (s !== 1) { ctx.translate(W / 2, 1000); ctx.scale(s, s); ctx.translate(-W / 2, -1000); }
  ctx.drawImage(landscape(), 0, 0); clouds(ctx, tm + 30);
  for (const e of ELS) drawElement(ctx, e, tm);
  for (const h of R.hits) if (h.sparks !== false) drawSparks(ctx, h.x ?? W / 2, h.y ?? 900, tm, h.t, h.scale ?? 1);
  ctx.restore();
}

const O = R.outro;
if (!R.focus) { const hd = R.hero ? headOf(R.hero, 0) : null; R.focus = hd ? { x: hd.x, y: hd.y } : { x: W / 2, y: 1100 }; }
function zoomInZ(tv) { const d = R.zoomIn?.dur ?? 0; if (!d || tv >= d) return ZMAX; const u = clamp(tv / d); return ZMAX * (0.32 * u + 0.68 * easeInOutCubic(u)); }
function zoomOutZ(tm) { if (tm < O.zoomStart) return ZMAX; const u = clamp((tm - O.zoomStart) / O.zoomDur); return ZMAX * (1 - easeInOutCubic(u)); }

function frame(ctx, tm, tv, variant) {
  const zIn = variant ? zoomInZ(tv) : ZMAX; const zOut = zoomOutZ(tm); const Z = Math.min(zIn, zOut);
  if (Z >= ZMAX - 1e-4) drawScene(ctx, tm, true);
  else if (Z <= 1e-4) universeIdle(ctx, tm);
  else { drawScene(sctx, tm, false); drawZoom(ctx, Z, tm, sceneCv, R.focus); }
  // overlays
  if (variant) drawHookCard(ctx, variant.card, tv, variant.cardEnd);
  drawSubtitles(ctx, R.subtitles, tm, R.subStart ?? -1e9);
  if (tm >= O.questionIn - 0.3) drawQuestion(ctx, O.questionLines, O.questionTimes, tm, O.questionIn);
  if (tm >= O.ctaIn) drawEndCard(ctx, { ...(ENDCARDS[R.cta] || ENDCARDS.whatsapp), ...(R.endcard || {}) }, tm, O.ctaIn);
  const fade = smooth(O.end - 0.8, O.end, tm); if (fade > 0) { ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = C.uni1; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

const [cv, ctx] = makeCanvas();
function renderAt(f) {
  if (isTail) { const tm = R.tailStart + f / FPS; frame(ctx, tm, null, null); }
  else { const tv = f / FPS; const tm = tv - V.offset; frame(ctx, tm, tv, V); }
}

if (opt('png')) {
  const outDir = opt('out', '.'); fs.mkdirSync(outDir, { recursive: true });
  for (const f of opt('png').split(',').map(Number)) { renderAt(f); fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`), cv.toBuffer('image/png')); }
} else {
  const from = Number(opt('from', 0)), to = Number(opt('to', 0)); const out = process.stdout;
  for (let f = from; f < to; f++) { renderAt(f); const buf = cv.data(); if (!out.write(buf)) await new Promise(r => out.once('drain', r)); }
}
