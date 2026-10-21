import { sheet, baseLook, Cell } from '../tools/sheet';
const out = process.argv[2];
const cells: Cell[] = [];
for (const held of ['held_crystal', 'held_katana', 'held_kunai'])
  for (const [pose, frame] of [['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 0]] as const)
    cells.push({ look: baseLook({ slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_sandals', colors: [] }, held: { id: held, colors: [] } } as any }), pose, frame });
sheet(out, cells, 8, 2);
