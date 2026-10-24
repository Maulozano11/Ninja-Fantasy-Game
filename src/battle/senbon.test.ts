// Tests for senbon, weapon poison and the healing senbon: npm test. The owner (2026-10-23): "mete los
// senbons como nueva arma arrojadiza y hay que agregar una opcion para poder inbuir las armas en
// veneno y los senbons pueden inbuirse en pocion curativa y ser lanzado hacia aliados para curar
// (mas tipo de curacion para el healer)". The numbers are our proposal (battle/senbon.ts).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { aiAction, runAi } from './ai';
import { attackPreview } from './combat';
import { cellBlocked, cellCenter, cellOf, waterAtPt } from './map';
import { canStop } from './nav';
import { abilityMod } from '../rules/checks';
import { hasEffect } from '../rules/effects';
import { HEAL_SENBON_RANGE, POISON_DC, POISON_HITS, SENBON, SENBON_CASE, SENBON_HIT, SENBON_LONG, WEAPON_POISON } from './senbon';
import { DEFAULT_SUPPLIES } from '../rules/mission';
import { migrateRun } from '../game/missionRun';
import type { MissionRun } from '../game/missionRun';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

const SUPPLIES = { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2, weaponPoison: 2, healingPotions: 2 };

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 11,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [
      { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
      { character: { ...HANA, id: 'h', effects: [] }, pos: { x: 8, z: 13 } },
    ],
    enemies: [{ kind: 'rogue', pos: { x: 13, z: 10 } }],
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

/** The nearest free dry cell's centre to a point. */
function freeAt(s: BattleState, id: string, p: Pt): Pt {
  for (let r = 0; r < 6; r += 0.5)
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (!cellBlocked(s, c) && !waterAtPt(s, cellCenter(c)) && canStop(s, s.units[id], c)) return cellCenter(c);
    }
  throw new Error('no free cell');
}

/** Puts a unit `dx` meters to the right of another, on a free cell. */
function place(s: BattleState, id: string, from: string, dx: number): void {
  const p = s.units[from].pos;
  s.units[id].pos = freeAt(s, id, { x: p.x + dx, z: p.z });
}

/** The same action from the first dice stream (0..80) for which `want` holds of its events. */
function rollUntil(s: BattleState, a: Action, want: (ev: BattleEvent[], t: BattleState) => boolean): ReturnType<typeof applyAction> {
  for (let k = 0; k < 80; k++) {
    const t = structuredClone(s);
    t.rolls = s.rolls + k;
    const out = applyAction(t, a);
    if (out.ok && want(out.events, out.state)) return out;
  }
  throw new Error('no dice stream gave it');
}

const hit = (ev: BattleEvent[]) => ev.some((e) => e.t === 'attack' && e.roll.success);

describe('the senbon: a new thrown weapon', () => {
  it('is a thin needle thrown like a dart: 1d4 piercing, finesse, 6 m (18 m with disadvantage), +1 to hit, 10 in the case', () => {
    assert.deepEqual({ dice: SENBON.dice, type: SENBON.type, reach: SENBON.reach, finesse: SENBON.finesse }, { dice: '1d4', type: 'Piercing', reach: 6, finesse: true });
    assert.equal(SENBON_LONG, 18);
    assert.equal(SENBON_HIT, 1);
    const s = createBattle(setup()).state;
    assert.equal(s.units.a.senbon, SENBON_CASE);
    assert.equal(s.units.rogue_0.senbon, SENBON_CASE, 'enemies carry them too');
    assert.equal(SENBON_CASE, 10);
  });

  it('throwing one takes the action and a senbon from the case, hit or miss', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'rogue_0', 'a', 5);
    const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0', senbon: true }));
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(atk && atk.t === 'attack' && atk.what === 'Senbon' && atk.ranged, 'a thrown senbon');
    assert.equal(out.state.units.a.senbon, SENBON_CASE - 1);
    assert.equal(out.state.units.a.turn.action, false);
  });

  it('hits for 1d4 + DEX, rolls one better than a kunai, and only 6 m before long range', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'rogue_0', 'a', 5);
    const a = s.units.a, t = s.units.rogue_0;
    const kunai = attackPreview(s, a, t, 'ranged');
    const senbon = attackPreview(s, a, t, 'ranged', { senbon: true });
    assert.equal(senbon.mod, kunai.mod + 1);
    assert.ok(!senbon.reasons.includes('longRange'));
    place(s, 'rogue_0', 'a', 7.5);
    assert.ok(attackPreview(s, a, s.units.rogue_0, 'ranged', { senbon: true }).reasons.includes('longRange'), 'past 6 m: disadvantage');
    assert.ok(!attackPreview(s, a, s.units.rogue_0, 'ranged').reasons.includes('longRange'), 'the kunai still flies 9 m');
    place(s, 'rogue_0', 'a', 5);
    const out = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0', senbon: true }, (ev) => hit(ev) && !ev.some((e) => e.t === 'attack' && e.roll.crit));
    const dmg = out.events.find((e) => e.t === 'damage' && e.unit === 'rogue_0');
    const dex = abilityMod(a.stats.dex);
    assert.ok(dmg && dmg.t === 'damage' && dmg.dmgType === 'Piercing' && dmg.amount >= 1 + dex && dmg.amount <= 4 + dex, `1d4 + ${dex}`);
  });

  it('refuses an empty case, a friend, and a foe past 18 m', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'rogue_0', 'a', 5);
    const empty = structuredClone(s);
    empty.units.a.senbon = 0;
    assert.equal(applyAction(empty, { type: 'attack', unit: 'a', target: 'rogue_0', senbon: true }).reason, 'noSenbon');
    assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'h', senbon: true }).reason, 'ally');
    const far = structuredClone(s);
    far.units.rogue_0.pos = freeAt(far, 'rogue_0', { x: far.units.a.pos.x + 19.5, z: far.units.a.pos.z });
    assert.equal(applyAction(far, { type: 'attack', unit: 'a', target: 'rogue_0', senbon: true }).reason, 'outOfRange');
  });
});

