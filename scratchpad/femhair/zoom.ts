// zoom.ts out.png id[:color] ... : female head crops at 7x (one row), for close comparison
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...specs] = process.argv.slice(2);
const body = process.env.BODY || 'female';
const pose = process.env.POSE || 'idle';
const CW = 46, CH = Number(process.env.CH || 50), k = Number(process.env.K || 7);
const W = specs.length * (CW + 2) * k, H = CH * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
specs.forEach((s, n) => {
  const [id, col] = s.split(':');
  const def = getItem(id)!;
  const colors = def.colors.map((c) => c.default);
  if (col) colors[0] = col;
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', eyeShape: 'bright', eyeColor: '#7a4a2a', slots: { hair: { id, colors }, top: { id: 'top_highcollar', colors: ['#2c3448'] } } } as any), pose as any, pose === 'attack' ? 1 : 0);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 26;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW + 2) * k + x * k + q) * 4); }
});
writePng(out, W, H, o);
