#!/bin/bash
# Build sheets 8-11 into fixed/stage (run from the worktree root). SHEETS="8 9" to limit.
set -e
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed
for n in ${SHEETS:-8 9 10 11}; do
  UI_OUT=$SP/stage/ui_icons_$n UI_FRAME=src/assets/ui_icons UI_DEBUG=$SP/debug npx tsx tools/ui/ui-icons-23.ts > $SP/log-$n.txt 2>&1 || { cat $SP/log-$n.txt; exit 1; }
  grep -E "^[a-z_]+ [0-9]+ #" $SP/log-$n.txt | cut -c1-60
done
