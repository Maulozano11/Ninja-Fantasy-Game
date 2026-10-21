#!/bin/bash
# Snapshot commit of the artists' work: only files that typecheck. Generators with type errors stay uncommitted.
cd /home/user/Ninja-Fantasy-Game || exit 1
git add -A src/assets/world tools/world-sprites
bad=$(npx tsc --noEmit -p . 2>&1 | grep -o '^[^(]*\.ts' | sort -u)
for f in $bad; do echo "type errors, not committed: $f"; git reset -q -- "$f"; done
other=$(echo "$bad" | grep -v '^tools/world-sprites/' | grep -v '^$')
if [ -n "$other" ]; then echo "errors outside world-sprites: $other — aborting"; git reset -q; exit 1; fi
git diff --cached --quiet && { echo "nothing to commit"; exit 0; }
git commit -q -m "World sprites (in progress): latest sheets from the artists

Snapshot while the artists keep working.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1PN8FTpA19jzx1FNkVfPu" && git push -q -u origin claude/eloquent-noether-ix51z1 && git log --oneline -1
