// Round paper figures: big round heads, dot eyes, pink cheeks, pastel shirts.
import { C, GROUND, col, fillShape, rrect, shadow, clamp, hash, rng } from './core.mjs';

const HAIR = { brown: '#7A5236', dark: '#4E3B33', blond: '#E0B865', red: '#C9744A', grey: '#CFC8D3', black: '#3A2E35' };

export const ROLES = {
  mama:  { kid: false, hair: 'bun',      hairColor: 'brown', shirt: C.shirtMama },
  papa:  { kid: false, hair: 'short',    hairColor: 'dark',  shirt: C.shirtPapa },
  woman: { kid: false, hair: 'long',     hairColor: 'blond', shirt: '#F9C6D3' },
  man:   { kid: false, hair: 'short',    hairColor: 'brown', shirt: C.shirtPapa2 },
  oma:   { kid: false, hair: 'bun',      hairColor: 'grey',  shirt: C.shirtOma, glasses: true },
  opa:   { kid: false, hair: 'short',    hairColor: 'grey',  shirt: '#CFE3F2', glasses: true },
  teacher: { kid: false, hair: 'long',   hairColor: 'red',   shirt: '#E5F4E4', glasses: true },
  girl:  { kid: true,  hair: 'ponytail', hairColor: 'brown', shirt: C.shirtGirl },
  boy:   { kid: true,  hair: 'spiky',    hairColor: 'blond', shirt: C.shirtBoy },
  teen:  { kid: false, hair: 'spiky',    hairColor: 'dark',  shirt: '#BFD9F2', scale: 0.9 },
  toddler: { kid: true, hair: 'short',   hairColor: 'blond', shirt: '#FDE2EA', scale: 0.72 },
};

// Geometry of an adult at scale 1 (feet at y = 0).
const G = { headR: 84, bodyW: 156, bodyH: 196, legH: 140, legW: 46, armW: 36, armL: 158 };

export function figureMetrics(f) {
  const role = ROLES[f.role] || ROLES.man; let s = (f.scale ?? 1) * (role.scale ?? 1) * (role.kid ? 0.66 : 1);
  const sit = f.pose === 'sit'; const legH = sit ? G.legH * 0.25 : G.legH;
  const baseY = f.y ?? GROUND;
  const bodyTop = baseY - (legH + G.bodyH) * s;
  const headC = bodyTop - (G.headR * 0.88) * s;
  return { s, baseY, bodyTop, headX: f.x, headY: headC, headR: G.headR * s, sit, legH };
}

