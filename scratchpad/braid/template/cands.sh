cd /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/braid/template
TSX=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/node_modules/.bin/tsx
: > cands.txt
while read -r line; do
  [ -z "$line" ] && continue
  $TSX gen4.ts $line >> cands.txt
  echo >> cands.txt
done < params.txt
cat cands.txt
$TSX tile.ts cands.txt cands.png
