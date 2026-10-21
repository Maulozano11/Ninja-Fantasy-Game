import { sheet, baseLook, Cell } from '../tools/sheet';
import { ARMOR_ITEMS, SKIRT_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/armor';
const [out, body, sc] = process.argv.slice(2);
const cells: Cell[] = [];
const base: any = {
  hair: { id: 'hair_raven', colors: ['#2a2230'] },
  top: { id: 'top_highcollar', colors: ['#1e2433', '#1e2433'] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
for (const a of ARMOR_ITEMS) cells.push({ look: baseLook({ body: (body || 'male') as any, slots: { ...base, armor: { id: a.id, colors: [] } } }), pose: 'idle', frame: 0 });
for (const s of SKIRT_ITEMS) cells.push({ look: baseLook({ body: (body || 'male') as any, slots: { ...base, skirt: { id: s.id, colors: [] } } }), pose: 'idle', frame: 0 });
sheet(out, cells, 8, +(sc || 5));
