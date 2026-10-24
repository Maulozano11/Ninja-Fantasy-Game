// The sheet the owner painted his fire hit over (docs/reference/fire-hit-owner-reference.jpg), without
// the old hit: the practice battle's first rogue (Renegado 1, the cedar_rogues encounter) in his hurt
// pose, facing left as when he is hit from the left, on the sheet's grey checkerboard, in the 12 cells
// of 128x176 px with his feet at (64, 158). Frames 1-3 show hurt frame 0, frames 4-12 hurt frame 1
// (the hurt pose's 4 fps over the hit's 12). tools/refs/fire-hit-from-ref.py reads this to tell his
// effect from the rogue under it.
//
//   npx tsx tools/refs/fire-hit-base.ts tools/refs/data/fire-hit-base.png
//
// Writes one strip of the 12 cells, 1536x176. The strip in tools/refs/data is the rogue as he painted
// over it: keep it even if the rogue's art changes later (a rerun only checks that it has not).

import { enemyUnit } from '../../src/battle/units';
import { renderSprite } from '../../src/sprite/compose';
import { dojutsuToEye } from '../../src/sprite/legacy';
import { FEET } from '../../src/sprite/rig';
import { GRID } from '../../src/sprite/raster';
import { lookOf } from '../../src/components/battle/unitArt';
import { writePng } from '../world-sprites/kit';

const W = 128, H = 176, FX = 64, FY = 158, N = 12;
const LIGHT = [86, 90, 100], DARK = [70, 74, 84];
const u = enemyUnit('rogue', 0, { x: 19, z: 9.5 }, 'normal');
const look = lookOf(u)!;
const eye = dojutsuToEye(u.character?.dojutsu);
const hurt = [0, 1].map((f) => renderSprite(look, 'hurt', f, eye).rgba);
const out = new Uint8Array(W * N * H * 4);
for (let i = 0; i < N; i++) {
  const spr = hurt[i < 3 ? 0 : 1];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const bg = ((x >> 3) + (y >> 3)) % 2 ? LIGHT : DARK;
      // Facing left: the frame mirrored about the feet, as the battle draws it (renderer.ts blitFrame).
      const sx = FEET.x - 1 + (FX - x), sy = FEET.y + (y - FY);
      const s = sx >= 0 && sx < GRID && sy >= 0 && sy < GRID ? (sy * GRID + sx) * 4 : -1;
      const a = s < 0 ? 0 : spr[s + 3] / 255;
      const o = (y * W * N + i * W + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round((s < 0 ? 0 : spr[s + c]) * a + bg[c] * (1 - a));
      out[o + 3] = 255;
    }
}
writePng(process.argv[2], W * N, H, out);
