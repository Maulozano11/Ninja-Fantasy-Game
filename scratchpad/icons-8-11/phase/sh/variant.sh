#!/bin/bash
# variant.sh <name>: builds swap and warp (debug only) and keeps their 44 and 88 as phase/var/<name>-<id>.png / -<id>@2x.png.
# Run from the worktree root.
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/phase
mkdir -p $P/var
bash $P/sh/one.sh 8 ryusei_swap > /dev/null || exit 1
cp $P/dbgv/ryusei_swap.png $P/var/$1-ryusei_swap.png
cp $P/dbgv/ryusei_swap@2x.png $P/var/$1-ryusei_swap@2x.png
cp $P/debug/ryusei_swap-edited-x4.png $P/var/$1-ryusei_swap-edited-x4.png
bash $P/sh/one.sh 9 ryusei_warp > /dev/null || exit 1
cp $P/dbgv/ryusei_warp.png $P/var/$1-ryusei_warp.png
cp $P/dbgv/ryusei_warp@2x.png $P/var/$1-ryusei_warp@2x.png
cp $P/debug/ryusei_warp-edited-x4.png $P/var/$1-ryusei_warp-edited-x4.png
echo "variant $1 kept"
