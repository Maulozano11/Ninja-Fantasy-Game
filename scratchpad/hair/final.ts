import { grid, dressed, C } from './lib';
import { HAIR_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair';
const H = process.argv[2];
// 1) catalog: all styles, male idle, full body
grid(H + '/hair_catalog.png', HAIR_ITEMS.map((d) => ({ look: dressed('male', d.id), pose: 'idle' as any, frame: 0 })), 6, 2, [-22, -16, 44, 62]);
// 2) female & bulky, a few poses
const ids = ['hair_long', 'hair_pony', 'hair_buns', 'hair_bob', 'hair_silver', 'hair_warlord', 'hair_storm', 'hair_midnight'];
const cells: C[] = [];
for (const id of ids) {
  cells.push({ look: dressed('female', id), pose: 'idle', frame: 0 });
  cells.push({ look: dressed('female', id), pose: 'attack', frame: 1 });
  cells.push({ look: dressed('bulky', id), pose: 'idle', frame: 0 });
  cells.push({ look: dressed('bulky', id), pose: 'victory', frame: 0 });
}
grid(H + '/hair_bodies.png', cells, 8, 2, [-22, -16, 44, 62]);
// 3) head close-ups
grid(H + '/hair_heads.png', HAIR_ITEMS.map((d) => ({ look: dressed('male', d.id), pose: 'idle' as any, frame: 0 })), 5, 4, [-14, -14, 28, 26]);
