#!/bin/bash
# usage: run.sh <name> [scale] [key]  -> renders tools/spec_<name>.json into raw_<name>/ and sheet <name>.png
set -e
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce
W=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1
N=$1
SC=${2:-2}
if [ -f "$S/tools/mkspec_$N.py" ]; then python3 -I "$S/tools/mkspec_$N.py"; fi
rm -rf "$S/raw_$N"
(cd "$W" && npx tsx "$S/tools/dump.ts" "$S/raw_$N" "$S/tools/spec_$N.json")
python3 -I "$S/tools/auto_rows.py" "$S/raw_$N" "$S/tools/rows_$N.json" $3
python3 -I "$S/tools/sheet.py" "$S/raw_$N" "$S/$N.png" "$SC" "$S/tools/rows_$N.json"
