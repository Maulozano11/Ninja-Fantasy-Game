// All footwear, feet close-up at k x, next to the reference feet. Optional body + pose args.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../tools/sheet';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
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
const body = process.argv[3] || 'male';
const pose = (process.argv[4] || 'idle') as any;
const items = ['', 'feet_sandals', 'feet_leather', 'feet_shinobi', 'feet_cowboy', 'feet_greaves', 'feet_wraps'];
const CW = 40, CH = 26, k = 9, gap = 2, cols = 3;
type Px = (x: number, y: number) => number[] | null;
const cells: Px[] = [(x, y) => { const X = 16 + x, Y = 98 - CH + 2 + y; if (Y >= ref.h || X >= ref.w) return null; const i = (Y * ref.w + X) * 4; return ref.rgba[i + 3] ? [...ref.rgba.subarray(i, i + 3)] : null; }];
for (const id of items) {
  const slots: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] } };
  if (id) slots.feet = { id, colors: [] };
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose, pose === 'attack' ? 1 : 0);
  const x0 = Math.round(f.rig.ankleN.x * 2) - 12;
  cells.push((x, y) => { const X = x0 + x, Y = 128 - CH + y; if (X < 0 || X >= GRID) return null; const i = (Y * GRID + X) * 4; return f.rgba[i + 3] ? [...f.rgba.subarray(i, i + 3)] : null; });
}
const rows = Math.ceil(cells.length / cols);
const W = cols * (CW + gap) * k, H = rows * (CH + gap) * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
cells.forEach((px, n) => { const ox = (n % cols) * (CW + gap) * k, oy = Math.floor(n / cols) * (CH + gap) * k;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const p = px(x, y) || ((x + y) % 2 ? [226, 226, 232] : [240, 240, 244]);
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) out.set([...p, 255], ((oy + y * k + j) * W + ox + x * k + q) * 4); } });
writePng(process.argv[2], W, H, out);
