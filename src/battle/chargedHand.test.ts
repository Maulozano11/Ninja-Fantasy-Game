// The activated Chidori (the owner, 2026-10-21; docs/GAMEPLAY_DESIGN.md, "The Chidori becomes an
// activated state"): a bonus action charges the hand for up to 3 rounds, the blow goes off by itself
// within reach of the first foe the ninja moves to, and the ground cracks under its steps into
// difficult terrain for one turn. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { applyAction, createBattle } from './engine';
import { runAi } from './ai';
import { cellOf } from './map';
import { crackKey, stepCost } from './nav';
import type { Action, BattleEvent, BattleState, Cell } from './types';

const CHIDORI = 'chidori_lightning_blade';

/** A's turn, beside nothing: a rogue `gap` meters to the right. */
function setup(gap = 6, seed = 5): BattleState {
  const b = createBattle({
    seed,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] }, pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 8 + gap, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
  });
  const s = structuredClone(b.state);
  s.turn = s.order.indexOf('a');
  const u = s.units.a;
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  u.jutsus = [...u.jutsus, CHIDORI];
  u.chakra = 20;
  u.speed = 9;
  u.turn.move = 9;
  return s;
}

const foeOf = (s: BattleState) => Object.values(s.units).find((x) => x.team === 'enemy')!;

function act(s: BattleState, a: Action): { state: BattleState; events: BattleEvent[] } {
  const out = applyAction(s, a);
  assert.ok(out.ok, out.reason);
  return out;
}

const charge = (s: BattleState, enhanced = false) => act(s, { type: 'jutsu', unit: 'a', jutsu: CHIDORI, at: { ...s.units.a.pos }, enhanced });

/** A cell `dx` meters right of a point. */
const cellAt = (s: BattleState, dx: number): Cell => cellOf({ x: s.units.a.pos.x + dx, z: s.units.a.pos.z });

