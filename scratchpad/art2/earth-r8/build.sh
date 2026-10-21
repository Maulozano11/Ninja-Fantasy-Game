#!/bin/sh
# usage: build.sh <name>  -> builds the group into earth-r8/<name>/vfx_earth_v3, log in <name>.log
A=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
D=$A/earth-r8/$1
rm -rf $D; mkdir -p $D/vfx_earth && cp $A/staging/vfx_earth/beast.png $A/staging/vfx_earth/manifest.json $D/vfx_earth/
cd /home/user/Ninja-Fantasy-Game && s=$(date +%s); WORLD_OUT=$D npx tsx tools/world-sprites/vfx-earth-v3.ts > $A/earth-r8/$1.log 2>&1; echo "exit $? secs $(( $(date +%s) - s ))" >> $A/earth-r8/$1.log
