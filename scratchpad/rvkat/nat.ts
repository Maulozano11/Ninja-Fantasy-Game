import { buildKatana, NATURES } from '../old/katana-parts';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import { CHAKRA_CHOICES } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakraInfo';
const keys = ['J', 'R', 'H', 'N', 'E', 'W', 'b'];
const pairs: [string, string][] = [['fire', 'red'], ['water', 'blue'], ['lightning', 'yellow'], ['wind', 'green'], ['earth', 'orange']];
for (const [n, c] of pairs) {
  const a = buildKatana({ steel: 'c', blade: 'a', guard: 'a', hilt: 'a', nature: NATURES[n] }).colors;
  const hex = CHAKRA_CHOICES.find((x) => x.id === c)!.hex;
  const b = katanaTemplate({ steel: 'c' }, hex).colors;
  console.log(n, NATURES[n], 'vs chakra', c, hex, keys.map((k) => `${k}:${a[k]}/${b[k]}`).join(' '));
}
for (const c of ['black', 'white']) { const hex = CHAKRA_CHOICES.find((x) => x.id === c)!.hex; const b = katanaTemplate({ steel: 'c' }, hex).colors; console.log(c, keys.map((k) => `${k}:${b[k]}`).join(' ')); }
const kb = katanaTemplate({ steel: 'b' }, '#000').colors; console.log('kurogane', keys.map((k) => `${k}:${kb[k]}`).join(' '));
