import { JUTSUS_DATA } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const j of JUTSUS_DATA) { const s = JUTSU[j.id]; console.log([j.id, j.nature, j.rank, s?.element, s?.vfx, s?.shape, s?.sig ?? '', s?.special ?? '', s?.melee ? 'melee' : ''].join(' | ')); }
console.log('battle-only:', Object.keys(JUTSU).filter((k) => !JUTSUS_DATA.some((j) => j.id === k)).map((k) => `${k}:${JUTSU[k].element}/${JUTSU[k].vfx}`).join(', '));
