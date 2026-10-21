// Time to compose sprite frames at the current frame size.
import { renderSprite } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { GRID } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/raster';
const looks = LEGENDARY_PRESETS.map((p) => p.character.appearance!).filter(Boolean);
for (const l of looks) renderSprite(l, 'idle', 0); // warm up
const t0 = performance.now();
let n = 0;
for (let k = 0; k < 3; k++) for (const l of looks) for (const pose of ['idle', 'attack', 'walk'] as const) { renderSprite(l, pose, k); n++; }
console.log('GRID', GRID, 'ms per frame', ((performance.now() - t0) / n).toFixed(1));
