// Round paper figures in the look of the approved Hierarchologie reels: big round head, hair as a paper cap with a
// straight cut (bun or ponytail on the back side), dot eyes, one pink cheek on the side the figure looks to,
// a soft torso with sleeves, skin-coloured forearms that end round, and two narrow legs without shoes.
// Everything is drawn in "unit" coordinates of an adult (feet at y = 0) and scaled; kids are 2/3 of an adult.
import { C, GROUND, col, fillShape, rrect, clamp, hash } from './core.mjs';
import { scarfBand, pyjamaPrint, pyjamaButtons } from './elements.mjs';

const HAIR = { brown: '#7A5236', dark: '#4E3B33', blond: '#E0B865', red: '#C9744A', grey: '#CBC6D3', black: '#3A2E35', ginger: '#C8843F' };
const SKIN = { light: '#F6D3B8', medium: '#F2C4A4', tan: '#DDA67E', brown: '#B57C55', dark: '#86573A' };
const KID_PANTS = '#86A6D8';

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

// Geometry of an adult at scale 1 (feet at y = 0); kids use the same shapes at 2/3.
const G = { headR: 95, bodyW: 198, bodyH: 186, legH: 120, legW: 30, sleeveL: 46, sleeveW: 42, armL: 96, armW: 26 };

export function figureMetrics(f) {
  const role = ROLES[f.role] || ROLES.man; const s = (f.scale ?? 1) * (role.scale ?? 1) * (role.kid ? 0.66 : 1);
  const sit = f.pose === 'sit'; const legH = sit ? G.legH * 0.25 : G.legH;
  const baseY = f.y ?? GROUND;
  const bodyTop = baseY - (legH + G.bodyH) * s;
  const headC = bodyTop - (G.headR * 0.84) * s;
  return { s, baseY, bodyTop, headX: f.x, headY: headC, headR: G.headR * s, sit, legH };
}

// ---------- small helpers ----------
function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) { if (typeof a !== 'string' || !a.startsWith('#')) return a; const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
const shade = (c, k = 0.15) => mix(c, '#3A2840', k);
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
function capsule(ctx, x1, y1, x2, y2, w, color, depth = 0.5) { // a rounded stroke drawn as a filled paper shape
  ctx.save(); ctx.shadowColor = `rgba(74,53,82,${0.16 + 0.06 * depth})`; ctx.shadowBlur = 12 * depth + 4; ctx.shadowOffsetY = 5 * depth + 1;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function line(ctx, color, w, draw) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); draw(); ctx.stroke(); ctx.restore(); }

// The torso: a soft, slightly pear-shaped paper piece.
function torsoPath(ctx, top, h, w) {
  const tw = w * 0.9, bw = w, r1 = tw * 0.34, r2 = bw * 0.46, bot = top + h;
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + r1, top); ctx.lineTo(tw / 2 - r1, top);
  ctx.quadraticCurveTo(tw / 2, top, tw / 2 + (bw - tw) * 0.12, top + r1 * 0.9);
  ctx.lineTo(bw / 2, bot - r2); ctx.quadraticCurveTo(bw / 2, bot, bw / 2 - r2, bot);
  ctx.lineTo(-bw / 2 + r2, bot); ctx.quadraticCurveTo(-bw / 2, bot, -bw / 2, bot - r2);
  ctx.lineTo(-tw / 2 - (bw - tw) * 0.12, top + r1 * 0.9); ctx.quadraticCurveTo(-tw / 2, top, -tw / 2 + r1, top); ctx.closePath();
}

