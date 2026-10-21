// Contact sheet: many poses/frames/bodies at 3x, cropped to the upper body.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/src/sprite/compose';
import { POSES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/src/sprite/rig';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const look = (body: string) => ({ version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any);
const cells: [string, string, number][] = [];
const body = process.argv[3] || 'female';
for (const pose of Object.keys(POSES).concat(['walk', 'run', 'jump'])) {
  const n = (POSES as any)[pose]?.length ?? 4;
  for (let fr = 0; fr < n; fr++) cells.push([body, pose, fr]);
}
for (const b of ['male', 'bulky', 'slender']) cells.push([b, 'idle', 0], [b, 'attack', 1]);
const Z = 3, CW = 56, CH = 64, COLS = 12;
const rowsN = Math.ceil(cells.length / COLS);
const W = COLS * (CW * Z + 6) + 6, H = rowsN * (CH * Z + 6) + 6;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([40, 42, 54, 255], i * 4);
cells.forEach(([b, pose, fr], n) => {
  let f: any;
  try { f = renderSprite(look(b), pose as any, fr); } catch (e) { return; }
  const x0 = Math.round(f.rig.head.x * 2) - 28, y0 = Math.round(f.rig.head.y * 2) - 18;
  const ox = 6 + (n % COLS) * (CW * Z + 6), oy = 6 + Math.floor(n / COLS) * (CH * Z + 6);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue;
    const i = (sy * 128 + sx) * 4;
    if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < Z; j++) for (let q = 0; q < Z; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * Z + j) * W + ox + x * Z + q) * 4);
  }
});
console.log(cells.map((c, i) => `${i}:${c.join('/')}`).join(' '));
writePng(process.argv[2], W, H, o);
