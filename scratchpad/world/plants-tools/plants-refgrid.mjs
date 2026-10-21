import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
function decode(path) {
  const buf = readFileSync(path);
  let p = 8, w, h, ct, idat = [], plte = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8) throw 'bitdepth ' + data[8]; }
    else if (type === 'PLTE') plte = data;
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 3: 1, 0: 1, 4: 2 }[ct];
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4), stride = w * bpp;
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
      let r, g, bb, al = 255;
      if (ct === 6) [r, g, bb, al] = line.subarray(x * 4, x * 4 + 4);
      else if (ct === 2) [r, g, bb] = line.subarray(x * 3, x * 3 + 3);
      else if (ct === 3) { const k = line[x]; [r, g, bb] = plte.subarray(k * 3, k * 3 + 3); }
      else { r = g = bb = line[x * bpp]; }
      out.set([r, g, bb, al], (y * w + x) * 4);
    }
    prev = line;
  }
  return { w, h, px: out };
}
const [path, cellArg, offArg] = process.argv.slice(2);
const img = decode(path);
console.log('size', img.w, img.h);
const cell = Number(cellArg || 18), off = Number(offArg || 0);
const pal = ['#172621','#1d2d28','#21362f','#224c3a','#265540','#295b42','#2c5f45','#326747','#3d7249','#417848','#467d4a','#4d854b','#578e4d','#60954f'].map(h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const chars = '0123456789ABCD';
const counts = {};
for (let y = off + cell / 2; y < img.h; y += cell) {
  let row = '';
  for (let x = off + cell / 2; x < img.w; x += cell) {
    const i = (Math.floor(y) * img.w + Math.floor(x)) * 4;
    const [r, g, b] = img.px.subarray(i, i + 3);
    if (r > 200 && g > 200 && b > 200) { row += '.'; continue; }
    if (r > 180 && g < 80) { row += ' '; continue; }
    let best = 0, bd = 1e9;
    pal.forEach((c, k) => { const d = (c[0]-r)**2 + (c[1]-g)**2 + (c[2]-b)**2; if (d < bd) { bd = d; best = k; } });
    row += chars[best];
    counts[best] = (counts[best] || 0) + 1;
  }
  console.log(row);
}
console.log(counts);
