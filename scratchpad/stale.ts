import { lookOf, bodyCenterDx } from '/home/user/Ninja-Fantasy-Game/src/components/battle/unitArt';
import { unitFrom } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSpriteCached } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';

const base = LEGENDARY_PRESETS.map(p => p.character).find(c => JSON.stringify(c.appearance).includes('held_katana'))!;
console.log("preset", base.id, JSON.stringify((base.appearance as any).slots.held));
const hero = { ...base, id: 'ninja_x' };
const u1 = unitFrom(hero, { team: 'party', pos: { x: 0, z: 0 } });
const l1 = lookOf(u1)!;
console.log('battle1 look katana:', JSON.stringify((l1.slots as any).held ?? null));
bodyCenterDx(u1, l1);
// edit in creator: change katana steel
const app: any = JSON.parse(JSON.stringify(hero.appearance));
const k = Object.entries(app.slots).find(([, v]: any) => v && v.id === 'held_katana');
if (!k) throw new Error('no katana');
const choice: any = app.slots[k[0]];
choice.parts = { ...(choice.parts ?? {}), steel: choice.parts?.steel === 'b' ? 'a' : 'b' };
const edited = { ...hero, appearance: app };
const u2 = unitFrom(edited, { team: 'party', pos: { x: 0, z: 0 } });
const l2 = lookOf(u2)!;
console.log('battle2 unit look parts:', JSON.stringify((u2.look as any).slots[k[0]].parts));
console.log('battle2 lookOf parts:', JSON.stringify((l2 as any).slots[k[0]].parts));
console.log('same object as battle1:', l1 === l2);
const a = renderSpriteCached(l2, 'idle', 0, undefined as any).rgba;
const b = renderSpriteCached(u2.look!, 'idle', 0, undefined as any).rgba;
let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
console.log('pixels differing between drawn (stale) and intended look:', diff);
