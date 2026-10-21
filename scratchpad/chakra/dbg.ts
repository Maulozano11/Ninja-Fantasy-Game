import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakra';
import { baseLook } from '../tools/sheet';
const slots: any = { hair: { id: 'hair_sunburst', colors: [] }, top: { id: 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, armor: { id: 'armor_flak', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
const f = renderSprite(baseLook({ slots }), 'charge', 0);
const fx = renderChakra('indigo', 'charge', 0, f.rgba, f.rig);
const hexOf = (b: Uint8ClampedArray, i: number) => b[i*4+3] ? ((b[i*4]>>4).toString(16)) : ' ';
for (let y = 20; y < 50; y++) { let r = ''; for (let x = 0; x < 70; x++) { const i = y*128+x; r += fx.front[i*4+3] ? 'F' : fx.back[i*4+3] ? hexOf(fx.back, i) : (f.rgba[i*4+3] ? '.' : ' '); } console.log(r); }
