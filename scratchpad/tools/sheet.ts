import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import type { SpriteAppearance, SpritePose, EyeSpecial } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

function crc32(buf: Uint8Array): number {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function writePng(path: string, w: number, h: number, rgba: Uint8Array) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

export interface Cell { look: SpriteAppearance; pose: SpritePose; frame: number; eye?: EyeSpecial }
export function sheet(path: string, cells: Cell[], cols: number, scale = 4, bg = [44, 44, 52]) {
  const rows = Math.ceil(cells.length / cols);
  const W = cols * GRID * scale, H = rows * GRID * scale;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { const checker = ((Math.floor((i % W) / (16*scale)) + Math.floor(Math.floor(i / W) / (16*scale))) % 2) ? 6 : 0; out[i*4]=bg[0]+checker; out[i*4+1]=bg[1]+checker; out[i*4+2]=bg[2]+checker; out[i*4+3]=255; }
  cells.forEach((c, k) => {
    const f = renderSprite(c.look, c.pose, c.frame, c.eye || 'none');
    const ox = (k % cols) * GRID * scale, oy = Math.floor(k / cols) * GRID * scale;
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4; if (!f.rgba[i + 3]) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const j = ((oy + y * scale + sy) * W + ox + x * scale + sx) * 4;
        out[j] = f.rgba[i]; out[j+1] = f.rgba[i+1]; out[j+2] = f.rgba[i+2]; out[j+3] = 255;
      }
    }
  });
  writePng(path, W, H, out);
}

export function baseLook(over: Partial<SpriteAppearance> = {}): SpriteAppearance {
  return { version: 1, body: 'male', skin: '#f2c7a0', eyeShape: 'standard', eyeColor: '#3b82f6', slots: {}, accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [], ...over };
}
