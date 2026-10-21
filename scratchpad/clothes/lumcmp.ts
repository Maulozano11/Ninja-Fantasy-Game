// lumcmp.ts : lightness histogram of the reference coat vs our royal coat (reference-like look)
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, rgbToHsl } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
function readPng(path: string) {
  const buf = readFileSync(path); let off = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8); const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data); off += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); const out = new Uint8Array(w * h * 4); const stride = w * 4;
  for (let y = 0; y < h; y++) { const ft = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x];
    const a = x >= 4 ? out[y * stride + x - 4] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
    let p = 0; if (ft === 1) p = a; else if (ft === 2) p = b; else if (ft === 3) p = (a + b) >> 1; else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    out[y * stride + x] = (v + p) & 255; } }
  return { w, h, rgba: out };
}
const bins = [0.1, 0.14, 0.18, 0.22, 0.26, 0.3, 0.34, 0.38, 0.44, 1];
const hist = (ls: number[]) => { const c = bins.map(() => 0); for (const l of ls) c[bins.findIndex((b) => l < b)]++; return c.map((x) => Math.round((100 * x) / ls.length)); };
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const rl: number[] = [];
for (let y = 30; y < 88; y++) for (let x = 14; x < 60; x++) { const i = (y * ref.w + x) * 4; if (!ref.rgba[i + 3]) continue; const [h, s, l] = rgbToHsl(ref.rgba[i], ref.rgba[i + 1], ref.rgba[i + 2]); if (h > 195 && h < 240 && s > 0.2 && s < 0.5 && l > 0.08 && l < 0.6) rl.push(l); }
const coat = process.argv[2] || '#1f2a4a';
const ramp = makeRamp(coat, 'cloth').map((x) => x.toLowerCase());
const f = renderSprite(baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_royalcoat', colors: [coat, '#b8913a', '#2a3a62'] }, bottom: { id: 'bottom_shinobi', colors: ['#1f2a4a', '#1f2a4a'] }, feet: { id: 'feet_sandals', colors: [] } } } as any), 'idle', 0);
const ol: number[] = []; const idx = [0, 0, 0, 0, 0, 0];
for (let i = 0; i < 128 * 128; i++) { if (!f.rgba[i * 4 + 3]) continue; const hx = '#' + [0, 1, 2].map((q) => f.rgba[i * 4 + q].toString(16).padStart(2, '0')).join(''); const k = ramp.indexOf(hx); if (k < 1) continue; idx[k]++; ol.push(rgbToHsl(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2])[2]); }
console.log('bins <', bins.join(' '));
console.log('ref ', hist(rl).join(' '), ' n=', rl.length);
console.log('ours', hist(ol).join(' '), ' n=', ol.length, ' ramp idx 1-5:', idx.slice(1).map((x) => Math.round((100 * x) / ol.length)).join('/'));
console.log('ramp l:', ramp.map((h) => { const n = parseInt(h.slice(1), 16); return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)[2].toFixed(2); }).join(' '));
