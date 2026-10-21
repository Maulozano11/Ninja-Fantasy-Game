// Close-up of the hips/crotch: crotch.ts out.png 'json-slots' ... (bodies via B env)
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...cells] = process.argv.slice(2);
const bodies = (process.env.B || 'male,female,slender').split(',');
const k = +(process.env.K || 7), CW = 40, CH = 34;
const W = cells.length * bodies.length * (CW * k + 8), H = CH * k;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
let n = 0;
for (const cell of cells) for (const body of bodies) {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: JSON.parse(cell) } as any), (process.env.P || 'idle') as any, 0);
  const x0 = Math.round(f.rig.pelvis.x * 2) - CW / 2, y0 = Math.round(f.rig.pelvis.y * 2) - 6;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW * k + 8) + x * k + q) * 4); }
  n++;
}
writePng(out, W, H, o);
