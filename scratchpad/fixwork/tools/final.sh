#!/bin/bash
# Renders the deliverable frames from the fix worktree and composes lanzamiento/estocada png+gif.
set -e
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce
F=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/fixwork
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix
rm -rf "$S/raw_lanz" "$S/raw_esto"
cd "$W"
npx tsx "$F/tools/dump.ts" "$S/raw_lanz" "$F/tools/spec_lanz.json"
npx tsx "$F/tools/dump.ts" "$S/raw_esto" "$F/tools/spec_esto.json"
python3 -I "$F/tools/deliver.py"
