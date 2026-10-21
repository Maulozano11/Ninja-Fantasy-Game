#!/bin/bash
set -e
WT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons811-rev2
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/stage
cd $WT
rm -rf $S; mkdir -p $S
for n in 8 9 10 11; do
  python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $S/s$n > /dev/null
  UI_OUT=$S/s$n UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts > $S/gen-$n.log 2>&1
  cmp -s $S/s$n/manifest.json src/assets/ui_icons/manifest_$n.json && echo "manifest_$n same" || echo "manifest_$n DIFFERS"
  for f in $S/s$n/*.png; do b=$(basename $f); cmp -s $f src/assets/ui_icons/$b && echo "  $b same" || echo "  $b DIFFERS"; done
done
