# 21resell-tiktok-media
Automatic daily TikTok generator for @21resell_mindset, published via Metricool.

- `tiktok_gen.py script.json OUT_DIR` – renders the 1080x1920/60fps animation, ElevenLabs voice-over
  (env `ELEVENLABS_API_KEY`) and an original synthesized music bed (`make_bed.py`). `--silent` = layout test.
- `media_upload.sh up FILE` / `down` – hosts the video on branch `media` only for the few seconds
  Metricool needs to copy it, then empties the branch. Videos are never kept here.
- `examples/example_winter.json` – sample script (format documented at the top of tiktok_gen.py).

## Engine (preferred, same look as the hand-made series)
`python3 engine/make.py SCRIPT.json OUT_DIR [--wav VOICE.wav] [--silent] [--stills-only]`
- canvas engine in `engine/` (libV.js, motilib.js, nlib.js, rlib.js, wlib.js + data-driven `scenes.js`), headless Chrome, 60 fps, motion blur
- voice: ElevenLabs `with-timestamps` (env `ELEVENLABS_API_KEY`, voice Maisie `QtY3JBOUKEB5xzrRfOKc`) or `--wav` with a ready recording
- pauses cut to 0.2 s, music = `make_bed.py` at 0.30 + sidechain, voice mono->stereo, alimiter 0.95
- outputs `final.mp4`, `stills/` (one frame per scene), `sheet.jpg`, `qa.json`
- script format: see `examples/2026-11-27_black_friday.json`; visual types are listed in `engine/scenes.js` (`VIS`)
