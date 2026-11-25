# 21resell-tiktok-media
Automatic daily TikTok generator for @21resell_mindset, published via Metricool.

- `tiktok_gen.py script.json OUT_DIR` – renders the 1080x1920/60fps animation, ElevenLabs voice-over
  (env `ELEVENLABS_API_KEY`) and an original synthesized music bed (`make_bed.py`). `--silent` = layout test.
- `media_upload.sh up FILE` / `down` – hosts the video on branch `media` only for the few seconds
  Metricool needs to copy it, then empties the branch. Videos are never kept here.
- `examples/` – sample script format.
