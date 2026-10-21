import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
import { JUTSUS_DATA } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { T } from '/home/user/Ninja-Fantasy-Game/src/components/battle/battleText';
console.log(Object.keys(JUTSU).length, JUTSUS_DATA.length, T('act_dash', undefined, 'es'));
for (const j of Object.values(JUTSU)) console.log(j.id, j.element, j.cast, j.rank, j.nameEs ?? '');
