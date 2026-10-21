// Aiden for the owner to paint over: every creator pose, frame 0, at the game's size.
import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const out = process.argv[2];
const p = LEGENDARY_PRESETS.find((x) => x.character.name === 'Aiden')!;
const look = getAppearance(p.character);
writeFileSync(`${out}/look.json`, JSON.stringify(look, null, 1));
for (const pose of ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge'] as const)
  writeFileSync(`${out}/${pose}.rgba`, Buffer.from(renderSpriteCached(look, pose, pose === 'attack' ? 1 : 0, dojutsuToEye(p.character.dojutsu)).rgba));
