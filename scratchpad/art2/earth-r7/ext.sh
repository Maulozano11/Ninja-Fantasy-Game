#!/bin/sh
# usage: ext.sh <name> -> runs the extractor into earth-r7/<name>-refdata.ts, compares per sprite with the current refdata
A=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
cd /home/user/Ninja-Fantasy-Game && python3 -I tools/refs/earth-from-ref.py docs/reference/earth-set-owner-reference.jpg $A/earth-r7/$1-refdata.ts $A/earth-v3-work/character.png > $A/earth-r7/$1-ext.log 2>&1; echo "exit $?"
python3 $A/earth-r7/py/refdiff.py $A/earth-r7/refdata.before.ts $A/earth-r7/$1-refdata.ts | grep -v same
