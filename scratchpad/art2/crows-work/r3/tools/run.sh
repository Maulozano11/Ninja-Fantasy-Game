#!/bin/bash
# run.sh <tag> [script]  -> builds $M/<tag>.ts with CROWS_DEV=1, prints checks + measurement
M=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3
S=${2:-/home/user/Ninja-Fantasy-Game/tools/refs/crows-from-ref.py}
cd /home/user/Ninja-Fantasy-Game
CROWS_DEV=1 python3 -I $S docs/reference/genjutsu-set-owner-reference.jpg $M/$1.ts $M/dbg-$1 > $M/$1.log 2>&1
echo "exit $?"
grep -E "solid|opaque|light|vortex \(|highlights|CHECK|chroma|frame|Traceback|Error" $M/$1.log
python3 -I $M/tools/measure.py $M/$1.ts $M/m-$1
