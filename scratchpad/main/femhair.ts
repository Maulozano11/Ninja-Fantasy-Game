// Female hairstyles on female heads: femhair.ts out.png id1 id2 ...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...ids] = process.argv.slice(2);
const COLS: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['female', 'attack', 1]];
const CW = 44, CH = 56, k = 5;
const W = COLS.length * (CW + 2) * k * 1, H = ids.length * (CH + 2) * k;
const cols = Math.ceil(ids.length / 1);
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
ids.forEach((id, r) => COLS.forEach(([body, pose, fr], c) => {
  const def = getItem(id)!;
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', eyeShape: 'bright', eyeColor: '#7a4a2a', slots: { hair: { id, colors: def.colors.map((cc) => cc.default) }, top: { id: 'top_highcollar', colors: ['#2c3448'] } } } as any), pose as any, fr);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 24;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((r * (CH + 2) * k + y * k + j) * W + c * (CW + 2) * k + x * k + q) * 4); }
}));
writePng(out, W, H, o);
