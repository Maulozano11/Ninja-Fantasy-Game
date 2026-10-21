// Renders the camp poses for the owner's verdict.
import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const out = process.argv[2];
LEGENDARY_PRESETS.slice(0, 3).forEach((p, i) => {
  const look = getAppearance(p.character);
  for (const pose of ['lean', 'sit', 'read', 'train'] as const)
    for (const f of [0, 2]) writeFileSync(`${out}/camp-${i}-${pose}-${f}.rgba`, Buffer.from(renderSpriteCached(look, pose, f, dojutsuToEye(p.character.dojutsu)).rgba));
});
