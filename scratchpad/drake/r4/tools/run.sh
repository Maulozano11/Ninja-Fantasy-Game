#!/bin/bash
# run converter (and the debug-layer copy) into r4/<tag>
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/r4
T=$1
mkdir -p $W/dbg-$T
cd /home/user/Ninja-Fantasy-Game && python3 -I tools/refs/beasts-from-ref.py drake docs/reference/earth-set-owner-reference.jpg docs/reference/earth-set-owner-reference.jpg $W/earth-$T.ts $W/dbg-$T > $W/log-$T.txt 2>&1
tail -22 $W/log-$T.txt