export function drawFigure(ctx, f, st) {
  const role = { ...(ROLES[f.role] || ROLES.man) };
  const shirt = f.shirt ? col(f.shirt) : role.shirt;
  const hairColor = HAIR[f.hairColor || role.hairColor] || f.hairColor || HAIR.brown;
  const hair = f.hair || role.hair; const glasses = f.glasses ?? role.glasses;
  const m = figureMetrics(f); const s = m.s; const t = st.t;
  const mood = st.mood || 'smile';
  const seed = hash(f.id || 'fig');
  // idle motion
  let bob = Math.sin(t * 2.2 + seed % 7) * 2.2 * s;
  let dx = 0, tilt = Math.sin(t * 0.9 + (seed % 5)) * 0.02;
  if (mood === 'laugh') bob += Math.abs(Math.sin(t * 9)) * -9 * s;
  if (mood === 'scared') dx += Math.sin(t * 38) * 2.4;
  if (mood === 'sad') tilt += 0.07;
  if (st.hopT > 0) bob -= st.hopT;
  const x = f.x + dx + (st.dx || 0), baseY = m.baseY + (st.dy || 0);

  ctx.save(); ctx.globalAlpha *= st.alpha ?? 1;
  ctx.translate(x, baseY + bob); ctx.scale(st.pop ?? 1, st.pop ?? 1); ctx.translate(-x, -(baseY + bob));
  const Y = y => baseY + bob + y; // helper: y relative to feet
  // legs
  if (!m.sit) {
    for (const sx of [-1, 1]) fillShape(ctx, () => rrect(ctx, x + sx * 34 * s - G.legW * s / 2, Y(-m.legH * s - 10 * s), G.legW * s, (m.legH + 10) * s, 18 * s), f.pants ? col(f.pants) : C.pants, { depth: 0.6 });
    for (const sx of [-1, 1]) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x + sx * 40 * s, Y(-8 * s), 36 * s, 16 * s, 0, 0, 7); }, C.ink, { depth: 0.4 });
  }
  const bodyTop = Y(-(m.legH + G.bodyH) * s);
  // arms behind/around body
  const g = st.gesture; const armAng = armsFor(g, t, f.look);
  const shoulderY = bodyTop + 34 * s;
  for (const side of [-1, 1]) {
    const a = side < 0 ? armAng.l : armAng.r; const sx = x + side * (G.bodyW / 2 - 6) * s;
    ctx.save(); ctx.translate(sx, shoulderY); ctx.rotate(a * side);
    fillShape(ctx, () => rrect(ctx, -G.armW * s / 2, -8 * s, G.armW * s, G.armL * s, 18 * s), shirt, { depth: 0.6 });
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, (G.armL - 6) * s, 21 * s, 0, 7); }, C.skin, { sh: false });
    ctx.restore();
  }
  // body
  fillShape(ctx, () => rrect(ctx, x - G.bodyW / 2 * s, bodyTop, G.bodyW * s, (G.bodyH + 14) * s, 58 * s), shirt, { depth: 1 });
  // head
  const hx = x, hy = bodyTop - G.headR * 0.86 * s; const R = G.headR * s;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
  if (hair === 'long') fillShape(ctx, () => rrect(ctx, -R * 1.08, -R * 0.7, R * 2.16, R * 1.9, R * 0.7), hairColor, { depth: 0.7 });
  if (hair === 'ponytail') { fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(R * 1.05, -R * 0.15, R * 0.34, R * 0.62, 0.5, 0, 7); }, hairColor, { depth: 0.6 }); fillShape(ctx, () => { ctx.beginPath(); ctx.arc(R * 0.86, -R * 0.62, R * 0.16, 0, 7); }, C.rose, { depth: 0.3 }); }
  if (hair === 'bun') fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, -R * 1.08, R * 0.42, 0, 7); }, hairColor, { depth: 0.6 });
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); }, C.skin, { depth: 1 });
  // hair cap
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 1, 0, 7); ctx.clip();
  ctx.fillStyle = hairColor;
  if (hair === 'spiky') { ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.2); for (let i = 0; i <= 6; i++) { const px = -R * 1.1 + i * R * 2.2 / 6; ctx.lineTo(px, -R * (i % 2 ? 0.55 : 0.32)); } ctx.lineTo(R * 1.1, -R * 1.2); ctx.lineTo(-R * 1.1, -R * 1.2); ctx.closePath(); ctx.fill(); }
  else if (hair !== 'bald') { ctx.beginPath(); ctx.ellipse(0, -R * 0.62, R * 1.12, R * (hair === 'short' ? 0.58 : 0.64), 0, 0, 7); ctx.fill(); }
  ctx.restore();
  if (hair === 'spiky') { ctx.fillStyle = hairColor; for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.32; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.12) * R * 0.95, Math.sin(a - 0.12) * R * 0.95); ctx.lineTo(Math.cos(a) * R * 1.28, Math.sin(a) * R * 1.28); ctx.lineTo(Math.cos(a + 0.12) * R * 0.95, Math.sin(a + 0.12) * R * 0.95); ctx.fill(); } }
  drawFace(ctx, R, mood, st, f, glasses);
  ctx.restore();
  ctx.restore();
}

