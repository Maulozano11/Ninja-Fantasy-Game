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
const r = readPng('docs/reference/reference-sprite.png');
const [x0, y0, cw, ch] = process.argv.slice(2).map(Number);
const map = new Map<string, string>(); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const lines: string[] = [];
for (let y = 0; y < ch; y++) { let s = ''; for (let x = 0; x < cw; x++) { const i = ((y0 + y) * r.w + x0 + x) * 4; if (!r.rgba[i + 3]) { s += '.'; continue; }
  const hex = [0, 1, 2].map((k) => r.rgba[i + k].toString(16).padStart(2, '0')).join(''); if (!map.has(hex)) map.set(hex, chars[map.size]); s += map.get(hex); } lines.push(s); }
console.log(lines.join('\n'));
for (const [h, c] of map) console.log(c, '#' + h);
