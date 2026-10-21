#!/bin/bash
# builds into chakra6/stage (or $1)
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad
OUT=${1:-$SP/chakra6/stage}
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=$OUT CHAKRA_LIGHT=${CHAKRA_LIGHT:-} npx tsx tools/world-sprites/vfx-chakra-v3.ts
