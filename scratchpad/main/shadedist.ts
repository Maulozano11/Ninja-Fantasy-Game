// shadedist.ts <slot> : for each item in the slot, % of its main-color pixels at shades 1..5 (idle, male).
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, mixHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook } from '../tools/sheet';
const slot = process.argv[2];
const NEUTRAL: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] } };
const hex2 = (h: string) => h.toLowerCase();
for (const def of itemsForSlot(slot as any)) {
  if (def.id.endsWith('_none')) continue;
  const slots: any = { ...NEUTRAL, [slot]: { id: def.id, colors: [] } };
  if (slot === 'armor' || slot === 'skirt') delete slots.top;
  const f = renderSprite(baseLook({ skin: '#f3c39c', slots } as any), 'idle', 0);
  const main = def.colors[0];
  const kind = (main as any).kind || (slot === 'hair' ? 'hair' : 'cloth');
  const ramp = makeRamp(main.default, kind).map(hex2);
  ramp[0] = mixHex(ramp[0], '#07060b', 0.7).toLowerCase();
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 128 * 128; i++) { if (!f.rgba[i * 4 + 3]) continue; const h = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join(''); const k = ramp.indexOf(h); if (k >= 0) counts[k]++; }
  const tot = counts.slice(1).reduce((a, b) => a + b, 0) || 1;
  console.log(def.id.padEnd(18), String(tot).padStart(5), 'px  1-5:', counts.slice(1).map((c) => String(Math.round((100 * c) / tot)).padStart(3) + '%').join(' '));
}
