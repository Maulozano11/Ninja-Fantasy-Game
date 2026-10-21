import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook } from '../tools/sheet';
const [slotsJson, pose, xs] = process.argv.slice(2);
const slots: any = {};
for (const [k, v] of Object.entries(JSON.parse(slotsJson))) slots[k] = typeof v === 'string' ? { id: v, colors: [] } : v;
const f = renderSprite(baseLook({ slots }), (pose || 'idle') as any, 0);
const fx = +xs;
for (let y = 60; y < 100; y++) { const i = (y * 128 + fx) * 4; console.log(y, f.rgba[i], f.rgba[i+1], f.rgba[i+2], f.part[y*128+fx]); }
