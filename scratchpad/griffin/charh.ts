import { characterRef } from '../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
let top = 999, bot = -1;
for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.alpha(x, y) > 128) { top = Math.min(top, y); bot = Math.max(bot, y); }
console.log('character rows', top, bot, 'h', bot - top + 1);
