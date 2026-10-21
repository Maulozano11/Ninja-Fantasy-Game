import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
const base: any = getAppearance(LEGENDARY_PRESETS[0].character);
const none = { ...base, slots: { ...base.slots, held: undefined } };
const f = renderSprite(none, 'downed', 0);
let maxy = 0; for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (f.rgba[(y * 128 + x) * 4 + 3]) maxy = Math.max(maxy, y);
console.log('no weapon lowest row', maxy, JSON.stringify((f as any).rig?.lay ?? null));
