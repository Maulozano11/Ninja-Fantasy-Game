// Renders the legends that carry a katana, in the game, after the parts went in.
import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const out = process.argv[2];
const names: string[] = [];
for (const p of LEGENDARY_PRESETS) {
  const looks = (p as any).looks ?? [getAppearance(p.character)];
  looks.forEach((look: any, li: number) => {
    if (look.slots?.held?.id !== 'held_katana') return;
    const n = `${p.character.name}-${li}`.replace(/\W+/g, '_');
    names.push(n);
    for (const [pose, f] of [['idle', 0], ['attack', 1], ['attack', 2], ['handsigns', 0], ['downed', 0]] as const)
      writeFileSync(`${out}/${n}-${pose}${f}.rgba`, Buffer.from(renderSpriteCached(look, pose, f, dojutsuToEye(p.character.dojutsu)).rgba));
  });
}
console.log(JSON.stringify(names));
