import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
const p = allPieces().find((q) => q.name === 'lower_plaque')!;
const pal = new Map<string, string>(); let k = 0; const keys = 'abcdefghijklmnopqrstuvwxyz0123456789';
for (let y = 0; y < p.img.h; y++) {
  let s = '';
  for (let x = 0; x < 48; x++) {
    const c = p.img.get(x, y);
    if (c[3] === 0) { s += '.'; continue; }
    const h = c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
    if (!pal.has(h)) pal.set(h, keys[k++]);
    s += pal.get(h);
  }
  console.log(s);
}
console.log([...pal].map(([h, c]) => `${c}=#${h}`).join(' '));
