#!/bin/bash
# Runs the sheet-12 generator into the scratchpad staging folder and compares with src.
WT=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12
cd "$WT" || exit 1
mkdir -p "$S/stage" "$S/sheets" "$S/dbg"
UI_OUT=$S/stage UI_FRAME=src/assets/ui_icons UI_SHEETS=$S/sheets UI_DEBUG=$S/dbg npx tsx tools/ui/ui-icons-12.ts 2>&1 | cut -c1-1200
for f in lightning_hound_raidon crescent_moon_dance temple_of_nirvana; do
  for s in "" "@2x"; do
    if cmp -s "$S/stage/$f$s.png" "src/assets/ui_icons/$f$s.png"; then echo "same $f$s"; else echo "DIFF $f$s"; fi
  done
done
if cmp -s "$S/stage/manifest_12.json" src/assets/ui_icons/manifest_12.json; then echo "manifest same"; else echo "manifest DIFF"; fi
