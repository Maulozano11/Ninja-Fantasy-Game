#!/bin/bash
# Checks the installed icons of sheets 8 to 11 match the staged build. Run from the worktree root.
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11
bad=0
for n in 8 9 10 11; do
  cmp -s $SP/stage/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json || { echo "DIFF manifest_$n"; bad=1; }
  for f in $SP/stage/ui_icons_$n/*.png; do
    cmp -s "$f" src/assets/ui_icons/$(basename "$f") || { echo "DIFF $(basename "$f")"; bad=1; }
  done
done
[ $bad = 0 ] && echo "installed files match the build"
