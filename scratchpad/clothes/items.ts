// usage: npx tsx items.ts out.png slot id1,id2,... [body] [base slots json] [pose] [frame] [scale] [cols]
import { sheet, baseLook, Cell } from '../tools/sheet';
const [out, slot, ids, body, baseJson, pose, frame, sc, cols] = process.argv.slice(2);
const base: any = {};
for (const [k, v] of Object.entries(JSON.parse(baseJson || '{}'))) base[k] = typeof v === 'string' ? { id: v, colors: [] } : v;
const cells: Cell[] = [];
for (const id of ids.split(',')) {
  const [iid, col] = id.split(':');
  cells.push({ look: baseLook({ body: (body || 'male') as any, slots: { ...base, [slot]: { id: iid, colors: col ? col.split('/') : [] } } }), pose: (pose || 'idle') as any, frame: +(frame || 0) });
}
sheet(out, cells, Math.min(cells.length, +(cols || 4)), +(sc || 3));
