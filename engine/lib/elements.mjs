// Story elements: the knowledge cabinet, node trees, cards, bubbles, stamps, tags, icons, arrows, sparks.
import { C, W, H, GROUND, col, fillShape, rrect, shadow, richText, wrap, measure, font, popScale, hop, smooth, clamp,
  easeOutCubic, easeOutBack, lerp, star5, plain, hash } from './core.mjs';

// ---------- state helpers ----------
export function stateAt(states, t) {
  // states: [{t, state}] sorted; returns {set:Set, since:number, prev:Set}
  let cur = 'normal', since = -1e9, prev = 'normal';
  for (const s of states || []) { if (s.t <= t) { prev = cur; cur = s.state; since = s.t; } }
  const set = new Set(String(cur).split('+'));
  // shake/hop are transient: after 0.7 s fall back to the previous state
  if ((set.has('shake') || set.has('pulse')) && t - since > 0.7) { const p = new Set(String(prev).split('+')); return { set: p, since, prev }; }
  return { set, since };
}

// ---------- layout (static, done once) ----------
export function layoutCabinet(e) {
  const w = e.w ?? 540, rowH = e.rowH ?? 118, gap = e.gap ?? 16, cornice = 34;
  const rows = e.rows || []; const x0 = e.x - w / 2; const y0 = e.y ?? 520;
  const innerW = w - 2 * gap; const rects = {};
  rows.forEach((row, ri) => {
    const n = row.length; const dw = (innerW - (n - 1) * gap) / n; const ry = y0 + cornice + gap + ri * (rowH + gap);
    row.forEach((id, ci) => { rects[id] = { x: x0 + gap + ci * (dw + gap), y: ry, w: dw, h: rowH, owner: e.id, row: ri }; });
  });
  const h = cornice + gap + rows.length * (rowH + gap);
  // like the approved reels: the cabinet stands on short legs, empty shelves fill the space below the drawers
  const legLen = e.legs ?? 64; const full = Math.max(h + 10, (e.ground ?? GROUND) - legLen - y0);
  e._frame = { x: x0, y: y0, w, h: full, content: h, rowH, gap, top: y0 + cornice + gap, rows: rows.length };
  e._rects = rects; return rects;
}

export function layoutTree(e) {
  const w = e.w ?? 900, nodeH = e.nodeH ?? 110, rowGap = e.rowGap ?? 210, y0 = e.y ?? 560; const rects = {};
  (e.levels || []).forEach((lvl, li) => {
    const n = lvl.length; const gap = 26; const nw = Math.min(e.nodeW ?? 380, (w - (n - 1) * gap) / n);
    const total = n * nw + (n - 1) * gap; const xs = e.x - total / 2;
    lvl.forEach((node, ni) => { rects[node.id] = { x: xs + ni * (nw + gap), y: y0 + li * rowGap, w: nw, h: nodeH, owner: e.id, row: li }; });
  });
  e._rects = rects; return rects;
}

export function layoutNode(e) { const w = e.w ?? 300, h = e.h ?? 96; e._rects = { [e.id]: { x: e.x - w / 2, y: e.y - h / 2, w, h, owner: e.id } }; return e._rects; }

// ---------- drawing primitives ----------
function badge(ctx, kind, x, y, r = 30, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  if (kind === 'check') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }, C.paper, { depth: 0.5 });
    ctx.strokeStyle = C.sage; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.36); ctx.lineTo(x + r * 0.5, y - r * 0.34); ctx.stroke();
  } else if (kind === 'cross') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }, C.paper, { depth: 0.5 });
    ctx.strokeStyle = C.rose; ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, 7); ctx.stroke();
    ctx.lineWidth = r * 0.24; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.38, y - r * 0.38); ctx.lineTo(x + r * 0.38, y + r * 0.38); ctx.moveTo(x + r * 0.38, y - r * 0.38); ctx.lineTo(x - r * 0.38, y + r * 0.38); ctx.stroke();
  } else if (kind === 'question') {
    fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }, C.paper, { depth: 0.5 });
    richText(ctx, '?', x, y + r * 0.05, r * 1.4, C.rose);
  }
  ctx.restore();
}

