// Which poses push the held katana to the frame's edge (clipped), for each body type.
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { DEFAULT_CHARACTER } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const base = DEFAULT_CHARACTER.appearance!;
const POSES = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'lean', 'sit', 'read', 'train'] as const;
for (const held of [process.argv[2]]) for (const body of ['male', 'female', 'bulky', 'slender'] as const) {
  const look: any = { ...base, body, slots: { ...base.slots, held: { id: held, colors: [], parts: { blade: 'b', hilt: 'b' } } } };
  const hits: string[] = [];
  for (const pose of POSES) for (let f = 0; f < 8; f++) {
    const a = renderSpriteCached(look, pose as any, f).rgba;
    let edge = 0;
    for (let i = 0; i < 128; i++) for (const [x, y] of [[i, 0], [i, 127], [0, i], [127, i]]) if (a[(y * 128 + x) * 4 + 3] > 0) edge++;
    if (edge) hits.push(`${pose}${f}:${edge}`);
  }
  console.log(held, body, hits.join(' '));
}
