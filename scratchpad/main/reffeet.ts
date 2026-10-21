import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { writePng } from '../tools/sheet';
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
const r = readPng('docs/reference/reference-sprite.png');
console.log(r.w, r.h);
const [x0, y0, cw, ch, k] = process.argv.slice(3).map(Number);
const W = cw * k, H = ch * k; const out = new Uint8Array(W * H * 4);
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = ((y0 + y) * r.w + x0 + x) * 4; const a = r.rgba[i + 3];
  for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) { const o = ((y * k + j) * W + x * k + q) * 4; const grid = (j === 0 || q === 0) ? 0.9 : 1;
    out.set(a ? [r.rgba[i] * grid, r.rgba[i + 1] * grid, r.rgba[i + 2] * grid, 255] : [236 * grid, 236 * grid, 240 * grid, 255], o); } }
writePng(process.argv[2], W, H, out);
// also dump chars by luminance
const pal: string[] = [];
for (let y = 0; y < ch; y++) { let s = ''; for (let x = 0; x < cw; x++) { const i = ((y0 + y) * r.w + x0 + x) * 4; if (!r.rgba[i + 3]) { s += '.'; continue; }
  const L = (r.rgba[i] * 0.3 + r.rgba[i + 1] * 0.59 + r.rgba[i + 2] * 0.11) | 0; s += L < 40 ? '0' : L < 75 ? '1' : L < 110 ? '2' : L < 150 ? '3' : L < 190 ? '4' : '5'; } pal.push(s); }
console.log(pal.join('\n'));
