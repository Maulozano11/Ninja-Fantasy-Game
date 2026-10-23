// Tests for Triple Nature in battle: npm test. The owner chose it as the third-element feat (2026-10-21:
// "feat del tercer elemento opcion a"): once per long rest, a jutsu of one of the ninja's elements costs
// 1 chakra less when the previous jutsu it cast that battle was of another of its elements.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { THIRD_ELEMENT_FEAT } from '../rules/natureGrowth';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState } from './types';
import { applyAction, createBattle, jutsuCost } from './engine';
import type { BattleSetup } from './engine';
import { JUTSU } from './jutsu';
import { battleResult } from './result';

/** Solen at level 9: Fire, with Water (its level-5 second element) and Wind (Triple Nature's third). */
const weaver = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({
  ...DEFAULT_CHARACTER,
  id: 'a',
  name: 'Aki',
  level: 9,
  effects: [],
  natureGrowth: 'element',
  extraNatures: ['Water', 'Wind'],
  selectedFeats: ['iron_skin', THIRD_ELEMENT_FEAT],
  selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot2Elemental: 'fireball_goukakyu', slot3Elemental: 'wind_blade_daitoppa' },
  ...over,
});

function setup(c: ShinobiCharacter): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: c, pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 13, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
  };
}

/** The ninja's turn, with its action back (the clone keeps what the battle remembers); the foe can't fall. */
function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  for (const u of Object.values(t.units)) if (u.team === 'enemy') u.hp = u.maxHp = 999;
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

/** Casts a jutsu at the foe (or, for Body Flicker, a step back) and says what it cost. */
function cast(s: BattleState, jutsu: string): { state: BattleState; spent: number; noted: boolean } {
  const t = turnOf(s, 'a');
  const foe = Object.values(t.units).find((u) => u.team === 'enemy')!;
  const before = t.units.a.chakra;
  const me = t.units.a.pos;
  const out =
    jutsu === 'body_flicker'
      ? applyAction(t, { type: 'jutsu', unit: 'a', jutsu, at: { x: me.x - 1.5, z: me.z } })
      : applyAction(t, { type: 'jutsu', unit: 'a', jutsu, at: { ...foe.pos }, target: foe.id });
  assert.ok(out.ok, `${jutsu}: ${out.reason}`);
  return { state: out.state, spent: before - out.state.units.a.chakra, noted: out.events.some((e) => e.t === 'note' && e.key === 'tripleNature') };
}

describe('Triple Nature in battle', () => {
  it('the unit knows its three elements, and the discount is ready', () => {
    const u = createBattle(setup(weaver())).state.units.a;
    assert.deepEqual(u.tripleNature, { natures: ['Fire', 'Water', 'Wind'], spent: false });
    assert.equal(u.lastNature, undefined);
  });

  it('1 chakra less after a jutsu of another of its elements, once; the next one costs in full', () => {
    let s = createBattle(setup(weaver())).state;
    const wind = cast(s, 'wind_blade_daitoppa');
    assert.equal(wind.spent, JUTSU.wind_blade_daitoppa.cost, 'the first jutsu: in full');
    assert.equal(wind.noted, false);
    s = wind.state;
    assert.equal(s.units.a.lastNature, 'Wind');
    assert.equal(jutsuCost(s.units.a, JUTSU.fireball_goukakyu, false), JUTSU.fireball_goukakyu.cost - 1, 'the hotbar shows the discount');
    const fire = cast(s, 'fireball_goukakyu');
    assert.equal(fire.spent, JUTSU.fireball_goukakyu.cost - 1, 'Wind then Fire: 1 chakra less');
    assert.equal(fire.noted, true, 'the log says so');
    s = fire.state;
    assert.equal(s.units.a.tripleNature?.spent, true);
    const again = cast(s, 'wind_blade_daitoppa');
    assert.equal(again.spent, JUTSU.wind_blade_daitoppa.cost, 'once per long rest: spent');
    assert.equal(battleResult(again.state).members.find((m) => m.id === 'a')!.tripleNatureSpent, true, 'the mission learns it is spent');
  });

  it('not after a jutsu of the same element, nor after one of no element', () => {
    let s = createBattle(setup(weaver())).state;
    s = cast(s, 'fireball_goukakyu').state;
    assert.equal(cast(s, 'fireball_goukakyu').spent, JUTSU.fireball_goukakyu.cost, 'Fire then Fire');
    let t = createBattle(setup(weaver())).state;
    t = cast(t, 'body_flicker').state;
    assert.equal(t.units.a.lastNature, 'Taijutsu');
    assert.equal(cast(t, 'fireball_goukakyu').spent, JUTSU.fireball_goukakyu.cost, 'a taijutsu is no element');
    assert.equal(battleResult(t).members.find((m) => m.id === 'a')!.tripleNatureSpent, false);
  });

  it('spent since the last camp: it comes into the battle spent', () => {
    let s = createBattle(setup(weaver({ tripleNatureSpent: true }))).state;
    assert.equal(s.units.a.tripleNature?.spent, true);
    s = cast(s, 'wind_blade_daitoppa').state;
    assert.equal(cast(s, 'fireball_goukakyu').spent, JUTSU.fireball_goukakyu.cost);
  });

  it('only with the feat and its requirements: no feat, below level 9, or no second element', () => {
    for (const c of [weaver({ selectedFeats: [] }), weaver({ level: 8 }), weaver({ natureGrowth: 'rank', extraNatures: [] })]) {
      let s = createBattle(setup(c)).state;
      assert.equal(s.units.a.tripleNature, undefined);
      s = cast(s, 'wind_blade_daitoppa').state;
      assert.equal(cast(s, 'fireball_goukakyu').spent, JUTSU.fireball_goukakyu.cost);
      assert.equal(battleResult(s).members[0].tripleNatureSpent, undefined);
    }
  });
});
