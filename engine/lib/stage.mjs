// The stage: the same pastel landscape in every video, plus simple paper props.
import { W, H, GROUND, C, col, makeCanvas, shadow, rrect, fillShape, rng, richText, font, wrap, star5 } from './core.mjs';

let BG = null;
export function landscape() {
  if (BG) return BG;
  const [cv, ctx] = makeCanvas();
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun top right with a soft halo
  const sx = 880, sy = 470;
  const halo = ctx.createRadialGradient(sx, sy, 60, sx, sy, 260);
  halo.addColorStop(0, 'rgba(253,231,166,0.55)'); halo.addColorStop(1, 'rgba(253,231,166,0)');
  ctx.fillStyle = halo; ctx.fillRect(sx - 280, sy - 280, 560, 560);
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(sx, sy, 92, 0, Math.PI * 2); }, C.sun, { depth: 0.6 });
  // three rows of mint hills
  const hills = [
    { c: C.hill1, base: GROUND - 250, amp: 70, f: 0.0042, ph: 0.6 },
    { c: C.hill2, base: GROUND - 120, amp: 55, f: 0.0058, ph: 2.1 },
    { c: C.hill3, base: GROUND + 10, amp: 34, f: 0.0071, ph: 4.0 },
  ];
  for (const hl of hills) {
    fillShape(ctx, () => {
      ctx.beginPath(); ctx.moveTo(-20, H);
      for (let x = -20; x <= W + 20; x += 12) ctx.lineTo(x, hl.base - Math.sin(x * hl.f + hl.ph) * hl.amp - Math.sin(x * hl.f * 2.3 + hl.ph) * hl.amp * 0.25);
      ctx.lineTo(W + 20, H); ctx.closePath();
    }, hl.c, { depth: 1.1 });
  }
  // flat ground strip where everybody stands
  fillShape(ctx, () => { rrect(ctx, -40, GROUND - 6, W + 80, 200, 40); }, '#93D0B3', { depth: 0.8 });
  // flower strip
  const r = rng(7);
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = GROUND + 40 + r() * 90; const cc = [C.paper, '#F9C6D3', C.sun, '#E9DDF4'][i % 4];
    ctx.save(); shadow(ctx, true, 0.3); ctx.fillStyle = cc;
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, 7); ctx.fill(); }
    ctx.restore(); ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
  }
  // lake in the foreground
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(W / 2, H + 40, W * 0.78, 250, 0, 0, Math.PI * 2); }, C.water1, { depth: 1.2 });
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(W / 2, H + 80, W * 0.6, 190, 0, 0, Math.PI * 2); }, C.water2, { sh: false });
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [x, y, w] of [[300, 1770, 90], [640, 1745, 120], [520, 1840, 70], [820, 1815, 80]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  BG = cv; return BG;
}

export function clouds(ctx, t) {
  const cl = [{ y: 610, s: 1.0, sp: 9, off: 120 }, { y: 760, s: 0.75, sp: 6, off: 700 }];
  for (const c of cl) {
    const x = ((c.off + t * c.sp) % (W + 400)) - 200;
    fillShape(ctx, () => {
      ctx.beginPath(); const s = c.s;
      for (const [ox, oy, rx, ry] of [[0, 0, 90, 40], [60, -22, 60, 44], [-60, -8, 50, 32]]) { ctx.moveTo(x + (ox + rx) * s, c.y + oy * s); ctx.ellipse(x + ox * s, c.y + oy * s, rx * s, ry * s, 0, 0, Math.PI * 2); }
    }, 'rgba(255,255,255,0.92)', { depth: 0.5 });
  }
}

// ---------- props ----------
// Each prop draws around (x, y) where y is usually its base on the ground.
export function drawProp(ctx, p, t) {
  const k = p.kind; const x = p.x, y = p.y ?? GROUND; const w = p.w, h = p.h;
  const fn = PROPS[k]; if (!fn) throw new Error(`Unbekannte Requisite: ${k}`);
  fn(ctx, x, y, w, h, p, t);
}

