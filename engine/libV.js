// ===================== 21resell shared animation library (1920x1080) =====================
const W = window.VW || 1080, H = window.VH || 1920, FPS = 60;
const cv = document.getElementById('cv');
let ctx = cv.getContext('2d');

const C = {
  bg: '#060509', panel: '#0F0D16', panel2: '#15121F', line: 'rgba(255,255,255,.08)',
  p: '#8B5CF6', pL: '#A78BFA', pXL: '#C4B5FD', pD: '#6D28D9', pDD: '#3B1A7A', mag: '#D946EF',
  white: '#F5F3FA', grey: '#9A95A8', grey2: '#5B566A', ink: '#0B0A10',
  vinted: '#09B1BA', discord: '#5865F2', cream: '#ECE4D2'
};
const SONG = { B: 0.4925, bursts: [5.57, 9.51, 13.47, 15.89, 21.33, 25.26], end: 27.0 };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eOC = x => 1 - Math.pow(1 - x, 3);
const eIC = x => x * x * x;
const eIOC = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eOQ = x => 1 - Math.pow(1 - x, 5);
const eIOQ = x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
const eOE = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eIE = x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10);
const eOB = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SEP = window.LANG === 'en' ? ',' : ' ';
const fmt = n => { const s = Math.round(n).toString(); return s.length <= 4 ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, SEP); };
const fmtAll = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
function burstK(t, decay = 6) { // energy envelope from song bursts
  let k = 0; for (const b of SONG.bursts) { const d = t - b; if (d >= 0 && d < 1.1) k = Math.max(k, 1 - d / 1.1 * .4); if (d >= 1.1 && d < 1.6) k = Math.max(k, .6 * Math.exp(-(d - 1.1) * decay)); }
  return k;
}
function beatPulse(t, from = 0) { if (t < from) return 0; const ph = ((t - SONG.bursts[0]) / SONG.B) % 1; return Math.exp(-((ph + 1) % 1) * 7); }

// ---------- canvases ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- text ----------
function font(g, f, s) { g.font = `${s}px ${f}`; }
function T(g, s, x, y, size, f = 'IDB', col = C.white, align = 'center', ls = 0, base = 'alphabetic') {
  font(g, f, size); g.textAlign = align; g.textBaseline = base; g.letterSpacing = ls + 'px';
  g.fillStyle = col; g.fillText(s, x, y); g.letterSpacing = '0px';
}
function TW(g, s, size, f = 'IDB', ls = 0) { font(g, f, size); g.letterSpacing = ls + 'px'; const w = g.measureText(s).width; g.letterSpacing = '0px'; return w; }
function RR(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// headline built from parts [{s, c}], words revealed with stagger; appear at t0, leave at t1
function headline(t, parts, t0, t1, y = 110, size = 64, stag = .09) {
  if (t < t0 - .01 || t > t1 + .4) return;
  const words = []; parts.forEach(p => p.s.split(/(?<= )/).forEach(w => w && words.push({ s: w, c: p.c || C.white })));
  size = Math.round(size * .9); let total = 0; for (const w of words) total += TW(ctx, w.s, size, 'POPB', -1);
  let x = W / 2 - total / 2;
  words.forEach((w, i) => {
    const a = eOC(P(t, t0 + i * stag, t0 + i * stag + .45));
    const out = eIC(P(t, t1, t1 + .3));
    const ww = TW(ctx, w.s, size, 'POPB', -1);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha *= a * (1 - out);
      if (a < 1) ctx.filter = `blur(${(1 - a) * 10}px)`;
      T(ctx, w.s, x, y + (1 - a) * 18 - out * 12, size, 'POPB', w.c, 'left', -1);
      ctx.restore();
    }
    x += ww;
  });
}

// ---------- 3D ----------
const CAM = { x: 0, y: 0, z: 0, f: 1500, yaw: 0, pitch: 0 };
function camReset() { CAM.x = CAM.y = CAM.z = 0; CAM.f = 1500; CAM.yaw = CAM.pitch = 0; }
function rot(p, rx, ry, rz) {
  let [x, y, z] = p;
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  return [x, y, z];
}
function proj(p) {
  let x = p[0] - CAM.x, y = p[1] - CAM.y, z = p[2] - CAM.z;
  if (CAM.yaw) { const c = Math.cos(-CAM.yaw), s = Math.sin(-CAM.yaw); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (CAM.pitch) { const c = Math.cos(-CAM.pitch), s = Math.sin(-CAM.pitch); [y, z] = [y * c - z * s, y * s + z * c]; }
  const d = CAM.f + z; const k = CAM.f / Math.max(d, 1);
  return [W / 2 + x * k, H / 2 + y * k, d, k];
}
// map a canvas onto a 3D (optionally bent) panel. o: {x,y,z,w,h,rx,ry,rz,bend,nu,nv,alpha,glow,back,radius}
function panel3D(src, o) {
  const nu = o.nu || (o.bend ? 24 : 12), nv = o.nv || (o.bend ? 10 : 8);
  const w = o.w || src.width, h = o.h || src.height, sw = src.width, sh = src.height;
  const pts = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv; const bu = (u - .5) * 2;
    let lp = [(u - .5) * w, (v - .5) * h, -(o.bend || 0) * bu * bu];
    lp = rot(lp, o.rx || 0, o.ry || 0, o.rz || 0);
    pts.push(proj([lp[0] + (o.x || 0), lp[1] + (o.y || 0), lp[2] + (o.z || 0)]));
  }
  const id = (i, j) => j * (nu + 1) + i;
  // facing
  const a0 = pts[id(0, 0)], a1 = pts[id(nu, 0)], a2 = pts[id(0, nv)];
  const facing = ((a1[0] - a0[0]) * (a2[1] - a0[1]) - (a1[1] - a0[1]) * (a2[0] - a0[0])) > 0;
  let tex = src, mirror = false;
  if (!facing) { if (o.back) { tex = o.back; mirror = true; } else if (!o.twoSided) return; else mirror = true; }
  const tw = tex.width, th = tex.height;
  ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  if (o.glow) { // outline glow following the rounded shape
    ctx.save(); ctx.beginPath();
    const rr = (o.radius == null ? 0.05 : o.radius) * Math.min(w, h); const outline = [];
    const corner = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const an = a0 + k / 6 * Math.PI / 2; outline.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); } };
    corner(w / 2 - rr, -h / 2 + rr, -Math.PI / 2); corner(w / 2 - rr, h / 2 - rr, 0); corner(-w / 2 + rr, h / 2 - rr, Math.PI / 2); corner(-w / 2 + rr, -h / 2 + rr, Math.PI);
    outline.forEach((q, i) => { const bu = q[0] / (w / 2); let lp = [q[0], q[1], -(o.bend || 0) * bu * bu]; lp = rot(lp, o.rx || 0, o.ry || 0, o.rz || 0); const p = proj([lp[0] + (o.x || 0), lp[1] + (o.y || 0), lp[2] + (o.z || 0)]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.shadowColor = o.glowColor || 'rgba(139,92,246,.55)'; ctx.shadowBlur = o.glow; ctx.fillStyle = '#0B0A12'; ctx.fill(); ctx.restore();
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const p00 = pts[id(i, j)], p10 = pts[id(i + 1, j)], p11 = pts[id(i + 1, j + 1)], p01 = pts[id(i, j + 1)];
    let u0 = i / nu * tw, u1 = (i + 1) / nu * tw; const v0 = j / nv * th, v1 = (j + 1) / nv * th;
    if (mirror) { u0 = tw - u0; u1 = tw - u1; }
    tri(tex, p00, p10, p11, [u0, v0], [u1, v0], [u1, v1]);
    tri(tex, p00, p11, p01, [u0, v0], [u1, v1], [u0, v1]);
  }
  ctx.restore();
  return pts;
}
function tri(img, d0, d1, d2, s0, s1, s2) {
  // expand dst triangle slightly to hide seams
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const ex = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .9, p[1] + dy / l * .9]; };
  const e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
  const x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1];
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (Math.abs(den) < 1e-6) return;
  const X0 = d0[0], Y0 = d0[1], X1 = d1[0], Y1 = d1[1], X2 = d2[0], Y2 = d2[1];
  const a = ((X1 - X0) * (y2 - y0) - (X2 - X0) * (y1 - y0)) / den;
  const c = ((X2 - X0) * (x1 - x0) - (X1 - X0) * (x2 - x0)) / den;
  const b = ((Y1 - Y0) * (y2 - y0) - (Y2 - Y0) * (y1 - y0)) / den;
  const d = ((Y2 - Y0) * (x1 - x0) - (Y1 - Y0) * (x2 - x0)) / den;
  const e = X0 - a * x0 - c * y0, f = Y0 - b * x0 - d * y0;
  ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  const mnx = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 2), mny = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 2);
  const mxx = Math.min(img.width, Math.ceil(Math.max(x0, x1, x2)) + 2), mxy = Math.min(img.height, Math.ceil(Math.max(y0, y1, y2)) + 2);
  if (mxx > mnx && mxy > mny) ctx.drawImage(img, mnx, mny, mxx - mnx, mxy - mny, mnx, mny, mxx - mnx, mxy - mny);
  ctx.restore();
}
// draw a flat 2D sprite at a 3D point (billboard)
function sprite3D(src, x, y, z, scale = 1, alpha = 1) {
  const p = proj([x, y, z]); if (p[2] <= 10) return;
  const k = p[3] * scale; ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(src, p[0] - src.width * k / 2, p[1] - src.height * k / 2, src.width * k, src.height * k); ctx.restore();
}

