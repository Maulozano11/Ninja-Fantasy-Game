// Grimoire pose variants: try.ts out.png 'JSON frames per variant' (POSES.castBook overridden per cell)
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { v } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../shared/sheet';
const [out, variantsJson, body = 'male'] = process.argv.slice(2);
const variants: any[] = JSON.parse(variantsJson);
const k = +(process.env.K || 5), CW = 84, CH = 96, X0 = 22, Y0 = 14;
const bodies = body.split(',');
const W = variants.length * (CW * k + 6), H = bodies.length * (CH * k + 6);
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([30, 33, 44, 255], i * 4);
const arm = (x: number, y: number) => ({ from: 'shoulder', x, y, units: 'arm' });
const chest = (x: number, y: number) => ({ from: 'chest', x, y, units: 'design' });
const orig = POSES.castBook.map((f) => ({ ...f }));
bodies.forEach((b, row) => variants.forEach((vv, n) => {
  const fr = vv.fr ?? 0;
  const base = { ...orig[fr] } as any;
  for (const [key, val] of Object.entries(vv)) {
    if (key === 'fr') continue;
    if (key === 'handN' || key === 'handF') base[key] = (val as any)[0] === 'c' ? chest((val as any)[1], (val as any)[2]) : arm((val as any)[1], (val as any)[2]);
    else if (key === 'footN' || key === 'footF') base[key] = v((val as any)[0], (val as any)[1]);
    else base[key] = val;
  }
  (POSES as any).castBook = [base, base];
  const look = baseLook({ body: b, skin: '#f3c39c', cast: { style: 'book' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
    slots: { hair: { id: 'hair_drifter', colors: [] }, top: { id: 'top_bomber', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, held: { id: 'held_katana', colors: [] } } } as any);
  const f = renderSprite(look, 'cast', fr);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((row * (CH * k + 6) + y * k + j) * W + n * (CW * k + 6) + x * k + q) * 4); }
  if (process.env.MARK) for (const [p, c] of [[f.rig.elbowN, [255, 220, 0]], [f.rig.wristN, [0, 255, 0]], [f.rig.handN, [0, 255, 255]], [f.rig.shoulderN, [255, 0, 0]]] as const) {
    const cx = Math.round((p.x * 2 - X0) * k), cy = Math.round((p.y * 2 - Y0) * k);
    for (let j = -2; j <= 2; j++) for (let q = -2; q <= 2; q++) { const X = n * (CW * k + 6) + cx + q, Y = row * (CH * k + 6) + cy + j; if (X >= 0 && Y >= 0 && X < W && Y < H) o.set([...c, 255], (Y * W + X) * 4); }
  }
}));
writePng(out, W, H, o);
