// refcmp.ts out.png zoom [pose] [extra items...]: reference next to a reference-like look wearing our clothes
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
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
const [out, zs, pose = 'idle', ...extra] = process.argv.slice(2);
const k = +zs;
const ref = readPng('/home/user/Ninja-Fantasy-Game/docs/reference/reference-sprite.png');
const slots: any = {
  hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
  top: { id: 'top_royalcoat', colors: ['#1f2a4a', '#b8913a', '#2a3a62'] },
  bottom: { id: 'bottom_shinobi', colors: ['#1f2a4a', '#1f2a4a'] },
  feet: { id: 'feet_sandals', colors: [] },
};
const accessories: any[] = [];
for (const e of extra) { const [id, ...cols] = e.split(':'); const d = getItem(id)!; if (d.slot === 'accessory') accessories.push({ id, colors: cols.map((c) => '#' + c) }); else slots[d.slot] = { id, colors: cols.map((c) => '#' + c) }; }
const f = renderSprite(baseLook({ skin: '#f3c39c', slots, accessories } as any), pose as any, pose === 'attack' ? 1 : 0);
// crop: ref 6..64 x 20..98 ; ours aligned: ours x = ref x + 26, y = ref y + 26 (approx)
const rx = 4, ry = 14, w = 62, h = 84, ox = rx + 32, oy = ry + 26;
const W = (2 * w + 2) * k, H = h * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
const put = (x: number, y: number, p: ArrayLike<number> | null) => { if (!p) return; for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([p[0], p[1], p[2], 255], ((y * k + j) * W + x * k + q) * 4); };
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const X = rx + x, Y = ry + y; const i = (Y * ref.w + X) * 4; put(x, y, X < ref.w && Y < ref.h && ref.rgba[i + 3] ? ref.rgba.subarray(i, i + 3) : null);
  const X2 = ox + x, Y2 = oy + y; const j = (Y2 * 128 + X2) * 4; put(w + 2 + x, y, X2 < 128 && Y2 < 128 && f.rgba[j + 3] ? f.rgba.subarray(j, j + 3) : null);
}
writePng(out, W, H, o);
