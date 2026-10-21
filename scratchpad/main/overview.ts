// overview.ts <slot> <outdir> : renders every item of a slot for a set of body/pose combos
import { writeFileSync } from 'node:fs';
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook } from '../shared/sheet';
const [slot, outdir] = process.argv.slice(2);
const combos: [string, string, number][] = [['male', 'idle', 0], ['female', 'idle', 0], ['bulky', 'idle', 0], ['male', 'attack', 1], ['male', 'attack', 2], ['male', 'cast', 0], ['female', 'victory', 0], ['bulky', 'charge', 0]];
const NEUTRAL: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] } };
const ids: string[] = [];
for (const def of itemsForSlot(slot as any)) {
  if (def.id.endsWith('_none')) continue;
  ids.push(def.id);
  for (const [body, pose, fr] of combos) {
    const slots: any = { ...NEUTRAL };
    let accessories: any[] = [];
    if (slot === 'accessory') accessories = [{ id: def.id, colors: [] }]; else slots[slot] = { id: def.id, colors: [] };
    if (slot === 'armor' || slot === 'skirt') delete slots.top;
    const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots, accessories } as any), pose as any, fr);
    writeFileSync(`${outdir}/${def.id}__${body}-${pose}${fr}.raw`, Buffer.from(f.rgba.buffer));
  }
}
writeFileSync(`${outdir}/items.txt`, ids.join(' '));
writeFileSync(`${outdir}/combos.txt`, combos.map(([b, p, f]) => `${b}-${p}${f}`).join(' '));
