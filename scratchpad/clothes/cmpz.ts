// zoomed compare: reference (native) next to our render cropped, both at scale 6
import { readFileSync } from 'node:fs';
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const out = process.argv[2];
const pose = (process.argv[3] || 'idle') as any;
const frame = +(process.argv[5] || 0);
const extra = process.argv[6] ? JSON.parse(process.argv[6]) : {};
const look = baseLook({
  skin: '#f3c39c', eyeColor: '#2f7fe0',
  slots: {
    hair: { id: 'hair_midnight', colors: ['#1c2233'] },
    top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
    bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] },
    cape: { id: 'cape_shadow', colors: [] },
    waist: { id: 'waist_sash', colors: ['#2f6fd6'] },
    feet: { id: 'feet_sandals', colors: [] },
    held: { id: 'held_crystal', colors: [] },
    ...extra,
  },
  accessories: [{ id: 'acc_scarf', colors: ['#1f1e26'] }, { id: 'acc_chest_strap', colors: [] }],
} as any);
const raw = readFileSync(process.argv[4]);
const sw = raw.readUInt16LE(0), sh = raw.readUInt16LE(2);
const spx = raw.subarray(4);
const f = renderSprite(look, pose, frame);
const X0 = 30, Y0 = 26, CW = 76, CH = 102;
const scale = 6, gap = 6;
const W = (sw + CW + gap) * scale, H = Math.max(sh, CH) * scale;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 236; buf[i * 4 + 1] = 236; buf[i * 4 + 2] = 240; buf[i * 4 + 3] = 255; }
const put = (x: number, y: number, r: number, g: number, b: number) => {
  for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const k = ((y * scale + j) * W + x * scale + i) * 4; buf[k] = r; buf[k + 1] = g; buf[k + 2] = b; }
};
for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const k = (y * sw + x) * 3; put(x, y + (Math.max(sh, CH) - sh), spx[k], spx[k + 1], spx[k + 2]); }
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const k = ((y + Y0) * GRID + x + X0) * 4; if (f.rgba[k + 3]) put(sw + gap + x, y + (Math.max(sh, CH) - CH), f.rgba[k], f.rgba[k + 1], f.rgba[k + 2]); }
writePng(out, W, H, buf);
