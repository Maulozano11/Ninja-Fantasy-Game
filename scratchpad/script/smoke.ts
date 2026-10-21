import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { CAST_STYLES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
import { CHAKRA_CHOICES } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakraInfo';
import { baseLook } from '../shared/sheet';
let n = 0;
for (const body of ['male', 'female', 'bulky', 'slender'])
  for (const style of [...CAST_STYLES, 'eye'])
    for (const c of CHAKRA_CHOICES)
      for (const fr of [0, 1]) {
        renderSprite(baseLook({ body, cast: { style }, chakra: { color: c.id, onCharge: true, onCast: true, onVictory: false }, slots: { hair: { id: 'hair_gale', colors: [] }, held: { id: 'held_katana', colors: [] } } } as any), 'cast', fr);
        n++;
      }
console.log('rendered', n, 'cast frames; styles offered:', CAST_STYLES.join(','));
