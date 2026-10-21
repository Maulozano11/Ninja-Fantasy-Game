#!/bin/sh
# ex.sh <names>: extractor on some sprites into r3/rev (no refdata)
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/earth-v3-work
cd /home/user/Ninja-Fantasy-Game && EARTH_ONLY=$1 python3 -I tools/refs/earth-from-ref.py docs/reference/earth-set-owner-reference.jpg /dev/null $W/character.png $W/r3/rev 2>&1 | grep -v "^built"
