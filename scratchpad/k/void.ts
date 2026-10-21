import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
for (const hex of ['#1a0b22', '#f4f1e4', '#e8321e']) {
  const t = katanaTemplate({ steel: 'c', blade: 'a', guard: 'a', hilt: 'a' }, hex);
  console.log(hex, JSON.stringify({ M: t.colors.M, J: t.colors.J, R: t.colors.R, H: t.colors.H, N: t.colors.N, E: t.colors.E, W: t.colors.W, o: t.colors.o }));
  // which chars neighbour 'N' cells?
  const nb = new Map<string, number>();
  const rows = t.rows;
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) if (rows[y][x] === 'N')
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const c = rows[y+dy]?.[x+dx] ?? '.'; nb.set(c, (nb.get(c) ?? 0) + 1); }
  console.log(' N neighbours', JSON.stringify([...nb]));
  if (hex === '#1a0b22') for (const r of rows.slice(4, 16)) console.log('  ' + r.slice(20));
}
