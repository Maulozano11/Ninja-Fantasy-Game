import { sheet, baseLook, Cell } from '../tools/sheet';
const out = process.argv[2];
const slots: any = { hair: { id: 'hair_sunburst', colors: [] }, top: { id: 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
const cells: Cell[] = [];
const positions = [['forehead', false, true, 'crescent'], ['forehead', true, false, 'bolt'], ['neck', false, true, 'wave'], ['arm', false, true, 'peak'], ['waist', false, true, 'sun']] as const;
for (const body of ['male', 'female', 'bulky'] as const)
  for (const [position, slashed, tails, emblem] of positions)
    cells.push({ look: baseLook({ body, slots, headband: { position, slashed, tails, emblem, cloth: '#1e3a8a', plate: '#cbd5e1' } as any }), pose: 'idle', frame: 0 });
sheet(out, cells, 5, 4);