function drawerBox(ctx, r, d, t, st, alphaBase = 1) {
  const S = st.set; const since = st.since;
  let dx = 0, dy = 0, sc = 1, a = alphaBase;
  if (S.has('shake')) dx = Math.sin((t - since) * 40) * 7 * (1 - clamp((t - since) / 0.7));
  if (S.has('open')) dx -= 26 * smooth(since, since + 0.3, t);
  if (S.has('dim')) a *= 0.35;
  if (S.has('heavy')) { dy += 6; }
  if (d._tin !== undefined) { sc = d._tin <= t ? easeOutBack(clamp((t - d._tin) / 0.45), 2.4) : 0; dy -= hop(t, d._tin, 0.5) * 0.6; if (sc <= 0) return; }
  ctx.save(); ctx.globalAlpha *= a;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2; ctx.translate(cx + dx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  if (S.has('glow') || S.has('gold')) {
    const pulse = 0.55 + 0.45 * Math.sin((t - since) * 4);
    ctx.save(); ctx.shadowColor = `rgba(247,201,72,${0.85 * (S.has('glow') ? pulse : 0.6)})`; ctx.shadowBlur = 34; ctx.fillStyle = C.gold; rrect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, Math.min(28, r.h * 0.3)); ctx.fill(); ctx.restore();
  }
  if (S.has('empty')) {
    ctx.save(); ctx.setLineDash([16, 12]); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,53,82,0.55)'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    rrect(ctx, r.x, r.y, r.w, r.h, Math.min(24, r.h * 0.26)); ctx.fill(); ctx.stroke(); ctx.restore();
    const el = d.emptyLabel; richText(ctx, el || '?', r.x + r.w / 2, r.y + r.h / 2, el ? 36 : 60, el ? 'rgba(74,53,82,0.6)' : C.rose);
    ctx.restore(); return;
  }
  const fillC = S.has('heavy') ? '#DCCDE2' : (S.has('red') ? '#F8D3DE' : col(d.color, C.people));
  const cr = Math.min(24, r.h * 0.26);
  fillShape(ctx, () => rrect(ctx, r.x, r.y, r.w, r.h, cr), fillC, { depth: 0.9 });
  // a faint lighter top edge, like the cut edge of paper
  ctx.save(); rrect(ctx, r.x, r.y, r.w, r.h, cr); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(r.x, r.y, r.w, 3); ctx.restore();
  if (S.has('red')) { ctx.save(); ctx.strokeStyle = C.rose; ctx.lineWidth = 5; rrect(ctx, r.x, r.y, r.w, r.h, cr); ctx.stroke(); ctx.restore(); }
  if (S.has('gold')) { ctx.save(); ctx.strokeStyle = C.ochre; ctx.lineWidth = 5; rrect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, cr - 2); ctx.stroke(); ctx.restore(); }
  if (!d.noKnob) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(r.x + r.w - 30, r.y + r.h / 2, 13, 9, 0, 0, 7); }, C.woodDark, { depth: 0.3 });
  const left = d.align === 'left' || !d.noKnob;
  const iconW = d.icon ? 74 : 0;
  const lp = d.size ?? (left ? (r.w < 200 ? 34 : 42) : (r.w < 220 ? 38 : 46));
  const avail = r.w - (left ? 48 : 36) - iconW; let px = lp; while (px > 24 && measure(ctx, d.label || '', px) > avail) px -= 2;
  if (d.sub) {
    const tx = left ? r.x + 24 : r.x + (r.w - iconW) / 2; const al = left ? 'left' : 'center';
    richText(ctx, d.label || '', tx, r.y + r.h * 0.38, px, C.ink, al); richText(ctx, d.sub, tx, r.y + r.h * 0.72, Math.round(px * 0.7), C.plum, al);
  } else if (d.label) {
    if (left) richText(ctx, d.label, r.x + 24, r.y + r.h / 2, px, C.ink, 'left'); else richText(ctx, d.label, r.x + (r.w - iconW) / 2, r.y + r.h / 2, px, C.ink);
  }
  if (d.icon) drawIcon(ctx, { kind: d.icon, x: r.x + r.w - 46, y: r.y + r.h / 2, size: 54, color: d.iconColor }, t);
  if (S.has('check')) badge(ctx, 'check', r.x + r.w - 6, r.y + 8, 26, smooth(since, since + 0.2, t));
  if (S.has('cross')) badge(ctx, 'cross', r.x + r.w - 6, r.y + 8, 26, smooth(since, since + 0.2, t));
  if (S.has('question')) badge(ctx, 'question', r.x + r.w - 6, r.y + 8, 26, smooth(since, since + 0.2, t));
  ctx.restore();
}

