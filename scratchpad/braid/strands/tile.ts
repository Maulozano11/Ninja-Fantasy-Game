// Hand-drawn braid tiles repeated vertically (argv: tiles separated by '|', rows by '/'), in the hair ramp, big and at 3x.
import { MaterialTable } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/raster';
import { hexToRgb } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/color';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const mats = new MaterialTable();
const ramp = mats.ramps[mats.get('#f2cb52', 'hair')].map(hexToRgb);
const tiles = process.argv[3].split('|').map((t) => t.split('/'));
const K = 10, S = 3, CW = 10, CH = 30;
const W = tiles.length * (CW * K + 10) + 10, H = CH * K + 20 + CH * S + 10;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([44, 52, 72, 255], i * 4);
tiles.forEach((t, n) => {
  for (let y = 0; y < CH; y++) {
    const row = t[y % t.length];
    for (let x = 0; x < row.length; x++) {
      const ch = row.charCodeAt(x) - 48;
      if (ch < 0 || ch > 5) continue;
      const c = ramp[ch];
      for (let j = 0; j < K; j++) for (let q = 0; q < K; q++) o.set([c[0], c[1], c[2], 255], ((10 + y * K + j) * W + 10 + n * (CW * K + 10) + x * K + q) * 4);
      for (let j = 0; j < S; j++) for (let q = 0; q < S; q++) o.set([c[0], c[1], c[2], 255], ((20 + CH * K + y * S + j) * W + 10 + n * (CW * K + 10) + x * S + q) * 4);
    }
  }
});
writePng(process.argv[2], W, H, o);
