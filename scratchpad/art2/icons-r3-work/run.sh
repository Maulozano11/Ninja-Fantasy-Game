#!/bin/bash
# run.sh [noart]: build into the work stage, write debug, views
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r3-work
cd /home/user/Ninja-Fantasy-Game
if [ "$1" = noart ]; then export UI_NOART=1; fi
UI_OUT=$W/stage UI_DEBUG=$W/dbg npx tsx tools/ui/ui-icons.ts || exit 1
cd $W && for i in kirin_thunder great_fire_annihilation fireball_goukakyu water_shield_suijinheki; do python3 -I py/view.py $W $i; done
