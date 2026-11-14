// Core constants, palette, easing and drawing helpers for the Hierarchologie paper-cut style.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HERE, '..', '..', 'assets', 'fonts');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'PatrickHand-latin.ttf'), 'Patrick Hand');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'PatrickHand-latin-ext.ttf'), 'Patrick Hand Ext');

export const W = 1080, H = 1920, FPS = 30;
export const GROUND = Math.round(H * 0.77); // figures stand here
export const FONT = '"Patrick Hand", "Patrick Hand Ext"';

// Brand palette (Stilguide "Brand Style: Hierarchologie-Videos")
export const C = {
  ink: '#4A3552', rose: '#C14E78', plum: '#7A4F8A', gold: '#F7C948', ochre: '#B8860B',
  sage: '#3F8F5F', paper: '#FFFFFF', sun: '#FDE7A6',
  hill1: '#CDEBDB', hill2: '#A9DCC3', hill3: '#86C9AA',
  water1: '#9FD3E8', water2: '#8CC6E0',
  skin: '#F2C4A4', cheek: '#F27C9B',
  wood: '#D9B48F', woodLeg: '#C9A27E', woodDark: '#B8926E',
  uni1: '#3B2A4C', uni2: '#7A5A8E',
  skyTop: '#F7CFCF', skyBottom: '#FCEBDA',
  // drawer tones by meaning
  people: '#E9DDF4', baby: '#E0ECF8', kids: '#FDE2EA', fresh: '#E5F4E4', idea: '#FFF4D6',
  food: '#F9EEDA', ice: '#DCEAF7',
  // shirts
  shirtMama: '#BFD9F2', shirtPapa: '#C9EBC7', shirtPapa2: '#FBE3A0', shirtGirl: '#F49AAE',
  shirtBoy: '#9FD3C7', shirtOma: '#D9C6F0', pants: '#5B6E9C', pill: '#FBE3A0',
};
// Named colour lookup so storyboards can say "people" instead of a hex code.
export function col(v, fallback = C.paper) {
  if (!v) return fallback;
  if (v.startsWith('#') || v.startsWith('rgb')) return v;
  return C[v] || fallback;
}

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOutCubic = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutBack = (t, s = 1.7) => { t = clamp(t); const c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

// Deterministic randomness so every frame of a video is reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function makeCanvas(w = W, h = H) { const c = createCanvas(w, h); return [c, c.getContext('2d')]; }

// Paper shadow: soft, warm, slightly below the shape.
export function shadow(ctx, on = true, depth = 1) {
  if (!on) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowOffsetX = 0; return; }
  ctx.shadowColor = 'rgba(74,53,82,0.22)'; ctx.shadowBlur = 16 * depth; ctx.shadowOffsetY = 7 * depth; ctx.shadowOffsetX = 0;
}

export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

export function fillShape(ctx, drawPath, color, { sh = true, depth = 1, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; shadow(ctx, sh, depth); ctx.fillStyle = color; drawPath(); ctx.fill(); ctx.restore();
}

export function font(px) { return `${px}px ${FONT}`; }

// Rich text: *word* = rosé, _word_ = plum, ~word~ = sage, ^word^ = ochre.
export function parseRich(text) {
  const out = []; const re = /(\*[^*]+\*|_[^_]+_|~[^~]+~|\^[^^]+\^)/g; let last = 0, m;
  const s = String(text);
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), c: null });
    const mk = m[0][0], inner = m[0].slice(1, -1);
    out.push({ t: inner, c: mk === '*' ? C.rose : mk === '_' ? C.plum : mk === '~' ? C.sage : C.ochre });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), c: null });
  return out;
}
export const plain = text => parseRich(text).map(p => p.t).join('');

// Patrick Hand has no "≈": we draw it ourselves as two small waves.
const APPROX = '\u2248';
function runWidth(ctx, s, px) { let w = 0; const bits = s.split(APPROX); bits.forEach((b, i) => { w += ctx.measureText(b).width; if (i < bits.length - 1) w += px * 0.62; }); return w; }
function fillRun(ctx, s, x, y, px) {
  const bits = s.split(APPROX); let cx = x;
  bits.forEach((b, i) => { ctx.fillText(b, cx, y); cx += ctx.measureText(b).width;
    if (i < bits.length - 1) { ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = px * 0.07; ctx.lineCap = 'round';
      for (const dy of [-px * 0.1, px * 0.1]) { ctx.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; const xx = cx + px * 0.08 + u * px * 0.46; const yy = y + dy + Math.sin(u * Math.PI * 2) * px * -0.06; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.restore(); cx += px * 0.62; } });
  return cx - x;
}
export function measure(ctx, text, px) { ctx.save(); ctx.font = font(px); const w = runWidth(ctx, plain(text), px); ctx.restore(); return w; }

// Draw rich text centred at (x, y) on the baseline-middle.
export function richText(ctx, text, x, y, px, color = C.ink, align = 'center') {
  ctx.save(); ctx.font = font(px); ctx.textBaseline = 'middle';
  const parts = parseRich(text); const total = runWidth(ctx, parts.map(p => p.t).join(''), px);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  for (const p of parts) { ctx.fillStyle = p.c || color; cx += fillRun(ctx, p.t, cx, y, px); }
  ctx.restore(); return total;
}

// Greedy word wrap that keeps rich markers intact.
export function wrap(ctx, text, px, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (measure(ctx, t, px) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

// Pop-in scale (overshoot) and fade helpers driven by element in/out times.
export function lifeAlpha(t, tin, tout, fin = 0.25, fout = 0.3) {
  if (t < tin || t > tout + fout) return 0; const a = smooth(tin, tin + fin, t); const b = 1 - smooth(tout, tout + fout, t); return Math.min(a, b);
}
export function popScale(t, tin, dur = 0.45) { if (t < tin) return 0; return easeOutBack((t - tin) / dur, 2.2); }
export function hop(t, tin, dur = 0.5) { if (t < tin || t > tin + dur) return 0; const x = (t - tin) / dur; return Math.sin(x * Math.PI) * (1 - x) * 26; }

export function wobble(t, seed, amp = 1) { const r = rng(seed); const p1 = r() * 6.28, p2 = r() * 6.28; return { dx: Math.sin(t * 1.3 + p1) * 1.6 * amp, dy: Math.sin(t * 1.7 + p2) * 1.6 * amp, rot: Math.sin(t * 0.9 + p1) * 0.006 * amp }; }

export function star5(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1; const a = rot + i * Math.PI / n; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath();
}