// ---------- the figure ----------
export function drawFigure(ctx, f, st) {
  const role = { ...(ROLES[f.role] || ROLES.man) };
  const shirt = f.shirt ? col(f.shirt) : role.shirt;
  const pants = f.pants ? col(f.pants) : (role.kid ? KID_PANTS : C.pants);
  const skin = f.skin ? (SKIN[f.skin] || col(f.skin)) : C.skin;
  const hairColor = HAIR[f.hairColor || role.hairColor] || f.hairColor || HAIR.brown;
  const hair = f.hair || role.hair; const glasses = f.glasses ?? role.glasses;
  const m = figureMetrics(f); const s = m.s; const t = st.t;
  const mood = st.mood || 'smile'; const seed = hash(f.id || 'fig');
  const lookX = st.lookX ?? 0; const side = lookX < 0 ? -1 : 1;
  // idle motion (pixels)
  let bob = Math.sin(t * 2.2 + seed % 7) * 2.2 * s; let dx = 0; let tilt = Math.sin(t * 0.9 + (seed % 5)) * 0.02;
  if (mood === 'laugh') bob += Math.abs(Math.sin(t * 9)) * -9 * s;
  if (mood === 'scared') dx += Math.sin(t * 38) * 2.4;
  if (mood === 'sad') tilt += 0.07 * side;
  if (st.hopT > 0) bob -= st.hopT;
  const pop = st.pop ?? 1;

  ctx.save(); ctx.globalAlpha *= st.alpha ?? 1;
  ctx.translate(f.x + dx + (st.dx || 0), m.baseY + (st.dy || 0) + bob); ctx.scale(pop * s, pop * s);

  const legH = m.legH; const top = -(legH + G.bodyH); const R = G.headR; const headY = top - R * 0.84;
  const arms = armsFor(st.gesture, t, lookX, seed);

  // legs: two narrow paper strips with round ends
  if (m.sit) {
    for (const sx of [-1, 1]) fillShape(ctx, () => rrect(ctx, Math.min(sx * 22, sx * 22 + side * 120), -legH - 34 + (sx < 0 ? 0 : 6), 120 + 10, G.legW, G.legW / 2), pants, { depth: 0.5 });
  } else {
    for (const sx of [-1, 1]) fillShape(ctx, () => rrect(ctx, sx * 24 - G.legW / 2, -legH - 20, G.legW, legH + 20, G.legW / 2), pants, { depth: 0.55 });
  }
  // torso
  fillShape(ctx, () => torsoPath(ctx, top, G.bodyH + 8, G.bodyW), shirt, { depth: 1 });
  // pyjama print on the shirt (figure field "pyjama": true or {dots, buttons, closed})
  if (f.pyjama) drawPyjamaTop(ctx, f.pyjama, top);
  // arms (the "think" arm goes in front of the face)
  for (const sd of [-1, 1]) if (arms.front !== sd) drawArm(ctx, sd, arms[sd < 0 ? 'l' : 'r'], top, shirt, skin);
  // a knitted scarf around the neck (figure field "scarf"), it pops on at st.scarfK 0 → 1
  if (f.scarf && (st.scarfK ?? 1) > 0) drawWornScarf(ctx, f.scarf, top, side, st.scarfK ?? 1, t);
  // head
  ctx.save(); ctx.translate(0, headY); ctx.rotate(tilt);
  drawHairBack(ctx, R, hair, hairColor, side);
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); }, skin, { depth: 1 });
  drawHairCap(ctx, R, hair, hairColor);
  drawFace(ctx, R, mood, st, f, glasses, lookX);
  ctx.restore();
  if (arms.front) drawArm(ctx, arms.front, arms[arms.front < 0 ? 'l' : 'r'], top, shirt, skin);
  ctx.restore();
}

// ---------- pyjama: a print of little stars on the shirt and buttons down the front ----------
function drawPyjamaTop(ctx, pj, top) {
  const o = typeof pj === 'object' ? pj : {};
  if (o.dots !== false) { ctx.save(); torsoPath(ctx, top, G.bodyH + 8, G.bodyW); ctx.clip(); pyjamaPrint(ctx, -G.bodyW / 2, top + 12, G.bodyW / 2, top + G.bodyH + 8, 36, col(o.dots, '#FFF6D6')); ctx.restore(); }
  const n = o.buttons ?? 3; pyjamaButtons(ctx, top + 52, top + G.bodyH - 28, n, o.closed ?? n, 10);
}

