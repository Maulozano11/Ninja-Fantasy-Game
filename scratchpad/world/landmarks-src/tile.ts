// Tiles a fence sprite 3x side by side at a 2 m stride (both rows) to check the seams.
import { Canvas, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
function readPng(path: string): Canvas {
  const b = readFileSync(path);
  let o = 8; let w = 0, h = 0; const idat: Buffer[] = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const type = b.toString('ascii', o + 4, o + 8); const data = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); const c = new Canvas(w, h); const bpp = 4; const stride = w * bpp; let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)]; const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? line[x - bpp] : 0, up = prev[x], c2 = x >= bpp ? prev[x - bpp] : 0;
      if (f === 1) line[x] = (line[x] + a) & 255; else if (f === 2) line[x] = (line[x] + up) & 255; else if (f === 3) line[x] = (line[x] + ((a + up) >> 1)) & 255;
      else if (f === 4) { const p = a + up - c2, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c2); line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c2)) & 255; } }
    for (let x = 0; x < w; x++) c.set(x, y, [line[x * 4], line[x * 4 + 1], line[x * 4 + 2], line[x * 4 + 3]]); prev = line; }
  return c;
}
const [name, out] = [process.argv[2], process.argv[3]];
const m = JSON.parse(readFileSync('/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks/manifest.json', 'utf8')).sprites[name];
const sheet = readPng(`/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks/${name}.png`);
const rows = Object.keys(m.anims).length;
const stride = 114;
const out2 = new Canvas(m.frameW + stride * 3 + 20, (m.frameH + 6) * rows);
out2.fillRect(0, 0, out2.w, out2.h, hex('#5d6b57'));
for (let r = 0; r < rows; r++) for (let k = 0; k < 4; k++) {
  const fr = new Canvas(m.frameW, m.frameH);
  fr.draw(sheet, 0, -r * m.frameH);
  // use idle row for tiles except the second tile in the broken row
  const src = new Canvas(m.frameW, m.frameH); const rr = (r === 1 && k !== 1) ? 0 : r; src.draw(sheet, 0, -rr * m.frameH);
  out2.draw(src, 10 + k * stride, r * (m.frameH + 6));
}
out2.scaled(4).save(out);
