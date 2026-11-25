#!/usr/bin/env python3
"""21Resell Mindset daily TikTok — full pipeline (same engine as the hand-made E/R/W series).

  python3 engine/make.py SCRIPT.json OUT_DIR [--wav VOICE.wav] [--silent] [--stills-only] [--tts-only]
  (OUT_DIR/tts.mp3 + OUT_DIR/alignment.json from an earlier run are reused)

Steps: voice (ElevenLabs with-timestamps, env ELEVENLABS_API_KEY; or --wav = a ready WAV of the whole script)
 -> pauses shortened to 0.2 s, end silence trimmed -> per-scene windows (window.VO)
 -> headless Chrome renders 1080x1920 60 fps (motion blur 4) in 5 s chunks on all CPUs
 -> original music bed (../make_bed.py) -> mix: music 0.30 + sidechain under voice, voice mono->stereo, alimiter 0.95
 -> OUT_DIR/final.mp4, OUT_DIR/stills/*.jpg (one per scene) + OUT_DIR/qa.json
Auth: env ELEVENLABS_API_KEY, or none (a Network secret on the proxy adds xi-api-key for api.elevenlabs.io).
Env: ELEVENLABS_VOICE_ID (default QtY3JBOUKEB5xzrRfOKc = "Maisie", the voice of all previous videos), ELEVENLABS_MODEL (default eleven_v3)
"""
import base64, io, json, os, re, subprocess, sys, time, urllib.request
from multiprocessing import Process
import numpy as np
import scipy.io.wavfile as wf

ENG = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ENG)
FPS, MB, SR = 60, 4, 48000
LEAD, GAP_MAX, TAIL = .45, .2, .12


def sh(*a, **k):
    return subprocess.run(list(a), check=True, **k)


# ---------------------------------------------------------------- voice
def tts(text, out_mp3):
    key = os.environ.get('ELEVENLABS_API_KEY')  # if absent, the session proxy injects xi-api-key (Network secret)
    voice = os.environ.get('ELEVENLABS_VOICE_ID', 'QtY3JBOUKEB5xzrRfOKc')
    models = [os.environ.get('ELEVENLABS_MODEL', 'eleven_v3'), 'eleven_multilingual_v2']
    last = None
    for model in models:
        body = json.dumps({'text': text, 'model_id': model,
                           'voice_settings': {'stability': .5, 'similarity_boost': .8, 'style': .35, 'use_speaker_boost': True}}).encode()
        rq = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                                    data=body, headers=dict({'Content-Type': 'application/json'}, **({'xi-api-key': key} if key else {})))
        try:
            with urllib.request.urlopen(rq, timeout=180) as r: d = json.load(r)
            open(out_mp3, 'wb').write(base64.b64decode(d['audio_base64']))
            al = d.get('normalized_alignment') or d.get('alignment')
            return al
        except urllib.error.HTTPError as e:
            last = f'{e.code} {e.read()[:300]!r}'; print('TTS', model, 'failed:', last, flush=True)
    sys.exit('TTS failed: ' + str(last))


def load_mono(path):
    tmp = path + '.48k.wav'
    sh('ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(SR), tmp)
    sr, x = wf.read(tmp); os.remove(tmp)
    return x.astype(np.float32) / 32768


def speech_runs(x):
    hop = int(SR * .01); n = len(x) // hop
    env = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12); db = 20 * np.log10(env)
    ref = np.percentile(db[db > -80], 95); on = db > ref - 38
    runs, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            runs.append([i * .01, j * .01]); i = j
        else: i += 1
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < .06: merged[-1][1] = r[1]
        else: merged.append(r)
    merged = [r for r in merged if r[1] - r[0] > .03]
    return [[max(0, a - .04), min(len(x) / SR, b + .04)] for a, b in merged]


def compress(x, runs):
    """shorten every pause to GAP_MAX; returns new audio + time map old->new"""
    out, segs, t_new = [np.zeros(int(.05 * SR), np.float32)], [], .05
    fade = int(.008 * SR)
    for k, (a, b) in enumerate(runs):
        if k:
            g = min(GAP_MAX, a - runs[k - 1][1]); out.append(np.zeros(int(max(0, g) * SR), np.float32)); t_new += max(0, g)
        seg = x[int(a * SR):int(b * SR)].copy()
        if len(seg) > 2 * fade: seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        segs.append((a, b, t_new)); out.append(seg); t_new += len(seg) / SR
    out.append(np.zeros(int(TAIL * SR), np.float32))
    def m(t):
        for a, b, n0 in segs:
            if t <= b: return n0 + max(0, t - a)
        return t_new
    return np.concatenate(out), m


def sentence_count(s):
    return max(1, len(re.findall(r'(\.\.\.|…|[.?!:])(?=\s|$)', s.strip())))


