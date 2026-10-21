import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const out = process.argv[2];
const held = process.argv[3] ?? 'held_ice_crystal';
const poses = (process.argv[4] ?? 'idle').split(',');
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
const look = { ...base, slots: { ...base.slots, held: { id: held, colors: [] } } };
for (const pose of poses) {
  const f = renderSpriteCached(look as any, pose as any, Number(process.argv[5] ?? 0), dojutsuToEye(c.dojutsu));
  writeFileSync(`${out}/${held}-${pose}.rgba`, Buffer.from(f.rgba));
}
console.log('ok');
