// Paper-cut figures: round heads with layered hair, ears, brows and lashes, clothes with collars and folds,
// bendable arms with hands, shoes. Everything is drawn in "unit" coordinates of an adult (feet at y = 0)
// and scaled per figure; kids use their own proportions (bigger head, shorter body).
import { C, GROUND, col, fillShape, rrect, clamp, hash } from './core.mjs';

const HAIR = { brown: '#7A5236', dark: '#4E3B33', blond: '#E0B865', red: '#C9744A', grey: '#CFC8D3', black: '#3A2E35' };
const SKIN = { light: '#F6D3B8', medium: '#F2C4A4', tan: '#DDA67E', brown: '#B57C55', dark: '#86573A' };

export const ROLES = {
  mama:    { kid: false, hair: 'bun',      hairColor: 'brown', shirt: C.shirtMama, outfit: 'cardigan', fem: true, shoes: '#8C6070' },
  papa:    { kid: false, hair: 'short',    hairColor: 'dark',  shirt: C.shirtPapa, outfit: 'shirt', shoes: '#6B4F45' },
  woman:   { kid: false, hair: 'long',     hairColor: 'blond', shirt: '#F9C6D3', outfit: 'top', fem: true, shoes: '#B86A86' },
  man:     { kid: false, hair: 'short',    hairColor: 'brown', shirt: C.shirtPapa2, outfit: 'polo', shoes: '#5A4450' },
  oma:     { kid: false, hair: 'bun',      hairColor: 'grey',  shirt: C.shirtOma, outfit: 'cardigan', fem: true, glasses: true, shoes: '#7A5A6E' },
  opa:     { kid: false, hair: 'bald',     hairColor: 'grey',  shirt: '#CFE3F2', outfit: 'sweater', glasses: true, shoes: '#6B4F45' },
  teacher: { kid: false, hair: 'long',     hairColor: 'red',   shirt: '#E5F4E4', outfit: 'blouse', fem: true, glasses: true, shoes: '#7A4F8A' },
  girl:    { kid: true,  hair: 'ponytail', hairColor: 'brown', shirt: C.shirtGirl, outfit: 'dress', fem: true, shoes: '#C14E78', pants: '#7C86B8' },
  boy:     { kid: true,  hair: 'spiky',    hairColor: 'blond', shirt: C.shirtBoy, outfit: 'tee', shoes: '#F7C948', freckles: true },
  teen:    { kid: false, hair: 'spiky',    hairColor: 'dark',  shirt: '#BFD9F2', outfit: 'hoodie', scale: 0.9, shoes: '#FFFFFF' },
  toddler: { kid: true,  hair: 'short',    hairColor: 'blond', shirt: '#FDE2EA', outfit: 'overall', scale: 0.72, shoes: '#9FD3C7', pants: '#9FC3E6' },
};

// Geometry in unit coordinates (adult, scale 1). Kids get a bigger head and a shorter body before the 2/3 scale.
const ADULT = { headR: 84, bodyW: 156, bodyH: 196, legH: 140, legW: 46, armW: 36, armL: 158 };
const KID = { headR: 98, bodyW: 150, bodyH: 164, legH: 114, legW: 44, armW: 34, armL: 134 };
const geo = role => (role.kid ? KID : ADULT);

export function figureMetrics(f) {
  const role = ROLES[f.role] || ROLES.man; const G = geo(role);
  const s = (f.scale ?? 1) * (role.scale ?? 1) * (role.kid ? 0.66 : 1);
  const sit = f.pose === 'sit'; const legH = sit ? G.legH * 0.25 : G.legH;
  const baseY = f.y ?? GROUND;
  const bodyTop = baseY - (legH + G.bodyH) * s;
  const headC = bodyTop - G.headR * 0.86 * s;
  return { s, baseY, bodyTop, headX: f.x, headY: headC, headR: G.headR * s, sit, legH };
}

