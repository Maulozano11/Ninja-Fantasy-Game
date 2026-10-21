import { underSmoke } from './under-timed';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
// load a frame png (RGBA 8-bit, filter-aware) as a Canvas mask source
function loadPng(p: string): Canvas {
  const b = readFileSync(p);
  let off = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const c = new Canvas(w, h); const bpp = 4, stride = w * 4;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], ul = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; }
      cur[i] = v & 255;
    }
    c.px.set(cur, y * stride); prev = cur;
  }
  return c;
}
const fg = loadPng(process.argv[2]);
const t0 = Date.now();
for (let k = 0; k < 3; k++) underSmoke(fg, fg, null, { t: 0, k: 1, x0: 175, x1: 945, yTop: 400, xHead: 850, yHead: 478, yBottom: 790, seed: 2200, close: 22 });
console.log('underSmoke ms/frame', (Date.now() - t0) / 3);
