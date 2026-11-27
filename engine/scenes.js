// ===== 21Resell Mindset — data-driven scene engine (same look as the hand-made series) =====
// window.SCRIPT (from script.js) + window.VO (scene windows from voice) -> SCENE_FN
const SC = window.SCRIPT || { scenes: [] };
const SCN = SC.scenes;
const LBL = Object.assign({ day: 'day', today: 'TODAY', total: 'TOTAL', incoming: 'Incoming payment', sold: 'Sold!', footnote: '' }, SC.labels || {});
const Lw = buildLines(SCN.map(s => s.say || ''));
const S = i => Lw[i].s, E = i => Lw[i].e;
const LAST = SCN.length - 1;
const END = E(LAST) + (SC.tail || 1.5); window.DUR = END;
const COL = c => c === 'p' ? PURL : c === 'r' ? '#FF6B8A' : c === 'g' ? '#7CF2B0' : c === 'b' ? '#3FD9E0' : undefined;
const PRICE = v => (window.LANG === 'en' ? '£' : '') + fmtAll(Math.round(v)) + (window.LANG === 'en' ? '' : ' zł');

// ---------- title: phrases -> 1..3 lines, auto size to fit 940px ----------
function titleLines(title, maxW = 800, maxSize = 96, minSize = 48, maxLines = 2) {
  const words = []; (title || []).forEach(([txt, c]) => String(txt).split(' ').filter(Boolean).forEach(w => words.push([w.toUpperCase(), COL(c)])));
  if (!words.length) return { lines: [], size: 0 };
  const width = (ws, s) => ws.reduce((a, [w]) => a + TW(ctx, w, s, 'POPB', s * .13), 0) + (ws.length - 1) * s * .32;
  for (let s = maxSize; s >= minSize; s -= 4) {
    const ph = (title || []).map(([txt, c]) => String(txt).split(' ').filter(Boolean).map(w => [w.toUpperCase(), COL(c)]));
    if (width(words, s) <= maxW) return { lines: [words], size: s };
    if (ph.length >= 2 && ph.length <= maxLines && ph.every(l => width(l, s) <= maxW)) return { lines: ph, size: s };
    for (let n = 2; n <= maxLines; n++) {
      if (words.length < n) break;
      // greedy balanced split into n lines
      const target = width(words, s) / n; const lines = [[]]; let cur = 0;
      words.forEach(w => { const ww = width([w], s); if (lines[lines.length - 1].length && cur + ww > target * 1.08 && lines.length < n) { lines.push([]); cur = 0; } lines[lines.length - 1].push(w); cur += ww + s * .32; });
      if (lines.every(l => width(l, s) <= maxW)) return { lines, size: s };
    }
  }
  return { lines: [words], size: minSize };
}
function drawTitle(lt, title, y0 = 470, opts = {}) {
  const { lines, size } = titleLines(title, opts.maxW, opts.maxSize, opts.minSize, opts.maxLines);
  lines.forEach((ln, i) => capsWords(ln.map(([w, c]) => [w, c]), CX, y0 + i * size * 1.18, size, lt - i * .22, .09));
  return y0 + (lines.length - 1) * size * 1.18 + size * .6;
}

// ---------- item drawing ----------
function drawItem(kind, x, y, s, a = 1, rot = 0, col) {
  if (kind === 'jacket' || kind === 'coat') return jacket(x, y, s * .7, a, col || WH, rot);
  if (kind === 'gift') return gift(x, y, s * .8, a);
  if (kind === 'bag') return bag(x, y, s * .8, a, col || WH);
  if (kind === 'parcel') return parcel(x, y + 45 * s, s * 1.2, a, col || WH, col === PUR);
  if (kind === 'tee') return teeLine(x, y, s * .55, a, col || PURL);
  return jumper(x, y, s, a, { rot });
}

