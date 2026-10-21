import { getAppearance } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const base = getAppearance(LEGENDARY_PRESETS[0].character);
console.log(JSON.stringify(base.slots, null, 0));
console.log(JSON.stringify(base.accessories));