// ---------- background, finish ----------
const GRAIN = []; (() => {
  for (let k = 0; k < 6; k++) {
    const g = mk(960, 540), gc = g.getContext('2d'), id = gc.createImageData(960, 540), r = rng(5 + k * 31);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); GRAIN.push(g);
  }
})();
function bg(t, glow = 1, cx = W / 2, cy = H + 80) {
  ctx.fillStyle = C.bg; ctx.fillRect(-100, -100, W + 200, H + 200);
  const k = glow * (1 + .25 * burstK(t));
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 900);
  g.addColorStop(0, `rgba(139,92,246,${.28 * k})`); g.addColorStop(.5, `rgba(109,40,217,${.10 * k})`); g.addColorStop(1, 'rgba(60,20,120,0)');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
  const bx = W * .5 + Math.sin(t * .4) * 400, by = H * .25 + Math.cos(t * .33) * 120;
  g = ctx.createRadialGradient(bx, by, 0, bx, by, 700);
  g.addColorStop(0, `rgba(217,70,239,${.05 * glow})`); g.addColorStop(1, 'rgba(217,70,239,0)');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
}
function finish(t, frame, fadeEnd = true) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .65);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .06; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(GRAIN[((Math.floor(t * 30) % 6) + 6) % 6], 0, 0, W, H); ctx.restore();

}
function flash(t, times, amt = .6, col = '255,255,255') {
  let a = 0; for (const ti of times) { const d = t - ti; if (d >= 0 && d < .5) a += amt * Math.exp(-d * 12); }
  if (a > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(${col},${clamp(a)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function shakeAt(t, times, amp = 14) {
  let x = 0, y = 0; for (const ti of times) { const d = t - ti; if (d < 0 || d > .5) continue; const k = Math.exp(-d * 10); x += Math.sin(d * 90) * amp * k; y += Math.cos(d * 73) * amp * .8 * k; }
  return [x, y];
}
const DUST = (() => { const r = rng(4); const a = []; for (let i = 0; i < 120; i++) a.push({ x: r() * W, y: r() * H, z: r(), p: r() * 6.28 }); return a; })();
function dust(t, alpha = .5) {
  ctx.save();
  for (const d of DUST) {
    const y = ((d.y - t * (10 + d.z * 40)) % H + H) % H, x = d.x + Math.sin(t * .5 + d.p) * 30;
    ctx.globalAlpha = alpha * (.25 + .75 * d.z) * (.5 + .5 * Math.sin(t * 2 + d.p));
    ctx.fillStyle = d.z > .7 ? C.pXL : C.pL; ctx.beginPath(); ctx.arc(x, y, .8 + d.z * 1.8, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

// ---------- images (logo from 21resell.pl, optional Vinted / Discord logo files) ----------
const IMG = {};
function loadImg(key, src) { return new Promise(res => { const i = new Image(); i.onload = () => { IMG[key] = i; res(true); }; i.onerror = () => res(false); i.src = src; }); }
const LOGO_META = { w: 1644, h: 451, spans: [[31, 149], [254, 308], [441, 571], [671, 789], [893, 989], [1092, 1210], [1314, 1329], [1407, 1464]], top: 129, bot: 308 };
const LETTER_H = LOGO_META.bot - LOGO_META.top;
// offset so the letters (not the glow padding) sit on the given centre
const LOGO_OFF = LOGO_META.w / 2 - (LOGO_META.spans[0][0] + LOGO_META.spans[7][1]) / 2;
function logoImg(g, x, y, capH, a = 1, rev = 1) {
  const im = IMG.logo; if (!im) return 0; const k = capH / LETTER_H; x += LOGO_OFF * k;
  const w = LOGO_META.w * k, h = LOGO_META.h * k; const cy = (LOGO_META.top + LOGO_META.bot) / 2 * k;
  g.save(); g.globalAlpha *= a;
  if (rev < 1) { g.beginPath(); g.rect(x - w / 2, y - h, w * rev, h * 2); g.clip(); }
  g.drawImage(im, x - w / 2, y - cy, w, h); g.restore();
  return w;
}
function logoLetter(g, i, x, y, capH, a = 1, dx = 0, dy = 0, sc = 1, blur = 0) {
  const im = IMG.logo; if (!im || a <= 0) return; const k = capH / LETTER_H; const sp = LOGO_META.spans; x += LOGO_OFF * k;
  const l = i === 0 ? 0 : (sp[i - 1][1] + sp[i][0]) / 2, r = i === 7 ? LOGO_META.w : (sp[i][1] + sp[i + 1][0]) / 2;
  const w = LOGO_META.w * k, cy = (LOGO_META.top + LOGO_META.bot) / 2 * k;
  const lx = x - w / 2 + l * k, cx = lx + (r - l) * k / 2;
  g.save(); g.globalAlpha *= a; if (blur > 0.3) g.filter = `blur(${blur}px)`;
  g.translate(cx + dx, y + dy); g.scale(sc, sc);
  g.drawImage(im, l, 0, r - l, LOGO_META.h, -(r - l) * k / 2, -cy, (r - l) * k, LOGO_META.h * k);
  g.restore();
}
function letterCenter(i, x, capH) { const k = capH / LETTER_H, sp = LOGO_META.spans; return x + LOGO_OFF * k - LOGO_META.w * k / 2 + (sp[i][0] + sp[i][1]) / 2 * k; }
function neonL(g, x, y, capH, amt) {
  if (amt <= 0) return; const cx = letterCenter(7, x, capH) - capH * .02;
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = capH * 1.5; const gr = g.createRadialGradient(cx, y, 0, cx, y, r);
  gr.addColorStop(0, `rgba(200,135,255,${.45 * amt})`); gr.addColorStop(.35, `rgba(145,69,238,${.25 * amt})`); gr.addColorStop(1, 'rgba(145,69,238,0)');
  g.fillStyle = gr; g.fillRect(cx - r, y - r, r * 2, r * 2);
  g.restore();
}
function logoAnim(g, x, y, capH, lt, style = 'type', pulseT = -1) {
  if (lt < 0) return;
  if (style === 'scan') {
    const p = eIOC(P(lt, 0, 1.0)); const k = capH / LETTER_H; const w = LOGO_META.w * k;
    logoImg(g, x, y, capH, 1, p);
    if (p > 0 && p < 1) { const bx = x - w / 2 + w * p; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(bx - 80, 0, bx + 10, 0); gr.addColorStop(0, 'rgba(167,139,250,0)'); gr.addColorStop(1, 'rgba(220,200,255,.8)'); g.fillStyle = gr; g.fillRect(bx - 80, y - capH, 90, capH * 2); g.fillStyle = '#fff'; g.shadowColor = '#C084FC'; g.shadowBlur = 30; g.fillRect(bx - 2, y - capH * .95, 4, capH * 1.9); g.restore(); }
  } else {
    const st = style === 'drop' ? .07 : .085;
    for (let i = 0; i < 8; i++) {
      const t0 = i * st; const q = P(lt, t0, t0 + .55);
      if (i === 7) {
        const f = lt - (7 * st + .3); const on = f < 0 ? 0 : f < .07 ? 1 : f < .13 ? .1 : f < .2 ? 1 : f < .25 ? .25 : 1;
        logoLetter(g, 7, x, y, capH, on); continue;
      }
      if (style === 'drop') logoLetter(g, i, x, y, capH, eOC(q), 0, (1 - eOB(q, 1.6)) * -capH * .9, 1, (1 - q) * 8);
      else logoLetter(g, i, x, y, capH, eOC(q), (1 - eOQ(q)) * capH * .45, 0, 1, (1 - q) * 12);
    }
  }
  const base = style === 'scan' ? 1.0 : 1.0; let amt = 0;
  const d = lt - base; if (d > 0) amt = .45 + .55 * Math.max(0, Math.sin(d * 2.6));
  if (pulseT >= 0 && lt >= pulseT) amt += 1.2 * Math.exp(-(lt - pulseT) * 3);
  neonL(g, x, y, capH, clamp(amt, 0, 1.6));
}
function vintedMark(g, x, y, size, onTile = true) {
  g.save();
  if (IMG.vinted) { g.drawImage(IMG.vinted, x - size / 2, y - size / 2, size, size); g.restore(); return; }
  if (onTile) { RR(g, x - size / 2, y - size / 2, size, size, size * .24); g.fillStyle = C.vinted; g.fill(); }
  T(g, 'Vinted', x, y + size * .1, size * .27, 'POPB', '#fff', 'center', 0);
  g.restore();
}
function vintedWord(g, x, y, h, col = C.white) { // icon + "Vinted" text, left-anchored, vertical centre y
  vintedMark(g, x + h / 2, y, h); T(g, 'Vinted', x + h + h * .3, y + h * .3, h * .8, 'POPB', col, 'left', 0);
}
function discordMark(g, x, y, size) {
  g.save(); RR(g, x - size / 2, y - size / 2, size, size, size * .26); g.fillStyle = C.discord; g.fill();
  if (IMG.discord) { const im = IMG.discord; const m = size * .68; const k = Math.min(m / im.width, m / im.height); g.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); }
  else chatIcon(g, x, y + size * .02, size / 84);
  g.restore();
}

// ---------- brand elements ----------
function logoMark(g, x, y, s, glow = 0) { // rounded square with "21"
  g.save(); g.translate(x, y); g.scale(s, s);
  if (glow) { g.shadowColor = 'rgba(139,92,246,.8)'; g.shadowBlur = glow; }
  const gr = g.createLinearGradient(-60, -60, 60, 60); gr.addColorStop(0, '#A78BFA'); gr.addColorStop(.55, '#7C3AED'); gr.addColorStop(1, '#5B21B6');
  RR(g, -60, -60, 120, 120, 30); g.fillStyle = gr; g.fill(); g.shadowBlur = 0;
  // inner highlight
  RR(g, -60, -60, 120, 120, 30); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
  T(g, '21', 1, 25, 70, 'IDB', '#fff', 'center', -4);
  g.restore();
}
// full lockup = official PNG logo. s=1 -> letters 96px high
function logoLock(g, x, y, s, a = 1, opts = {}) { return logoImg(g, x, y, 96 * s, a, opts.rev == null ? 1 : opts.rev); }
function hanger(g, x, y, s, col = '#fff', lw = 7) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(0, -26, 10, Math.PI * 1.05, Math.PI * 2.35); g.lineTo(0, -8); g.lineTo(-38, 18); g.lineTo(38, 18); g.lineTo(0, -8); g.stroke();
  g.restore();
}
function boxIcon(g, x, y, s, col = '#fff', lw = 6) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -30); g.lineTo(32, -14); g.lineTo(32, 20); g.lineTo(0, 36); g.lineTo(-32, 20); g.lineTo(-32, -14); g.closePath();
  g.moveTo(-32, -14); g.lineTo(0, 2); g.lineTo(32, -14); g.moveTo(0, 2); g.lineTo(0, 36); g.moveTo(-16, -22); g.lineTo(16, -6); g.stroke();
  g.restore();
}
function tile(g, x, y, s, kind, glow = 30, a = 1, label = true) { // kind: 'vinted' | 'supplier' | 'logo'
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
  const col = kind === 'vinted' ? C.vinted : C.p;
  g.shadowColor = kind === 'vinted' ? 'rgba(9,177,186,.6)' : 'rgba(139,92,246,.7)'; g.shadowBlur = glow;
  if (kind === 'logo') { g.shadowBlur = 0; }
  else {
    const gr = g.createLinearGradient(0, -65, 0, 65);
    if (kind === 'vinted') { gr.addColorStop(0, '#16C3CC'); gr.addColorStop(1, '#078C93'); } else { gr.addColorStop(0, '#2A2140'); gr.addColorStop(1, '#17122A'); }
    RR(g, -65, -65, 130, 130, 32); g.fillStyle = gr; g.fill(); g.shadowBlur = 0;
    RR(g, -65, -65, 130, 130, 32); g.lineWidth = 2.5; g.strokeStyle = kind === 'vinted' ? 'rgba(255,255,255,.3)' : 'rgba(167,139,250,.6)'; g.stroke();
    if (kind === 'vinted') { if (IMG.vinted) { g.save(); g.shadowColor = 'rgba(9,177,186,.6)'; g.shadowBlur = glow; vintedMark(g, 0, 0, 132); g.restore(); } else vintedMark(g, 0, 0, 130, false); } else boxIcon(g, 0, 0, 1.15, C.pXL);
  }
  if (label) {
    const lab = kind === 'vinted' ? 'Vinted' : kind === 'supplier' ? 'Supplier' : '21Resell';
    T(g, lab, 0, 112, 28, 'POPM', 'rgba(245,243,250,.75)', 'center', 0);
  }
  g.restore();
}
// knit sweater illustration, centered, ~400x380 at s=1
function sweater(g, x, y, s, col = C.cream, shade = '#B9AE95') {
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-200, -200);
  g.save(); g.fillStyle = 'rgba(0,0,0,.45)'; g.filter = 'blur(16px)'; g.beginPath(); g.ellipse(200, 372, 170, 18, 0, 0, 6.29); g.fill(); g.restore();
  const path = () => {
    g.beginPath(); g.moveTo(150, 46); g.bezierCurveTo(120, 52, 100, 58, 86, 70);
    g.bezierCurveTo(60, 120, 40, 220, 28, 300); g.lineTo(76, 314); g.bezierCurveTo(88, 250, 100, 200, 112, 160);
    g.lineTo(114, 352); g.lineTo(286, 352); g.lineTo(288, 160);
    g.bezierCurveTo(300, 200, 312, 250, 324, 314); g.lineTo(372, 300); g.bezierCurveTo(360, 220, 340, 120, 314, 70);
    g.bezierCurveTo(300, 58, 280, 52, 250, 46); g.bezierCurveTo(240, 74, 160, 74, 150, 46); g.closePath();
  };
  path(); const gr = g.createLinearGradient(0, 40, 0, 360); gr.addColorStop(0, col); gr.addColorStop(1, shade); g.fillStyle = gr; g.fill();
  g.save(); path(); g.clip();
  // cable knit
  g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 5;
  for (const cx of [150, 200, 250]) {
    for (let yy = 80; yy < 340; yy += 26) { g.beginPath(); g.moveTo(cx - 12, yy); g.bezierCurveTo(cx - 12, yy + 10, cx + 12, yy + 6, cx + 12, yy + 16); g.stroke(); g.beginPath(); g.moveTo(cx + 12, yy); g.bezierCurveTo(cx + 12, yy + 10, cx - 12, yy + 6, cx - 12, yy + 16); g.stroke(); }
  }
  g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 3;
  for (let xx = 60; xx < 360; xx += 14) { if (Math.abs(xx - 150) < 22 || Math.abs(xx - 200) < 22 || Math.abs(xx - 250) < 22) continue; g.beginPath(); g.moveTo(xx, 60); g.lineTo(xx, 340); g.stroke(); }
  // sleeve shading
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(86, 70); g.bezierCurveTo(60, 120, 40, 220, 28, 300); g.lineTo(76, 314); g.bezierCurveTo(88, 250, 100, 200, 112, 160); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(314, 70); g.bezierCurveTo(340, 120, 360, 220, 372, 300); g.lineTo(324, 314); g.bezierCurveTo(312, 250, 300, 200, 288, 160); g.closePath(); g.fill();
  g.restore();
  // ribbing
  g.fillStyle = shade; g.fillRect(114, 330, 172, 22);
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 3; for (let xx = 120; xx < 286; xx += 8) { g.beginPath(); g.moveTo(xx, 332); g.lineTo(xx, 350); g.stroke(); }
  g.beginPath(); g.moveTo(150, 46); g.bezierCurveTo(160, 74, 240, 74, 250, 46); g.lineWidth = 12; g.strokeStyle = shade; g.stroke();
  g.save(); g.translate(52, 307); g.rotate(.28); g.fillStyle = shade; g.fillRect(-26, -8, 52, 16); g.restore();
  g.save(); g.translate(348, 307); g.rotate(-.28); g.fillStyle = shade; g.fillRect(-26, -8, 52, 16); g.restore();
  g.restore();
}
// sale notification card (canvas-space); w ~ 640
function notif(g, x, y, w, a = 1, s = 1, d = {}) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  const h = 118;
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  RR(g, -w / 2, -h / 2, w, h, 28); g.fillStyle = 'rgba(24,21,34,.97)'; g.fill(); g.shadowColor = 'transparent';
  RR(g, -w / 2, -h / 2, w, h, 28); g.lineWidth = 2; g.strokeStyle = 'rgba(167,139,250,.28)'; g.stroke();
  vintedMark(g, -w / 2 + 59, 0, 74);
  T(g, d.title || 'Sold!', -w / 2 + 118, -8, 32, 'IDX', C.white, 'left', -.5);
  T(g, d.body || 'Ralph Lauren Sweater · M', -w / 2 + 118, 30, 25, 'IDM', C.grey, 'left', 0);
  T(g, d.amt || '+£75', w / 2 - 26, -6, 34, 'MONOB', C.pL, 'right', -1);
  T(g, d.time || 'just now', w / 2 - 26, 32, 20, 'MONO', 'rgba(255,255,255,.35)', 'right', 0);
  g.restore();
}
// chips
function pill(g, x, y, text, size = 30, bgc = 'rgba(139,92,246,.16)', fg = C.pXL, border = 'rgba(167,139,250,.5)', f = 'IDS') {
  const w = TW(g, text, size, f) + size * 1.4, h = size * 1.9;
  RR(g, x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = bgc; g.fill(); if (border) { g.lineWidth = 2; g.strokeStyle = border; g.stroke(); }
  T(g, text, x, y + size * .36, size, f, fg, 'center', 0); return w;
}
function chatIcon(g, x, y, s, col = '#fff') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col;
  RR(g, -30, -24, 60, 40, 14); g.fill(); g.beginPath(); g.moveTo(-14, 14); g.lineTo(-22, 28); g.lineTo(0, 14); g.closePath(); g.fill();
  g.fillStyle = C.discord; for (const dx of [-14, 0, 14]) { g.beginPath(); g.arc(dx, -4, 4.5, 0, 6.29); g.fill(); }
  g.restore();
}
// Discord CTA card
function discordCTA(g, x, y, a, s = 1) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  const w = 1080, h = 150;
  RR(g, -w / 2, -h / 2, w, h, 34); g.fillStyle = 'rgba(88,101,242,.13)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(88,101,242,.6)'; g.stroke();
  discordMark(g, -w / 2 + 75, 0, 94);
  T(g, 'Join the 21Resell Discord', -w / 2 + 145, -26, 34, 'POPB', C.white, 'left', 0);
  T(g, 'The best reselling community, period', -w / 2 + 145, 12, 24, 'POPR', 'rgba(220,222,255,.78)', 'left', 0);
  T(g, 'Fresh reselling news 3× a week', -w / 2 + 145, 48, 26, 'POPB', '#C9CEFF', 'left', 0);
  RR(g, w / 2 - 250, -26, 150, 52, 26); g.fillStyle = C.discord; g.fill(); T(g, '−5% OFF', w / 2 - 175, 9, 22, 'POPB', '#fff', 'center', 0);
  g.strokeStyle = C.white; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(w / 2 - 70, 0); g.lineTo(w / 2 - 40, 0); g.moveTo(w / 2 - 52, -12); g.lineTo(w / 2 - 40, 0); g.lineTo(w / 2 - 52, 12); g.stroke();
  g.restore();
}
// standard outro: animated logo, url pill, stats, discord CTA
function urlPill(t, x, y, up, t0) {
  if (up <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(up, up); ctx.shadowColor = 'rgba(139,92,246,.7)'; ctx.shadowBlur = 40;
  const w = TW(ctx, '21resell.pl', 44, 'POPB') + 96; RR(ctx, -w / 2, -42, w, 84, 42);
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, '#7C3AED'); gr.addColorStop(1, '#A855F7'); ctx.fillStyle = gr; ctx.fill(); ctx.shadowBlur = 0;
  T(ctx, '21resell.pl', 0, 15, 44, 'POPB', '#fff', 'center', 0);
  ctx.save(); RR(ctx, -w / 2, -42, w, 84, 42); ctx.clip(); ctx.globalAlpha = .35; const sx = lerp(-w, w, ((t - t0) * .55) % 1); ctx.translate(sx, 0); ctx.rotate(.4); ctx.fillStyle = '#fff'; ctx.fillRect(-25, -150, 50, 300); ctx.restore();
  ctx.restore();
}
function statsRow(x, y, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  const items = [['4.96/5', 'rated by 2,400+ sellers'], ['50+', 'verified suppliers'], ['700+', 'community members']];
  items.forEach((it, i) => { const xx = x + (i - 1) * 420; T(ctx, it[0], xx, y, 40, 'POPB', C.white, 'center', 0); T(ctx, it[1], xx, y + 34, 21, 'POPR', 'rgba(245,243,250,.55)', 'center', 0); if (i) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(xx - 210, y - 34, 2, 76); } });
  ctx.restore();
}
function outro(t, t0, opts = {}) {
  const lt = t - t0; const y0 = opts.y || 300; const style = opts.style || 'type';
  const punch = 1 + .035 * Math.exp(-Math.max(0, t - SONG.bursts[5]) * 5) * (t > SONG.bursts[5] ? 1 : 0);
  ctx.save(); ctx.translate(W / 2, y0); ctx.scale(punch, punch); ctx.translate(-W / 2, -y0);
  logoAnim(ctx, W / 2, y0, 112, lt, style, SONG.bursts[5] - t0);
  ctx.restore();
  const tg = eOC(P(lt, 1.0, 1.4));
  ctx.save(); ctx.globalAlpha *= tg; T(ctx, 'Verified designer clothing suppliers for resellers', W / 2, y0 + 140 + (1 - tg) * 14, 34, 'POPM', 'rgba(245,243,250,.75)', 'center', 0); ctx.restore();
  urlPill(t, W / 2, y0 + 245, eOB(P(lt, 1.2, 1.6), 1.6), t0 + 1.7);
  statsRow(W / 2, y0 + 385, eOC(P(lt, 1.5, 1.9)));
  const dc = eOC(P(lt, 1.8, 2.3)); discordCTA(ctx, W / 2, y0 + 590 + (1 - dc) * 40, dc, 1);
}

