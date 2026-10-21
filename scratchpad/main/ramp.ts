import { makeRamp } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
for (const p of LEGENDARY_PRESETS) console.log(p.character.id.padEnd(28), p.character.appearance!.skin, makeRamp(p.character.appearance!.skin, 'skin').join(' '));
