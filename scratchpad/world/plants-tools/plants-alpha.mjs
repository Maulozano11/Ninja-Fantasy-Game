import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const [path, fw, fh, r0, r1, c0, c1] = process.argv.slice(2).map((v, i) => (i ? Number(v) : v));
const buf = readFileSync(path);
let p = 8, w, h, idat = [];
while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } else if (type === 'IDAT') idat.push(d); p += 12 + len; }
const bpp = 4, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp; const rows = []; let prev = Buffer.alloc(stride);
for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
  for (let i = 0; i < stride; i++) { const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
    if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } line[i] = v & 255; }
  rows.push(line); prev = line; }
for (let y = r0; y <= r1; y++) { let s = String(y).padStart(3) + ' '; for (let x = c0; x <= c1; x++) { const a = rows[y][x * 4 + 3], g = rows[y][x * 4 + 1]; s += a === 0 ? '.' : a < 200 ? '+' : g < 50 ? '#' : 'o'; } console.log(s); }
