import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/compose';
import { getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/legacy';
import { GRID, PARTS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/data/shinobiData';
const [preset, pose, frame, x0, y0, x1, y1] = process.argv.slice(2);
const p = LEGENDARY_PRESETS.find((q: any) => q.name.startsWith(preset))!;
const look: any = structuredClone(getAppearance(p.character));
console.log(JSON.stringify(look.slots));
const s = renderSprite(look, pose as any, +frame);
const counts: Record<string, number> = {};
for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) { const i = y * GRID + x; if (!s.rgba[i * 4 + 3]) continue; const n = (PARTS as any)[s.part[i]] ?? s.part[i]; counts[n] = (counts[n] || 0) + 1; }
console.log(counts);
