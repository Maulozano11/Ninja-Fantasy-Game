import { grid, dressed } from './lib';
const [out, id, body, pose] = process.argv.slice(2);
grid(out, [{ look: dressed(body || 'male', id), pose: (pose || 'idle') as any, frame: pose === 'attack' ? 1 : 0 }], 1, 12, [-14, -14, 26, 24]);
