#!/bin/bash
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad
cd /home/user/Ninja-Fantasy-Game && python3 -I tools/refs/poison-from-ref.py docs/reference/poison-set-owner-reference.jpg tools/world-sprites/vfx-poison-v3-refdata.ts $SP/art2/vfx-poison-v3-character.png $SP/pfix/src
