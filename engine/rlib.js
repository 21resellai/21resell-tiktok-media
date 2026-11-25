// ===== R-series: dark motivational, no CTA (9:16) =====
// excuse card (quote style)
function excuse(x, y, w, text, a = 1, crossed = 0, tagTxt = null, tagA = 0, tilt = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + (1 - eOC(clamp(a))) * 40); ctx.rotate(tilt); const h = 150;
  RR(ctx, -w / 2, -h / 2, w, h, 30); ctx.fillStyle = 'rgba(14,12,20,.92)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
  T(ctx, '„', -w / 2 + 50, 18, 90, 'POPB', PURL, 'center', 0);
  T(ctx, text, -w / 2 + 100, 18, 52, 'POPB', WH, 'left', 0);
  if (crossed > 0) { const tw = TW(ctx, text, 52, 'POPB'); ctx.save(); ctx.strokeStyle = '#FF6B8A'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowColor = '#FF6B8A'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(-w / 2 + 92, 0); ctx.lineTo(-w / 2 + 92 + (tw + 16) * crossed, 0); ctx.stroke(); ctx.restore(); }
  if (tagTxt && tagA > 0) { ctx.save(); ctx.globalAlpha *= tagA; ctx.translate(w / 2 - 40, -h / 2 + 6); ctx.rotate(.18); const k = lerp(1.6, 1, eOQ(clamp(tagA))); ctx.scale(k, k); pricePill(tagTxt, 0, 0, 1, 36, true); ctx.restore(); }
  ctx.restore();
}
// receipt / bill
function receipt(x, y, w, rows, total, lt, a = 1, title = 'RACHUNEK ZA WYMÓWKI') {
  if (a <= 0) return; const rh = 86, h = 230 + rows.length * rh + 150; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y - h / 2 + (1 - eOC(clamp(a))) * 80);
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2, h); for (let i = 0; i <= 20; i++) { const xx = w / 2 - i * w / 20; ctx.lineTo(xx, h + (i % 2 ? 0 : -18)); } ctx.closePath();
  ctx.fillStyle = 'rgba(244,241,255,.96)'; ctx.shadowColor = 'rgba(255,255,255,.45)'; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  T(ctx, title, 0, 90, 34, 'POPB', '#14121C', 'center', 6); ctx.fillStyle = '#14121C'; ctx.fillRect(-w / 2 + 50, 130, w - 100, 3);
  rows.forEach(([lab, val], i) => { const ra = eOC(P(lt, .25 + i * .3, .5 + i * .3)); if (ra <= 0) return; ctx.save(); ctx.globalAlpha *= ra; const yy = 200 + i * rh; T(ctx, lab, -w / 2 + 60, yy, 36, 'POPM', '#2A2633', 'left', 0); T(ctx, val, w / 2 - 60, yy, 36, 'POPB', '#14121C', 'right', 0); ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(20,18,28,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 60, yy + 28); ctx.lineTo(w / 2 - 60, yy + 28); ctx.stroke(); ctx.restore(); });
  const ta = eOC(P(lt, .3 + rows.length * .3, .6 + rows.length * .3)); if (ta > 0) { ctx.save(); ctx.globalAlpha *= ta; const yy = 230 + rows.length * rh + 40; ctx.fillStyle = '#14121C'; ctx.fillRect(-w / 2 + 50, yy - 70, w - 100, 3); T(ctx, window.LANG === 'en' ? 'TOTAL' : 'RAZEM', -w / 2 + 60, yy, 40, 'POPB', '#14121C', 'left', 4); T(ctx, total, w / 2 - 60, yy + 4, 58, 'POPB', '#6D3FE0', 'right', 0); ctx.restore(); }
  ctx.restore();
}
// analogue clock
function clockFace(x, y, r, a, frac, lt, handSpin = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  ctx.strokeStyle = WH; ctx.lineWidth = 6; ctx.shadowColor = 'rgba(255,255,255,.75)'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.stroke();
  for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(Math.sin(an) * r * .84, -Math.cos(an) * r * .84); ctx.lineTo(Math.sin(an) * r * .94, -Math.cos(an) * r * .94); ctx.stroke(); }
  if (frac > 0) { ctx.fillStyle = 'rgba(139,92,246,.35)'; ctx.shadowColor = PUR; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * .8, -Math.PI / 2, -Math.PI / 2 + 6.283 * frac); ctx.closePath(); ctx.fill(); }
  const mA = -Math.PI / 2 + 6.283 * (frac + handSpin), hA = -Math.PI / 2 + 6.283 * ((frac + handSpin) / 12 + .3);
  ctx.strokeStyle = WH; ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(hA) * r * .45, Math.sin(hA) * r * .45); ctx.stroke();
  ctx.strokeStyle = PURL; ctx.shadowColor = PUR; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(mA) * r * .72, Math.sin(mA) * r * .72); ctx.stroke();
  ctx.fillStyle = WH; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.29); ctx.fill(); ctx.restore();
}
// dot grid (e.g. 365 hours)
function dotGrid(x, y, cols, n, gap, r, filled, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; const rows = Math.ceil(n / cols), x0 = x - (cols - 1) * gap / 2, y0 = y - (rows - 1) * gap / 2;
  const path = (from, to) => { ctx.beginPath(); for (let i = from; i < to; i++) { const cx = x0 + (i % cols) * gap, cy = y0 + Math.floor(i / cols) * gap; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 6.29); } };
  path(filled, n); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
  if (filled > 0) { path(0, Math.min(filled, n)); ctx.fillStyle = PUR; ctx.shadowColor = PUR; ctx.shadowBlur = 10; ctx.fill(); }
  ctx.restore();
}
// scrolling video feed in a phone
function feed(x, y, w, h, lt, a, speed = 1, frozen = false) {
  phone(x, y, w, h, a, (iw, ih) => {
    const ph = frozen ? 0 : lt * speed; const cardH = ih * .78, gap = 24, per = cardH + gap, off = (ph * per) % per;
    for (let k = -1; k < 3; k++) { const cy = -ih / 2 + 20 + k * per - off + cardH / 2; RR(ctx, -iw / 2 + 16, cy - cardH / 2, iw - 32, cardH, 22); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.globalAlpha *= .55; ctx.fillStyle = WH; ctx.beginPath(); ctx.moveTo(-18, cy - 26); ctx.lineTo(26, cy); ctx.lineTo(-18, cy + 26); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; RR(ctx, -iw / 2 + 40, cy + cardH / 2 - 70, iw * .5, 16, 8); ctx.fill(); RR(ctx, -iw / 2 + 40, cy + cardH / 2 - 44, iw * .32, 14, 7); ctx.fill(); }
  });
}
// two-path fork: left flat loop (grey), right stairs (purple top)
function fork(lt, a, hl = 0, leftA = 1, rightA = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  const bx = CX, by = 1560; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = WH; ctx.lineWidth = 10; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(bx, by + 200); ctx.lineTo(bx, by); ctx.stroke();
  // left branch to a loop
  ctx.save(); ctx.globalAlpha *= leftA * (hl === 2 ? .3 : 1); ctx.strokeStyle = '#8a8a95'; ctx.shadowColor = 'rgba(160,160,170,.6)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 40, by - 160, 300, by - 280); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(300, by - 400, 150, 120, 0, 0, 6.29); ctx.stroke(); ctx.restore();
  // right branch to stairs
  ctx.save(); ctx.globalAlpha *= rightA * (hl === 1 ? .3 : 1); ctx.strokeStyle = WH; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 40, by - 160, 640, by - 260); ctx.stroke(); ctx.restore();
  ctx.restore();
  if (rightA > 0) { const ra = a * rightA * (hl === 1 ? .3 : 1); stairsLine(640, 1300, 80, 125, 4, ra, 1, PUR); }
}
function loopWalker(lt, a, col = '#8a8a95') { const an = lt * 1.6, x = 300 + Math.cos(an) * 150, y = 1160 + Math.sin(an) * 120 + 120; stick(x, y - 4, .5, 'stand', a, col, lt * 10); }
// conveyor of parcels (a system that works)
function conveyor(y, lt, a, speed = 160) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = WH; ctx.lineWidth = 6; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 14;
  RR(ctx, 90, y, W - 180, 40, 20); ctx.stroke(); for (let i = 0; i < 10; i++) { const xx = 130 + i * 92; ctx.beginPath(); ctx.arc(xx, y + 20, 10, 0, 6.29); ctx.stroke(); }
  ctx.restore(); for (let k = 0; k < 6; k++) { const x = ((k * 190 + lt * speed) % (W + 200)) - 100; parcel(x, y - 4, .8, a * (x > 60 && x < W - 60 ? 1 : .3), k % 3 === 2 ? PUR : WH, k % 3 === 2); }
}
// final statement, no branding; hold then fade to black
function finale(lt, lines, sizes, col2 = PURL, extra = null, y0 = 820) {
  if (extra) extra(lt);
  lines.forEach((ln, i) => capsWords(ln.split(' ').map((w, j) => [w, i === lines.length - 1 && j === ln.split(' ').length - 1 ? col2 : undefined]), CX, y0 + i * (sizes[i] * 1.25), sizes[i], lt - i * .35, .09));
}
