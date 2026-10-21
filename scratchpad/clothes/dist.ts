// dist.ts <slot> [bodies=male,female,bulky] [pose=idle]: main-color shade % per item, averaged over bodies
import { itemsForSlot } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, mixHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const slot = process.argv[2];
const bodies = (process.argv[3] || 'male,female,bulky').split(',');
const pose = process.argv[4] || 'idle';
const only = process.argv[5];
const NEUTRAL: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] } };
for (const def of itemsForSlot(slot as any)) {
  if (def.id.endsWith('_none')) continue;
  if (only && !def.id.includes(only)) continue;
  const tot6 = [0, 0, 0, 0, 0, 0];
  const per: string[] = [];
  for (const body of bodies) {
    const slots: any = { ...NEUTRAL, [slot]: { id: def.id, colors: [] } };
    if (slot === 'armor' || slot === 'skirt') delete slots.top;
    const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose as any, pose === 'attack' ? 1 : 0);
    const main = def.colors[0];
    const kind = (main as any).kind || 'cloth';
    const ramp = makeRamp(main.default, kind).map((h) => h.toLowerCase());
    ramp[0] = mixHex(ramp[0], '#07060b', 0.7).toLowerCase();
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 128 * 128; i++) { if (!f.rgba[i * 4 + 3]) continue; const h = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join(''); const k = ramp.indexOf(h); if (k >= 0) counts[k]++; }
    const t = counts.slice(1).reduce((a, b) => a + b, 0) || 1;
    per.push(body[0] + ':' + counts.slice(1).map((c) => Math.round((100 * c) / t)).join('/'));
    counts.forEach((c, i) => (tot6[i] += (100 * c) / t / bodies.length));
  }
  console.log(def.id.padEnd(18), 'avg 1-5:', tot6.slice(1).map((c) => String(Math.round(c)).padStart(3) + '%').join(' '), '  ', per.join('  '));
}
