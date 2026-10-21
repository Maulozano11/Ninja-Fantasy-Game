#!/bin/sh
# Copies the worktree's sprite sources into the scratch tree, keeping the hair branch's hair files.
set -e
W=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_b2ff21f0-0e3-1
T=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/tree
for f in body.ts eyeArt.ts types.ts headArt.ts castfx.ts random.ts compose.ts; do cp "$W/src/sprite/$f" "$T/src/sprite/$f"; done
echo synced
