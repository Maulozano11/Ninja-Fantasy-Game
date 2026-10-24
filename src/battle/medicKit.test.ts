// Tests for the medic's kit: npm test. The owner (2026-10-24): "1 si 2 no 3 si gasta antidoto 4 si pero
// ... 5 me encanta como Feat": Quick First Aid, the antidote senbon and Steady Hand (Mano firme).
// The numbers are our proposal (battle/senbon.ts).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, SHINOBI_FEATS } from '../data/shinobiData';
import { HANA } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { aiAction } from './ai';
import { cellBlocked, cellCenter, cellOf, waterAtPt } from './map';
import { canStop } from './nav';
import { addEffect, hasEffect } from '../rules/effects';
import { healDice, SENBON_CASE, STEADY_HAND } from './senbon';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const SUPPLIES = { soldierPills: 2, bandages: 2, antidotes: 2, explosiveTags: 2, weaponPoison: 2, healingPotions: 2 };

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 5,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [
      { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
      { character: { ...HANA, id: 'h', effects: [] }, pos: { x: 8, z: 13 } },
    ],
    enemies: [{ kind: 'rogue', pos: { x: 22, z: 10 } }],
    stealth: false,
    supplies: { ...SUPPLIES },
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

const place = (s: BattleState, id: string, from: string, dx: number): void => {
  const p = s.units[from].pos;
  s.units[id].pos = freeAt(s, id, { x: p.x + dx, z: p.z });
};

const fall = (s: BattleState, id: string): void => {
  s.units[id].hp = 0;
  s.units[id].down = 'downed';
};

describe('Quick First Aid (Primeros auxilios rápidos)', () => {
  it('a medic\'s bonus action gets a fallen ally beside it back up at 1 HP, no potion, once a battle', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    place(s, 'a', 'h', 1.5);
    fall(s, 'a');
    const out = ok(applyAction(s, { type: 'firstAid', unit: 'h', target: 'a' }));
    const t = out.state;
    assert.equal(t.units.a.down, undefined);
    assert.equal(t.units.a.hp, 1);
    assert.equal(t.units.h.turn.bonus, false);
    assert.equal(t.units.h.turn.action, true, 'the action is still there');
    assert.equal(t.supplies.healingPotions, SUPPLIES.healingPotions, 'no potion');
    assert.ok(out.events.some((e) => e.t === 'firstAid'));
    fall(t, 'a');
    const again = turnOf(t, 'h');
    assert.equal(applyAction(again, { type: 'firstAid', unit: 'h', target: 'a' }).reason, 'firstAidUsed', 'once a battle');
  });

  it('a medic only, an ally beside it only, and only one who has fallen', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'h', 'a', 1.5);
    fall(s, 'h');
    assert.equal(applyAction(s, { type: 'firstAid', unit: 'a', target: 'h' }).reason, 'notMedic');
    const m = turnOf(createBattle(setup()).state, 'h');
    place(m, 'a', 'h', 4);
    fall(m, 'a');
    assert.equal(applyAction(m, { type: 'firstAid', unit: 'h', target: 'a' }).reason, 'outOfRange');
    const up = turnOf(createBattle(setup()).state, 'h');
    place(up, 'a', 'h', 1.5);
    assert.equal(applyAction(up, { type: 'firstAid', unit: 'h', target: 'a' }).reason, 'notDown');
    const nb = structuredClone(up);
    fall(nb, 'a');
    nb.units.h.turn.bonus = false;
    assert.equal(applyAction(nb, { type: 'firstAid', unit: 'h', target: 'a' }).reason, 'noBonus');
  });

  it('the medic on the AI gives it to a fallen ally beside it', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    s.units.h.controller = 'ai';
    place(s, 'a', 'h', 1.5);
    fall(s, 'a');
    assert.deepEqual(aiAction(s), { type: 'firstAid', unit: 'h', target: 'a' });
  });
});

