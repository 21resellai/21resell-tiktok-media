// ===================== Motivational B/W pictogram style + 21resell purple accents =====================
const CX = W / 2, CY = H > W ? 940 : H / 2;
const PUR = '#8B5CF6', PURL = '#A78BFA', PURXL = '#C4B5FD', WH = '#FFFFFF';
const rngM = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

// ---------- timing: lines of voice-over ----------
// window.VO = [[start,end],...] (from the real MP3) ; otherwise estimated from words
function buildLines(txt, lead = .5, wps = 2.55, gap = .42) {
  if (window.VO && window.VO.length === txt.length) return window.VO.map(([s, e]) => ({ s, e }));
  let t = lead; return txt.map(x => { const w = x.split(/\s+/).length, d = w / wps + (x.includes('...') ? .35 : 0) + .15; const r = { s: t, e: t + d }; t += d + gap; return r; });
}

// ---------- background ----------
let CUR_T = 0; const qlt = lt => lt + (Math.round(CUR_T * 60) / 60 - CUR_T); // counters: same value for all motion-blur subframes of a frame
function bgM(t, gy = CY, glow = 1) {
  CUR_T = t;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(CX, gy, 0, CX, gy, 900);
  g.addColorStop(0, `rgba(255,255,255,${.085 * glow})`); g.addColorStop(.45, `rgba(255,255,255,${.03 * glow})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // drifting dust
  const r = rngM(7); ctx.fillStyle = '#fff';
  for (let k = 0; k < 46; k++) { const x = (r() * W + t * (8 + r() * 14)) % W, y = (r() * H - t * (5 + r() * 10) + H * 4) % H, a = .05 + r() * .12; ctx.globalAlpha = a; ctx.fillRect(x, y, 2.4, 2.4); }
  ctx.globalAlpha = 1;
}

// ---------- text ----------
function caps(s, x, y, size, a = 1, col = WH, glow = 1, ls = null, f = 'POPB') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = col === WH ? 'rgba(255,255,255,.85)' : col; ctx.shadowBlur = size * .45 * glow;
  T(ctx, s, x, y, size, f, col, 'center', ls === null ? size * .13 : ls); ctx.shadowBlur = size * .15 * glow; T(ctx, s, x, y, size, f, col, 'center', ls === null ? size * .13 : ls);
  ctx.restore();
}
function tiny(s, x, y, size = 20, a = 1, col = 'rgba(255,255,255,.75)', align = 'center') { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; T(ctx, s.toUpperCase(), x, y, size, 'POPB', col, align, size * .16); ctx.restore(); }
// word-by-word reveal of caps headline: words = [[text,col],...]
function capsWords(words, x, y, size, lt, step = .12, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; const ls = size * .13; let tot = 0; const ws = words.map(([s]) => TW(ctx, s, size, 'POPB', ls)), sp = size * .32;
  tot = ws.reduce((p, c) => p + c, 0) + sp * (words.length - 1); let xx = x - tot / 2;
  words.forEach(([s, col], i) => { const k = eOC(P(lt, i * step, i * step + .35)); if (k > 0) { ctx.save(); ctx.translate(xx + ws[i] / 2, y + (1 - k) * 22); ctx.scale(lerp(.85, 1, eOB(k, 1.4)), lerp(.85, 1, eOB(k, 1.4))); caps(s, 0, 0, size, k, col || WH); ctx.restore(); } xx += ws[i] + sp; });
  ctx.restore();
}
// white pill with black tracked caps (signature label)
function mpill(s, x, y, a = 1, size = 20, inv = false, col = null) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; const ls = size * .14, tw = TW(ctx, s.toUpperCase(), size, 'POPB', ls), w = tw + size * 1.6, h = size * 1.9;
  ctx.translate(x, y); const k = lerp(.7, 1, eOB(clamp(a), 1.6)); ctx.scale(k, k);
  RR(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.shadowColor = col || 'rgba(255,255,255,.6)'; ctx.shadowBlur = 22;
  ctx.fillStyle = col ? col : (inv ? 'rgba(0,0,0,.6)' : WH); ctx.fill(); ctx.shadowBlur = 0;
  if (inv) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); }
  T(ctx, s.toUpperCase(), 0, size * .36, size, 'POPB', inv || col ? WH : '#000', 'center', ls); ctx.restore();
}

// ---------- pictogram person ----------
function person(x, y, s = 1, a = 1, o = {}) {
  if (a <= 0) return; const col = o.col || WH; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  if (o.bob) ctx.translate(0, -Math.abs(Math.sin(o.bob)) * 10);
  ctx.shadowColor = o.glowCol || (col === WH ? 'rgba(255,255,255,.9)' : col); ctx.shadowBlur = o.glow === undefined ? 34 : o.glow;
  ctx.fillStyle = col;
  // body (rounded shoulders)
  ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(-46, -50); ctx.bezierCurveTo(-46, -86, -26, -96, 0, -96); ctx.bezierCurveTo(26, -96, 46, -86, 46, -50); ctx.lineTo(46, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -132, 29, 0, 6.29); ctx.fill();
  ctx.restore();
}
// thin stick walker (line style) – phase ph
function walker(x, y, s, ph, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = WH; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 14;
  const l = Math.sin(ph) * .5, r = -l;
  ctx.beginPath(); ctx.arc(0, -150, 18, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(0, -62); ctx.stroke();
  [l, r].forEach(q => { ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(Math.sin(q) * 34, -62 + Math.cos(q) * 30); ctx.lineTo(Math.sin(q) * 34 + Math.sin(q * .6) * 10, 0); ctx.stroke(); });
  [r, l].forEach(q => { ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(Math.sin(q) * 30, -86); ctx.stroke(); });
  ctx.restore();
}
function ground(y, x0 = 60, x1 = W - 60, a = 1, dashed = true, prog = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a * .55; ctx.strokeStyle = WH; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([7, 9]);
  const m = (x0 + x1) / 2, hw = (x1 - x0) / 2 * eOC(prog); ctx.beginPath(); ctx.moveTo(m - hw, y); ctx.lineTo(m + hw, y); ctx.stroke(); ctx.restore();
}
function spotlight(x, y0, y1, w0, w1, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(255,255,255,.0)'); g.addColorStop(.25, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(255,255,255,.20)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w0 / 2, y0); ctx.lineTo(x + w0 / 2, y0); ctx.lineTo(x + w1 / 2, y1); ctx.lineTo(x - w1 / 2, y1); ctx.closePath(); ctx.fill();
  const e = ctx.createRadialGradient(x, y1, 0, x, y1, w1 * .6); e.addColorStop(0, 'rgba(255,255,255,.28)'); e.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = e; ctx.save(); ctx.translate(x, y1); ctx.scale(1, .22); ctx.beginPath(); ctx.arc(0, 0, w1 * .6, 0, 6.29); ctx.fill(); ctx.restore();
  ctx.restore();
}

// ---------- purple items ----------
function jumper(x, y, s = 1, a = 1, o = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const col = o.col || PUR;
  ctx.shadowColor = col; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(-36, -70); ctx.quadraticCurveTo(0, -50, 36, -70); ctx.lineTo(70, -56); ctx.lineTo(104, 30); ctx.lineTo(76, 42); ctx.lineTo(56, -6); ctx.lineTo(56, 70); ctx.lineTo(-56, 70); ctx.lineTo(-56, -6); ctx.lineTo(-76, 42); ctx.lineTo(-104, 30); ctx.lineTo(-70, -56); ctx.closePath();
  const g = ctx.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, o.light || '#A98BFF'); g.addColorStop(1, o.dark || '#6D3FE0'); ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 18, -44); for (let yy = -44; yy < 54; yy += 12) ctx.lineTo(k * 18 + (((yy + 44) / 12) % 2 ? 5 : -5), yy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-56, 56); ctx.lineTo(56, 56); ctx.moveTo(-36, -70); ctx.quadraticCurveTo(0, -38, 36, -70); ctx.stroke();
  ctx.restore();
}
function tshirt(x, y, s = 1, a = 1, o = {}) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  ctx.shadowColor = PUR; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(-30, -70); ctx.quadraticCurveTo(0, -46, 30, -70); ctx.lineTo(96, -40); ctx.lineTo(80, 0); ctx.lineTo(54, -12); ctx.lineTo(54, 70); ctx.lineTo(-54, 70); ctx.lineTo(-54, -12); ctx.lineTo(-80, 0); ctx.lineTo(-96, -40); ctx.closePath();
  const g = ctx.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, '#A98BFF'); g.addColorStop(1, '#6D3FE0'); ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function pricePill(s, x, y, a = 1, size = 34, purple = true, fade = 1) {
  if (a <= 0 || fade <= 0) return; ctx.save(); ctx.globalAlpha *= a * fade; const k = lerp(.6, 1, eOB(clamp(a), 1.8)); ctx.translate(x, y); ctx.scale(k, k);
  const w = TW(ctx, s, size, 'POPB', 1) + size * 1.2, h = size * 1.7; RR(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.shadowColor = purple ? PUR : 'rgba(255,255,255,.7)'; ctx.shadowBlur = 30; ctx.fillStyle = purple ? PUR : WH; ctx.fill(); ctx.shadowBlur = 0;
  T(ctx, s, 0, size * .36, size, 'POPB', purple ? WH : '#000', 'center', 1); ctx.restore();
}
// big money/number with glow; col purple by default
function bigNum(s, x, y, size, a = 1, col = PURXL, glowCol = PUR) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.shadowColor = glowCol; ctx.shadowBlur = size * .5; T(ctx, s, x, y, size, 'POPB', col, 'center', -size * .02);
  ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = size * .12; T(ctx, s, x, y, size, 'POPB', col, 'center', -size * .02); ctx.restore();
}
const gbp = v => window.LANG === 'en' ? '£' + fmtAll(Math.round(v)) : fmtAll(Math.round(v)) + ' zł';
// real logos (user supplied)
function vtile(x, y, size, a = 1, rot = 0) { if (a <= 0 || !IMG.vt) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); const k = lerp(.6, 1, eOB(clamp(a), 1.8)); ctx.scale(k, k); ctx.shadowColor = 'rgba(9,177,186,.7)'; ctx.shadowBlur = size * .35; ctx.drawImage(IMG.vt, -size / 2, -size / 2, size, size); ctx.restore(); }
function gtaLogo(x, y, w, a = 1, glow = 1) { if (a <= 0 || !IMG.gta6) return; const im = IMG.gta6, h = w * im.height / im.width; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); const k = lerp(.7, 1, eOB(clamp(a), 1.6)); ctx.scale(k, k); ctx.shadowColor = 'rgba(255,80,170,.75)'; ctx.shadowBlur = 50 * glow; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }

// ---------- props ----------
function arrowLine(x0, y0, x1, y1, prog, a = 1, col = WH, curve = -120) {
  if (a <= 0 || prog <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -prog * 60;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + curve, N = 40, pts = [];
  for (let i = 0; i <= N * prog; i++) { const u = i / N; pts.push([(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1]); }
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
  if (prog > .96 && pts.length > 2) { const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3], an = Math.atan2(ay - by, ax - bx); ctx.translate(ax, ay); ctx.rotate(an); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-12, -10); ctx.lineTo(-12, 10); ctx.fill(); }
  ctx.restore();
}
function bubble(s, x, y, a = 1, size = 22, tail = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; const k = lerp(.5, 1, eOB(clamp(a), 2)); ctx.translate(x, y); ctx.scale(k, k);
  const w = TW(ctx, s.toUpperCase(), size, 'POPB', size * .1) + size * 1.4, h = size * 2; RR(ctx, -w / 2, -h / 2, w, h, 12); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 12; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8 * tail, h / 2); ctx.lineTo(6 * tail, h / 2 + 16); ctx.lineTo(10 * tail, h / 2); ctx.stroke();
  ctx.shadowBlur = 0; T(ctx, s.toUpperCase(), 0, size * .36, size, 'POPB', WH, 'center', size * .1); ctx.restore();
}
function hourglass(x, y, s, lt, a = 1, rot = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = WH; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(-50, -80); ctx.lineTo(50, -80); ctx.moveTo(-50, 80); ctx.lineTo(50, 80); ctx.moveTo(-40, -80); ctx.lineTo(0, 0); ctx.lineTo(40, -80); ctx.moveTo(-40, 80); ctx.lineTo(0, 0); ctx.lineTo(40, 80); ctx.stroke();
  const f = (lt * .35) % 1; ctx.fillStyle = WH; ctx.globalAlpha *= .85;
  ctx.beginPath(); const tt = 1 - f; ctx.moveTo(-34 * tt, -70 * tt); ctx.lineTo(34 * tt, -70 * tt); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-36 * f, 76 - 70 * f + 70 * f); ctx.lineTo(36, 76); ctx.lineTo(-36, 76); ctx.lineTo(0, 76 - 60 * f); ctx.closePath(); ctx.fill();
  if (f < .95) { ctx.fillRect(-1.5, 0, 3, 76 - 60 * f); }
  ctx.restore();
}
function dayCard(x, y, w, h, label, val, a = 1, flip = 0, col = null) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); const k = lerp(.7, 1, eOB(clamp(a), 1.6)); ctx.scale(k, k);
  ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 30; RR(ctx, -w / 2, -h / 2, w, h, 16); ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = WH; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.save(); RR(ctx, -w / 2, -h / 2, w, h * .2, 14); ctx.clip(); ctx.fillStyle = col || WH; ctx.fillRect(-w / 2, -h / 2, w, h * .2); ctx.restore();
  T(ctx, label.toUpperCase(), 0, -h / 2 + h * .135, h * .075, 'POPB', col ? WH : '#000', 'center', h * .012);
  ctx.save(); ctx.scale(1, 1 - Math.sin(flip * Math.PI) * .9); T(ctx, String(val), 0, h * .25, h * .42, 'POPB', WH, 'center', 0); ctx.restore();
  ctx.restore();
}
function xMark(x, y, s, prog, a = 1, col = WH) {
  if (a <= 0 || prog <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 14;
  const p1 = clamp(prog * 2), p2 = clamp(prog * 2 - 1); ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x - s + 2 * s * p1, y - s + 2 * s * p1); if (p2 > 0) { ctx.moveTo(x + s, y - s); ctx.lineTo(x + s - 2 * s * p2, y - s + 2 * s * p2); } ctx.stroke(); ctx.restore();
}
function checkCircle(x, y, r, prog, a = 1, col = PURL) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = r * .14; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * clamp(prog * 1.4)); ctx.stroke();
  const q = clamp(prog * 2 - 1); if (q > 0) { ctx.beginPath(); ctx.moveTo(x - r * .42, y + r * .02); ctx.lineTo(x - r * .1, y + r * .32); if (q > .4) ctx.lineTo(x - r * .1 + r * .6 * (q - .4) / .6, y + r * .32 - r * .7 * (q - .4) / .6); ctx.stroke(); }
  ctx.restore();
}
// shot envelope: fade/scale/blur in & out, slow push-in
function shot(t, s, e, fn, inD = .28, outD = .22) {
  const inn = s <= 0 ? 1 : eOC(P(t, s, s + inD)), out = eIC(P(t, e - outD, e)), v = inn * (1 - out); if (v <= .001) return;
  const sc = lerp(.94, 1, eOQ(P(t, s, s + .6))) * (1 + .035 * P(t, s, e)) * (1 + out * .05); const bl = (1 - v) * 14;
  if (bl <= .5) { ctx.save(); ctx.globalAlpha *= v; ctx.translate(CX, CY); ctx.scale(sc, sc); ctx.translate(-CX, -CY); fn(t - s, e - s); ctx.restore(); return; }
  // blurred transition: draw the shot once offscreen, then blur the whole layer in one pass
  const oc = window.__shotCv || (window.__shotCv = Object.assign(document.createElement('canvas'), { width: W, height: H }));
  const main = ctx, octx = oc.getContext('2d'); octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.filter = 'none'; octx.clearRect(0, 0, W, H);
  ctx = octx; ctx.save(); ctx.translate(CX, CY); ctx.scale(sc, sc); ctx.translate(-CX, -CY); try { fn(t - s, e - s); } finally { ctx.restore(); ctx = main; }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha *= v; main.filter = `blur(${bl.toFixed(1)}px)`; main.drawImage(oc, 0, 0); main.restore();
}
function footnote(s, a = 1) { tiny(s, CX, 1690, 19, a * .9, 'rgba(255,255,255,.5)'); }
function endScreen(lt, line, size = 92) {
  capsWords(line.split(' ').map(w => [w]), CX, 640, size, lt, .1);
  logoAnim(ctx, CX, 930, 96, lt - .5, 'type', -1);
  const a = eOC(P(lt, 1.1, 1.5)); tiny('zweryfikowani dostawcy dla resellerów', CX, 1050, 24, a, 'rgba(255,255,255,.8)');
  mpill('link w bio', CX, 1160, eOC(P(lt, 1.3, 1.7)), 24);
  siteTag(eOC(P(lt, 1.5, 1.9)), CX, 1262, 40);
}