// ---------- visuals ----------
const VIS = {
  none() {},
  crowd(lt, d, v) { const n = v.n || 15, cols = Math.min(5, n), rows = Math.ceil(n / cols), hl = v.highlight ?? -1, dim = v.dim ? eIOC(P(lt, 0, .6)) : 0;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), x = CX - (cols - 1) * 95 + c * 190, y = 1020 + r * 220 - (rows - 1) * 60, me = i === hl;
      person(x, y, .6, eOC(P(lt, .03 * i, .03 * i + .3)) * (me ? 1 : 1 - dim * .85), me ? { col: v.meCol === 'grey' ? '#9a9aa6' : PURXL, glowCol: PUR } : {});
      if (v.money && !me) moneyUp(x, y - 170, lt + i * .37, .9 * (1 - dim * .8), [(v.sign || '+') + PRICE(v.amounts ? v.amounts[i % v.amounts.length] : 20 + (i * 13) % 40)], v.sign === '−' ? '#FF8FA3' : '#7CF2B0'); }
    if (hl >= 0 && v.spotlight !== false) { const c = hl % cols, r = Math.floor(hl / cols); spotlight(CX - (cols - 1) * 95 + c * 190, 300, 1020 + r * 220 - (rows - 1) * 60 + 20, 80, 260, Math.max(dim, v.dim ? 0 : .7)); } },
  couch(lt) { winWindow(CX + 250, 860, 300, 360, lt, 1); couch(CX - 40, 1380, 1.15, lt); },
  spot(lt, d, v) { spotlight(CX, 300, 1450, 90, 460, .6); stick(CX, 1450, 1.3, v.pose || 'stand', 1, v.grey ? '#9a9aa6' : v.purple ? PURXL : WH, v.walk ? lt * 8 : 0); },
  walk(lt, d, v) { ground(1450, 80, W - 80, 1, true, 1); const x = 200 + lt * (v.speed || 300); stick(Math.min(x, 900), 1450, 1.2, 'stand', 1, v.grey ? '#9a9aa6' : PURXL, lt * 12); },
  item(lt, d, v) { drawItem(v.item || 'jumper', CX, 1000, 1.8, eOC(P(lt, 0, .4)), Math.sin(lt * 1.6) * .05); if (v.price != null) pricePill(PRICE(v.price), CX, 1320, eOC(P(lt, .3, .6)), 70, !!v.purple); },
  flip(lt, d, v) { const item = v.item || 'jumper'; drawItem(item, 330, 1000, 1.15, 1); if (v.buy != null) pricePill(PRICE(v.buy), 330, 780, eOC(P(lt, .05, .3)), 46, false);
    arrowLine(460, 1000, 740, 1000, eOC(P(lt, .15, .6)), .8, WH, -170); vtile(780, 1000, 200, eOC(P(lt, .2, .5)));
    const k = d * .45; bigNum(PRICE(v.sell), CX, 1360, 170 * lerp(1.2, 1, eOQ(P(lt, k, k + .3))), eOC(P(lt, k, k + .2)));
    if (v.profit) mpill('+' + PRICE(v.sell - v.buy) + ' ' + (v.profitLabel || 'profit'), CX, 1500, eOC(P(lt, k + .3, k + .6)), 30, false, PUR); },
  items(lt, d, v) { const n = Math.min(v.n || 3, 6), item = v.item || 'jumper', gap = n > 3 ? 180 : 300, sc = n > 3 ? .7 : 1.05;
    for (let k = 0; k < n; k++) { const p = eOB(P(lt, .05 + k * .14, .4 + k * .14), 1.7), x = CX - (n - 1) * gap / 2 + k * gap; drawItem(item, x, 1000, sc * clamp(p * 1.2), clamp(p * 2), (k - (n - 1) / 2) * .06); if (v.tag) pricePill(v.tag, x, 1200, eOC(P(lt, .3 + k * .14, .6 + k * .14)), 32, true); } },
  icons(lt, d, v) { const L = v.list || ['jacket', 'jumper', 'gift'], n = L.length, gap = 300;
    L.forEach((k, i) => { const x = CX - (n - 1) * gap / 2 + i * gap, p = eOB(P(lt, .05 + i * .25, .4 + i * .25), 1.6); drawItem(k, x, 1050, 1, p); if (v.labels) tiny(v.labels[i], x, 1300, 30, eOC(P(lt, .2 + i * .25, .5 + i * .25))); }); },
  parcels(lt, d, v) { const n = v.n || 6; for (let i = 0; i < n; i++) { const c = i % 3, r = Math.floor(i / 3), t0 = .1 + i * .12, p = eOB(P(lt, t0, t0 + .4), 1.6); parcel(CX - 60 + c * 140, 1380 - r * 100 - (1 - clamp(p)) * 260, 1, clamp(p * 2), i === n - 1 ? PUR : WH, i === n - 1); }
    stick(CX - 330, 1380, 1.4, 'carry', 1, WH, lt * 3); },
  feed(lt, d, v) { const n = Math.min(v.count || 10, 1 + Math.floor(eIOC(P(qlt(lt), 0, d * .85)) * ((v.count || 10) - .01))); feed(CX, 1080, 470, 860, lt, eOC(P(lt, 0, .3)), 1.2 + lt * .6, !!v.frozen);
    if (v.count) { bigNum(String(n), CX + 330, 780, 140, eOC(P(lt, .1, .4)), WH, 'rgba(255,255,255,.7)'); if (v.countLabel) tiny(v.countLabel, CX + 330, 850, 26, eOC(P(lt, .1, .4))); } },
  transfer(lt, d, v) { const A = v.amounts || ['+£250']; phone(CX, 1080, 420, 780, eOC(P(lt, 0, .3)), (w, h) => { A.forEach((a, i) => transfer(0, -h / 2 + 110 + i * 120, w - 20, eOC(P(lt, .25 + i * .4, .55 + i * .4)), a, v.label || LBL.incoming)); }); },
  notif(lt, d, v) { const n = Math.min(v.n || 1, 9), k = n > 1 ? 1 + Math.floor(eIOC(P(qlt(lt), .3, Math.max(1, d - .5))) * (n - .01)) : 1;
    phone(CX, 1080, 420, 800, 1, (w, h) => { for (let i = 0; i < k; i++) { const y = -h / 2 + 100 + (k - 1 - i) * 74; notif(0, y, w - 24, i === k - 1 ? eOC(P(lt, .2, .5)) : 1, v.title || LBL.sold, v.body || '', 'now'); } });
    if (n > 1) bigNum('×' + k, CX + 330, 760, 120, eOC(P(lt, .2, .5))); },
  calendar(lt, d, v) { const a = v.from ?? 1, b = v.to ?? a; const n = b > a ? Math.round(lerp(a, b, eIOC(P(qlt(lt), .1, Math.max(.5, d * .8))))) : (v.value ?? a);
    dayCard(CX, 1000, v.wide ? 520 : 320, v.wide ? 330 : 380, v.label || LBL.day, typeof n === 'number' ? n : n, eOC(P(lt, 0, .3)), v.flip ? ((lt * 5) % 1 < .3 ? ((lt * 5) % 1) / .3 : 0) : 0, v.purple === false ? '#8a8a95' : PUR); },
  week(lt, d, v) { const L = v.labels || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']; const n = Math.min(7, 1 + Math.floor(eIOC(P(qlt(lt), 0, d * .8)) * 6.99));
    for (let i = 0; i < 7; i++) { const on = i < n; dayCard(CX - 390 + i * 130, 1050, 112, 140, L[i], on ? (v.mark || '×') : '', on ? 1 : .3, 0, on ? PUR : null); } },
  cards(lt, d, v) { const I = v.items || []; const n = I.length; spotlight(CX, 260, 1500, 90, 520, .45); if (v.sit !== false) stick(CX, 1500, 1.2, 'sit', 1, '#9a9aa6');
    I.forEach((s, i) => excuse(CX, 780 + i * 180, 860, s, eOC(P(lt, .05 + i * Math.min(.5, d / (n + 1)), .35 + i * Math.min(.5, d / (n + 1)))), v.cross ? eIOC(P(lt, d * .5 + i * .15, d * .5 + .3 + i * .15)) : 0, v.tag || null, v.tag ? eOC(P(lt, .3 + i * .25, .6 + i * .25)) : 0, (i - 1) * .015)); },
  receipt(lt, d, v) { receipt(CX, 1050, 820, v.rows || [], v.total || '', lt, eOC(P(lt, 0, .35)), v.title || 'THE BILL'); },
  wheel(lt, d, v) { const M = v.months || ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']; const pr = v.full ? 1 : eIOC(P(lt, .05, d + .1)), cy = 1080, R = 280;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX, cy, R, 0, 6.2832); ctx.stroke(); ctx.strokeStyle = PUR; ctx.shadowColor = PUR; ctx.shadowBlur = 24; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(CX, cy, R, -Math.PI / 2, -Math.PI / 2 + 6.2832 * pr); ctx.stroke(); ctx.restore();
    M.forEach((m, i) => { const a2 = -Math.PI / 2 + 6.2832 * (i + .5) / 12; tiny(m, CX + Math.cos(a2) * (R + 60), cy + Math.sin(a2) * (R + 60) + 7, 20, pr * 12 > i ? 1 : .35, pr * 12 > i ? PURXL : 'rgba(255,255,255,.6)'); });
    if (v.center) caps(v.center, CX, cy + 20, 56, eOC(P(lt, .1, .4))); },
  stairs(lt, d, v) { stairsLine(CX - 380, 1480, 170, 115, 4, 1, eOC(P(lt, 0, .6)), PUR); if (v.ghost) stick(CX - 320, 1480, .8, 'stand', .35, '#8a8a95'); hero(CX - 380 + 3 * 170 + 85, 1480 - 3 * 115 - 6, .82, lt, eOC(P(lt, .4, .8))); },
  step(lt, d, v) { const SW = 170, SH = 110, sx = CX - 330, sy = 1500; stairsLine(sx, sy, SW, SH, 4, 1, 1, PUR);
    const p = Math.min(3, eIOC(P(lt, .05, Math.max(1.2, d * .8))) * 3), k = Math.min(2, Math.floor(p)), f = p - k;
    const x = sx + SW * .5 + (k + f) * SW, y = sy - (k + eIOC(f)) * SH - Math.sin(f * Math.PI) * 26, top = p >= 2.98;
    stick(x, y, 1, top ? 'up' : 'stand', 1, p > 2 ? PURXL : WH, top ? 0 : p * 9); },
  fork(lt) { fork(lt, eOC(P(lt, 0, .5))); loopWalker(lt, 1); hero(640 + 3 * 80 + 40, 1300 - 3 * 125 - 6, .62, lt, 1); },
  clock(lt, d, v) { clockFace(CX, 1080, 290, eOC(P(lt, 0, .3)), v.fill != null ? v.fill * eIOC(P(lt, .1, d)) : 0, lt, v.spin ? lt * v.spin : 0); if (v.cross) xMark(CX, 1080, 220, eIOC(P(lt, .3, .8)), 1, '#FF6B8A'); },
  hourglass(lt) { hourglass(CX, 1050, 1.8, lt * 2, 1); },
  dots(lt, d, v) { const n = v.n || 365, f = Math.floor(eIOC(P(qlt(lt), .1, d)) * n); dotGrid(CX, 1080, v.cols || 19, n, v.gap || 42, v.r || 12, f, eOC(P(lt, 0, .3))); if (v.unit) bigNum(f + ' ' + v.unit, CX, 1600, 110, eOC(P(lt, .2, .5))); },
  thermo(lt, d, v) { snow(lt + 3, 90, .9, 1.6); const a = v.from ?? 8, b = v.to ?? -4; thermo(CX - 120, 1080, 1.3, lerp(.75, .12, eIOC(P(lt, 0, d))), 1, Math.round(lerp(a, b, eIOC(P(qlt(lt), 0, d)))) + '°C'); },
  bars(lt, d, v) { const L = v.labels || [], V = v.values || [], hi = v.highlight || []; const n = V.length, gap = Math.min(n <= 4 ? 230 : 80, 860 / n);
    V.forEach((h, i) => { const p = eOB(P(lt, i * .04, .3 + i * .04), 1.5), hh = 520 * h * clamp(p), x = CX - (n - 1) * gap / 2 + i * gap, on = hi.includes(i); ctx.save(); RR(ctx, x - gap * .32, 1420 - hh, gap * .64, hh, 10); ctx.fillStyle = on ? PUR : 'rgba(255,255,255,.3)'; ctx.shadowColor = on ? PUR : 'transparent'; ctx.shadowBlur = on ? 30 : 0; ctx.fill(); ctx.restore(); if (L[i]) tiny(L[i], x, 1470, n <= 4 ? 28 : 20, 1, on ? PURXL : 'rgba(255,255,255,.55)'); });
    if (v.caption) tiny(v.caption, CX, 1540, 26, eOC(P(lt, .4, .8)), 'rgba(255,255,255,.6)'); },
  season(lt, d, v) { seasonBar(CX, 1080, 800, lerp(v.from ?? .85, v.to ?? .1, eIOC(P(lt, 0, d))), 1, v.label || 'SEASON'); hourglass(CX, 1400, 1.1, lt * 2, 1); },
  head(lt, d, v) { ctx.save(); ctx.strokeStyle = WH; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 18; ctx.translate(400, 1300); ctx.scale(1.2, 1.2); ctx.stroke(new Path2D('M-170 300 C-200 150 -262 -60 -200 -180 C-140 -292 60 -322 150 -222 C200 -162 215 -92 205 -40 L250 30 Q258 46 230 56 L222 80 Q233 92 220 104 Q226 140 195 160 C170 176 130 170 110 176 L110 300')); ctx.restore();
    const A = v.amounts || ['+£45', '+£135', '+£945']; for (let k = 0; k < 7; k++) { const p = ((lt * .55 + k / 7) % 1); ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI) * .9; T(ctx, A[k % A.length], lerp(W + 150, 730, p), 1290 + Math.sin(k * 2.1) * 120, 40, 'POPB', '#7CF2B0', 'center', 0); ctx.restore(); } },
  glyph(lt, d, v) { bigNum(v.text || '1', CX, 1150, (v.size || 480) * lerp(1.2, 1, eOQ(P(lt, 0, .4))), eOC(P(lt, 0, .2)), PURXL, PUR); },
  split(lt, d, v) { stick(CX - 230, 1450, 1.1, 'stand', 1, '#8a8a95'); if (v.left) pricePill(v.left, CX - 230, 1010, eOC(P(lt, .1, .4)), 46, false); stick(CX + 230, 1450, 1.2, 'up', eOC(P(lt, .2, .5)), PURXL); if (v.right) pricePill(v.right, CX + 230, 990, eOC(P(lt, .35, .65)), 46, true);
    if (v.leftLabel) mpill(v.leftLabel, CX - 230, 1520, 1, 26, true); if (v.rightLabel) mpill(v.rightLabel, CX + 230, 1520, 1, 26); },
  wardrobe(lt, d, v) { wardrobe(CX, 1450, 2, eOC(P(lt, 0, .3)), eOC(P(lt, .25, .8)));
    if (v.items) { const L = v.items; L.forEach((k, i) => { const p = eOB(P(lt, .5 + i * .15, .85 + i * .15), 1.6); drawItem(k, CX - 300 + i * 300, 860 - Math.sin(i) * 20, .9 * clamp(p), clamp(p * 2), (i - 1) * .12); }); } },
  pause(lt) { const p = eOC(P(lt, 0, .4)); ctx.save(); ctx.globalAlpha *= p; ctx.fillStyle = WH; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 30; RR(ctx, CX - 110, 900, 70, 260, 20); ctx.fill(); RR(ctx, CX + 40, 900, 70, 260, 20); ctx.fill(); ctx.restore(); },
};

