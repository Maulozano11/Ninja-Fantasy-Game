// Usage: npx tsx items.ts out.png slot pose frame body [scale]  -> one cell per item of a slot
import { sheet, baseLook, Cell } from '../tools/sheet';
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
const [out, slot, pose, frame, body, sc] = process.argv.slice(2);
const cells: Cell[] = [];
for (const d of itemsForSlot(slot as any)) {
  const slots: any = { hair: { id: 'hair_sunburst', colors: ['#2a2f45'] }, top: { id: 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
  let accessories: any[] = [];
  if (slot === 'accessory') accessories = [{ id: d.id, colors: [] }]; else slots[slot] = { id: d.id, colors: [] };
  cells.push({ look: baseLook({ body: (body || 'male') as any, slots, accessories }), pose: (pose || 'idle') as any, frame: +(frame || 0) });
}
sheet(out, cells, Math.min(cells.length, 7), +(sc || 4));
