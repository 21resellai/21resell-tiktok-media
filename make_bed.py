"""Synthesize a royalty-free dark motivational music bed (original, procedurally generated).

Usage: python3 make_bed.py out.wav [seconds] [seed]
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
out = sys.argv[1]
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 32.0
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 21
rng = np.random.default_rng(SEED)

BPM = 76
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int(DUR * SR)
t = np.arange(N) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na)
    e[na:na + nd] = np.linspace(1, s, nd)
    if nr > 0 and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, tt, phase=0.0):
    return 2 * ((f * tt + phase) % 1.0) - 1


# Progressions in A minor (dark): Am - F - Dm - E  /  Am - F - C - E
progs = [
    [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]],
]
prog = progs[SEED % 2]
roots = [45, 41, 38, 40] if SEED % 2 == 0 else [45, 41, 36, 40]

mix = np.zeros(N)
pad = np.zeros(N)
bass = np.zeros(N)
nbars = int(np.ceil(DUR / BAR))

for b in range(nbars):
    ch = prog[b % 4]
    start = int(b * BAR * SR)
    end = min(N, int((b + 1) * BAR * SR) + int(0.6 * SR))
    if start >= N:
        break
    n = end - start
    tt = np.arange(n) / SR
    seg = np.zeros(n)
    for note in ch + [ch[0] + 12]:
        f = midi(note)
        for det in (-0.08, 0.0, 0.07):
            seg += saw(f * 2 ** (det / 12), tt, rng.random())
    seg = lp(seg, 900) * env_adsr(n, 1.2, 0.5, 0.8, 0.6)
    pad[start:end] += seg * 0.06
    # sub bass: root, sine + a bit of 2nd harmonic
    fb = midi(roots[b % 4])
    sb = (np.sin(2 * np.pi * fb * tt) + 0.25 * np.sin(4 * np.pi * fb * tt))
    bass[start:end] += sb * env_adsr(n, 0.05, 0.3, 0.7, 0.5) * 0.22

# slow tremolo on pad
pad *= 0.85 + 0.15 * np.sin(2 * np.pi * (BPM / 60 / 2) * t)

# heartbeat kick on beats 1 and 3 (enters after 1 bar)
kick = np.zeros(N)
klen = int(0.35 * SR)
kt = np.arange(klen) / SR
kf = 50 + 70 * np.exp(-kt * 30)
kwave = np.sin(2 * np.pi * np.cumsum(kf) / SR) * np.exp(-kt * 9)
for i in range(int(DUR / BEAT)):
    if i < 4 or i % 4 not in (0, 2):
        continue
    s = int(i * BEAT * SR)
    e = min(N, s + klen)
    kick[s:e] += kwave[: e - s] * 0.55

# piano-like motif (sine + harmonics, exp decay), enters bar 3
motif_steps = [0, 7, 12, 10, 7, 3, 5, 7]
pl = np.zeros(N)
for i in range(int(DUR / (BEAT / 2))):
    if i < 16:
        continue
    bar = int(i * (BEAT / 2) // BAR)
    base = prog[bar % 4][0] + 12
    step = motif_steps[i % len(motif_steps)]
    if i % 8 in (5,):
        continue
    f = midi(base + step if step < 12 else base + 12)
    s = int(i * (BEAT / 2) * SR)
    ln = int(1.6 * SR)
    e = min(N, s + ln)
    tt = np.arange(e - s) / SR
    tone = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt))
    pl[s:e] += tone * np.exp(-tt * 3.2) * 0.07

# airy noise riser into last bars
noise = hp(rng.standard_normal(N), 3000) * 0.01
noise *= np.clip((t - (DUR - 8)) / 8, 0, 1)

mix = pad + bass + kick + pl + noise

# simple reverb: exponentially decaying noise impulse response
ir_len = int(2.2 * SR)
ir_t = np.arange(ir_len) / SR
ir = rng.standard_normal(ir_len) * np.exp(-ir_t * 2.6)
ir = lp(ir, 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wet_src = pad + pl
wet = fftconvolve(wet_src, ir)[:N] * 0.35
mix = mix + wet

# fades
fi, fo = int(1.5 * SR), int(2.5 * SR)
mix[:fi] *= np.linspace(0, 1, fi)
mix[-fo:] *= np.linspace(1, 0, fo)

mix = hp(mix, 30)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.98], axis=1)
wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
print("wrote", out, DUR, "s")
