// The same capes with no armour, for comparison.
import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const out = process.argv[2];
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
for (const [name, cape, cc] of [['shadow', 'cape_shadow', ['#1c1b22', '#b8913a']], ['knight', 'cape_knight', ['#a51d2d', '#d9a93a']]] as const) {
  const s: any = { ...base.slots, cape: { id: cape, colors: cc } };
  delete s.armor;
  writeFileSync(`${out}/noarmor-${name}.rgba`, Buffer.from(renderSpriteCached({ ...base, slots: s } as any, 'idle', 0, dojutsuToEye(c.dojutsu)).rgba));
}
