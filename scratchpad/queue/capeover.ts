// Renders capes over shoulder guards (for the cape-over-shoulders proposal preview).
import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const [out, tag] = process.argv.slice(2);
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
const combos: [string, string, string[], string, string[]][] = [
  ['dread-shadow', 'armor_dread', ['#c4ccd6', '#d9a92e'], 'cape_shadow', ['#1c1b22', '#b8913a']],
  ['dread-knight', 'armor_dread', ['#c4ccd6', '#d9a92e'], 'cape_knight', ['#a51d2d', '#d9a93a']],
  ['lamellar-shadow', 'armor_lamellar', [], 'cape_shadow', ['#1c1b22', '#b8913a']],
  ['leather-knight', 'armor_leather', [], 'cape_knight', ['#a51d2d', '#d9a93a']],
];
for (const [name, armor, ac, cape, cc] of combos) {
  const s: any = { ...base.slots, armor: { id: armor, colors: ac }, cape: { id: cape, colors: cc } };
  const f = renderSpriteCached({ ...base, slots: s } as any, 'idle', 0, dojutsuToEye(c.dojutsu));
  writeFileSync(`${out}/${tag}-${name}.rgba`, Buffer.from(f.rgba));
}
