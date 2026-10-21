import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { cellOf, gridFor, idx, cellBlocked, waterAtPt, levelAtPt } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { reachable } from '/home/user/Ninja-Fantasy-Game/src/battle/nav';
const hero = (o: any = {}) => ({ ...DEFAULT_CHARACTER, effects: [], ...o });
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
  party: [{ character: hero({ id: 'a' }), pos: { x: 8, z: 10 } }, { character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 18, z: 12 } }],
  enemies: [{ kind: 'rogue', pos: { x: 6, z: 18 } }], stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } });
const s = state;
const r = reachable(s, s.units.a, 18);
const g = gridFor(s.mapId);
for (let x = 8.25; x <= 30; x += 0.5) {
  const p = { x, z: 10.25 };
  const c = cellOf(p);
  console.log(x, r.cost.get(idx(g, c))?.toFixed(2), cellBlocked(s, c), waterAtPt(s, p), levelAtPt(s, p));
}
