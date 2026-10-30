#!/usr/bin/env bash
# Persistent catch-up loop for the Kokoro voice pipeline (the box has no cron).
# Every 2 min: voice "wanted" clips (new dialogue lines, anything the reader asked for). Every 30 min: full collect
# (new books incl. in-app uploads, quizzes, lex). Daily: --verify.
# Each run is capped at 20 min (a stalled run is killed; the next one resumes from done.json).
# Start (idempotent):  scripts/kokoro-tts/loop.sh --daemon     Log: /workspace/logs/kokoro-tts.log
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${KOKORO_PY:-/workspace/kokoro/v/bin/python}"
PIDF=/workspace/kokoro/loop.pid
if [ "${1:-}" = "--daemon" ]; then
  if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then exit 0; fi
  mkdir -p /workspace/logs; setsid nohup "$0" >>/workspace/logs/kokoro-tts.log 2>&1 < /dev/null & echo $! >"$PIDF"; exit 0
fi
echo $$ >"$PIDF"
n=0
while true; do
  if [ $((n % 720)) -eq 0 ]; then a="--full --verify"; elif [ $((n % 15)) -eq 0 ]; then a="--full"; else a=""; fi
  OMP_NUM_THREADS=4 timeout -k 30 20m nice -n 10 "$PY" "$HERE/kokoro_tts.py" $a || echo "$(date '+%F %T') run exited $?"
  # 词根词缀 notes: every ~2 h (60 × 2 min); roots_pass.sh self-pauses on the daily cap / when done
  if [ $((n % 60)) -eq 0 ]; then timeout 6m "$HERE/roots_pass.sh"; fi
  n=$((n + 1))
  # instead of a blind 2-min sleep: poll the server's single "wanted" flag every 15 s (1 KV GET) and voice new
  # dialogue lines / options right away (wants only, no Gemini pass) — a new dialogue gets natural clips in ~20 s
  for _ in 1 2 3 4 5 6 7 8; do
    sleep 15
    f=$(curl -s -m 10 -H "Authorization: Bearer $(cat /workspace/.secrets/READER_IMPORT_TOKEN)" "${READER_SITE:-https://treetreeacademy.com}/api/reader-import/tts?mode=flag" | grep -o '[0-9]\{6,\}' | head -1)
    last=$(cat /workspace/kokoro/flag.last 2>/dev/null || echo 0)
    if [ -n "$f" ] && [ "$f" -gt "$last" ]; then
      echo "$f" >/workspace/kokoro/flag.last; echo "$(date '+%F %T') flag: new wanted clips → voicing now"
      OMP_NUM_THREADS=4 timeout -k 30 5m nice -n 5 "$PY" "$HERE/kokoro_tts.py" --no-upgrade || echo "$(date '+%F %T') fast run exited $?"
    fi
  done
done
