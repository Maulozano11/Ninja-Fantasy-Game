import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const buf = readFileSync(process.argv[2]);
let p = 8, w, h, idat = [], ct;
while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); p += 12 + len; }
console.log('ct', ct, w, h);
const bpp = ct === 6 ? 4 : ct === 3 ? 1 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp;
const rows = []; let prev = Buffer.alloc(stride);
for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
  for (let i = 0; i < stride; i++) { const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
    if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } line[i] = v & 255; }
  rows.push(line); prev = line; }
// run lengths along row 600
const runs = []; let last = null, run = 0;
for (let x = 0; x < w; x++) { const k = rows[600].subarray(x * bpp, x * bpp + Math.min(3, bpp)).join(','); if (k === last) run++; else { if (last) runs.push(run); last = k; run = 1; } }
console.log(runs.slice(0, 80).join(' '));
