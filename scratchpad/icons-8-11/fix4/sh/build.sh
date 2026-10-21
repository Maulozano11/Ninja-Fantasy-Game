#!/bin/bash
# build.sh [sheets]: builds sheets 8-11 (or the given ones) into fix4/stage/ui_icons_<n> with debug in fix4/debug
# (DBG=<dir> elsewhere, DBG=none for no debug), then lists the files that differ from src/assets/ui_icons.
# Run from the worktree root.
set -e
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
mkdir -p $P/debug
SH=${@:-8 9 10 11}
for n in $SH; do
  if [ "$DBG" = none ]; then
    UI_OUT=$P/stage/ui_icons_$n UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts > $P/log-$n.txt 2>&1 || { cat $P/log-$n.txt; exit 1; }
  else
    UI_OUT=$P/stage/ui_icons_$n UI_FRAME=src/assets/ui_icons UI_DEBUG=${DBG:-$P/debug} npx tsx tools/ui/ui-icons-23.ts > $P/log-$n.txt 2>&1 || { cat $P/log-$n.txt; exit 1; }
  fi
done
same=0; diff=0
for n in $SH; do
  if cmp -s $P/stage/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json; then same=$((same+1)); else echo "manifest_$n differs"; diff=$((diff+1)); fi
  for f in $P/stage/ui_icons_$n/*.png; do
    b=$(basename $f)
    if cmp -s $f src/assets/ui_icons/$b; then same=$((same+1)); else echo "$b differs"; diff=$((diff+1)); fi
  done
done
echo "same as src: $same, differing: $diff"
