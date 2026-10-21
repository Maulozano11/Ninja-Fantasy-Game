// Probe: a hidden Ryusei warps out into the open in the fight and stays hidden (a walk there would reveal it).
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/src/types/shinobi';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { hideSpotAt } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { attackPreview } from '/home/user/Ninja-Fantasy-Game/src/battle/combat';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const st = createBattle({ seed: 7, mapId: 'river_forest', time: 'day', weather: 'Clear', difficulty: 'normal',
  party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Ryusei' }), pos: { x: 8, z: 10 } }],
  enemies: [{ kind: 'rogue', pos: { x: 20, z: 10 } }], stealth: false, supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }).state;
const s: BattleState = structuredClone(st);
s.turn = s.order.indexOf('a');
const a = s.units.a;
a.turn = { move: a.speed, action: true, bonus: true, reaction: true, moved: 0 };
a.cond.hidden = 30;
const g = s.units.rogue_0;
const at = { x: g.pos.x - 1, z: g.pos.z };
s.nodes.push({ id: 'n1', owner: 'a', pos: at });
const out = applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at });
const u = out.state.units.a;
console.log('warp ok', out.ok, 'landed', u.pos, 'hide spot there?', hideSpotAt(out.state, u.pos) >= 0, 'still hidden:', u.cond.hidden);
console.log('attack preview reasons', attackPreview(out.state, u, out.state.units.rogue_0, 'melee').reasons);