export function drawCabinet(ctx, e, t) {
  const f0 = e._frame; const ground = e.ground ?? GROUND; const pad = 14;
  const f = { ...f0, x: f0.x - pad, w: f0.w + pad * 2 }; const legH = Math.max(0, ground - (f.y + f.h));
  const border = 16, rad = 30;
  // legs
  for (const lx of [f.x + 40, f.x + f.w - 70]) fillShape(ctx, () => rrect(ctx, lx, f.y + f.h - 20, 30, legH + 20, 9), C.woodLeg, { depth: 0.6 });
  // frame and the cream inside
  fillShape(ctx, () => rrect(ctx, f.x, f.y, f.w, f.h, rad), C.wood, { depth: 1.2 });
  ctx.save(); const g = ctx.createLinearGradient(0, f.y, 0, f.y + f.h); g.addColorStop(0, '#F8EEDD'); g.addColorStop(1, '#F1E4CE');
  ctx.fillStyle = g; rrect(ctx, f.x + border, f.y + border, f.w - border * 2, f.h - border * 2, rad - 10); ctx.fill(); ctx.restore();
  // shelf boards under every row, then empty shelves further down
  ctx.save(); rrect(ctx, f.x + border, f.y + border, f.w - border * 2, f.h - border * 2, rad - 10); ctx.clip();
  ctx.fillStyle = C.wood; const step = f.rowH + f.gap;
  for (let y = f.top + f.rowH + f.gap / 2 - 3; y < f.y + f.h - border - 20; y += step) { ctx.fillRect(f.x + border, y, f.w - border * 2, 6); ctx.fillStyle = 'rgba(122,79,58,0.10)'; ctx.fillRect(f.x + border, y + 6, f.w - border * 2, 4); ctx.fillStyle = C.wood; }
  ctx.restore();
  if (e.title) richText(ctx, e.title, f.x + f.w / 2, f.y - 46, 44, C.plum);
  if (e.sideLabels) {
    tagPill(ctx, e.sideLabels[0] ?? 'oben', f.x + f.w + 8, f.y + 90, 34, C.ochre, 'left');
    tagPill(ctx, e.sideLabels[1] ?? 'unten', f.x + f.w + 8, f.y + f.content - 60, 34, C.plum, 'left');
  }
  for (const [id, r] of Object.entries(e._rects)) { const d = e.drawers?.[id] || { label: id }; drawerBox(ctx, r, { noKnob: true, align: 'left', ...d }, t, stateAt(d._states, t)); }
}

export function drawTree(ctx, e, t, reg) {
  const nodes = {}; (e.levels || []).forEach(l => l.forEach(n => nodes[n.id] = n));
  for (const L of e.links || []) drawLink(ctx, { ...L, _tin: L._tin ?? e._tin }, t, reg);
  for (const [id, r] of Object.entries(e._rects)) { const n = nodes[id]; drawerBox(ctx, r, { ...n, noKnob: true, color: n.color || 'paper' }, t, stateAt(n._states, t)); }
}
export function drawNode(ctx, e, t) { const r = e._rects[e.id]; drawerBox(ctx, r, { ...e, noKnob: e.knob !== true, color: e.color || 'paper', _tin: undefined }, t, stateAt(e._states, t)); }

export function anchorOf(reg, id, side = 'center', offsets = {}) {
  const r = reg[id]; if (!r) return null; const o = offsets[r.owner] || { x: 0, y: 0 };
  const x = r.x + o.x, y = r.y + o.y;
  if (side === 'top') return { x: x + r.w / 2, y };
  if (side === 'bottom') return { x: x + r.w / 2, y: y + r.h };
  if (side === 'left') return { x, y: y + r.h / 2 };
  if (side === 'right') return { x: x + r.w, y: y + r.h / 2 };
  return { x: x + r.w / 2, y: y + r.h / 2 };
}

export function resolvePoint(p, reg, side, offsets) {
  if (p && typeof p === 'object' && 'x' in p) return p;
  if (typeof p === 'string') return anchorOf(reg, p, side, offsets);
  return null;
}

