import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
const shiori = LEGENDARY_PRESETS.map((p) => p.character).find((c) => c.clan === 'Northstar')!;
let ended = 0, refused = 0, commands = 0, landed = 0, slowed = 0, joinedCount = 0;
const reasons: Record<string, number> = {};
for (let seed = 1; seed <= 40; seed++) {
  const thin = seed % 2 === 0;
  const ns = { ...shiori, effects: [], currentHp: shiori.maxHp, currentChakra: shiori.maxChakra, ...(thin ? { selectedJutsus: { ...shiori.selectedJutsus, slot1Utility: '', slot2Elemental: '', slot3Elemental: '', slot4Clan: '', slot5Ultimate: '' } } : {}) } as any;
  let { state: s } = createBattle({ seed, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
    party: [{ character: ns, pos: { x: 6, z: 9 }, controller: 'ai', aiOrder: seed % 3 === 0 ? 'support' : 'aggressive' }, { character: { ...HANA, effects: [] }, pos: { x: 5, z: 12 }, controller: 'ai', aiOrder: 'support' }, { character: { ...DEFAULT_CHARACTER, id: 'a', effects: [] }, pos: { x: 7, z: 14 }, controller: 'ai' }],
    enemies: [{ kind: 'raider', pos: { x: 18, z: 9 } }, { kind: 'raider', pos: { x: 19, z: 12 } }, { kind: 'hunter', pos: { x: 20, z: 10 } }, { kind: 'rogue', pos: { x: 21, z: 13 } }],
    stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } });
  let steps = 0, last = '', same = 0;
  while (s.phase === 'combat' && steps < 4000) {
    steps++;
    const a = aiAction(s);
    if (!a) break;
    const u = current(s)!;
    same = u.id === last ? same + 1 : 0; last = u.id;
    let out = applyAction(s, same > 6 ? { type: 'endTurn', unit: u.id } : a);
    if (!out.ok) { refused++; reasons[`${a.type}:${(a as any).jutsu ?? ''}:${out.reason}`] = (reasons[`${a.type}:${(a as any).jutsu ?? ''}:${out.reason}`] ?? 0) + 1; out = applyAction(s, { type: 'endTurn', unit: u.id }); }
    if (a.type === 'jutsu' && a.jutsu === 'northstar_command' && out.ok) commands++;
    for (const e of out.events) { if (e.t === 'command' && e.on) landed++; if (e.t === 'slowed') slowed++; if (e.t === 'joined') joinedCount++; }
    s = out.state;
  }
  if (s.phase === 'ended') ended++;
  else console.log('seed', seed, 'did not end', s.phase, steps);
}
console.log({ ended, refused, commands, landed, slowed, joinedCount, reasons });