// ---------- colour helpers ----------
function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) {
  if (typeof a !== 'string' || !a.startsWith('#')) return a;
  const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
const shade = (c, k = 0.18) => mix(c, '#3A2840', k);
const tint = (c, k = 0.35) => mix(c, '#FFFFFF', k);
const alphaOf = (c, a) => { if (typeof c !== 'string' || !c.startsWith('#')) return c; const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };

// ---------- path helpers ----------
function taper(ctx, cx, y, w1, w2, h, r) {
  const a = w1 / 2, b = w2 / 2; ctx.beginPath();
  ctx.moveTo(cx - a, y + r * 0.6); ctx.quadraticCurveTo(cx - a, y, cx - a + r * 0.6, y); ctx.lineTo(cx + a - r * 0.6, y); ctx.quadraticCurveTo(cx + a, y, cx + a, y + r * 0.6);
  ctx.lineTo(cx + b, y + h - r); ctx.quadraticCurveTo(cx + b, y + h, cx + b - r, y + h); ctx.lineTo(cx - b + r, y + h); ctx.quadraticCurveTo(cx - b, y + h, cx - b, y + h - r); ctx.closePath();
}
function torsoPath(ctx, top, bot, sw, hw, shoulderR = 44) {
  ctx.beginPath();
  ctx.moveTo(-sw + shoulderR * 0.9, top); ctx.lineTo(sw - shoulderR * 0.9, top);
  ctx.quadraticCurveTo(sw, top, sw, top + shoulderR);
  ctx.lineTo(hw, bot - 18); ctx.quadraticCurveTo(hw, bot, hw - 18, bot);
  ctx.lineTo(-hw + 18, bot); ctx.quadraticCurveTo(-hw, bot, -hw, bot - 18);
  ctx.lineTo(-sw, top + shoulderR); ctx.quadraticCurveTo(-sw, top, -sw + shoulderR * 0.9, top); ctx.closePath();
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
function stroke(ctx, color, w, draw, cap = 'round') { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; draw(); ctx.stroke(); ctx.restore(); }
// Soft paper shading inside a path: light from the top left, shade on the right and at the bottom.
function paperShade(ctx, path, x0, x1, color, k = 0.2) {
  ctx.save(); path(); ctx.clip();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, alphaOf(tint(color, 0.6), 0.32)); g.addColorStop(0.35, alphaOf(color, 0)); g.addColorStop(0.7, alphaOf(color, 0)); g.addColorStop(1, alphaOf(shade(color, 0.5), k));
  ctx.fillStyle = g; ctx.fillRect(x0 - 10, -2000, x1 - x0 + 20, 4000); ctx.restore();
}

// ---------- the figure ----------
export function drawFigure(ctx, f, st) {
  const role = { ...(ROLES[f.role] || ROLES.man) }; const G = geo(role);
  const shirt = f.shirt ? col(f.shirt) : role.shirt;
  const pants = f.pants ? col(f.pants) : (role.pants || C.pants);
  const skin = f.skin ? (SKIN[f.skin] || col(f.skin)) : C.skin;
  const hairColor = HAIR[f.hairColor || role.hairColor] || f.hairColor || HAIR.brown;
  const hair = f.hair || role.hair; const glasses = f.glasses ?? role.glasses;
  const outfit = f.outfit || role.outfit || 'tee'; const fem = f.fem ?? role.fem;
  const shoes = f.shoes ? col(f.shoes) : (role.shoes || '#5A4450');
  const m = figureMetrics(f); const s = m.s; const t = st.t;
  const mood = st.mood || 'smile'; const seed = hash(f.id || 'fig');
  const lookX = st.lookX ?? 0; const side = lookX < 0 ? -1 : 1;
  // idle motion (pixels)
  let bob = Math.sin(t * 2.2 + seed % 7) * 2.2 * s; let dx = 0; let tilt = Math.sin(t * 0.9 + (seed % 5)) * 0.025 + lookX * 0.03;
  if (mood === 'laugh') bob += Math.abs(Math.sin(t * 9)) * -9 * s;
  if (mood === 'scared') dx += Math.sin(t * 38) * 2.4;
  if (mood === 'sad') tilt += 0.08 * side;
  if (st.hopT > 0) bob -= st.hopT;
  const X = f.x + dx + (st.dx || 0), BY = m.baseY + (st.dy || 0) + bob;
  const pop = st.pop ?? 1;

  ctx.save(); ctx.globalAlpha *= st.alpha ?? 1;
  ctx.translate(X, BY); ctx.scale(pop * s, pop * s);

  const legH = m.sit ? G.legH * 0.25 : G.legH;
  const top = -(legH + G.bodyH); const bot = top + G.bodyH + 16;
  const headY = top - G.headR * 0.86; const R = G.headR;
  const sw = G.bodyW / 2 - 6, hw = G.bodyW / 2 + (outfit === 'dress' ? 0 : 3);
  const head = (fn) => { ctx.save(); ctx.translate(0, headY); ctx.rotate(tilt); fn(); ctx.restore(); };

  // long hair hangs behind the shoulders
  if (hair === 'long') head(() => drawLongHairBack(ctx, R, hairColor));
  if (outfit === 'hoodie') fillShape(ctx, () => ell(ctx, 0, top + 6, sw * 0.86, 34), shade(shirt, 0.12), { depth: 0.5 });

  // legs and shoes
  drawLegs(ctx, G, m, legH, top, pants, shoes, side, outfit, role);

  // arms: the "think" arm goes in front of the face, all others in front of the body
  const arms = armsFor(st.gesture, t, lookX, seed);
  const sleeve = role.kid || outfit === 'top' || outfit === 'polo' ? 'short' : 'long';

  // neck
  fillShape(ctx, () => rrect(ctx, -16, headY + R * 0.7, 32, top - headY - R * 0.7 + 18, 12), shade(skin, 0.1), { depth: 0.3 });

  // torso with clothes
  drawTorso(ctx, outfit, top, bot, sw, hw, shirt, skin, pants, G, side);

  for (const sd of [-1, 1]) if (!(arms.front === sd)) drawArm(ctx, sd, arms[sd < 0 ? 'l' : 'r'], G, top, shirt, skin, sleeve, side);

  // head
  head(() => {
    drawHairBack(ctx, R, hair, hairColor, side);
    // ears
    for (const sx of [-1, 1]) {
      fillShape(ctx, () => ell(ctx, sx * R * 0.96, R * 0.1, R * 0.15, R * 0.19), skin, { depth: 0.4 });
      stroke(ctx, shade(skin, 0.22), R * 0.03, () => { ctx.beginPath(); ctx.arc(sx * R * 0.97, R * 0.1, R * 0.08, sx > 0 ? -1.2 : Math.PI - 1.9, sx > 0 ? 1.9 : Math.PI + 1.2); });
    }
    // face
    const facePath = () => ell(ctx, 0, 0, R, R * 0.98);
    fillShape(ctx, facePath, skin, { depth: 1 });
    ctx.save(); facePath(); ctx.clip();
    const g = ctx.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.2, 0, 0, R * 1.15);
    g.addColorStop(0, alphaOf(tint(skin, 0.5), 0.35)); g.addColorStop(0.6, alphaOf(skin, 0)); g.addColorStop(1, alphaOf(shade(skin, 0.4), 0.22));
    ctx.fillStyle = g; ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4); ctx.restore();
    drawHairFront(ctx, R, hair, hairColor, side);
    drawFace(ctx, R, mood, st, f, glasses, { fem, kid: role.kid, skin, hairColor, lookX, freckles: f.freckles ?? role.freckles });
  });

  if (arms.front) drawArm(ctx, arms.front, arms[arms.front < 0 ? 'l' : 'r'], G, top, shirt, skin, sleeve, side);
  ctx.restore();
}

