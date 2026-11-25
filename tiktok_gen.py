"""21Resell Mindset - automatic TikTok generator.

script.json -> 1080x1920 60fps MP4: black background, white + neon-purple glowing
caps text, minimal neon icons, female English voice-over (ElevenLabs) and an
original synthesized music bed (make_bed.py) ducked under the voice.

Usage:
  python3 tiktok_gen.py script.json OUT_DIR [--silent]   # --silent = no TTS (layout test)
Env:
  ELEVENLABS_API_KEY   (required unless --silent)
  ELEVENLABS_VOICE_ID  (optional, default Sarah)

script.json:
{
  "date": "2026-11-26", "title": "Winter excuse", "caption": "Start now. 🖤 #...",
  "theme": "winter" | "default",          # winter = falling snow
  "seed": 7,                              # music variant
  "scenes": [
    {"say": "Everyone says: I'll start after Christmas.",
     "icon": "calendar",                  # see ICONS below or "none"
     "lines": [["EVERYONE SAYS", "w"], ["AFTER CHRISTMAS", "p"]],
     "count": {"from": 0, "to": 450, "prefix": "£", "suffix": ""}   # optional
    }, ...
  ]
}
Line colour: "w" white, "p" purple, "s" small grey.
"""
import base64
import json
import math
import os
import subprocess
import sys
import urllib.error
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 60
FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
WHITE = (255, 255, 255)
PURPLE = (180, 155, 255)
NEON = (139, 92, 255)
GREY = (150, 150, 165)
COLORS = {"w": WHITE, "p": PURPLE, "s": GREY}
HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = ["person", "sweater", "hourglass", "calendar", "stairs", "wheel", "snowflake",
         "gift", "phone", "coin", "chart", "clock", "bag", "tree", "none"]

# ---------------------------------------------------------------- helpers

def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_back(x):
    x = min(max(x, 0.0), 1.0)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def glowify(img, color=NEON, radius=18, strength=1.6):
    """img: RGBA white/colour artwork -> RGBA with neon glow under it."""
    a = img.split()[3]
    pad = radius * 3
    big = Image.new("L", (img.width + 2 * pad, img.height + 2 * pad), 0)
    big.paste(a, (pad, pad))
    g1 = big.filter(ImageFilter.GaussianBlur(radius))
    g2 = big.filter(ImageFilter.GaussianBlur(radius / 3))
    ga = np.clip((np.asarray(g1, np.float32) * strength * 0.8 + np.asarray(g2, np.float32) * 0.6), 0, 255)
    glow = Image.new("RGBA", big.size, color + (0,))
    glow.putalpha(Image.fromarray(ga.astype(np.uint8)))
    glow.alpha_composite(img, (pad, pad))
    return glow


