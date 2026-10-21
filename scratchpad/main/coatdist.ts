// Shade distribution of a hue family in a region of the reference vs of our render.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { rgbToHsl } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
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
const r = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
// blue coat pixels: hue 200-230, sat > .25
const ls: number[] = [];
for (let y = 30; y < 92; y++) for (let x = 20; x < 60; x++) { const i = (y * r.w + x) * 4; if (!r.rgba[i + 3]) continue; const [h, s, l] = rgbToHsl(r.rgba[i], r.rgba[i + 1], r.rgba[i + 2]); if (h >= 195 && h <= 235 && s > 0.2 && l > 0.08 && l < 0.5) ls.push(l); }
ls.sort((a, b) => a - b);
const q = (p: number) => ls[Math.floor(p * (ls.length - 1))].toFixed(3);
console.log('coat px', ls.length, 'quantiles 10/25/50/75/90:', q(0.1), q(0.25), q(0.5), q(0.75), q(0.9));
const bins = new Map<string, number>(); for (const l of ls) { const k = (Math.round(l * 50) / 50).toFixed(2); bins.set(k, (bins.get(k) || 0) + 1); }
console.log([...bins].sort().map(([k, n]) => `${k}:${n}`).join(' '));
