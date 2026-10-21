import { buildKatana, NATURES } from './old/katana-parts';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
const P = ['a', 'b', 'c'] as const;
const natures = [...Object.values(NATURES), '#36a0f0', '#e8321e', '#000000', '#ffffff', '#123456'];
let n = 0, bad = 0;
for (const nature of natures)
  for (const steel of P) for (const blade of P) for (const guard of P) for (const hilt of P) {
    const o = buildKatana({ steel, blade, guard, hilt, nature });
    const t = katanaTemplate({ steel, blade, guard, hilt }, nature);
    n++;
    const a = JSON.stringify({ r: o.rows, p: o.pivot, c: o.colors });
    const b = JSON.stringify({ r: t.rows, p: t.pivot, c: t.colors });
    if (a !== b) { bad++; if (bad < 5) console.log('DIFF', nature, steel, blade, guard, hilt); }
    // colours key order irrelevant but compare sorted too
    const keys = new Set([...Object.keys(o.colors), ...Object.keys(t.colors)]);
    for (const k of keys) if (o.colors[k] !== t.colors[k]) console.log('col', k, o.colors[k], t.colors[k]);
  }
console.log('compared', n, 'bad', bad);
// cache aliasing: call twice with different nature on steel a
const x1 = katanaTemplate({ steel: 'c' }, '#ff0000'); const x2 = katanaTemplate({ steel: 'c' }, '#ff0000');
console.log('same obj', x1 === x2);