describe('the antidote senbon (Senbon antídoto)', () => {
  const poisoned = (s: BattleState, id: string) => {
    s.units[id].effects = addEffect(s.units[id].effects, 'poisoned').effects;
  };

  it('thrown at a poisoned ally within 6 m: cures Poisoned, spends an antidote and a senbon, no roll', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'h', 'a', 5);
    poisoned(s, 'h');
    const out = ok(applyAction(s, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' }));
    assert.ok(!hasEffect(out.state.units.h.effects, 'poisoned'));
    assert.equal(out.state.supplies.antidotes, SUPPLIES.antidotes - 1);
    assert.equal(out.state.units.a.senbon, SENBON_CASE - 1);
    assert.equal(out.state.units.a.turn.action, false);
    assert.ok(!out.events.some((e) => e.t === 'attack'), 'no attack roll');
    assert.ok(out.events.some((e) => e.t === 'healSenbon' && e.antidote));
  });

  it('refused: not poisoned, at a foe, at oneself, past 6 m, no antidote, no senbon', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'h', 'a', 5);
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' }).reason, 'notPoisoned');
    poisoned(s, 'h');
    poisoned(s, 'a');
    poisoned(s, 'rogue_0');
    place(s, 'rogue_0', 'a', 4);
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'rogue_0' }).reason, 'notAlly');
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'a' }).reason, 'self');
    const far = structuredClone(s);
    place(far, 'h', 'a', 7.5);
    assert.equal(applyAction(far, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' }).reason, 'outOfRange');
    const dry = structuredClone(s);
    dry.supplies.antidotes = 0;
    assert.equal(applyAction(dry, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' }).reason, 'noneLeft');
    const empty = structuredClone(s);
    empty.units.a.senbon = 0;
    assert.equal(applyAction(empty, { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' }).reason, 'noSenbon');
  });

  it('an ally on the AI throws one at a poisoned friend', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.units.a.controller = 'ai';
    s.units.a.aiOrder = 'support';
    // No jutsu to weigh against it (a big jutsu at the foe would come first).
    s.units.a.jutsus = [];
    place(s, 'h', 'a', 4);
    poisoned(s, 'h');
    assert.deepEqual(aiAction(s), { type: 'item', unit: 'a', item: 'antidoteSenbon', target: 'h' });
  });
});

describe('Steady Hand (Mano firme), a feat', () => {
  it('is a feat anyone may take, with its Spanish name', () => {
    const f = SHINOBI_FEATS.find((x) => x.id === STEADY_HAND);
    assert.ok(f);
    assert.equal(f.nameEs, 'Mano firme');
    assert.equal(f.requires, undefined);
  });

  it('every heal it gives rolls one more die; without it, as before', () => {
    const s = createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki', selectedFeats: [STEADY_HAND] }), pos: { x: 8, z: 10 } }, { character: { ...HANA, id: 'h', effects: [] }, pos: { x: 8, z: 13 } }] })).state;
    assert.equal(healDice(s.units.a, '2d4+2'), '3d4+2');
    assert.equal(healDice(s.units.a, '1d8'), '2d8');
    assert.equal(healDice(s.units.h, '2d4+2'), '2d4+2');
  });

  it('the healing senbon with it heals 3d4+2: up to 14', () => {
    let top = 0;
    for (let k = 0; k < 40; k++) {
      const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki', selectedFeats: [STEADY_HAND] }), pos: { x: 8, z: 10 } }, { character: { ...HANA, id: 'h', effects: [] }, pos: { x: 8, z: 13 } }] })).state, 'a');
      s.rolls += k;
      place(s, 'h', 'a', 4);
      s.units.h.hp = 1;
      const heal = ok(applyAction(s, { type: 'item', unit: 'a', item: 'healSenbon', target: 'h' })).events.find((e) => e.t === 'heal');
      assert.ok(heal && heal.t === 'heal' && heal.amount >= 5 && heal.amount <= 14);
      top = Math.max(top, heal.amount);
    }
    assert.ok(top > 10, 'more than the 10 of 2d4+2');
  });

  it('Quick First Aid stays 1 HP with it', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }, { character: { ...HANA, id: 'h', effects: [], selectedFeats: [STEADY_HAND] }, pos: { x: 8, z: 13 } }] })).state, 'h');
    place(s, 'a', 'h', 1.5);
    fall(s, 'a');
    assert.equal(ok(applyAction(s, { type: 'firstAid', unit: 'h', target: 'a' })).state.units.a.hp, 1);
  });
});
