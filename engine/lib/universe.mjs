// "Powers of ten" zoom between the universe and the scene, in the brand's night-lilac paper style.
import { W, H, C, rng, smooth, clamp, lerp, fillShape, rrect, star5, easeInOutCubic } from './core.mjs';

const F = 14; // zoom factor between two levels
const CX = W / 2, CY = H / 2;

const STARS = (() => { const r = rng(11); return Array.from({ length: 420 }, () => ({ x: (r() - 0.5) * W * 1.6, y: (r() - 0.5) * H * 1.6, r: 1 + r() * 2.6, a: 0.4 + r() * 0.6, tw: r() * 6.28 })); })();
const FAR_GAL = (() => { const r = rng(5); return Array.from({ length: 7 }, (_, i) => ({ x: (r() - 0.5) * W * 1.3, y: (r() - 0.5) * H * 1.3, s: 30 + r() * 50, rot: r() * 3, c: ['#F4C6D8', '#D9C6F0', '#CFE3F2'][i % 3] })).filter(g => Math.hypot(g.x, g.y) > 260); })();
const ARMS = (() => { const r = rng(21); const pts = []; for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 360; i++) { const u = i / 360; const ang = arm * 2.094 + u * 7.5; const rad = 30 + u * 760; const j = (r() - 0.5) * 70 * (0.4 + u); pts.push({ x: Math.cos(ang) * rad + j, y: Math.sin(ang) * rad * 0.62 + j * 0.6, r: 1.5 + r() * 3.5, c: ['#FFFFFF', '#F9C6D3', '#D9C6F0', '#FDE7A6'][Math.floor(r() * 4)], a: 0.35 + r() * 0.6 }); } return pts; })();

function bgNight(ctx, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.uni1); g.addColorStop(1, C.uni2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

const PAPER_STARS = (() => { const r = rng(17); return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * W * 1.25, y: (r() - 0.5) * H * 1.15, s: 9 + r() * 20, rot: r() * 6.28, sp: (r() - 0.5) * 0.4, tw: r() * 6.28, c: ['#FDE7A6', '#FFF8EE', '#F7C948', '#F9C6D3'][Math.floor(r() * 4)] })).filter(p => Math.hypot(p.x, p.y + 330) > 230); })();
const PLANETS = [{ x: -330, y: 520, r: 46, c: '#F9C6D3', ring: '#FDE7A6' }, { x: 360, y: 300, r: 30, c: '#CFE3F2', ring: null }, { x: -380, y: -150, r: 20, c: '#D9C6F0', ring: null }];

function lvlUniverse(ctx, sc, t) {
  for (const s of STARS) { const x = CX + s.x * sc, y = CY + s.y * sc; if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(t * 2 + s.tw)); ctx.fillStyle = '#FFF8EE'; ctx.beginPath(); ctx.arc(x, y, s.r * Math.min(3, Math.sqrt(sc)), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const g of FAR_GAL) { const x = CX + g.x * sc, y = CY + g.y * sc, s = g.s * sc; ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(x, y); ctx.rotate(g.rot + t * 0.02); const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, s); gr.addColorStop(0, g.c); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 7); ctx.fill(); ctx.restore(); }
  // paper planets and paper stars that drift past as we fly in
  for (const p of PLANETS) { const x = CX + p.x * sc, y = CY + p.y * sc, r = p.r * sc; if (x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) continue;
    if (p.ring) { ctx.save(); ctx.strokeStyle = p.ring; ctx.lineWidth = Math.max(2, r * 0.16); ctx.globalAlpha *= 0.9; ctx.beginPath(); ctx.ellipse(x, y, r * 1.75, r * 0.5, -0.35, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke(); ctx.restore(); }
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }, p.c, { depth: 0.6 });
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); ctx.fill(); ctx.restore();
    if (p.ring) { ctx.save(); ctx.strokeStyle = p.ring; ctx.lineWidth = Math.max(2, r * 0.16); ctx.beginPath(); ctx.ellipse(x, y, r * 1.75, r * 0.5, -0.35, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); ctx.restore(); } }
  for (const p of PAPER_STARS) { const x = CX + p.x * sc, y = CY + p.y * sc; const r = p.s * Math.min(4, sc) * (0.9 + 0.12 * Math.sin(t * 2.4 + p.tw));
    if (x < -r || x > W + r || y < -r || y > H + r) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + t * p.sp); fillShape(ctx, () => star5(ctx, 0, 0, r, r * 0.46), p.c, { depth: 0.4 }); ctx.restore(); }
}

