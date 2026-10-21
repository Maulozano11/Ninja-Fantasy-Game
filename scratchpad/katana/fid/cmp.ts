// The game's katana against the approved generator, every combination, two chakra colours.
import { buildKatana } from './approved';
import { katanaTemplate } from '../../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
let n = 0;
const P = ['a', 'b', 'c'] as const;
for (const nature of ['#e8321e', '#36a0f0'])
  for (const steel of P) for (const blade of P) for (const guard of P) for (const hilt of P) {
    const a = buildKatana({ steel, blade, guard, hilt, nature });
    const b = katanaTemplate({ steel, blade, guard, hilt }, nature);
    const same = JSON.stringify(a.rows) === JSON.stringify(b.rows) && JSON.stringify(a.pivot) === JSON.stringify(b.pivot) && JSON.stringify(a.colors) === JSON.stringify(b.colors);
    if (!same) console.log('DIFF', nature, steel, blade, guard, hilt);
    n++;
  }
console.log('compared', n);
