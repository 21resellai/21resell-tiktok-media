// ===== props for the N-series (Vinted hook videos), works at 1080x1920 and 1920x1080 =====
const HZ = W > H; // horizontal
function footY() { return HZ ? H - 46 : 1690; }
function footnote2(s, a = 1) { tiny(s, CX, footY(), HZ ? 18 : 19, a * .9, 'rgba(255,255,255,.5)'); }
// big Vinted hook: tile pops with ring pulse
function vintedHook(x, y, size, lt, a = 1) {
  if (a <= 0) return; const k = eOC(P(lt, 0, .35));
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < 2; i++) { const p = ((lt * .9 + i * .5) % 1); ctx.save(); ctx.globalAlpha *= (1 - p) * .5 * k; ctx.strokeStyle = 'rgba(9,177,186,1)'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(9,177,186,.9)'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(x, y, size * (.55 + p * .5), 0, 6.29); ctx.stroke(); ctx.restore(); }
  vtile(x, y + Math.sin(lt * 2.2) * 6, size * (1 + .03 * Math.sin(lt * 3)), k);
  ctx.restore();
}
// phone outline with screen clip; fn draws inside (local coords, w x h centered)
function phone(x, y, w, h, a, fn, rot = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(255,255,255,.55)'; ctx.shadowBlur = 30; RR(ctx, -w / 2, -h / 2, w, h, w * .14); ctx.fillStyle = '#07060B'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = WH; ctx.stroke(); ctx.shadowBlur = 0;
  RR(ctx, -w * .12, -h / 2 + 16, w * .24, 12, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
  ctx.save(); RR(ctx, -w / 2 + 12, -h / 2 + 40, w - 24, h - 56, w * .09); ctx.clip(); if (fn) fn(w - 24, h - 56); ctx.restore();
  ctx.restore();
}
// notification card (generic, not a copy of any app UI)
function notif(x, y, w, a, title, body, rightTxt) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + (1 - eOC(clamp(a))) * -40); const h = w * .26;
  RR(ctx, -w / 2, -h / 2, w, h, h * .28); ctx.fillStyle = 'rgba(30,28,40,.96)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
  if (IMG.vt) { const s = h * .58; ctx.save(); RR(ctx, -w / 2 + h * .2, -s / 2, s, s, s * .22); ctx.clip(); ctx.drawImage(IMG.vt, -w / 2 + h * .2, -s / 2, s, s); ctx.restore(); }
  const tx = -w / 2 + h * .2 + h * .58 + h * .2;
  T(ctx, title, tx, -h * .06, h * .2, 'POPB', WH, 'left', 0); T(ctx, body, tx, h * .24, h * .17, 'POPM', 'rgba(255,255,255,.75)', 'left', 0);
  if (rightTxt) T(ctx, rightTxt, w / 2 - h * .2, -h * .06, h * .15, 'POPM', 'rgba(255,255,255,.5)', 'right', 0);
  ctx.restore();
}
// parcel box
function parcel(x, y, s, a = 1, col = WH, fillP = false) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = col === WH ? 'rgba(255,255,255,.7)' : col; ctx.shadowBlur = 22; ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.lineJoin = 'round';
  RR(ctx, -60, -90, 120, 90, 8); if (fillP) { ctx.fillStyle = 'rgba(139,92,246,.25)'; ctx.fill(); } ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-60, -66); ctx.lineTo(60, -66); ctx.moveTo(-14, -90); ctx.lineTo(-14, -66); ctx.moveTo(14, -90); ctx.lineTo(14, -66); ctx.stroke();
  ctx.restore();
}
// line stickman (same look as avatar 18). pose: 'stand' | 'up' | 'hold' | 'sit' | 'phone'
function stick(x, y, s, pose = 'stand', a = 1, col = WH, ph = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = col === WH ? 'rgba(255,255,255,.85)' : col; ctx.shadowBlur = 22;
  const L = (a1, b1, a2, b2) => { ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke(); };
  if (pose === 'sit') {
    ctx.beginPath(); ctx.arc(10, -150, 32, 0, 6.29); ctx.fill(); L(4, -112, -10, -40); L(-10, -40, 50, -40); L(50, -40, 56, 0); L(4, -96, 50, -70); L(50, -70, 30, -120);
  } else {
    ctx.beginPath(); ctx.arc(0, -232, 32, 0, 6.29); ctx.fill(); L(0, -190, 0, -85);
    const sw = Math.sin(ph) * 24; L(0, -85, -34 + sw, 0); L(0, -85, 36 - sw, 0);
    if (pose === 'up') { L(0, -168, -62, -222); L(0, -168, 64, -226); }
    else if (pose === 'hold') { L(0, -168, -96, -300); L(0, -168, 96, -300); }
    else if (pose === 'phone') { L(0, -168, 44, -120); L(44, -120, 40, -170); L(0, -168, -36, -95); RR(ctx, 22, -214, 40, 64, 8); ctx.lineWidth = 7; ctx.stroke(); }
    else if (pose === 'carry') { L(0, -168, 52, -150); L(0, -168, 46, -120); }
    else { L(0, -168, -40, -95); L(0, -168, 40, -95); }
  }
  ctx.restore();
}
function stairsLine(sx, sy, SW, SH, n, a = 1, prog = 1, topCol = null) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = WH; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 18;
  const m = Math.ceil(n * prog);
  for (let i = 0; i < m; i++) { const last = i === n - 1 && topCol; ctx.strokeStyle = last ? topCol : WH; ctx.shadowColor = last ? topCol : 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(sx + i * SW, sy - i * SH); ctx.lineTo(sx + (i + 1) * SW, sy - i * SH); if (i < n - 1) ctx.lineTo(sx + (i + 1) * SW, sy - (i + 1) * SH); ctx.stroke(); }
  ctx.restore();
}
// outline tee (white/purple) like the avatar
function teeLine(x, y, s, a = 1, col = PUR) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 11 / s * s; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.moveTo(-50, -150); ctx.quadraticCurveTo(0, -108, 50, -150); ctx.lineTo(150, -118); ctx.lineTo(222, -40); ctx.lineTo(168, 6); ctx.lineTo(118, -36); ctx.lineTo(118, 150); ctx.lineTo(-118, 150); ctx.lineTo(-118, -36); ctx.lineTo(-168, 6); ctx.lineTo(-222, -40); ctx.lineTo(-150, -118); ctx.closePath(); ctx.lineWidth = 11 / s; ctx.stroke(); ctx.restore();
}
// hero = stickman holding tee above head (avatar 18)
function hero(x, y, s, lt, a = 1) { stick(x, y, s, 'hold', a); teeLine(x, y - 300 * s - 150 * .46 * s + 12 + Math.sin(lt * 4) * 4, .46 * s, a); }
// wardrobe
function wardrobe(x, y, s, a = 1, open = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = WH; ctx.lineWidth = 6; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 18;
  RR(ctx, -110, -300, 220, 300, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(-14, -150, 5, 0, 6.29); ctx.arc(14, -150, 5, 0, 6.29); ctx.fillStyle = WH; ctx.fill();
  if (open > 0) { ctx.save(); ctx.globalAlpha *= open; ctx.beginPath(); ctx.moveTo(110, -300); ctx.lineTo(110 + 70 * open, -280); ctx.lineTo(110 + 70 * open, -20); ctx.lineTo(110, 0); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
// counter text (quantized)
function counter(v0, v1, x, y, size, lt, t0, t1, a = 1, suffix = ' zł', col = PURXL) {
  const v = lerp(v0, v1, eOE(P(qlt(lt), t0, t1))); bigNum(fmtAll(Math.round(v)) + suffix, x, y, size, a, col); return v;
}
function flash(lt, t0, dur = .25, maxA = .55) { const p = P(lt, t0, t0 + dur); if (p <= 0 || p >= 1) return; ctx.save(); ctx.globalAlpha = maxA * (1 - p); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function shake(lt, t0, dur = .35, amp = 14) { const p = P(lt, t0, t0 + dur); if (p <= 0 || p >= 1) return; ctx.translate(Math.sin(lt * 90) * amp * (1 - p), Math.cos(lt * 77) * amp * (1 - p)); }
// horizontal end screen
function endScreenH(lt, line, size = 78) {
  capsWords(line.split(' ').map(w => [w]), CX, 300, size, lt, .1);
  logoAnim(ctx, CX, 520, 92, lt - .5, 'type', -1);
  const a = eOC(P(lt, 1.1, 1.5)); tiny('zweryfikowani dostawcy dla resellerów', CX, 630, 24, a, 'rgba(255,255,255,.8)');
  mpill('link w bio', CX, 735, eOC(P(lt, 1.3, 1.7)), 24);
  siteTag(eOC(P(lt, 1.5, 1.9)), CX, 840, 40);
}
function endAny(lt, line, size) { if (HZ) endScreenH(lt, line, size || 78); else endScreen(lt, line, size || 86); }
