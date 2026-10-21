#!/bin/bash
# Extracts the original sheet-12 icon files (branch icons/sheet-12) for the before measurements.
WT=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1
B=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12/before
mkdir -p "$B"
cd "$WT" || exit 1
for f in lightning_hound_raidon crescent_moon_dance temple_of_nirvana; do
  git show "icons/sheet-12:src/assets/ui_icons/$f.png" > "$B/$f.png"
  git show "icons/sheet-12:src/assets/ui_icons/$f@2x.png" > "$B/$f@2x.png"
done
git show icons/sheet-12:src/assets/ui_icons/manifest_12.json > "$B/manifest_12.json"
ls -la "$B"
