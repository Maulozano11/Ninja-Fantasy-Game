#!/bin/bash
# Renders the deliverable frames and composes lanzamiento/estocada png+gif.
set -e
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce
W=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1
rm -rf "$S/raw_lanz" "$S/raw_esto"
(cd "$W" && npx tsx "$S/tools/dump.ts" "$S/raw_lanz" "$S/tools/spec_lanz.json" && npx tsx "$S/tools/dump.ts" "$S/raw_esto" "$S/tools/spec_esto.json")
python3 -I "$S/tools/deliver.py"
