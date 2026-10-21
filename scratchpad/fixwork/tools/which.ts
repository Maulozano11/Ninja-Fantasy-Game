// npx tsx which.ts <preset> <pose> <frame> <x0> <y0> <x1> <y1>: parts of the pixels in a box (fine px)
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/compose';
import { getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/legacy';
import { GRID, PARTS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/data/shinobiData';
const [name, pose, frame, x0, y0, x1, y1] = process.argv.slice(2);
const p = LEGENDARY_PRESETS.find((q) => q.name.startsWith(name))!;
const look: any = getAppearance(p.character);
console.log(JSON.stringify({ slots: Object.fromEntries(Object.entries(look.slots).map(([k, v]: any) => [k, v.id])), acc: look.accessories.map((a: any) => a.id), stowed: look.stowed }));
const s = renderSprite(look, pose as any, Number(frame));
const count: Record<string, number> = {};
for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) {
  const i = y * GRID + x;
  if (!s.rgba[i * 4 + 3]) continue;
  const k = PARTS[s.part[i]];
  count[k] = (count[k] ?? 0) + 1;
}
console.log(count);
