// Preview only: draws the new katana parts in the hand by swapping the katana item's draw.
import { writeFileSync } from 'fs';
const R = '../../../../../../home/user/Ninja-Fantasy-Game/src';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getItem } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { drawPaintedWeapon } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/items/weapons';
import { gripPoint, swordAngle } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/grip';
import { buildKatana, NATURES, KatanaChoice } from './katanas';
void R;
const out = process.argv[2];
const combos: Record<string, KatanaChoice> = {
  classic: { steel: 'a', blade: 'a', guard: 'a', hilt: 'a' },
  fire: { steel: 'c', nature: NATURES.fire, blade: 'c', guard: 'b', hilt: 'a' },
  sun: { steel: 'b', blade: 'a', guard: 'c', hilt: 'c' },
  crow: { steel: 'a', blade: 'b', guard: 'a', hilt: 'b' },
  water: { steel: 'c', nature: NATURES.water, blade: 'a', guard: 'c', hilt: 'a' },
};
const item = getItem('held_katana')!;
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
for (const [name, k] of Object.entries(combos)) {
  const b = buildKatana(k);
  const t = { rows: b.rows, pivot: b.pivot, angle: 0, colors: b.colors };
  item.draw = (g) => drawPaintedWeapon(g, 'nearArm.held', t, gripPoint(g), swordAngle(g), { base: '#000000', blade: '#000000', grip: '#000000', gripBase: '#000000' });
  for (const [pose, f] of [['idle', 0], ['attack', 1], ['attack', 2]] as const) {
    const look = { ...base, slots: { ...base.slots, held: { id: 'held_katana', colors: [name] } } };
    const fr = renderSpriteCached(look as any, pose as any, f, dojutsuToEye(c.dojutsu));
    writeFileSync(`${out}/${name}-${pose}${f}.rgba`, Buffer.from(fr.rgba));
  }
}
console.log('ok');
