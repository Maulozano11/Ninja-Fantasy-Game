#!/bin/sh
# Hashes every existing eye x face x body x pose with the study's src and with this branch's, and
# lists the cases that differ.
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/newchar/parts/face
cd /home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-3 || exit 1
timeout 900 npx tsx "$S/w3/regress2.mts" "$S/base2" "$S/w3/reg-base.json" || echo FAIL base
timeout 900 npx tsx "$S/w3/regress2.mts" /home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-3 "$S/w3/reg-new.json" || echo FAIL new
python3 -I -c "
import json
a = json.load(open('$S/w3/reg-base.json')); b = json.load(open('$S/w3/reg-new.json'))
d = [k for k in a if a[k] != b.get(k)]
print(len(a), 'cases,', len(d), 'differ')
for k in d[:40]: print(' ', k)
"
