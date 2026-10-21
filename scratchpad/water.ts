import '/home/user/Ninja-Fantasy-Game/src/battle/maps';
import { getMap } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const m = getMap('river_forest');
const rows: string[] = [];
for (let z = 0; z < m.depthM; z += 1) {
  let r = '';
  for (let x = 0; x < m.widthM; x += 1) { const w = m.waterAt(x + 0.25, z + 0.25); r += w === 'deep' ? '#' : w === 'shallow' ? '~' : '.'; }
  rows.push(`${String(z).padStart(2)} ${r}`);
}
console.log(m.widthM, m.depthM);
console.log(rows.join('\n'));
