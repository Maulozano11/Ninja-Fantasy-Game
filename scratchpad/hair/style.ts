// usage: style.ts <id> <outprefix>  -> <out>_poses.png (3 bodies x 6 poses) + <out>_close.png
import { grid, dressed, C } from './lib';
const [id, out] = process.argv.slice(2);
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['hurt', 0], ['victory', 0], ['cast', 0], ['charge', 0]];
const cells: C[] = [];
for (const body of ['male', 'female', 'bulky']) for (const [pose, frame] of poses) cells.push({ look: dressed(body, id), pose, frame });
grid(out + "_poses.png", cells, 6, 2);
const close: C[] = [];
for (const body of ['male', 'female', 'bulky']) close.push({ look: dressed(body, id), pose: 'idle', frame: 0 });
close.push({ look: dressed('male', id), pose: 'attack', frame: 1 });
grid(out + '_close.png', close, 4, 5, [-16, -16, 32, 40]);
