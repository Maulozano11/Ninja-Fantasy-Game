import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/data/shinobiData';
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/claude-md-verify/src/sprite/compose';
const look = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character.appearance!;
const a = renderSprite(look, 'idle', 0).rgba, b = renderSprite(look, 'idle', 0, 'tomoe3').rgba;
let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3]) n++;
console.log('pixels differing', n);
