#!/bin/bash
# Regenerates the earlier sheets (2+3, 4, 5, 6, 7) with the changed tools and compares the icons and
# manifests with the ones in src/assets/ui_icons. Run from the worktree root.
set -e
R=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/regress
rm -rf $R
mkdir -p $R
python3 -I tools/refs/icons-from-ref-23.py docs/reference/icons-owner-reference-2.jpg docs/reference/icons-owner-reference-3.jpg $R/ui_icons_23 > /dev/null
for n in 4 5 6 7; do
  python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $R/ui_icons_$n > /dev/null
done
for d in 23 4 5 6 7; do
  UI_OUT=$R/ui_icons_$d UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts > /dev/null
  m=manifest_$d.json
  if cmp -s $R/ui_icons_$d/manifest.json src/assets/ui_icons/$m; then echo "$m identical"; else echo "$m DIFFERS"; fi
  for f in $R/ui_icons_$d/*.png; do
    b=$(basename $f)
    if [ -f src/assets/ui_icons/$b ]; then
      cmp -s $f src/assets/ui_icons/$b && echo "  $b identical" || echo "  $b DIFFERS"
    else
      echo "  $b (not in src)"
    fi
  done
done
