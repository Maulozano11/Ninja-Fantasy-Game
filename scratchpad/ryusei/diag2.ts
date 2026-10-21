import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { planIntent, reachTo } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { ownNodes, warpBlocker, warpLanding } from '/home/user/Ninja-Fantasy-Game/src/battle/clans';
import { dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';

const hero = { ...DEFAULT_CHARACTER, effects: [], id: 'a' };
const stats: Record<string, number> = {};
const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
for (let seed = 1; seed <= 40; seed++) {
  const { state } = createBattle({
    seed, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    party: [
      { character: hero, pos: { x: 6, z: 9 }, controller: 'ai', aiOrder: 'defensive' },
      { character: { ...KENJI, effects: [] }, pos: { x: 5, z: 12 }, controller: 'ai', aiOrder: 'defensive' },
      { character: { ...HANA, effects: [] }, pos: { x: 4, z: 10 }, controller: 'ai', aiOrder: 'support' },
    ],
    enemies: [
      { kind: 'raider', pos: { x: 34, z: 9 } },
      { kind: 'raider', pos: { x: 36, z: 13 } },
      { kind: 'hunter', pos: { x: 30, z: 12 } },
    ],
  });
  let s: BattleState = state;
  for (let i = 0; i < 3000; i++) {
    const a = aiAction(s);
    if (!a) break;
    const u = current(s)!;
    if (u.turn.action && u.turn.bonus && u.turn.moved === 0 && u.character?.clan === 'Ryusei') {
      inc('ryuseiTurnStart');
      const intent = u.team === 'enemy' ? u.intent : planIntent(s, u);
      inc('intent:' + (intent?.kind ?? 'none'));
      const t = intent?.target ? s.units[intent.target] : undefined;
      if (t && t.team !== u.team) {
        const far = dist(u.pos, t.pos) > reachTo(u, t) + u.turn.move;
        if (far) inc('far');
        const nodes = ownNodes(s, u);
        if (far && nodes.length) {
          inc('farWithNodes');
          for (const n of nodes) {
            const why = warpBlocker(s, u, n);
            if (why) inc('blocker:' + why);
            else inc('landDist<' + Math.ceil(dist(warpLanding(s, u, n)!, t.pos)));
          }
        }
      }
    }
    const out0 = applyAction(s, a);
    const out = out0.ok ? out0 : applyAction(s, { type: 'endTurn', unit: u.id });
    if (!out.ok) break;
    s = out.state;
  }
}
console.log(stats);
