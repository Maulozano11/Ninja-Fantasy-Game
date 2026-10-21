// gallery.ts <slot> <outdir> [body] [pose] : writes one raw RGBA 128x128 per item + a list file
import { writeFileSync } from 'node:fs';
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const [slot, outdir, body = 'male', pose = 'idle'] = process.argv.slice(2);
const NEUTRAL: any = {
  hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
  top: { id: 'top_tee', colors: ['#3a4660'] },
  bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] },
  feet: { id: 'feet_sandals', colors: [] },
};
const names: string[] = [];
for (const def of itemsForSlot(slot as any)) {
  if (def.id.endsWith('_none')) continue;
  const slots: any = { ...NEUTRAL };
  let accessories: any[] = [];
  if (slot === 'accessory') accessories = [{ id: def.id, colors: [] }];
  else slots[slot] = { id: def.id, colors: [] };
  if (slot === 'armor' || slot === 'skirt') delete slots.top;
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots, accessories } as any), pose as any, pose === 'attack' ? 1 : 0);
  writeFileSync(`${outdir}/${def.id}.raw`, Buffer.from(f.rgba.buffer));
  names.push(`${def.id}|${def.name}`);
}
writeFileSync(`${outdir}/list.txt`, names.join('\n'));
