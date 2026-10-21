import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
const ROOT = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_jutsu-tint-2';
const { tintVfx } = await import(pathToFileURL(join(ROOT, 'src/sprite/vfxTint.ts')).href);
function readPng(path: string) {
  const buf = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p); const t = buf.toString('ascii', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } else if (t === 'IDAT') idat.push(d); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)); const s = w * 4; const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (s + 1)]; for (let x = 0; x < s; x++) { const v = raw[y * (s + 1) + 1 + x];
    const a = x >= 4 ? px[y * s + x - 4] : 0, b = y > 0 ? px[(y - 1) * s + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0; const q = a + b - c;
    const pr = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0;
    px[y * s + x] = (v + pr) & 255; } }
  return { w, h, rgba: px };
}
const cases: [string, string, string, string, number?][] = process.env.ONLY ? [JSON.parse(process.env.ONLY)] : [
  ['vfx_fire', 'bolt', 'fire', 'green'], ['vfx_fire', 'bolt', 'fire', 'black'],
  ['vfx_lightning', 'wall_diag', 'lightning', 'green'], ['vfx_lightning', 'wall_diag', 'lightning', 'black'],
  ['vfx_fire', 'wall', 'fire', 'black'],
  ['vfx_lightning', 'kirin_enh', 'lightning', 'green', 1], ['vfx_lightning', 'kirin_enh', 'lightning', 'black', 1],
  ['vfx_fire', 'annihilation_enh', 'fire', 'green', 1], ['vfx_fire', 'annihilation_enh', 'fire', 'black', 1],
];
for (const [g, s, el, c, one] of cases) {
  const m = JSON.parse(readFileSync(join(ROOT, 'src/assets/world', g, 'manifest.json'), 'utf8')).sprites[s];
  const sh = readPng(join(ROOT, 'src/assets/world', g, m.file));
  let buf = sh.rgba, W = sh.w, H = sh.h;
  if (one) { W = m.frameW; H = m.frameH; buf = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) buf.set(sh.rgba.subarray(((m.frameH + y) * sh.w) * 4, ((m.frameH + y) * sh.w + W) * 4), y * W * 4); }
  tintVfx(buf, el, c, { width: W, height: H, frameW: m.frameW, frameH: m.frameH, sprite: s });
  const t0 = performance.now(); const N = 3;
  for (let k = 0; k < N; k++) tintVfx(buf, el, c, { width: W, height: H, frameW: m.frameW, frameH: m.frameH, sprite: s });
  console.log(`${g}/${s} ${one ? 'one frame' : 'whole sheet'} ${W}x${H} ${c}: ${((performance.now() - t0) / N).toFixed(1)} ms`);
}