export function drawLink(ctx, L, t, reg, offsets = {}) {
  if (L._tin !== undefined && t < L._tin) return;
  // Default direction: from the upper item's bottom edge to the lower item's top edge.
  const ra = reg[L.from], rb = reg[L.to]; let a, b, vertical = false;
  if (ra && rb && !L.fromSide && !L.toSide) {
    if (ra.y + ra.h <= rb.y) { a = anchorOf(reg, L.from, 'bottom', offsets); b = anchorOf(reg, L.to, 'top', offsets); vertical = true; }
    else if (rb.y + rb.h <= ra.y) { a = anchorOf(reg, L.from, 'top', offsets); b = anchorOf(reg, L.to, 'bottom', offsets); vertical = true; }
    else if (ra.x < rb.x) { a = anchorOf(reg, L.from, 'right', offsets); b = anchorOf(reg, L.to, 'left', offsets); }
    else { a = anchorOf(reg, L.from, 'left', offsets); b = anchorOf(reg, L.to, 'right', offsets); }
  } else { a = resolvePoint(L.from, reg, L.fromSide || 'bottom', offsets); b = resolvePoint(L.to, reg, L.toSide || 'top', offsets); }
  if (!a || !b) return;
  const prog = L._tin !== undefined ? easeOutCubic((t - L._tin) / 0.6) : 1;
  const style = L.style || 'gold';
  ctx.save(); ctx.lineCap = 'round';
  if (style === 'gold') { ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.setLineDash([1, 15]); shadow(ctx, true, 0.2); }
  else if (style === 'dashed' || style === 'arrow') { ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); }
  else if (style === 'red') { ctx.strokeStyle = C.rose; ctx.lineWidth = 6; ctx.setLineDash([18, 12]); }
  else { ctx.strokeStyle = 'rgba(122,79,138,0.42)'; ctx.lineWidth = 7; ctx.setLineDash([1, 14]); }
  // the path: a soft S-curve between levels (threads), otherwise a gentle bend
  const bend = L.bend ?? 0; let P;
  if (vertical && !bend && style !== 'arrow' && style !== 'dashed' && style !== 'red') {
    const k = (b.y - a.y) * 0.55; const c1 = { x: a.x, y: a.y + k }, c2 = { x: b.x, y: b.y - k };
    P = u => ({ x: (1 - u) ** 3 * a.x + 3 * (1 - u) ** 2 * u * c1.x + 3 * (1 - u) * u * u * c2.x + u ** 3 * b.x, y: (1 - u) ** 3 * a.y + 3 * (1 - u) ** 2 * u * c1.y + 3 * (1 - u) * u * u * c2.y + u ** 3 * b.y });
  } else {
    const cx = (a.x + b.x) / 2 + bend, cy = (a.y + b.y) / 2;
    P = u => ({ x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y });
  }
  const N = 48; ctx.beginPath();
  for (let i = 0; i <= N * prog; i++) { const p = P(i / N); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke(); ctx.setLineDash([]);
  if ((style === 'arrow' || style === 'dashed' || style === 'red' || L.head) && prog > 0.95) {
    const p1 = P(0.97), p2 = P(1); const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(ang - 0.45) * 30, b.y - Math.sin(ang - 0.45) * 30); ctx.lineTo(b.x - Math.cos(ang + 0.45) * 30, b.y - Math.sin(ang + 0.45) * 30); ctx.closePath(); ctx.fill();
  }
  if (L.label && prog > 0.9) { const m = P(0.5); tagPill(ctx, L.label, m.x + 10 + (bend || 0) / 2, m.y, 32, L.labelColor ? col(L.labelColor) : C.plum, 'left'); }
  ctx.restore();
}

export function tagPill(ctx, text, x, y, px = 40, color = C.plum, align = 'center') {
  const w = measure(ctx, text, px) + px * 1.1, h = px * 1.45; const x0 = align === 'left' ? x : x - w / 2;
  fillShape(ctx, () => rrect(ctx, x0, y - h / 2, w, h, h / 2), C.paper, { depth: 0.6 });
  richText(ctx, text, x0 + w / 2, y + 2, px, color);
}

export function drawCard(ctx, e, t) {
  const px = e.size ?? 52; const lines = e.lines || [e.text || '']; const pad = px * 0.7;
  const w = e.w ?? Math.max(...lines.map(l => measure(ctx, l, px))) + pad * 2; const lh = px * 1.28; const h = e.h ?? lines.length * lh + pad * 1.3;
  fillShape(ctx, () => rrect(ctx, e.x - w / 2, e.y - h / 2, w, h, e.radius ?? 34), col(e.color, C.paper), { depth: 1 });
  lines.forEach((l, i) => richText(ctx, l, e.x, e.y - h / 2 + pad * 0.65 + lh / 2 + i * lh, px, i === 1 && e.secondRose ? C.rose : C.ink));
}