// ---------- legs ----------
function drawLegs(ctx, G, m, legH, top, pants, shoes, side, outfit, role) {
  const thin = outfit === 'dress' ? 0.8 : 1;
  const lw = G.legW * thin, gap = G.legW * 0.72;
  if (m.sit) {
    for (const sx of [-1, 1]) {
      const y0 = -legH - 30; const x0 = sx * gap * 0.6;
      fillShape(ctx, () => rrect(ctx, Math.min(x0, x0 + side * 120), y0, 120, lw, lw / 2), pants, { depth: 0.6 });
      drawShoe(ctx, x0 + side * 118, y0 + lw + 8, shoes, side, role);
    }
    return;
  }
  for (const sx of [-1, 1]) {
    const cx = sx * gap; const y = -legH - 14;
    const path = () => taper(ctx, cx, y, lw, lw * 0.86, legH + 14 - 8, 14);
    fillShape(ctx, path, pants, { depth: 0.6 });
    paperShade(ctx, path, cx - lw / 2, cx + lw / 2, pants, 0.25);
    if (outfit !== 'dress' && outfit !== 'overall' && !role.kid) stroke(ctx, alphaOf(shade(pants, 0.3), 0.5), 2.5, () => { ctx.beginPath(); ctx.moveTo(cx + sx * lw * 0.12, y + 30); ctx.lineTo(cx + sx * lw * 0.1, -14); });
  }
  for (const sx of [-1, 1]) drawShoe(ctx, sx * gap + side * 7, -10, shoes, side, role);
}

function drawShoe(ctx, x, y, color, side, role) {
  // drawn facing right, mirrored for figures looking left
  ctx.save(); ctx.translate(x, y); ctx.scale(side, 1);
  fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-28, 10); ctx.quadraticCurveTo(-32, -13, -8, -15); ctx.quadraticCurveTo(22, -16, 36, 0); ctx.quadraticCurveTo(40, 10, 30, 10); ctx.closePath(); }, color, { depth: 0.45 });
  const sole = role.kid || color === '#FFFFFF' ? '#FFFFFF' : shade(color, 0.35);
  ctx.fillStyle = sole; rrect(ctx, -30, 5, 70, 7, 3.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, 16, -6, 9, 4, -0.3); ctx.fill();
  if (role.kid) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(8, -6); ctx.moveTo(-2, -13); ctx.lineTo(12, -9); ctx.stroke(); }
  ctx.restore();
}

