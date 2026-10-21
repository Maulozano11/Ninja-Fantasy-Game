import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-1/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-1/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-1/src/data/shinobiData';
import type { SpriteAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-1/src/sprite/types';
function crc32(buf: Uint8Array): number { let crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array): Buffer { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function writePng(path: string, w: number, h: number, rgba: Uint8ClampedArray): void { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const out = process.argv[2];
const base = (body: string): SpriteAppearance => ({ version: 1, body, skin: '#f6bb96', faceShape: 'valiant', eyeShape: 'valiant', eyeColor: '#d97706', slots: {}, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [] } as unknown as SpriteAppearance);
const aiden = LEGENDARY_PRESETS.find(p => p.name.startsWith('Aiden'))!.character.appearance!;
const looks: [string, SpriteAppearance][] = [['male', base('male')], ['slender', base('slender')], ['bulky', base('bulky')], ['aiden', aiden]];
const joints = ['head', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
for (const [n, l] of looks) {
  const f = renderSprite(l, 'idle', 0);
  writePng(join(out, `${n}-idle.png`), GRID, GRID, f.rgba);
  console.log(n, JSON.stringify(Object.fromEntries(joints.map(j => [j, [+(f.rig[j].x * RES).toFixed(2), +(f.rig[j].y * RES).toFixed(2)]]))));
}
