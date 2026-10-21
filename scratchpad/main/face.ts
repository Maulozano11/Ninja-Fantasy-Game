import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
// dumps a 40x40 head crop (raw RGB) for several looks
const looks: any[] = [
  baseLook({ skin: '#f3c39c', eyeColor: '#2f7fe0', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_royalcoat', colors: [] } } } as any),
  baseLook({ skin: '#f3c39c', eyeColor: '#2f7fe0', slots: { top: { id: 'top_tee', colors: [] } } } as any),
  baseLook({ body: 'female', skin: '#f8d3b6', eyeColor: '#7c3aed', slots: { hair: { id: 'hair_long', colors: [] }, top: { id: 'top_tee', colors: [] } } } as any),
  baseLook({ body: 'bulky', skin: '#c98c5f', eyeColor: '#22c55e', slots: { hair: { id: 'hair_crop', colors: [] }, top: { id: 'top_tee', colors: [] } } } as any),
];
const C = 40;
const out = Buffer.alloc(looks.length * C * C * 3);
looks.forEach((look, n) => {
  const f = renderSprite(look, 'idle', 0);
  const x0 = f.rig.head.x * RES - C / 2, y0 = f.rig.head.y * RES - C / 2 - 2;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = ((y0 + y) * GRID + x0 + x) * 4; const o = (n * C * C + y * C + x) * 3;
    const a = f.rgba[i + 3];
    out[o] = a ? f.rgba[i] : 236; out[o + 1] = a ? f.rgba[i + 1] : 236; out[o + 2] = a ? f.rgba[i + 2] : 240;
  }
});
writeFileSync(process.argv[2], out);
