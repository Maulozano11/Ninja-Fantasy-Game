import { writeFileSync } from 'node:fs';
import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance } from '../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
const looks = [getAppearance(DEFAULT_CHARACTER), ...LEGENDARY_PRESETS.slice(1, 3).map((p) => getAppearance(p.character))];
const frames: Uint8ClampedArray[] = [];
for (const l of looks) for (const stowed of [false, true]) for (const pose of ['idle', 'walk'] as const) frames.push(renderSprite({ ...l, stowed }, pose, 0).rgba);
writeFileSync(process.argv[2], Buffer.concat(frames.map((f) => Buffer.from(f.buffer))));
console.log(frames.length);
