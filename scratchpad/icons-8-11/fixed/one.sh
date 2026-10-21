#!/bin/bash
# one.sh <sheet> <id>: build one icon (debug only) and copy its 44 and 88 into fixed/dbgv as <id>.png and <id>@2x.png.
# Run from the worktree root.
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed
mkdir -p $SP/dbgv
UI_ONLY=$2 UI_OUT=$SP/stage/ui_icons_$1 UI_FRAME=src/assets/ui_icons UI_DEBUG=$SP/debug npx tsx tools/ui/ui-icons-23.ts > $SP/one.log 2>&1 || { cat $SP/one.log; exit 1; }
grep -E "^[a-z_]+ [0-9]+ #|covered|^ +(44|88) " $SP/one.log | cut -c1-400
cp $SP/debug/$2-44.png $SP/dbgv/$2.png
cp $SP/debug/$2-88.png $SP/dbgv/$2@2x.png
