import * as W from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-water-v3-refdata';
import * as L from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-lightning-v3-refdata';
import * as E from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
import * as WI from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-wind-v3-refdata';
import * as F from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-refdata';
console.log('WATER PAL', JSON.stringify(W.WV3_PAL));
console.log('WATER VEIL', JSON.stringify((W as any).WV3_VEIL).slice(0, 400));
console.log('LIGHTNING PAL', JSON.stringify(L.LV3_PAL));
const ek: Record<string, Set<string>> = {};
for (const [n, r] of Object.entries(E.EV3_REF)) for (const p of r.pal) (ek[p.kind] ??= new Set()).add(p.rgba);
for (const [k, s] of Object.entries(ek)) console.log('EARTH', k, s.size, [...s].sort().join(' '));
for (const [n, p] of Object.entries(WI.WV3_PALS)) console.log('WIND', n, p.length, p.join(' '));
const fk = new Set<string>(); const fo = new Set<string>();
for (const [n, p] of Object.entries(F.REF_PIECES)) { fo.add(p.pal[0]); p.pal.slice(1).forEach((c) => fk.add(c)); }
console.log('FIRE pieces', Object.keys(F.REF_PIECES).join(','));
console.log('FIRE outline(index1)', [...fo].join(' '));
console.log('FIRE body', fk.size, [...fk].sort().join(' '));
console.log('FIRE frames keys', Object.keys((F as any).REF_FRAMES).slice(0,40).join(','));