// ---------- big number ----------
function drawNumber(lt, d, nm, y) {
  const a = eOC(P(lt, nm.delay || .1, (nm.delay || .1) + .25)); if (a <= 0) return;
  if (nm.spotlight) spotlight(CX, 260, y + 60, 90, 520, .55 * a);
  if (nm.pre) tiny(nm.pre, CX, y - 150, 36, a, 'rgba(255,255,255,.88)');
  const v = nm.from != null && nm.from !== nm.value ? lerp(nm.from, nm.value, eOE(P(qlt(lt), (nm.delay || .1), Math.max(.8, d * .75)))) : nm.value;
  const s = (nm.sign || '') + (nm.prefix ?? (window.LANG === 'en' ? '£' : '')) + fmtAll(Math.round(v)) + (nm.suffix || '');
  bigNum(s, CX, y, nm.size || 170, a, nm.color === 'w' ? WH : PURXL, nm.color === 'w' ? 'rgba(255,255,255,.7)' : undefined);
  if (nm.strike) { const p = eIOC(P(lt, d * .6, d * .6 + .3)); if (p > 0) { ctx.save(); ctx.strokeStyle = '#FF6B8A'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.shadowColor = '#FF6B8A'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(CX - 330, y - 50); ctx.lineTo(CX - 330 + 660 * p, y - 50); ctx.stroke(); ctx.restore(); } }
  if (nm.post) tiny(nm.post, CX, y + 80, 32, eOC(P(lt, .4, .7)), PURXL);
  if (nm.pill) mpill(nm.pill, CX, y + 150, eOC(P(lt, .4, .7)), 28, true);
}

