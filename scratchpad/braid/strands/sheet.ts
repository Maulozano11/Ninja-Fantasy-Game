// Every pose and frame of one body at 3x, to check the braid follows the body everywhere.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/compose';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/rig';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
(globalThis as any).__braidV = JSON.parse(process.env.BV || '{}');
const body = process.env.BODY || 'female';
const hair = process.env.HAIR || 'hair_charlotte';
const look = (cast?: string) => ({ version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: hair, colors: [process.env.HC || '#f2cb52'] }, top: { id: process.env.TOP || 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, cast: cast ? { style: cast } : undefined, pixelEdits: [] } as any);
const list: [string, number, string?][] = [];
for (const pose of ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge']) {
  const n = frameCount(rigPoseFor(pose as any));
  for (let f = 0; f < n; f++) list.push([pose, f]);
}
list.push(['cast', 0, 'book']);
const S = 3, CW = 64, CH = 70, cols = 8;
const rows = Math.ceil(list.length / cols);
const W = cols * (CW * S + 6) + 6, H = rows * (CH * S + 6) + 6;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([40, 42, 54, 255], i * 4);
list.forEach(([pose, fr, cast], n) => {
  const f = renderSprite(look(cast), pose as any, fr);
  const ox = 6 + (n % cols) * (CW * S + 6), oy = 6 + Math.floor(n / cols) * (CH * S + 6);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const sx = 32 + x, sy = 10 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < S; j++) for (let q = 0; q < S; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * S + j) * W + ox + x * S + q) * 4);
  }
});
writePng(process.argv[2], W, H, o);
