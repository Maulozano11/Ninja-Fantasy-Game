import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { goalOf, stepToward } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { cellCenter, cellOf, sameCell } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const hits: string[] = [];
for (const k2 of ['rogue', 'raider'] as const) for (let x = 24; x <= 36 && hits.length < 6; x += 2) for (let z = 4; z <= 16 && hits.length < 6; z += 2) {
  const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...DEFAULT_CHARACTER, effects: [], id: 'm', clan: 'Mirai' }, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 30, z: 10 } }, { kind: k2, pos: { x, z } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
  const a = state.units.rogue_0; const b = state.units[k2 === 'rogue' ? 'rogue_1' : 'raider_0'];
  if (!a.intent?.to || !b.intent?.to) continue;
  const g = goalOf(state, b, b.intent);
  const naive = g && stepToward(state, b, g, b.speed);
  if (naive && sameCell(naive, cellOf(a.intent.to))) hits.push(`${k2} ${x},${z} a.to=${JSON.stringify(a.intent.to)} b.to=${JSON.stringify(b.intent.to)} naive=${JSON.stringify(cellCenter(naive))}`);
}
console.log(hits.join('\n') || 'none');
