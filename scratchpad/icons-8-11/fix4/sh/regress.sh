#!/bin/bash
# Rebuilds sheets 2+3, 4, 5, 6, 7 with the current tools and compares every icon and manifest with
# src/assets/ui_icons (must be byte-identical). Run from the worktree root.
set -e
R=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4/regress
rm -rf $R
mkdir -p $R
python3 -I tools/refs/icons-from-ref-23.py docs/reference/icons-owner-reference-2.jpg docs/reference/icons-owner-reference-3.jpg $R/ui_icons_23 > /dev/null
for n in 4 5 6 7; do
  python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $R/ui_icons_$n > /dev/null
done
same=0; diff=0
for d in 23 4 5 6 7; do
  UI_OUT=$R/ui_icons_$d UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts > /dev/null
  if cmp -s $R/ui_icons_$d/manifest.json src/assets/ui_icons/manifest_$d.json; then same=$((same+1)); else echo "manifest_$d DIFFERS"; diff=$((diff+1)); fi
  for f in $R/ui_icons_$d/*.png; do
    b=$(basename $f)
    if cmp -s $f src/assets/ui_icons/$b; then same=$((same+1)); else echo "$b DIFFERS"; diff=$((diff+1)); fi
  done
done
echo "identical: $same, differing: $diff"
