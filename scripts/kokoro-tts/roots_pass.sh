#!/usr/bin/env bash
# 词根词缀 notes catch-up: POST /api/reader-import/roots {"gen":{"max":3}} up to 4 times per run.
# Pauses (state file) until the next UTC midnight (= 7 PM CDT / 6 PM CST) on the daily cap, or 6 h when nothing is left.
ST=/workspace/kokoro/roots.pause; U="${READER_BASE:-https://treetreeacademy.com}/api/reader-import/roots"
now=$(date +%s); ts() { date '+%F %T'; }
if [ -f "$ST" ] && [ "$now" -lt "$(cat "$ST")" ]; then exit 0; fi
TOK="$(cat /workspace/.secrets/READER_IMPORT_TOKEN 2>/dev/null)"; [ -n "$TOK" ] || { echo "$(ts) roots: no token"; exit 0; }
for i in 1 2 3 4; do
  r=$(curl -s -m 75 -H "Authorization: Bearer $TOK" -X POST -d '{"gen":{"max":3}}' "$U") || { echo "$(ts) roots: request failed"; exit 0; }
  echo "$(ts) roots: $r"
  if echo "$r" | grep -q '"missing":0'; then date -d '+6 hours' +%s >"$ST"; echo "$(ts) roots: all done, next check in 6 h"; exit 0; fi
  if echo "$r" | grep -q '"err":"[a-z]'; then
    t=$(date -u -d 'tomorrow 00:05' +%s); echo "$t" >"$ST"; echo "$(ts) roots: paused until $(date -d @$t '+%F %T %Z') (daily cap / AI error)"; exit 0; fi
  echo "$r" | grep -q '"calls"' || { echo "$(ts) roots: unexpected reply, retry next run"; exit 0; }
done
