// Audit: per sprite/frame counts isolated pixels (no 4-neighbour of the same colour) and checks
// one size/anchor per sprite; writes a map with isolated pixels marked magenta.
import { Canvas, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
export function readPng(path: string): Canvas {
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
const D = process.argv[2];
const man = JSON.parse(readFileSync('/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks/manifest.json', 'utf8'));
const lum = (c: number[]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
for (const [name, s] of Object.entries<any>(man.sprites)) {
  const sheet = readPng(`/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks/${name}.png`);
  const out: string[] = [];
  const maps: Canvas[] = [];
  for (const [an, a] of Object.entries<any>(s.anims)) {
    for (let k = 0; k < a.frames; k++) {
      const fr = new Canvas(s.frameW, s.frameH);
      fr.draw(sheet, -k * s.frameW, -a.row * s.frameH);
      let iso = 0, total = 0, bright = 0;
      const map = fr.clone();
      for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
        const c = fr.get(x, y); if (!c[3]) continue; total++;
        if (lum(c) > 150) bright++;
        const same = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => { const d = fr.get(x+dx,y+dy); return d[3] && d[0]===c[0] && d[1]===c[1] && d[2]===c[2]; });
        if (!same) { iso++; map.set(x, y, [255, 0, 255, 255]); }
      }
      const b = fr.bounds();
      out.push(`${an}[${k}] iso ${iso}/${total} (${(100*iso/total).toFixed(1)}%) bounds ${b} `);
      if (k === 0) maps.push(map);
    }
  }
  console.log(name, s.frameW + 'x' + s.frameH, 'anchor', s.anchor, 'tags', s.tags.join(','));
  for (const l of out) console.log('   ', l);
  const W = maps.reduce((t, m) => t + m.w + 2, 0), H = Math.max(...maps.map((m) => m.h));
  const all = new Canvas(W, H); all.fillRect(0, 0, W, H, hex('#5d6b57'));
  let x = 0; for (const m of maps) { all.draw(m, x, 0); x += m.w + 2; }
  all.scaled(5).save(`${D}/landmarks-audit-${name}.png`);
}