def windows_from_alignment(al, says):
    chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    full = ''.join(chars); res, pos = [], 0
    for s in says:
        i = full.find(s.strip()[:12], pos)
        if i < 0: i = pos
        j = i + len(s.strip()) - 1; j = min(j, len(chars) - 1)
        while j > i and not chars[j].strip(): j -= 1
        res.append([st[i], en[j]]); pos = j + 1
    return res


def windows_from_pauses(runs, says):
    # group speech runs into sentences by the largest gaps, then sentences into scenes
    ks = [sentence_count(s) for s in says]; NS = sum(ks)
    T = [list(r) for r in runs]
    if len(T) < NS: ks = None
    else:
        while len(T) > NS:
            gi = min(range(len(T) - 1), key=lambda i: T[i + 1][0] - T[i][1]); T[gi][1] = T[gi + 1][1]; del T[gi + 1]
    if ks is None:  # fall back to word-proportional split
        tot = runs[-1][1] - runs[0][0]; w = np.array([len(s.split()) for s in says], float); c = np.concatenate([[0], np.cumsum(w)]) / w.sum()
        return [[runs[0][0] + tot * c[i], runs[0][0] + tot * c[i + 1]] for i in range(len(says))]
    res, k0 = [], 0
    for k in ks: res.append([T[k0][0], T[k0 + k - 1][1]]); k0 += k
    return res


def voice(script, out, wav=None):
    says = [s['say'] for s in script['scenes']]
    if wav:
        x = load_mono(wav); runs = speech_runs(x); win = windows_from_pauses(runs, says)
    else:
        mp3 = os.path.join(out, 'tts.mp3'); alj = os.path.join(out, 'alignment.json')
        if os.path.exists(mp3) and os.path.exists(alj): al = json.load(open(alj))   # reuse an earlier take
        else: al = tts(' '.join(says), mp3); json.dump(al, open(alj, 'w'))
        if '--tts-only' in sys.argv: print('TTS saved', mp3, alj); sys.exit(0)
        x = load_mono(mp3); runs = speech_runs(x); win = windows_from_alignment(al, says)
    y, m = compress(x, runs)
    vo = [[round(m(a) + LEAD, 3), round(m(b) + LEAD, 3)] for a, b in win]
    for i in range(1, len(vo)):  # monotonic, no overlap
        vo[i][0] = max(vo[i][0], vo[i - 1][1] + .02); vo[i][1] = max(vo[i][1], vo[i][0] + .3)
    y = np.concatenate([np.zeros(int(LEAD * SR), np.float32), y])
    wf.write(os.path.join(out, 'voice.wav'), SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    for (a, b), s in zip(vo, says): print(f'{a:6.2f} {b:6.2f}  {s}')
    return vo, len(y) / SR


def silent_vo(script):
    t, vo = LEAD, []
    for s in script['scenes']:
        d = len(s['say'].split()) / 2.6 + .2; vo.append([round(t, 3), round(t + d, 3)]); t += d + .28
    return vo


# ---------------------------------------------------------------- render
def write_page(script, vo, out):
    js = 'window.SCRIPT = ' + json.dumps(script, ensure_ascii=False) + ';\nwindow.VO = ' + json.dumps(vo) + ';\n'
    open(os.path.join(out, 'script.js'), 'w').write(js)
    html = open(os.path.join(ENG, 'page.html')).read().replace('WORK/script.js', 'file://' + os.path.join(out, 'script.js'))
    html = re.sub(r'src="(\w+\.js)"', lambda mm: f'src="file://{ENG}/{mm.group(1)}"', html)
    if not os.path.exists(os.path.join(out, 'assets')): os.symlink(os.path.join(ENG, 'assets'), os.path.join(out, 'assets'))
    p = os.path.join(out, 'page.html'); open(p, 'w').write(html); return p


def open_page(pw, page):
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files', '--disable-web-security'])
    pg = b.new_page(viewport={'width': 1080, 'height': 1920}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto('file://' + page); pg.evaluate('window.ready')
    return b, pg, errs


def grab(pg, t, q=.93):
    d = pg.evaluate(f"(() => drawMB({t:.5f}, {FPS}, {MB}, 0.5).toDataURL('image/jpeg', {q}))()") if MB else \
        pg.evaluate(f"(() => {{ draw({t:.5f}); return cv.toDataURL('image/jpeg', {q}); }})()")
    return base64.b64decode(d.split(',', 1)[1])


def render_chunks(page, out, chunks, idxs):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b, pg, errs = open_page(pw, page)
        for i in idxs:
            a, z = chunks[i], chunks[i + 1]; fin = os.path.join(out, f'c{i}.mp4'); tmp = os.path.join(out, f'c{i}.tmp.mp4')
            if os.path.exists(fin): continue
            ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                                   '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', str(FPS), tmp], stdin=subprocess.PIPE)
            for n in range(round(a * FPS), round(z * FPS)): ff.stdin.write(grab(pg, n / FPS))
            ff.stdin.close()
            if ff.wait() == 0: os.replace(tmp, fin); print('chunk', i, 'ok', flush=True)
        if errs: print('\n'.join(errs[:10]), flush=True)
        b.close()


