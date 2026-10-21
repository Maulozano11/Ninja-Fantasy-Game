#!/bin/bash
# try.sh <name> [sheets]: builds the sheets (default 8 9), snapshots the staged icons into fix4/<name>, and for
# sheets 8/9 writes the phase measures and fix4/look-<name>.png. Run from the worktree root.
set -e
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
n=$1; shift
bash $P/sh/build.sh ${@:-8 9}
mkdir -p $P/$n
cp $P/stage/ui_icons_*/*.png $P/$n/
python3 -I $P/py/phasem.py $P/$n $P/debug
python3 -I $P/py/phasecontact.py $P/$n $P/look-$n.png
