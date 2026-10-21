import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { BODY_PARAMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { baseLook } from '../shared/sheet';
const f = renderSprite(baseLook({ body: 'male', skin: '#f3c39c', slots: { top: { id: 'top_tee', colors: ['#2c3448'] } } } as any), 'idle', 0);
const k = (BODY_PARAMS as any).male.headScale;
console.log('head', f.rig.head, 'k', k, 'nx', Math.floor((f.rig.head.x - 1.9 * k) * 2), 'ny', Math.floor((f.rig.head.y + 1.0 * k) * 2));
for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const i = (y * 128 + x) * 4; const [R, G, B] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]]; if (f.rgba[i + 3] && B > 180 && R < 120) console.log('blue', x, y, R, G, B); }
