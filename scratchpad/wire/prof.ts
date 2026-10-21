import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tintVfx } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/sprite/vfxTint';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/assets/world/';
function readPng(path: string) {
  const buf = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)); const s = w * 4; const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (s + 1)]; for (let x = 0; x < s; x++) { const v = raw[y * (s + 1) + 1 + x]; const a = x >= 4 ? px[y * s + x - 4] : 0; const b = y > 0 ? px[(y - 1) * s + x] : 0; const c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0; const q = a + b - c;
    const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0; px[y * s + x] = (v + pred) & 255; } }
  return { w, h, rgba: px };
}
const m = JSON.parse(readFileSync(R + 'vfx_fire/manifest.json', 'utf8')).sprites.annihilation_enh;
const s = readPng(R + 'vfx_fire/annihilation_enh.png');
const { frameW: w, frameH: h } = m;
const frames: Uint8Array[] = [];
for (const a of Object.values(m.anims) as { row: number; frames: number }[])
  for (let f = 0; f < a.frames; f++) {
    const rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) rgba.set(s.rgba.subarray(((a.row * h + y) * s.w + f * w) * 4, ((a.row * h + y) * s.w + f * w + w) * 4), y * w * 4);
    frames.push(rgba);
  }
const t0 = performance.now();
for (const fr of frames) tintVfx(fr, 'fire', 'black', { width: w, height: h, sprite: 'annihilation_enh' });
console.log('all', frames.length, 'frames black', Math.round(performance.now() - t0), 'ms');
const t1 = performance.now();
for (const fr of frames) tintVfx(fr, 'fire', 'green', { width: w, height: h, sprite: 'annihilation_enh' });
console.log('all', frames.length, 'frames green', Math.round(performance.now() - t1), 'ms');
