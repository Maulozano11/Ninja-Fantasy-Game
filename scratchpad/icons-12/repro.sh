#!/bin/bash
# From scratch: crop script + generator into a fresh folder, then byte-compare with src.
WT=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12
R=$S/repro2
rm -rf "$R"
mkdir -p "$R"
cd "$WT" || exit 1
python3 -I tools/refs/icons-from-ref-12.py docs/reference/icons-owner-reference-12.jpg "$R" | head -2
UI_OUT=$R UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-12.ts > /dev/null 2>&1
for f in lightning_hound_raidon crescent_moon_dance temple_of_nirvana; do
  for s in "" "@2x"; do
    if cmp -s "$R/$f$s.png" "src/assets/ui_icons/$f$s.png"; then echo "same $f$s"; else echo "DIFF $f$s"; fi
  done
done
if cmp -s "$R/manifest_12.json" src/assets/ui_icons/manifest_12.json; then echo "manifest same"; else echo "manifest DIFF"; fi
if cmp -s "$R/ref/crops.json" "$S/stage/ref/crops.json"; then echo "crops same"; else echo "crops DIFF"; fi