describe('weapon poison: coating the weapons', () => {
  it('a bonus action and a vial coat the blade and the throwing pouch for 3 hits', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const out = ok(applyAction(s, { type: 'item', unit: 'a', item: 'poison' }));
    assert.equal(out.state.supplies.weaponPoison, 1);
    assert.deepEqual(out.state.units.a.coat, { hits: POISON_HITS });
    assert.equal(POISON_HITS, 3);
    assert.equal(out.state.units.a.turn.bonus, false);
    assert.equal(out.state.units.a.turn.action, true, 'the action is still there');
    assert.ok(out.events.some((e) => e.t === 'coat' && e.on && e.hits === 3));
    assert.equal(applyAction(turnOf(out.state, 'a'), { type: 'item', unit: 'a', item: 'poison' }).reason, 'coated', 'one coat at a time');
  });

  it('refuses with no vial or no bonus action', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const none = structuredClone(s);
    none.supplies.weaponPoison = 0;
    assert.equal(applyAction(none, { type: 'item', unit: 'a', item: 'poison' }).reason, 'noneLeft');
    const old = turnOf(createBattle(setup({ supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } })).state, 'a');
    assert.equal(applyAction(old, { type: 'item', unit: 'a', item: 'poison' }).reason, 'noneLeft', 'a backpack without the field has none');
    const spent = structuredClone(s);
    spent.units.a.turn.bonus = false;
    assert.equal(applyAction(spent, { type: 'item', unit: 'a', item: 'poison' }).reason, 'noBonus');
  });

  it('a coated hit asks for a CON save (DC 12): failed, 1d4 poison and Poisoned', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'poison' })).state;
    place(s, 'rogue_0', 'a', 1.5);
    const out = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (ev, t) => hit(ev) && !t.units.rogue_0.down && ev.some((e) => e.t === 'save' && !e.roll.success && !e.roll.fumble));
    const save = out.events.find((e) => e.t === 'save');
    assert.ok(save && save.t === 'save' && save.ab === 'con' && save.what === WEAPON_POISON && save.roll.dc === POISON_DC);
    const poison = out.events.find((e) => e.t === 'damage' && e.dmgType === 'Poison');
    assert.ok(poison && poison.t === 'damage' && poison.amount >= 1 && poison.amount <= 4, '1d4 poison');
    assert.ok(hasEffect(out.state.units.rogue_0.effects, 'poisoned'));
    assert.deepEqual(out.state.units.a.coat, { hits: POISON_HITS - 1 }, 'a hit spent');
    // The save comes after the blow's own damage.
    const i = (t: string) => out.events.findIndex((e) => e.t === t);
    assert.ok(i('damage') < i('save'));
  });

  it('a saved coat does nothing more; a miss spends no hit', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'poison' })).state;
    place(s, 'rogue_0', 'a', 1.5);
    const saved = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (ev) => hit(ev) && ev.some((e) => e.t === 'save' && e.roll.success));
    assert.ok(!saved.events.some((e) => e.t === 'damage' && e.dmgType === 'Poison'));
    assert.ok(!hasEffect(saved.state.units.rogue_0.effects, 'poisoned'));
    assert.equal(saved.state.units.a.coat?.hits, POISON_HITS - 1, 'the hit is spent all the same');
    const missed = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (ev) => ev.some((e) => e.t === 'attack' && !e.roll.success));
    assert.ok(!missed.events.some((e) => e.t === 'save'));
    assert.equal(missed.state.units.a.coat?.hits, POISON_HITS);
  });

  it('thrown kunai and senbon carry it too, and the last hit wipes the coat off', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'poison' })).state;
    s.units.a.coat = { hits: 1 };
    place(s, 'rogue_0', 'a', 5);
    const out = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0', senbon: true }, (ev, t) => hit(ev) && !t.units.rogue_0.down);
    assert.ok(out.events.some((e) => e.t === 'save' && e.what === WEAPON_POISON), 'the needle carries the poison');
    assert.equal(out.state.units.a.coat, undefined);
    assert.ok(out.events.some((e) => e.t === 'coat' && !e.on));
    const s2 = turnOf(out.state, 'a');
    const next = rollUntil(s2, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }, hit);
    assert.ok(!next.events.some((e) => e.t === 'save'), 'no coat, no save');
  });

  it('bare fists take no coat (a thrown weapon would)', () => {
    let s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki', appearance: undefined, weaponStyle: undefined as unknown as ShinobiCharacter['weaponStyle'], shinobiClass: 'Taijutsu Master' }), pos: { x: 8, z: 10 } }] })).state, 'a');
    assert.equal(s.units.a.weapon.held, false);
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'poison' })).state;
    place(s, 'rogue_0', 'a', 1.5);
    const out = rollUntil(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, hit);
    assert.ok(!out.events.some((e) => e.t === 'save'));
    assert.equal(out.state.units.a.coat?.hits, POISON_HITS);
  });

  it('the rogues carry a vial of their own, and the AI coats its blade before a blow it can strike from where it stands', () => {
    const s0 = createBattle(setup()).state;
    assert.deepEqual(s0.units.rogue_0.kit, { poison: 1 });
    const s = turnOf(s0, 'rogue_0');
    place(s, 'rogue_0', 'a', 1.5);
    s.units.rogue_0.intent = { kind: 'melee', what: s.units.rogue_0.weapon.name, target: 'a' };
    // A Bukijutsu Master puts its element on its weapon first, with the same bonus action (battle/imbue.ts).
    assert.equal(aiAction(s)?.type, 'jutsu', 'the element comes first');
    s.units.rogue_0.jutsus = s.units.rogue_0.jutsus.filter((j) => j !== 'weapon_element');
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'item', unit: 'rogue_0', item: 'poison' });
    const t = ok(applyAction(s, a!)).state;
    assert.equal(t.units.rogue_0.kit?.poison, 0, 'its own vial, not the party\'s');
    assert.equal(t.supplies.weaponPoison, SUPPLIES.weaponPoison);
    assert.deepEqual(t.units.rogue_0.coat, { hits: POISON_HITS });
    assert.equal(aiAction(t)?.type, 'attack', 'then it strikes, coated');
  });

  it('the AI keeps its vial for a blow: not before a jutsu, not far from its foe, never against the hydra', () => {
    const s = turnOf(createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 30, z: 10 } }] })).state, 'rogue_0');
    s.units.rogue_0.intent = { kind: 'melee', what: s.units.rogue_0.weapon.name, target: 'a' };
    assert.notEqual(aiAction(s)?.type, 'item', 'out of reach: it walks first');
    const j = turnOf(createBattle(setup()).state, 'rogue_0');
    place(j, 'rogue_0', 'a', 4);
    j.units.rogue_0.intent = { kind: 'jutsu', what: 'fireball_goukakyu', target: 'a', at: { ...j.units.a.pos } };
    assert.notDeepEqual(aiAction(j), { type: 'item', unit: 'rogue_0', item: 'poison' }, 'a jutsu takes no coat');
    const h = turnOf(createBattle(setup({ enemies: [{ kind: 'hydra', pos: { x: 14, z: 10 } }] })).state, 'a');
    h.units.a.controller = 'ai';
    for (let k = 0; k < 6; k++) {
      const act = aiAction(h);
      if (!act || act.type === 'endTurn') break;
      assert.ok(!(act.type === 'item' && act.item === 'poison'), 'no poison against the hydra');
      const out = applyAction(h, act);
      if (!out.ok) break;
      Object.assign(h, out.state);
    }
  });
});

