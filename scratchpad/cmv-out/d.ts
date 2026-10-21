import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/data/shinobiData';
import { dojutsuToEye } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/sprite/legacy';
for (const p of LEGENDARY_PRESETS) console.log(p.character.id, p.character.dojutsu, dojutsuToEye(p.character.dojutsu));
