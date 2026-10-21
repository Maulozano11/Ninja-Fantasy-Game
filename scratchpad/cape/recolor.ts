import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
const s: any = { ...base.slots };
delete s.armor;
s.held = { id: 'held_ice_crystal', colors: [] };
for (const [n, col, gold] of [['red', '#a51d2d', '#d9a93a'], ['white', '#e8e4da', '#b8913a'], ['blue', '#2f62b8', '#c0c6d0']]) {
  s.cape = { id: 'cape_shadow', colors: [col, gold] };
  const f = renderSpriteCached({ ...base, slots: s } as any, 'idle', 0, dojutsuToEye(c.dojutsu));
  writeFileSync(`${process.argv[2]}/rc-${n}.rgba`, Buffer.from(f.rgba));
}
