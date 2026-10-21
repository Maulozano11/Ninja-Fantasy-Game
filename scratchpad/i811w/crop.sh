#!/bin/bash
# crop all sheets into staging dirs
set -e
R=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_26dfacbc-f1e-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/i811w/stage
cd $R
for s in ${@:-23 4 5 6 7 8 9 10 11}; do
  mkdir -p $S/s$s
  if [ $s = 23 ]; then
    python3 -I tools/refs/icons-from-ref-23.py docs/reference/icons-owner-reference-2.jpg docs/reference/icons-owner-reference-3.jpg $S/s23 >/dev/null
  else
    python3 -I tools/refs/icons-from-ref-23.py $s=docs/reference/icons-owner-reference-$s.jpg $S/s$s >/dev/null
  fi
done
