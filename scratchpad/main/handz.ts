// Our hands vs the reference hands at 14x: [ref near, ours near, ref far, ours far] per row; rows = poses.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook, writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
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
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const C = 18, k = 12, gap = 2;
const refPx = (x0: number, y0: number) => (x: number, y: number) => { const i = ((y0 + y) * ref.w + x0 + x) * 4; return ref.rgba[i + 3] ? [...ref.rgba.subarray(i, i + 3)] : null; };
const look = process.argv[3] === 'base' ? baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] } } } as any) : LEGENDARY_PRESETS[0].character.appearance!;
const rows: ((x: number, y: number) => number[] | null)[][] = [];
for (const [pose, fr] of [['idle', 0], ['attack', 1], ['cast', 0], ['victory', 0]] as const) {
  const f = renderSprite(look, pose as any, fr);
  const our = (h: { x: number; y: number }) => { const x0 = Math.round(h.x * RES) - C / 2, y0 = Math.round(h.y * RES) - C / 2; return (x: number, y: number) => { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) return null; const i = (Y * GRID + X) * 4; return f.rgba[i + 3] ? [...f.rgba.subarray(i, i + 3)] : null; }; };
  rows.push([refPx(12, 52), our(f.rig.handN), refPx(47, 52), our(f.rig.handF)]);
}
const W = 4 * (C + gap) * k, H = rows.length * (C + gap) * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
rows.forEach((r, ry) => r.forEach((px, cx) => { const ox = cx * (C + gap) * k, oy = ry * (C + gap) * k;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const p = px(x, y) || ((x + y) % 2 ? [226, 226, 232] : [240, 240, 244]);
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) out.set([...p, 255], ((oy + y * k + j) * W + ox + x * k + q) * 4); } }));
writePng(process.argv[2], W, H, out);
