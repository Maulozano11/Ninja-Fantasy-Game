// usage: npx tsx poses.ts out.png '<slots json>' [bodies csv] [scale]
// rows = bodies, cols = idle, attack1, cast, hurt, victory, charge
import { sheet, baseLook, Cell } from '../tools/sheet';
const [out, slotsJson, bodies, sc] = process.argv.slice(2);
const slots: any = {};
for (const [k, v] of Object.entries(JSON.parse(slotsJson))) slots[k] = typeof v === 'string' ? { id: v, colors: [] } : v;
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0]];
const cells: Cell[] = [];
for (const body of (bodies || 'male,female,bulky').split(','))
  for (const [pose, frame] of poses) cells.push({ look: baseLook({ body: body as any, slots }), pose, frame });
sheet(out, cells, 6, +(sc || 2));