function lvlGalaxy(ctx, sc, t) {
  const ox = -230, oy = -170; ctx.save(); ctx.translate(CX + ox * sc, CY + oy * sc); ctx.rotate(t * 0.03);
  const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 190 * sc); core.addColorStop(0, 'rgba(253,231,166,0.95)'); core.addColorStop(0.4, 'rgba(244,198,216,0.45)'); core.addColorStop(1, 'rgba(217,198,240,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 190 * sc, 0, 7); ctx.fill();
  for (const p of ARMS) { const x = p.x * sc, y = p.y * sc; ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, p.r * Math.min(2.5, Math.sqrt(sc)), 0, 7); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1;
  // our sun: a golden dot at the centre
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(CX, CY, Math.max(2, 5 * sc), 0, 7); ctx.fill();
}

function lvlSolar(ctx, sc, t) {
  const sx = CX - 300 * sc, sy = CY - 420 * sc; const R = Math.hypot(300, 420) * sc;
  const glow = ctx.createRadialGradient(sx, sy, 10 * sc, sx, sy, 260 * sc); glow.addColorStop(0, 'rgba(253,231,166,0.9)'); glow.addColorStop(1, 'rgba(253,231,166,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 260 * sc, 0, 7); ctx.fill();
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(sx, sy, 90 * sc, 0, 7); }, C.gold, { depth: 0.5 });
  const orbits = [0.38, 0.66, 1.0, 1.42, 1.9];
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = Math.max(1.5, 3 * Math.min(2, sc));
  for (const o of orbits) { ctx.beginPath(); ctx.arc(sx, sy, R * o, 0, 7); ctx.stroke(); }
  const pl = [[0.38, 1.6, '#F4C6D8', 12], [0.66, 0.3, '#FDE2C6', 18], [1.42, 2.4, '#F2A98E', 15], [1.9, 1.0, '#D9C6F0', 30]];
  for (const [o, a, c, r] of pl) { const ang = a + t * 0.05 / o; fillShape(ctx, () => { ctx.beginPath(); ctx.arc(sx + Math.cos(ang) * R * o, sy + Math.sin(ang) * R * o, r * sc, 0, 7); }, c, { depth: 0.3 }); }
  // the earth sits on the third orbit, exactly in the middle of the screen
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(CX, CY, 27 * sc, 0, 7); }, C.water1, { depth: 0.3 });
}

function lvlEarth(ctx, sc, t) {
  const R = 380 * sc; ctx.save();
  const halo = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.25); halo.addColorStop(0, 'rgba(207,232,245,0.6)'); halo.addColorStop(1, 'rgba(207,232,245,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, R * 1.25, 0, 7); ctx.fill();
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); }, C.water1, { depth: 0.6 });
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.clip();
  const rot = t * 8 * sc;
  const blobs = [[-0.42, -0.5, 0.36, 0.26], [0.05, -0.12, 0.3, 0.38], [0.42, 0.34, 0.32, 0.22], [-0.5, 0.42, 0.26, 0.2], [0.1, 0.62, 0.2, 0.12]];
  for (const [bx, by, bw, bh] of blobs) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(CX + bx * R + (rot % (R * 0.2)) * 0, CY + by * R, bw * R, bh * R, bx, 0, 7); }, '#A9DCC3', { depth: 0.4 });
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (const [cx, cy, w] of [[-0.2, -0.3, 0.3], [0.3, 0.1, 0.24], [-0.1, 0.45, 0.28]]) { ctx.beginPath(); ctx.ellipse(CX + cx * R, CY + cy * R, w * R, w * R * 0.18, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // the place we are heading to
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(CX, CY, Math.max(3, 22 * sc / 14 * 14 / 14), 0, 7); }, '#86C9AA', { depth: 0.3 });
}

const LEVELS = [lvlUniverse, lvlGalaxy, lvlSolar, lvlEarth];
export const ZMAX = 4;

