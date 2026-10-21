// Sandbox: preview hand-made braid tiles (repeated) at 1x and zoomed, in the hair ramp.
import { makeRamp, mixHex, hexToRgb } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/src/sprite/color';
import { deflateSync } from 'node:zlib';
import { writeFileSync, readFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const ramp = [...makeRamp('#f2cb52', 'hair')];
ramp[0] = mixHex(ramp[0], '#07060b', 0.7);
const cols = ramp.map((h) => hexToRgb(h));
// input file: blocks separated by blank lines; each block is a strip (already composed)
const blocks = readFileSync(process.argv[2], 'utf8').trim().split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trim().replace(/^'|',?$/g, '')));
const Z = 10;
const hMax = Math.max(...blocks.map((b) => b.length));
const wSum = blocks.reduce((s, b) => s + Math.max(...b.map((r) => r.length)) + 4, 0);
const W = wSum * Z + 20 + wSum * 3 + 20, H = hMax * Z + 20;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([44, 52, 72, 255], i * 4);
let ox = 10;
let ox1 = wSum * Z + 30;
for (const b of blocks) {
  const bw = Math.max(...b.map((r) => r.length));
  b.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row.charCodeAt(x) - 48;
      if (ch < 0 || ch > 5) continue;
      const c = cols[ch];
      for (let j = 0; j < Z; j++) for (let q = 0; q < Z; q++) o.set([c[0], c[1], c[2], 255], ((10 + y * Z + j) * W + ox + x * Z + q) * 4);
      for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) o.set([c[0], c[1], c[2], 255], ((10 + y * 3 + j) * W + ox1 + x * 3 + q) * 4);
    }
  });
  ox += (bw + 4) * Z;
  ox1 += (bw + 4) * 3;
}
writePng(process.argv[3], W, H, o);
