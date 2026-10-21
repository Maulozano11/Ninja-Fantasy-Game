import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-2';
const { tintVfx } = await import(R + '/src/sprite/vfxTint.ts');
const { tintPal } = await import(R + '/src/sprite/chakra.ts');
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
const lum = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
for (const [el, f] of [['fire', 'bolt'], ['water', 'hit'], ['wind', 'blast'], ['lightning', 'bolt'], ['earth', 'wall']]) {
  const s = readPng(`${R}/src/assets/world/vfx_${el}/${f}.png`);
  const row: string[] = [];
  for (const c of ['white', '#ffffff', '#f4f1e4', '#eeeeee', 'black', '#1a0b22', '#000000', '#202020', '#3a3a3a', '#808080']) {
    const out = tintVfx(s.rgba, el, c, { width: s.w, height: s.h });
    const ls: number[] = []; const cols = new Set<number>(); let white = 0, n = 0, bright = 0;
    for (let i = 0; i < out.length; i += 4) {
      if (s.rgba[i + 3] < 160) continue;
      if (out[i] === s.rgba[i] && out[i + 1] === s.rgba[i + 1] && out[i + 2] === s.rgba[i + 2]) continue;
      n++; const L = lum(out[i], out[i + 1], out[i + 2]); ls.push(L); cols.add((out[i] << 16) | (out[i + 1] << 8) | out[i + 2]);
      if (out[i] > 250 && out[i + 1] > 250 && out[i + 2] > 250) white++;
      if (rgbToHsl(out[i], out[i + 1], out[i + 2])[2] >= 0.45) bright++;
    }
    ls.sort((a, b) => a - b);
    row.push(`${c}: p10 ${ls[(ls.length * 0.1) | 0]?.toFixed(2)} p90 ${ls[(ls.length * 0.9) | 0]?.toFixed(2)} cols ${cols.size} pureWhite ${(100 * white / n).toFixed(0)}% bright ${(100 * bright / n).toFixed(0)}%`);
  }
  console.log(`${el}/${f}\n  ` + row.join('\n  '));
}
console.log('tintPal #ffffff', tintPal('#ffffff'), 'tintPal #000000', tintPal('#000000'), 'tintPal #1a0b22', tintPal('#1a0b22'));
