import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { DEFAULT_CHARACTER, clanName, CLANS_DATA } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
console.log('KENJI', KENJI.clan, KENJI.maxHp, KENJI.maxChakra, 'HANA', HANA.clan, HANA.maxHp, HANA.maxChakra);
console.log(DEFAULT_CHARACTER.clan, clanName('Koton'), Object.keys(CLANS_DATA));
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: { ...DEFAULT_CHARACTER, id: 'a', effects: [] }, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'hunter', pos: { x: 16, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 13 } }, { kind: 'jonin', pos: { x: 16, z: 13 } }], stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } });
for (const u of Object.values(state.units)) console.log(u.id, u.character?.clan, u.rank, u.maxHp, u.maxChakra);
