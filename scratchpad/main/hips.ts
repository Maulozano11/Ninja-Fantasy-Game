import { sheet, baseLook, Cell } from '../tools/sheet';
const out = process.argv[2];
const cells: Cell[] = [];
for (const body of ['male', 'female', 'bulky'] as const) {
  for (const slots of [
    { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#2b2b33'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b2b33', '#2b2b33'] }, feet: { id: 'feet_leather', colors: ['#1d1d24', '#111'] } },
    { hair: { id: 'hair_midnight', colors: ['#2f3c54'] } },
  ] as any[])
    for (const pose of ['idle', 'attack'] as const) cells.push({ look: baseLook({ body, slots }), pose, frame: pose === 'attack' ? 1 : 0 });
}
sheet(out, cells, 4, 3);
