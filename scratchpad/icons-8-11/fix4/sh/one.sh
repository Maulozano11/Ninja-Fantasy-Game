#!/bin/bash
# one.sh <sheet> <id>: build one icon (debug only) into fix4/dbgv/<id>.png and <id>@2x.png. Run from the worktree root.
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
mkdir -p $P/dbgv $P/debug
UI_ONLY=$2 UI_OUT=$P/stage/ui_icons_$1 UI_FRAME=src/assets/ui_icons UI_DEBUG=$P/debug npx tsx tools/ui/ui-icons-23.ts > $P/one.log 2>&1 || { cat $P/one.log; exit 1; }
grep -E "^[a-z_]+ [0-9]+ #|covered|^ +(44|88) " $P/one.log | cut -c1-500
cp $P/debug/$2-44.png $P/dbgv/$2.png
cp $P/debug/$2-88.png $P/dbgv/$2@2x.png
