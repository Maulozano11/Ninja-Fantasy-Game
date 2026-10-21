#!/bin/bash
# usage: r.sh <spec name> <out name> [scale] [sheet args...]
set -e
F=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/fixwork
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix
N=$1
O=$2
SC=${3:-2}
shift 3 || true
rm -rf "$F/raw_$O"
cd "$W"
npx tsx "$F/tools/dump.ts" "$F/raw_$O" "$F/tools/spec_$N.json"
python3 -I "$F/tools/sheet.py" "$F/raw_$O" "$F/$O.png" "$SC" "$@"
