// ===== W-series: winter, hard-truth, constant motion (9:16) =====
// falling snow (deterministic). speed multiplier lets us slow time down / stop it
function snow(t, n = 70, a = 1, speed = 1, clip = null) {
  if (a <= 0) return; const r = rngM(77); ctx.save(); ctx.globalAlpha *= a;
  if (clip) { ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2], clip[3]); ctx.clip(); }
  const X0 = clip ? clip[0] : 0, Y0 = clip ? clip[1] : 0, WW = clip ? clip[2] : W, HH = clip ? clip[3] : H;
  for (let i = 0; i < n; i++) {
    const z = .35 + r() * .65, sx = r() * WW, ph = r() * 6.28, vy = (40 + 90 * z) * speed, off = r() * HH;
    const y = Y0 + ((off + t * vy) % (HH + 40)) - 20, x = X0 + ((sx + Math.sin(t * .8 + ph) * 26 * z + t * 12 * speed) % WW + WW) % WW;
    ctx.globalAlpha = a * (.25 + .6 * z); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 8 * z;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + 3.5 * z, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}
// window with snow outside
function winWindow(x, y, w, h, t, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  RR(ctx, x - w / 2, y - h / 2, w, h, 14); ctx.fillStyle = 'rgba(40,30,80,.35)'; ctx.fill();
  snow(t, 40, 1, .8, [x - w / 2, y - h / 2, w, h]);
  ctx.strokeStyle = WH; ctx.lineWidth = 6; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 16; RR(ctx, x - w / 2, y - h / 2, w, h, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
}
// stickman lying under a blanket on a sofa, scrolling (phone glow)
function couch(x, y, s, t, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = WH; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 16;
  RR(ctx, -330, -60, 660, 120, 30); ctx.stroke(); RR(ctx, -360, -150, 70, 210, 30); ctx.stroke(); RR(ctx, 290, -150, 70, 210, 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-300, 60); ctx.lineTo(-300, 100); ctx.moveTo(300, 60); ctx.lineTo(300, 100); ctx.stroke();
  // head on armrest
  ctx.fillStyle = WH; ctx.beginPath(); ctx.arc(-230, -120, 36, 0, 6.29); ctx.fill();
  // blanket (purple)
  ctx.strokeStyle = PURL; ctx.shadowColor = PUR; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(139,92,246,.22)';
  ctx.beginPath(); ctx.moveTo(-200, -70); ctx.bezierCurveTo(-120, -150 + Math.sin(t * 1.5) * 4, 120, -140, 260, -80); ctx.quadraticCurveTo(280, -60, 260, -40); ctx.lineTo(-200, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
  // arm + phone with glow
  ctx.strokeStyle = WH; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 16; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-160, -100); ctx.lineTo(-120, -190); ctx.stroke();
  ctx.save(); ctx.translate(-115, -230); ctx.rotate(-.25); RR(ctx, -26, -42, 52, 84, 9); ctx.fillStyle = '#07060B'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 160); g.addColorStop(0, 'rgba(200,190,255,.35)'); g.addColorStop(1, 'rgba(200,190,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-40, 30, 160, 0, 6.29); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 3; k++) { const yy = ((k * 26 - t * 60) % 78 + 78) % 78 - 36; RR(ctx, -18, yy, 36, 18, 4); ctx.fill(); }
  ctx.restore(); ctx.restore();
}
// generic bank transfer card (no real bank branding)
function transfer(x, y, w, a, amount, label = 'Przelew przychodzący') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + (1 - eOC(clamp(a))) * -40); const h = w * .26;
  RR(ctx, -w / 2, -h / 2, w, h, h * .28); ctx.fillStyle = 'rgba(30,28,40,.96)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
  const s = h * .58, ix = -w / 2 + h * .2 + s / 2; ctx.fillStyle = PUR; ctx.shadowColor = PUR; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(ix, 0, s / 2, 0, 6.29); ctx.fill(); ctx.shadowBlur = 0;
  T(ctx, window.LANG === 'en' ? '£' : 'zł', ix, h * .1, h * .26, 'POPB', WH, 'center', 0);
  const tx = -w / 2 + h * .2 + s + h * .2; T(ctx, label, tx, -h * .06, h * .17, 'POPM', 'rgba(255,255,255,.75)', 'left', 0); T(ctx, amount, tx, h * .26, h * .24, 'POPB', /^[−-]/.test(amount) ? '#FF8FA3' : '#7CF2B0', 'left', 0);
  ctx.restore();
}
// jacket outline (puffer)
function jacket(x, y, s, a = 1, col = WH, rot = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 7 / Math.max(.6, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = col === WH ? 'rgba(255,255,255,.7)' : col; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(-50, -150); ctx.quadraticCurveTo(0, -190, 50, -150); ctx.lineTo(130, -120); ctx.lineTo(190, 120); ctx.lineTo(140, 135); ctx.lineTo(110, -10); ctx.lineTo(110, 170); ctx.lineTo(-110, 170); ctx.lineTo(-110, -10); ctx.lineTo(-140, 135); ctx.lineTo(-190, 120); ctx.lineTo(-130, -120); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -165); ctx.lineTo(0, 170); for (let k = 0; k < 4; k++) { ctx.moveTo(-110, -60 + k * 55); ctx.lineTo(110, -60 + k * 55); } ctx.globalAlpha *= .6; ctx.stroke();
  ctx.restore();
}
function gift(x, y, s, a = 1, col = PURL) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = WH; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 18;
  RR(ctx, -110, -60, 220, 170, 10); ctx.stroke(); RR(ctx, -125, -100, 250, 45, 10); ctx.stroke();
  ctx.strokeStyle = col; ctx.shadowColor = PUR; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(0, 110); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-40, -125, 42, 24, -.4, 0, 6.29); ctx.ellipse(40, -125, 42, 24, .4, 0, 6.29); ctx.stroke(); ctx.restore();
}
function bag(x, y, s, a = 1, col = WH) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.shadowColor = col === WH ? 'rgba(255,255,255,.7)' : col; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(-90, -60); ctx.lineTo(90, -60); ctx.lineTo(105, 110); ctx.lineTo(-105, 110); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -60, 45, Math.PI, 0); ctx.stroke(); ctx.restore();
}
function thermo(x, y, s, frac, a = 1, label = '') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = WH; ctx.lineWidth = 7; ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(0, 160, 60, -Math.PI * .32, Math.PI * 1.32); ctx.lineTo(-32, -220); ctx.arc(0, -220, 32, Math.PI, 0); ctx.lineTo(32, 108); ctx.stroke();
  ctx.fillStyle = '#7FC8FF'; ctx.shadowColor = '#7FC8FF'; ctx.beginPath(); ctx.arc(0, 160, 42, 0, 6.29); ctx.fill(); const top = lerp(110, -220, frac); RR(ctx, -16, top, 32, 150 - top, 16); ctx.fill();
  ctx.restore(); if (label) T(ctx, label, x + 140 * s, y + 20 * s, 90 * s, 'POPB', '#BFE3FF', 'left', 0);
}
// season bar draining
function seasonBar(x, y, w, frac, a = 1, label = 'SEZON') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; RR(ctx, x - w / 2, y - 30, w, 60, 30); ctx.strokeStyle = WH; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 14; ctx.stroke();
  if (frac > 0) { RR(ctx, x - w / 2 + 8, y - 22, (w - 16) * frac, 44, 22); ctx.fillStyle = PUR; ctx.shadowColor = PUR; ctx.shadowBlur = 24; ctx.fill(); }
  ctx.restore(); tiny(label + ' · ' + Math.round(frac * 100) + '%', x, y + 90, 30, a, 'rgba(255,255,255,.85)');
}
// money pills floating up from a point
function moneyUp(x, y, lt, a = 1, txts = ['+250 zł', '+180 zł', '+400 zł'], col = '#7CF2B0', period = 1.6) {
  if (a <= 0) return; txts.forEach((s, i) => { const p = ((lt + i * period / txts.length) % period) / period; ctx.save(); ctx.globalAlpha = a * Math.sin(p * Math.PI); T(ctx, s, x + (i - 1) * 30, y - p * 160, 34, 'POPB', col, 'center', 0); ctx.restore(); });
}
// masked swear word for on-screen text (voice says it fully)
const SW = s => s;
