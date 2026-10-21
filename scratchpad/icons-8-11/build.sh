#!/bin/bash
# Build the owner's icon sheets 8 to 11 into the staging folders, then the contact sheets.
# Run from the worktree root.
set -e
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11
for n in ${SHEETS:-8 9 10 11}; do
  if [ -n "$CROP" ]; then
    python3 -I tools/refs/icons-from-ref-23.py $n=docs/reference/icons-owner-reference-$n.jpg $SP/stage/ui_icons_$n
  fi
  UI_OUT=$SP/stage/ui_icons_$n UI_FRAME=src/assets/ui_icons UI_SHEETS=$SP/sheets UI_DEBUG=$SP/debug npx tsx tools/ui/ui-icons-23.ts > $SP/log-$n.txt 2>&1 || { cat $SP/log-$n.txt; exit 1; }
  grep -E "^[a-z_]+ [0-9]+ #|^ +(44|88) " $SP/log-$n.txt
done
npx tsx $SP/contact.mts "$PWD" $SP/stage $SP/debug $SP
