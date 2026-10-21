#!/bin/bash
# snap.sh <name> [ids...]: copy the staged icons to fixed/<name>; with ids, also write look/<name>.png
# comparing fixed/${BASE:-base} with fixed/<name> for those ids (his 88 | base 88 | new 88 | his 44 | base 44 | new 44).
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed
n=$1; shift
mkdir -p $SP/$n $SP/look
cp $SP/stage/ui_icons_*/*.png $SP/$n/
if [ $# -gt 0 ]; then
  python3 -I $SP/tools/cmp.py $SP/look/$n.png $SP/${BASE:-base} $SP/$n "$@"
fi
