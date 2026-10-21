import { getMap } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw-review/src/battle/map';
const m: any = getMap('river_forest');
console.log(Object.keys(m));
const rows: string[] = [];
for (let z = 0.25; z < 20; z += 0.5) {
  let row = z.toFixed(2).padStart(6) + ' ';
  for (let x = 0.25; x < 40; x += 0.5) {
    const w = m.waterAt ? m.waterAt(x, z) : '?';
    row += w === 'deep' ? '#' : w === 'shallow' ? '~' : w === 'none' ? '.' : String(w)[0];
  }
  rows.push(row);
}
console.log(rows.join('\n'));
