import { grid, dressed, C } from './lib';
import { HAIR_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair';
const [out, body] = process.argv.slice(2);
grid(out, HAIR_ITEMS.map((d) => ({ look: dressed(body || 'male', d.id), pose: 'idle' as any, frame: 0 })), 6, 2);
