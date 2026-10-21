// usage: zr.ts <out> ids [body] [scale] [cols]: reference head + our heads (40x40 fine crop) at native pixels
import { readFileSync } from 'node:fs';
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const [out, ids, body, sc, colsA] = process.argv.slice(2);
const raw = readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/main/sample.raw');
const sw = raw.readUInt16LE(0);
const spx = raw.subarray(4);
const S = +(sc || 6), C = 40, cols = +(colsA || 5);
const list = ids.split(',');
const n = list.length + 1;
const rows = Math.ceil(n / cols);
const W = cols * (C + 2) * S, Hh = rows * (C + 2) * S;
const buf = new Uint8Array(W * Hh * 4);
for (let i = 0; i < W * Hh; i++) { buf[i * 4] = 236; buf[i * 4 + 1] = 236; buf[i * 4 + 2] = 240; buf[i * 4 + 3] = 255; }
const put = (cell: number, x: number, y: number, r: number, g: number, b: number) => {
  const ox = (cell % cols) * (C + 2), oy = Math.floor(cell / cols) * (C + 2);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const k = (((oy + y) * S + j) * W + (ox + x) * S + i) * 4; buf[k] = r; buf[k + 1] = g; buf[k + 2] = b; }
};
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const sx = x + 14, sy = y; const k = (sy * sw + sx) * 3; put(0, x, y, spx[k], spx[k + 1], spx[k + 2]); }
list.forEach((id, n2) => {
  const look = baseLook({ body: (body || 'male') as any, skin: '#f3c39c', eyeColor: '#2f7fe0', slots: { hair: { id, colors: [] }, top: { id: 'top_tee', colors: [] } } } as any);
  const f = renderSprite(look, 'idle', 0);
  const x0 = Math.round(f.rig.head.x * RES) - C / 2, y0 = Math.round(f.rig.head.y * RES) - C / 2 - 2;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const i = ((y0 + y) * GRID + x0 + x) * 4; if (f.rgba[i + 3]) put(n2 + 1, x, y, f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]); }
});
writePng(out, W, Hh, buf);
