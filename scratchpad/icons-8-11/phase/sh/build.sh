#!/bin/bash
# build.sh <stageRoot>: crops sheets 8-11 and builds them into <stageRoot>/ui_icons_<n> (comparison sheets in
# <stageRoot>/sheets), then lists every file that differs from src/assets/ui_icons. Run from the worktree root.
set -e
S=$1
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/phase
mkdir -p $S/sheets
for n in 8 9 10 11; do
  python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $S/ui_icons_$n > /dev/null
  UI_OUT=$S/ui_icons_$n UI_FRAME=src/assets/ui_icons UI_SHEETS=$S/sheets npx tsx tools/ui/ui-icons-23.ts > $S/log-$n.txt 2>&1 || { cat $S/log-$n.txt; exit 1; }
done
same=0; diff=0
for n in 8 9 10 11; do
  if cmp -s $S/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json; then same=$((same+1)); else echo "manifest_$n differs"; diff=$((diff+1)); fi
  for f in $S/ui_icons_$n/*.png; do
    b=$(basename $f)
    if cmp -s $f src/assets/ui_icons/$b; then same=$((same+1)); else echo "$b differs"; diff=$((diff+1)); fi
  done
done
echo "same as src: $same, differing: $diff"