function textLines(ctx, lines, cx, cy, px, color, gap = 1.25) {
  const L = Array.isArray(lines) ? lines : [lines]; const total = (L.length - 1) * px * gap;
  L.forEach((ln, i) => richText(ctx, ln, cx, cy - total / 2 + i * px * gap, px, color));
}

const PROPS = {
  table(ctx, x, y, w = 520, h = 190, p) {
    const top = y - h;
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 30, top + 20, 26, h - 20, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x + w / 2 - 56, top + 20, 26, h - 20, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, top, w, 34, 14); }, p.color ? col(p.color) : C.wood);
  },
  chair(ctx, x, y, w = 150, h = 230) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, 26, h, 10); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h * 0.48, w, 26, 10); }, C.wood);
    fillShape(ctx, () => { rrect(ctx, x + w / 2 - 22, y - h * 0.48, 22, h * 0.48, 8); }, C.woodLeg);
  },
  desk(ctx, x, y, w = 420, h = 170, p) { PROPS.table(ctx, x, y, w, h, p); },
  blackboard(ctx, x, y, w = 560, h = 360, p) {
    // y is the board centre for wall items
    fillShape(ctx, () => { rrect(ctx, x - w / 2 - 18, y - h / 2 - 18, w + 36, h + 36, 22); }, C.wood);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 14); }, '#5E8C7A', { sh: false });
    if (p.text) textLines(ctx, p.text, x, y, p.size || 62, 'rgba(255,255,255,0.92)');
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 40, y + h / 2 + 4, 90, 14, 6); }, '#FFFFFF', { depth: 0.3 });
  },
  notebook(ctx, x, y, w = 360, h = 260, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 16); }, C.paper);
    ctx.save(); ctx.strokeStyle = 'rgba(122,79,138,0.18)'; ctx.lineWidth = 2;
    for (let gx = x - w / 2 + 24; gx < x + w / 2; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, y - h / 2 + 10); ctx.lineTo(gx, y + h / 2 - 10); ctx.stroke(); }
    for (let gy = y - h / 2 + 24; gy < y + h / 2; gy += 24) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, gy); ctx.lineTo(x + w / 2 - 10, gy); ctx.stroke(); }
    ctx.restore();
    if (p.text) textLines(ctx, p.text, x, y, p.size || 56, C.ink);
  },
  phone(ctx, x, y, w = 200, h = 360, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 30); }, C.ink);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 12, y - h / 2 + 22, w - 24, h - 44, 18); }, p.screen ? col(p.screen) : C.baby, { sh: false });
    if (p.text) textLines(ctx, p.text, x, y, p.size || 34, C.ink);
  },
  book(ctx, x, y, w = 220, h = 160, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 12); }, p.color ? col(p.color) : C.rose);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 8); }, 'rgba(255,255,255,0.85)', { sh: false });
    if (p.text) textLines(ctx, p.text, x, y, p.size || 34, C.ink);
  },
  cup(ctx, x, y, w = 70, h = 80, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h, 14); }, p.color ? col(p.color) : C.paper);
    ctx.save(); ctx.strokeStyle = p.color ? col(p.color) : C.paper; ctx.lineWidth = 10; shadow(ctx, true, 0.4); ctx.beginPath(); ctx.arc(x + w / 2 + 6, y - h / 2, 18, -1.3, 1.3); ctx.stroke(); ctx.restore();
  },
  plate(ctx, x, y, w = 160) {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - 10, w / 2, 16, 0, 0, 7); }, C.paper);
  },
  clock(ctx, x, y, w = 130, h, p, t) {
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, w / 2, 0, 7); }, C.paper);
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - w * 0.3); ctx.stroke();
    const a = (t || 0) * 0.6; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * w * 0.38, y - Math.cos(a) * w * 0.38); ctx.stroke(); ctx.restore();
  },
  sofa(ctx, x, y, w = 520, h = 240, p) {
    const c1 = p.color ? col(p.color) : '#E9C9D9';
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h * 0.62, 40); }, c1);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 - 20, y - h * 0.6, w + 40, h * 0.5, 34); }, c1);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 10, y - 30, 28, 30, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x + w / 2 - 38, y - 30, 28, 30, 8); }, C.woodLeg);
  },
  tree(ctx, x, y, w = 300, h = 520) {
    fillShape(ctx, () => { rrect(ctx, x - 26, y - h * 0.55, 52, h * 0.55, 16); }, C.woodDark);
    fillShape(ctx, () => { ctx.beginPath(); for (const [ox, oy, r] of [[0, 0.68, 0.42], [-0.3, 0.55, 0.3], [0.3, 0.57, 0.32]]) { ctx.moveTo(x + ox * w + r * w, y - h * oy); ctx.arc(x + ox * w, y - h * oy, r * w, 0, Math.PI * 2); } }, '#7FBF9B');
  },
  bench(ctx, x, y, w = 420, h = 150) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 30, y - h * 0.6, 24, h * 0.6, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x + w / 2 - 54, y - h * 0.6, 24, h * 0.6, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h * 0.62, w, 28, 10); }, C.wood);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, 26, 10); }, C.wood);
  },
  door(ctx, x, y, w = 230, h = 460) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h, 16); }, C.wood);
    ctx.fillStyle = C.ochre; ctx.beginPath(); ctx.arc(x + w / 2 - 34, y - h / 2, 11, 0, 7); ctx.fill();
  },
  window(ctx, x, y, w = 280, h = 240) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2 - 14, y - h / 2 - 14, w + 28, h + 28, 18); }, C.paper);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 10); }, '#CFE8F5', { sh: false });
    ctx.fillStyle = C.paper; ctx.fillRect(x - 6, y - h / 2, 12, h); ctx.fillRect(x - w / 2, y - 6, w, 12);
  },
  bed(ctx, x, y, w = 520, h = 210) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, 40, h, 14); }, C.wood);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h * 0.5, w, h * 0.38, 18); }, C.paper);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 120, y - h * 0.56, w - 120, h * 0.3, 18); }, C.baby);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 50, y - h * 0.66, 120, 60, 24); }, C.paper);
  },
  car(ctx, x, y, w = 520, h = 230, p) {
    const c1 = p.color ? col(p.color) : '#F49AAE';
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h * 0.62, w, h * 0.42, 40); }, c1);
    fillShape(ctx, () => { rrect(ctx, x - w * 0.3, y - h, w * 0.58, h * 0.48, 50); }, c1);
    fillShape(ctx, () => { rrect(ctx, x - w * 0.24, y - h * 0.92, w * 0.46, h * 0.3, 30); }, '#CFE8F5', { sh: false });
    for (const wx of [x - w * 0.3, x + w * 0.3]) { fillShape(ctx, () => { ctx.beginPath(); ctx.arc(wx, y - 34, 40, 0, 7); }, C.ink); ctx.fillStyle = '#D8D0DC'; ctx.beginPath(); ctx.arc(wx, y - 34, 16, 0, 7); ctx.fill(); }
  },
  laptop(ctx, x, y, w = 300, h = 200, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h - 20, 14); }, '#D8D0DC');
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 14, y - h + 14, w - 28, h - 48, 8); }, p.screen ? col(p.screen) : C.baby, { sh: false });
    fillShape(ctx, () => { rrect(ctx, x - w / 2 - 30, y - 22, w + 60, 22, 10); }, '#C9C0CF');
    if (p.text) textLines(ctx, p.text, x, y - h / 2 - 10, p.size || 30, C.ink);
  },
  ball(ctx, x, y, w = 90, h, p) { fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y - w / 2, w / 2, 0, 7); }, p.color ? col(p.color) : C.rose); },
  backpack(ctx, x, y, w = 150, h = 190, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h, 36); }, p.color ? col(p.color) : '#9FD3C7');
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 20, y - h * 0.48, w - 40, h * 0.34, 18); }, 'rgba(255,255,255,0.5)', { sh: false });
  },
  shelf(ctx, x, y, w = 360, h = 420, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h, w, h, 14); }, C.wood);
    const r = rng(3); const cols = [C.rose, C.plum, C.shirtBoy, C.gold, C.shirtMama];
    for (let row = 0; row < 3; row++) { const by = y - h + 30 + row * (h / 3); ctx.fillStyle = C.woodDark; ctx.fillRect(x - w / 2 + 14, by + h / 3 - 40, w - 28, 10);
      let bx = x - w / 2 + 24; while (bx < x + w / 2 - 40) { const bw = 22 + r() * 18, bh = 70 + r() * 30; fillShape(ctx, () => rrect(ctx, bx, by + h / 3 - 40 - bh, bw, bh, 5), cols[Math.floor(r() * 5)], { depth: 0.3 }); bx += bw + 6; } }
  },
  sign(ctx, x, y, w = 360, h = 140, p) {
    fillShape(ctx, () => { rrect(ctx, x - 12, y - h - 160, 24, h + 160, 8); }, C.woodLeg);
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h - 200, w, h, 18); }, C.paper);
    if (p.text) textLines(ctx, p.text, x, y - h / 2 - 200, p.size || 44, C.ink);
  },
  tv(ctx, x, y, w = 420, h = 260, p) {
    fillShape(ctx, () => { rrect(ctx, x - w / 2, y - h / 2, w, h, 20); }, C.ink);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 16, y - h / 2 + 16, w - 32, h - 32, 12); }, p.screen ? col(p.screen) : '#CFE8F5', { sh: false });
    if (p.text) textLines(ctx, p.text, x, y, p.size || 40, C.ink);
  },
  stars(ctx, x, y, w = 60, h, p) { fillShape(ctx, () => star5(ctx, x, y, w / 2, w / 4.4), p.color ? col(p.color) : C.gold, { depth: 0.4 }); },
  // Cooking pot standing on y (e.g. a table top), with two handles and soft rising steam ("steam": false turns it off).
  pot(ctx, x, y, w = 230, h = 150, p, t = 0) {
    const c1 = p.color ? col(p.color) : '#E8A08A';
    const top = y - h;
    for (const sx of [-1, 1]) fillShape(ctx, () => { rrect(ctx, x + sx * (w / 2 + 6) - 24, top + h * 0.22, 48, 24, 12); }, C.ink, { depth: 0.4 });
    fillShape(ctx, () => { ctx.beginPath(); ctx.roundRect(x - w / 2, top + 10, w, h - 10, [10, 10, w * 0.22, w * 0.22]); }, c1);
    fillShape(ctx, () => { rrect(ctx, x - w / 2 - 12, top, w + 24, 26, 13); }, c1, { depth: 0.5 });
    fillShape(ctx, () => { rrect(ctx, x - w / 2 + 22, top + h * 0.42, w - 44, 14, 7); }, 'rgba(255,255,255,0.45)', { sh: false });
    if (p.text) textLines(ctx, p.text, x, top + h * 0.7, p.size || 30, C.ink);
    if (p.steam === false) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 9;
    for (let i = -1; i <= 1; i++) {
      const ph = ((t * 0.45 + (i + 1) * 0.33) % 1 + 1) % 1;
      const x0 = x + i * w * 0.24, y0 = top - 18 - ph * 40, len = 110;
      ctx.strokeStyle = `rgba(255,255,255,${(0.85 * Math.sin(ph * Math.PI)).toFixed(3)})`;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const yy = y0 - (k / 12) * len; const xx = x0 + Math.sin(k / 12 * Math.PI * 2 + t * 2 + i) * 12; if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  },
};
export const PROP_KINDS = Object.keys(PROPS);
