// Usage: npx tsx multi.ts out.png slot id1,id2,... body [scale]  -> rows = items, cols = poses
import { sheet, baseLook, Cell } from '../tools/sheet';
const [out, slot, ids, body, sc] = process.argv.slice(2);
const poses: [any, number][] = [['idle', 0], ['idle', 2], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 1], ['handsigns', 0]];
const cells: Cell[] = [];
for (const id of ids.split(',')) for (const [pose, frame] of poses) {
  const slots: any = { hair: { id: 'hair_sunburst', colors: ['#2a2f45'] }, top: { id: 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
  let accessories: any[] = [];
  if (slot === 'accessory') accessories = id.split('+').map((i) => ({ id: i, colors: [] })); else slots[slot] = { id, colors: [] };
  cells.push({ look: baseLook({ body: (body || 'male') as any, slots, accessories }), pose, frame });
}
sheet(out, cells, poses.length, +(sc || 1));
