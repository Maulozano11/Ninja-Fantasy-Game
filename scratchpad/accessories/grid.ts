// Usage: npx tsx grid.ts out.png '<json: {cape?,face?,held?,acc?:[], base?:bool}>' [scale]
import { sheet, baseLook, Cell } from '../tools/sheet';
const [out, spec, sc] = process.argv.slice(2);
const o = JSON.parse(spec || '{}');
const slots: any = o.bare ? {} : {
  hair: { id: 'hair_sunburst', colors: ['#2a2f45'] },
  top: { id: 'top_highcollar', colors: [] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
if (o.cape) slots.cape = { id: o.cape, colors: o.capeColors || [] };
if (o.face) slots.face = { id: o.face, colors: [] };
if (o.held) slots.held = { id: o.held, colors: [] };
const accessories = (o.acc || []).map((id: string) => ({ id, colors: [] }));
const poses: [any, number][] = o.poses || [['idle', 0], ['idle', 2], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 1], ['handsigns', 0]];
const bodies = o.bodies || ['male', 'female', 'bulky'];
const cells: Cell[] = [];
for (const body of bodies) for (const [pose, frame] of poses) cells.push({ look: baseLook({ body, slots, accessories }), pose, frame });
sheet(out, cells, poses.length, +(sc || 3));
