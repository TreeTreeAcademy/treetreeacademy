#!/usr/bin/env bash
# Persistent catch-up loop for the Kokoro voice pipeline (the box has no cron).
# Default: poll a single "wanted" flag key every 30s and only run the voicer when it changes.
# Rare sweep: full collect every 6 h, --verify once a day. This used to SCAN the wants list every 2 min
# (thousands of leftover kkw:* keys) and burned the Upstash free 500k commands/month quota.
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
backoff=30
while true; do
  if [ $((n % 720)) -eq 0 ]; then a="--full --verify"
  elif [ $((n % 180)) -eq 0 ]; then a="--full"
  else a=""
  fi
  if [ -n "$a" ]; then
    OMP_NUM_THREADS=4 timeout -k 30 20m nice -n 10 "$PY" "$HERE/kokoro_tts.py" $a || echo "$(date '+%F %T') run exited $?"
  fi
  # 词根词缀 notes: every ~2 h; roots_pass.sh self-pauses on the daily cap / when done
  if [ $((n % 60)) -eq 0 ]; then timeout 6m "$HERE/roots_pass.sh"; fi
  # finish 复习区 one-word dialogues for the newest book (upload already tried; this catches quota misses)
  if [ $((n % 15)) -eq 0 ]; then curl -s -m 70 -X POST -H "Authorization: Bearer $(cat /workspace/.secrets/READER_IMPORT_TOKEN)" -H 'content-type: application/json' -d '{"prepTalks":{"max":3}}' "${READER_SITE:-https://treetreeacademy.com}/api/reader-import/tts" | head -c 200 | sed "s/^/$(date '+%F %T') talks: /"; echo; fi
  n=$((n + 1))
  # poll the server's single "wanted" flag (1 KV GET). Voice only when it changes.
  # On repeated flag failures, back off so we don't keep spending residual quota.
  fails=0
  for _ in 1 2 3 4; do
    sleep "$backoff"
    body=$(curl -s -m 10 -H "Authorization: Bearer $(cat /workspace/.secrets/READER_IMPORT_TOKEN)" "${READER_SITE:-https://treetreeacademy.com}/api/reader-import/tts?mode=flag" || true)
    if echo "$body" | grep -q 'kv_quota\|"error"'; then
      fails=$((fails + 1))
      echo "$(date '+%F %T') flag poll failed: $(echo "$body" | head -c 160)"
      backoff=$(( backoff < 300 ? backoff * 2 : 300 ))
      continue
    fi
    backoff=30
    f=$(echo "$body" | grep -o '[0-9]\{6,\}' | head -1)
    last=$(cat /workspace/kokoro/flag.last 2>/dev/null || echo 0)
    if [ -n "$f" ] && [ "$f" -gt "$last" ]; then
      echo "$f" >/workspace/kokoro/flag.last; echo "$(date '+%F %T') flag: new wanted clips → voicing now"
      OMP_NUM_THREADS=4 timeout -k 30 20m nice -n 5 "$PY" "$HERE/kokoro_tts.py" --no-upgrade || echo "$(date '+%F %T') fast run exited $?"
    fi
  done
done
