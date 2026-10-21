// sample | engine render, both at native fine-pixel scale
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';

const out = process.argv[2];
const pose = (process.argv[3] || 'idle') as any;
export const SAMPLE_LOOK = baseLook({
  skin: '#f3c39c',
  eyeColor: '#2f7fe0',
  slots: {
    hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
    top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
    bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] },
    cape: { id: 'cape_shadow', colors: [] },
    waist: { id: 'waist_sash', colors: ['#2f6fd6'] },
    feet: { id: 'feet_sandals', colors: [] },
    held: { id: 'held_crystal', colors: [] },
  },
  accessories: [{ id: 'acc_scarf', colors: ['#1f1e26'] }, { id: 'acc_chest_strap', colors: [] }],
} as any);

// read the native sample PNG via python-made raw file
const raw = readFileSync(process.argv[4]);
const sw = raw.readUInt16LE(0), sh = raw.readUInt16LE(2);
const spx = raw.subarray(4);
const f = renderSprite(SAMPLE_LOOK, pose, 0);
const scale = 4, gap = 8;
const W = (sw + GRID + gap) * scale, H = Math.max(sh, GRID) * scale;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 236; buf[i * 4 + 1] = 236; buf[i * 4 + 2] = 240; buf[i * 4 + 3] = 255; }
const put = (x: number, y: number, r: number, g: number, b: number) => {
  for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const k = ((y * scale + j) * W + x * scale + i) * 4; buf[k] = r; buf[k + 1] = g; buf[k + 2] = b; }
};
for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const k = (y * sw + x) * 3; put(x, y + (Math.max(sh, GRID) - sh), spx[k], spx[k + 1], spx[k + 2]); }
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) { const k = (y * GRID + x) * 4; if (f.rgba[k + 3]) put(sw + gap + x, y + (Math.max(sh, GRID) - GRID), f.rgba[k], f.rgba[k + 1], f.rgba[k + 2]); }
writePng(out, W, H, buf);
