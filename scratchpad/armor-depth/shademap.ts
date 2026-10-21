// shademap.ts <itemId> [body=male] [pose=idle] [x0,y0,w,h]
// Prints the frame as text: digits 0-5 = item color 1 shade, a-f = color 2, A-F = color 3, '-' = other pixel, ' ' = empty.
// Also prints the shade distribution (1..5) of each item color.
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { makeRamp, mixHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
import { baseLook } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
const [id0, body = 'male', pose = 'idle', crop = '28,30,72,64'] = process.argv.slice(2);
const [id, ...cols] = id0.split(':');
const def = getItem(id)!;
const NEUTRAL: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] } };
const slots: any = { ...NEUTRAL, [def.slot]: { id, colors: cols.map((c) => '#' + c) } };
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose as any, pose === 'attack' ? 1 : 0);
const hexes = def.colors.map((c, i) => (cols[i] ? '#' + cols[i] : c.default));
const ramps = def.colors.map((c, i) => {
  const r = makeRamp(hexes[i], (c as any).kind || 'cloth').map((h) => h.toLowerCase());
  r[0] = mixHex(r[0], '#07060b', 0.7).toLowerCase();
  return r;
});
const chars = ['012345', 'abcdef', 'ABCDEF'];
const [x0, y0, w, h] = crop.split(',').map(Number);
const counts = ramps.map(() => [0, 0, 0, 0, 0, 0]);
const lines: string[] = [];
for (let y = 0; y < 128; y++) {
  let s = '';
  for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    let ch = ' ';
    if (f.rgba[i + 3]) {
      const hx = '#' + [0, 1, 2].map((k) => f.rgba[i + k].toString(16).padStart(2, '0')).join('');
      ch = '-';
      for (let m = 0; m < ramps.length && m < 3; m++) {
        const k = ramps[m].indexOf(hx);
        if (k >= 0) {
          ch = chars[m][k];
          counts[m][k]++;
          break;
        }
      }
    }
    if (x >= x0 && x < x0 + w) s += ch;
  }
  if (y >= y0 && y < y0 + h) lines.push(String(y).padStart(3) + ' ' + s);
}
console.log('    ' + Array.from({ length: w }, (_, i) => ((x0 + i) % 10).toString()).join(''));
console.log(lines.join('\n'));
counts.forEach((c, m) => {
  const tot = c.slice(1).reduce((a, b) => a + b, 0) || 1;
  console.log(def.colors[m].key.padEnd(8), String(tot).padStart(5), 'px 1-5:', c.slice(1).map((v) => String(Math.round((100 * v) / tot)).padStart(3) + '%').join(' '));
});