describe('the activated Chidori', () => {
  it('is a bonus action that pays its chakra and keeps the action; one charge at a time', () => {
    const s = setup();
    const out = charge(s);
    const u = out.state.units.a;
    assert.equal(u.chakra, 15, 'its chakra (5) is paid on activation');
    assert.equal(u.turn.bonus, false);
    assert.equal(u.turn.action, true, 'the action stays free');
    assert.deepEqual(u.charged, { jutsu: CHIDORI, enhanced: false, rounds: 3 });
    assert.ok(out.events.some((e) => e.t === 'charged' && e.on));
    assert.ok(!out.events.some((e) => e.t === 'jutsu'), 'nothing struck: no foe in reach');
    const again = structuredClone(out.state);
    again.units.a.turn.bonus = true;
    const no = applyAction(again, { type: 'jutsu', unit: 'a', jutsu: CHIDORI, at: { ...u.pos } });
    assert.equal(no.reason, 'alreadyCharged');
  });

  it('goes off by itself the moment the ninja walks within reach: one melee jutsu attack, then the walk stops and the charge ends', () => {
    const s = charge(setup(6)).state;
    const foe = foeOf(s);
    // Walk past the foe: the walk would end beyond it.
    const out = act(s, { type: 'move', unit: 'a', to: cellAt(s, 4.5) });
    const u = out.state.units.a;
    const j = out.events.findIndex((e) => e.t === 'jutsu' && e.released);
    assert.ok(j >= 0, out.events.map((e) => e.t).join(' '));
    const atk = out.events[j + 1];
    assert.ok(atk.t === 'attack' && atk.what === CHIDORI && atk.target === foe.id && !atk.ranged, 'an attack roll, not a save');
    assert.ok(out.events.some((e) => e.t === 'charged' && !e.on && e.end === 'struck'));
    assert.equal(u.charged, undefined);
    assert.ok(Math.hypot(u.pos.x - foe.pos.x, u.pos.z - foe.pos.z) <= 1.6, 'it stopped within reach');
    assert.ok(u.turn.move > 0, 'the movement not walked is kept');
    assert.equal(u.turn.action, true, 'and the action');
  });

  it('strikes at once when charged already within reach, and an enhanced charge strikes enhanced', () => {
    const s = setup(1.5);
    const out = charge(s, true);
    const j = out.events.find((e) => e.t === 'jutsu');
    assert.ok(j && j.t === 'jutsu' && j.released && j.enhanced);
    assert.equal(out.state.units.a.charged, undefined);
    assert.equal(out.state.units.a.chakra, 12, 'enhanced: 5 + 3');
  });

  it('cracks the ground under each step: difficult terrain until the start of its next turn', () => {
    const s0 = setup(14);
    const s = charge(s0).state;
    const to = cellAt(s, 3);
    const out = act(s, { type: 'move', unit: 'a', to });
    const cr = out.events.find((e) => e.t === 'cracks');
    assert.ok(cr && cr.t === 'cracks' && cr.on && cr.cells.length >= 5, 'a crack under each step');
    const st = out.state;
    assert.ok(crackKey(to) in (st.cracks ?? {}));
    // A step into cracked ground costs double.
    const from = { c: to.c - 1, r: to.r };
    const plain = stepCost({ ...st, cracks: {} }, from, to, false, { waterWalk: false, ninjaJump: false });
    assert.equal(stepCost(st, from, to, false, { waterWalk: false, ninjaJump: false }), plain * 2);
    // Not walking with a charged hand cracks nothing.
    const calm = act(setup(14), { type: 'move', unit: 'a', to: cellAt(s0, 3) });
    assert.ok(!calm.events.some((e) => e.t === 'cracks'));
    // The other units take their turns over it; it mends as the cracker's next turn starts.
    let t = act(st, { type: 'endTurn', unit: 'a' });
    assert.ok(Object.keys(t.state.cracks ?? {}).length > 0, 'still there on the foe\'s turn');
    for (let i = 0; i < 10 && t.state.order[t.state.turn] !== 'a'; i++) t = act(t.state, { type: 'endTurn', unit: t.state.order[t.state.turn] });
    assert.equal(t.state.order[t.state.turn], 'a');
    assert.equal(Object.keys(t.state.cracks ?? {}).length, 0);
    assert.ok(t.events.some((e) => e.t === 'cracks' && !e.on));
  });

  it('fades unused after 3 rounds (the activation turn is the first)', () => {
    let st = charge(setup(30)).state;
    const turnsOfA: number[] = [];
    for (let n = 0; n < 40 && turnsOfA.length < 3; n++) {
      const cur = st.order[st.turn];
      const out = act(st, { type: 'endTurn', unit: cur });
      st = out.state;
      if (st.order[st.turn] === 'a') {
        turnsOfA.push(st.units.a.charged?.rounds ?? 0);
        if (turnsOfA.length === 3) assert.ok(out.events.some((e) => e.t === 'charged' && !e.on && e.end === 'expired'));
      }
    }
    assert.deepEqual(turnsOfA, [2, 1, 0]);
  });

  it('is let go by hand seals for another jutsu, or by drawing the weapon', () => {
    const s = charge(setup(8)).state;
    const foe = foeOf(s);
    const fire = act(s, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { ...foe.pos }, target: foe.id });
    assert.equal(fire.state.units.a.charged, undefined);
    assert.ok(fire.events.some((e) => e.t === 'charged' && !e.on && e.end === 'released'));
    const s2 = charge(setup(14)).state;
    s2.units.a.turn.interacted = false;
    if (s2.units.a.weapon.held) {
      const drawn = act(s2, { type: 'draw', unit: 'a' });
      assert.equal(drawn.state.units.a.charged, undefined);
    }
  });

  it('ends when its ninja falls', () => {
    const s = charge(setup(14)).state;
    // The foe's turn: it strikes the charged ninja down.
    const st = structuredClone(s);
    st.units.a.hp = 1;
    const foe = foeOf(st);
    foe.pos = { x: st.units.a.pos.x + 1.2, z: st.units.a.pos.z };
    st.turn = st.order.indexOf(foe.id);
    foe.turn = { move: foe.speed, action: true, bonus: true, reaction: true, moved: 0 };
    let ended = false;
    for (let i = 0; i < 20 && !ended; i++) {
      const out = applyAction(st, { type: 'attack', unit: foe.id, target: 'a' });
      if (out.ok && out.state.units.a.down) {
        assert.equal(out.state.units.a.charged, undefined);
        assert.ok(out.events.some((e) => e.t === 'charged' && !e.on && e.end === 'down'));
        ended = true;
      }
      st.rolls += 7;
    }
    assert.ok(ended, 'some seed fells it');
  });

  it('the AI charges its hand, then walks in, and the blow goes off on the way; the same battle replays alike', () => {
    const play = () => {
      const s = setup(7);
      s.units.a.controller = 'ai';
      s.units.a.jutsus = [CHIDORI];
      s.units.a.aiOrder = 'aggressive';
      return runAi(s, 12);
    };
    const one = play();
    const kinds = one.events.map((e) => e.t);
    const c = kinds.indexOf('charged');
    const m = kinds.indexOf('move');
    const j = one.events.findIndex((e) => e.t === 'jutsu' && e.released);
    assert.ok(c >= 0 && c < m && m < j, kinds.join(' '));
    assert.deepEqual(play().events, one.events);
  });
});
