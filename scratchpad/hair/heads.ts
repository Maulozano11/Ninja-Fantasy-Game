// usage: heads.ts <out> id1,id2,... [body] [scale] [cols]
import { grid, dressed } from './lib';
import { HAIR_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair';
const [out, ids, body, sc, cols] = process.argv.slice(2);
const list = ids && ids !== 'all' ? ids.split(',') : HAIR_ITEMS.map((d) => d.id);
grid(out, list.map((id) => ({ look: dressed(body || 'male', id), pose: 'idle' as any, frame: 0 })), +(cols || 6), +(sc || 4), [-14, -14, 28, 26]);