export function drawBubble(ctx, e, t, head, pop = 1) {
  const px = e.size ?? 46; const maxW = e.maxW ?? 560; const lines = wrap(ctx, e.text, px, maxW);
  const lh = px * 1.25; const w = Math.max(...lines.map(l => measure(ctx, l, px))) + px * 1.4; const h = lines.length * lh + px * 0.9;
  let x = e.x, y = e.y;
  if ((x === undefined || y === undefined) && head) { const side = e.side ?? (head.x < W / 2 ? 1 : -1); x = head.x + side * (w / 2 + 10); y = head.y - head.r - h / 2 - 40; }
  x = clamp(x, w / 2 + 16, W - w / 2 - 16); y = clamp(y, h / 2 + 420, H - h / 2 - 40);
  ctx.save(); ctx.translate(x, y + h / 2); ctx.scale(pop, pop); ctx.translate(-x, -(y + h / 2));
  ctx.save(); shadow(ctx, true, 0.9); ctx.fillStyle = C.paper; rrect(ctx, x - w / 2, y - h / 2, w, h, 34); ctx.fill();
  if (head && e.tail !== false) { const tx = clamp(head.x, x - w / 2 + 40, x + w / 2 - 40); ctx.beginPath(); ctx.moveTo(tx - 22, y + h / 2 - 4); ctx.lineTo(lerp(tx, head.x, 0.6), head.y - head.r - 8); ctx.lineTo(tx + 22, y + h / 2 - 4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  lines.forEach((l, i) => richText(ctx, l, x, y - h / 2 + px * 0.45 + lh / 2 + i * lh, px, C.ink));
  ctx.restore(); return { x, y, w, h };
}

export function drawThought(ctx, e, t, head) {
  const px = e.size ?? 44; const lines = e.text ? wrap(ctx, e.text, px, e.maxW ?? 520) : [];
  const lh = px * 1.25; const w = lines.length ? Math.max(...lines.map(l => measure(ctx, l, px))) + px * 1.6 : 120; const h = lines.length ? lines.length * lh + px : 90;
  let x = e.x ?? (head ? head.x + (head.x < W / 2 ? 1 : -1) * (w / 2 + 40) : W / 2), y = e.y ?? (head ? head.y - head.r - h / 2 - 110 : 800);
  x = clamp(x, w / 2 + 16, W - w / 2 - 16); y = clamp(y, h / 2 + 420, H - 100);
  if (head) for (let i = 0; i < 3; i++) { const u = (i + 1) / 4; const r = 10 + i * 6; fillShape(ctx, () => { ctx.beginPath(); ctx.arc(lerp(head.x, x, u), lerp(head.y - head.r, y + h / 2, u), r, 0, 7); }, C.paper, { depth: 0.4 }); }
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, w / 2 + 16, h / 2 + 12, 0, 0, 7); }, C.paper, { depth: 0.9 });
  lines.forEach((l, i) => richText(ctx, l, x, y - (lines.length - 1) * lh / 2 + i * lh, px, C.ink));
}

export function drawStamp(ctx, e, t) {
  const px = e.size ?? 58; const w = measure(ctx, e.text, px) + px * 1.2, h = px * 1.6; const since = e._tin ?? 0;
  const slam = t >= since ? lerp(1.7, 1, easeOutBack(clamp((t - since) / 0.3), 1.2)) : 1;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot ?? -0.09); ctx.scale(slam, slam);
  fillShape(ctx, () => rrect(ctx, -w / 2, -h / 2, w, h, 16), 'rgba(255,255,255,0.9)', { depth: 0.6 });
  ctx.strokeStyle = col(e.color, C.rose); ctx.lineWidth = 7; rrect(ctx, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 12); ctx.stroke();
  richText(ctx, e.text, 0, 3, px, col(e.color, C.rose)); ctx.restore();
}