// ---------- torso and clothes ----------
function drawTorso(ctx, outfit, top, bot, sw, hw, shirt, skin, pants, G, side) {
  if (outfit === 'dress') return drawDress(ctx, top, bot, sw, hw, shirt, skin);
  const path = () => torsoPath(ctx, top, bot, sw, hw);
  fillShape(ctx, path, shirt, { depth: 1 });
  paperShade(ctx, path, -hw, hw, shirt, 0.28);
  const cream = '#FFF8EF';
  if (outfit === 'cardigan') {
    // open cardigan over a light top: inner panel, V neckline, buttons, pockets
    const inner = () => { ctx.beginPath(); ctx.moveTo(-30, top); ctx.lineTo(30, top); ctx.lineTo(16, bot); ctx.lineTo(-16, bot); ctx.closePath(); };
    fillShape(ctx, inner, cream, { depth: 0.35 });
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-22, top - 1); ctx.lineTo(22, top - 1); ctx.quadraticCurveTo(4, top + 22, 0, top + 34); ctx.quadraticCurveTo(-4, top + 22, -22, top - 1); ctx.closePath(); }, skin, { sh: false });
    stroke(ctx, C.gold, 1.8, () => { ctx.beginPath(); ctx.moveTo(-19, top + 2); ctx.quadraticCurveTo(0, top + 40, 19, top + 2); });
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, top + 23, 4.2, 0, 7); }, C.gold, { depth: 0.15 });
    for (const sx of [-1, 1]) stroke(ctx, shade(shirt, 0.18), 3, () => { ctx.beginPath(); ctx.moveTo(sx * 30, top + 2); ctx.lineTo(sx * 16, bot - 2); });
    for (const sx of [-1, 1]) { const px = sx * (hw - 34); fillShape(ctx, () => rrect(ctx, px - 20, bot - 62, 40, 34, 9), shade(shirt, 0.06), { depth: 0.25 }); stroke(ctx, alphaOf(shade(shirt, 0.3), 0.5), 2, () => { ctx.beginPath(); ctx.moveTo(px - 16, bot - 54); ctx.lineTo(px + 16, bot - 54); }); }
    ctx.save(); ctx.fillStyle = tint(shirt, 0.55); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(20 + 4 + i * -0.5, top + 70 + i * 34, 4, 0, 7); ctx.fill(); } ctx.restore();
  } else if (outfit === 'shirt' || outfit === 'polo') {
    const n = outfit === 'shirt' ? 4 : 2; const pl = outfit === 'shirt' ? bot - top - 10 : 60;
    stroke(ctx, alphaOf(shade(shirt, 0.3), 0.6), 3, () => { ctx.beginPath(); ctx.moveTo(0, top + 18); ctx.lineTo(0, top + pl); });
    ctx.save(); ctx.fillStyle = tint(shirt, 0.6); for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(7, top + 30 + i * (outfit === 'shirt' ? 42 : 20), 3.6, 0, 7); ctx.fill(); } ctx.restore();
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-12, top - 2); ctx.lineTo(12, top - 2); ctx.lineTo(0, top + 18); ctx.closePath(); }, skin, { sh: false });
    for (const sx of [-1, 1]) fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(sx * 4, top + 18); ctx.lineTo(sx * 34, top - 4); ctx.lineTo(sx * 40, top + 22); ctx.closePath(); }, tint(shirt, 0.45), { depth: 0.35 });
    if (outfit === 'shirt') for (const sx of [-1, 1]) { const px = sx * 40; fillShape(ctx, () => rrect(ctx, px - 16, top + 58, 32, 30, 6), shade(shirt, 0.05), { depth: 0.2 }); }
  } else if (outfit === 'sweater') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-34, top - 1); ctx.lineTo(34, top - 1); ctx.lineTo(0, top + 62); ctx.closePath(); }, cream, { sh: false });
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-14, top - 1); ctx.lineTo(14, top - 1); ctx.lineTo(0, top + 22); ctx.closePath(); }, skin, { sh: false });
    for (const sx of [-1, 1]) fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(sx * 2, top + 22); ctx.lineTo(sx * 24, top - 3); ctx.lineTo(sx * 30, top + 16); ctx.closePath(); }, '#FFFFFF', { depth: 0.3 });
    stroke(ctx, shade(shirt, 0.15), 6, () => { ctx.beginPath(); ctx.moveTo(-38, top - 1); ctx.lineTo(0, top + 66); ctx.lineTo(38, top - 1); });
    ctx.save(); torsoPath(ctx, top, bot, sw, hw); ctx.clip(); ctx.fillStyle = shade(shirt, 0.12); ctx.fillRect(-hw - 4, bot - 26, hw * 2 + 8, 30);
    ctx.strokeStyle = alphaOf(shade(shirt, 0.3), 0.45); ctx.lineWidth = 2; for (let x = -hw; x < hw; x += 10) { ctx.beginPath(); ctx.moveTo(x, bot - 24); ctx.lineTo(x, bot); ctx.stroke(); } ctx.restore();
  } else if (outfit === 'blouse') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 26, 20, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-30, top + 6); ctx.quadraticCurveTo(0, top + 26, 30, top + 6); ctx.lineTo(10, top + 30); ctx.lineTo(20, top + 74); ctx.lineTo(2, top + 40); ctx.lineTo(-14, top + 72); ctx.lineTo(-8, top + 30); ctx.closePath(); }, C.rose, { depth: 0.4 });
  } else if (outfit === 'top') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 34, 30, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
    stroke(ctx, C.gold, 2, () => { ctx.beginPath(); ctx.moveTo(-20, top + 4); ctx.quadraticCurveTo(0, top + 30, 20, top + 4); });
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(0, top + 23, 5, 0, 7); }, C.gold, { depth: 0.2 });
  } else if (outfit === 'hoodie') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 24, 16, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
    for (const sx of [-1, 1]) { stroke(ctx, '#FFFFFF', 3, () => { ctx.beginPath(); ctx.moveTo(sx * 12, top + 10); ctx.lineTo(sx * 14, top + 62); }); fillShape(ctx, () => { ctx.beginPath(); ctx.arc(sx * 14, top + 64, 4, 0, 7); }, '#FFFFFF', { sh: false }); }
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-50, bot - 70); ctx.lineTo(50, bot - 70); ctx.lineTo(62, bot - 22); ctx.lineTo(-62, bot - 22); ctx.closePath(); }, shade(shirt, 0.08), { depth: 0.3 });
  } else if (outfit === 'overall') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 24, 16, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
    const bib = () => { ctx.beginPath(); ctx.moveTo(-46, top + 64); ctx.lineTo(46, top + 64); ctx.lineTo(hw, bot - 18); ctx.quadraticCurveTo(hw, bot, hw - 18, bot); ctx.lineTo(-hw + 18, bot); ctx.quadraticCurveTo(-hw, bot, -hw, bot - 18); ctx.closePath(); };
    fillShape(ctx, bib, pants, { depth: 0.5 });
    for (const sx of [-1, 1]) { stroke(ctx, pants, 12, () => { ctx.beginPath(); ctx.moveTo(sx * 38, top + 68); ctx.lineTo(sx * 46, top + 4); }); fillShape(ctx, () => { ctx.beginPath(); ctx.arc(sx * 36, top + 74, 6, 0, 7); }, C.gold, { depth: 0.2 }); }
    fillShape(ctx, () => rrect(ctx, -22, top + 92, 44, 30, 8), shade(pants, 0.08), { depth: 0.2 });
  } else { // tee
    fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 26, 18, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
    stroke(ctx, shade(shirt, 0.2), 5, () => { ctx.beginPath(); ctx.ellipse(0, top, 28, 20, 0, 0.05, Math.PI - 0.05); });
    ctx.save(); torsoPath(ctx, top, bot, sw, hw); ctx.clip(); ctx.fillStyle = tint(shirt, 0.5); ctx.fillRect(-hw - 4, top + 78, hw * 2 + 8, 22); ctx.fillStyle = shade(shirt, 0.1); ctx.fillRect(-hw - 4, bot - 22, hw * 2 + 8, 24); ctx.restore();
  }
  // waist line where the shirt meets the trousers
  if (outfit !== 'overall' && outfit !== 'hoodie') stroke(ctx, alphaOf(shade(shirt, 0.35), 0.35), 3, () => { ctx.beginPath(); ctx.moveTo(-hw + 12, bot - 4); ctx.quadraticCurveTo(0, bot + 2, hw - 12, bot - 4); });
}

function drawDress(ctx, top, bot, sw, hw, shirt, skin) {
  const waist = top + 74; const hem = bot + 8; const flare = hw + 26;
  const path = () => { ctx.beginPath();
    ctx.moveTo(-sw + 36, top); ctx.lineTo(sw - 36, top); ctx.quadraticCurveTo(sw, top, sw, top + 40); ctx.lineTo(sw - 8, waist);
    ctx.quadraticCurveTo(flare - 20, hem - 50, flare, hem - 10); ctx.quadraticCurveTo(flare, hem, flare - 14, hem);
    for (let i = 0; i < 6; i++) { const x1 = flare - 14 - (i + 1) * ((flare * 2 - 28) / 6); const xm = (x1 + flare - 14 - i * ((flare * 2 - 28) / 6)) / 2; ctx.quadraticCurveTo(xm, hem + 9, x1, hem); }
    ctx.quadraticCurveTo(-flare, hem, -flare, hem - 10); ctx.quadraticCurveTo(-flare + 20, hem - 50, -sw + 8, waist);
    ctx.lineTo(-sw, top + 40); ctx.quadraticCurveTo(-sw, top, -sw + 36, top); ctx.closePath(); };
  fillShape(ctx, path, shirt, { depth: 1 });
  // polka dots on the skirt, soft shading, waist band
  ctx.save(); path(); ctx.clip(); ctx.fillStyle = tint(shirt, 0.55);
  for (let r = 0; r < 4; r++) for (let c = -4; c <= 4; c++) { const x = c * 30 + (r % 2) * 15, y = waist + 22 + r * 26; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill(); }
  ctx.restore();
  paperShade(ctx, path, -flare, flare, shirt, 0.26);
  fillShape(ctx, () => rrect(ctx, -sw + 6, waist - 8, (sw - 6) * 2, 16, 8), shade(shirt, 0.16), { depth: 0.25 });
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, top, 24, 17, 0, 0, Math.PI); ctx.closePath(); }, skin, { sh: false });
  for (const sx of [-1, 1]) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(sx * 19, top + 9, 21, 14, sx * 0.25, 0, Math.PI * 2); }, '#FFFFFF', { depth: 0.35 });
}

