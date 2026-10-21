// Feet close-up: reference feet next to ours (3 bodies), plus full bodies.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook, writePng } from '../tools/sheet';
function readPng(path: string) {
  const buf = readFileSync(path); let off = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8); const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); off += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); const out = new Uint8Array(w * h * 4); const stride = w * 4;
  for (let y = 0; y < h; y++) { const ft = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x];
    const a = x >= 4 ? out[y * stride + x - 4] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
    let p = 0; if (ft === 1) p = a; else if (ft === 2) p = b; else if (ft === 3) p = (a + b) >> 1; else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    out[y * stride + x] = (v + p) & 255; } }
  return { w, h, rgba: out };
}
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const feetItem = process.argv[3] || '';
const pose = (process.argv[4] || 'idle') as any;
type Img = { w: number; h: number; px: (x: number, y: number) => number[] | null };
const crops: Img[] = [];
const CW = 40, CH = 20;
crops.push({ w: CW, h: CH, px: (x, y) => { const X = 20 + x, Y = 99 - CH + y; if (X >= ref.w || Y < 0 || Y >= ref.h) return null; const i = (Y * ref.w + X) * 4; return ref.rgba[i + 3] ? [...ref.rgba.subarray(i, i + 3)] : null; } });
const looks: any[] = [];
for (const body of ['male', 'female', 'bulky']) {
  const slots: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] } };
  if (feetItem) slots.feet = { id: feetItem, colors: [] };
  looks.push(baseLook({ body, skin: '#e8a882', slots } as any));
}
looks.push(LEGENDARY_PRESETS[0].character.appearance);
for (const look of looks) {
  const f = renderSprite(look, pose, pose === 'attack' ? 1 : 0);
  const x0 = Math.round(f.rig.ankleN.x * 2) - 12;
  crops.push({ w: CW, h: CH, px: (x, y) => { const X = x0 + x, Y = 127 - CH + y; const i = (Y * GRID + X) * 4; return f.rgba[i + 3] ? [...f.rgba.subarray(i, i + 3)] : null; } });
}
const k = 10, gap = 2;
const W = crops.length * (CW + gap) * k, H = CH * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
crops.forEach((c, n) => { const ox = n * (CW + gap) * k;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const p = c.px(x, y); const col = p || ((x + y) % 2 ? [228, 228, 234] : [240, 240, 244]);
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) out.set([...col, 255], ((y * k + j) * W + ox + x * k + q) * 4); } });
// full bodies at 3x underneath (skip the ref)
if (0) looks.forEach((look: any, n: number) => {
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) { const i = (y * GRID + x) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) { const X = ox + x * 3 + q, Y = oy + y * 3 + j; if (X < W && Y < H) out.set([...f.rgba.subarray(i, i + 3), 255], (Y * W + X) * 4); } }
  for (let x = 0; x < 128 * 3; x++) { const X = ox + x, Y = oy + 120 * 3; if (X < W) out.set([200, 120, 120, 255], (Y * W + X) * 4); } });
writePng(process.argv[2], W, H, out);
