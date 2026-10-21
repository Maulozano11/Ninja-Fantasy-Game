import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { DEPTHS } from '/home/user/Ninja-Fantasy-Game/src/sprite/ctx';
import { baseLook } from '../shared/sheet';
const body = process.argv[2] || 'male';
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] } } } as any), 'idle', 0);
const r = f.rig; const R = 2;
console.log('pelvis', [r.pelvis.x * R, r.pelvis.y * R].map(Math.round), 'hipN', [r.hipN.x * R, r.hipN.y * R].map(Math.round), 'hipF', [r.hipF.x * R, r.hipF.y * R].map(Math.round), 'kneeN', [r.kneeN.x * R, r.kneeN.y * R].map(Math.round), 'kneeF', [r.kneeF.x * R, r.kneeF.y * R].map(Math.round));
const x0 = Math.round(r.pelvis.x * R) - 18, y0 = Math.round(r.pelvis.y * R) - 10;
for (let y = y0; y < y0 + 26; y++) { let s = ''; for (let x = x0; x < x0 + 36; x++) { const i = (y * 128 + x) * 4; if (!f.rgba[i + 3]) { s += '.'; continue; } const Rr = f.rgba[i], G = f.rgba[i + 1], B = f.rgba[i + 2]; const l = (Rr + G + B) / 3; s += l < 40 ? 'o' : Rr > G + 25 ? (l > 190 ? 'l' : l > 150 ? 'b' : 's') : 'c'; } console.log(String(y).padStart(3), s); }
