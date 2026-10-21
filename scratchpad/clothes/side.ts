// side-by-side of two raw images (w,h u16 + rgb) at a scale, bottom aligned
import { readFileSync } from 'node:fs';
import { writePng } from '../tools/sheet';
const [a, b, out, scs] = process.argv.slice(2);
const sc = +(scs || 6);
const load = (p: string) => { const r = readFileSync(p); return { w: r.readUInt16LE(0), h: r.readUInt16LE(2), px: r.subarray(4) }; };
const A = load(a), B = load(b);
const gap = 6, W = (A.w + B.w + gap) * sc, H = Math.max(A.h, B.h) * sc;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i*4] = 236; buf[i*4+1] = 236; buf[i*4+2] = 240; buf[i*4+3] = 255; }
const put = (img: any, ox: number) => {
  const oy = Math.max(A.h, B.h) - img.h;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const k = (y * img.w + x) * 3;
    for (let j = 0; j < sc; j++) for (let i = 0; i < sc; i++) { const o = (((y + oy) * sc + j) * W + (x + ox) * sc + i) * 4; buf[o] = img.px[k]; buf[o+1] = img.px[k+1]; buf[o+2] = img.px[k+2]; } }
};
put(A, 0); put(B, A.w + gap);
writePng(out, W, H, buf);
