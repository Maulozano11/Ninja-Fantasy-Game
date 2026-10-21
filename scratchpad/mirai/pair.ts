import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { goalOf, stepToward } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { cellCenter } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...DEFAULT_CHARACTER, effects: [], id: 'm', clan: 'Mirai' }, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 33, z: 10 } }, { kind: 'rogue', pos: { x: 33, z: 10.5 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
const r1 = state.units.rogue_1;
const naive = stepToward(state, r1, goalOf(state, r1, r1.intent!)!, r1.speed);
console.log('rogue_0', JSON.stringify(state.units.rogue_0.intent?.to), 'rogue_1', JSON.stringify(r1.intent?.to), 'rogue_1 without avoiding', JSON.stringify(naive && cellCenter(naive)));
