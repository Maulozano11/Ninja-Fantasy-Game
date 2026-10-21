#!/bin/bash
# Copies the seven generated files into src/assets/ui_icons and the contact sheets to their fixed names.
WT=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12
for f in lightning_hound_raidon crescent_moon_dance temple_of_nirvana; do
  cp "$S/stage/$f.png" "$WT/src/assets/ui_icons/$f.png"
  cp "$S/stage/$f@2x.png" "$WT/src/assets/ui_icons/$f@2x.png"
done
cp "$S/stage/manifest_12.json" "$WT/src/assets/ui_icons/manifest_12.json"
cp "$S/sheets/ui-icons-12-compare.png" "$S/fixed-compare.png"
cp "$S/sheets/ui-icons-12-slots.png" "$S/fixed-slots.png"
ls -la "$S/fixed-compare.png" "$S/fixed-slots.png"
