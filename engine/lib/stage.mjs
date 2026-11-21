// The stage: the same pastel landscape in every video, plus simple paper props.
import { W, H, GROUND, C, col, makeCanvas, shadow, rrect, fillShape, rng, richText, font, wrap, star5 } from './core.mjs';
import { drawBottle, drawCashew, drawSalt } from './elements.mjs';

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

// Three soft white steam threads rising above `top` (pot, casserole).
function steam(ctx, x, top, w, t = 0) {
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
}

// Potato salad: a low mound of pale-yellow potato slices with chive bits, sitting on `base` (bowl rim or plate), w wide.
function potatoSalad(ctx, x, base, w) {
  const hh = w * 0.24;
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, base, w / 2, hh, 0, Math.PI, 0); ctx.closePath(); }, '#F1D88A', { depth: 0.4 });
  const slices = [[-0.32, 0.12, -0.4], [0.31, 0.14, 0.45], [-0.15, 0.3, 0.25], [0.12, 0.34, -0.2], [-0.02, 0.62, 0.1], [0.2, 0.06, 0.1], [-0.2, 0.05, -0.1], [0.02, 0.16, 0.6]];
  for (const [ox, oy, rot] of slices) {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x + ox * w, base - oy * hh, w * 0.12, w * 0.075, rot, 0, Math.PI * 2); }, '#FBEDB8', { depth: 0.25 });
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x + ox * w - w * 0.03, base - oy * hh - w * 0.02, w * 0.05, w * 0.025, rot, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.fillStyle = '#6FB37E';
  for (const [ox, oy, rot] of [[-0.26, 0.28, 0.5], [-0.06, 0.42, -0.7], [0.16, 0.22, 0.2], [0.33, 0.3, -0.4], [0.05, 0.68, 0.9], [-0.36, 0.04, -0.2], [0.24, 0.5, 1.2]]) {
    ctx.save(); ctx.translate(x + ox * w, base - oy * hh); ctx.rotate(rot); rrect(ctx, -w * 0.022, -w * 0.008, w * 0.044, w * 0.016, w * 0.008); ctx.fill(); ctx.restore();
  }
  ctx.restore();
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
  // Plate on y (a table top). "food": true puts a rice mound and a curry/stew mound on it ("foodColor" for the stew),
  // "nuts": true scatters three cashews over the stew. "potatoes": true heaps potato salad on it instead.
  plate(ctx, x, y, w = 160, h, p = {}) {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - 10, w / 2, 16, 0, 0, 7); }, C.paper);
    if (p.potatoes) { potatoSalad(ctx, x, y - 14, w * 0.66); return; }
    if (!p.food) return;
    const base = y - 16;
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x - w * 0.15, base, w * 0.22, w * 0.15, 0, Math.PI, 0); ctx.closePath(); }, '#FFF8EC', { depth: 0.4 });
    ctx.save(); ctx.fillStyle = 'rgba(184,146,110,0.25)';
    for (const [ox, oy] of [[-0.24, -0.05], [-0.12, -0.1], [-0.06, -0.03], [-0.2, -0.11]]) { ctx.beginPath(); ctx.ellipse(x + ox * w, base + oy * w, w * 0.018, w * 0.008, 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const cc = p.foodColor ? col(p.foodColor) : '#F2A65A';
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x + w * 0.12, base + 2, w * 0.26, w * 0.11, 0, Math.PI, 0); ctx.closePath(); }, cc, { depth: 0.4 });
    ctx.save(); ctx.fillStyle = '#E0823A';
    for (const [ox, oy] of [[0.02, -0.04], [0.16, -0.07], [0.27, -0.03]]) { ctx.beginPath(); rrect(ctx, x + ox * w, base + oy * w, w * 0.06, w * 0.05, 3); ctx.fill(); }
    ctx.fillStyle = '#7FBF8B'; for (const [ox, oy] of [[0.1, -0.02], [0.22, -0.08]]) { ctx.beginPath(); ctx.arc(x + ox * w, base + oy * w, w * 0.014, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (p.nuts) for (const [ox, oy, rot] of [[0.04, -0.1, 0.4], [0.17, -0.12, -0.6], [0.28, -0.07, 1.2]]) drawCashew(ctx, x + ox * w, base + oy * w, w * 0.13, rot);
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
    steam(ctx, x, top, w, t);
  },
  // Fridge standing on the ground: pale door with freezer split and handles; "open": true shows the lit inside with shelves and
  // a few jars, the door swung to "doorSide" (left by default).
  fridge(ctx, x, y, w = 280, h = 560, p) {
    const c1 = p.color ? col(p.color) : '#E6EEF5', handle = '#B9C3CF';
    const top = y - h, split = top + h * 0.32;
    for (const fx of [x - w / 2 + 34, x + w / 2 - 58]) fillShape(ctx, () => rrect(ctx, fx, y - 18, 24, 18, 6), C.woodLeg, { depth: 0.3 });
    if (!p.open) {
      fillShape(ctx, () => rrect(ctx, x - w / 2, top, w, h - 14, 30), c1);
      ctx.fillStyle = 'rgba(74,53,82,0.12)'; ctx.fillRect(x - w / 2 + 8, split, w - 16, 6);
      fillShape(ctx, () => rrect(ctx, x + w / 2 - 40, top + h * 0.1, 14, h * 0.14, 7), handle, { depth: 0.3 });
      fillShape(ctx, () => rrect(ctx, x + w / 2 - 40, split + h * 0.07, 14, h * 0.2, 7), handle, { depth: 0.3 });
      return;
    }
    const side = p.doorSide === 'right' ? 1 : -1, dw = w * 0.2;
    fillShape(ctx, () => rrect(ctx, x - w / 2, top, w, h - 14, 30), c1);
    const ix = x - w / 2 + 18, iw = w - 36, iy = top + 18, ih = h - 50;
    fillShape(ctx, () => rrect(ctx, ix, iy, iw, ih, 18), '#FBFDFF', { sh: false });
    const glow = ctx.createRadialGradient(x, iy + ih * 0.25, 10, x, iy + ih * 0.25, iw);
    glow.addColorStop(0, 'rgba(253,231,166,0.45)'); glow.addColorStop(1, 'rgba(253,231,166,0)');
    ctx.save(); rrect(ctx, ix, iy, iw, ih, 18); ctx.clip(); ctx.fillStyle = glow; ctx.fillRect(ix, iy, iw, ih); ctx.restore();
    const shelves = [split - top, h * 0.56, h * 0.78].map(v => top + v);
    ctx.fillStyle = '#D6E2EC'; for (const sy of shelves) ctx.fillRect(ix + 4, sy, iw - 8, 8);
    const r = rng(11); const jars = ['#F9C6D3', '#BFD9F2', '#FBE3A0', '#B5DFC9', '#E9DDF4'];
    const items = p.items ?? [[0, 0.22], [1, 0.7], [2, 0.3], [2, 0.62]];
    for (const [shelf, fx] of items) {
      const sy = shelves[shelf], jw = iw * (0.18 + r() * 0.06), jh = h * (0.09 + r() * 0.04), jx = ix + iw * fx;
      fillShape(ctx, () => rrect(ctx, jx - jw / 2, sy - jh, jw, jh, 8), jars[Math.floor(r() * jars.length)], { depth: 0.3 });
      fillShape(ctx, () => rrect(ctx, jx - jw * 0.4, sy - jh - 10, jw * 0.8, 12, 4), C.paper, { depth: 0.2 });
    }
    const dx = side < 0 ? x - w / 2 - dw + 6 : x + w / 2 - 6;
    fillShape(ctx, () => { ctx.beginPath(); ctx.roundRect(dx, top - 10, dw, h - 2, 18); }, c1, { depth: 0.8 });
    fillShape(ctx, () => rrect(ctx, dx + dw / 2 - 7, top + h * 0.12, 14, h * 0.14, 7), handle, { depth: 0.3 });
  },
  // Salad bowl standing on y (a table top): pastel half-round bowl with rim and green leaves ("leaves": false = empty).
  // "soup": a colour fills it with soup instead (flat surface with carrot cubes and leek rings); "steam": true lets it steam.
  // "potatoes": true fills it with potato salad (pale slices with chives).
  bowl(ctx, x, y, w = 240, h = 100, p, t = 0) {
    const c1 = p.color ? col(p.color) : '#BFD9F2', rimY = y - h;
    if (p.potatoes) potatoSalad(ctx, x, rimY + 4, w * 0.9);
    else if (p.leaves !== false && !p.soup) {
      const leaves = [[-0.3, 0.1, 0.17, '#9ED69B'], [0.05, 0.22, 0.2, '#7FBF8B'], [0.3, 0.08, 0.16, '#B5DFA6'], [-0.08, 0.05, 0.15, '#B5DFA6'], [0.18, 0.28, 0.12, '#9ED69B']];
      for (const [ox, oy, rr, lc] of leaves) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x + ox * w, rimY - oy * h, rr * w, rr * w * 0.72, ox, 0, Math.PI * 2); }, lc, { depth: 0.4 });
      if (p.tomato !== false) fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x - w * 0.12, rimY - h * 0.22, w * 0.06, 0, Math.PI * 2); }, '#F49AAE', { depth: 0.3 });
    }
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, rimY, w / 2, h, 0, 0, Math.PI); ctx.closePath(); }, c1);
    fillShape(ctx, () => rrect(ctx, x - w / 2 - 8, rimY - 10, w + 16, 22, 11), c1, { depth: 0.5 });
    fillShape(ctx, () => rrect(ctx, x - w * 0.3, rimY + h * 0.32, w * 0.6, 12, 6), 'rgba(255,255,255,0.45)', { sh: false });
    if (p.soup) {
      // soup filled to the brim: a low dome above the rim with carrot cubes and leek rings
      const sy = rimY - 6, rx = w / 2 - 6, ry = Math.max(12, h * 0.22);
      fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, sy, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); }, col(p.soup), { depth: 0.3 });
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, sy, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, sy - ry * 0.55, rx * 0.4, ry * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2A65A'; for (const [ox, oy] of [[-0.26, 0.35], [0.04, 0.55], [0.3, 0.3]]) { rrect(ctx, x + ox * w - w * 0.028, sy - oy * ry - w * 0.022, w * 0.056, w * 0.044, 3); ctx.fill(); }
      ctx.strokeStyle = '#7FBF8B'; ctx.lineWidth = Math.max(3, w * 0.016);
      for (const [ox, oy] of [[-0.1, 0.3], [0.17, 0.5]]) { ctx.beginPath(); ctx.ellipse(x + ox * w, sy - oy * ry, w * 0.034, w * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      if (p.steam) steam(ctx, x, sy - ry, w, t);
    }
  },
  // Salt shaker standing on y (a table top): pale glass with white salt, silver dome cap with holes. "pour": true turns it
  // upside down over the point x/y with a little shake and lets grains fall (y is then the cap tip; grains fall below).
  salt(ctx, x, y, w = 70, h = 120, p = {}, t = 0) { drawSalt(ctx, x, y, w, h, p.pour, t, p.color ? col(p.color) : null); },
  // Baking dish (Auflaufform) standing on y (a table top): pale glass dish with two handles. "layers": colours from the
  // bottom up, shown as wavy stripes through the glass; "slots": how many layers the dish holds (default: number of layers,
  // at least 3), so dishes with fewer layers can cross-fade into fuller ones; "crumbs": true scatters feta cubes on top;
  // "steam": true lets steam rise like the pot.
  casserole(ctx, x, y, w = 260, h = 110, p = {}, t = 0) {
    const c1 = p.color ? col(p.color) : '#DCEAF7', top = y - h;
    for (const sx of [-1, 1]) fillShape(ctx, () => rrect(ctx, x + sx * (w / 2 + 4) - 22, top + h * 0.18, 44, 22, 11), c1, { depth: 0.4 });
    fillShape(ctx, () => { ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, h, [14, 14, h * 0.32, h * 0.32]); }, c1);
    const ix = x - w / 2 + 12, iw = w - 24, iy = top + 12, ih = h - 22;
    ctx.save(); ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, [8, 8, h * 0.26, h * 0.26]); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ix, iy, iw, ih);
    const L = p.layers || []; const n = Math.max(p.slots ?? L.length, 3, L.length); const lh = ih / n;
    const topY = iy + ih - L.length * lh;
    // top layer first: each lower layer is drawn over the bottom part of the ones above it
    [...L].map((lc, i) => [lc, i]).reverse().forEach(([lc, i]) => {
      const ly = iy + ih - (i + 1) * lh;
      fillShape(ctx, () => {
        ctx.beginPath(); ctx.moveTo(ix - 2, iy + ih + 2);
        for (let k = 0; k <= 16; k++) { const xx = ix + (k / 16) * iw; ctx.lineTo(xx, ly + Math.sin(k * 1.3 + i * 2.1) * lh * 0.12); }
        ctx.lineTo(ix + iw + 2, iy + ih + 2); ctx.closePath();
      }, col(lc), { depth: 0.2 });
    });
    if (p.crumbs && L.length) {
      const r = rng(5); ctx.fillStyle = '#FFFDF6';
      for (let k = 0; k < 9; k++) { const cx = ix + iw * (0.08 + 0.84 * r()), cy = topY + lh * (0.15 + 0.45 * r()), s = Math.max(5, w * 0.03);
        fillShape(ctx, () => rrect(ctx, cx - s / 2, cy - s / 2, s, s, 2), '#FFFDF6', { depth: 0.2 }); }
    }
    ctx.restore();
    // glass shine and rim
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; rrect(ctx, x - w / 2 + 18, top + h * 0.2, 10, h * 0.5, 5); ctx.fill(); ctx.restore();
    fillShape(ctx, () => rrect(ctx, x - w / 2 - 6, top - 8, w + 12, 18, 9), c1, { depth: 0.4 });
    if (p.steam) steam(ctx, x, top - 10, w, t);
  },
  // A child's drawing with its centre at x/y: white sheet, slightly tilted ("rot", default -0.03), crayon sky on the top
  // part ("sky": colour, false = none) and crayon grass at the bottom ("grass": colour). Draw on it with icons or props.
  paper(ctx, x, y, w = 460, h = 340, p = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot ?? -0.03);
    fillShape(ctx, () => rrect(ctx, -w / 2, -h / 2, w, h, 14), C.paper, { depth: 0.9 });
    const band = (y0, y1, c) => {
      ctx.save(); rrect(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 8); ctx.clip();
      ctx.strokeStyle = c; ctx.lineWidth = 11; ctx.lineCap = 'round';
      for (let yy = y0; yy <= y1; yy += 12) {
        ctx.beginPath(); for (let xx = -w / 2 + 20; xx <= w / 2 - 20; xx += 22) { const wy = yy + Math.sin(xx * 0.05 + yy * 0.7) * 3; if (xx === -w / 2 + 20) ctx.moveTo(xx, wy); else ctx.lineTo(xx, wy); } ctx.stroke();
      }
      ctx.restore();
    };
    if (p.sky !== false) band(-h / 2 + 22, -h / 2 + h * 0.4, p.sky ? col(p.sky) : 'rgba(159,211,232,0.5)');
    band(h / 2 - h * 0.2, h / 2 - 22, p.grass ? col(p.grass) : 'rgba(127,191,139,0.7)');
    ctx.restore();
  },
  // Bottle standing on y (a table top or shelf): pale glass, cork and a white label with "text".
  bottle(ctx, x, y, w = 90, h = 230, p) { drawBottle(ctx, x, y, w, h, p.color ? col(p.color) : null, p.text, p.size); },
  // A bathroom sink standing on y (the floor): white basin on a pedestal, its rim at y - h, a silver tap behind it and,
  // with "mirror": true, a mirror on the wall above (mirror height "mirrorH", default 260).
  sink(ctx, x, y, w = 300, h = 250, p = {}) {
    const top = y - h, bh = Math.min(90, h * 0.36), pw = w * 0.3;
    if (p.mirror) {
      const mw = w * 0.82, mh = p.mirrorH ?? 260, my = top - 70 - mh;
      fillShape(ctx, () => rrect(ctx, x - mw / 2 - 14, my - 14, mw + 28, mh + 28, 26), C.paper, { depth: 0.7 });
      fillShape(ctx, () => rrect(ctx, x - mw / 2, my, mw, mh, 18), '#DCEFF8', { sh: false });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - mw * 0.28, my + mh * 0.22); ctx.lineTo(x - mw * 0.08, my + mh * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - mw * 0.3, my + mh * 0.42); ctx.lineTo(x + mw * 0.02, my + mh * 0.18); ctx.stroke(); ctx.restore();
    }
    // tap: post and spout behind the basin
    fillShape(ctx, () => rrect(ctx, x - 13, top - 64, 26, 78, 10), '#C3CAD4', { depth: 0.5 });
    fillShape(ctx, () => rrect(ctx, x - 13, top - 64, 66, 22, 11), '#D3D9E1', { depth: 0.5 });
    fillShape(ctx, () => rrect(ctx, x - 34, top - 78, 42, 16, 8), '#D3D9E1', { depth: 0.4 });
    // pedestal and basin
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - pw / 2, top + bh - 6); ctx.lineTo(x + pw / 2, top + bh - 6);
      ctx.lineTo(x + pw * 0.62, y); ctx.lineTo(x - pw * 0.62, y); ctx.closePath(); }, '#F1F5F9', { depth: 0.6 });
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top);
      ctx.quadraticCurveTo(x + w / 2, top + bh, x, top + bh); ctx.quadraticCurveTo(x - w / 2, top + bh, x - w / 2, top); ctx.closePath(); }, C.paper, { depth: 0.8 });
    fillShape(ctx, () => rrect(ctx, x - w / 2 - 8, top - 12, w + 16, 22, 11), C.paper, { depth: 0.5 });
    ctx.save(); ctx.fillStyle = 'rgba(159,211,232,0.35)'; rrect(ctx, x - w / 2 + 14, top - 4, w - 28, 8, 4); ctx.fill(); ctx.restore();
  },
  // A pile of sofa cushions on the ground (three, two, one); its top is at y - h, so a figure can stand on it with "y".
  cushions(ctx, x, y, w = 420, h = 250, p) {
    const cols = p.colors || ['#F9C6D3', '#C9A3D9', '#BFD9F2', '#FBE3A0', '#B5DFC9', '#F8D5C8'];
    const ch = h / 3, rows = [[-1, 0, 1], [-0.5, 0.5], [0]]; let i = 0;
    rows.forEach((row, ri) => row.forEach(k => {
      const cw = w * 0.36, cx = x + k * w * 0.32, cy = y - ch * (ri + 1); const rot = ((i * 37) % 7 - 3) * 0.02;
      ctx.save(); ctx.translate(cx, cy + ch / 2); ctx.rotate(rot);
      fillShape(ctx, () => rrect(ctx, -cw / 2, -ch / 2, cw, ch + 4, ch * 0.42), cols[i % cols.length], { depth: 0.6 });
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0, 2, Math.max(3, ch * 0.07), 0, Math.PI * 2); ctx.fill();
      ctx.restore(); i++;
    }));
  },
};
export const PROP_KINDS = Object.keys(PROPS);
