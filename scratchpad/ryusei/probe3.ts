import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';

const hero = { ...DEFAULT_CHARACTER, effects: [], id: 'a' };
let refused: Record<string, number> = {};
let warps = 0, edges = 0, nodes = 0, ended = 0, total = 0, steps = 0;
for (let seed = 1; seed <= 40; seed++) {
  const { state } = createBattle({
    seed, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    party: [
      { character: hero, pos: { x: 6, z: 9 }, controller: 'ai', aiOrder: 'aggressive' },
      { character: { ...KENJI, effects: [] }, pos: { x: 5, z: 12 }, controller: 'ai', aiOrder: 'aggressive' },
      { character: { ...HANA, effects: [] }, pos: { x: 4, z: 10 }, controller: 'ai', aiOrder: 'support' },
    ],
    enemies: [
      { kind: 'hydra', pos: { x: 33, z: 8 } },
    ],
  });
  let s: BattleState = state;
  total++;
  let last = ''; let n = 0;
  for (let i = 0; i < 3000; i++) {
    const a = aiAction(s);
    if (!a) break;
    const u = current(s)!;
    n = u.id === last ? n + 1 : 0; last = u.id;
    const act = n > 6 ? { type: 'endTurn' as const, unit: u.id } : a;
    let out = applyAction(s, act);
    if (!out.ok) {
      const k = `${act.type}${act.type === 'jutsu' ? ':' + act.jutsu : ''}:${out.reason}`;
      refused[k] = (refused[k] ?? 0) + 1;
      out = applyAction(s, { type: 'endTurn', unit: u.id });
    }
    if (!out.ok) break;
    for (const e of out.events) {
      if (e.t === 'jutsu' && e.jutsu === 'ryusei_warp') warps++;
      if (e.t === 'note' && e.key === 'warpEdge') edges++;
      if (e.t === 'node' && e.on) nodes++;
    }
    s = out.state;
    steps++;
  }
  if (s.phase === 'ended') ended++;
  else console.log('seed', seed, 'did not end', s.phase, s.round);
}
console.log({ total, ended, warps, edges, nodes, steps, refused });
