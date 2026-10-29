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
  n=$((n + 1)); sleep 120
done