function sceneFn(i) {
  const sc = SCN[i];
  return (lt, d) => {
    if (sc.fx === 'hit' || (i === 0 && sc.fx !== 'none')) { shake(lt, 0, .5, 20); flash(lt, 0, .25, .45); }
    if (sc.fx === 'shake') shake(lt, 0, .4, 14);
    const v = sc.visual || {}; const hasVis = v.type && v.type !== 'none';
    if (sc.pill) mpill(sc.pill, CX, 330, eOC(P(lt, 0, .25)), 30, true);
    if (sc.final) {
      if (hasVis && VIS[v.type]) VIS[v.type](lt, d, v);
      drawTitle(lt, sc.title, v.type === 'stairs' || v.type === 'step' ? 560 : 760, { maxSize: 120, minSize: 60, maxLines: 3 });
    } else {
      if (hasVis && VIS[v.type]) VIS[v.type](lt, d, v);
      const yb = drawTitle(lt, sc.title, 470);
      if (sc.number) drawNumber(lt, d, sc.number, hasVis ? (sc.number.y || 1400) : 1080);
    }
    if (sc.footnote) footnote2(typeof sc.footnote === 'string' ? sc.footnote : (SC.footnote || ''), eOC(P(lt, .5, .9)));
  };
}

SCENE_FN = (t) => {
  bgM(t);
  if (SC.theme === 'winter') snow(t, 55, .55, 1);
  for (let i = 0; i <= LAST; i++) {
    const s = S(i), e = i === LAST ? END + 1 : S(i + 1), sc = SCN[i];
    const hard = sc.cut === 'hard' || sc.fx === 'hit' || i === 0;
    shot(t, s, e, sceneFn(i), hard ? .01 : .12, i === LAST ? .01 : (SCN[i + 1] && (SCN[i + 1].fx === 'hit' || SCN[i + 1].cut === 'hard') ? .01 : .15));
  }
  const fe = P(t, END - .7, END); if (fe > 0) { ctx.fillStyle = `rgba(0,0,0,${eIC(fe)})`; ctx.fillRect(0, 0, W, H); }
};
window.EVENTS = { whoosh: [], boom: [] };

