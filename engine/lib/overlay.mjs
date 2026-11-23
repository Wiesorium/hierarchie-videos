// Text overlays that sit above the camera: hook card, karaoke subtitles, question card, end card.
import { W, H, C, font, measure, richText, rrect, fillShape, shadow, clamp, smooth, easeOutBack, lerp } from './core.mjs';
import { drawIcon } from './elements.mjs';

export function drawHookCard(ctx, lines, t, tEnd, maxPx = 68) {
  if (!lines || !lines.length) return; const a = 1 - smooth(tEnd, tEnd + 0.35, t); if (a <= 0) return;
  let px = maxPx || 68; const maxW = 920; while (px > 50 && Math.max(...lines.map(l => measure(ctx, l, px))) > maxW - 80) px -= 2;
  const lh = px * 1.22; const w = Math.min(maxW, Math.max(...lines.map(l => measure(ctx, l, px))) + 96); const h = lines.length * lh + 60;
  const float = Math.sin(t * 2.1) * 6, sc = 0.975 + 0.025 * smooth(0, 0.6, t) + 0.008 * Math.sin(t * 1.6), rot = Math.sin(t * 1.1) * 0.008;
  const cx = W / 2, cy = 330 + float;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
  fillShape(ctx, () => rrect(ctx, -w / 2, -h / 2, w, h, 40), C.paper, { depth: 1.3 });
  lines.forEach((l, i) => richText(ctx, l, 0, -h / 2 + 30 + lh / 2 + i * lh, px, i === 1 ? C.rose : C.ink));
  ctx.restore();
}

// chunks: [{words:[{w,s,e}], s, e}]; times in the same clock as t
export function drawSubtitles(ctx, chunks, t, tMin = -1e9) {
  if (t < tMin) return; const ch = chunks.find(c => t >= c.s - 0.08 && t < c.until); if (!ch) return;
  const a = Math.min(smooth(ch.s - 0.08, ch.s + 0.08, t), 1 - smooth(ch.until - 0.12, ch.until, t), smooth(tMin, tMin + 0.25, t));
  let px = ch.words.length > 11 ? 42 : 48; const maxW = 800 - 70;
  ctx.save(); ctx.font = font(px);
  const space = ctx.measureText(' ').width; const lines = []; let cur = [], cw = 0;
  for (const w of ch.words) { const ww = ctx.measureText(w.w).width; if (cur.length && cw + space + ww > maxW) { lines.push({ ws: cur, w: cw }); cur = []; cw = 0; } cur.push({ ...w, ww }); cw += (cur.length > 1 ? space : 0) + ww; }
  if (cur.length) lines.push({ ws: cur, w: cw });
  const lh = px * 1.3; const bw = Math.max(...lines.map(l => l.w)) + 70; const bh = lines.length * lh + 34; const top = 236;
  ctx.globalAlpha *= a; fillShape(ctx, () => rrect(ctx, W / 2 - bw / 2, top, bw, bh, 40), C.paper, { depth: 0.8 });
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  lines.forEach((l, i) => { let x = W / 2 - l.w / 2; const y = top + 17 + lh / 2 + i * lh;
    for (const w of l.ws) { ctx.fillStyle = w.c || C.ink; ctx.globalAlpha = a * (t >= w.s - 0.02 ? 1 : 0.38); ctx.fillText(w.w, x, y); x += w.ww + space; } });
  ctx.restore();
}

// Question card in the universe; words appear one by one with the voice.
export function drawQuestion(ctx, lines, times, t, tIn) {
  if (t < tIn - 0.2) return; const a = smooth(tIn - 0.2, tIn + 0.2, t); const sizes = [50, 56];
  const w = 900, h = lines.length > 1 ? 280 : 190; const cx = W / 2, cy = 640 + Math.sin(t * 1.4) * 5;
  ctx.save(); ctx.globalAlpha *= a; fillShape(ctx, () => rrect(ctx, cx - w / 2, cy - h / 2, w, h, 56), C.paper, { depth: 1.2 });
  let k = 0; const lh = 82;
  lines.forEach((ln, li) => {
    let px = sizes[Math.min(li, 1)]; while (px > 36 && measure(ctx, ln, px) > w - 90) px -= 2;
    ctx.font = font(px); ctx.textBaseline = 'middle'; const words = ln.split(/\s+/); const sp = ctx.measureText(' ').width;
    const total = ctx.measureText(ln).width; let x = cx - total / 2; const y = cy - (lines.length - 1) * lh / 2 + li * lh;
    for (const wd of words) { const tw = times[k] ?? tIn; k++; const wa = smooth(tw - 0.05, tw + 0.12, t); const sc = lerp(0.85, 1, easeOutBack(clamp((t - tw) / 0.3)));
      ctx.save(); ctx.globalAlpha = a * wa; ctx.fillStyle = li === 1 ? C.rose : C.ink; const ww = ctx.measureText(wd).width; ctx.translate(x + ww / 2, y); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.fillText(wd, 0, 0); ctx.restore(); x += ww + sp; }
  });
  ctx.restore();
}

export const ENDCARDS = {
  whatsapp: { title: 'Entdeckerfreunde', pill: 'WhatsApp-Gruppe', lines: ['Lerngeschichten für Eltern', 'mit Neugier statt Druck'], button: 'Schreib mir „Entdecker“' },
  kurs: { title: 'Vertikales Wissen', pill: '2-Stunden-Kurs', lines: ['Wie dein Wissen', 'oben und unten wächst'], button: 'Schreib mir eine DM' },
  follow: { title: 'Teil 2 folgt', pill: 'hierarchologie', lines: ['Folg mir, dann', 'verpasst du ihn nicht'], button: 'Folgen' },
};

export function drawEndCard(ctx, spec, t, tIn) {
  if (t < tIn) return; const u = clamp((t - tIn) / 0.55); const sc = easeOutBack(u, 1.6); const a = smooth(tIn, tIn + 0.25, t);
  const w = 900, h = 640, cx = W / 2, cy = 1160 + Math.sin(t * 1.2) * 4;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(sc, sc);
  fillShape(ctx, () => rrect(ctx, -w / 2, -h / 2, w, h, 56), C.paper, { depth: 1.5 });
  let px = 92; while (px > 60 && measure(ctx, spec.title, px) > w - 80) px -= 4;
  richText(ctx, spec.title, 0, -h / 2 + 105, px, C.ink);
  const pw = measure(ctx, spec.pill, 42) + 60; fillShape(ctx, () => rrect(ctx, -pw / 2, -h / 2 + 170, pw, 64, 32), C.pill, { depth: 0.4 }); richText(ctx, spec.pill, 0, -h / 2 + 204, 42, C.ink);
  spec.lines.forEach((l, i) => richText(ctx, l, 0, -h / 2 + 300 + i * 58, 46, C.plum));
  let bpx = 48; const bwText = () => measure(ctx, spec.button, bpx); while (bpx > 34 && bwText() > w - 230) bpx -= 2;
  const bw = bwText() + 150, bh = 104, by = h / 2 - 150; const pulse = 1 + 0.025 * Math.sin((t - tIn) * 4);
  ctx.save(); ctx.translate(0, by + bh / 2); ctx.scale(pulse, pulse); fillShape(ctx, () => rrect(ctx, -bw / 2, -bh / 2, bw, bh, 52), C.rose, { depth: 0.9 });
  drawIcon(ctx, { kind: 'plane', x: -bw / 2 + 62, y: 2, size: 58 }, t); richText(ctx, spec.button, 26, 4, bpx, C.paper); ctx.restore();
  ctx.restore();
}
