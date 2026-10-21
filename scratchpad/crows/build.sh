set -e
cd /home/user/Ninja-Fantasy-Game
python3 -I tools/refs/crows-from-ref.py docs/reference/genjutsu-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-genjutsu.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-ref
WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/vfx-beast-crows.ts
python3 -I /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/beasts-crows.py
