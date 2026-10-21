#!/bin/sh
# build into uiwork/$1 and compare regions $2
U=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/uiwork
A=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
mkdir -p $U/$1
cd /home/user/Ninja-Fantasy-Game && UI_OUT=$U/$1 UI_SHEETS=$U/$1 UI_CAPTURE=$A/staging/ui_battle/capture UI_SHOTS=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/ui npx tsx tools/ui/ui-battle-kit.ts >/dev/null || exit 1
[ -n "$2" ] && python3 $U/cmp.py $U/$1/ui-battle-mockup.png $U/c_$1.png $2 ${3:-4}
exit 0
