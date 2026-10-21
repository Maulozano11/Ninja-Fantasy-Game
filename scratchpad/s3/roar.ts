import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { headOptions } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { ENCOUNTERS, encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HYDRA_ID } from '/home/user/Ninja-Fantasy-Game/src/battle/hydra';
import { dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const hero = (id: string) => ({ ...DEFAULT_CHARACTER, id, name: id, effects: [] });
const setup = encounterSetup('hydra', [hero('a'), hero('b'), hero('c')].map((character) => ({ character })), { seed: 3, difficulty: 'normal', supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
const { state } = createBattle(setup);
let refused = 0, tried = 0;
for (let i = 0; i < 7; i++) {
  const s = structuredClone(state);
  const head = s.units[`${HYDRA_ID}_head_${i}`];
  s.turn = s.order.indexOf(head.id);
  head.turn = { move: 0, action: true, bonus: true, reaction: true, moved: 0 };
  // One ninja right under the head, two in front of it.
  s.units.a.pos = { ...head.pos };
  s.units.b.pos = { x: head.pos.x - 2, z: head.pos.z };
  s.units.c.pos = { x: head.pos.x - 2.5, z: head.pos.z + 1 };
  head.intent = { kind: 'roar', what: 'hydra_roar', target: 'a', at: { ...head.pos } };
  const a = aiAction(s);
  tried++;
  const out = a ? applyAction(s, a) : null;
  if (out && !out.ok) refused++;
  console.log(head.id, JSON.stringify(a), out?.ok, out?.reason, 'opts', headOptions(s, head).slice(0, 2).map((o) => o.intent.kind + '>' + o.intent.target).join(','));
}
console.log('tried', tried, 'refused', refused);
