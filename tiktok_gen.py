"""21Resell Mindset - automatic TikTok generator (style of IMG_2513 "Everyone scrolls" / IMG_2514 "I'll start tomorrow").

script.json -> 1080x1920 60fps MP4: black background with soft grey centre, white + purple glowing caps
titles revealed word by word (blur-in), white pill labels, filled white figures, purple knitted
jumpers, spotlight cones, count-up numbers, female English voice-over (ElevenLabs) and an original
synthesized music bed (make_bed.py) ducked under the voice.

Usage:
  python3 tiktok_gen.py script.json OUT_DIR [--silent]     # --silent = no TTS (layout test)
Env: ELEVENLABS_API_KEY (optional if the key is injected as a Network secret, header xi-api-key), ELEVENLABS_VOICE_ID (optional)

SCRIPT FORMAT (every key except "say" is optional):
{
 "date": "2026-11-26", "title": "short topic name", "caption": "Don't wait. 🖤 #motivation #success #vinted #vintedseller #resell",
 "theme": "default" | "winter",       # winter = a few soft snowflakes in the background
 "seed": 26,                          # music variant
 "footnote": "* EXAMPLE: £45 PROFIT × 2 A DAY × 365 DAYS",   # tiny grey line on number scenes
 "scenes": [ {
   "say":   "Everyone scrolls.",                       # voice-over for this scene
   "pill":  "EVERYONE SCROLLS",                        # small white pill label at the top
   "title": [["BUT YOU", "w"], ["WON'T.", "p"]],       # words/phrases, w=white p=purple; revealed one by one
   "visual": {...},                                    # one of the VISUALS below
   "number": {"value": 135, "prefix": "£", "sign": "", "color": "p", "from": 0,
              "pre": "ALMOST", "pill": "EVERY SINGLE DAY", "strike": false, "spotlight": false},
   "total":  {"label": "TOTAL PROFIT", "value": 405, "prefix": "£", "from": 0},   # small counter low on screen
   "footnote": true                                    # show the script footnote on this scene
 } ]
}
VISUALS ("type"):
  crowd     {"n": 7, "highlight": 3, "spotlight": true}           people with phones, one lit up
  flip      {"buy": 5, "sell": 50, "platform": "VINTED"}          YOU + jumper flies to the sale tag, +£profit
  items     {"n": 3, "tag": "+£45"}                               row of jumpers with purple tags (n<=5)
  calendar  {"label": "TODAY", "value": 1, "to": 30, "hourglasses": false}   day card (counts value->to)
  cards     {"items": ["TOMORROW", "NEXT WEEK"], "small": "LET'S START", "cross": true}   excuses crossed out
  wheel     {"center": "1 YEAR"}                                  month wheel with moving dot
  stairs    {"label": "MONTH 1"}                                  figure climbing to a purple flag
  hourglass {}                                                    flipping hourglass
  grid      {"total": 30, "label": "30 DAYS × £90"}               squares filling purple
  pile      {}                                                    pile of purple jumpers between people
  icon      {"name": "snowflake"}  names: person sweater hourglass calendar stairs wheel snowflake gift phone coin chart clock bag tree
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
FONT_M = "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf"
WHITE = (255, 255, 255)
PURPLE = (180, 155, 255)     # text purple
VIOLET = (139, 92, 246)      # fills / pills
NEON = (139, 92, 255)
GREY = (150, 150, 150)
DARK = (90, 90, 90)
COL = {"w": WHITE, "p": PURPLE}
HERE = os.path.dirname(os.path.abspath(__file__))
_font_cache = {}


def font(size, medium=False):
    k = (size, medium)
    if k not in _font_cache:
        _font_cache[k] = ImageFont.truetype(FONT_M if medium else FONT, size)
    return _font_cache[k]


def clamp(x):
    return min(max(x, 0.0), 1.0)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_io(x):
    x = clamp(x)
    return 3 * x * x - 2 * x * x * x


def ease_back(x):
    x = clamp(x)
    return 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2

# ---------------------------------------------------------------- drawing primitives

def glowify(img, color, radius=16, strength=1.0):
    a = img.split()[3]
    pad = int(radius * 2.5)
    big = Image.new("L", (img.width + 2 * pad, img.height + 2 * pad), 0)
    big.paste(a, (pad, pad))
    g = np.asarray(big.filter(ImageFilter.GaussianBlur(radius)), np.float32) * strength
    g += np.asarray(big.filter(ImageFilter.GaussianBlur(radius / 4)), np.float32) * 0.35 * strength
    out = Image.new("RGBA", big.size, color + (0,))
    out.putalpha(Image.fromarray(np.clip(g, 0, 255).astype(np.uint8)))
    out.alpha_composite(img, (pad, pad))
    return out


def text_img(s, size, color, tracking=0.1, medium=False):
    f = font(size, medium)
    sp = size * tracking
    widths = [f.getlength(ch) for ch in s]
    tw = int(sum(widths) + sp * max(len(s) - 1, 0)) + 6
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (max(tw, 2), asc + desc + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 3
    for ch, w in zip(s, widths):
        d.text((x, 3), ch, font=f, fill=color + (255,))
        x += w + sp
    bb = im.getbbox() or (0, 0, 2, 2)
    return im.crop((0, bb[1] - 2, im.width, bb[3] + 2))


def glow_text(s, size, color, tracking=0.1, glow=None, strength=0.9, radius=None):
    im = text_img(s, size, color, tracking)
    gc = glow or (NEON if color == PURPLE else (200, 200, 200))
    return glowify(im, gc, radius or max(8, size // 7), strength)


def pill(s, style="white", size=26):
    """style: white (white fill, black text) | purple (violet fill, white text) | outline | grey"""
    t = text_img(s, size, (10, 10, 10) if style == "white" else WHITE if style == "purple" else (200, 200, 200),
                 0.12)
    px, py = int(size * 0.8), int(size * 0.45)
    w, h = t.width + 2 * px, t.height + 2 * py
    im = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box = [4, 4, 4 + w, 4 + h]
    if style == "white":
        d.rounded_rectangle(box, radius=h // 2, fill=WHITE + (255,))
    elif style == "purple":
        d.rounded_rectangle(box, radius=h // 2, fill=VIOLET + (255,))
    elif style == "grey":
        d.rounded_rectangle(box, radius=h // 2, fill=(70, 70, 70, 255))
    else:
        d.rounded_rectangle(box, radius=h // 2, outline=(200, 200, 200, 255), width=3, fill=(0, 0, 0, 255))
    im.alpha_composite(t, (4 + px, 4 + py))
    return glowify(im, VIOLET if style == "purple" else (160, 160, 160), 12, 0.6 if style != "outline" else 0.3)


def paste(frame, im, cx, cy, alpha=1.0, blur=0.0, scale=1.0, anchor="c"):
    """Composite im centred at (cx, cy) (anchor 'c') or top-left ('tl')."""
    if im is None or alpha <= 0.01:
        return
    if abs(scale - 1) > 0.01:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if blur > 0.4:
        pad = int(blur * 2)
        tmp = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
        tmp.paste(im, (pad, pad))
        im = tmp.filter(ImageFilter.GaussianBlur(blur))
    if alpha < 0.999:
        a = np.asarray(im.split()[3], np.float32) * alpha
        im = im.copy()
        im.putalpha(Image.fromarray(a.astype(np.uint8)))
    x, y = (int(cx - im.width / 2), int(cy - im.height / 2)) if anchor == "c" else (int(cx), int(cy))
    # clip to frame
    if x >= W or y >= H or x + im.width <= 0 or y + im.height <= 0:
        return
    l, t = max(0, -x), max(0, -y)
    r, b = min(im.width, W - x), min(im.height, H - y)
    frame.alpha_composite(im.crop((l, t, r, b)), (x + l, y + t))


def reveal(lt, delay, dur=0.4):
    """alpha, blur, dy for a blur-in reveal."""
    k = ease_out((lt - delay) / dur)
    return k, (1 - k) * 14, (1 - k) * 26

# ---------------------------------------------------------------- figures

_cache = {}


def person_img(color=WHITE, h=150, phone=False, glow=True):
    key = ("p", color, h, phone, glow)
    if key in _cache:
        return _cache[key]
    s = 4
    w = int(h * 0.6)
    im = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    hr = h * 0.17 * s
    cx = w * s / 2
    d.ellipse([cx - hr, 0, cx + hr, 2 * hr], fill=color + (255,))
    top = 2 * hr + h * 0.06 * s
    bw = w * 0.48 * s
    d.rounded_rectangle([cx - bw, top, cx + bw, h * s], radius=int(bw * 0.9), fill=color + (255,))
    d.rectangle([cx - bw, h * s * 0.82, cx + bw, h * s], fill=color + (255,))
    if phone:
        pw, ph = w * 0.22 * s, h * 0.2 * s
        d.rounded_rectangle([cx + bw * 0.2, top + ph * 0.1, cx + bw * 0.2 + pw, top + ph * 1.1], radius=6 * s,
                            fill=(40, 40, 40, 255), outline=(20, 20, 20, 255), width=2 * s)
    im = im.resize((w, h), Image.LANCZOS)
    if glow:
        im = glowify(im, (220, 220, 220) if color == WHITE else (120, 120, 120), 14, 0.7 if color == WHITE else 0.3)
    _cache[key] = im
    return im


def stick_img(h=90, color=(200, 200, 200)):
    key = ("stick", h, color)
    if key in _cache:
        return _cache[key]
    s = 4
    w = int(h * 0.5)
    im = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = 3 * s
    cx = w * s / 2
    r = h * 0.1 * s
    d.ellipse([cx - r, lw, cx + r, 2 * r + lw], outline=color + (255,), width=lw)
    d.line([cx, 2 * r + lw, cx, h * 0.65 * s], fill=color + (255,), width=lw)
    d.line([cx, h * 0.65 * s, cx - w * 0.3 * s, h * s - lw], fill=color + (255,), width=lw)
    d.line([cx, h * 0.65 * s, cx + w * 0.3 * s, h * s - lw], fill=color + (255,), width=lw)
    d.line([cx - w * 0.3 * s, h * 0.4 * s, cx + w * 0.3 * s, h * 0.4 * s], fill=color + (255,), width=lw)
    im = im.resize((w, h), Image.LANCZOS)
    _cache[key] = im
    return im


def jumper_img(w=200, glow=True):
    key = ("j", w, glow)
    if key in _cache:
        return _cache[key]
    s = 4
    h = int(w * 0.82)
    im = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def P(x, y):
        return (x * w * s, y * h * s)

    body = [P(.30, .04), P(.40, .04), P(.5, .12), P(.60, .04), P(.70, .04), P(.97, .42), P(.84, .56), P(.76, .46),
            P(.76, .97), P(.24, .97), P(.24, .46), P(.16, .56), P(.03, .42)]
    d.polygon(body, fill=VIOLET + (255,))
    d.line(body + [body[0]], fill=(200, 185, 255, 255), width=3 * s, joint="curve")
    # neck
    d.arc([P(.38, -.06), P(.62, .2)], 20, 160, fill=(220, 210, 255, 255), width=3 * s)
    # knit zig-zags
    for col in range(5):
        x0 = .34 + col * .08
        pts = []
        for k in range(9):
            pts.append(P(x0 + (.025 if k % 2 else -.025), .30 + k * .075))
        d.line(pts, fill=(225, 215, 255, 255), width=int(2.2 * s))
    d.line([P(.24, .90), P(.76, .90)], fill=(200, 185, 255, 255), width=2 * s)
    im = im.resize((w, h), Image.LANCZOS)
    if glow:
        im = glowify(im, NEON, 18, 0.9)
    _cache[key] = im
    return im


def spotlight_img(top_w=160, bot_w=520, h=760, alpha=60):
    top_w, bot_w, h = int(top_w), int(bot_w), int(h)
    key = ("spot", top_w, bot_w, h, alpha)
    if key in _cache:
        return _cache[key]
    im = Image.new("RGBA", (bot_w + 80, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = im.width / 2
    d.polygon([(cx - top_w / 2, 0), (cx + top_w / 2, 0), (cx + bot_w / 2, h), (cx - bot_w / 2, h)],
              fill=(255, 255, 255, alpha))
    grad = np.linspace(0.35, 1.0, h)[:, None] * np.ones((1, im.width))
    a = np.asarray(im.split()[3], np.float32) * grad
    im.putalpha(Image.fromarray(a.astype(np.uint8)))
    im = im.filter(ImageFilter.GaussianBlur(3))
    _cache[key] = im
    return im


def hourglass_img(t, h=150, color=WHITE):
    s = 4
    w = int(h * 0.62)
    cyc = t % 3.0
    flip = 0 if cyc < 2.5 else ease_io((cyc - 2.5) / 0.5) * 180
    k = clamp(cyc / 2.5)
    im = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = int(3.5 * s)
    c = color + (255,)

    def P(x, y):
        return (x * w * s, y * h * s)

    d.line([P(.05, .03), P(.95, .03)], fill=c, width=lw)
    d.line([P(.05, .97), P(.95, .97)], fill=c, width=lw)
    d.line([P(.15, .03), P(.5, .5), P(.15, .97)], fill=c, width=lw)
    d.line([P(.85, .03), P(.5, .5), P(.85, .97)], fill=c, width=lw)
    tt = .12 + .33 * k
    d.polygon([P(.5 - (.48 - tt) * .7, tt), P(.5 + (.48 - tt) * .7, tt), P(.5, .48)], fill=c)
    hb = .93 - .3 * k
    d.polygon([P(.5 - .3 * k - .02, .93), P(.5 + .3 * k + .02, .93), P(.5, hb)], fill=c)
    if k < 1:
        d.line([P(.5, .5), P(.5, .93)], fill=c, width=s * 2)
    im = im.resize((w, h), Image.LANCZOS)
    if flip:
        sq = Image.new("RGBA", (h, h), (0, 0, 0, 0))
        sq.paste(im, ((h - w) // 2, 0))
        im = sq.rotate(-flip, resample=Image.BICUBIC)
    return glowify(im, (200, 200, 200), 10, 0.5)


def icon_img(name, t, S=380):
    """Outline neon icons for extra topics."""
    sc = 3
    s = S * sc
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = 9 * sc
    c = PURPLE + (255,)
    wc = WHITE + (255,)
    m = s / 2

    def P(x, y):
        return (x * s, y * s)

    if name == "snowflake":
        for i in range(6):
            a = i / 6 * 2 * math.pi + t * 0.25
            ex, ey = .5 + .4 * math.cos(a), .5 + .4 * math.sin(a)
            d.line([P(.5, .5), P(ex, ey)], fill=c, width=lw)
            for r in (.22, .32):
                bx, by = .5 + r * math.cos(a), .5 + r * math.sin(a)
                for da in (.6, -.6):
                    d.line([P(bx, by), P(bx + .08 * math.cos(a + da), by + .08 * math.sin(a + da))], fill=wc,
                           width=lw // 2)
    elif name == "gift":
        lid = math.sin(t * 4) * .02 - .02
        d.rectangle([P(.18, .44), P(.82, .86)], outline=c, width=lw)
        d.rectangle([P(.13, .32 + lid), P(.87, .44 + lid)], outline=c, width=lw)
        d.line([P(.5, .32 + lid), P(.5, .86)], fill=wc, width=lw // 2)
        d.ellipse([P(.32, .18 + lid), P(.5, .32 + lid)], outline=wc, width=lw // 2)
        d.ellipse([P(.5, .18 + lid), P(.68, .32 + lid)], outline=wc, width=lw // 2)
    elif name == "phone":
        d.rounded_rectangle([P(.28, .08), P(.72, .92)], radius=36 * sc, outline=c, width=lw)
        d.rounded_rectangle([P(.34, .2), P(.66, .52)], radius=10 * sc, outline=wc, width=lw // 2)
        d.text(P(.5, .36), "£", font=font(int(.12 * s)), fill=wc, anchor="mm")
        d.line([P(.35, .62), P(.65, .62)], fill=c, width=lw // 2)
        d.line([P(.35, .70), P(.55, .70)], fill=c, width=lw // 2)
        k = (t * .8) % 1
        hy = .84 - k * .12
        hc = WHITE + (int(255 * (1 - k)),)
        d.ellipse([P(.555, hy - .03), P(.6, hy + .01)], fill=hc)
        d.ellipse([P(.59, hy - .03), P(.635, hy + .01)], fill=hc)
        d.polygon([P(.557, hy - .002), P(.633, hy - .002), P(.595, hy + .05)], fill=hc)
    elif name == "coin":
        for i in range(3):
            y = .78 - i * .1
            d.ellipse([P(.22, y - .08), P(.78, y + .08)], outline=c, width=lw)
        bob = math.sin(t * 3) * .03
        d.ellipse([P(.27, .12 + bob), P(.73, .5 + bob)], outline=wc, width=lw)
        d.text(P(.5, .31 + bob), "£", font=font(int(.24 * s)), fill=wc, anchor="mm")
    elif name == "chart":
        d.line([P(.12, .12), P(.12, .88), P(.88, .88)], fill=c, width=lw)
        k = clamp(t / 1.6)
        ys = [.78, .70, .74, .56, .48, .30, .18]
        pts = [P(.16 + i * .12, ys[i]) for i in range(len(ys))]
        upto = 1 + k * (len(ys) - 1)
        whole = int(upto)
        seg = pts[:whole]
        if whole < len(ys):
            fr = upto - whole
            a, b = pts[whole - 1], pts[whole]
            seg.append((a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr))
        if len(seg) > 1:
            d.line(seg, fill=wc, width=lw, joint="curve")
        ex, ey = seg[-1]
        d.ellipse([ex - lw, ey - lw, ex + lw, ey + lw], fill=wc)
    elif name == "clock":
        d.ellipse([P(.12, .12), P(.88, .88)], outline=c, width=lw)
        a1 = t * math.pi - math.pi / 2
        a2 = t * math.pi / 12 - math.pi / 2
        d.line([P(.5, .5), P(.5 + .28 * math.cos(a1), .5 + .28 * math.sin(a1))], fill=wc, width=lw // 2)
        d.line([P(.5, .5), P(.5 + .18 * math.cos(a2), .5 + .18 * math.sin(a2))], fill=c, width=lw)
    elif name == "bag":
        d.line([P(.18, .34), P(.82, .34), P(.86, .88), P(.14, .88), P(.18, .34)], fill=c, width=lw, joint="curve")
        d.arc([P(.34, .12), P(.66, .50)], 180, 360, fill=c, width=lw)
        d.text(P(.5, .62), "£", font=font(int(.2 * s)), fill=wc, anchor="mm")
    elif name == "tree":
        for y0, w0 in [(.14, .16), (.32, .26), (.52, .36)]:
            d.line([P(.5, y0), P(.5 - w0, y0 + .24), P(.5 + w0, y0 + .24), P(.5, y0)], fill=c, width=lw,
                   joint="curve")
        d.rectangle([P(.45, .76), P(.55, .88)], outline=c, width=lw // 2)
        for i, (x, y) in enumerate([(.44, .40), (.58, .58), (.40, .66), (.62, .42), (.5, .30)]):
            on = (int(t * 3) + i) % 2 == 0
            r = .022 if on else .014
            d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=wc if on else c)
    elif name == "calendar":
        d.rounded_rectangle([P(.14, .2), P(.86, .86)], radius=26 * sc, outline=c, width=lw)
        d.line([P(.14, .38), P(.86, .38)], fill=c, width=lw)
        n = int(t * 4) % 12
        for i in range(12):
            x, y = .25 + (i % 4) * .167, .49 + (i // 4) * .12
            r = .045 if i == n else .016
            d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=wc if i == n else c)
    else:  # person / sweater / hourglass / stairs / wheel fall back to the filled figures elsewhere
        return None
    im = im.resize((S, S), Image.LANCZOS)
    return glowify(im, NEON, 14, 0.9)

# ---------------------------------------------------------------- visuals (each returns its height)

VIS_H = {"crowd": 300, "flip": 470, "items": 300, "calendar": 300, "cards": 330, "wheel": 470, "stairs": 380,
         "hourglass": 170, "grid": 150, "pile": 300, "icon": 380, "none": 0}


def dashed(d, x0, x1, y, col=(150, 150, 150, 255), dash=10, gap=8, w=2):
    x = x0
    while x < x1:
        d.line([(x, y), (min(x + dash, x1), y)], fill=col, width=w)
        x += dash + gap


def draw_visual(fr, v, top, lt, dur, out_a):
    typ = v.get("type", "none")
    h = VIS_H.get(typ, 0)
    cx = W // 2
    d = ImageDraw.Draw(fr)
    if typ == "crowd":
        n = int(v.get("n", 7))
        hi = int(v.get("highlight", n // 2))
        spot = v.get("spotlight", True)
        ground = top + h - 40
        k_spot = ease_out((lt - 0.7) / 0.5) if spot else 0
        if k_spot > 0:
            sp = spotlight_img(120, 230, ground - top + 520, 70)
            xs = 90 + hi * (900 / max(n - 1, 1))
            paste(fr, sp, xs, ground - sp.height / 2, k_spot * out_a)
        dashed(d, 40, W - 40, ground + 2, (110, 110, 110, int(255 * out_a)))
        for i in range(n):
            x = 90 + i * (900 / max(n - 1, 1))
            a, bl, dy = reveal(lt, 0.05 + i * 0.07, 0.35)
            lit = (i == hi and k_spot > 0)
            col = WHITE if lit else ((150, 150, 150) if k_spot == 0 else (95, 95, 95))
            im = person_img(col, 150 if lit else 120, phone=not lit)
            paste(fr, im, x, ground - im.height / 2 + 14 + dy, a * out_a, bl)
    elif typ == "flip":
        buy, sell = v.get("buy", 5), v.get("sell", 50)
        plat = v.get("platform", "VINTED")
        ground = top + h - 70
        dashed(d, 40, W - 40, ground + 2, (110, 110, 110, int(255 * out_a)))
        a, bl, dy = reveal(lt, 0.0, 0.35)
        p = person_img(WHITE, 170)
        px = 190
        paste(fr, p, px, ground - p.height / 2 + 16, a * out_a, bl)
        paste(fr, pill("YOU", "white", 20), px, ground + 42, a * out_a, bl)
        k = ease_io((lt - 0.9) / 1.0)
        x0, x1 = 470, 820
        arc_y = ground - 290
        j = jumper_img(210)
        jx = x0 + (x1 - x0) * k
        jy = ground - 95 - math.sin(k * math.pi) * 80
        # dashed arc trail
        if k > 0:
            pts = []
            for i in range(0, int(40 * k) + 1):
                q = i / 40
                pts.append((x0 - 140 + (x1 - x0) * q, arc_y + 40 - math.sin(q * math.pi) * 70))
            for i in range(0, len(pts) - 1, 2):
                d.line([pts[i], pts[i + 1]], fill=(200, 200, 200, int(220 * out_a)), width=3)
        a2, bl2, _ = reveal(lt, 0.25, 0.35)
        paste(fr, j, jx, jy, a2 * out_a, bl2)
        if k < 0.5:
            paste(fr, pill(f"£{buy}", "white", 30), jx, jy - 150, a2 * out_a, bl2)
        else:
            paste(fr, pill(f"£{sell}", "purple", 34), jx, jy - 150, out_a)
        paste(fr, pill(plat, "outline", 20), x1, ground - 10, a2 * out_a * (0.6 + 0.4 * k))
        # profit counter
        kp = ease_out((lt - 1.4) / 1.2)
        if kp > 0:
            val = int(round((sell - buy) * kp))
            im = glow_text(f"+£{val}", 120, PURPLE, 0.04, strength=1.2)
            paste(fr, im, cx, top + 50, min(1, kp * 3) * out_a, (1 - min(1, kp * 3)) * 10)
            if kp > 0.6 and v.get("profit_pill", "FROM ONE ITEM"):
                paste(fr, pill(v.get("profit_pill", "FROM ONE ITEM"), "white", 20), cx, top + 140,
                      ease_out((lt - 2.2) / 0.4) * out_a)
    elif typ == "items":
        n = max(1, min(int(v.get("n", 3)), 5))
        tag = v.get("tag", "")
        jw = 230 if n <= 3 else 170
        gap = (W - 120) / n
        for i in range(n):
            x = 60 + gap * (i + 0.5)
            k = ease_back((lt - 0.1 - i * 0.22) / 0.45)
            if k <= 0:
                continue
            j = jumper_img(jw)
            paste(fr, j, x, top + 120, min(1, k) * out_a, scale=0.5 + 0.5 * k)
            if tag:
                paste(fr, pill(tag, "purple", 24), x, top + 255, min(1, k) * out_a)
    elif typ == "calendar":
        v0, v1 = int(v.get("value", 1)), int(v.get("to", v.get("value", 1)))
        k = ease_io((lt - 0.4) / max(dur - 1.0, 0.5))
        val = int(round(v0 + (v1 - v0) * k))
        a, bl, dy = reveal(lt, 0.05, 0.4)
        cw, ch = 220, 260
        card = Image.new("RGBA", (cw + 8, ch + 8), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([4, 4, cw + 4, ch + 4], radius=22, fill=(0, 0, 0, 255), outline=WHITE + (255,), width=5)
        cd.rounded_rectangle([4, 4, cw + 4, 64], radius=22, fill=VIOLET + (255,))
        cd.rectangle([4, 40, cw + 4, 64], fill=VIOLET + (255,))
        lab = text_img(v.get("label", "TODAY"), 22, WHITE, 0.15)
        card.alpha_composite(lab, ((cw + 8 - lab.width) // 2, 34 - lab.height // 2))
        num = text_img(str(val), 120, WHITE, 0.0)
        card.alpha_composite(num, ((cw + 8 - num.width) // 2, 64 + (ch - 60 - num.height) // 2))
        card = glowify(card, (200, 200, 200), 14, 0.5)
        paste(fr, card, cx, top + h / 2 + dy, a * out_a, bl)
        if v.get("hourglasses"):
            for sx in (-230, 230):
                paste(fr, hourglass_img(lt, 150), cx + sx, top + h / 2, a * out_a)
    elif typ == "cards":
        items = v.get("items", ["TOMORROW"])[:3]
        small = v.get("small", "LET'S START")
        for i, s in enumerate(items):
            delay = 0.1 + i * max(0.8, (dur - 0.8) / max(len(items), 1))
            a, bl, dy = reveal(lt, delay, 0.4)
            if a <= 0:
                continue
            bw, bh = 520, 130
            box = Image.new("RGBA", (bw + 8, bh + 8), (0, 0, 0, 0))
            bd = ImageDraw.Draw(box)
            bd.rounded_rectangle([4, 4, bw + 4, bh + 4], radius=16, fill=(0, 0, 0, 255), outline=WHITE + (255,),
                                 width=4)
            sm = text_img(small, 18, (170, 170, 170), 0.15)
            box.alpha_composite(sm, ((bw + 8 - sm.width) // 2, 28))
            crossed = v.get("cross", True) and i < len(items) - 1 and lt > delay + max(0.8, (dur - 0.8) / len(items))
            big = text_img(s.upper(), 46, (130, 130, 130) if crossed else WHITE, 0.12)
            box.alpha_composite(big, ((bw + 8 - big.width) // 2, 56))
            if crossed:
                bd.line([(bw * 0.38, 20), (bw * 0.62, bh - 12)], fill=WHITE + (255,), width=5)
                bd.line([(bw * 0.62, 20), (bw * 0.38, bh - 12)], fill=WHITE + (255,), width=5)
            box = glowify(box, (200, 200, 200), 12, 0.45)
            paste(fr, box, cx, top + 70 + i * 165 + dy, a * out_a, bl)
    elif typ == "wheel":
        R = 200
        ccy = top + h / 2
        a, bl, _ = reveal(lt, 0.05, 0.5)
        ring = Image.new("RGBA", (2 * R + 200, 2 * R + 200), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring)
        c0 = ring.width / 2
        rd.ellipse([c0 - R, c0 - R, c0 + R, c0 + R], outline=VIOLET + (255,), width=7)
        months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        for i, mo in enumerate(months):
            ang = (i + 0.5) / 12 * 2 * math.pi - math.pi / 2
            t_im = text_img(mo, 18, (170, 170, 170), 0.1)
            ring.alpha_composite(t_im, (int(c0 + (R + 48) * math.cos(ang) - t_im.width / 2),
                                        int(c0 + (R + 48) * math.sin(ang) - t_im.height / 2)))
        k = ease_io((lt - 0.3) / max(dur - 0.8, 0.8))
        ang = k * 2 * math.pi - math.pi / 2
        dx, dy2 = c0 + R * math.cos(ang), c0 + R * math.sin(ang)
        rd.ellipse([dx - 11, dy2 - 11, dx + 11, dy2 + 11], fill=WHITE + (255,))
        ring = glowify(ring, NEON, 14, 0.8)
        paste(fr, ring, cx, ccy, a * out_a, bl)
        if v.get("center"):
            paste(fr, glow_text(v["center"], 52, WHITE, 0.1), cx, ccy, a * out_a, bl)
    elif typ == "stairs":
        n = 6
        sw, sh = 110, 50
        x0 = cx - n * sw / 2
        y0 = top + h - 20
        pts = [(x0 - 40, y0)]
        for i in range(n):
            pts += [(x0 + i * sw, y0 - i * sh), (x0 + i * sw, y0 - (i + 1) * sh), (x0 + (i + 1) * sw, y0 - (i + 1) * sh)]
        a, bl, _ = reveal(lt, 0.05, 0.4)
        d.line(pts, fill=(220, 220, 220, int(255 * a * out_a)), width=4)
        fx, fy = x0 + n * sw - 20, y0 - n * sh
        d.line([(fx, fy), (fx, fy - 90)], fill=WHITE + (int(255 * a * out_a),), width=4)
        d.polygon([(fx, fy - 90), (fx + 55, fy - 72), (fx, fy - 54)], fill=VIOLET + (int(255 * a * out_a),))
        k = ease_io((lt - 0.4) / max(dur - 1.0, 0.8))
        step = min(int(k * n), n - 1)
        fracx = k * n - step
        px = x0 + step * sw + sw * min(fracx, 1) * 0.8 + 20
        py = y0 - (step + 1) * sh
        p = person_img(WHITE, 70)
        paste(fr, p, px, py - p.height / 2 + 12, a * out_a)
        if v.get("label"):
            paste(fr, text_img(v["label"].upper(), 18, (190, 190, 190), 0.15), x0 + 40, y0 + 30, a * out_a)
    elif typ == "hourglass":
        a, bl, _ = reveal(lt, 0.05, 0.4)
        paste(fr, hourglass_img(lt, 150), cx, top + h / 2, a * out_a, bl)
    elif typ == "grid":
        total = max(1, min(int(v.get("total", 7)), 60))
        cols = min(total, 15)
        rows = math.ceil(total / cols)
        sq, g = 34, 10
        gw = cols * sq + (cols - 1) * g
        k = ease_io((lt - 0.3) / max(dur - 0.9, 0.6))
        filled = int(round(total * k))
        for i in range(total):
            r, c = divmod(i, cols)
            x = cx - gw / 2 + c * (sq + g)
            y = top + 10 + r * (sq + g)
            col = VIOLET if i < filled else (55, 55, 55)
            d.rounded_rectangle([x, y, x + sq, y + sq], radius=6, fill=col + (int(255 * out_a),))
        if v.get("label"):
            lab = text_img(v["label"].upper(), 18, (170, 170, 170), 0.15)
            paste(fr, lab, cx, top + 30 + rows * (sq + g) + 10, out_a)
    elif typ == "pile":
        ground = top + h - 30
        dashed(d, 60, W - 60, ground, (110, 110, 110, int(255 * out_a)))
        for i, x in enumerate([100, 160, 220, 860, 920, 980]):
            paste(fr, stick_img(90), x, ground - 45, out_a * ease_out((lt - i * 0.05) / 0.3))
        rng = np.random.default_rng(3)
        for i in range(9):
            k = ease_back((lt - 0.2 - i * 0.1) / 0.4)
            if k <= 0:
                continue
            x = cx - 160 + rng.uniform(0, 320)
            y = ground - 60 - (i % 3) * 55 - rng.uniform(0, 20)
            j = jumper_img(120).rotate(rng.uniform(-25, 25), expand=True, resample=Image.BICUBIC)
            paste(fr, j, x, y, min(1, k) * out_a, scale=0.6 + 0.4 * k)
    elif typ == "icon":
        name = v.get("name", "snowflake")
        if name == "sweater":
            im = jumper_img(300)
        elif name == "person":
            im = person_img(WHITE, 260)
        elif name == "hourglass":
            im = hourglass_img(lt, 260)
        else:
            im = icon_img(name, lt)
        k = ease_back(lt / 0.55)
        paste(fr, im, cx, top + h / 2 + math.sin(lt * 2.2) * 8, min(1, lt / 0.3) * out_a, scale=0.6 + 0.4 * k)
    return h

# ---------------------------------------------------------------- scene

class Scene:
    def __init__(self, spec, t0, t1, footnote=""):
        self.s, self.t0, self.t1 = spec, t0, t1
        self.footnote = footnote if spec.get("footnote") else ""
        self.title = []
        for word, col in spec.get("title", []):
            self.title.append(glow_text(word.upper(), 84, COL.get(col, WHITE), 0.11,
                                        strength=1.0 if col == "p" else 0.75))
        # wrap title into lines (max width 980)
        self.gap = 30 - 2 * int(12 * 2.5)  # word gap minus glow padding on both sides
        self.lines, cur, wsum = [], [], 0
        for im in self.title:
            gap = self.gap
            if cur and wsum + gap + im.width > 1060:
                self.lines.append(cur)
                cur, wsum = [], 0
            cur.append(im)
            wsum += im.width + (gap if len(cur) > 1 else 0)
        if cur:
            self.lines.append(cur)
        # shrink if a single word is too wide
        self.title_scale = min(1.0, 1060 / max([sum(i.width for i in ln) + self.gap * (len(ln) - 1) for ln in self.lines]
                                                 or [1]))
        self.pill = pill(spec["pill"].upper(), "white", 22) if spec.get("pill") else None

    def layout(self):
        s = self.s
        hs = []
        if self.pill:
            hs.append(("pill", 70))
        if self.lines:
            hs.append(("title", int(len(self.lines) * 105 * self.title_scale) + 20))
        v = s.get("visual") or {}
        if v.get("type", "none") != "none":
            hs.append(("visual", VIS_H.get(v["type"], 0)))
        if s.get("number"):
            n = s["number"]
            hs.append(("number", 210 + (50 if n.get("pre") else 0) + (70 if n.get("pill") else 0)))
        total = sum(h for _, h in hs) + 40 * max(len(hs) - 1, 0)
        y = max(360, 900 - total / 2)
        out = []
        for name, h in hs:
            out.append((name, y, h))
            y += h + 40
        return out

    def draw(self, fr, t):
        lt = t - self.t0
        dur = self.t1 - self.t0
        out_a = 1.0 - ease_out((lt - (dur - 0.25)) / 0.25) if lt > dur - 0.25 else 1.0
        out_blur = (1 - out_a) * 12
        s = self.s
        delay = 0.0
        for name, top, h in self.layout():
            if name == "pill":
                a, bl, dy = reveal(lt, 0.0, 0.35)
                paste(fr, self.pill, W / 2, top + h / 2 + dy, a * out_a, bl + out_blur)
                delay = 0.15
            elif name == "title":
                wi = 0
                lh = int(105 * self.title_scale)
                for li, ln in enumerate(self.lines):
                    sc = self.title_scale
                    total_w = (sum(i.width for i in ln) + self.gap * (len(ln) - 1)) * sc
                    x = W / 2 - total_w / 2
                    cy = top + li * lh + lh / 2 + 10
                    for im in ln:
                        a, bl, dy = reveal(lt, delay + wi * 0.2, 0.4)
                        paste(fr, im, x + im.width * sc / 2, cy + dy * 0.5, a * out_a, bl + out_blur, sc)
                        x += (im.width + self.gap) * sc
                        wi += 1
                delay += 0.2 * wi
            elif name == "visual":
                draw_visual(fr, s["visual"], top, max(0, lt - delay * 0.5), dur - delay * 0.5, out_a)
            elif name == "number":
                n = s["number"]
                y = top
                st = delay * 0.6 + 0.1
                if n.get("spotlight"):
                    sp = spotlight_img(150, 560, 620, 55)
                    paste(fr, sp, W / 2, top + h - sp.height / 2 + 40, ease_out((lt - st) / 0.5) * out_a)
                if n.get("pre"):
                    a, bl, _ = reveal(lt, st, 0.35)
                    paste(fr, text_img(n["pre"].upper(), 30, (220, 220, 220), 0.15), W / 2, y + 22, a * out_a, bl)
                    y += 50
                k = ease_out((lt - st - 0.1) / max(min(dur * 0.65, 2.6), 0.6))
                v0, v1 = n.get("from", 0), n["value"]
                val = v0 + (v1 - v0) * k
                txt = f"{n.get('sign', '')}{n.get('prefix', '')}{int(round(val)):,}{n.get('suffix', '')}"
                col = COL.get(n.get("color", "p"), PURPLE)
                im = glow_text(txt, 170, col, 0.02, strength=1.25 if col == PURPLE else 0.9, radius=24)
                a = min(1, (lt - st) / 0.3) if lt > st else 0
                paste(fr, im, W / 2, y + 100, a * out_a, (1 - a) * 12 + out_blur)
                if n.get("strike") and k >= 1:
                    ks = ease_out((lt - st - 0.1 - min(dur * 0.65, 2.6) - 0.1) / 0.35)
                    if ks > 0:
                        d = ImageDraw.Draw(fr)
                        x0 = W / 2 - im.width / 2 + 30
                        x1 = x0 + (im.width - 60) * ks
                        d.line([(x0, y + 110), (x1, y + 92)], fill=WHITE + (int(255 * out_a),), width=7)
                if n.get("pill"):
                    a2, bl2, _ = reveal(lt, st + 0.5, 0.35)
                    paste(fr, pill(n["pill"].upper(), "white", 22), W / 2, y + 235, a2 * out_a, bl2)
        if s.get("total"):
            tt = s["total"]
            a, bl, _ = reveal(lt, 0.3, 0.4)
            paste(fr, text_img(tt.get("label", "TOTAL PROFIT").upper(), 18, (180, 180, 180), 0.15), W / 2, 1470,
                  a * out_a, bl)
            k = ease_io((lt - 0.3) / max(dur - 0.8, 0.6))
            val = tt.get("from", 0) + (tt["value"] - tt.get("from", 0)) * k
            paste(fr, glow_text(f"{tt.get('prefix', '£')}{int(round(val)):,}", 62, WHITE, 0.03), W / 2, 1525,
                  a * out_a, bl)
        if self.footnote:
            paste(fr, text_img(self.footnote.upper(), 15, (95, 95, 95), 0.12), W / 2, 1640, out_a)

# ---------------------------------------------------------------- background

class Background:
    def __init__(self, theme, seed=1):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - 900) / (H * 0.5)) ** 2)
        g = (np.clip(1 - r, 0, 1) ** 1.6) * 22
        base = np.stack([g, g, g + 1, np.full_like(g, 255)], -1).astype(np.uint8)
        self.base = Image.fromarray(base, "RGBA")
        self.theme = theme
        rng = np.random.default_rng(seed)
        n = 45 if theme == "winter" else 0
        self.px, self.py = rng.uniform(0, W, n), rng.uniform(0, H, n)
        self.pr, self.pv, self.ph = rng.uniform(1.5, 4, n), rng.uniform(30, 80, n), rng.uniform(0, 6.28, n)

    def frame(self, t):
        f = self.base.copy()
        if self.theme == "winter":
            d = ImageDraw.Draw(f)
            for x, y, r, v, ph in zip(self.px, self.py, self.pr, self.pv, self.ph):
                yy = (y + v * t) % (H + 20) - 10
                xx = x + math.sin(t * 0.7 + ph) * 20
                d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(255, 255, 255, int(40 + 30 * r / 4)))
        return f

# ---------------------------------------------------------------- TTS

def tts_elevenlabs(scenes, out_mp3):
    # Key comes either from env ELEVENLABS_API_KEY or is injected by the environment's
    # "Network secret" (header xi-api-key for api.elevenlabs.io) - then we send no header.
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    auth = {"xi-api-key": key} if key else {}
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
    sep = " "
    parts = [s["say"].strip() for s in scenes]
    body = json.dumps({
        "text": sep.join(parts),
        "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={**auth, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read()[:300]
        if e.code not in (400, 404) or os.environ.get("_EL_RETRY") or b"voice" not in msg.lower():
            raise RuntimeError(f"ElevenLabs HTTP {e.code}: {msg!r}")
        vr = urllib.request.Request("https://api.elevenlabs.io/v1/voices", headers=auth)
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
    starts, ends = al["character_start_times_seconds"], al["character_end_times_seconds"]
    idx, bounds = 0, []
    for p in parts:
        bounds.append(starts[min(idx, len(starts) - 1)])
        idx += len(p) + len(sep)
    return bounds, ends[-1]


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
    lead = 0.3
    bounds, vend = silent_timing(scenes) if silent else tts_elevenlabs(scenes, voice)
    dur = lead + vend + 1.4
    wins = []
    for i in range(len(scenes)):
        a = 0.0 if i == 0 else lead + bounds[i] - 0.1
        b = (lead + bounds[i + 1] - 0.1) if i + 1 < len(scenes) else dur
        wins.append((a, b))
    objs = [Scene(s, a, b, spec.get("footnote", "")) for s, (a, b) in zip(scenes, wins)]
    bg = Background(spec.get("theme", "default"), seed=spec.get("seed", 1))

    video = os.path.join(out_dir, "video.mp4")
    nframes = int(math.ceil(dur * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
                          "-crf", "18", "-pix_fmt", "yuv420p", video], stdin=subprocess.PIPE)
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

    bed = os.path.join(out_dir, "bed.wav")
    subprocess.run([sys.executable, os.path.join(HERE, "make_bed.py"), bed, f"{dur + 0.5:.2f}",
                    str(spec.get("seed", 21))], check=True, capture_output=True)
    final = os.path.join(out_dir, "final.mp4")
    if silent:
        fc = "[1:a]volume=0.55,alimiter=limit=0.95[a]"
        inputs = ["-i", video, "-i", bed]
    else:
        ms = int(lead * 1000)
        fc = (f"[2:a]adelay={ms}|{ms},aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,asplit=2[v1][v2];"
              "[1:a]volume=0.30[m];[m][v1]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=400[md];"
              "[md][v2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]")
        inputs = ["-i", video, "-i", bed, "-i", voice]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "0:v",
                    "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", final], check=True)

    shots = []
    for a, b in wins:
        tt = min(a + (b - a) * 0.75, dur - 0.1)
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
