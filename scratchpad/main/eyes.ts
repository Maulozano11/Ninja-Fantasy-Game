// Eye shapes close-up: rows = bodies, cols = eye shapes. eyes.ts out.png shape1 shape2 ...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...shapes] = process.argv.slice(2);
const BODIES = (process.env.B || 'male,female,bulky').split(',');
const CW = 24, CH = 16, k = +(process.env.K || 10);
const W = shapes.length * (CW + 2) * k, H = BODIES.length * (CH + 2) * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
BODIES.forEach((body, r) => shapes.forEach((eyeShape, c) => {
  const f = renderSprite(baseLook({ body, eyeShape, eyeColor: process.env.EC || '#3b82f6', skin: '#f3c39c', slots: { hair: { id: process.env.HAIR || 'hair_crop', colors: ['#3a2a22'] } } } as any), 'idle', 0);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 5;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((r * (CH + 2) * k + y * k + j) * W + c * (CW + 2) * k + x * k + q) * 4); }
}));
writePng(out, W, H, o);
