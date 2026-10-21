#!/bin/bash
# contact.sh: copies the staged icons to fix4/new, writes fix4/out/contact-8..11.png, slots.png and phase-ninjas.png,
# and the phase measures. Run from the worktree root.
set -e
F=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4
mkdir -p $F/new $F/out
for n in 8 9 10 11; do cp $F/stage/ui_icons_$n/*.png $F/new/; done
python3 -I /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools/contact.py $F/new $PWD/src/assets/ui_icons/skill_slot_steel.png $F/out
python3 -I $F/py/phasecontact.py $F/new $F/out/phase-ninjas.png
python3 -I $F/py/phasem.py $F/new $F/debug
ls $F/out
