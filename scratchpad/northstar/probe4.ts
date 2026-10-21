import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { ninjaOptions } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
const shiori = LEGENDARY_PRESETS.map((p) => p.character).find((c) => c.clan === 'Northstar')!;
const { state: s } = createBattle({ seed: 1, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
  party: [{ character: { ...shiori, effects: [] } as any, pos: { x: 8, z: 10 }, controller: 'ai' }],
  enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'hunter', pos: { x: 15, z: 13 } }],
  stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } });
const u = s.units[shiori.id];
console.log(u.name, u.level, u.saveDC, u.jutsus, u.chakra);
for (const o of ninjaOptions(s, u).slice(0, 12)) console.log(o.intent.kind, o.intent.what, o.intent.target, o.value.toFixed(2));
