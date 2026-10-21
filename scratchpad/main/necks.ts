// Slim vs strong neck: rows = bodies, cols = [slim, strong] x hair ids
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...ids] = process.argv.slice(2);
const BODIES = ['male', 'female', 'bulky'];
const CW = 30, CH = 32, k = 8;
const cols: [string, string][] = [];
for (const id of ids) for (const n of ['slim', 'strong']) cols.push([id, n]);
const W = cols.length * (CW + 2) * k, H = BODIES.length * (CH + 2) * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
const HC: Record<string, string> = { hair_scholar: '#7a3f1d', hair_crop: '#3a2a22', hair_none: '#222', hair_crest: '#7a4524' };
BODIES.forEach((body, r) => cols.forEach(([id, neck], c) => {
  const f = renderSprite(baseLook({ body, neck, skin: '#f3c39c', slots: { hair: { id, colors: [HC[id] || '#553322'] }, top: { id: 'top_tee', colors: ['#3a4660'] } } } as any), 'idle', 0);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 14;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((r * (CH + 2) * k + y * k + j) * W + c * (CW + 2) * k + x * k + q) * 4); }
}));
writePng(out, W, H, o);