def text_img(s, size, color, tracking=0.12):
    font = ImageFont.truetype(FONT, size)
    sp = int(size * tracking)
    widths = [font.getlength(ch) for ch in s]
    tw = int(sum(widths) + sp * (len(s) - 1)) + 4
    asc, desc = font.getmetrics()
    im = Image.new("RGBA", (max(tw, 1), asc + desc + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 2
    for ch, w in zip(s, widths):
        d.text((x, 2), ch, font=font, fill=color + (255,))
        x += w + sp
    return im


def fit_text(s, color, max_w=940, start=104, min_size=46, tracking=0.12):
    size = start
    while size > min_size:
        im = text_img(s, size, color, tracking)
        if im.width <= max_w:
            return im
        size -= 4
    return text_img(s, min_size, color, tracking)

# ---------------------------------------------------------------- icons

def icon_img(name, t, S=440):
    """Draw icon at animation time t (seconds within scene). Returns RGBA (glowing)."""
    sc = 4  # supersample
    s = S * sc
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = 13 * sc
    c = PURPLE + (255,)
    wc = WHITE + (255,)
    m = s / 2

    def P(x, y):
        return (x * s, y * s)

    if name == "person":
        d.ellipse([P(.40, .12), P(.60, .32)], outline=c, width=lw)
        d.line([P(.5, .32), P(.5, .62)], fill=c, width=lw)
        sw = math.sin(t * 6) * .04
        d.line([P(.5, .40), P(.33, .52 + sw)], fill=c, width=lw)
        d.line([P(.5, .40), P(.67, .52 - sw)], fill=c, width=lw)
        d.line([P(.5, .62), P(.37, .88)], fill=c, width=lw)
        d.line([P(.5, .62), P(.63, .88)], fill=c, width=lw)
    elif name == "sweater":
        pts = [P(.32, .18), P(.42, .18), P(.5, .26), P(.58, .18), P(.68, .18), P(.92, .38), P(.82, .50),
               P(.74, .43), P(.74, .86), P(.26, .86), P(.26, .43), P(.18, .50), P(.08, .38)]
        d.line(pts + [pts[0]], fill=c, width=lw, joint="curve")
        sway = math.sin(t * 3) * .02
        d.line([P(.66, .60), P(.80 + sway, .70)], fill=wc, width=lw // 2)
        d.rounded_rectangle([P(.74 + sway, .68), P(.94 + sway, .84)], radius=4 * sc, outline=wc, width=lw // 2)
        f = ImageFont.truetype(FONT, int(.11 * s))
        d.text(P(.84 + sway, .765), "£", font=f, fill=wc, anchor="mm")
    elif name == "hourglass":
        ang = 0 if (t % 4) < 3.4 else (t % 4 - 3.4) / .6 * 180
        g = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.line([P(.28, .12), P(.72, .12)], fill=c, width=lw)
        gd.line([P(.28, .88), P(.72, .88)], fill=c, width=lw)
        gd.line([P(.33, .12), P(.5, .5), P(.33, .88)], fill=c, width=lw)
        gd.line([P(.67, .12), P(.5, .5), P(.67, .88)], fill=c, width=lw)
        k = min((t % 4) / 3.4, 1)
        top = .45 - .30 * (1 - k)
        gd.polygon([P(.5 - (.45 - top) * .4, top), P(.5 + (.45 - top) * .4, top), P(.5, .47)], fill=wc)
        hb = .84 - .30 * k
        gd.polygon([P(.39, .84), P(.61, .84), P(.5, hb)], fill=wc)
        if k < 1:
            gd.line([P(.5, .5), P(.5, .84)], fill=wc, width=sc * 3)
        im = g.rotate(-ang, resample=Image.BICUBIC, center=(m, m))
    elif name == "calendar":
        d.rounded_rectangle([P(.14, .2), P(.86, .86)], radius=30 * sc, outline=c, width=lw)
        d.line([P(.14, .38), P(.86, .38)], fill=c, width=lw)
        d.line([P(.34, .12), P(.34, .26)], fill=c, width=lw)
        d.line([P(.66, .12), P(.66, .26)], fill=c, width=lw)
        n = int(t * 4) % 12
        for i in range(12):
            x, y = .25 + (i % 4) * .167, .49 + (i // 4) * .12
            if i == n:
                d.ellipse([P(x - .05, y - .045), P(x + .05, y + .045)], fill=wc)
            else:
                d.ellipse([P(x - .018, y - .016), P(x + .018, y + .016)], fill=c)
    elif name == "stairs":
        pts = [P(.1, .86)]
        for i in range(5):
            x, y = .1 + i * .16, .86 - i * .15
            pts += [P(x + .16, y), P(x + .16, y - .15)]
        d.line(pts, fill=c, width=lw, joint="curve")
        k = (t * .6) % 1
        i = int(k * 5)
        x, y = .1 + i * .16 + .08, .86 - (i + 1) * .15 - .05
        d.ellipse([P(x - .045, y - .045), P(x + .045, y + .045)], fill=wc)
    elif name == "wheel":
        g = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.ellipse([P(.12, .12), P(.88, .88)], outline=c, width=lw)
        for i in range(12):
            a = i / 12 * 2 * math.pi
            r1, r2 = .30, .36
            gd.line([P(.5 + r1 * math.cos(a), .5 + r1 * math.sin(a)), P(.5 + r2 * math.cos(a), .5 + r2 * math.sin(a))],
                    fill=wc if i == 0 else c, width=lw // 2)
        gd.ellipse([P(.46, .46), P(.54, .54)], fill=c)
        im = g.rotate(-t * 40, resample=Image.BICUBIC, center=(m, m))
    elif name == "snowflake":
        g = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        for i in range(6):
            a = i / 6 * 2 * math.pi
            ex, ey = .5 + .38 * math.cos(a), .5 + .38 * math.sin(a)
            gd.line([P(.5, .5), P(ex, ey)], fill=c, width=lw)
            for r in (.22, .31):
                bx, by = .5 + r * math.cos(a), .5 + r * math.sin(a)
                for da in (.6, -.6):
                    gd.line([P(bx, by), P(bx + .08 * math.cos(a + da), by + .08 * math.sin(a + da))], fill=wc,
                            width=lw // 2)
        im = g.rotate(-t * 15, resample=Image.BICUBIC, center=(m, m))
    elif name == "gift":
        lid = math.sin(t * 4) * .02 - .02
        d.rectangle([P(.18, .44), P(.82, .86)], outline=c, width=lw)
        d.rectangle([P(.13, .32 + lid), P(.87, .44 + lid)], outline=c, width=lw)
        d.line([P(.5, .32 + lid), P(.5, .86)], fill=wc, width=lw // 2)
        d.ellipse([P(.32, .18 + lid), P(.5, .32 + lid)], outline=wc, width=lw // 2)
        d.ellipse([P(.5, .18 + lid), P(.68, .32 + lid)], outline=wc, width=lw // 2)
    elif name == "phone":
        d.rounded_rectangle([P(.28, .08), P(.72, .92)], radius=40 * sc, outline=c, width=lw)
        d.line([P(.44, .14), P(.56, .14)], fill=c, width=lw // 2)
        k = (t * .8) % 1
        d.rounded_rectangle([P(.34, .22), P(.66, .52)], radius=10 * sc, outline=wc, width=lw // 2)
        f = ImageFont.truetype(FONT, int(.12 * s))
        d.text(P(.5, .37), "£", font=f, fill=wc, anchor="mm")
        d.line([P(.35, .60), P(.65, .60)], fill=c, width=lw // 2)
        d.line([P(.35, .68), P(.55, .68)], fill=c, width=lw // 2)
        hy = .82 - k * .12
        a = int(255 * (1 - k))
        hc = WHITE + (a,)
        d.ellipse([P(.555, hy - .03), P(.6, hy + .01)], fill=hc)
        d.ellipse([P(.59, hy - .03), P(.635, hy + .01)], fill=hc)
        d.polygon([P(.557, hy - .002), P(.633, hy - .002), P(.595, hy + .05)], fill=hc)
    elif name == "coin":
        for i in range(3):
            y = .78 - i * .1
            d.ellipse([P(.22, y - .08), P(.78, y + .08)], outline=c, width=lw)
        bob = math.sin(t * 3) * .03
        d.ellipse([P(.27, .12 + bob), P(.73, .5 + bob)], outline=wc, width=lw)
        f = ImageFont.truetype(FONT, int(.24 * s))
        d.text(P(.5, .31 + bob), "£", font=f, fill=wc, anchor="mm")
    elif name == "chart":
        d.line([P(.12, .12), P(.12, .88), P(.88, .88)], fill=c, width=lw)
        k = min(t / 1.6, 1)
        ys = [.78, .70, .74, .56, .48, .30, .18]
        n = len(ys)
        pts = [P(.16 + i * .12, ys[i]) for i in range(n)]
        upto = 1 + k * (n - 1)
        whole = int(upto)
        seg = pts[:whole]
        if whole < n:
            fr = upto - whole
            a, b = pts[whole - 1], pts[whole]
            seg.append((a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr))
        if len(seg) > 1:
            d.line(seg, fill=wc, width=lw, joint="curve")
        ex, ey = seg[-1]
        d.ellipse([ex - lw, ey - lw, ex + lw, ey + lw], fill=wc)
    elif name == "clock":
        d.ellipse([P(.12, .12), P(.88, .88)], outline=c, width=lw)
        a1 = t * 2 * math.pi / 2 - math.pi / 2
        a2 = t * 2 * math.pi / 24 - math.pi / 2
        d.line([P(.5, .5), P(.5 + .28 * math.cos(a1), .5 + .28 * math.sin(a1))], fill=wc, width=lw // 2)
        d.line([P(.5, .5), P(.5 + .18 * math.cos(a2), .5 + .18 * math.sin(a2))], fill=c, width=lw)
        for i in range(12):
            a = i / 12 * 2 * math.pi
            d.ellipse([P(.5 + .32 * math.cos(a) - .012, .5 + .32 * math.sin(a) - .012),
                       P(.5 + .32 * math.cos(a) + .012, .5 + .32 * math.sin(a) + .012)], fill=c)
    elif name == "bag":
        d.line([P(.18, .34), P(.82, .34), P(.86, .88), P(.14, .88), P(.18, .34)], fill=c, width=lw, joint="curve")
        d.arc([P(.34, .12), P(.66, .50)], 180, 360, fill=c, width=lw)
        f = ImageFont.truetype(FONT, int(.2 * s))
        d.text(P(.5, .62), "£", font=f, fill=wc, anchor="mm")
    elif name == "tree":
        for i, (y0, w0) in enumerate([(.14, .16), (.32, .26), (.52, .36)]):
            d.line([P(.5, y0), P(.5 - w0, y0 + .24), P(.5 + w0, y0 + .24), P(.5, y0)], fill=c, width=lw,
                   joint="curve")
        d.rectangle([P(.45, .76), P(.55, .88)], outline=c, width=lw // 2)
        for i, (x, y) in enumerate([(.44, .40), (.58, .58), (.40, .66), (.62, .42), (.5, .30)]):
            on = (int(t * 3) + i) % 2 == 0
            r = .022 if on else .014
            d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=wc if on else c)
    else:
        return None
    im = im.resize((S, S), Image.LANCZOS)
    return glowify(im, NEON, radius=16, strength=1.5)

# ---------------------------------------------------------------- scenes

class Scene:
    def __init__(self, spec, t0, t1):
        self.spec, self.t0, self.t1 = spec, t0, t1
        self.icon = spec.get("icon", "none")
        if self.icon not in ICONS:
            self.icon = "none"
        self.lines = []
        for txt, col in spec.get("lines", []):
            big = col != "s"
            im = fit_text(txt.upper(), COLORS.get(col, WHITE), start=118 if big else 56,
                          min_size=44 if big else 30, tracking=0.12 if big else 0.18)
            self.lines.append(glowify(im, NEON if col != "s" else (90, 70, 160), radius=14,
                                      strength=1.3 if col == "p" else 0.9))
        self.count = spec.get("count")

    def draw(self, frame, t):
        lt = t - self.t0
        dur = self.t1 - self.t0
        out_a = 1.0 - ease_out((lt - (dur - 0.22)) / 0.22) if lt > dur - 0.22 else 1.0
        has_icon = self.icon != "none"
        block_h = sum(l.height - 60 for l in self.lines) + (34 * max(len(self.lines) - 1, 0))
        if self.count:
            block_h += 200
        icon_h = 440 if has_icon else 0
        total = icon_h + (70 if has_icon else 0) + block_h
        y = int(820 - total / 2)  # centre around y=820 (TikTok safe zone)
        y = max(y, 300)
        if has_icon:
            k = ease_back(lt / 0.55)
            ic = icon_img(self.icon, lt)
            sc = 0.6 + 0.4 * k
            float_y = math.sin(lt * 2.2) * 8
            if ic is not None:
                iw = max(int(ic.width * sc), 1)
                ic = ic.resize((iw, iw), Image.BILINEAR)
                paste(frame, ic, W // 2 - iw // 2, int(y + 220 - iw / 2 + float_y), min(1.0, lt / 0.3) * out_a)
            y += icon_h + 70
        for i, im in enumerate(self.lines):
            delay = 0.12 + i * 0.28
            k = ease_out((lt - delay) / 0.45)
            if k <= 0:
                y += im.height - 60 + 34
                continue
            dy = int((1 - k) * 40)
            paste(frame, im, W // 2 - im.width // 2, y - 30 + dy, k * out_a)
            y += im.height - 60 + 34
        if self.count:
            c = self.count
            k = ease_out((lt - 0.3) / max(dur - 0.9, 0.6))
            v = c.get("from", 0) + (c["to"] - c.get("from", 0)) * k
            s = f"{c.get('prefix', '')}{int(round(v)):,}{c.get('suffix', '')}"
            im = glowify(text_img(s, 150, PURPLE, 0.06), NEON, radius=18, strength=1.6)
            pulse = 1 + 0.04 * math.sin(lt * 6) if k >= 1 else 1
            if pulse != 1:
                im = im.resize((int(im.width * pulse), int(im.height * pulse)), Image.BILINEAR)
            paste(frame, im, W // 2 - im.width // 2, y - 40, min(1, lt / 0.3) * out_a)


def paste(frame, im, x, y, alpha):
    if alpha <= 0.01:
        return
    if alpha < 0.999:
        a = np.asarray(im.split()[3], np.float32) * alpha
        im = im.copy()
        im.putalpha(Image.fromarray(a.astype(np.uint8)))
    frame.alpha_composite(im, (int(x), int(y)))

# ---------------------------------------------------------------- background

class Background:
    def __init__(self, theme, dur, seed=1):
        rng = np.random.default_rng(seed)
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - 820) / H) ** 2)
        glow = np.clip(1 - r * 1.9, 0, 1) ** 2
        base = np.zeros((H, W, 4), np.uint8)
        base[..., 0] = (glow * 22).astype(np.uint8)
        base[..., 1] = (glow * 10).astype(np.uint8)
        base[..., 2] = (glow * 40).astype(np.uint8)
        base[..., 3] = 255
        self.base = Image.fromarray(base, "RGBA")
        self.theme = theme
        n = 90 if theme == "winter" else 40
        self.px = rng.uniform(0, W, n)
        self.py = rng.uniform(0, H, n)
        self.pr = rng.uniform(2, 6 if theme == "winter" else 3.5, n)
        self.pv = rng.uniform(40, 120 if theme == "winter" else 25, n)
        self.ph = rng.uniform(0, 6.28, n)

    def frame(self, t):
        f = self.base.copy()
        d = ImageDraw.Draw(f)
        for x, y, r, v, ph in zip(self.px, self.py, self.pr, self.pv, self.ph):
            if self.theme == "winter":
                yy = (y + v * t) % (H + 20) - 10
                xx = x + math.sin(t * 0.8 + ph) * 25
                a = int(90 + 80 * (r / 6))
                d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(235, 230, 255, a))
            else:
                yy = (y - v * t) % H
                a = int(40 + 50 * (0.5 + 0.5 * math.sin(t * 1.3 + ph)))
                d.ellipse([x - r, yy - r, x + r, yy + r], fill=PURPLE + (a,))
        return f

# ---------------------------------------------------------------- TTS

def tts_elevenlabs(scenes, out_mp3):
    key = os.environ["ELEVENLABS_API_KEY"]
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
    sep = " "
    parts = [s["say"].strip() for s in scenes]
    text = sep.join(parts)
    body = json.dumps({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code not in (400, 404) or os.environ.get("_EL_RETRY"):
            raise RuntimeError(f"ElevenLabs HTTP {e.code}: {e.read()[:300]!r}")
        # voice not available -> pick a female English premade voice
        vr = urllib.request.Request("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": key})
        with urllib.request.urlopen(vr, timeout=60) as r:
            voices = json.loads(r.read())["voices"]
        fem = [v for v in voices if (v.get("labels") or {}).get("gender") == "female"] or voices
        os.environ["ELEVENLABS_VOICE_ID"] = fem[0]["voice_id"]
        os.environ["_EL_RETRY"] = "1"
        print("voice fallback ->", fem[0].get("name"), file=sys.stderr)
        return tts_elevenlabs(scenes, out_mp3)
    with open(out_mp3, "wb") as f:
        f.write(base64.b64decode(res["audio_base64"]))
    al = res.get("alignment") or res.get("normalized_alignment")
    starts = al["character_start_times_seconds"]
    ends = al["character_end_times_seconds"]
    # scene boundary = start time of each part's first character
    idx, bounds = 0, []
    for p in parts:
        bounds.append(starts[min(idx, len(starts) - 1)])
        idx += len(p) + len(sep)
    end = ends[-1]
    return bounds, end


def silent_timing(scenes):
    bounds, t = [], 0.0
    for s in scenes:
        bounds.append(t)
        t += max(1.6, len(s["say"].split()) / 2.6 + 0.35)
    return bounds, t

# ---------------------------------------------------------------- main

def build(script_path, out_dir, silent=False):
    spec = json.load(open(script_path))
    os.makedirs(out_dir, exist_ok=True)
    scenes = spec["scenes"]
    voice = os.path.join(out_dir, "voice.mp3")
    lead = 0.35  # silence before voice
    if silent:
        bounds, vend = silent_timing(scenes)
    else:
        bounds, vend = tts_elevenlabs(scenes, voice)
    tail = 1.6
    dur = lead + vend + tail
    # scene windows
    wins = []
    for i in range(len(scenes)):
        a = 0.0 if i == 0 else lead + bounds[i] - 0.12
        b = (lead + bounds[i + 1] - 0.12) if i + 1 < len(scenes) else dur
        wins.append((a, b))
    objs = [Scene(s, a, b) for s, (a, b) in zip(scenes, wins)]
    bg = Background(spec.get("theme", "default"), dur, seed=spec.get("seed", 1))

    video = os.path.join(out_dir, "video.mp4")
    nframes = int(math.ceil(dur * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
                          "-crf", "19", "-pix_fmt", "yuv420p", video], stdin=subprocess.PIPE)
    si = 0
    for fi in range(nframes):
        t = fi / FPS
        while si + 1 < len(objs) and t >= objs[si + 1].t0:
            si += 1
        fr = bg.frame(t)
        objs[si].draw(fr, t)
        p.stdin.write(fr.convert("RGB").tobytes())
    p.stdin.close()
    p.wait()

    # music bed
    bed = os.path.join(out_dir, "bed.wav")
    subprocess.run([sys.executable, os.path.join(HERE, "make_bed.py"), bed, f"{dur + 0.5:.2f}",
                    str(spec.get("seed", 21))], check=True, capture_output=True)
    final = os.path.join(out_dir, "final.mp4")
    if silent:
        fc = "[1:a]volume=0.55,alimiter=limit=0.95[a]"
        inputs = ["-i", video, "-i", bed]
    else:
        fc = (f"[2:a]adelay={int(lead * 1000)}|{int(lead * 1000)},aformat=channel_layouts=mono,"
              "pan=stereo|c0=c0|c1=c0,volume=1.0,asplit=2[v1][v2];"
              "[1:a]volume=0.30[m];[m][v1]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=400[md];"
              "[md][v2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]")
        inputs = ["-i", video, "-i", bed, "-i", voice]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "0:v",
                    "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", final], check=True)
    # QA contact sheet: one frame from the middle of every scene
    shots = []
    for a, b in wins:
        tt = min(a + (b - a) * 0.6, dur - 0.1)
        png = os.path.join(out_dir, f"_s{len(shots)}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{tt:.2f}", "-i", final, "-frames:v", "1",
                        "-vf", "scale=360:640", png], check=True)
        shots.append(Image.open(png))
    sheet = Image.new("RGB", (360 * len(shots), 640))
    for i, im in enumerate(shots):
        sheet.paste(im, (i * 360, 0))
    sheet.save(os.path.join(out_dir, "preview.png"))
    print(json.dumps({"final": final, "preview": os.path.join(out_dir, "preview.png"),
                      "duration": round(dur, 2), "frames": nframes}))
    return final


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2], silent="--silent" in sys.argv)
