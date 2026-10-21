// Zoomed heads of candidate hair (cands json) on the male body: headzoom.ts cands.json out.png id...
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { hairTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hairkit';
import { baseLook, writePng } from '../shared/sheet';
const [file, out, ...ids] = process.argv.slice(2);
const cands = JSON.parse(readFileSync(file, 'utf8'));
const host = getItem('hair_crop')!;
const k = 10, CW = 52, CH = 50;
const W = ids.length * (CW * k + 8), H = CH * k;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
ids.forEach((id, n) => {
  const c = cands[id];
  (host as any).draw = (g: any, [col]: string[]) => hairTemplate(g, g.L('hairFront'), c.f, c.fa[0], c.fa[1], g.m(col, 'hair'));
  const f = renderSprite(baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_crop', colors: [c.color] }, top: { id: 'top_tee', colors: ['#2c3448'] } } } as any), 'idle', 0);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 32;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW * k + 8) + x * k + q) * 4); }
});
writePng(out, W, H, o);
