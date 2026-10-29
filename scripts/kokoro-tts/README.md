# Kokoro voice pipeline (box)

Natural voice for every word / sentence / dialogue line in 树儿读读乐, generated on the box with
Kokoro-82M (Apache-2.0) and uploaded to the reader store (`reader:kk:v1:*`) via `/api/reader-import/tts`.

Setup (once): `python3 -m venv /workspace/kokoro/v && /workspace/kokoro/v/bin/pip install kokoro-onnx soundfile`
and put `kokoro-v1.0.onnx` + `voices-v1.0.bin` (github.com/thewh1teagle/kokoro-onnx releases) in /workspace/kokoro.

- `kokoro_tts.py --full` — backfill everything (idempotent). `--verify` re-checks against the store.
- `loop.sh --daemon` — catch-up loop (wants every 2 min, full every 30 min). Log: /workspace/logs/kokoro-tts.log
- Book import runs `--full` automatically at the end.

Voices: words/sentences af_heart, dialogue A af_bella, dialogue B am_puck.
