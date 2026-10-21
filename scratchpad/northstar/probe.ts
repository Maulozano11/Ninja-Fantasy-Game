import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
import { saveMod } from '/home/user/Ninja-Fantasy-Game/src/battle/combat';
const hero = (o: any = {}) => ({ ...DEFAULT_CHARACTER, effects: [], ...o });
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
  party: [{ character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 8, z: 10 } }],
  enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 14, z: 13 } }, { kind: 'jonin', pos: { x: 16, z: 13 } }, { kind: 'hunter', pos: { x: 16, z: 8 } }], stealth: false,
  supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } });
const n = state.units.n;
console.log('hero', n.level, n.saveDC, n.speed, n.chakra, n.jutsus, n.weapon, n.stats);
for (const id of ['raider_0', 'rogue_0', 'jonin_0', 'hunter_0']) { const u = state.units[id]; console.log(id, u.level, u.stats.wis, saveMod(u, 'wis'), u.weapon.dice, u.speed, u.chakra, u.character?.shinobiClass); }
console.log(JUTSU.body_flicker);