// ---------- worn scarf: a band around the neck under the chin and one end hanging down the front ----------
function drawWornScarf(ctx, sc, top, side, k, t) {
  const o = typeof sc === 'object' ? sc : { color: sc };
  const base = col(o.color, '#B9906A'), stripe = col(o.stripe, '#E8C77A');
  ctx.save(); ctx.globalAlpha *= clamp(k * 1.6); const sk = 0.7 + 0.3 * k;
  ctx.translate(0, top + 6); ctx.scale(sk, sk);
  // the hanging end, a little off-centre on the side the figure looks to
  ctx.save(); ctx.translate(side * 34, 6); ctx.rotate(Math.PI / 2 - side * 0.12 + Math.sin(t * 1.8) * 0.03); scarfBand(ctx, 128, 46, base, stripe, 0.02, false); ctx.restore();
  // the loop around the neck
  fillShape(ctx, () => rrect(ctx, -G.bodyW * 0.4, -20, G.bodyW * 0.8, 44, 22), base, { depth: 0.5 });
  ctx.save(); rrect(ctx, -G.bodyW * 0.4, -20, G.bodyW * 0.8, 44, 22); ctx.clip(); ctx.fillStyle = stripe;
  for (let i = -3; i <= 3; i += 2) ctx.fillRect(i * 22 - 7, -30, 14, 70);
  ctx.restore(); ctx.restore();
}

// ---------- arms: sleeve (upper arm, shirt colour) and a skin forearm with a round end ----------
function armsFor(g, t, lookX, seed) {
  const sway = Math.sin(t * 1.3 + (seed % 11)) * 0.025;
  const out = { l: { a: 0.26 + sway, e: 0.12 }, r: { a: 0.26 - sway, e: 0.12 }, front: 0 };
  if (!g) return out;
  const env = Math.sin(Math.min(1, g.phase) * Math.PI); const k = g.kind; const arm = lookX < 0 ? 'l' : 'r';
  if (k === 'wave') out[arm] = { a: 0.26 + env * 2.25, e: 0.12 - env * (0.6 + Math.sin(t * 12) * 0.35) };
  else if (k === 'point') out[arm] = { a: 0.26 + env * 1.14, e: 0.12 - env * 0.36 };
  else if (k === 'cheer' || k === 'raise') { out.l = { a: 0.26 + env * 2.4, e: 0.12 }; out.r = { ...out.l }; }
  else if (k === 'shrug') { out.l = { a: 0.26 + env * 0.2, e: 0.12 - env * 1.2 }; out.r = { ...out.l }; }
  else if (k === 'think') { out[arm] = { a: 0.26, e: 0.12, ik: env }; out.front = arm === 'r' ? 1 : -1; }
  else if (k === 'hug') { out.l = { a: 0.26 + env * 0.8, e: 0.12 + env * 1.85 }; out.r = { ...out.l }; }
  return out;
}

function drawArm(ctx, sd, A, top, shirt, skin) {
  const sx = sd * (G.bodyW / 2 - 32), sy = top + 36; const u = G.sleeveL, fo = G.armL;
  let a1 = -A.a * sd; let ex = sx - Math.sin(a1) * u, ey = sy + Math.cos(a1) * u;
  let a2 = a1 + A.e * sd; let wx = ex - Math.sin(a2) * fo, wy = ey + Math.cos(a2) * fo;
  if (A.ik) { // hand to the chin: move the hand toward the chin and solve the elbow (it bends out and down)
    const tx = wx + (sd * G.headR * 0.3 - wx) * A.ik, ty = wy + (top - 6 - wy) * A.ik;
    const dxT = tx - sx, dyT = ty - sy; const d = clamp(Math.hypot(dxT, dyT), Math.abs(u - fo) + 1, u + fo - 1);
    const th = Math.atan2(dyT, dxT); const al = Math.acos(clamp((u * u + d * d - fo * fo) / (2 * u * d), -1, 1));
    const c1 = { x: sx + Math.cos(th + al) * u, y: sy + Math.sin(th + al) * u }, c2 = { x: sx + Math.cos(th - al) * u, y: sy + Math.sin(th - al) * u };
    const E = (c1.y + 0.3 * sd * c1.x) > (c2.y + 0.3 * sd * c2.x) ? c1 : c2; const k = d / Math.hypot(dxT, dyT);
    ex = E.x; ey = E.y; wx = sx + dxT * k; wy = sy + dyT * k;
  }
  capsule(ctx, ex, ey, wx, wy, G.armW, skin, 0.45);          // forearm, the round end is the hand
  capsule(ctx, sx, sy, ex + (ex - sx) * 0.08, ey + (ey - sy) * 0.08, G.sleeveW, shirt, 0.55); // sleeve on top
}

