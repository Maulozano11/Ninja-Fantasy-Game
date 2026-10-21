#!/bin/bash
# usage: run.sh [id,...]  -> runs the generator into icons23-work/out with debug into icons23-work/dbg
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-work
cd /home/user/Ninja-Fantasy-Game
if [ -n "$1" ]; then export UI_ONLY=$1; fi
UI_OUT=$W/out UI_FRAME=$W/../staging/ui_icons UI_DEBUG=$W/dbg UI_SHEETS=$W npx tsx tools/ui/ui-icons-23.ts 2>&1
