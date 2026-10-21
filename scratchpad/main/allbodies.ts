import { sheet, baseLook, Cell } from '../tools/sheet';
import { SPRITE_POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
const cells: Cell[] = [];
for (const body of ['male', 'female', 'bulky'] as const) for (const pose of SPRITE_POSES)
  cells.push({ look: baseLook({ body, skin: '#f3c39c', slots: { hair: { id: body === 'female' ? 'hair_midnight' : 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#2a3550'] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_sandals', colors: [] } } } as any), pose, frame: pose === 'attack' ? 1 : 0 });
sheet(process.argv[2], cells, 7, 2);
