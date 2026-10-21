import { sheet, baseLook } from './sheet';
const [out, body, pose, frame, extra] = process.argv.slice(2);
const look = baseLook({ body: (body || 'male') as any, ...(extra ? JSON.parse(extra) : {}) });
sheet(out, [{ look, pose: (pose || 'idle') as any, frame: +(frame || 0) }], 1, 5);
