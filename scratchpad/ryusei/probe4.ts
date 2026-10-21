// Raiders against a party that holds still (the player ends every turn): do they warp in?
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
const stats: Record<string, number> = {};
const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
for (let seed = 1; seed <= 30; seed++) {
  let s: BattleState = createBattle({
    seed, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    party: [
      { character: { ...DEFAULT_CHARACTER, effects: [], id: 'a' }, pos: { x: 6, z: 9 } },
      { character: { ...HANA, effects: [] }, pos: { x: 4, z: 12 } },
    ],
    enemies: [{ kind: 'raider', pos: { x: 24, z: 9 } }, { kind: 'raider', pos: { x: 26, z: 13 } }],
  }).state;
  for (let i = 0; i < 400 && s.phase !== 'ended'; i++) {
    const u = current(s)!;
    let a = aiAction(s);
    if (!a) {
      if (s.pending) a = { type: 'react', unit: s.pending.reactor, take: false };
      else a = { type: 'endTurn', unit: u.id };
    }
    let out = applyAction(s, a);
    if (!out.ok) { inc('refused:' + a.type + ':' + out.reason); out = applyAction(s, { type: 'endTurn', unit: u.id }); }
    if (!out.ok) break;
    for (const e of out.events) {
      if (e.t === 'jutsu' && e.jutsu === 'ryusei_warp') inc('warp');
      if (e.t === 'note' && e.key === 'warpEdge') inc('edge');
      if (e.t === 'attack' && s.units[e.unit]?.cond.warpEdge) inc('edgeAttack');
    }
    s = out.state;
    if (i > 300) inc('long');
  }
  inc(s.phase === 'ended' ? 'ended' : 'notEnded');
}
console.log(stats);
