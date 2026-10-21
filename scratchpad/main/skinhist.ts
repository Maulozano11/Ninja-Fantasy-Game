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
const hist = new Map<string, number>();
for (let i = 0; i < r.w * r.h; i++) { const R = r.rgba[i * 4], G = r.rgba[i * 4 + 1], B = r.rgba[i * 4 + 2]; if (!r.rgba[i * 4 + 3] || !(R > G + 30 && R > B + 30)) continue;
  const q = (v: number) => Math.round(v / 24) * 24; const k = [q(R), q(G), q(B)].join(','); hist.set(k, (hist.get(k) || 0) + 1); }
[...hist].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, n]) => { const [R, G, B] = k.split(',').map(Number); const [h, s, l] = rgbToHsl(R, G, B); console.log(k.padEnd(12), String(n).padStart(4), 'h', Math.round(h), 's', s.toFixed(2), 'l', l.toFixed(2)); });
