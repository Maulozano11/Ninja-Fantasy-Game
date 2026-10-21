#!/bin/bash
# run.sh design... : stamp each design and build cmp.png
set -e
P=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/parts/elise-face/proto
REPO=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_74e8609f-23b-2
STD=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/parts/elise-face/work/std.png
args=()
for d in "$@"; do
  python3 -I "$P/proto.py" "$STD" "$P/$d.png" "$d"
  args+=("$d=$P/$d.png")
done
cd "$REPO"
python3 -I "$P/cmp.py" "$REPO" "$P/cmp.png" "${args[@]}"
