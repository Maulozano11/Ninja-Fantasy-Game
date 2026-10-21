import { sheet, baseLook, Cell } from './sheet';
import { SPRITE_POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
const out = process.argv[2];
const cells: Cell[] = [];
for (const body of ['male', 'female', 'bulky'] as const)
  for (const pose of SPRITE_POSES) cells.push({ look: baseLook({ body }), pose, frame: pose === 'attack' ? 1 : 0 });
sheet(out, cells, 7, 2);
