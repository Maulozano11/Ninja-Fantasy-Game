#!/bin/bash
# install.sh: copies the staged sheets 8-11 into src/assets/ui_icons. Run from the worktree root.
set -e
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix3
for n in 8 9 10 11; do
  cp $P/stage/ui_icons_$n/*.png src/assets/ui_icons/
  cp $P/stage/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json
done
echo installed
