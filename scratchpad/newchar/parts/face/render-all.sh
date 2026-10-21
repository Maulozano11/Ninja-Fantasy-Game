#!/bin/sh
# Renders every verification spec (w3/spec-<kind>.json) from the combo tree into w3/rr-<kind>.
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/newchar/parts/face
cd /home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-3 || exit 1
for k in ${KINDS:-poses bodies combos specials skins}; do
  timeout 600 npx tsx "$S/w3/render2.mts" "$S/combo" "$S/w3/spec-$k.json" "$S/w3/rr-$k" || echo "FAIL $k"
done
echo rendered
