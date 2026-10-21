import { readFileSync } from 'node:fs';
import { writePng } from '../tools/sheet';
const [rawPath, out, x0s, y0s, ws, hs, scs] = process.argv.slice(2);
const raw = readFileSync(rawPath);
const sw = raw.readUInt16LE(0), sh = raw.readUInt16LE(2);
const px = raw.subarray(4);
const x0 = +x0s, y0 = +y0s, w = +ws, h = +hs, sc = +scs;
const buf = new Uint8Array(w * sc * h * sc * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const sx = x + x0, sy = y + y0; let r = 236, g = 236, b = 240;
  if (sx < sw && sy < sh) { const k = (sy * sw + sx) * 3; r = px[k]; g = px[k+1]; b = px[k+2]; }
  for (let j = 0; j < sc; j++) for (let i = 0; i < sc; i++) { const o = ((y * sc + j) * w * sc + x * sc + i) * 4; buf[o] = r; buf[o+1] = g; buf[o+2] = b; buf[o+3] = 255; }
}
writePng(out, w * sc, h * sc, buf);
