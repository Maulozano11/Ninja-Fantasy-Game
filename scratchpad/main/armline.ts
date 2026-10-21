// Near-arm skin runs per row: reference (native) vs ours (fine px), plus outline-inclusive width.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook } from '../shared/sheet';
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
const isSkin = (r: number, g: number, b: number) => r > g + 30 && r > b + 30 && r > 100;
function runs(get: (x: number, y: number) => number[] | null, x0: number, x1: number, y: number) {
  let best: [number, number] | null = null, start = -1;
  for (let x = x0; x <= x1 + 1; x++) { const p = x <= x1 ? get(x, y) : null; const sk = !!p && isSkin(p[0], p[1], p[2]);
    if (sk && start < 0) start = x; if (!sk && start >= 0) { if (!best || x - start > best[1] - best[0]) best = [start, x - 1]; start = -1; } }
  return best;
}
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const rget = (x: number, y: number) => { const i = (y * ref.w + x) * 4; return ref.rgba[i + 3] ? [ref.rgba[i], ref.rgba[i + 1], ref.rgba[i + 2]] : null; };
console.log('REF near arm (y: x0-x1 width center)');
for (let y = 34; y <= 64; y++) { const r = runs(rget, 8, 32, y); if (r) console.log(y, `${r[0]}-${r[1]}`, r[1] - r[0] + 1, ((r[0] + r[1]) / 2).toFixed(1)); }
const which = process.argv[2] || 'base';
const look = which === 'base' ? baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] } } } as any) : LEGENDARY_PRESETS[0].character.appearance!;
const f = renderSprite(look, 'idle', 0);
const oget = (x: number, y: number) => { const i = (y * 128 + x) * 4; return f.rgba[i + 3] ? [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]] : null; };
const sx = Math.round(f.rig.shoulderN.x * 2);
console.log('OURS near arm', 'shoulder', [f.rig.shoulderN.x * 2, f.rig.shoulderN.y * 2].map(Math.round), 'elbow', [f.rig.elbowN.x * 2, f.rig.elbowN.y * 2].map(Math.round), 'wrist', [f.rig.wristN.x * 2, f.rig.wristN.y * 2].map(Math.round));
for (let y = Math.round(f.rig.shoulderN.y * 2); y <= Math.round(f.rig.handN.y * 2) + 8; y++) { const r = runs(oget, sx - 16, sx + 6, y); if (r) console.log(y, `${r[0]}-${r[1]}`, r[1] - r[0] + 1, ((r[0] + r[1]) / 2).toFixed(1)); }
