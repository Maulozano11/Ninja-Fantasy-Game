import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { cellBlocked, cellOf, lineOfSight, waterAtPt, cellCenter, getMap } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const hero = { ...DEFAULT_CHARACTER, effects: [] };
console.log('clan', hero.clan, 'chakra', hero.currentChakra, hero.maxChakra, 'hp', hero.currentHp, 'dc', hero.jutsuSaveDC, 'jutsus', JSON.stringify(hero.selectedJutsus));
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...hero, id: 'm', clan: 'Mirai' }, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 20, z: 10 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
const m = getMap('river_forest');
console.log('map', m.widthM, m.depthM ?? '', 'm unit', JSON.stringify(state.units.m.pos), 'jutsus', state.units.m.jutsus, 'speed', state.units.m.speed, 'armed', state.units.m.armed);
console.log('rogue', JSON.stringify(state.units.rogue_0.intent), state.units.rogue_0.speed, state.units.rogue_0.hp, state.units.rogue_0.chakra, state.units.rogue_0.jutsus);
// find rows where a point at x and x+12 are free/dry and in LOS
const ok = (p: {x:number;z:number}) => !cellBlocked(state, cellOf(p)) && !waterAtPt(state, cellCenter(cellOf(p)));
for (let z = 1.25; z < 20; z += 0.5) {
  const xs: number[] = [];
  for (let x = 1.25; x < 30; x += 0.5) {
    const a = { x, z }, b = { x: x + 12, z }, c = { x: x + 12.5, z };
    if (ok(a) && ok(b) && ok(c) && lineOfSight(state, a, c)) xs.push(x);
  }
  if (xs.length) console.log('z', z, 'x', xs.slice(0, 6).join(','));
}
