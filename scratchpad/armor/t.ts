import { sheet, baseLook, Cell } from '../tools/sheet';
// usage: t.ts out.png armorId skirtId [scale] [colorsJSON]
const [out, armor, skirt, sc, colJ] = process.argv.slice(2);
const cols = colJ ? JSON.parse(colJ) : {};
const slots: any = {
  hair: { id: 'hair_raven', colors: ['#2a2230'] },
  top: { id: 'top_highcollar', colors: ['#1e2433', '#1e2433'] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
if (armor && armor !== '-') slots.armor = { id: armor, colors: cols.armor || [] };
if (skirt && skirt !== '-') slots.skirt = { id: skirt, colors: cols.skirt || [] };
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['cast', 0], ['victory', 0], ['charge', 0], ['hurt', 0], ['handsigns', 0]];
const cells: Cell[] = [];
for (const body of ['male', 'female', 'bulky'] as const)
  for (const [pose, frame] of poses) cells.push({ look: baseLook({ body, slots }), pose, frame });
sheet(out, cells, poses.length, +(sc || 4));
