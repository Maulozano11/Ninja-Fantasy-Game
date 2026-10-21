import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { cellOf } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const hero = { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] };
for (let seed = 1; seed < 6; seed++) {
  const { state } = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal', party: [{ character: hero, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 16, z: 13 } }], stealth: false, supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } });
  const s = structuredClone(state);
  s.turn = s.order.indexOf('rogue_0');
  s.units.rogue_0.turn = { move: 9, action: true, bonus: true, reaction: true, moved: 0 };
  s.units.a.pos = { x: 10.25, z: 10.25 }; s.units.a.controller = 'ai'; s.units.a.turn.reaction = true;
  s.units.rogue_0.pos = { x: 11.25, z: 10.25 };
  Object.assign(s.units.rogue_1, { pos: { x: 11.75, z: 10.25 }, hp: 0, down: 'downed' });
  s.seed = seed; s.units.rogue_0.hp = 1;
  const out = applyAction(s, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 13.25, z: 10.25 }) });
  console.log(seed, out.ok, out.reason, out.events.map((e) => e.t + (e.t === 'attack' ? (e.roll.success ? '+' : '-') : '')).join(' '), out.state.units.rogue_0.pos, out.state.units.rogue_0.down);
}
