#!/bin/bash
# usage: tune.sh <name> '<UI_TUNE json>'  (runs the wolf only, prints the 88 / 44 checks, writes debug to dbg-<name>)
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12
ID=${ID:-lightning_hound_raidon}
mkdir -p "$S/dbg-$1"
cd /home/user/Ninja-Fantasy-Game/.claude/worktrees/agent-a33598793eb494810 || exit 1
UI_OUT=$S/new UI_FRAME=src/assets/ui_icons UI_ONLY=$ID UI_DEBUG=$S/dbg-$1 UI_TUNE="$2" npx tsx tools/ui/ui-icons-12.ts 2>&1 | grep -v ' #' | sed 's/"ssim.*//'