// ---------- stat card (vector, any scale) ----------
const STATS = [
  { l: 'REVENUE · TODAY', v: 375, s: '5 sales × £75', ic: '↗' },
  { l: 'COSTS · TODAY', v: 25, s: 'supplier stock: 5 × £5', ic: '◇' },
  { l: 'NET PROFIT', v: 350, s: 'today · £70 per sweater', ic: '★' }];
function drawStatCard(g, i, x, y, sc, k, hi, glow = 0) {
  const c = STATS[i]; const cw = 475, ch = 170;
  g.save(); g.translate(x, y); g.scale(sc, sc);
  if (glow) { g.shadowColor = 'rgba(139,92,246,.75)'; g.shadowBlur = glow; }
  RR(g, 0, 0, cw, ch, 22); g.fillStyle = hi ? '#18132A' : '#13111B'; g.fill(); g.shadowBlur = 0;
  g.lineWidth = hi ? 3 : 1.5; g.strokeStyle = hi ? C.pL : C.line; g.stroke();
  RR(g, 26, 30, 52, 52, 14); g.fillStyle = 'rgba(255,255,255,.05)'; g.fill(); T(g, c.ic, 52, 66, 26, 'IDB', C.pXL, 'center', 0);
  T(g, c.l, 98, 50, 17, 'MONO', 'rgba(255,255,255,.55)', 'left', 2);
  T(g, '£' + fmtAll(c.v * k), 98, 104, 46, 'MONOB', i === 2 ? C.pL : C.white, 'left', -1);
  T(g, c.s, 98, 140, 19, 'IDM', 'rgba(255,255,255,.45)', 'left', 0);
  g.restore();
}
// ---------- dark Vinted-style seller view (offscreen, 2x) ----------
const DASH = mk(3200, 1800);
const DAYS = [{ d: 'Mon', v: 350 }, { d: 'Tue', v: 280 }, { d: 'Wed', v: 350 }, { d: 'Thu', v: 420 }, { d: 'Fri', v: 350 }, { d: 'Sat', v: 420 }, { d: 'Sun', v: 280 }];
const ZONES = [[60, 120, 475, 330], [565, 120, 505, 700], [1100, 120, 440, 700]]; // portfel, transakcje, opinie
const SWC = [[C.cream, '#B9AE95'], ['#24324F', '#18223A'], ['#2F5A43', '#21402F'], ['#6B2433', '#4D1824']];
function card(g, x, y, w, h, hi) { RR(g, x, y, w, h, 22); g.fillStyle = hi ? '#17142A' : 'rgba(255,255,255,.03)'; g.fill(); g.lineWidth = hi ? 3 : 1.5; g.strokeStyle = hi ? C.pL : C.line; g.stroke(); }
function stars(g, x, y, s, n = 5) { for (let i = 0; i < n; i++) T(g, '★', x + i * s * 1.05, y, s, 'IDB', '#F5B942', 'left', 0); }
// p: {k: money reveal 0..1, hi: zone highlighted, chart: rows/bars reveal 0..1}
function drawDash(p) {
  const g = DASH.getContext('2d'); const w = 1600, h = 900;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, DASH.width, DASH.height); g.setTransform(2, 0, 0, 2, 0, 0);
  RR(g, 0, 0, w, h, 34); g.fillStyle = '#0E0C14'; g.fill();
  g.save(); RR(g, 0, 0, w, h, 34); g.clip();
  // top bar
  g.fillStyle = 'rgba(255,255,255,.025)'; g.fillRect(0, 0, w, 86); g.fillStyle = C.line; g.fillRect(0, 86, w, 2);
  if (IMG.vinted) vintedWord(g, 46, 44, 42); else T(g, 'Vinted', 50, 56, 34, 'POPB', C.vinted, 'left', 0);
  RR(g, 250, 22, 620, 44, 22); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); T(g, '⌕   Search for items', 274, 51, 19, 'POPR', 'rgba(255,255,255,.4)', 'left', 0);
  const nb = Math.round(5 * clamp(p.chart * 1.2));
  T(g, '♡', 1170, 56, 28, 'IDB', 'rgba(255,255,255,.6)', 'center', 0); T(g, '✉', 1230, 55, 24, 'IDB', 'rgba(255,255,255,.6)', 'center', 0);
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 2.5; g.beginPath(); g.arc(1290, 40, 10, Math.PI, 0); g.lineTo(1302, 52); g.lineTo(1278, 52); g.closePath(); g.stroke();
  if (nb) { g.fillStyle = '#FF4D6A'; g.beginPath(); g.arc(1302, 30, 11, 0, 6.29); g.fill(); T(g, String(nb), 1302, 36, 15, 'POPB', '#fff', 'center', 0); }
  RR(g, 1340, 22, 130, 44, 22); g.fillStyle = C.vinted; g.fill(); T(g, 'Sell now', 1405, 51, 19, 'POPB', '#fff', 'center', 0);
  g.fillStyle = '#3A3150'; g.beginPath(); g.arc(1520, 44, 22, 0, 6.29); g.fill(); T(g, 'ME', 1520, 51, 16, 'POPB', C.pXL, 'center', 0);
  // PORTFEL
  let [x, y, cw, ch] = ZONES[0]; card(g, x, y, cw, ch, p.hi === 0);
  T(g, 'WALLET', x + 30, y + 48, 17, 'MONO', 'rgba(255,255,255,.55)', 'left', 3);
  T(g, 'Available balance', x + 30, y + 92, 20, 'POPR', 'rgba(255,255,255,.6)', 'left', 0);
  T(g, '£' + fmtAll(375 * p.k), x + 30, y + 160, 62, 'POPB', C.white, 'left', -1);
  T(g, 'Pending: £75', x + 30, y + 200, 19, 'POPR', 'rgba(255,255,255,.45)', 'left', 0);
  RR(g, x + 30, y + 222, cw - 60, 30, 15); g.fillStyle = 'rgba(139,92,246,.16)'; g.fill(); T(g, 'profit after stock: £' + fmtAll(350 * p.k), x + 48, y + 243, 17, 'POPB', C.pXL, 'left', 0);
  RR(g, x + 30, y + 268, cw - 60, 44, 22); g.fillStyle = C.vinted; g.fill(); T(g, 'Withdraw to bank account', x + cw / 2, y + 297, 19, 'POPB', '#fff', 'center', 0);
  // WEEK CHART
  [x, y, cw, ch] = [60, 480, 475, 340]; card(g, x, y, cw, ch, false);
  T(g, 'Sales this week', x + 30, y + 46, 20, 'POPB', C.white, 'left', 0);
  T(g, '£' + fmtAll(2450 * p.k) + ' profit', x + cw - 30, y + 46, 18, 'POPB', C.pL, 'right', 0);
  const by0 = y + ch - 50, bw = 42, gap = (cw - 60 - bw * 7) / 6;
  DAYS.forEach((d, i) => {
    const kk = eOC(clamp(p.chart * 7 - i * .55)); const bh = d.v / 440 * 200 * kk; const xx = x + 30 + i * (bw + gap);
    const gr = g.createLinearGradient(0, by0 - bh, 0, by0); gr.addColorStop(0, i === 6 ? C.pXL : C.p); gr.addColorStop(1, 'rgba(109,40,217,.25)');
    RR(g, xx, by0 - bh, bw, Math.max(bh, 1), 9); g.fillStyle = gr; g.fill();
    T(g, d.d, xx + bw / 2, by0 + 28, 15, 'POPR', 'rgba(255,255,255,.45)', 'center', 0);
  });
  // TRANSAKCJE
  [x, y, cw, ch] = ZONES[1]; card(g, x, y, cw, ch, p.hi === 1);
  T(g, 'Transactions', x + 30, y + 52, 26, 'POPB', C.white, 'left', 0);
  RR(g, x + cw - 150, y + 24, 120, 38, 19); g.fillStyle = 'rgba(9,177,186,.2)'; g.fill(); T(g, 'Today: ' + nb, x + cw - 90, y + 50, 18, 'POPB', '#7FE3E8', 'center', 0);
  const times = ['just now', '14 min', '1 hr', '3 hrs', '5 hrs', 'yesterday'], sizes = ['M', 'L', 'S', 'XL', 'M', 'L'];
  for (let i = 0; i < 6; i++) {
    const ry = y + 90 + i * 100; const ra = i < 5 ? eOC(clamp(p.chart * 6 - (4 - i) * .6)) : .45;
    g.save(); g.globalAlpha = ra;
    RR(g, x + 20, ry, cw - 40, 88, 16); g.fillStyle = 'rgba(255,255,255,.035)'; g.fill();
    RR(g, x + 34, ry + 12, 64, 64, 12); g.fillStyle = '#1F1B2B'; g.fill();
    g.save(); RR(g, x + 34, ry + 12, 64, 64, 12); g.clip(); const sw = SWC[i % 4]; sweater(g, x + 66, ry + 45, .15, sw[0], sw[1]); g.restore();
    T(g, 'Ralph Lauren Sweater', x + 116, ry + 38, 19, 'POPB', C.white, 'left', 0);
    T(g, 'Size ' + sizes[i] + ' · Completed ✓', x + 116, ry + 66, 15, 'POPR', '#7FE3E8', 'left', 0);
    T(g, '+£75', x + cw - 40, ry + 40, 21, 'POPB', C.pL, 'right', 0);
    T(g, times[i], x + cw - 40, ry + 66, 14, 'POPR', 'rgba(255,255,255,.4)', 'right', 0);
    g.restore();
  }
  // OPINIE
  [x, y, cw, ch] = ZONES[2]; card(g, x, y, cw, ch, p.hi === 2);
  T(g, 'Reviews', x + 30, y + 52, 26, 'POPB', C.white, 'left', 0);
  T(g, '4.9', x + 30, y + 140, 64, 'POPB', C.white, 'left', -1); stars(g, x + 150, y + 112, 26); T(g, '128 reviews', x + 152, y + 140, 18, 'POPR', 'rgba(255,255,255,.5)', 'left', 0);
  const revs = [['ola.styl', 'O', 'Like new, 10/10 seller!'], ['mateusz_k', 'M', 'Fast shipping, super friendly.'], ['vintage_ania', 'A', 'Exactly as described, thanks!'], ['kuba.vtg', 'K', 'Amazing quality, buying again.']];
  revs.forEach((r, i) => {
    const ry = y + 180 + i * 126; const ra = eOC(clamp(p.chart * 5 - i * .5));
    g.save(); g.globalAlpha = ra;
    RR(g, x + 20, ry, cw - 40, 112, 16); g.fillStyle = 'rgba(255,255,255,.035)'; g.fill();
    g.fillStyle = ['#4C1D95', '#155E63', '#6B2A4A', '#374151'][i]; g.beginPath(); g.arc(x + 56, ry + 34, 18, 0, 6.29); g.fill(); T(g, r[1], x + 56, ry + 40, 16, 'POPB', '#fff', 'center', 0);
    T(g, r[0], x + 84, ry + 32, 16, 'POPB', C.white, 'left', 0); stars(g, x + 84, ry + 54, 14);
    T(g, r[2], x + 38, ry + 92, 16, 'POPR', 'rgba(255,255,255,.72)', 'left', 0);
    g.restore();
  });
  T(g, '* example figures', w - 40, h - 26, 15, 'POPR', 'rgba(255,255,255,.3)', 'right', 0);
  g.restore();
  RR(g, 1, 1, w - 2, h - 2, 34); g.lineWidth = 2; g.strokeStyle = 'rgba(167,139,250,.25)'; g.stroke();
}
// crisp 2D zoom of one zone of the seller view, centred at (cx, cy), fitted into maxW x maxH
function zoomZone(i, cx, cy, maxW, maxH, alpha = 1, glow = 40) {
  const [x, y, w, h] = ZONES[i]; const sc = Math.min(maxW / w, maxH / h);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(139,92,246,.75)'; ctx.shadowBlur = glow; RR(ctx, cx - w * sc / 2, cy - h * sc / 2, w * sc, h * sc, 22 * sc); ctx.fillStyle = '#17142A'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); RR(ctx, cx - w * sc / 2, cy - h * sc / 2, w * sc, h * sc, 22 * sc); ctx.clip();
  ctx.drawImage(DASH, x * 2, y * 2, w * 2, h * 2, cx - w * sc / 2, cy - h * sc / 2, w * sc, h * sc); ctx.restore();
  ctx.restore();
}
// ---------- product cards (offscreen) ----------
const BUYCARD = mk(1240, 1600), SELLCARD = mk(1240, 1600);
function drawBuyCard(p) { // p: {qty, ordered:0..1, press}
  const g = BUYCARD.getContext('2d'); const w = 620, h = 800; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1240, 1600); g.setTransform(2, 0, 0, 2, 0, 0);
  RR(g, 0, 0, w, h, 36); g.fillStyle = '#100E18'; g.fill();
  g.save(); RR(g, 0, 0, w, h, 36); g.clip();
  const gr = g.createLinearGradient(0, 0, 0, 470); gr.addColorStop(0, '#231B3A'); gr.addColorStop(1, '#14111F'); g.fillStyle = gr; g.fillRect(0, 0, w, 470);
  sweater(g, w / 2, 250, .95);
  g.restore();
  { const tw = TW(g, 'Supplier from', 18, 'POPM'), lw = LOGO_META.w * 15 / LETTER_H; RR(g, 26, 26, tw + lw + 50, 50, 25); g.fillStyle = 'rgba(11,10,16,.75)'; g.fill(); T(g, 'Supplier from', 44, 59, 18, 'POPM', 'rgba(255,255,255,.75)', 'left', 0); logoImg(g, 44 + tw + 8 + lw / 2, 51, 15); }
  RR(g, w - 154, 26, 128, 50, 25); g.fillStyle = 'rgba(139,92,246,.25)'; g.fill(); T(g, '✓ verified', w - 90, 59, 19, 'IDS', C.pXL, 'center', 0);
  T(g, 'Ralph Lauren Sweater', 36, 530, 38, 'IDX', C.white, 'left', -1);
  T(g, 'Cable knit · sizes S–XL · mint condition', 36, 568, 22, 'IDM', C.grey, 'left', 0);
  T(g, 'SUPPLIER PRICE', 36, 640, 17, 'MONO', C.grey, 'left', 2);
  T(g, '£5', 36, 712, 72, 'IDB', C.white, 'left', -2);
  T(g, '/ each', 36 + TW(g, '£5', 72, 'IDB', -2) + 12, 712, 26, 'IDM', C.grey, 'left', 0);
  const bw = 230, bx = w - 36 - bw, by = 650; const ord = p.ordered || 0;
  RR(g, bx, by, bw, 76, 38); g.fillStyle = ord > .5 ? '#2A2140' : C.p; g.fill();
  T(g, ord > .5 ? 'Ordered ✓' : 'Order', bx + bw / 2, by + 48, 28, 'IDX', ord > .5 ? C.pXL : '#fff', 'center', 0);
  RR(g, 1, 1, w - 2, h - 2, 36); g.lineWidth = 2; g.strokeStyle = 'rgba(167,139,250,.3)'; g.stroke();
}
function drawSellCard(p) { // p: {price 0..279, likes}
  const g = SELLCARD.getContext('2d'); const w = 620, h = 800; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1240, 1600); g.setTransform(2, 0, 0, 2, 0, 0);
  RR(g, 0, 0, w, h, 36); g.fillStyle = '#100E18'; g.fill();
  g.save(); RR(g, 0, 0, w, h, 36); g.clip();
  const gr = g.createLinearGradient(0, 0, 0, 470); gr.addColorStop(0, '#12333A'); gr.addColorStop(1, '#101A20'); g.fillStyle = gr; g.fillRect(0, 0, w, 470);
  sweater(g, w / 2, 250, .95);
  g.restore();
  RR(g, 26, 26, 150, 50, 25); g.fillStyle = 'rgba(11,10,16,.75)'; g.fill(); if (IMG.vinted) vintedWord(g, 34, 51, 34); else T(g, 'Vinted', 101, 60, 24, 'POPB', '#fff', 'center', 0);
  RR(g, w - 128, 26, 102, 50, 25); g.fillStyle = 'rgba(11,10,16,.7)'; g.fill(); T(g, '♥ ' + Math.round(p.likes || 0), w - 77, 59, 21, 'IDS', C.white, 'center', 0);
  T(g, 'Ralph Lauren Sweater', 36, 530, 38, 'IDX', C.white, 'left', -1);
  T(g, 'Size M · Very good', 36, 568, 22, 'IDM', C.grey, 'left', 0);
  T(g, 'YOUR PRICE ON VINTED', 36, 640, 17, 'MONO', C.grey, 'left', 2);
  T(g, '£' + Math.round(p.price), 36, 712, 72, 'IDB', C.pL, 'left', -2);
  const bw = 230, bx = w - 36 - bw, by = 650;
  RR(g, bx, by, bw, 76, 38); g.fillStyle = p.sold ? C.p : C.vinted; g.fill();
  T(g, p.sold ? 'Sold ✓' : 'List it', bx + bw / 2, by + 48, 28, 'IDX', '#fff', 'center', 0);
  RR(g, 1, 1, w - 2, h - 2, 36); g.lineWidth = 2; g.strokeStyle = 'rgba(9,177,186,.35)'; g.stroke();
}

