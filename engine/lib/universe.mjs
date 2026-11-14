// "Powers of ten" zoom between the universe and the scene, in the brand's night-lilac paper style.
import { W, H, C, rng, smooth, clamp, lerp, fillShape, rrect, star5 } from './core.mjs';

const F = 14; // zoom factor between two levels
const CX = W / 2, CY = H / 2;

const STARS = (() => { const r = rng(11); return Array.from({ length: 420 }, () => ({ x: (r() - 0.5) * W * 1.6, y: (r() - 0.5) * H * 1.6, r: 1 + r() * 2.6, a: 0.4 + r() * 0.6, tw: r() * 6.28 })); })();
const FAR_GAL = (() => { const r = rng(5); return Array.from({ length: 7 }, (_, i) => ({ x: (r() - 0.5) * W * 1.3, y: (r() - 0.5) * H * 1.3, s: 30 + r() * 50, rot: r() * 3, c: ['#F4C6D8', '#D9C6F0', '#CFE3F2'][i % 3] })).filter(g => Math.hypot(g.x, g.y) > 260); })();
const ARMS = (() => { const r = rng(21); const pts = []; for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 360; i++) { const u = i / 360; const ang = arm * 2.094 + u * 7.5; const rad = 30 + u * 760; const j = (r() - 0.5) * 70 * (0.4 + u); pts.push({ x: Math.cos(ang) * rad + j, y: Math.sin(ang) * rad * 0.62 + j * 0.6, r: 1.5 + r() * 3.5, c: ['#FFFFFF', '#F9C6D3', '#D9C6F0', '#FDE7A6'][Math.floor(r() * 4)], a: 0.35 + r() * 0.6 }); } return pts; })();

function bgNight(ctx, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.uni1); g.addColorStop(1, C.uni2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

function lvlUniverse(ctx, sc, t) {
  for (const s of STARS) { const x = CX + s.x * sc, y = CY + s.y * sc; if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(t * 2 + s.tw)); ctx.fillStyle = '#FFF8EE'; ctx.beginPath(); ctx.arc(x, y, s.r * Math.min(3, Math.sqrt(sc)), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const g of FAR_GAL) { const x = CX + g.x * sc, y = CY + g.y * sc, s = g.s * sc; ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(x, y); ctx.rotate(g.rot + t * 0.02); const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, s); gr.addColorStop(0, g.c); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 7); ctx.fill(); ctx.restore(); }
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
  // the scene as a growing circular window
  const d = Z - 4; if (d > -1.05) {
    const sc = Math.pow(F, d); const a = smooth(-1.0, -0.65, d);
    const w = smooth(-0.6, 0, d); const px = lerp(CX, focus.x, w), py = lerp(CY, focus.y, w);
    const maxR = Math.hypot(W, H); const rad = lerp(30 * sc * 14 / 14, maxR, smooth(-0.55, -0.02, d));
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(px, py, Math.max(4, rad * (d < -0.5 ? 1 : 1)), 0, 7); ctx.clip();
    ctx.translate(px, py); ctx.scale(sc, sc); ctx.translate(-focus.x, -focus.y); ctx.drawImage(sceneCanvas, 0, 0); ctx.restore();
  }
}

// Gentle life in the universe while cards are shown.
export function universeIdle(ctx, t) { bgNight(ctx, 1); lvlUniverse(ctx, 1 + 0.02 * Math.sin(t * 0.3), t); }
