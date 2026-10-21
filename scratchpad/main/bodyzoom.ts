import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
const look = baseLook({
  skin: '#f3c39c', eyeColor: '#2f7fe0',
  slots: {
    hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
    top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
    bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] },
    cape: { id: 'cape_shadow', colors: [] },
    waist: { id: 'waist_sash', colors: ['#2f6fd6'] },
    feet: { id: 'feet_sandals', colors: [] },
    held: { id: 'held_crystal', colors: [] },
    
  },
  accessories: [{ id: 'acc_scarf', colors: ['#2a2a32'] }, { id: 'acc_chest_strap', colors: [] }],
} as any);
const f = renderSprite(look, (process.argv[3] || 'idle') as any, 0);
// crop content bbox
let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const out = Buffer.alloc(4 + w * h * 3);
out.writeUInt16LE(w, 0); out.writeUInt16LE(h, 2);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * GRID + x0 + x) * 4; const o = 4 + (y * w + x) * 3; const a = f.rgba[i + 3]; out[o] = a ? f.rgba[i] : 236; out[o + 1] = a ? f.rgba[i + 1] : 236; out[o + 2] = a ? f.rgba[i + 2] : 240; }
writeFileSync(process.argv[2], out);
