// Writes tools/refs/base_head_skull.json: the fine pixels of our 'fine' female head rendered bald at idle
// frame 0 (the head group only), for base-head-from-ref.py to continue the owner's head under his hair.
//     npx tsx tools/refs/base-head-skull.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSprite } from '../../src/sprite/compose';
import { defaultAppearance } from '../../src/sprite/legacy';
import { GRID } from '../../src/sprite/raster';
const ap: any = defaultAppearance();
ap.body = 'female'; ap.faceShape = 'fine'; ap.eyeShape = 'keen'; ap.slots = { hair: { id: 'hair_none', colors: {} } };
const f = renderSprite(ap, 'idle', 0, 'None' as any);
// the head: every opaque pixel above the chin row (the face anchor row + 12) in the head's columns
const out: [number, number][] = [];
for (let y = 100; y < 160; y++) for (let x = 100; x < 150; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) out.push([x, y]);
writeFileSync(join(import.meta.dirname, 'base_head_skull.json'), JSON.stringify(out));
console.log(out.length, 'head pixels');
