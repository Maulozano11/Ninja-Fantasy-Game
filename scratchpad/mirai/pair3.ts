import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { goalOf, stepToward } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { cellCenter } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...DEFAULT_CHARACTER, effects: [], id: 'm', clan: 'Mirai' }, pos: { x: 7, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 19, z: 9.5 } }, { kind: 'rogue', pos: { x: 21, z: 13 } }, { kind: "raider", pos: { x: 22, z: 10.5 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
for (const id of ['rogue_0', 'rogue_1', 'raider_0']) {
  const b = state.units[id];
  const g = goalOf(state, b, b.intent!);
  const naive = g && stepToward(state, b, g, b.speed);
  console.log(id, JSON.stringify(b.pos), JSON.stringify(b.intent), 'naive', JSON.stringify(naive && cellCenter(naive)));
}
