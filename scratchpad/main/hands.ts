import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
const pose = (process.argv[3] || 'idle') as any;
const look = baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] } } } as any);
const f = renderSprite(look, pose, +(process.argv[4] || 0));
const C = 22;
const crops = [f.rig.handN, f.rig.handF].map((h, n) => [Math.round(h.x * RES) - C / 2 + (n ? 3 : 0), Math.round(h.y * RES) - C / 2]);
const out = Buffer.alloc(2 * C * C * 3);
crops.forEach(([x0, y0], n) => {
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = ((y0 + y) * GRID + x0 + x) * 4; const o = (n * C * C + y * C + x) * 3; const a = f.rgba[i + 3];
    out[o] = a ? f.rgba[i] : 236; out[o + 1] = a ? f.rgba[i + 1] : 236; out[o + 2] = a ? f.rgba[i + 2] : 240;
  }
});
writeFileSync(process.argv[2], out);
