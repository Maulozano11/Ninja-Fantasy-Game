// pair.ts out.png refX refY ourX ourY w h k [look=founder|base] [pose]
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/before/src/sprite/compose';
import { GRID } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/before/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/before/src/data/shinobiData';
import { baseLook, writePng } from '../tools/sheet';
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
const [out, rx, ry, ox, oy, w, h, k] = [process.argv[2], ...process.argv.slice(3, 10).map(Number)];
const which = process.argv[10] || 'founder', pose = (process.argv[11] || 'idle') as any;
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const look = which === 'base' ? baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_sandals', colors: [] } } } as any) : LEGENDARY_PRESETS.find((p) => p.character.id.includes(which))!.character.appearance!;
const f = renderSprite(look, pose, pose === 'attack' ? 1 : 0);
const W = (2 * w + 2) * k, H = h * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([236, 236, 240, 255], i * 4);
const put = (x: number, y: number, p: ArrayLike<number> | null) => { const c = p ? [p[0], p[1], p[2]] : ((x + y) % 2 ? [226, 226, 232] : [240, 240, 244]); for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([...c, 255], ((y * k + j) * W + x * k + q) * 4); };
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const X = rx + x, Y = ry + y; const i = (Y * ref.w + X) * 4; put(x, y, X < ref.w && Y < ref.h && ref.rgba[i + 3] ? ref.rgba.subarray(i, i + 3) : null);
  const X2 = ox + x, Y2 = oy + y; const j = (Y2 * GRID + X2) * 4; put(w + 2 + x, y, X2 < GRID && Y2 < GRID && f.rgba[j + 3] ? f.rgba.subarray(j, j + 3) : null);
}
writePng(out, W, H, o);
