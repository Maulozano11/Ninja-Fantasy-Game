#!/bin/bash
# Prints each icon's ssim at 44 and 88 (and his box's) for the current settings, without writing icons.
# Run from the worktree root. Extra env (UI_BIL0, UI_NOMARKS...) passes through.
SP=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11
declare -A IDS=(
  [8]=ryusei_swap,northstar_command,northstar_submission
  [9]=mirai_evasion,koton_block,koton_wall,ryusei_warp
  [10]=dragon_fire_bomb,wood_dragon_jutsu,adamantine_sealing_chains,taki_sixtyfour_palms
  [11]=shadow_clone,dragon_fire_stream,water_dragon_suiryuudan
)
for n in ${SHEETS:-8 9 10 11}; do
  UI_OUT=$SP/stage/ui_icons_$n UI_FRAME=src/assets/ui_icons UI_ONLY=${IDS[$n]} npx tsx tools/ui/ui-icons-23.ts 2>&1 \
    | awk '/^[a-z_0-9]+ [0-9]+ #/ {id=$1} /^ +44 / {match($0, /"ssim":[0-9.]+,"ssimBox":[0-9.]+/); s44=substr($0, RSTART, RLENGTH)} /^ +88 \{/ {match($0, /"ssim":[0-9.]+/); print id, "44:", s44, " 88:", substr($0, RSTART, RLENGTH)}'
done
