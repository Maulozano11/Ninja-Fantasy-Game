// Our male at idle frame 0 with no items, for the Scarlet study (tools/refs/scarlet-study.py): writes
// <out>/male-idle.png (256 x 256) and prints the rig's joints in fine pixels (scarlet_ref.OUR_JOINTS).
//
//   npx tsx tools/refs/scarlet-idle.mts <out>

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { renderSprite } from '../../src/sprite/compose';
import { GRID, RES } from '../../src/sprite/raster';
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

function writePng(path: string, w: number, h: number, rgba: Uint8ClampedArray): void {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
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
const f = renderSprite(look, 'idle', 0);
writePng(join(process.argv[2], 'male-idle.png'), GRID, GRID, f.rgba);
const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
for (const j of joints) console.log(`${j}: (${(f.rig[j].x * RES).toFixed(2)}, ${(f.rig[j].y * RES).toFixed(2)})`);