// Draw the zoom state Z in [0, 4]: 0 = universe, 4 = the scene at full size.
// drawScene(ctx) paints the scene at native size; focus = scene point to zoom into.
export function drawZoom(ctx, Z, t, sceneCanvas, focus = { x: CX, y: CY }) {
  Z = clamp(Z, 0, ZMAX);
  bgNight(ctx, 1);
  for (let i = 0; i < LEVELS.length; i++) {
    const d = Z - i; if (d < -1.05 || d > 1.0) continue;
    const sc = Math.pow(F, d);
    const a = Math.min(smooth(-1.0, -0.6, d), 1 - smooth(0.55, 0.95, d)); if (a <= 0.001) continue;
    ctx.save(); ctx.globalAlpha = a; LEVELS[i](ctx, sc, t); ctx.restore();
  }
  // into the scene: paper clouds rush past, then the camera tilts down from the evening sky onto the stage
  const d = Z - 4;
  if (d > -0.52) {
    const u = easeInOutCubic(smooth(-0.5, 0, d)); const a = smooth(-0.52, -0.44, d);
    const dy = (1 - u) * 1750; const sc = 1 + 0.1 * (1 - u);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(CX, CY); ctx.scale(sc, sc); ctx.translate(-CX, -CY + dy);
    skyAbove(ctx, t); ctx.drawImage(sceneCanvas, 0, 0); ctx.restore();
  }
  const cover = smooth(-0.78, -0.52, d) * (1 - smooth(-0.5, -0.3, d));
  if (cover > 0.001) cloudRush(ctx, clamp((d + 0.8) / 0.55), cover);
}

// The sky above the stage: dusky lilac high up, the stage's rosy sky further down, a few clouds and the last stars.
function skyAbove(ctx, t) {
  const top = -1900; const g = ctx.createLinearGradient(0, top, 0, 0);
  g.addColorStop(0, '#8F72A6'); g.addColorStop(0.45, '#D9B6CF'); g.addColorStop(1, C.skyTop);
  ctx.fillStyle = g; ctx.fillRect(-200, top, W + 400, -top + 2);
  const r = rng(29); ctx.save(); ctx.fillStyle = '#FFF8EE';
  for (let i = 0; i < 40; i++) { const x = r() * W, y = top + r() * 800; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 2 + i); ctx.beginPath(); ctx.arc(x, y, 1.5 + r() * 2.5, 0, 7); ctx.fill(); }
  ctx.restore();
  for (const [x, y, s] of [[180, -1250, 1.3], [820, -980, 1.0], [360, -620, 1.5], [900, -330, 1.2]]) paperCloud(ctx, x, y, s, 0.95);
}

function paperCloud(ctx, x, y, s, a = 1) {
  fillShape(ctx, () => { ctx.beginPath(); for (const [ox, oy, rx, ry] of [[0, 0, 110, 46], [70, -26, 72, 52], [-72, -10, 60, 38], [10, -40, 60, 44]]) { ctx.moveTo(x + (ox + rx) * s, y + oy * s); ctx.ellipse(x + ox * s, y + oy * s, rx * s, ry * s, 0, 0, Math.PI * 2); } }, `rgba(255,255,255,${a})`, { depth: 0.6 });
}

// Big paper clouds that grow past the camera and hide the change from the planet to the sky.
const RUSH = (() => { const r = rng(41); return Array.from({ length: 14 }, () => { const ang = r() * 6.28; const dist = 0.15 + r() * 0.55; return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 1.4, s: 0.8 + r() * 1.2, k: r() * 0.35 }; }); })();
function cloudRush(ctx, p, a) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(255,244,240,0.96)'; ctx.fillRect(0, 0, W, H);
  for (const c of RUSH) { const g = Math.pow(7, clamp(p * 1.3 - c.k)); const x = CX + c.x * W * g, y = CY + c.y * W * g; paperCloud(ctx, x, y, c.s * g * 1.3, 1); }
  ctx.restore();
}

// Gentle life in the universe while cards are shown.
export function universeIdle(ctx, t) { bgNight(ctx, 1); lvlUniverse(ctx, 1 + 0.02 * Math.sin(t * 0.3), t); }
