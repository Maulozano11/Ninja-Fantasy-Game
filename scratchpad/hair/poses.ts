// usage: poses.ts <out> id1,id2 [scale]: per id a row of male idle / female attack1 / bulky hurt / male victory / female cast / bulky charge / male handsigns
import { grid, dressed, C } from './lib';
const [out, ids, sc] = process.argv.slice(2);
const cells: C[] = [];
const P: [string, any, number][] = [['male', 'idle', 0], ['female', 'attack', 1], ['bulky', 'hurt', 0], ['male', 'victory', 0], ['female', 'cast', 0], ['bulky', 'charge', 0], ['male', 'handsigns', 0]];
for (const id of ids.split(',')) for (const [b, p, f] of P) cells.push({ look: dressed(b, id), pose: p, frame: f });
grid(out, cells, 7, +(sc || 2), [-20, -12, 40, 50]);
