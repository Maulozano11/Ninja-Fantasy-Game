#!/bin/bash
# Copies the staged icons of sheets 8 to 11 and their manifests into src/assets/ui_icons. Run from the worktree root.
set -e
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11
for n in 8 9 10 11; do
  for f in $SP/stage/ui_icons_$n/*.png; do cp "$f" src/assets/ui_icons/; done
  cp $SP/stage/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json
done
ls src/assets/ui_icons | wc -l
