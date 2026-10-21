#!/bin/bash
# snap.sh <name>: copies base icons, then the debug-built ones (dbgv) over them, into fix4/<name>; runs meas3 on it.
F=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
n=$1
mkdir -p $F/$n
cp $F/base/*.png $F/$n/
cp $F/dbgv/* $F/$n/ 2>/dev/null
python3 -I $F/py/meas3.py $F/$n
