#!/bin/sh
# run8.sh <outprefix> [fly.json] [only]
R7=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/r7
cd /home/user/Ninja-Fantasy-Game
OUTP=$1 DRAKE_FLY=$2 ONLY=${3:-0,1,2,3,4,5,6,7} DRAKE_TUNE=$R7/tools/run8.py python3 -I $R7/tools/w.py drake docs/reference/earth-set-owner-reference.jpg docs/reference/earth-set-owner-reference.jpg $R7/tools/discard.ts 2>&1 | grep -v "^drake\|^key\|^dust"
