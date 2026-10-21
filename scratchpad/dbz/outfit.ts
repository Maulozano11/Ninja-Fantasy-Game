// Full-body renders of outfits: outfit.ts out.png 'label|json-slots' ...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...cells] = process.argv.slice(2);
const k = +(process.env.K || 3), CW = 84, CH = 112;
const poses = (process.env.POSES || 'idle:0').split(',').map((p) => p.split(':'));
const bodies = (process.env.B || 'male').split(',');
const W = cells.length * poses.length * bodies.length * (CW * k + 6), H = CH * k + 6;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
let n = 0;
for (const cell of cells) {
  const slots = JSON.parse(cell); const accessories = slots._acc || []; delete slots._acc;
  for (const body of bodies) for (const [pose, fr] of poses) {
    const f = renderSprite(baseLook({ body, skin: "#f3c39c", slots, accessories } as any), pose as any, +fr);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = 22 + x, sy = 14 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
      for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((3 + y * k + j) * W + n * (CW * k + 6) + 3 + x * k + q) * 4); }
    n++;
  }
}
writePng(out, W, H, o);
