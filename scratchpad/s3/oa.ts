import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { cellOf, dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { wielded } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
const hero = { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] };
const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: hero, pos: { x: 10.25, z: 10.25 } }], enemies: [{ kind: 'rogue', pos: { x: 11.25, z: 10.25 } }, { kind: 'rogue', pos: { x: 11.75, z: 10.25 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
const s = structuredClone(state);
s.units.a.pos = { x: 10.25, z: 10.25 };
s.units.rogue_0.pos = { x: 11.25, z: 10.25 };
s.units.rogue_1.pos = { x: 11.75, z: 10.25 };
s.units.rogue_1.hp = 0; s.units.rogue_1.down = 'downed';
s.turn = s.order.indexOf('rogue_0');
s.units.rogue_0.turn = { move: 9, action: true, bonus: true, reaction: true, moved: 0 };
s.units.a.turn.reaction = true;
console.log('reach', wielded(s.units.a).reach, 'controller', s.units.a.controller);
const out = applyAction(s, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 13.25, z: 10.25 }) });
console.log(out.ok, out.reason, 'pending', out.state.pending?.kind, 'mover at', out.state.units.rogue_0.pos, 'downed ally at', out.state.units.rogue_1.pos);
if (out.state.pending) {
  for (const take of [true, false]) {
    const r = applyAction(out.state, { type: 'react', unit: 'a', take });
    console.log('take', take, r.ok, 'mover', r.state.units.rogue_0.pos, r.state.units.rogue_0.down ?? 'up');
  }
}
