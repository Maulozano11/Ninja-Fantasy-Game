import { grid, dressed, C } from './lib';
const [out, ids, sc] = process.argv.slice(2);
const cells: C[] = ids.split(',').map((id) => ({ look: dressed('male', id, { clothes: false }), pose: 'idle' as any, frame: 0 }));
grid(out, cells, cells.length, +(sc || 3), [-20, -16, 40, 56]);
