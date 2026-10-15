// Renders sprite sheets to PNG for checking items against the style standard.
//
//   npm run sprites -- item <itemId> [out.png]     item on 3 bodies x 7 poses
//   npm run sprites -- preset <presetId> [out.png] a preset in every pose
//   npm run sprites -- compare [out.png]           reference sprite next to the Solen preset, 6x
//
// See docs/SPRITE_STYLE_GUIDE.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { LEGENDARY_PRESETS } from '../src/data/shinobiData';
import { getItem } from '../src/sprite/catalog';
import { renderSprite } from '../src/sprite/compose';
import { defaultAppearance, dojutsuToEye } from '../src/sprite/legacy';
import { GRID } from '../src/sprite/raster';
import { BodyType, EyeSpecial, SPRITE_POSES, SpriteAppearance, SpritePose } from '../src/sprite/types';

// --- tiny PNG codec (8-bit RGBA, non-interlaced) ---------------------------
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
function readPng(path: string): { w: number; h: number; rgba: Uint8Array } {
  const buf = readFileSync(path);
  let off = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
    } else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  const bpp = 4;
  const stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let p = 0;
      if (ft === 1) p = a;
      else if (ft === 2) p = b;
      else if (ft === 3) p = (a + b) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (v + p) & 255;
    }
  }
  return { w, h, rgba: out };
}

// --- sheets ----------------------------------------------------------------
interface Cell {
  look: SpriteAppearance;
  pose: SpritePose;
  frame: number;
  eye?: EyeSpecial;
}

function sheet(path: string, cells: Cell[], cols: number, scale: number): void {
  const rows = Math.ceil(cells.length / cols);
  const W = cols * GRID * scale;
  const H = rows * GRID * scale;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const checker = (Math.floor((i % W) / (16 * scale)) + Math.floor(Math.floor(i / W) / (16 * scale))) % 2 ? 6 : 0;
    out.set([44 + checker, 44 + checker, 52 + checker, 255], i * 4);
  }
  cells.forEach((c, k) => {
    const f = renderSprite(c.look, c.pose, c.frame, c.eye || 'none');
    const ox = (k % cols) * GRID * scale;
    const oy = Math.floor(k / cols) * GRID * scale;
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const i = (y * GRID + x) * 4;
        if (!f.rgba[i + 3]) continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) out.set(f.rgba.subarray(i, i + 4), ((oy + y * scale + sy) * W + ox + x * scale + sx) * 4);
      }
  });
  writePng(path, W, H, out);
}

const NEUTRAL: SpriteAppearance['slots'] = {
  hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
  top: { id: 'top_tee', colors: [] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_sandals', colors: [] },
};

const [mode, arg, outArg] = process.argv.slice(2);
if (mode === 'item') {
  const def = getItem(arg);
  if (!def) throw new Error(`Unknown item ${arg}`);
  const cells: Cell[] = [];
  for (const body of ['male', 'female', 'bulky'] as BodyType[])
    for (const pose of SPRITE_POSES) {
      const look = { ...defaultAppearance(), body, slots: { ...NEUTRAL }, accessories: [] as SpriteAppearance['accessories'] };
      if (def.slot === 'accessory') look.accessories = [{ id: def.id, colors: [] }];
      else look.slots[def.slot] = { id: def.id, colors: [] };
      cells.push({ look, pose, frame: pose === 'attack' ? 1 : 0 });
    }
  sheet(outArg || `${arg}.png`, cells, 7, 2);
} else if (mode === 'preset') {
  const p = LEGENDARY_PRESETS.find((x) => x.character.id === arg)?.character;
  if (!p?.appearance) throw new Error(`Unknown preset ${arg}`);
  const cells = SPRITE_POSES.map((pose) => ({ look: p.appearance!, pose, frame: pose === 'attack' ? 1 : 0, eye: dojutsuToEye(p.dojutsu) }));
  sheet(outArg || `${arg}.png`, cells, 7, 3);
} else if (mode === 'compare') {
  const ref = readPng(new URL('../docs/reference/reference-sprite.png', import.meta.url).pathname);
  const solen = LEGENDARY_PRESETS[0].character;
  const f = renderSprite(solen.appearance!, 'idle', 0, dojutsuToEye(solen.dojutsu));
  const k = 6;
  const W = (ref.w + GRID + 8) * k;
  const H = Math.max(ref.h, GRID) * k;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
  const put = (x: number, y: number, p: ArrayLike<number>) => {
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) out.set([p[0], p[1], p[2], 255], ((y * k + j) * W + x * k + i) * 4);
  };
  for (let y = 0; y < ref.h; y++)
    for (let x = 0; x < ref.w; x++) {
      const i = (y * ref.w + x) * 4;
      if (ref.rgba[i + 3]) put(x, y + (H / k - ref.h), ref.rgba.subarray(i, i + 4));
    }
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      if (f.rgba[i + 3]) put(ref.w + 8 + x, y + (H / k - GRID), f.rgba.subarray(i, i + 4));
    }
  writePng(outArg || arg || 'compare.png', W, H, out);
} else {
  console.log('Usage: npm run sprites -- item <itemId> [out.png] | preset <presetId> [out.png] | compare [out.png]');
}