export function drawIcon(ctx, e, t) {
  const k = e.kind, x = e.x, y = e.y, s = e.size ?? 90; const c = e.color ? col(e.color) : null;
  ctx.save();
  switch (k) {
    case 'bulb': {
      const glow = ctx.createRadialGradient(x, y, s * 0.2, x, y, s * 0.9); glow.addColorStop(0, 'rgba(247,201,72,0.55)'); glow.addColorStop(1, 'rgba(247,201,72,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y - s * 0.08, s * 0.38, 0, 7); }, c || C.gold, { depth: 0.6 });
      fillShape(ctx, () => rrect(ctx, x - s * 0.17, y + s * 0.24, s * 0.34, s * 0.24, 6), '#D8D0DC', { depth: 0.3 }); break; }
    case 'check': badge(ctx, 'check', x, y, s / 2); break;
    case 'cross': badge(ctx, 'cross', x, y, s / 2); break;
    case 'question': badge(ctx, 'question', x, y, s / 2); break;
    case 'exclaim': fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 7); }, C.paper, { depth: 0.5 }); richText(ctx, '!', x, y + 2, s * 0.8, C.rose); break;
    case 'heart': fillShape(ctx, () => { const r = s * 0.26; ctx.beginPath(); ctx.moveTo(x, y + s * 0.38); ctx.bezierCurveTo(x - s * 0.6, y - s * 0.05, x - r, y - s * 0.5, x, y - s * 0.18); ctx.bezierCurveTo(x + r, y - s * 0.5, x + s * 0.6, y - s * 0.05, x, y + s * 0.38); }, c || '#F27C9B', { depth: 0.6 }); break;
    case 'star': fillShape(ctx, () => star5(ctx, x, y, s / 2, s / 4.4), c || C.gold, { depth: 0.5 }); break;
    case 'moon': fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s * 0.42, 0.9, 5.4); ctx.arc(x + s * 0.18, y - s * 0.1, s * 0.34, 5.0, 1.2, true); ctx.closePath(); }, c || C.sun, { depth: 0.5 }); break;
    case 'sun': fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, 7); }, c || C.gold, { depth: 0.5 }); ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t * 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.48, y + Math.sin(a) * s * 0.48); ctx.lineTo(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62); ctx.stroke(); } break;
    case 'clock': fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 7); }, C.paper, { depth: 0.6 }); ctx.strokeStyle = C.ink; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.3); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.22, y + s * 0.06); ctx.stroke(); break;
    case 'magnifier': ctx.strokeStyle = C.plum; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round'; shadow(ctx, true, 0.4); ctx.beginPath(); ctx.arc(x - s * 0.08, y - s * 0.08, s * 0.28, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.14); ctx.lineTo(x + s * 0.42, y + s * 0.42); ctx.stroke(); break;
    case 'balloon': fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - s * 0.12, s * 0.32, s * 0.4, 0, 0, 7); }, c || C.rose, { depth: 0.6 }); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + s * 0.28); ctx.quadraticCurveTo(x + 14, y + s * 0.5, x, y + s * 0.75); ctx.stroke(); break;
    case 'plane': fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x + s * 0.45, y - s * 0.3); ctx.lineTo(x + s * 0.1, y + s * 0.35); ctx.lineTo(x, y + s * 0.05); ctx.closePath(); }, c || C.paper, { depth: 0.5 }); break;
    case 'house': fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.05); ctx.lineTo(x, y - s * 0.48); ctx.lineTo(x + s * 0.45, y - s * 0.05); ctx.lineTo(x + s * 0.36, y - s * 0.05); ctx.lineTo(x + s * 0.36, y + s * 0.42); ctx.lineTo(x - s * 0.36, y + s * 0.42); ctx.lineTo(x - s * 0.36, y - s * 0.05); ctx.closePath(); }, c || '#F9C6D3', { depth: 0.6 }); break;
    case 'book': fillShape(ctx, () => rrect(ctx, x - s * 0.42, y - s * 0.3, s * 0.84, s * 0.6, 8), c || C.plum, { depth: 0.5 }); fillShape(ctx, () => rrect(ctx, x - s * 0.36, y - s * 0.24, s * 0.72, s * 0.48, 5), C.paper, { sh: false }); break;
    case 'pencil': ctx.translate(x, y); ctx.rotate(-0.7); fillShape(ctx, () => rrect(ctx, -s * 0.1, -s * 0.45, s * 0.2, s * 0.72, 6), c || C.gold, { depth: 0.5 }); ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.27); ctx.lineTo(s * 0.1, s * 0.27); ctx.lineTo(0, s * 0.48); ctx.closePath(); ctx.fill(); break;
    case 'cloud': fillShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x + s * 0.5, y); ctx.ellipse(x, y, s * 0.5, s * 0.26, 0, 0, Math.PI * 2); ctx.moveTo(x + s * 0.48, y - s * 0.18); ctx.ellipse(x + s * 0.2, y - s * 0.18, s * 0.28, s * 0.24, 0, 0, Math.PI * 2); }, c || C.paper, { depth: 0.5 }); break;
    case 'rain': drawIcon(ctx, { kind: 'cloud', x, y: y - s * 0.15, size: s }, t); ctx.strokeStyle = C.water2; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const o = ((t * 2 + i * 0.3) % 1) * s * 0.3; ctx.beginPath(); ctx.moveTo(x + i * s * 0.22, y + s * 0.1 + o); ctx.lineTo(x + i * s * 0.22 - 6, y + s * 0.22 + o); ctx.stroke(); } break;
    case 'zzz': richText(ctx, 'z z z', x, y, s * 0.5, C.plum); break;
    case 'note': fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x - s * 0.12, y + s * 0.25, s * 0.17, s * 0.13, -0.4, 0, 7); }, c || C.plum, { depth: 0.4 }); ctx.fillStyle = c || C.plum; ctx.fillRect(x + s * 0.02, y - s * 0.4, s * 0.07, s * 0.65); ctx.fillRect(x + s * 0.02, y - s * 0.4, s * 0.3, s * 0.08); break;
    case 'hedgehog': drawHedgehog(ctx, x, y, s, c, e.look === 'left', t); break;
    case 'planet': drawPlanet(ctx, x, y, s, c || '#9FD3E8', !!e.ring, false); break;
    case 'pluto': drawPlanet(ctx, x, y, s, c || '#E8D3C0', false, true); break;
    case 'lemon': drawLemon(ctx, x, y, s, c); break;
    case 'bottle': drawBottle(ctx, x, y + s * 0.48, s * 0.42, s * 0.96, c); break;
    case 'cashew': drawCashew(ctx, x - s * 0.16, y - s * 0.04, s * 0.95, -0.5, c || '#E6C38C', true); drawCashew(ctx, x + s * 0.2, y + s * 0.12, s * 0.8, 0.9, c || '#E6C38C', true); break;
    default: throw new Error(`Unbekanntes Icon: ${k}`);
  }
  ctx.restore();
}
export const ICON_KINDS = ['bulb', 'check', 'cross', 'question', 'exclaim', 'heart', 'star', 'moon', 'sun', 'clock', 'magnifier', 'balloon', 'plane', 'house', 'book', 'pencil', 'cloud', 'rain', 'zzz', 'note', 'hedgehog', 'planet', 'pluto', 'lemon', 'bottle', 'cashew'];

