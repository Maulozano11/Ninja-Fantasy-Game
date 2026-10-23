// Our male at idle frame 0 with no items, as maps of body parts, for the Scarlet parts that fill in
// what his picture hides with our body's own shape (tools/refs/scarlet-upper-from-ref.py). Writes, in
// <out>/ (256 x 256; each pixel's PARTS index in src/sprite/raster.ts, 0 where the body is not):
//
//   male-idle-parts.png   grey: the part seen at each pixel
//   male-idle-layers.png  RGB: the far arm's layer (R), the torso's (G) and the near arm's (B), each
//                         whole, what is drawn over it included (the far arm behind the torso)
//
//   npx tsx tools/refs/scarlet-body-map.mts <out>

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { drawBody } from '../../src/sprite/body';
import { renderSprite } from '../../src/sprite/compose';
import { Depth, DrawCtx } from '../../src/sprite/ctx';
import { GRID, Layer, MaterialTable } from '../../src/sprite/raster';
import { drawRig, rigPoseFor } from '../../src/sprite/rig';
import type { SpriteAppearance } from '../../src/sprite/types';

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

/** An 8-bit PNG with `channels` channels (1 grey, 3 RGB). */
function writePng(path: string, w: number, h: number, px: Uint8Array, channels: 1 | 3): void {
  const raw = Buffer.alloc((w * channels + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, px.byteOffset + y * w * channels, w * channels).copy(raw, y * (w * channels + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 1 ? 0 : 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

const look: SpriteAppearance = {
  version: 1,
  body: 'male',
  skin: '#f6bb96',
  faceShape: 'valiant',
  eyeShape: 'valiant',
  eyeColor: '#d97706',
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
};
const N = GRID * GRID;
const out = process.argv[2];

const f = renderSprite(look, 'idle', 0);
const seen = new Uint8Array(N);
for (let i = 0; i < N; i++) seen[i] = f.rgba[i * 4 + 3] ? f.part[i] : 0;
writePng(join(out, 'male-idle-parts.png'), GRID, GRID, seen, 1);

// The body's own layers, as compose.ts draws them before any item.
const rig = drawRig('male', rigPoseFor('idle'), 0);
const mats = new MaterialTable();
const layers = new Map<Depth, Layer>();
const g: DrawCtx = {
  rig,
  bp: rig.bp,
  look,
  eyeSpecial: 'none',
  mats,
  L(depth) {
    let l = layers.get(depth);
    if (!l) layers.set(depth, (l = new Layer()));
    return l;
  },
  m: (hex, kind = 'cloth') => mats.get(hex, kind),
  pen: (hex, kind, part, bias = 0, flags = 0) => ({ mat: mats.get(hex, kind), part, bias, flags }),
  skin: mats.get(look.skin, 'skin'),
  has: () => false,
  after: () => {},
};
drawBody(g);
const rgb = new Uint8Array(N * 3);
(['farArm.body', 'torso.body', 'nearArm.body'] as Depth[]).forEach((d, c) => {
  const L = layers.get(d);
  if (L) for (let i = 0; i < N; i++) if (L.mat[i] >= 0) rgb[i * 3 + c] = L.part[i];
});
writePng(join(out, 'male-idle-layers.png'), GRID, GRID, rgb, 3);