def stills(page, out, times):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    d = os.path.join(out, 'stills'); os.makedirs(d, exist_ok=True); ims = []
    with sync_playwright() as pw:
        b, pg, errs = open_page(pw, page); dur = pg.evaluate('window.DUR')
        for k, t in enumerate(times):
            im = Image.open(io.BytesIO(grab(pg, t))); f = os.path.join(d, f'{k:02d}_{t:05.2f}.jpg'); im.save(f, quality=88); ims.append(im.resize((270, 480)))
        b.close()
    cols = min(6, len(ims)); rows = (len(ims) + cols - 1) // cols
    from PIL import Image as I
    sheet = I.new('RGB', (270 * cols, 480 * rows))
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 270, (i // cols) * 480))
    sheet.save(os.path.join(out, 'sheet.jpg'), quality=85)
    if errs: print('PAGE ERRORS:\n' + '\n'.join(errs[:10]))
    return dur, errs


# ---------------------------------------------------------------- audio mix
def mix(out, dur, seed):
    bed = os.path.join(out, 'bed.wav')
    sh(sys.executable, os.path.join(REPO, 'make_bed.py'), bed, f'{dur + 1:.2f}', str(seed))
    fc = ('[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,apad,asplit=2[v][sc];'
          '[2:a]aresample=48000,volume=0.30[m];'
          '[m][sc]sidechaincompress=threshold=0.035:ratio=4:attack=20:release=380[md];'
          '[v][md]amix=inputs=2:duration=first:normalize=0,'
          f'afade=t=out:st={max(0, dur - .7):.2f}:d=.7,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.95,aresample=48000[a]')
    tmp = os.path.join(out, 'final.tmp.mp4')
    sh('ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(out, 'video.mp4'), '-i', os.path.join(out, 'voice.wav'), '-i', bed,
       '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp)
    os.replace(tmp, os.path.join(out, 'final.mp4'))


def qa(out):
    p = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration',
                                   '-of', 'json', os.path.join(out, 'final.mp4')], capture_output=True, text=True).stdout)
    v = [s for s in p['streams'] if s['codec_type'] == 'video'][0]; has_a = any(s['codec_type'] == 'audio' for s in p['streams'])
    d = float(p['format']['duration'])
    r = {'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'audio': has_a, 'duration': round(d, 2),
         'ok': v['width'] == 1080 and v['height'] == 1920 and has_a and 15 <= d <= 60}
    json.dump(r, open(os.path.join(out, 'qa.json'), 'w')); print('QA', r); return r


def main():
    a = sys.argv[1:]; script_path, out = a[0], os.path.abspath(a[1]); os.makedirs(out, exist_ok=True)
    wav = a[a.index('--wav') + 1] if '--wav' in a else None
    script = json.load(open(script_path))
    if '--silent' in a: vo = silent_vo(script); vdur = None
    else: vo, vdur = voice(script, out, wav)
    page = write_page(script, vo, out)
    mids = [round((s + e) / 2 + .25, 2) for s, e in vo]
    dur, errs = stills(page, out, mids + [round(vo[-1][1] + .9, 2)])
    print('DUR', dur)
    if errs: sys.exit('page errors')
    if '--stills-only' in a: return
    CH = [x * 5.0 for x in range(int(dur // 5) + 1)]
    if dur - CH[-1] < 1.5: CH[-1] = dur
    else: CH.append(dur)
    n = len(CH) - 1; W = max(1, min(os.cpu_count() or 1, 4))
    # interleave chunks over workers
    ps = [Process(target=render_chunks, args=(page, out, CH, list(range(w, n, W)))) for w in range(W)]
    t0 = time.time(); [p.start() for p in ps]; [p.join() for p in ps]; print('render s', round(time.time() - t0))
    missing = [i for i in range(n) if not os.path.exists(os.path.join(out, f'c{i}.mp4'))]
    if missing: render_chunks(page, out, CH, missing)
    open(os.path.join(out, 'list.txt'), 'w').write(''.join(f"file '{out}/c{i}.mp4'\n" for i in range(n)))
    sh('ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(out, 'list.txt'), '-c', 'copy', os.path.join(out, 'video.mp4'))
    if '--silent' in a:
        sh('ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(out, 'video.mp4'), '-c', 'copy', os.path.join(out, 'final_silent.mp4')); return
    mix(out, dur, script.get('seed', 21))
    if not qa(out)['ok']: sys.exit('QA failed')


if __name__ == '__main__':
    main()
