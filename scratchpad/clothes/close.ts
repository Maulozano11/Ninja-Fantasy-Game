import { sheet, baseLook } from '../tools/sheet';
const [out, slotsJson, body, pose, frame] = process.argv.slice(2);
const slots: any = {};
for (const [k, v] of Object.entries(JSON.parse(slotsJson))) slots[k] = typeof v === 'string' ? { id: v, colors: [] } : v;
sheet(out, [{ look: baseLook({ body: (body || 'male') as any, slots }), pose: (pose || 'idle') as any, frame: +(frame || 0) }], 1, 5);