function armsFor(g, t, look) {
  const base = { l: 0.16, r: 0.16 };
  if (!g) return base; const p = g.phase; // 0..1 over gesture duration
  const env = Math.sin(Math.min(1, p) * Math.PI); // in and out
  const k = g.kind; const toward = look === 'left' ? -1 : 1;
  if (k === 'wave') return { l: 0.16, r: 0.16 + env * (2.5 + Math.sin(t * 12) * 0.3) };
  if (k === 'point') return toward > 0 ? { l: 0.16, r: 0.16 + env * 1.45 } : { l: 0.16 + env * 1.45, r: 0.16 };
  if (k === 'cheer' || k === 'raise') return { l: 0.16 + env * 2.6, r: 0.16 + env * 2.6 };
  if (k === 'shrug') return { l: 0.16 + env * 1.0, r: 0.16 + env * 1.0 };
  if (k === 'think') return { l: 0.16, r: 0.16 + env * 2.85 };
  if (k === 'hug') return { l: 0.16 + env * 0.9, r: 0.16 + env * 0.9 };
  return base;
}

function drawFace(ctx, R, mood, st, f, glasses) {
  const look = st.lookX ?? 0; const blink = (Math.sin(st.t * 0.7 + (hash(f.id) % 9)) > 0.985);
  const eyeY = -R * 0.08, ex = R * 0.34; const big = mood === 'wow' || mood === 'scared';
  ctx.fillStyle = C.ink;
  for (const sx of [-1, 1]) {
    if (mood === 'happy' || mood === 'laugh') { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = R * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(sx * ex, eyeY + R * 0.05, R * 0.12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore(); continue; }
    if (blink) { ctx.fillRect(sx * ex - R * 0.1, eyeY, R * 0.2, R * 0.04); continue; }
    if (big) { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(sx * ex, eyeY, R * 0.16, 0, 7); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(sx * ex + look * R * 0.05, eyeY, R * 0.1, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx * ex + look * R * 0.06, eyeY, R * 0.095, 0, 7); ctx.fill(); }
  }
  if (mood === 'sad' || mood === 'worried') { // brows: inner ends raised
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = R * 0.05; ctx.lineCap = 'round';
    for (const sx of [-1, 1]) { const outer = sx * ex + sx * R * 0.13, inner = sx * ex - sx * R * 0.11; ctx.beginPath(); ctx.moveTo(outer, eyeY - R * 0.19); ctx.lineTo(inner, eyeY - R * 0.27); ctx.stroke(); }
    ctx.restore(); }
  // cheeks
  ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = C.cheek; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * R * 0.55, R * 0.22, R * 0.16, R * 0.1, 0, 0, 7); ctx.fill(); } ctx.restore();
  if (glasses) { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = R * 0.05; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * ex, eyeY, R * 0.22, 0, 7); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-ex + R * 0.22, eyeY); ctx.lineTo(ex - R * 0.22, eyeY); ctx.stroke(); ctx.restore(); }
  // mouth
  const my = R * 0.36; const open = clamp(st.talk || 0);
  ctx.save(); ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
  if (open > 0.12) { ctx.beginPath(); ctx.ellipse(0, my, R * 0.16, R * (0.05 + 0.13 * open), 0, 0, 7); ctx.fill(); }
  else if (mood === 'sad') { ctx.beginPath(); ctx.arc(0, my + R * 0.16, R * 0.18, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
  else if (mood === 'worried') { ctx.beginPath(); ctx.moveTo(-R * 0.14, my + R * 0.03); ctx.quadraticCurveTo(0, my - R * 0.05, R * 0.14, my + R * 0.03); ctx.stroke(); }
  else if (mood === 'wow' || mood === 'scared' || mood === 'open') { ctx.beginPath(); ctx.ellipse(0, my + R * 0.02, R * 0.1, R * 0.13, 0, 0, 7); ctx.fill(); }
  else if (mood === 'laugh' || mood === 'grin') { ctx.beginPath(); ctx.moveTo(-R * 0.22, my - R * 0.04); ctx.quadraticCurveTo(0, my + R * 0.34, R * 0.22, my - R * 0.04); ctx.closePath(); ctx.fill(); }
  else if (mood === 'neutral') { ctx.beginPath(); ctx.moveTo(-R * 0.12, my); ctx.lineTo(R * 0.12, my); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, my - R * 0.1, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  ctx.restore();
}

export const MOODS = ['smile', 'happy', 'grin', 'laugh', 'open', 'wow', 'sad', 'worried', 'scared', 'neutral'];
export const GESTURES = ['wave', 'point', 'cheer', 'raise', 'shrug', 'think', 'hug'];
