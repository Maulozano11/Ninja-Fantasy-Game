import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
const body = (process.argv[3] || 'male') as any;
const look = baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_longsleeve', colors: ['#25252d', '#1a1a20'] }, bottom: { id: 'bottom_shinobi', colors: ['#25252d', '#25252d'] }, feet: { id: 'feet_leather', colors: ['#1d1d24', '#111'] }, waist: { id: 'waist_belt', colors: ['#1a1a20', '#9aa3b0'] } } } as any);
const f = renderSprite(look, 'idle', 0);
let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const out = Buffer.alloc(4 + w * h * 3); out.writeUInt16LE(w, 0); out.writeUInt16LE(h, 2);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * GRID + x0 + x) * 4; const o = 4 + (y * w + x) * 3; const a = f.rgba[i + 3]; out[o] = a ? f.rgba[i] : 52; out[o + 1] = a ? f.rgba[i + 1] : 50; out[o + 2] = a ? f.rgba[i + 2] : 56; }
writeFileSync(process.argv[2], out);
