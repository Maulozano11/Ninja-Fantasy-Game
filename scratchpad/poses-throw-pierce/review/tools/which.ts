import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/compose';
import { getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/legacy';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/data/shinobiData';
const [preset, pose, frame, x0, y0, x1, y1] = process.argv.slice(2);
const p = LEGENDARY_PRESETS.find((q: any) => q.name.startsWith(preset))!;
const base: any = structuredClone(getAppearance(p.character));
const count = (look: any) => { const s = renderSprite(look, pose as any, +frame); let n = 0; for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) { const i = y * GRID + x; const c = s.rgba.slice(i*4, i*4+3); if (s.rgba[i*4+3] && c[0] > 150 && c[1] > 150 && c[2] > 150) n++; } return n; };
console.log('base', count(base));
for (const k of Object.keys(base.slots)) { const l = structuredClone(base); delete l.slots[k]; console.log('-' + k, count(l)); }
