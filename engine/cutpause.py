"""cutpause.py IN.wav OUT.wav [maxgap=0.2] — shorten every pause longer than maxgap to maxgap,
trim leading silence to 0.05 s and trailing silence to 0.12 s. Short crossfades so cuts are inaudible."""
import sys, subprocess, numpy as np, scipy.io.wavfile as wf
src, dst = sys.argv[1], sys.argv[2]; MAXG = float(sys.argv[3]) if len(sys.argv) > 3 else .2
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '48000', '/tmp/_cp.wav'], check=True)
sr, x = wf.read('/tmp/_cp.wav'); x = x.astype(np.float32) / 32768
hop = int(sr * .01); n = len(x) // hop
env = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12); db = 20 * np.log10(env)
ref = np.percentile(db[db > -80], 95); sp = db > ref - 38
# speech runs (merge tiny gaps < 60 ms, drop blips < 40 ms)
runs = []; i = 0
while i < n:
    if sp[i]:
        j = i
        while j < n and sp[j]: j += 1
        runs.append([i, j]); i = j
    else: i += 1
m = []
for r in runs:
    if m and r[0] - m[-1][1] < 6: m[-1][1] = r[1]
    else: m.append(r)
m = [r for r in m if r[1] - r[0] >= 4]
pad = 4  # 40 ms breathing room around speech so consonants aren't clipped
segs = [(max(0, (a - pad)) * hop, min(len(x), (b + pad) * hop)) for a, b in m]
out = [np.zeros(int(.05 * sr), np.float32)]; fade = int(.008 * sr); cut_total = 0
for k, (a, b) in enumerate(segs):
    s = x[a:b].copy(); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade); out.append(s)
    if k + 1 < len(segs):
        g = (segs[k + 1][0] - b) / sr; keep = min(g, MAXG) if g > 0 else 0; cut_total += g - keep
        out.append(np.zeros(int(keep * sr), np.float32))
out.append(np.zeros(int(.12 * sr), np.float32))
y = np.concatenate(out)
wf.write(dst, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
print(f'{len(x) / sr:.2f}s -> {len(y) / sr:.2f}s (cut {len(x) / sr - len(y) / sr:.2f}s, {len(segs)} speech runs)')