// ---------- arms ----------
function armsFor(g, t, lookX, seed) {
  const sway = Math.sin(t * 1.3 + (seed % 11)) * 0.03;
  const rest = { a: 0.13 + sway, e: 0.18 };
  const out = { l: { ...rest }, r: { ...rest, a: 0.13 - sway }, front: 0 };
  if (!g) return out;
  const p = g.phase; const env = Math.sin(Math.min(1, p) * Math.PI); const k = g.kind; const toward = lookX < 0 ? -1 : 1;
  const arm = toward > 0 ? 'r' : 'l';
  if (k === 'wave') { out[arm] = { a: 0.13 + env * 2.45, e: 0.18 - env * (0.45 + Math.sin(t * 12) * 0.35) }; }
  else if (k === 'point') { out[arm] = { a: 0.13 + env * 1.38, e: 0.18 - env * 0.18 }; }
  else if (k === 'cheer' || k === 'raise') { out.l = { a: 0.13 + env * 2.55, e: 0.18 + env * 0.25 }; out.r = { ...out.l }; }
  else if (k === 'shrug') { out.l = { a: 0.13 + env * 0.22, e: 0.18 - env * 1.13 }; out.r = { ...out.l }; }
  else if (k === 'think') { out[arm] = { a: 0.13, e: 0.18, ik: env }; out.front = arm === 'r' ? 1 : -1; }
  else if (k === 'hug') { out.l = { a: 0.13 + env * 0.85, e: 0.18 + env * 2.1 }; out.r = { ...out.l }; }
  return out;
}

function drawArm(ctx, sd, A, G, top, shirt, skin, sleeve, side) {
  const sx = sd * (G.bodyW / 2 - 14), sy = top + 30;
  const u = G.armL * 0.52, fo = G.armL * 0.46, w = G.armW;
  let a1 = -A.a * sd; // outward is positive for both arms
  let ex = sx - Math.sin(a1) * u, ey = sy + Math.cos(a1) * u;
  let a2 = a1 + A.e * sd; // elbow bends inward (toward the body) for positive e
  let wx = ex - Math.sin(a2) * fo, wy = ey + Math.cos(a2) * fo;
  if (A.ik) { // hand to the chin: blend the resting wrist toward the target, solve the elbow (two-bone IK, elbow out and down)
    const tx = wx + (sd * G.headR * 0.2 - wx) * A.ik, ty = wy + (top + 24 - wy) * A.ik;
    const dxT = tx - sx, dyT = ty - sy; const d = clamp(Math.hypot(dxT, dyT), Math.abs(u - fo) + 1, u + fo - 1);
    const th = Math.atan2(dyT, dxT); const al = Math.acos(clamp((u * u + d * d - fo * fo) / (2 * u * d), -1, 1));
    const c1 = { x: sx + Math.cos(th + al) * u, y: sy + Math.sin(th + al) * u }, c2 = { x: sx + Math.cos(th - al) * u, y: sy + Math.sin(th - al) * u };
    const E = (sd * c1.x + 0.5 * c1.y) > (sd * c2.x + 0.5 * c2.y) ? c1 : c2;
    ex = E.x; ey = E.y; const k = d / Math.hypot(dxT, dyT); wx = sx + dxT * k; wy = sy + dyT * k;
    a1 = Math.atan2(-(ex - sx), ey - sy); a2 = Math.atan2(-(wx - ex), wy - ey);
  }
  const line = () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy); };
  ctx.save(); ctx.shadowColor = 'rgba(74,53,82,0.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  if (sleeve === 'short') {
    stroke(ctx, skin, w * 0.8, line);
    ctx.restore(); ctx.save(); ctx.shadowColor = 'rgba(74,53,82,0.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const mx = sx + (ex - sx) * 0.62, my = sy + (ey - sy) * 0.62;
    stroke(ctx, shirt, w * 1.05, () => { ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(mx, my); });
  } else {
    stroke(ctx, shirt, w, line);
  }
  ctx.restore();
  if (sleeve !== 'short') { // cuff
    const cx = ex + (wx - ex) * 0.86, cy = ey + (wy - ey) * 0.86;
    stroke(ctx, shade(shirt, 0.14), w * 0.98, () => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex + (wx - ex) * 0.97, ey + (wy - ey) * 0.97); }, 'butt');
  }
  // hand: mitten with a thumb, rotated along the forearm
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(a2);
  fillShape(ctx, () => ell(ctx, 0, 12, w * 0.5, w * 0.6), skin, { depth: 0.35 });
  fillShape(ctx, () => ell(ctx, -sd * w * 0.42, 4, w * 0.2, w * 0.3, sd * 0.5), skin, { depth: 0.2 });
  ctx.restore();
}

// ---------- hair ----------
function drawLongHairBack(ctx, R, hc) {
  fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.2); ctx.quadraticCurveTo(-R * 1.25, R * 1.1, -R * 0.95, R * 1.62); ctx.quadraticCurveTo(0, R * 1.78, R * 0.95, R * 1.62); ctx.quadraticCurveTo(R * 1.25, R * 1.1, R * 1.1, -R * 0.2); ctx.closePath(); }, shade(hc, 0.1), { depth: 0.8 });
}

