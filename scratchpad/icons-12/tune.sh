#!/bin/bash
# usage: tune.sh <id> <size 44|88|both> '<json tune 1>' ['<json tune 2>' ...] -- prints the checks of that icon for each tune.
# With TUNE_DEBUG=<dir> the debug files of the last tune go there.
WT=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12
cd "$WT" || exit 1
ID=$1
SZ=$2
shift 2
for T in "$@"; do
  echo "== $T"
  D=${TUNE_DEBUG:-}
  if [ -n "$D" ]; then mkdir -p "$D"; fi
  OUT=$(UI_OUT=$S/stage UI_FRAME=src/assets/ui_icons UI_ONLY=$ID UI_DEBUG=$D UI_TUNE="{\"$ID\": $T}" npx tsx tools/ui/ui-icons-12.ts 2>&1)
  if [ "$SZ" = "both" ]; then echo "$OUT" | grep -v "^$ID " | cut -c1-700; else echo "$OUT" | grep "^   $SZ " | cut -c1-700; fi
done
