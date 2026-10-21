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

const kat = (body: BodyType): SpriteAppearance => { const l = look(body); return { ...l, slots: { ...l.slots, held: { id: 'held_katana', colors: [] } } } as SpriteAppearance; };
sheet(OUT + 'train_zoom.png', [0, 3, 6].map((f) => ({ look: look('male'), pose: 'train' as SpritePose, frame: f })).concat([0, 4, 5].map((f) => ({ look: kat('male'), pose: 'train' as SpritePose, frame: f }))), 6, 6, [40, 40, 50, 40]);
