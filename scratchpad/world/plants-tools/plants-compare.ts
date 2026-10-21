// Review sheet: the owner's reference bush (sampled back to 1x) next to the first frame of chosen
// plant sprites, all at the same zoom on the preview background.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';

function decode(path: string): { w: number; h: number; px: Uint8Array } {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, ct = 0;
  const idat: Buffer[] = [];
  let plte: Buffer | null = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (type === 'PLTE') plte = d;
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 3 ? 1 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp;
  const out = new Uint8Array(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      let r: number, g: number, bb: number, al = 255;
      if (ct === 6) [r, g, bb, al] = line.subarray(x * 4, x * 4 + 4);
      else if (ct === 3) { const k = line[x]; [r, g, bb] = plte!.subarray(k * 3, k * 3 + 3); }
      else [r, g, bb] = line.subarray(x * 3, x * 3 + 3);
      out.set([r, g, bb, al], (y * w + x) * 4);
    }
    prev = line;
  }
  return { w, h, px: out };
}

const dir = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world';
const ref = decode(`${dir}/REF-bush-owner.png`);
const R = new Canvas(64, 64);
for (let y = 0; y < 64; y++)
  for (let x = 0; x < 64; x++) {
    const sx = 16 + x * 18 + 9, sy = 16 + y * 18 + 9;
    if (sx >= ref.w || sy >= ref.h) continue;
    const i = (sy * ref.w + sx) * 4;
    const [r, g, b] = ref.px.subarray(i, i + 3);
    if (r > 200 && g > 200 && b > 200) continue;
    if (r > 180 && g < 80) continue;
    R.set(x, y, [r, g, b, 255]);
  }
const man = JSON.parse(readFileSync('/home/user/Ninja-Fantasy-Game/src/assets/world/plants/manifest.json', 'utf8'));
const names = process.argv.slice(2);
const items: Canvas[] = [];
const rb = R.bounds()!;
const rc = new Canvas(rb[2] - rb[0] + 3, rb[3] - rb[1] + 3);
rc.draw(R, -rb[0] + 1, -rb[1] + 1);
items.push(rc);
for (const n of names) {
  const [name, frame = '0', row = '0'] = n.split(':');
  const s = man.sprites[name];
  const sheet = decode(`/home/user/Ninja-Fantasy-Game/src/assets/world/plants/${s.file}`);
  const c = new Canvas(s.frameW, s.frameH);
  for (let y = 0; y < s.frameH; y++)
    for (let x = 0; x < s.frameW; x++) {
      const i = (((Number(row) * s.frameH + y) * sheet.w) + Number(frame) * s.frameW + x) * 4;
      c.set(x, y, [sheet.px[i], sheet.px[i + 1], sheet.px[i + 2], sheet.px[i + 3]]);
    }
  items.push(c);
}
const FOL = ['#172621', '#21362f', '#224c3a', '#295b42', '#326747', '#417848', '#4d854b', '#60954f'];
for (const c of items) {
  const hist = new Array(9).fill(0);
  let tot = 0;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (p[3] < 200) continue;
      const h = '#' + [p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      let k = FOL.indexOf(h);
      if (k < 0 && Math.abs(p[0] - p[1]) < 60 && p[1] > p[2] - 20) {
        let bd = 1e9;
        FOL.forEach((f, i) => {
          const r = parseInt(f.slice(1, 3), 16), g = parseInt(f.slice(3, 5), 16), b = parseInt(f.slice(5, 7), 16);
          const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
          if (d < bd) { bd = d; k = i; }
        });
        if (bd > 900) k = -1;
      }
      hist[k < 0 ? 8 : k]++;
      tot++;
    }
  console.log(hist.map((v) => ((v / tot) * 100).toFixed(0).padStart(3)).join(' '), ' (outline, 1..7, other)');
}
const W = items.reduce((t, c) => t + c.w + 4, 4), H = Math.max(...items.map((c) => c.h)) + 8;
const out = new Canvas(W, H);
out.fillRect(0, 0, W, H, [93, 107, 87, 255]);
let x = 4;
for (const c of items) { out.draw(c, x, H - 4 - c.h); x += c.w + 4; }
const k = Number(process.env.K ?? 5);
out.scaled(k).save(`${dir}/plants-compare.png`);
console.log('saved', W * k, H * k);
