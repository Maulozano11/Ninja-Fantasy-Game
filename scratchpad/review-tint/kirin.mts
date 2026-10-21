import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-2';
const { rgbToHsl } = await import(R + '/src/sprite/color.ts');
function readPng(path: string) {
  const buf = readFileSync(path); let p = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)); const s = w * 4; const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (s + 1)]; for (let x = 0; x < s; x++) { const v = raw[y * (s + 1) + 1 + x]; const a = x >= 4 ? px[y * s + x - 4] : 0; const b = y > 0 ? px[(y - 1) * s + x] : 0; const c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0; const q = a + b - c;
    const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0; px[y * s + x] = (v + pred) & 255; } }
  return { w, h, rgba: px };
}
const stops = [0.15, 0.21, 0.3, 0.6, 0.92];
for (const f of ['bolt', 'blast', 'kirin']) {
  const s = readPng(`${R}/src/assets/world/vfx_lightning/${f}.png`);
  const hist = [0, 0, 0, 0, 0, 0]; let n = 0; const hue = new Map<number, number>();
  for (let i = 0; i < s.rgba.length; i += 4) {
    if (s.rgba[i + 3] < 32) continue;
    const y = (0.299 * s.rgba[i] + 0.587 * s.rgba[i + 1] + 0.114 * s.rgba[i + 2]) / 255;
    let k = 0; while (k < 5 && y > stops[k]) k++; hist[k]++; n++;
    const [h, sat] = rgbToHsl(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]);
    if (sat > 0.2) hue.set(Math.floor(h / 30) * 30, (hue.get(Math.floor(h / 30) * 30) ?? 0) + 1);
  }
  console.log(f, 'luma bands (<s0, s0-s1, ..., >s4) %:', hist.map((v) => ((100 * v) / n).toFixed(0)).join(' '), '| hues:', [...hue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, v]) => `${h}:${((100 * v) / n).toFixed(0)}%`).join(' '));
}