// ---------- hair ----------
function drawHairBack(ctx, R, hair, hc, side) {
  if (hair === 'bun') fillShape(ctx, () => { ctx.beginPath(); ctx.arc(-side * R * 0.86, -R * 0.38, R * 0.4, 0, Math.PI * 2); }, hc, { depth: 0.6 });
  if (hair === 'ponytail') fillShape(ctx, () => ell(ctx, -side * R * 1.0, R * 0.12, R * 0.27, R * 0.66, -side * 0.12), hc, { depth: 0.6 });
  if (hair === 'long') fillShape(ctx, () => rrect(ctx, -R * 1.07, -R * 0.55, R * 2.14, R * 1.55, R * 0.45), hc, { depth: 0.7 });
}

function drawHairCap(ctx, R, hair, hc) {
  if (hair === 'bald') { // a grey wreath at the sides
    for (const sx of [-1, 1]) fillShape(ctx, () => ell(ctx, sx * R * 0.9, -R * 0.08, R * 0.2, R * 0.3, sx * 0.2), hc, { depth: 0.4 });
    return;
  }
  const cut = { short: -R * 0.06, bun: -R * 0.1, ponytail: -R * 0.12, long: -R * 0.16, spiky: -R * 0.16 }[hair] ?? -R * 0.08;
  fillShape(ctx, () => {
    ctx.beginPath();
    // the cap: the top of a slightly larger circle, cut straight at "cut"
    const rx = R * 1.04, ry = R * 1.06, cy = -R * 0.03; const yy = cut - cy; const xx = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
    const a0 = Math.atan2(yy / ry, -xx / rx), a1 = Math.atan2(yy / ry, xx / rx);
    ctx.ellipse(0, cy, rx, ry, 0, a0, a1 + Math.PI * 2 * (a1 < a0 ? 1 : 0), false);
    if (hair === 'spiky') { // spikes rising from the top
      ctx.lineTo(-xx, cut); ctx.closePath();
      const n = 5; for (let i = 0; i < n; i++) { const u = -0.62 + i * 0.31; const bx = u * R; const by = -Math.sqrt(Math.max(0, 1 - u * u)) * R * 1.02;
        ctx.moveTo(bx - R * 0.15, by + R * 0.12); ctx.lineTo(bx + u * R * 0.12, by - R * (0.38 + (i % 2) * 0.1)); ctx.lineTo(bx + R * 0.15, by + R * 0.12); ctx.closePath(); }
      return;
    }
    ctx.closePath();
  }, hc, { depth: 0.55 });
}

