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

import { POSES, drawRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { v } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const SEAT_HIP = 0.74;
const legs = { hip: SEAT_HIP, footN: v(0.5, SEAT_HIP + 0.12 * 0.5), footF: v(0.47, SEAT_HIP + 0.12 * 0.47) };
const chest = (x: number, y: number) => ({ from: 'chest', x, y, units: 'px' });
const arm = (x: number, y: number) => ({ from: 'shoulder', x, y, units: 'arm' });
const knee = (s: 'N' | 'F', x: number, y: number) => ({ from: s === 'N' ? 'kneeN' : 'kneeF', x, y, units: 'px' });
const LEANB = { lean: -13, pelvisDx: -6, lift: -2.5, snap: true, footN: v(-0.24, 0.52), footF: v(0.34, 0.94), farHandFront: true };
const SITB = { lean: 14, pelvisDx: -8.5, snap: true, ...legs };
const GUARDB = { lean: 5, footN: v(-0.32, 0.94), footF: v(0.36, 0.93), farHandFront: true };
const tests: [string, any][] = [
  ['trainFist', { ...GUARDB, handN: chest(4.5, -2.5), handF: chest(2.5, -4), shapeN: 'fist', shapeF: 'fist' }],
  ['trainFist', { ...GUARDB, handN: chest(4, -3), bendN: -1, handF: chest(6, -4), shapeN: 'fist', shapeF: 'fist' }],
  ['trainFist', { ...GUARDB, handN: chest(3, -4), bendN: -1, handF: arm(0.62, -0.05), shapeN: 'fist', shapeF: 'fist', farHandFront: false }],
  ['trainFist', { ...GUARDB, handN: chest(5, -2), handF: arm(0.55, 0.1), shapeN: 'fist', shapeF: 'fist', farHandFront: false }],
  ['trainFist', { ...GUARDB, handN: chest(2.5, -5), bendN: -1, handF: arm(0.5, -0.2), shapeN: 'fist', shapeF: 'fist', farHandFront: false }],
  ['trainFist', { ...GUARDB, handN: chest(1.5, -6), bendN: -1, handF: chest(8, -5), shapeN: 'fist', shapeF: 'fist', farHandFront: false }],
  ['lean', { ...LEANB, handN: chest(1, 4), bendN: 1, handF: chest(-1, 0.5), shapeN: 'relaxed', shapeF: 'fist' }],
  ['lean', { ...LEANB, handN: chest(1.5, 3), handF: chest(0.5, -0.5), shapeN: 'fist', shapeF: 'fist' }],
];
const S = 4, CW = 64, CH = 80, CX = 24, CY = 24;
const cols = 4;
const rowsN = Math.ceil(tests.length / cols);
const W = cols * (CW + 2) * S, H = rowsN * (CH + 2) * S;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([60, 60, 70, 255], i * 4);
const p2 = (p: any) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`;
tests.forEach(([pose, fr], k) => {
  (POSES as any)[pose] = [fr];
  const r = drawRig('male', pose as any, 0);
  const reach = (s: any, w: any) => Math.hypot(w.x - s.x, w.y - s.y).toFixed(2);
  console.log(k, pose, 'N sh', p2(r.shoulderN), 'el', p2(r.elbowN), 'wr', p2(r.wristN), 'reach', reach(r.shoulderN, r.wristN), '| F sh', p2(r.shoulderF), 'el', p2(r.elbowF), 'wr', p2(r.wristF), 'reach', reach(r.shoulderF, r.wristF), 'knees', p2(r.kneeN), p2(r.kneeF));
  const spr = renderSprite(look('male'), (pose === 'trainFist' ? 'train' : pose) as SpritePose, 0);
  const bx = (k % cols) * (CW + 2) * S, by = Math.floor(k / cols) * (CH + 2) * S;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = ((y + CY) * GRID + x + CX) * 4;
    if (!spr.rgba[i + 3]) continue;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) img.set(spr.rgba.subarray(i, i + 4), ((by + y * S + sy) * W + bx + x * S + sx) * 4);
  }
});
writePng(OUT + 'proto_poses2.png', W, H, img);