// A paper-cut cashew: a thick beige crescent with round ends (s = size, rot = rotation), optional light cut layer.
export function drawCashew(ctx, x, y, s, rot = 0, c, cut = false) {
  const m = s * 0.3, th = s * 0.26, a0 = -0.2 * Math.PI + rot, a1 = 0.95 * Math.PI + rot;
  const path = (mm, tt) => {
    ctx.beginPath(); ctx.arc(x, y, mm + tt / 2, a0, a1);
    ctx.arc(x + mm * Math.cos(a1), y + mm * Math.sin(a1), tt / 2, a1, a1 + Math.PI);
    ctx.arc(x, y, mm - tt / 2, a1, a0, true);
    ctx.arc(x + mm * Math.cos(a0), y + mm * Math.sin(a0), tt / 2, a0 + Math.PI, a0 + 2 * Math.PI); ctx.closePath();
  };
  fillShape(ctx, () => path(m, th), c || '#EFD8AE', { depth: cut ? 0.5 : 0.25 });
  if (cut) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; path(m + th * 0.18, th * 0.32); ctx.fill(); ctx.restore(); }
}

// A paper-cut lemon: pale yellow oval with two small tips, a lighter cut layer, three pores and a mint leaf.
function drawLemon(ctx, x, y, s, c) {
  const rx = s * 0.37, ry = s * 0.28, rot = -0.12, tr = s * 0.085;
  const lx = x - rx * Math.cos(rot), ly = y - rx * Math.sin(rot), qx = x + rx * Math.cos(rot), qy = y + rx * Math.sin(rot);
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x + s * 0.1, y - s * 0.28, s * 0.17, s * 0.075, -0.55, 0, Math.PI * 2); }, '#8FCB9B', { depth: 0.4 });
  const body = () => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    for (const [cx, cy] of [[lx, ly], [qx, qy]]) { ctx.moveTo(cx + tr * Math.cos(rot), cy + tr * Math.sin(rot)); ctx.ellipse(cx, cy, tr, tr * 0.7, rot, 0, Math.PI * 2); }
  };
  fillShape(ctx, body, c || '#F6DD72', { depth: 0.6 });
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.34)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - ry * 0.42, rx * 0.62, ry * 0.42, rot, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(184,134,11,0.22)';
  for (const [ox, oy] of [[0.25, 0.3], [0.45, 0.05], [-0.05, 0.5]]) { ctx.beginPath(); ctx.arc(x + ox * rx, y + oy * ry, Math.max(1.5, s * 0.018), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// A paper-cut bottle standing on `base`: pale glass body with shoulders, neck, cork, a white label (optional text) and a light stripe.
export function drawBottle(ctx, cx, base, w, h, c, text, px) {
  const bodyH = h * 0.6, neckW = w * 0.4, neckTop = base - h * 0.88, r = w * 0.2, sh = base - bodyH;
  fillShape(ctx, () => {
    ctx.beginPath(); ctx.moveTo(cx - neckW / 2, neckTop); ctx.lineTo(cx - neckW / 2, sh - h * 0.07);
    ctx.quadraticCurveTo(cx - w / 2, sh - h * 0.02, cx - w / 2, sh + h * 0.1); ctx.lineTo(cx - w / 2, base - r);
    ctx.quadraticCurveTo(cx - w / 2, base, cx - w / 2 + r, base); ctx.lineTo(cx + w / 2 - r, base);
    ctx.quadraticCurveTo(cx + w / 2, base, cx + w / 2, base - r); ctx.lineTo(cx + w / 2, sh + h * 0.1);
    ctx.quadraticCurveTo(cx + w / 2, sh - h * 0.02, cx + neckW / 2, sh - h * 0.07); ctx.lineTo(cx + neckW / 2, neckTop); ctx.closePath();
  }, c || '#CFE6C8', { depth: 0.6 });
  fillShape(ctx, () => rrect(ctx, cx - neckW * 0.62, neckTop - h * 0.11, neckW * 1.24, h * 0.13, Math.max(3, w * 0.06)), C.woodDark, { depth: 0.4 });
  const lh = bodyH * 0.44, ly = base - bodyH * 0.78;
  fillShape(ctx, () => rrect(ctx, cx - w * 0.4, ly, w * 0.8, lh, Math.max(3, w * 0.07)), C.paper, { sh: false });
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; rrect(ctx, cx - w * 0.38, sh + h * 0.06, w * 0.09, bodyH * 0.2, w * 0.04); ctx.fill(); ctx.restore();
  if (text) richText(ctx, text, cx, ly + lh / 2, px || Math.round(w * 0.3), C.ink);
}

// A paper-cut planet: pastel disc with a lighter cut layer top-left and a soft spot; optional ring; Pluto gets its pale heart.
function drawPlanet(ctx, x, y, s, c, ring, heart) {
  const r = s * 0.42;
  const ringPath = (front) => { ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.42, -0.25, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); };
  if (ring) { ctx.save(); ctx.strokeStyle = C.plum; ctx.globalAlpha *= 0.55; ctx.lineWidth = Math.max(3, s * 0.07); ctx.lineCap = 'round'; ringPath(false); ctx.stroke(); ctx.restore(); }
  fillShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }, c, { depth: 0.6 });
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.42, r * 0.78, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(74,53,82,0.10)'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.42, r * 0.38, r * 0.18, -0.35, 0, 7); ctx.fill();
  if (heart) {
    const hx = x + r * 0.12, hy = y + r * 0.08, hs = r * 0.95, hr = hs * 0.26;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(hx, hy + hs * 0.38);
    ctx.bezierCurveTo(hx - hs * 0.6, hy - hs * 0.05, hx - hr, hy - hs * 0.5, hx, hy - hs * 0.18);
    ctx.bezierCurveTo(hx + hr, hy - hs * 0.5, hx + hs * 0.6, hy - hs * 0.05, hx, hy + hs * 0.38); ctx.fill();
  }
  ctx.restore();
  if (ring) { ctx.save(); ctx.strokeStyle = C.plum; ctx.globalAlpha *= 0.7; ctx.lineWidth = Math.max(3, s * 0.07); ctx.lineCap = 'round'; ringPath(true); ctx.stroke(); ctx.restore(); }
}

