// Usage: npx tsx pick.ts out.png '<json [{slot,id|ids,body,pose,frame}]>' cols scale
import { sheet, baseLook, Cell } from '../tools/sheet';
const [out, spec, cols, sc] = process.argv.slice(2);
const cells: Cell[] = JSON.parse(spec).map((c: any) => {
  const slots: any = c.bare ? {} : { hair: { id: 'hair_sunburst', colors: ['#2a2f45'] }, top: { id: c.top || 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
  for (const k of ['cape', 'face', 'held', 'armor']) if (c[k]) slots[k] = { id: c[k], colors: c[k + 'Colors'] || [] };
  const accessories = (c.acc || []).map((id: string) => ({ id, colors: [] }));
  return { look: baseLook({ body: c.body || 'male', slots, accessories }), pose: c.pose || 'idle', frame: c.frame || 0 };
});
sheet(out, cells, +(cols || cells.length), +(sc || 3));