// ---------- line with travelling tags (node graph) ----------
function bez(p0, p1, p2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
function glowCurve(pts, prog, col = C.pL, lw = 4, glow = 18) {
  if (prog <= 0) return; const [p0, p1, p2, p3] = pts; const N = 60, n = Math.max(1, Math.floor(N * prog));
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = glow;
  ctx.beginPath(); for (let i = 0; i <= n; i++) { const q = bez(p0, p1, p2, p3, Math.min(prog, i / N)); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  const e = bez(p0, p1, p2, p3, prog); ctx.lineTo(e[0], e[1]); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e[0], e[1], lw * 1.3, 0, 6.29); ctx.fill();
  ctx.restore();
}
function tagDot(x, y, label, a = 1, col = C.pL) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.29); ctx.fill(); ctx.shadowBlur = 0;
  T(ctx, label, x + 18, y + 10, 28, 'IDX', C.white, 'left', 0); ctx.restore();
}

// ---------- big counter text ----------
function bigMoney(g, val, x, y, size, col = C.white, suffix = '', f = 'IDB') {
  const s = '£' + fmtAll(val); if (suffix === ' zł') suffix = ''; const digW = TW(g, '0', size, f, -2) * 1.0;
  const chars = (s + suffix).split(''); let total = 0;
  const ws = chars.map(ch => /\d/.test(ch) ? digW : TW(g, ch, size, f, -2)); ws.forEach(w => total += w);
  let xx = x - total / 2; chars.forEach((ch, i) => { T(g, ch, xx + ws[i] / 2, y, size, f, col, 'center', 0); xx += ws[i]; });
  return total;
}

