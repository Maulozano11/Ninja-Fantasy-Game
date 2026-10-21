import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-2';
const { tintVfx } = await import(R + '/src/sprite/vfxTint.ts');
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
// hue buckets of pixels per element sheet, and whether 'red' changes them
for (const el of ['wind', 'water', 'fire', 'lightning']) {
  const dir = `${R}/src/assets/world/vfx_${el}`;
  const buckets = new Map<string, [number, number]>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png') && !/annihilation|kirin/.test(f))) {
    const s = readPng(`${dir}/${f}`);
    const out = tintVfx(s.rgba, el, el === 'fire' ? 'blue' : 'red', { width: s.w, height: s.h });
    for (let i = 0; i < s.rgba.length; i += 4) {
      if (!s.rgba[i + 3]) continue;
      const [h, sat, l] = rgbToHsl(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]);
      if (sat < 0.16 || l <= 0.1 || l > 0.85) continue;
      const k = `${f.replace('.png', '')}:h${Math.floor(h / 30) * 30}`;
      const ch = out[i] !== s.rgba[i] || out[i + 1] !== s.rgba[i + 1] || out[i + 2] !== s.rgba[i + 2];
      const b = buckets.get(k) ?? [0, 0]; b[0]++; if (ch) b[1]++; buckets.set(k, b);
    }
  }
  // report only off-element hues
  const offHue: Record<string, (h: number) => boolean> = { wind: (h) => h < 60 || h >= 210, water: (h) => h < 150 || h >= 270, fire: (h) => h >= 90 && h < 300, lightning: (h) => h < 150 || h >= 300 };
  const lines = [...buckets.entries()].filter(([k, v]) => offHue[el](+k.split(':h')[1]) && v[0] > 50).map(([k, v]) => `${k} n=${v[0]} changed=${v[1]}`);
  console.log(el, lines.join(' | '));
}