function drawHairBack(ctx, R, hair, hc, side) {
  if (hair === 'bald') return;
  if (hair === 'bun') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(-side * R * 0.1, -R * 1.06, R * 0.42, 0, 7); }, hc, { depth: 0.6 });
    stroke(ctx, alphaOf(shade(hc, 0.3), 0.6), R * 0.035, () => { ctx.beginPath(); ctx.arc(-side * R * 0.1, -R * 1.06, R * 0.27, -2.6, -0.6); });
    stroke(ctx, alphaOf(tint(hc, 0.45), 0.8), R * 0.04, () => { ctx.beginPath(); ctx.arc(-side * R * 0.1, -R * 1.06, R * 0.33, -2.5, -1.8); });
  }
  if (hair === 'ponytail') {
    ctx.save(); ctx.scale(-side, 1);
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(R * 0.78, -R * 0.7); ctx.bezierCurveTo(R * 1.5, -R * 0.75, R * 1.55, R * 0.1, R * 1.25, R * 0.62); ctx.quadraticCurveTo(R * 1.18, R * 0.3, R * 0.98, R * 0.12); ctx.bezierCurveTo(R * 1.18, -R * 0.2, R * 1.0, -R * 0.45, R * 0.72, -R * 0.45); ctx.closePath(); }, hc, { depth: 0.6 });
    stroke(ctx, alphaOf(shade(hc, 0.3), 0.55), R * 0.03, () => { ctx.beginPath(); ctx.moveTo(R * 0.98, -R * 0.55); ctx.bezierCurveTo(R * 1.32, -R * 0.45, R * 1.36, 0, R * 1.22, R * 0.38); });
    fillShape(ctx, () => ell(ctx, R * 0.86, -R * 0.62, R * 0.12, R * 0.16, 0.4), C.rose, { depth: 0.3 });
    ctx.restore();
  }
  // volume around the top of the head
  if (hair !== 'spiky') fillShape(ctx, () => ell(ctx, 0, -R * 0.18, R * 1.07, R * (hair === 'short' ? 0.96 : 1.0)), hc, { depth: 0.7 });
}

function drawHairFront(ctx, R, hair, hc, side) {
  ctx.save(); ctx.scale(side, 1); // part and sweep follow the direction the figure faces
  const dark = alphaOf(shade(hc, 0.32), 0.55), light = alphaOf(tint(hc, 0.45), 0.85);
  if (hair === 'bald') {
    for (const sx of [-1, 1]) fillShape(ctx, () => ell(ctx, sx * R * 0.9, -R * 0.12, R * 0.2, R * 0.32, sx * 0.25), hc, { depth: 0.4 });
    ctx.restore(); return;
  }
  if (hair === 'spiky') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-R * 1.02, R * 0.02); ctx.quadraticCurveTo(-R * 1.1, -R * 0.75, -R * 0.62, -R * 0.98);
      const n = 7; for (let i = 0; i <= n; i++) { const a = Math.PI * (1.15 + 0.7 * i / n); const r1 = R * (i % 2 ? 1.32 : 1.02); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 - R * 0.02); }
      ctx.quadraticCurveTo(R * 1.1, -R * 0.75, R * 1.02, R * 0.02); ctx.quadraticCurveTo(R * 0.86, -R * 0.38, R * 0.5, -R * 0.42);
      ctx.lineTo(R * 0.34, -R * 0.3); ctx.lineTo(R * 0.12, -R * 0.46); ctx.lineTo(-R * 0.1, -R * 0.32); ctx.lineTo(-R * 0.32, -R * 0.48); ctx.lineTo(-R * 0.55, -R * 0.36); ctx.quadraticCurveTo(-R * 0.9, -R * 0.36, -R * 1.02, R * 0.02); ctx.closePath(); }, hc, { depth: 0.6 });
    stroke(ctx, light, R * 0.04, () => { ctx.beginPath(); ctx.arc(0, 0, R * 0.86, -2.5, -1.9); });
    ctx.restore(); return;
  }
  if (hair === 'short') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-R * 1.03, R * 0.08); ctx.bezierCurveTo(-R * 1.15, -R * 0.85, -R * 0.45, -R * 1.18, R * 0.15, -R * 1.12);
      ctx.bezierCurveTo(R * 0.85, -R * 1.08, R * 1.15, -R * 0.62, R * 1.03, R * 0.08); ctx.lineTo(R * 0.9, R * 0.06); ctx.quadraticCurveTo(R * 0.86, -R * 0.4, R * 0.55, -R * 0.56);
      ctx.bezierCurveTo(R * 0.2, -R * 0.68, -R * 0.35, -R * 0.5, -R * 0.62, -R * 0.62); ctx.quadraticCurveTo(-R * 0.86, -R * 0.4, -R * 0.9, R * 0.06); ctx.closePath(); }, hc, { depth: 0.6 });
    stroke(ctx, dark, R * 0.03, () => { ctx.beginPath(); ctx.moveTo(-R * 0.3, -R * 0.98); ctx.quadraticCurveTo(R * 0.05, -R * 0.78, R * 0.42, -R * 0.66); });
    stroke(ctx, light, R * 0.045, () => { ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 0.88, -2.45, -1.85); });
    ctx.restore(); return;
  }
  // bun, ponytail, long: side part with a soft fringe
  const bangs = hair === 'ponytail';
  fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-R * 1.04, R * (hair === 'long' ? 0.35 : 0.1)); ctx.bezierCurveTo(-R * 1.16, -R * 0.85, -R * 0.5, -R * 1.2, R * 0.05, -R * 1.16);
    ctx.bezierCurveTo(R * 0.7, -R * 1.14, R * 1.16, -R * 0.75, R * 1.04, R * (hair === 'long' ? 0.35 : 0.1)); ctx.lineTo(R * 0.92, R * 0.12);
    if (bangs) { // rounded bangs across the forehead
      ctx.quadraticCurveTo(R * 0.92, -R * 0.3, R * 0.7, -R * 0.42);
      const xs = [0.7, 0.36, 0.02, -0.32, -0.66]; for (let i = 0; i < xs.length - 1; i++) { const xa = xs[i] * R, xb = xs[i + 1] * R; ctx.quadraticCurveTo((xa + xb) / 2, -R * 0.24 - (i === 0 ? R * 0.04 : 0), xb, -R * 0.42); }
      ctx.quadraticCurveTo(-R * 0.92, -R * 0.3, -R * 0.92, R * 0.12);
    } else { // side part: fringe sweeps from the part toward the far side
      ctx.quadraticCurveTo(R * 0.9, -R * 0.35, R * 0.62, -R * 0.55); ctx.quadraticCurveTo(R * 0.4, -R * 0.7, R * 0.28, -R * 0.82);
      ctx.bezierCurveTo(R * 0.05, -R * 0.45, -R * 0.5, -R * 0.42, -R * 0.82, -R * 0.2); ctx.quadraticCurveTo(-R * 0.94, -R * 0.05, -R * 0.92, R * 0.12);
    }
    ctx.closePath(); }, hc, { depth: 0.6 });
  if (!bangs) stroke(ctx, dark, R * 0.03, () => { ctx.beginPath(); ctx.moveTo(R * 0.28, -R * 0.84); ctx.bezierCurveTo(R * 0.0, -R * 0.62, -R * 0.4, -R * 0.55, -R * 0.7, -R * 0.36); });
  if (!bangs) stroke(ctx, dark, R * 0.03, () => { ctx.beginPath(); ctx.moveTo(R * 0.36, -R * 0.86); ctx.quadraticCurveTo(R * 0.7, -R * 0.66, R * 0.86, -R * 0.2); });
  if (bangs) stroke(ctx, dark, R * 0.03, () => { ctx.beginPath(); ctx.moveTo(-R * 0.1, -R * 1.02); ctx.quadraticCurveTo(R * 0.05, -R * 0.7, R * 0.18, -R * 0.44); });
  stroke(ctx, light, R * 0.045, () => { ctx.beginPath(); ctx.arc(0, -R * 0.12, R * 0.9, -2.5, -1.95); });
  if (hair === 'long') for (const sx of [-1, 1]) fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(sx * R * 0.92, -R * 0.1); ctx.quadraticCurveTo(sx * R * 1.14, R * 0.6, sx * R * 1.0, R * 1.2); ctx.quadraticCurveTo(sx * R * 0.9, R * 1.3, sx * R * 0.82, R * 1.18); ctx.quadraticCurveTo(sx * R * 0.92, R * 0.55, sx * R * 0.82, -R * 0.05); ctx.closePath(); }, hc, { depth: 0.5 });
  ctx.restore();
}

