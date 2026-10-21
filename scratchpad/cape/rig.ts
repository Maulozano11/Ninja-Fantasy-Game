import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
for (const f of [0, 1, 2, 3]) {
  const r = renderSpriteCached({ ...base, slots: { ...base.slots, held: { id: 'held_ice_crystal', colors: [] } } } as any, 'idle', f, dojutsuToEye(c.dojutsu)).rig as any;
  console.log(f, 'shoulderN', r.shoulderN, 'shoulderF', r.shoulderF, 'neck', r.neck, 'body', base.body);
}
