#!/bin/bash
# one Kirin head iteration: compose, build, preview
T=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r5-tools
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r5-work
python3 -I $T/khead.py $W/khead.json > $W/khead.txt || exit 1
cd /home/user/Ninja-Fantasy-Game && UI_KHEAD=$W/khead.json UI_OUT=$W/out npx tsx tools/ui/ui-icons.ts 2>&1 | grep -A1 "^kirin" | tail -1
python3 -I $T/preview.py $W kirin_thunder
