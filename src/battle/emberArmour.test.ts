// Tests for the Ember Armour, the first step of the Mirai's Path of the Infernal Fire (the owner's
// numbers, 2026-10-29, D-T24; the path is chosen in the creator and counts from level 3, 2026-10-30):
// a bonus action and 4 chakra, 3 turns, +2 AC, fire resistance, +1d4 fire on a melee weapon blow,
// 1d6 fire to whoever strikes the wearer up close (battle/infernal.ts). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { adjustDamage, attackPreview } from './combat';
import { EMBER, EMBER_COST, emberOn } from './infernal';
import { infernalSteps } from '../rules/paths';
import { endTurn } from './turns';
import { aiAction } from './ai';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const fireMirai = (over: Partial<ShinobiCharacter> = {}) => hero({ id: 'm', name: 'Aiden', clan: 'Mirai', level: 6, path: 'mirai_infernal_fire', ...over });

function setup(c: ShinobiCharacter, enemyX = 14, seed = 7): BattleSetup {
  return {
    seed,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: c, pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: enemyX, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
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
  u.chakra = Math.max(u.chakra, 20);
  return t;
}

describe('the path is chosen in the creator and counts from level 3', () => {
  it('gives the steps by level, only to a Mirai on the Infernal Fire', () => {
    assert.deepEqual(infernalSteps(fireMirai({ level: 2 })), { ember: false, colossal: false, plus: false });
    assert.deepEqual(infernalSteps(fireMirai({ level: 5 })), { ember: false, colossal: false, plus: false });
    assert.deepEqual(infernalSteps(fireMirai({ level: 6 })), { ember: true, colossal: false, plus: false });
    assert.deepEqual(infernalSteps(fireMirai({ level: 9 })), { ember: true, colossal: true, plus: false });
    assert.deepEqual(infernalSteps(fireMirai({ level: 12 })), { ember: true, colossal: true, plus: true });
    assert.equal(infernalSteps(fireMirai({ path: 'mirai_oracle', level: 12 })).ember, false);
    assert.equal(infernalSteps(fireMirai({ clan: 'Kirin' as ShinobiCharacter['clan'], level: 12 })).ember, false, 'another clan: the Mirai path does not count');
  });
});

describe('the Ember Armour', () => {
  it('a bonus action and 4 chakra put it on: +2 AC, for 3 of the wearer\'s turns', () => {
    const s = turnOf(createBattle(setup(fireMirai())).state, 'm');
    const ac = attackPreview(s, s.units.rogue_0, s.units.m, false).ac;
    const chakra = s.units.m.chakra;
    const out = ok(applyAction(s, { type: 'ember', unit: 'm' }));
    const m = out.state.units.m;
    assert.ok(emberOn(m));
    assert.equal(m.chakra, chakra - EMBER_COST);
    assert.equal(m.turn.bonus, false);
    assert.ok(out.events.some((e) => e.t === 'effect' && e.unit === 'm' && e.effect === EMBER && e.on));
    assert.equal(attackPreview(out.state, out.state.units.rogue_0, m, false).ac, ac + 2);
    assert.equal(m.effects.find((e) => e.id === EMBER)?.remaining, 3);
  });

  it('is refused below level 6, without the path, without the bonus action or the chakra', () => {
    const low = turnOf(createBattle(setup(fireMirai({ level: 5 }))).state, 'm');
    assert.equal(applyAction(low, { type: 'ember', unit: 'm' }).ok, false);
    const oracle = turnOf(createBattle(setup(fireMirai({ path: 'mirai_oracle' }))).state, 'm');
    assert.equal(applyAction(oracle, { type: 'ember', unit: 'm' }).ok, false);
    const s = turnOf(createBattle(setup(fireMirai())).state, 'm');
    const spent = ok(applyAction(s, { type: 'ember', unit: 'm' })).state;
    assert.equal(applyAction(spent, { type: 'ember', unit: 'm' }).ok, false, 'no bonus action left');
    const poor = turnOf(createBattle(setup(fireMirai())).state, 'm');
    poor.units.m.chakra = EMBER_COST - 1;
    assert.equal(applyAction(poor, { type: 'ember', unit: 'm' }).ok, false);
  });

  it('halves fire, once even with a fire Warding seal', () => {
    const s = createBattle(setup(fireMirai())).state;
    const m = s.units.m;
    m.effects = [{ id: 'ember_armour', remaining: 3 }];
    assert.equal(adjustDamage(s, m, 10, 'Fire'), 5);
    assert.equal(adjustDamage(s, m, 10, 'Slashing'), 10);
    m.effects.push({ id: 'warding_seal', detail: 'Fire' });
    assert.equal(adjustDamage(s, m, 10, 'Fire'), 5);
  });

  it('wears off after 3 of the wearer\'s turns', () => {
    let s = turnOf(createBattle(setup(fireMirai())).state, 'm');
    s = ok(applyAction(s, { type: 'ember', unit: 'm' })).state;
    for (let i = 0; i < 3; i++) {
      assert.ok(emberOn(s.units.m), `on in turn ${i + 1}`);
      s = turnOf(s, 'm');
      endTurn(s, []);
    }
    assert.ok(!emberOn(s.units.m));
  });

  it('a melee blow carries 1d4 fire, and a rogue striking it up close takes 1d6 fire', () => {
    let blowFire = 0, burns = 0;
    for (let seed = 1; seed < 60 && (!blowFire || !burns); seed++) {
      let s = turnOf(createBattle(setup(fireMirai(), 9, seed)).state, 'm');
      s = ok(applyAction(s, { type: 'ember', unit: 'm' })).state;
      const hp = s.units.rogue_0.hp;
      const out = ok(applyAction(s, { type: 'attack', unit: 'm', target: 'rogue_0' }));
      const fire = out.events.filter((e) => e.t === 'damage' && e.unit === 'rogue_0' && e.dmgType === 'Fire');
      if (fire.length) { blowFire++; assert.ok(out.state.units.rogue_0.hp < hp); }
      // the rogue strikes back
      const r = turnOf(out.state, 'rogue_0');
      if (r.units.rogue_0.down) continue;
      const rhp = r.units.rogue_0.hp;
      const back = ok(applyAction(r, { type: 'attack', unit: 'rogue_0', target: 'm' }));
      const struck = back.events.some((e) => e.t === 'damage' && e.unit === 'm');
      const burnt = back.events.some((e) => e.t === 'damage' && e.unit === 'rogue_0' && e.dmgType === 'Fire');
      assert.equal(burnt, struck, 'burnt exactly when the rogue landed a blow');
      if (burnt) { burns++; assert.ok(back.state.units.rogue_0.hp < rhp); }
    }
    assert.ok(blowFire > 0, 'some blow landed with its fire');
    assert.ok(burns > 0, 'some rogue was burnt');
  });

  it('an AI Mirai of the Infernal Fire puts it on before a blow up close', () => {
    const { state } = createBattle({ ...setup(hero({ id: 'a' }), 11), enemies: [{ kind: 'rogue', clan: 'Mirai', pos: { x: 11, z: 10 } }], party: [{ character: hero({ id: 'a' }), pos: { x: 8, z: 10 } }] });
    let t = turnOf(state, 'rogue_0');
    t.units.rogue_0.character = { ...t.units.rogue_0.character!, clan: 'Mirai', level: 6, path: 'mirai_infernal_fire' };
    t.units.rogue_0.intent = { kind: 'melee', what: t.units.rogue_0.weapon.name, target: 'a' }; // a blade plan
    let put = false;
    for (let guard = 0; guard < 8 && t.order[t.turn] === 'rogue_0'; guard++) {
      const a = aiAction(t);
      assert.ok(a, 'the AI acts');
      if (a.type === 'ember') put = true;
      t = ok(applyAction(t, a)).state;
    }
    assert.ok(put, 'put the armour on');
    assert.ok(emberOn(t.units.rogue_0));
  });
});
