// Probe: an enemy knocked prone picks a move with its whole movement; standing up costs half first, so the engine refuses.
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/src/types/shinobi';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction, runAi } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
let refused = 0;
let tried = 0;
for (const x of [16, 18, 20, 22, 24]) {
  const st = createBattle({ seed: 3, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'raider', pos: { x, z: 10 } }], stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }).state;
  const s: BattleState = structuredClone(st);
  s.turn = s.order.indexOf('raider_0');
  const r = s.units.raider_0;
  r.turn = { move: r.speed, action: true, bonus: true, reaction: true, moved: 0 };
  r.cond.prone = true;
  const a = aiAction(s)!;
  if (a.type !== 'move') continue;
  tried++;
  const out = applyAction(s, a);
  if (!out.ok) refused++;
  const ran = runAi(s, 20);
  const acted = ran.events.some((e) => e.t === 'move' && e.unit === 'raider_0');
  console.log(`raider at x=${x}: AI move ${JSON.stringify(a.to)} -> ok=${out.ok} ${out.reason ?? ''}; in runAi it moved at all: ${acted}`);
}
console.log({ tried, refused });