// A paper-cut hedgehog: spiky brown dome, cream face cone, dot eye, pink cheek, standing on y + 0.3 s. Faces right unless flipped.
function drawHedgehog(ctx, x, y, s, c, flip, t) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  const breathe = 1 + Math.sin((t || 0) * 2.2) * 0.012; ctx.scale(breathe, 1 / breathe);
  const base = s * 0.3;
  // little feet
  for (const fx of [-0.26, 0.12]) fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(fx * s, base - s * 0.02, s * 0.08, s * 0.05, 0, 0, 7); }, '#8E6A50', { depth: 0.3 });
  // spiky back: zigzag along a dome from the tail to the neck
  fillShape(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-s * 0.5, base);
    const n = 17, cx = -s * 0.06, rx = s * 0.46, ry = s * 0.5;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI * 0.82; const k = i % 2 ? 1.17 : 0.97;
      ctx.lineTo(cx + Math.cos(a) * rx * k, base - 0.02 * s + Math.sin(a) * ry * k);
    }
    ctx.lineTo(s * 0.3, base); ctx.closePath();
  }, c || '#A9805F', { depth: 0.7 });
  // inner lighter spikes for the paper layer look
  fillShape(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-s * 0.38, base - s * 0.04);
    const n = 13, cx = -s * 0.06, rx = s * 0.33, ry = s * 0.36;
    for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI * 0.8; const k = i % 2 ? 1.12 : 0.96; ctx.lineTo(cx + Math.cos(a) * rx * k, base - 0.04 * s + Math.sin(a) * ry * k); }
    ctx.closePath();
  }, '#C49A76', { sh: false });
  // face cone pointing forward
  fillShape(ctx, () => {
    ctx.beginPath(); ctx.moveTo(s * 0.12, base - s * 0.36);
    ctx.quadraticCurveTo(s * 0.42, base - s * 0.3, s * 0.6, base - s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, base + s * 0.01, s * 0.12, base); ctx.closePath();
  }, '#F1D6B8', { depth: 0.5 });
  // nose, eye, cheek, ear
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(s * 0.6, base - s * 0.1, s * 0.045, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.33, base - s * 0.2, s * 0.03, 0, 7); ctx.fill();
  ctx.fillStyle = C.cheek; ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.ellipse(s * 0.34, base - s * 0.09, s * 0.05, s * 0.032, 0, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.7;
  fillShape(ctx, () => { ctx.beginPath(); ctx.ellipse(s * 0.17, base - s * 0.33, s * 0.05, s * 0.06, -0.3, 0, 7); }, '#E2BC98', { sh: false });
  ctx.restore();
}

export function drawSparks(ctx, x, y, t, t0, scale = 1) {
  const u = (t - t0) / 0.55; if (u < 0 || u > 1) return;
  ctx.save(); ctx.strokeStyle = C.gold; ctx.lineCap = 'round'; ctx.globalAlpha *= 1 - u; ctx.lineWidth = 9 * scale;
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9 + 0.3; const r1 = (40 + 80 * easeOutCubic(u)) * scale, r2 = r1 + 34 * scale * (1 - u * 0.5);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke(); }
  ctx.restore();
}
