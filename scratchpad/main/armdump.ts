// Dump our near arm region as classes: o outline-dark, s skin, c cloth, . empty
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../shared/sheet';
const look = baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] } } } as any);
const f = renderSprite(look, 'idle', 0);
const r = f.rig;
console.log('shoulderN', [r.shoulderN.x * RES, r.shoulderN.y * RES].map(Math.round), 'elbowN', [r.elbowN.x * RES, r.elbowN.y * RES].map(Math.round), 'wristN', [r.wristN.x * RES, r.wristN.y * RES].map(Math.round), 'handN', [r.handN.x * RES, r.handN.y * RES].map(Math.round));
const x0 = Math.round(r.elbowN.x * RES) - 12, y0 = Math.round(r.shoulderN.y * RES) + 4;
for (let y = y0; y < y0 + 40; y++) {
  let s = '';
  for (let x = x0; x < x0 + 24; x++) {
    const i = (y * 128 + x) * 4; if (!f.rgba[i + 3]) { s += '.'; continue; }
    const R = f.rgba[i], G = f.rgba[i + 1], B = f.rgba[i + 2]; const l = (R + G + B) / 3;
    s += l < 50 ? 'o' : R > G + 25 && R > B + 25 ? (l > 200 ? 'l' : l > 160 ? 'b' : 's') : 'c';
  }
  let w = 0, best = 0; for (const ch of s) { if (ch === 'l' || ch === 'b' || ch === 's') { w++; best = Math.max(best, w); } else w = 0; }
  console.log(String(y).padStart(3), s, best);
}
