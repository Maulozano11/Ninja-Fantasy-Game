import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/compose';
import { defaultAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/legacy';
import { GRID, PARTS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/raster';
const [body, held, pose, frame, x0, y0, x1, y1] = process.argv.slice(2);
const l: any = defaultAppearance(); l.body = body; l.slots.held = { id: held, colors: [] }; l.stowed = true;
const s = renderSprite(l, pose as any, +frame);
for (let y = +y0; y < +y1; y++) { let row = ''; for (let x = +x0; x < +x1; x++) { const i = y * GRID + x; row += s.rgba[i * 4 + 3] ? String((PARTS as any)[s.part[i]]).slice(0, 4).padEnd(5) : '.    '; } console.log(y, row); }
