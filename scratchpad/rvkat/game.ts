import { writeFileSync } from 'fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { drawPaintedWeapon } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/weapons';
import { gripPoint, swordAngle, handsBusy, handsLimp } from '/home/user/Ninja-Fantasy-Game/src/sprite/grip';
import { chakraHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakraInfo';
import { buildKatana } from '../old/katana-parts';
const out = process.argv[2];
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
const item = getItem('held_katana')!;
const realDraw = item.draw;
const combos: Record<string, Record<string, 'a'|'b'|'c'>> = {
  classic: { steel: 'a', blade: 'a', guard: 'a', hilt: 'a' },
  fire: { steel: 'c', blade: 'c', guard: 'b', hilt: 'a' },
  sun: { steel: 'b', blade: 'a', guard: 'c', hilt: 'c' },
  crow: { steel: 'a', blade: 'b', guard: 'a', hilt: 'b' },
};
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['attack', 2], ['downed', 0], ['handsigns', 0], ['walk', 0], ['victory', 0], ['charge', 0], ['hurt', 0], ['cast', 0]];
let diffs = 0;
for (const [name, parts] of Object.entries(combos)) {
  const look: any = { ...base, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts } } };
  for (const [pose, f] of poses) {
    item.draw = realDraw;
    const a = renderSprite(look, pose, f).rgba;
    item.draw = (g: any) => {
      if (handsBusy(g) || handsLimp(g)) return realDraw(g, [], parts);
      const b = buildKatana({ ...parts, nature: chakraHex(g.look.chakra) } as any);
      drawPaintedWeapon(g, 'nearArm.held', { ...b, angle: 0 }, gripPoint(g), swordAngle(g));
    };
    const b = renderSprite(look, pose, f).rgba;
    item.draw = realDraw;
    const same = Buffer.from(a).equals(Buffer.from(b));
    if (!same) { diffs++; console.log('DIFF', name, pose, f); }
    writeFileSync(`${out}/${name}-${pose}${f}.rgba`, Buffer.from(a));
  }
}
console.log('diffs', diffs, 'chakra', chakraHex(base.chakra));
