// Renders looks in poses to 256x256 PNGs: npx tsx render.mts <repo> <outdir> <spec.json>
// spec: { looks: { name: { body, slots, skin? } }, shots: [[look, pose, frame], ...] }
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const [repo, outdir, specPath] = process.argv.slice(2);
const { renderSprite } = await import(join(repo, 'src/sprite/compose.ts'));
const { GRID } = await import(join(repo, 'src/sprite/raster.ts'));

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

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
for (const [name, l] of Object.entries<any>(spec.looks)) {
  const look = {
    version: 1,
    body: l.body ?? 'male',
    skin: l.skin ?? '#f8d4b8',
    faceShape: l.faceShape ?? 'valiant',
    eyeShape: l.eyeShape ?? 'valiant',
    eyeColor: '#c88038',
    slots: l.slots ?? {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    cast: l.cast,
    stowed: l.stowed,
    pixelEdits: [],
  };
  for (const [ln, pose, frame] of spec.shots) {
    if (ln !== name) continue;
    const f = renderSprite(look, pose, frame);
    writePng(join(outdir, `${name}_${pose}_${frame}.png`), GRID, GRID, f.rgba);
    const j: Record<string, number[]> = {};
    for (const k of ['wristN', 'wristF', 'ankleN', 'ankleF', 'kneeN', 'kneeF']) j[k] = [f.rig[k].x * 2, f.rig[k].y * 2];
    writeFileSync(join(outdir, `${name}_${pose}_${frame}.json`), JSON.stringify(j));
  }
}
