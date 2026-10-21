#!/bin/sh
# pv.sh piece... : render the named pieces into uiwork/pv
cd /home/user/Ninja-Fantasy-Game && npx tsx /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/uitools/preview.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/uiwork/pv "$@" 2>&1 | grep -v -i "npm notice"
true
