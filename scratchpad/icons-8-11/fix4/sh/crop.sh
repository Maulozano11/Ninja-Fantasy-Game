#!/bin/bash
# crop.sh: crops sheets 8-11 into fix4/stage/ui_icons_<n>. Run from the worktree root.
set -e
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
for n in 8 9 10 11; do
  python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $P/stage/ui_icons_$n > /dev/null
done
echo cropped
