// Bare female bodies (no clothes) at zoom: femz.ts out.png [poses]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, poses = 'idle:0,attack:1,walk:0'] = process.argv.slice(2);
const bodies = (process.env.BODIES || 'female,slender,male').split(',');
const k = +(process.env.K || 5), X0 = 26, Y0 = 18, CW = 76, CH = 106;
const ps = poses.split(',').map((p) => p.split(':'));
const W = bodies.length * ps.length * (CW * k + 6), H = CH * k + 6;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([44, 48, 60, 255], i * 4);
let n = 0;
for (const body of bodies) for (const [pose, fr] of ps) {
  const slots: any = { hair: { id: process.env.HAIR || 'hair_crop', colors: ['#3a2a22'] } };
  if (process.env.TOP) slots.top = { id: process.env.TOP, colors: [] };
  if (process.env.BOTTOM) slots.bottom = { id: process.env.BOTTOM, colors: [] };
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose as any, +fr);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((3 + y * k + j) * W + n * (CW * k + 6) + 3 + x * k + q) * 4); }
  n++;
}
writePng(out, W, H, o);
