// usage: tsx trees-crop.ts in.png out.png x y w h scale
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
function readPng(p: string): Canvas {
  const b = readFileSync(p); let o = 8; let w = 0, h = 0; const idat: Buffer[] = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const type = b.toString('ascii', o + 4, o + 8); const d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } else if (type === 'IDAT') idat.push(d); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); const c = new Canvas(w, h); const bpp = 4; const stride = w * 4;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)]; const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? line[i - bpp] : 0, up = prev[i], c2 = i >= bpp ? prev[i - bpp] : 0;
      if (f === 1) line[i] = (line[i] + a) & 255; else if (f === 2) line[i] = (line[i] + up) & 255; else if (f === 3) line[i] = (line[i] + ((a + up) >> 1)) & 255;
      else if (f === 4) { const p = a + up - c2, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c2); line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c2)) & 255; } }
    c.px.set(line, y * stride); prev = line; }
  return c;
}
const [inp, out, xs, ys, ws, hs, ks, bg] = process.argv.slice(2);
const src = readPng(inp); const x = +xs, y = +ys, w = +ws, h = +hs, k = +ks;
const c = new Canvas(w, h);
if (bg) c.fillRect(0, 0, w, h, [93, 107, 87, 255]);
c.draw(src, -x, -y); c.scaled(k).save(out);
