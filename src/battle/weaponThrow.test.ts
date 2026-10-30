// Weapon Throw, a Ryusei's (the owner, 2026-10-28: "una nueva habilidad que sea lanzar arma y que se
// teletransporte a su arma"; engine.ts weaponThrow, docs/CLANS_DESIGN.md Ryusei): the weapon in hand
// thrown at a foe in sight, the Ryusei after it as light, catching it beside the foe. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
import { canStop } from './nav';
import { ownNodes, WEAPON_THROW } from './clans';
import { JUTSU } from './jutsu';
import { logLine } from '../components/battle/battleLog';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Ryusei' }), pos: { x: 6, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...over,
  };
}

type Out = ReturnType<typeof applyAction>;
const ok = (out: Out) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

function place(s: BattleState, id: string, p: Pt): void {
  const u = s.units[id];
  for (let r = 0; r < 4; r += 0.5) {
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (cellBlocked(s, c) || waterAtPt(s, cellCenter(c)) || !canStop(s, u, c)) continue;
      u.pos = cellCenter(c);
      return;
    }
  }
  throw new Error('no free cell');
}

/** Aki's turn, the rogue `far` meters east of her, both on open ground. */
function ready(far = 8): BattleState {
  const s = createBattle(setup()).state;
  place(s, 'a', { x: 6, z: 10 });
  place(s, 'rogue_0', { x: s.units.a.pos.x + far, z: s.units.a.pos.z });
  s.turn = s.order.indexOf('a');
  const a = s.units.a;
  a.turn = { move: a.speed, action: true, bonus: true, reaction: true, moved: 0 };
  a.chakra = 20;
  return s;
}

const throwAt = (s: BattleState) => applyAction(s, { type: 'jutsu', unit: 'a', jutsu: WEAPON_THROW, at: { ...s.units.rogue_0.pos }, target: 'rogue_0' });

describe('Weapon Throw (a Ryusei)', () => {
  it('every Ryusei has it, after its other abilities; 12 m, an action, 2 chakra', () => {
    const s = ready();
    assert.ok(s.units.a.jutsus.includes(WEAPON_THROW));
    assert.equal(JUTSU[WEAPON_THROW].range, 12);
    assert.equal(JUTSU[WEAPON_THROW].cast, 'action');
    assert.equal(JUTSU[WEAPON_THROW].cost, 2);
    const other = createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Mirai' }), pos: { x: 6, z: 10 } }] })).state;
    assert.ok(!other.units.a.jutsus.includes(WEAPON_THROW));
  });

  it('the weapon flies at the foe and the Ryusei lands beside it holding it: a teleport, a roll, a Node', () => {
    const s = ready(8);
    const from = { ...s.units.a.pos };
    const out = ok(throwAt(s));
    const a = out.state.units.a;
    const kinds = out.events.map((e) => e.t);
    // the throw, then the crossing, then the roll lands (the screen plays the comet and the catch)
    assert.ok(kinds.indexOf('jutsu') < kinds.indexOf('teleport'));
    assert.ok(kinds.indexOf('teleport') < kinds.indexOf('attack'));
    const tp = out.events.find((e): e is Extract<BattleEvent, { t: 'teleport' }> => e.t === 'teleport')!;
    assert.equal(tp.how, 'phase');
    assert.deepEqual(tp.from, from);
    assert.ok(dist(a.pos, out.state.units.rogue_0.pos) <= 1.6, 'beside the foe');
    assert.ok(a.armed && a.weapon.held, 'the weapon caught back');
    assert.equal(a.chakra, 18);
    assert.equal(a.turn.action, false);
    assert.equal(a.turn.bonus, true, 'the bonus action is still there');
    assert.equal(a.turn.move, a.speed, 'no movement spent');
    assert.ok(a.cond.warpEdge, 'its next attack this turn comes from behind');
    assert.equal(ownNodes(out.state, a).length, 1, 'a Node where the weapon landed');
    const atk = out.events.find((e): e is Extract<BattleEvent, { t: 'attack' }> => e.t === 'attack')!;
    assert.equal(atk.what, a.weapon.name);
    const line = logLine(out.events.find((e) => e.t === 'jutsu')!, out.state, 'es');
    assert.ok(line && line.text.includes('Lanzar arma'), line?.text);
  });

  it('a hit deals the weapon’s die and its modifier (a foe without its reaction)', () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = ready(8);
      s.seed = seed;
      // (a Bukijutsu Master foe could deflect it with its reaction, as a kunai: reactions.test.ts)
      s.units.rogue_0.turn.reaction = false;
      const out = ok(throwAt(s));
      const atk = out.events.find((e): e is Extract<BattleEvent, { t: 'attack' }> => e.t === 'attack')!;
      if (!atk.roll.success) continue;
      assert.ok(out.events.some((e) => e.t === 'damage' && e.unit === 'rogue_0'), out.events.map((e) => e.t).join(' '));
      return;
    }
    assert.fail('no seed hits');
  });

  it('refused out of range, at a friend, without a weapon in hand, or without chakra', () => {
    assert.equal(throwAt(ready(13)).reason, 'outOfRange');
    const bare = ready(8);
    bare.units.a.weapon = { ...bare.units.a.weapon, held: false };
    assert.equal(throwAt(bare).reason, 'noBlade');
    const broke = ready(8);
    broke.units.a.chakra = 1;
    assert.equal(throwAt(broke).reason, 'noChakra');
  });

  it('Shooting-Star Thrust needs no Node: aimed at a foe it lands beside it, aimed at the ground it lands there', () => {
    const s = ready(10);
    assert.equal(ownNodes(s, s.units.a).length, 0);
    const at = applyAction(structuredClone(s), { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { ...s.units.rogue_0.pos }, target: 'rogue_0' });
    ok(at);
    assert.ok(dist(at.state.units.a.pos, at.state.units.rogue_0.pos) <= 1.6, 'beside the foe');
    assert.ok(at.state.units.a.cond.warpEdge, 'from behind');
    assert.equal(at.state.nodes.length, 0, 'no Node left behind by the thrust');
    const spot = { x: s.units.a.pos.x + 4, z: s.units.a.pos.z };
    const ground = ok(applyAction(structuredClone(s), { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: spot }));
    assert.ok(dist(ground.state.units.a.pos, spot) < 0.8, 'on the spot');
    assert.equal(applyAction(structuredClone(s), { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: s.units.a.pos.x + 19, z: s.units.a.pos.z } }).reason, 'outOfRange');
  });
});
