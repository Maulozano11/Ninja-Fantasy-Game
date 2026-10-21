// Compares braid knob variants in context: upper body at 8x and the whole sprite at 3x, per variant.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/compose';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const pose = process.env.POSE || 'idle', frame = Number(process.env.FR || 0), body = process.env.BODY || 'female';
const look = { version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: [process.env.HC || '#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any;
const variants = process.argv.slice(3).map((s) => JSON.parse(s));
const K = 16, CW = 14, CH = 18, S = 3, BW = 60, BH = 100;
const colW = Math.max(CW * K, BW * S) + 12;
const W = variants.length * colW + 10, H = CH * K + BH * S + 30;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([40, 42, 54, 255], i * 4);
variants.forEach((V, n) => {
  (globalThis as any).__braidV = V;
  const f = renderSprite(look, pose as any, frame);
  const put = (x0: number, y0: number, w: number, h: number, k: number, ox: number, oy: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue;
      const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
      for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4);
    }
  };
  put(Math.round(f.rig.head.x * 2) - 12, Math.round(f.rig.head.y * 2) - 8, CW + 4, CH + 6, K, 10 + n * colW, 10);
  put(34, 14, BW, BH, S, 10 + n * colW, 20 + CH * K);
});
writePng(process.argv[2], W, H, o);
