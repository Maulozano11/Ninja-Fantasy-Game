#!/bin/sh
# try.sh <name>: install exp-<name>.ts, build into stage-<name>, verify
R4=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/griffin-r4
cp $R4/exp-$1.ts /home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-beasts-ref-chakra.ts
mkdir -p $R4/stage-$1/staging $R4/stage-$1/griffin-ref
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=$R4/stage-$1/staging npx tsx tools/world-sprites/vfx-beast-griffin.ts
cp $R4/dbg-$1/* $R4/stage-$1/griffin-ref/
python3 -I $R4/verify.py $R4/stage-$1
