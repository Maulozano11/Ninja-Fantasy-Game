// Tests for Seal Needles in battle (the owner, 2026-10-24: platinum senbon block chakra): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { aiAction } from './ai';
import { cellBlocked, cellCenter, cellOf, waterAtPt } from './map';
import { canStop } from './nav';
import { abilityMod } from '../rules/checks';
import { hasEffect } from '../rules/effects';
import { SEAL_NEEDLES } from '../rules/sealNeedles';
import { SEAL_NEEDLE, SENBON_CASE, sealNeedlesDC } from './senbon';
import { endTurn } from './turns';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 9,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki', abilities: [SEAL_NEEDLES] }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 13, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0, platinumSenbon: 3 },
    ...over,
  };
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

function freeAt(s: BattleState, id: string, p: Pt): Pt {
  for (let r = 0; r < 6; r += 0.5)
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (!cellBlocked(s, c) && !waterAtPt(s, cellCenter(c)) && canStop(s, s.units[id], c)) return cellCenter(c);
    }
  throw new Error('no free cell');
}

function rollUntil(s: BattleState, a: Action, want: (ev: BattleEvent[], t: BattleState) => boolean): ReturnType<typeof applyAction> {
  for (let k = 0; k < 120; k++) {
    const t = structuredClone(s);
    t.rolls = s.rolls + k;
    const out = applyAction(t, a);
    if (out.ok && want(out.events, out.state)) return out;
  }
  throw new Error('no dice stream gave it');
}

const ready = () => {
  const s = turnOf(createBattle(setup()).state, 'a');
  s.units.rogue_0.pos = freeAt(s, 'rogue_0', { x: s.units.a.pos.x + 5, z: s.units.a.pos.z });
  return s;
};
const throwIt: Action = { type: 'attack', unit: 'a', target: 'rogue_0', platinum: true };

describe('Seal Needles (Agujas de sello): a platinum senbon that blocks chakra', () => {
  it('thrown as a senbon (the action), it spends a platinum senbon from the backpack, not one of the case', () => {
    const out = ok(applyAction(ready(), throwIt));
    assert.equal(out.state.supplies.platinumSenbon, 2);
    assert.equal(out.state.units.a.senbon, SENBON_CASE);
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(atk && atk.t === 'attack' && atk.what === 'Senbon' && atk.platinum);
  });

  it('a hit asks for a CON save against 8 + prof + the better of DEX and WIS; failed: no jutsu on its next turn', () => {
    const s = ready();
    const u = s.units.a;
    assert.equal(sealNeedlesDC(u), 8 + u.prof + Math.max(abilityMod(u.stats.dex), abilityMod(u.stats.wis)));
    const out = rollUntil(s, throwIt, (ev, t) => !t.units.rogue_0.down && ev.some((e) => e.t === 'save' && e.what === SEAL_NEEDLE && !e.roll.success));
    const save = out.events.find((e) => e.t === 'save');
    assert.ok(save && save.t === 'save' && save.ab === 'con' && save.roll.dc === sealNeedlesDC(u));
    const r = out.state.units.rogue_0;
    assert.ok(hasEffect(r.effects, 'chakra_sealed'));
    // Its next turn: no jutsu; after it, the chakra flows again.
    const rt = turnOf(out.state, 'rogue_0');
    const fire = applyAction(rt, { type: 'jutsu', unit: 'rogue_0', jutsu: 'fireball_goukakyu', at: { ...rt.units.a.pos } });
    assert.equal(fire.ok, false);
    const after = structuredClone(rt);
    endTurn(after, []);
    assert.ok(!hasEffect(after.units.rogue_0.effects, 'chakra_sealed'), 'one turn only');
  });

  it('a saved CON or a miss leaves the chakra flowing', () => {
    const s = ready();
    const saved = rollUntil(s, throwIt, (ev) => ev.some((e) => e.t === 'save' && e.roll.success));
    assert.ok(!hasEffect(saved.state.units.rogue_0.effects, 'chakra_sealed'));
    const missed = rollUntil(s, throwIt, (ev) => ev.some((e) => e.t === 'attack' && !e.roll.success));
    assert.ok(!missed.events.some((e) => e.t === 'save'));
    assert.equal(missed.state.supplies.platinumSenbon, 2, 'spent all the same');
  });

  it('refused without the ability or a platinum senbon', () => {
    const none = ready();
    none.supplies.platinumSenbon = 0;
    assert.equal(applyAction(none, throwIt).reason, 'noPlatinum');
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }] })).state, 'a');
    assert.equal(applyAction(s, throwIt).reason, 'noSealNeedles');
  });

  it('the AI uses it on a foe with jutsu who may fail the save', () => {
    const s = ready();
    s.units.a.controller = 'ai';
    s.units.a.jutsus = [];
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'attack', unit: 'a', target: 'rogue_0', platinum: true });
  });
});
