// Tests for the new reactions in the enemy's turn (the owner, 2026-10-28, N15 a; battle/reactions.ts):
// a Bukijutsu Master deflects a kunai (and throws it back when it catches it), a comrade beside the
// target steps in front of a blow; the player is asked, the AI decides for its own. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, waterAtPt } from './map';
import { canStop } from './nav';
import { canDeflect, interposers, thrownBlow, DEFLECT_COST } from './reactions';
import { logLine } from '../components/battle/battleLog';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki', shinobiClass: 'Bukijutsu Master' }), pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Bo', shinobiClass: 'Taijutsu Master' }), pos: { x: 9.5, z: 10 } }],
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

/** The rogue's turn: it throws a kunai at `target` from 6 m. */
function rogueThrows(target: string, far = 6): BattleState {
  const s = createBattle(setup()).state;
  for (const u of Object.values(s.units)) {
    u.jutsus = [];
    u.chakra = 30;
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  }
  s.turn = s.order.indexOf('rogue_0');
  place(s, 'a', { x: 8, z: 10 });
  place(s, 'b', { x: 9.5, z: 10 });
  place(s, 'rogue_0', { x: s.units[target].pos.x + far, z: 10 });
  s.units.a.armed = true;
  return s;
}

const throwAt = (s: BattleState, target: string) => applyAction(s, { type: 'attack', unit: 'rogue_0', target, ranged: true });

function seeded(s: BattleState, act: (t: BattleState) => Out, want: (out: Out) => boolean): Out {
  for (let seed = 1; seed < 300; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = ok(act(t));
    if (want(out)) return out;
  }
  throw new Error('no seed gives it');
}

const asked = (o: Out, kind: string) => o.events.some((e) => e.t === 'reactionAsk' && e.pending.kind === kind);

describe('deflecting a kunai (a Bukijutsu Master\'s reaction)', () => {
  it('is offered to a player Bukijutsu Master with a weapon in hand against a thrown kunai, not against a blade or a jutsu', () => {
    const s = rogueThrows('a');
    const out = seeded(s, (t) => throwAt(t, 'a'), (o) => asked(o, 'deflect'));
    assert.ok(out.state.pending?.kind === 'deflect' && out.state.pending.reactor === 'a');
    assert.ok(thrownBlow(out.state.pending.hit));
    // not a Bukijutsu Master, or unarmed: no offer
    const plain = structuredClone(s);
    plain.units.a.character = { ...plain.units.a.character!, shinobiClass: 'Taijutsu Master' };
    assert.ok(!canDeflect(plain, plain.units.a, out.state.pending.hit));
    const unarmed = structuredClone(s);
    unarmed.units.a.armed = false;
    assert.ok(!canDeflect(unarmed, unarmed.units.a, out.state.pending.hit));
    // a blade's blow is not deflected
    assert.ok(!thrownBlow({ ...out.state.pending.hit, melee: true }));
  });

  it('taken, the kunai loses 1d10 + DEX + level and costs 1 chakra; caught, it is thrown straight back', () => {
    const s = rogueThrows('a');
    const out = seeded(s, (t) => throwAt(t, 'a'), (o) => asked(o, 'deflect'));
    const dmg = out.state.pending!.kind === 'deflect' ? out.state.pending.hit.amount : 0;
    const chakra = out.state.units.a.chakra;
    const taken = ok(applyAction(structuredClone(out.state), { type: 'react', unit: 'a', take: true }));
    const d = taken.events.find((e): e is Extract<BattleEvent, { t: 'deflect' }> => e.t === 'deflect')!;
    assert.ok(d && d.unit === 'a' && d.less > 0);
    assert.equal(taken.state.units.a.chakra, chakra - DEFLECT_COST);
    assert.equal(taken.state.units.a.turn.reaction, false);
    const landed = taken.events.find((e) => e.t === 'damage' && e.unit === 'a');
    if (d.caught) {
      assert.ok(!landed, 'caught: no damage');
      assert.ok(taken.events.some((e) => e.t === 'attack' && e.unit === 'a' && e.target === 'rogue_0' && e.ranged), 'thrown back');
      assert.ok(logLine(d, taken.state, 'es')!.text.includes('devuelve'));
    } else {
      assert.ok(landed && landed.t === 'damage' && landed.amount === dmg - d.less, 'the rest lands');
    }
    // let go: Bo beside her is asked to step in; let go too, the whole blow lands on Aki
    let declined = ok(applyAction(structuredClone(out.state), { type: 'react', unit: 'a', take: false }));
    assert.ok(declined.state.pending?.kind === 'interpose' && declined.state.pending.reactor === 'b');
    declined = ok(applyAction(declined.state, { type: 'react', unit: 'b', take: false }));
    const full = declined.events.find((e) => e.t === 'damage' && e.unit === 'a');
    assert.ok(full && full.t === 'damage' && full.amount === dmg);
    assert.equal(declined.state.units.a.turn.reaction, true, 'the reaction is kept');
  });
});

describe('stepping in front of a blow (any comrade beside the target)', () => {
  it('a player comrade within 1.5 m is asked; taking it, the blow lands on the comrade instead', () => {
    const s = rogueThrows('b');
    // Aki (not the target) stands 1.5 m from Bo with her reaction: she is offered to step in
    assert.ok(interposers(s, { unit: 'b', amount: 5, type: 'Piercing', what: 'Kunai', aimed: true, source: 'rogue_0' }).some((u) => u.id === 'a'));
    const out = seeded(s, (t) => throwAt(t, 'b'), (o) => asked(o, 'interpose'));
    assert.ok(out.state.pending?.kind === 'interpose' && out.state.pending.reactor === 'a' && out.state.pending.hit.unit === 'b');
    const dmg = out.state.pending.hit.amount;
    const taken = ok(applyAction(structuredClone(out.state), { type: 'react', unit: 'a', take: true }));
    assert.ok(taken.events.some((e) => e.t === 'interpose' && e.unit === 'a' && e.for === 'b'));
    const hit = taken.events.find((e) => e.t === 'damage');
    assert.ok(hit && hit.t === 'damage' && hit.unit === 'a' && hit.amount === dmg, 'Aki takes it');
    assert.ok(!taken.events.some((e) => e.t === 'damage' && e.unit === 'b'));
    assert.equal(taken.state.units.a.turn.reaction, false);
    assert.ok(logLine(taken.events.find((e) => e.t === 'interpose')!, taken.state, 'es')!.text.includes('interpone'));
    // let go: Bo takes it, and Aki is not asked twice for the same blow
    const declined = ok(applyAction(structuredClone(out.state), { type: 'react', unit: 'a', take: false }));
    assert.ok(declined.events.some((e) => e.t === 'damage' && e.unit === 'b'));
    assert.ok(!declined.state.pending);
  });

  it('too far, prone, or with the reaction spent, nobody is asked', () => {
    const s = rogueThrows('b');
    place(s, 'a', { x: 5, z: 10 });
    assert.equal(interposers(s, { unit: 'b', amount: 5, type: 'Piercing', what: 'Kunai', aimed: true, source: 'rogue_0' }).length, 0, 'too far');
    const t = rogueThrows('b');
    t.units.a.turn.reaction = false;
    assert.equal(interposers(t, { unit: 'b', amount: 5, type: 'Piercing', what: 'Kunai', aimed: true, source: 'rogue_0' }).length, 0, 'no reaction');
    const out = seeded(t, (u) => throwAt(u, 'b'), (o) => o.events.some((e) => e.t === 'damage' && e.unit === 'b'));
    assert.ok(!asked(out, 'interpose'));
  });
});