// ---------- canvas helpers for 3D text / extrusion ----------
const _tc = {};
function textCanvas(key, str, size, f, col, pad = 40, ls = -4) {
  if (_tc[key]) return _tc[key];
  const w = Math.ceil(TW(ctx, str, size, f, ls)) + pad * 2, h = Math.ceil(size * 1.3) + pad * 2;
  const c = mk(w, h), g = c.getContext('2d'); T(g, str, w / 2, pad + size * 1.0, size, f, col, 'center', ls);
  _tc[key] = c; return c;
}
function tint(src, col) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
// extruded panel: draws side layers back-to-front then the face
function extrude(front, side, o, depth = 40, layers = 12) {
  const base = Object.assign({}, o, { glow: 0, nu: o.nu || 4, nv: o.nv || 2 });
  for (let i = layers; i >= 1; i--) {
    const d = depth * i / layers; const off = rot([0, 0, d], o.rx || 0, o.ry || 0, o.rz || 0);
    panel3D(side, Object.assign({}, base, { x: (o.x || 0) + off[0], y: (o.y || 0) + off[1], z: (o.z || 0) + off[2], twoSided: true }));
  }
  panel3D(front, Object.assign({}, o, { twoSided: true }));
}

// ---------- whole-frame 3D camera sway (slow orbit: right/up/left/down), 16 s periodic ----------
const SWF = mk(W, H), swx = SWF.getContext('2d');
let SWAY_AMP = .8;
function swayFrame(t) {
  if (!SWAY_AMP) return;
  const w = Math.PI * 2 / 16, A = SWAY_AMP;
  const ry = A * (.10 * Math.sin(3 * w * t) + .025 * Math.sin(5 * w * t + 1.3));
  const rx = A * (.075 * Math.sin(4 * w * t + .7) + .02 * Math.sin(7 * w * t + 2.1));
  const rz = A * .012 * Math.sin(2 * w * t + .4);
  const sc = 1.05, F = 1.3 * Math.max(W, H);
  swx.setTransform(1, 0, 0, 1, 0, 0); swx.globalAlpha = 1; swx.clearRect(0, 0, W, H); swx.drawImage(cv, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#050408'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(SWF, -W * .15, -H * .15, W * 1.3, H * 1.3);
  const cyy = Math.cos(ry), syy = Math.sin(ry), cxx = Math.cos(rx), sxx = Math.sin(rx), czz = Math.cos(rz), szz = Math.sin(rz);
  const pr = (u, v) => { const X = (u - W / 2) * sc, Y = (v - H / 2) * sc;
    const x1 = X * czz - Y * szz, y1 = X * szz + Y * czz;
    const x2 = x1 * cyy, z2 = -x1 * syy;
    const y3 = y1 * cxx - z2 * sxx, z3 = y1 * sxx + z2 * cxx;
    const k = F / (F + z3); return [W / 2 + x2 * k, H / 2 + y3 * k]; };
  const nu = W >= H ? 10 : 6, nv = W >= H ? 6 : 10, pts = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pts.push(pr(i / nu * W, j / nv * H));
  const id = (i, j) => j * (nu + 1) + i;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const u0 = i / nu * W, u1 = (i + 1) / nu * W, v0 = j / nv * H, v1 = (j + 1) / nv * H;
    tri(SWF, pts[id(i, j)], pts[id(i + 1, j)], pts[id(i + 1, j + 1)], [u0, v0], [u1, v0], [u1, v1]);
    tri(SWF, pts[id(i, j)], pts[id(i + 1, j + 1)], pts[id(i, j + 1)], [u0, v0], [u1, v1], [u0, v1]);
  }
}
// small website tag: globe + 21resell.com
function siteTag(a, x, y, size = 34) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + (1 - a) * 12);
  const tw = TW(ctx, '21resell.pl', size, 'POPB'), r = size * .42, tot = tw + r * 2 + 14, x0 = -tot / 2;
  ctx.strokeStyle = C.pXL; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x0 + r, -size * .34, r, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x0 + r, -size * .34, r * .45, r, 0, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, -size * .34); ctx.lineTo(x0 + 2 * r, -size * .34); ctx.stroke();
  ctx.shadowColor = 'rgba(139,92,246,.8)'; ctx.shadowBlur = 18;
  T(ctx, '21resell.pl', x0 + r * 2 + 14 + tw / 2, 0, size, 'POPB', '#FFFFFF', 'center', 0);
  ctx.restore();
}
// ---------- driver ----------
let SCENE_FN = null;
function draw(t) {
  const frame = Math.round(t * FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.clearRect(0, 0, W, H); camReset();
  SCENE_FN(t, frame);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  swayFrame(t);
  finish(t, frame);
}
// ---------- motion blur: adaptive sub-frame averaging over a 180-degree shutter ----------
const ACC = mk(W, H), accx = ACC.getContext('2d');
const PRB = mk(192, 108), prx = PRB.getContext('2d', { willReadFrequently: true });
function probe() { prx.drawImage(cv, 0, 0, 192, 108); return prx.getImageData(0, 0, 192, 108).data; }
function drawMB(t, fps = 60, nMax = 7, shutter = .5) {
  const span = shutter / fps, t0 = t - span / 2, t1 = t + span / 2;
  accx.globalCompositeOperation = 'source-over';
  draw(t0); const a = probe(); accx.globalAlpha = 1; accx.drawImage(cv, 0, 0);
  draw(t1); const b = probe(); accx.globalAlpha = 1 / 2; accx.drawImage(cv, 0, 0);
  let d = 0; for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  d /= (a.length / 4) * 3;
  const n = d < .6 ? 2 : d < 2.5 ? 4 : nMax;
  let cnt = 2;
  for (let k = 1; k < n - 1; k++) { draw(t0 + span * k / (n - 1)); cnt++; accx.globalAlpha = 1 / cnt; accx.drawImage(cv, 0, 0); }
  accx.globalAlpha = 1;
  return ACC;
}
window.ready = Promise.all(['IDB', 'IDX', 'IDS', 'IDM', 'MONO', 'MONOB', 'POPB', 'POPM', 'POPR', 'POPL'].map(f => document.fonts.load(`40px ${f}`)).concat([loadImg('vt', 'assets/vinted_tile.png')])).then(() => new Promise(r => (document.readyState === 'complete' ? r() : window.addEventListener('load', r)))).then(() => { draw(0); return true; });
