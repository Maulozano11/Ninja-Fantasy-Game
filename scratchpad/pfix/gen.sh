#!/bin/bash
# usage: gen.sh  -> builds into pfix/stage
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=$SP/pfix/stage POISON_LIGHT=1 npx tsx tools/world-sprites/vfx-poison-v3.ts
