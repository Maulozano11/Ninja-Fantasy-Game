#!/bin/bash
# build sheets (default all) and compare with committed
R=/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_26dfacbc-f1e-1
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/i811w/stage
cd $R
for s in ${@:-23 4 5 6 7 8 9 10 11}; do
  UI_OUT=$S/s$s UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts > $S/log-$s.txt 2>&1 || { echo "FAIL $s"; tail -5 $S/log-$s.txt; }
  m=manifest_$s.json
  n=0; d=0
  for f in $S/s$s/*.png; do b=$(basename $f); n=$((n+1)); cmp -s $f src/assets/ui_icons/$b || { d=$((d+1)); echo "  differs: $b"; }; done
  cmp -s $S/s$s/manifest.json src/assets/ui_icons/$m && echo "sheet $s: $n png, $d differ, manifest same" || echo "sheet $s: $n png, $d differ, manifest DIFFERS"
done
