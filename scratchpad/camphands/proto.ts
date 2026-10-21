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
function sheet(path: string, cells: Cell[], cols: number, scale: number, crop: [number, number, number, number]): void {
  const [cx, cy, cw, ch] = crop;
  const rows = Math.ceil(cells.length / cols);
  const W = cols * (cw + 2) * scale;
  const H = rows * (ch + 2) * scale;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const checker = (Math.floor((i % W) / (2 * scale)) + Math.floor(Math.floor(i / W) / (2 * scale))) % 2 ? 8 : 0;
    out.set([60 + checker, 60 + checker, 70 + checker, 255], i * 4);
  }
  cells.forEach((c, k) => {
    const f = renderSprite(c.look, c.pose, c.frame);
    const ox = (k % cols) * (cw + 2) * scale;
    const oy = Math.floor(k / cols) * (ch + 2) * scale;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const i = ((y + cy) * GRID + x + cx) * 4;
        if (!f.rgba[i + 3]) continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) out.set(f.rgba.subarray(i, i + 4), ((oy + y * scale + sy) * W + ox + x * scale + sx) * 4);
      }
  });
  writePng(path, W, H, out);
}

const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camphands/';
const look = (body: BodyType, extra: Partial<SpriteAppearance> = {}): SpriteAppearance => ({ ...defaultAppearance(), body, ...extra });
const cast = (body: BodyType): SpriteAppearance => ({ ...look(body), cast: { style: 'book' } } as SpriteAppearance);

import { POSES, drawRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { v } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const SEAT_HIP = 0.74;
const legs = { hip: SEAT_HIP, footN: v(0.5, SEAT_HIP + 0.12 * 0.5), footF: v(0.47, SEAT_HIP + 0.12 * 0.47) };
const base = { lean: 17, pelvisDx: -8.5, snap: true, ...legs, headDx: 0.5, headDy: 0.5 } as any;
const chest = (x: number, y: number) => ({ from: 'chest', x, y, units: 'px' });
const opts: any[] = [
  { ...base, handN: chest(-5, 7.5), bendN: -1, handF: chest(5, 2), shapeN: "cradle", shapeF: "relaxed" },
  { ...base, handN: chest(-4, 8), bendN: -1, handF: chest(5, 2), shapeN: "cradle", shapeF: "relaxed" },
  { ...base, lean: 10, handN: chest(-4, 8), bendN: -1, handF: chest(5, 2), shapeN: "cradle", shapeF: "relaxed" },
  { ...base, headDy: 1, handN: chest(-3, 8.5), bendN: -1, handF: chest(5, 2), shapeN: "cradle", shapeF: "relaxed" },
];
const _old: any[] = [
  { ...base, handN: chest(0.6, 6.2), handF: chest(7.4, 5.8), shapeN: 'cradle', shapeF: 'cradle' },
  { ...base, handN: chest(-2.5, 6), bendN: -1, handF: chest(5.5, 0.5), shapeN: 'cradle', shapeF: 'relaxed' },
  { ...base, handN: chest(-1, 5.5), bendN: -1, handF: chest(6.5, 1.5), shapeN: 'cradle', shapeF: 'relaxed' },
  { ...base, lean: 12, handN: chest(-1, 6), bendN: -1, handF: chest(6.5, 1.5), shapeN: 'cradle', shapeF: 'relaxed' },
];
const cells: Cell[] = [];
opts.forEach((o, i) => {
  (POSES as any).castBook = [o];
  for (const body of ['male', 'female'] as BodyType[]) {
    const r = drawRig(body, 'castBook', 0);
    console.log(i, body, 'wristN', r.wristN.x.toFixed(2), r.wristN.y.toFixed(2), 'elbowN', r.elbowN.x.toFixed(2), r.elbowN.y.toFixed(2), 'wristF', r.wristF.x.toFixed(2), r.wristF.y.toFixed(2), 'head', r.head.x, r.head.y);
  }
  // render now (renderSprite reads POSES at call time)
  const l = cast('male');
  sheet(OUT + `protoB${i}.png`, [{ look: l, pose: 'cast', frame: 0 }, { look: cast('female'), pose: 'cast', frame: 0 }], 2, 5, [10, 36, 74, 60]);
});