// ---------- light (white, clean) theme: draw the dark look, then invert lightness keeping hues ----------
if (SC.bg === 'light') {
  const sbd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', { get() { return sbd.get.call(this); }, set(v) { sbd.set.call(this, v * (SC.glow ?? .22)); } });
  const _bgM = bgM; bgM = (t, gy) => _bgM(t, gy, 0);
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tx = tmp.getContext('2d');
  const _fin = finish;
  finish = function (t, f) {
    _fin(t, f);
    tx.globalCompositeOperation = 'copy'; tx.filter = `invert(1) hue-rotate(180deg) saturate(${SC.sat ?? 1.35})`; tx.drawImage(cv, 0, 0); tx.filter = 'none';
    // soft lavender wash so the white isn't flat
    tx.globalCompositeOperation = 'multiply';
    const g = tx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, SC.tintTop || '#F4F0FF'); g.addColorStop(.5, '#FFFFFF'); g.addColorStop(1, SC.tintBottom || '#F1ECFF');
    tx.fillStyle = g; tx.fillRect(0, 0, W, H);
    // ink: pure black becomes deep navy-violet, everything lighter is untouched
    tx.globalCompositeOperation = 'lighten'; tx.fillStyle = SC.ink || '#1C1433'; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(tmp, 0, 0); ctx.restore();
  };
}
