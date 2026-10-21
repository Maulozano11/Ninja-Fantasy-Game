import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { defaultAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { BodyType, SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(path: string, w: number, h: number, rgba: Uint8Array): void {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

interface Cell { look: SpriteAppearance; pose: SpritePose; frame: number }
// crop: [x0,y0,w,h] in fine px

const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camphands/';
const look = (body: BodyType, extra: Partial<SpriteAppearance> = {}): SpriteAppearance => ({ ...defaultAppearance(), body, ...extra });
const cast = (body: BodyType): SpriteAppearance => ({ ...look(body), cast: { style: 'book' } } as SpriteAppearance);

import { readFileSync } from 'node:fs';
import { POSES, drawRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { v, PARTS } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { makeRamp, hexToRgb } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
const SEAT_HIP = 0.74;
const legs = { hip: SEAT_HIP, footN: v(0.5, SEAT_HIP + 0.12 * 0.5), footF: v(0.47, SEAT_HIP + 0.12 * 0.47) };
const base = { lean: 17, pelvisDx: -8.5, snap: true, ...legs, headDx: 0.5, headDy: 0.5 } as any;
const chest = (x: number, y: number) => ({ from: 'chest', x, y, units: 'px' });
const small = readFileSync(OUT + 'small21.txt', 'utf8').trim().split('\n').map((l) => l.trim().replace(/^'|',$/g, ''));
const PIV = [8, 12];
const cover = makeRamp('#7a3f2c', 'leather');
const paper = makeRamp('#ece2c6', 'cloth');
const gold = makeRamp('#d4a531', 'metal');
const pal: Record<string, string> = { o: cover[0], k: cover[1], d: cover[1], m: cover[2], c: cover[2], C: cover[3], b: cover[4], q: paper[3], p: paper[4], P: paper[5], g: gold[4], G: gold[2] };
const opts: any[] = [
  { ...base, handN: chest(-2.5, 6), bendN: -1, handF: chest(4.5, 0.5), shapeN: 'cradle', shapeF: 'relaxed' },
  { ...base, handN: chest(-1.5, 6), bendN: -1, handF: chest(4.5, 1), shapeN: 'cradle', shapeF: 'relaxed' },
  { ...base, handN: chest(-1.5, 6), bendN: -1, handF: chest(4.5, 1), shapeN: 'cradle', shapeF: 'fist' },
];
const S = 5, CW = 70, CH = 64, CX = 14, CY = 40;
const all: Uint8Array[] = [];
const W = 2 * (CW + 2) * S, H = opts.length * (CH + 2) * S;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([60, 60, 70, 255], i * 4);
opts.forEach((o, row) => {
  (POSES as any).sit = [o];
  (['male', 'female'] as BodyType[]).forEach((body, col) => {
    const spr = renderSprite(look(body), 'sit', 0);
    const r = drawRig(body, 'sit', 0);
    const rgba = new Uint8ClampedArray(spr.rgba);
    const handIdx = [PARTS.indexOf('handN' as any), PARTS.indexOf('handF' as any)];
    const at = { x: r.wristN.x - 0.5, y: r.wristN.y - 1.5 };
    const ox = Math.floor(at.x * 2) - PIV[0], oy = Math.floor(at.y * 2) - PIV[1];
    const inBook = (x: number, y: number) => y >= 0 && y < small.length && x >= 0 && x < small[0].length && small[y][x] !== '.';
    const [orr, ogg, obb] = hexToRgb('#1a0f0c');
    for (let y = -1; y <= small.length; y++) for (let x = -1; x <= small[0].length; x++) {
      if (inBook(x, y)) continue;
      if (!(inBook(x + 1, y) || inBook(x - 1, y) || inBook(x, y + 1) || inBook(x, y - 1))) continue;
      const X = ox + x, Y = oy + y;
      if (handIdx.includes(spr.part[Y * GRID + X])) continue;
      rgba.set([orr, ogg, obb, 255], (Y * GRID + X) * 4);
    }
    small.forEach((line, y) => [...line].forEach((ch, x) => {
      if (ch === '.') return;
      const X = ox + x, Y = oy + y;
      const i = (Y * GRID + X) * 4;
      if (handIdx.includes(spr.part[Y * GRID + X])) return; // keep the hands on top
      const [rr, gg, bb] = hexToRgb(pal[ch]);
      rgba.set([rr, gg, bb, 255], i);
    }));
    console.log(row, body, 'wristN', r.wristN.x.toFixed(2), r.wristN.y.toFixed(2), 'wristF', r.wristF.x.toFixed(2), r.wristF.y.toFixed(2), 'book x', (ox / 2).toFixed(1), ((ox + 21) / 2).toFixed(1), 'y', (oy / 2).toFixed(1), ((oy + 13) / 2).toFixed(1), 'head', r.head.x, r.head.y);
    const bx = col * (CW + 2) * S, by = row * (CH + 2) * S;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = ((y + CY) * GRID + x + CX) * 4;
      if (!rgba[i + 3]) continue;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) img.set(rgba.subarray(i, i + 4), ((by + y * S + sy) * W + bx + x * S + sx) * 4);
    }
  });
});
writePng(OUT + 'proto_small2.png', W, H, img);
