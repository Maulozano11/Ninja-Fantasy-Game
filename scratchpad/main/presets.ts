import { sheet, Cell } from '../tools/sheet';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
const cells: Cell[] = LEGENDARY_PRESETS.map((p) => ({ look: p.character.appearance!, pose: (process.argv[3] || 'idle') as any, frame: 0, eye: dojutsuToEye(p.character.dojutsu) }));
sheet(process.argv[2], cells, 4, 3);
