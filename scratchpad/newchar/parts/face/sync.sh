#!/bin/sh
# Refreshes the combo source tree: the face worktree's src with the Scarlet hair files laid over it.
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/newchar/parts/face
rm -rf "$S/combo/src"
cp -r /home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-3/src "$S/combo/src"
cp "$S/hairfiles/hair.ts" "$S/hairfiles/scarletHairArt.ts" "$S/combo/src/sprite/items/"
echo synced
