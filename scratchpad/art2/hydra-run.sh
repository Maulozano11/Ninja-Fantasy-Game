#!/bin/sh
# Runs the creatures generator with the staging output (never src/assets/world).
A=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=$A/staging npx tsx tools/world-sprites/creatures.ts $A
