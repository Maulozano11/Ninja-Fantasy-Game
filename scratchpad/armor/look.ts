// Armor previews: look.ts out.png armorId bodies poses [hairId hairColor] ; poses like idle:0,attack:1,cast:0
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { baseLook, writePng } from '../shared/sheet';
const [out, armor, bodies = 'female,slender', poses = 'idle:0', hair = 'hair_ribbon', hairColor = '#c87642'] = process.argv.slice(2);
const k = +(process.env.K || 4), CW = 92, CH = 112, X0 = 18, Y0 = 12;
const cells: [string, string, number][] = [];
for (const b of bodies.split(',')) for (const p of poses.split(',')) { const [pose, fr] = p.split(':'); cells.push([b, pose, +fr]); }
const cols = +(process.env.COLS || cells.length);
const rowsN = Math.ceil(cells.length / cols);
const W = cols * (CW * k + 6), H = rowsN * (CH * k + 6);
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
const def = getItem(armor)!;
cells.forEach(([body, pose, fr], n) => {
  const slots: any = { hair: { id: hair, colors: [hairColor, '#c8202c'] }, armor: { id: armor, colors: def.colors.map((c) => c.default) }, feet: { id: process.env.FEET || 'feet_leather', colors: process.env.FEETC ? process.env.FEETC.split(',') : [] } };
  if (process.env.BOTTOM) slots.bottom = { id: process.env.BOTTOM, colors: [] };
  if (process.env.TOP) slots.top = { id: process.env.TOP, colors: [] };
  const look = baseLook({ body, skin: '#f3c39c', eyeShape: 'bright', eyeColor: process.env.EYE || '#8a5a2a', slots } as any);
  const f = renderSprite(look, pose as any, fr);
  const cx = (n % cols) * (CW * k + 6), cy = Math.floor(n / cols) * (CH * k + 6);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((cy + y * k + j) * W + cx + x * k + q) * 4); }
});
writePng(out, W, H, o);