// ---------- face: dot eyes, a small mouth, one cheek on the side the figure looks to ----------
function drawFace(ctx, R, mood, st, f, glasses, lookX) {
  const fx = lookX * R * 0.15; const ink = C.ink;
  const eyeY = R * 0.12, ex = R * 0.21, er = R * 0.095;
  const blink = Math.sin(st.t * 0.7 + (hash(f.id) % 9)) > 0.985;
  const big = mood === 'wow' || mood === 'scared';
  // cheek(s)
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.fillStyle = C.cheek;
  const cheeks = lookX === 0 ? [-1, 1] : [lookX < 0 ? -1 : 1];
  for (const sx of cheeks) { ctx.beginPath(); ctx.arc(fx + sx * R * 0.5, R * 0.42, R * 0.17, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // glasses: round rings with a light lens
  if (glasses) {
    ctx.save(); ctx.fillStyle = 'rgba(255,250,240,0.85)'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + sx * ex * 1.15, eyeY, R * 0.17, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    line(ctx, ink, R * 0.055, () => { for (const sx of [-1, 1]) { ctx.moveTo(fx + sx * ex * 1.15 + R * 0.17, eyeY); ctx.arc(fx + sx * ex * 1.15, eyeY, R * 0.17, 0, Math.PI * 2); } ctx.moveTo(fx - ex * 1.15 + R * 0.17, eyeY); ctx.lineTo(fx + ex * 1.15 - R * 0.17, eyeY); });
  }
  const exx = glasses ? ex * 1.15 : ex;
  // eyes
  for (const sx of [-1, 1]) {
    const x = fx + sx * exx, y = eyeY;
    if (mood === 'happy' || mood === 'laugh') { line(ctx, ink, R * 0.065, () => ctx.arc(x, y + er * 0.6, er * 1.1, Math.PI * 1.15, Math.PI * 1.85)); continue; }
    if (blink) { line(ctx, ink, R * 0.05, () => { ctx.moveTo(x - er, y + er * 0.2); ctx.lineTo(x + er, y + er * 0.2); }); continue; }
    if (big) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, er * 1.65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x + lookX * er * 0.35, y, er * 0.95, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, y, er, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x + er * 0.32, y - er * 0.34, er * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // brows only when worried, sad or scared
  if (mood === 'sad' || mood === 'worried' || mood === 'scared') {
    for (const sx of [-1, 1]) line(ctx, ink, R * 0.045, () => { ctx.moveTo(fx + sx * (exx + R * 0.1), eyeY - R * 0.18); ctx.lineTo(fx + sx * (exx - R * 0.09), eyeY - R * 0.26); });
  }
  // mouth
  const mx = fx * 1.15, my = R * 0.42; const open = clamp(st.talk || 0);
  if (open > 0.12) { ctx.fillStyle = ink; ell(ctx, mx, my + R * 0.02, R * 0.12, R * (0.04 + 0.11 * open)); ctx.fill(); }
  else if (mood === 'sad') line(ctx, ink, R * 0.065, () => ctx.arc(mx, my + R * 0.17, R * 0.15, Math.PI * 1.22, Math.PI * 1.78));
  else if (mood === 'worried') line(ctx, ink, R * 0.06, () => { ctx.moveTo(mx - R * 0.13, my + R * 0.03); ctx.quadraticCurveTo(mx - R * 0.04, my - R * 0.04, mx + R * 0.02, my + R * 0.02); ctx.quadraticCurveTo(mx + R * 0.08, my + R * 0.07, mx + R * 0.13, my); });
  else if (mood === 'wow' || mood === 'scared' || mood === 'open') { ctx.fillStyle = ink; ell(ctx, mx, my + R * 0.03, R * 0.085, R * 0.11); ctx.fill(); }
  else if (mood === 'laugh' || mood === 'grin' || mood === 'happy') {
    const w = mood === 'happy' ? R * 0.15 : R * 0.19, h = mood === 'laugh' ? R * 0.2 : R * 0.15;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(mx - w, my - R * 0.03); ctx.quadraticCurveTo(mx, my + R * 0.0, mx + w, my - R * 0.03);
    ctx.quadraticCurveTo(mx + w * 0.85, my + h, mx, my + h); ctx.quadraticCurveTo(mx - w * 0.85, my + h, mx - w, my - R * 0.03); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#E98AA0'; ell(ctx, mx, my + h * 1.05, w * 0.6, h * 0.45); ctx.fill(); ctx.restore();
  }
  else if (mood === 'neutral') line(ctx, ink, R * 0.06, () => { ctx.moveTo(mx - R * 0.09, my + R * 0.03); ctx.lineTo(mx + R * 0.09, my + R * 0.03); });
  else line(ctx, ink, R * 0.07, () => ctx.arc(mx, my - R * 0.06, R * 0.15, Math.PI * 0.22, Math.PI * 0.78));
}

export const MOODS = ['smile', 'happy', 'grin', 'laugh', 'open', 'wow', 'sad', 'worried', 'scared', 'neutral'];
export const GESTURES = ['wave', 'point', 'cheer', 'raise', 'shrug', 'think', 'hug'];
