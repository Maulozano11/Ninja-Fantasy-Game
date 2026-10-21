// usage: full.ts <out> id1,id2 [scale] -> each id: male idle, female idle, bulky idle, male attack1, male hurt
import { grid, dressed, C } from './lib';
const [out, ids, sc] = process.argv.slice(2);
const cells: C[] = [];
for (const id of ids.split(',')) {
  for (const b of ['male', 'female', 'bulky']) cells.push({ look: dressed(b, id), pose: 'idle', frame: 0 });
  cells.push({ look: dressed('male', id), pose: 'attack', frame: 1 });
  cells.push({ look: dressed('female', id), pose: 'hurt', frame: 0 });
  cells.push({ look: dressed('bulky', id), pose: 'victory', frame: 0 });
}
grid(out, cells, 6, +(sc || 2), [-20, -18, 40, 50]);
