import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getMap, hideSpotAt, waterAtPt, propRules, dist, cellBlocked, cellOf } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const s = createBattle({ seed: 1, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...DEFAULT_CHARACTER, id: 'a' }, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } }).state;
const m = getMap('river_forest');
console.log('map', m.widthM, 'units', JSON.stringify(Object.values(s.units).map((u) => [u.id, u.pos])));
console.log('jutsus', s.units.a.jutsus.join(','), 'clan', s.units.a.character?.clan, 'hp', s.units.a.hp);
m.props.forEach((p, i) => { const r = propRules(p); if (r.hp !== undefined && dist(p, { x: 10, z: 10 }) < 14) console.log('prop', i, p.group, p.name, p.x, p.z, r.hp, r.radius); });
const hides: string[] = []; const shallow: string[] = [];
for (let x = 0.25; x < 30; x += 0.5) for (let z = 0.25; z < 20; z += 0.5) {
  if (hideSpotAt(s, { x, z }) >= 0 && !cellBlocked(s, cellOf({ x, z })) && dist({ x, z }, { x: 10, z: 10 }) < 8) hides.push(`${x},${z}`);
  if (waterAtPt(s, { x, z }) === 1 && !cellBlocked(s, cellOf({ x, z }))) shallow.push(`${x},${z}`);
}
console.log('hides', hides.slice(0, 30).join(' '));
console.log('shallow', shallow.length, shallow.slice(0, 80).join(' '));