// ---------- face ----------
function drawFace(ctx, R, mood, st, f, glasses, o) {
  const fx = (o.lookX || 0) * R * 0.1;
  const blink = (Math.sin(st.t * 0.7 + (hash(f.id) % 9)) > 0.985);
  const eyeY = o.kid ? R * 0.02 : -R * 0.04, ex = R * (o.kid ? 0.36 : 0.34), er = R * (o.kid ? 0.115 : 0.095);
  const big = mood === 'wow' || mood === 'scared';
  const ink = C.ink; const pupilShift = (o.lookX || 0) * R * 0.03;
  const browC = o.hairColor === HAIR.grey ? '#9C92A6' : shade(o.hairColor, 0.35);
  // cheeks
  for (const sx of [-1, 1]) {
    const cx = fx + sx * R * 0.56, cy = R * 0.3; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2);
    g.addColorStop(0, alphaOf(C.cheek, 0.5)); g.addColorStop(1, alphaOf(C.cheek, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R * 0.22, cy - R * 0.22, R * 0.44, R * 0.44);
  }
  if (o.freckles) { ctx.save(); ctx.fillStyle = alphaOf(shade(o.skin, 0.35), 0.55); for (const sx of [-1, 1]) for (const [a, b] of [[0.42, 0.2], [0.52, 0.26], [0.62, 0.2]]) { ctx.beginPath(); ctx.arc(fx + sx * R * a, R * b, R * 0.022, 0, 7); ctx.fill(); } ctx.restore(); }
  // eyes
  for (const sx of [-1, 1]) {
    const x = fx + sx * ex, y = eyeY;
    if (mood === 'happy' || mood === 'laugh') { stroke(ctx, ink, R * 0.07, () => { ctx.beginPath(); ctx.arc(x, y + R * 0.05, er * 1.2, Math.PI * 1.12, Math.PI * 1.88); }); continue; }
    if (blink) { stroke(ctx, ink, R * 0.05, () => { ctx.beginPath(); ctx.moveTo(x - er, y + er * 0.2); ctx.quadraticCurveTo(x, y + er * 0.7, x + er, y + er * 0.2); }); continue; }
    if (big) {
      ctx.fillStyle = '#FFFFFF'; ell(ctx, x, y, er * 1.55, er * 1.7); ctx.fill();
      stroke(ctx, alphaOf(ink, 0.35), R * 0.02, () => ell(ctx, x, y, er * 1.55, er * 1.7));
      ctx.fillStyle = ink; ell(ctx, x + pupilShift, y + er * 0.1, er * 0.85, er * 0.95); ctx.fill();
    } else {
      ctx.fillStyle = ink; ell(ctx, x + pupilShift, y, er * 0.92, er * 1.12); ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + pupilShift + er * 0.32, y - er * 0.38, er * 0.34, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + pupilShift - er * 0.3, y + er * 0.4, er * 0.14, 0, 7); ctx.fill();
    if (o.fem) stroke(ctx, ink, R * 0.028, () => { for (const k of [0, 1]) { ctx.moveTo(x + sx * er * (0.7 + k * 0.22), y - er * (0.75 - k * 0.3)); ctx.lineTo(x + sx * er * (1.15 + k * 0.32), y - er * (1.2 - k * 0.35)); } });
  }
  // brows
  const bY = eyeY - R * (o.kid ? 0.27 : 0.25);
  const lift = mood === 'wow' || mood === 'scared' || mood === 'open' ? R * 0.07 : mood === 'happy' || mood === 'laugh' ? R * 0.03 : 0;
  const innerUp = mood === 'sad' || mood === 'worried' || mood === 'scared' ? R * 0.08 : 0;
  const arch = mood === 'neutral' ? R * 0.01 : R * 0.045;
  for (const sx of [-1, 1]) {
    const xo = fx + sx * (ex + R * 0.13), xi = fx + sx * (ex - R * 0.12);
    stroke(ctx, browC, R * 0.055, () => { ctx.beginPath(); ctx.moveTo(xo, bY - lift + R * 0.02); ctx.quadraticCurveTo((xo + xi) / 2, bY - lift - arch - innerUp * 0.4, xi, bY - lift - innerUp); });
  }
  // nose
  ctx.save(); ctx.fillStyle = alphaOf(shade(o.skin, 0.28), 0.7); ell(ctx, fx * 1.7, R * 0.17, R * 0.075, R * 0.055); ctx.fill();
  ctx.fillStyle = alphaOf(tint(o.skin, 0.6), 0.8); ctx.beginPath(); ctx.arc(fx * 1.7 - R * 0.025, R * 0.15, R * 0.02, 0, 7); ctx.fill(); ctx.restore();
  // glasses
  if (glasses) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + sx * ex, eyeY, R * 0.23, 0, 7); ctx.fill(); }
    ctx.restore();
    stroke(ctx, ink, R * 0.045, () => { for (const sx of [-1, 1]) { ctx.moveTo(fx + sx * ex + R * 0.23, eyeY); ctx.arc(fx + sx * ex, eyeY, R * 0.23, 0, Math.PI * 2); } ctx.moveTo(fx - ex + R * 0.23, eyeY - R * 0.02); ctx.quadraticCurveTo(fx, eyeY - R * 0.09, fx + ex - R * 0.23, eyeY - R * 0.02); });
    stroke(ctx, 'rgba(255,255,255,0.8)', R * 0.025, () => { for (const sx of [-1, 1]) { ctx.moveTo(fx + sx * ex - R * 0.12, eyeY - R * 0.1); ctx.lineTo(fx + sx * ex - R * 0.05, eyeY - R * 0.16); } });
  }
  // mouth
  const mx = fx * 1.3, my = R * 0.42; const open = clamp(st.talk || 0);
  const lipDark = '#6E3B57', tongue = '#F28CA6';
  const openMouth = (w, h, teeth) => { ctx.save(); ctx.beginPath(); ctx.ellipse(mx, my, w, h, 0, 0, Math.PI * 2); ctx.fillStyle = lipDark; ctx.fill(); ctx.clip();
    ctx.fillStyle = tongue; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.85, w * 0.75, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    if (teeth) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx - w, my - h, w * 2, h * 0.38); } ctx.restore(); };
  const dShape = (w, h, teeth) => { ctx.save(); ctx.beginPath(); ctx.moveTo(mx - w, my - h * 0.25); ctx.quadraticCurveTo(mx, my - h * 0.05, mx + w, my - h * 0.25); ctx.quadraticCurveTo(mx + w * 0.8, my + h * 1.1, mx, my + h * 1.1); ctx.quadraticCurveTo(mx - w * 0.8, my + h * 1.1, mx - w, my - h * 0.25); ctx.closePath();
    ctx.fillStyle = lipDark; ctx.fill(); ctx.clip(); ctx.fillStyle = tongue; ctx.beginPath(); ctx.ellipse(mx, my + h * 1.05, w * 0.6, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    if (teeth) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx - w, my - h * 0.4, w * 2, h * 0.42); } ctx.restore(); };
  if (open > 0.12) openMouth(R * 0.15, R * (0.05 + 0.13 * open), open > 0.5);
  else if (mood === 'sad') stroke(ctx, ink, R * 0.06, () => { ctx.beginPath(); ctx.moveTo(mx - R * 0.15, my + R * 0.08); ctx.quadraticCurveTo(mx, my - R * 0.06, mx + R * 0.15, my + R * 0.08); });
  else if (mood === 'worried') stroke(ctx, ink, R * 0.05, () => { ctx.beginPath(); ctx.moveTo(mx - R * 0.15, my + R * 0.03); ctx.bezierCurveTo(mx - R * 0.07, my - R * 0.05, mx + R * 0.05, my + R * 0.08, mx + R * 0.15, my - R * 0.01); });
  else if (mood === 'wow' || mood === 'scared' || mood === 'open') openMouth(R * 0.1, R * 0.13, false);
  else if (mood === 'laugh') dShape(R * 0.24, R * 0.2, true);
  else if (mood === 'grin') dShape(R * 0.22, R * 0.14, true);
  else if (mood === 'happy') dShape(R * 0.17, R * 0.13, false);
  else if (mood === 'neutral') stroke(ctx, ink, R * 0.05, () => { ctx.beginPath(); ctx.moveTo(mx - R * 0.1, my + R * 0.02); ctx.quadraticCurveTo(mx, my + R * 0.04, mx + R * 0.1, my + R * 0.02); });
  else stroke(ctx, ink, R * 0.06, () => { ctx.beginPath(); ctx.moveTo(mx - R * 0.18, my - R * 0.04); ctx.quadraticCurveTo(mx, my + R * 0.14, mx + R * 0.18, my - R * 0.04); });
}

export const MOODS = ['smile', 'happy', 'grin', 'laugh', 'open', 'wow', 'sad', 'worried', 'scared', 'neutral'];
export const GESTURES = ['wave', 'point', 'cheer', 'raise', 'shrug', 'think', 'hug'];
