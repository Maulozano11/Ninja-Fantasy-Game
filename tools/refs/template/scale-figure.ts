// Renders the scale figure for the sheet template: the default legend (Solen) at idle, 1x game
// pixels, trimmed. Written once to tools/refs/template/scale-figure.png; make-template.py scales
// it by the sheet's factor into cell 0 so a sheet's author (or image generator) sees our size.
//
//     npx tsx tools/refs/template/scale-figure.ts
import { join } from 'node:path';
import { LEGENDARY_PRESETS } from '../../../src/data/shinobiData';
import { renderSprite } from '../../../src/sprite/compose';
import { dojutsuToEye } from '../../../src/sprite/legacy';
import { GRID } from '../../../src/sprite/raster';
import { Canvas } from '../../world-sprites/kit';

const c = LEGENDARY_PRESETS[0].character;
const f = renderSprite(c.appearance!, 'idle', 0, dojutsuToEye(c.dojutsu));
let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const out = new Canvas(w, h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const s = ((y + y0) * GRID + (x + x0)) * 4;
  out.px.set(f.rgba.subarray(s, s + 4), (y * w + x) * 4);
}
out.save(join(import.meta.dirname, 'scale-figure.png'));
console.log(`scale-figure.png ${w}x${h} (${c.name})`);
