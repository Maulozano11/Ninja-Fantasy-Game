// dist.ts <id[:hex...]>... : main-color shade distribution (1..5) per body (idle), plus every color's distribution on male.
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, mixHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const NEUTRAL: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] } };
const fmt = (c: number[]) => {
  const tot = c.slice(1).reduce((a, b) => a + b, 0) || 1;
  return String(tot).padStart(5) + 'px ' + c.slice(1).map((v) => String(Math.round((100 * v) / tot)).padStart(3) + '%').join(' ');
};
for (const arg of process.argv.slice(2)) {
  const [id, ...cols] = arg.split(':');
  const def = getItem(id)!;
  const hexes = def.colors.map((c, i) => (cols[i] ? '#' + cols[i] : c.default));
  const ramps = def.colors.map((c, i) => {
    const r = makeRamp(hexes[i], (c as any).kind || 'cloth').map((h) => h.toLowerCase());
    r[0] = mixHex(r[0], '#07060b', 0.7).toLowerCase();
    return r;
  });
  const out: string[] = [];
  for (const body of ['male', 'female', 'bulky']) {
    const slots: any = { ...NEUTRAL, [def.slot]: { id, colors: hexes } };
    const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), 'idle', 0);
    const counts = ramps.map(() => [0, 0, 0, 0, 0, 0]);
    for (let i = 0; i < 128 * 128; i++) {
      if (!f.rgba[i * 4 + 3]) continue;
      const hx = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
      for (let m = 0; m < ramps.length; m++) {
        const k = ramps[m].indexOf(hx);
        if (k >= 0) {
          counts[m][k]++;
          break;
        }
      }
    }
    if (body === 'male') counts.forEach((c, m) => out.push(`  male   ${def.colors[m].key.padEnd(8)} ${fmt(c)}`));
    else out.push(`  ${body.padEnd(6)} ${def.colors[0].key.padEnd(8)} ${fmt(counts[0])}`);
  }
  console.log(id + (cols.length ? ' ' + cols.join(',') : ''));
  console.log(out.join('\n'));
}
