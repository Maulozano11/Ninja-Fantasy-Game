import * as P from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
const p = P.allPieces().find((q) => q.name === process.argv[2])!;
const img = p.img;
const x0 = Number(process.argv[3] ?? 0), x1 = Number(process.argv[4] ?? img.w);
const cols = new Map<string, string>();
const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
for (let y = 0; y < img.h; y++) {
  let row = '';
  for (let x = x0; x < x1; x++) {
    const c = img.get(x, y);
    if (!c[3]) { row += '.'; continue; }
    const k = c.slice(0, 3).join(',');
    if (!cols.has(k)) cols.set(k, keys[cols.size]);
    row += cols.get(k);
  }
  console.log(String(y).padStart(2) + ' ' + row);
}
console.log([...cols].map(([k, v]) => `${v}=${k}`).join('  '));