describe('the healing senbon: a senbon dipped in a healing potion, thrown at an ally', () => {
  it('heals 2d4+2 (a medic adds WIS), from up to 6 m, and spends a potion and a senbon', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    place(s, 'a', 'h', 5);
    s.units.a.hp = 5;
    const out = ok(applyAction(s, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' }));
    const heal = out.events.find((e) => e.t === 'heal');
    const wis = Math.max(0, abilityMod(s.units.h.stats.wis));
    assert.equal(s.units.h.character?.shinobiClass, 'Medical Specialist');
    assert.ok(heal && heal.t === 'heal' && heal.unit === 'a' && heal.amount >= 4 + wis && heal.amount <= 10 + wis, `2d4+2+${wis}`);
    assert.ok(out.events.some((e) => e.t === 'healSenbon' && e.unit === 'h' && e.target === 'a'));
    assert.ok(!out.events.some((e) => e.t === 'attack'), 'no attack roll');
    assert.equal(out.state.supplies.healingPotions, SUPPLIES.healingPotions - 1);
    assert.equal(out.state.units.h.senbon, SENBON_CASE - 1);
    assert.equal(out.state.units.h.turn.action, false);
    assert.equal(HEAL_SENBON_RANGE, 6);
  });

  it('a ninja who is not a medic heals the potion alone', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'h', 'a', 4);
    s.units.h.hp = 1;
    for (let k = 0; k < 20; k++) {
      const t = structuredClone(s);
      t.rolls += k;
      const heal = ok(applyAction(t, { type: 'item', unit: 'a', item: 'healSenbon', target: 'h' })).events.find((e) => e.t === 'heal');
      assert.ok(heal && heal.t === 'heal' && heal.amount >= 4 && heal.amount <= 10);
    }
  });

  it('gets a fallen ally back up', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    place(s, 'a', 'h', 5);
    s.units.a.hp = 0;
    s.units.a.down = 'downed';
    const t = ok(applyAction(s, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' })).state;
    assert.equal(t.units.a.down, undefined);
    assert.ok(t.units.a.hp > 0);
  });

  it('never at a foe, nor at oneself; not past 6 m, without a potion or without a senbon', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    place(s, 'rogue_0', 'h', 4);
    assert.equal(applyAction(s, { type: 'item', unit: 'h', item: 'healSenbon', target: 'rogue_0' }).reason, 'notAlly');
    assert.equal(applyAction(s, { type: 'item', unit: 'h', item: 'healSenbon', target: 'h' }).reason, 'self');
    const far = structuredClone(s);
    place(far, 'a', 'h', 7.5);
    assert.equal(applyAction(far, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' }).reason, 'outOfRange');
    place(s, 'a', 'h', 4);
    const dry = structuredClone(s);
    dry.supplies.healingPotions = 0;
    assert.equal(applyAction(dry, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' }).reason, 'noneLeft');
    const empty = structuredClone(s);
    empty.units.h.senbon = 0;
    assert.equal(applyAction(empty, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' }).reason, 'noSenbon');
    const spent = structuredClone(s);
    spent.units.h.turn.action = false;
    assert.equal(applyAction(spent, { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' }).reason, 'noAction');
  });

  it('an enemy can\'t get into the party\'s potions', () => {
    const s = turnOf(createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 13, z: 10 } }, { kind: 'rogue', pos: { x: 13, z: 13 } }] })).state, 'rogue_0');
    place(s, 'rogue_1', 'rogue_0', 3);
    assert.equal(applyAction(s, { type: 'item', unit: 'rogue_0', item: 'healSenbon', target: 'rogue_1' }).reason, 'noItems');
  });

  it('the medic on the AI throws one at a hurt ally out of reach of its hands', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    s.units.h.controller = 'ai';
    s.units.h.aiOrder = 'support';
    place(s, 'a', 'h', 5);
    s.units.a.hp = Math.floor(s.units.a.maxHp * 0.3);
    s.units.rogue_0.pos = freeAt(s, 'rogue_0', { x: s.units.a.pos.x + 12, z: s.units.a.pos.z });
    assert.deepEqual(aiAction(s), { type: 'item', unit: 'h', item: 'healSenbon', target: 'a' });
    // Played out, the heal lands.
    const out = runAi(s, 30);
    assert.ok(out.events.some((e) => e.t === 'healSenbon' && e.target === 'a'));
    assert.ok(out.state.units.a.hp > s.units.a.hp);
  });

  it('the AI keeps its potions when nobody is hurt', () => {
    const s = turnOf(createBattle(setup()).state, 'h');
    s.units.h.controller = 'ai';
    s.units.h.aiOrder = 'support';
    place(s, 'a', 'h', 5);
    const out = runAi(s, 30);
    assert.ok(!out.events.some((e) => e.t === 'healSenbon'));
  });
});

describe('the backpack', () => {
  it('a mission sets out with 2 vials of weapon poison and 2 healing potions (proposal)', () => {
    assert.equal(DEFAULT_SUPPLIES.weaponPoison, 2);
    assert.equal(DEFAULT_SUPPLIES.healingPotions, 2);
  });

  it('a mission saved before they existed loads with none', () => {
    const party = { members: [], dead: [], supplies: { rations: 1, campKits: 1, bandages: 1, antidotes: 1, soldierPills: 1, explosiveTags: 1, wireRolls: 1 } };
    const run = migrateRun({ party, entry: party } as unknown as MissionRun);
    assert.equal(run.party.supplies.weaponPoison, 0);
    assert.equal(run.party.supplies.healingPotions, 0);
    assert.equal(run.entry.supplies.explosiveTags, 1);
  });
});
