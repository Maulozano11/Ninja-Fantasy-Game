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
for (const [g, n, el, sprite] of [['vfx_fire', 'annihilation_enh', 'fire', undefined], ['vfx_lightning', 'kirin_enh', 'lightning', 'kirin_enh'], ['vfx_fire', 'wall', 'fire', undefined], ['vfx_earth', 'wall_diag', 'earth', undefined]] as const) {
  const m = JSON.parse(readFileSync(R + g + '/manifest.json', 'utf8')).sprites[n];
  const s = readPng(R + g + '/' + n + '.png');
  const { frameW: w, frameH: h } = m;
  const row = 1, f = 3;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) rgba.set(s.rgba.subarray(((row * h + y) * s.w + f * w) * 4, ((row * h + y) * s.w + f * w + w) * 4), y * w * 4);
  for (const c of ['green', 'black', 'white', '#80ff20']) {
    const c0 = performance.now();
    tintVfx(rgba, el as any, c, { width: w, height: h, sprite });
    const cold = performance.now() - c0;
    const t0 = performance.now();
    for (let k = 0; k < 5; k++) tintVfx(rgba, el as any, c, { width: w, height: h, sprite });
    console.log(n, w, h, c, 'cold', cold.toFixed(1), 'warm', ((performance.now() - t0) / 5).toFixed(1), 'ms/frame');
  }
}
