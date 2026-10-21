import { sheet, baseLook, Cell } from '../tools/sheet';
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
const out = process.argv[2];
const cells: Cell[] = itemsForSlot('hair').map((d) => ({ look: baseLook({ slots: { hair: { id: d.id, colors: [] }, top: { id: 'top_tee', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_shinobi', colors: [] } } as any }), pose: 'idle', frame: 0 }));
sheet(out, cells, 7, 2);
