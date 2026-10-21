// usage: refcmp.ts <out> <sample.raw> [hairId] [body] [pose]: reference head (left) vs ours (right), 8x
import { readFileSync } from 'node:fs';
import { writePng } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
export const SAMPLE_LOOK = baseLook({
  skin: '#f3c39c',
  eyeColor: '#2f7fe0',
  slots: {
    hair: { id: 'hair_midnight', colors: ['#1c2233'] },
    top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
    bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] },
    cape: { id: 'cape_shadow', colors: [] },
    waist: { id: 'waist_sash', colors: ['#2f6fd6'] },
    feet: { id: 'feet_sandals', colors: [] },
    held: { id: 'held_crystal', colors: [] },
  },
  accessories: [{ id: 'acc_scarf', colors: ['#1f1e26'] }, { id: 'acc_chest_strap', colors: [] }],
} as any);
const [out, rawp, id, body, pose] = process.argv.slice(2);
const raw = readFileSync(rawp);
const sw = raw.readUInt16LE(0), sh = raw.readUInt16LE(2);
const spx = raw.subarray(4);
const look = JSON.parse(JSON.stringify(SAMPLE_LOOK));
if (id) look.slots.hair = { id, colors: [] };
if (body) look.body = body;
const f = renderSprite(look, (pose || 'idle') as any, pose === 'attack' ? 1 : 0);
const S = 8, CW = 44, CH = 40;
const W = (CW * 2 + 4) * S, Hh = CH * S;
const buf = new Uint8Array(W * Hh * 4);
for (let i = 0; i < W * Hh; i++) { buf[i * 4] = 236; buf[i * 4 + 1] = 236; buf[i * 4 + 2] = 240; buf[i * 4 + 3] = 255; }
const put = (x: number, y: number, r: number, g: number, b: number) => {
  if (x < 0 || y < 0 || y >= CH) return;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const k = ((y * S + j) * W + x * S + i) * 4; buf[k] = r; buf[k + 1] = g; buf[k + 2] = b; }
};
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x + 6, sy = y; if (sx >= sw || sy >= sh) continue; const k = (sy * sw + sx) * 3; put(x, y, spx[k], spx[k + 1], spx[k + 2]); }
const hx = Math.round(f.rig.head.x * RES), hy = Math.round(f.rig.head.y * RES);
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const gx = hx - 22 + x, gy = hy - 22 + y; if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue; const k = (gy * GRID + gx) * 4; if (f.rgba[k + 3]) put(CW + 4 + x, y, f.rgba[k], f.rgba[k + 1], f.rgba[k + 2]); }
writePng(out, W, Hh, buf);
