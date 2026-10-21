// Renders every hair item on every body in a few poses (crash check + overview sheet).
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { HAIR_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair';
import { baseLook } from '../shared/sheet';
let n = 0;
for (const def of HAIR_ITEMS) for (const body of ['male', 'female', 'slender', 'bulky']) for (const [pose, fr] of [['idle', 0], ['attack', 1], ['walk', 2], ['hurt', 0], ['castBook', 0]] as const) {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: def.id, colors: def.colors.map((c) => c.default) } } } as any), pose as any, fr);
  if (!f.rgba.some((x: number) => x)) throw new Error('empty ' + def.id);
  n++;
}
console.log('rendered', n, 'sprites OK');
