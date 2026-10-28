// Tests for the last stand and its price (the owner, 2026-10-28, M1 and M2; battle/lastStand.ts,
// docs/MISSION_DESIGN.md "The last stand"): the third death save lost asks the player; the sacrifice
// is one free blow at 300 % and a 34 % chance of living; the retreat leaves the battle alive with a
// mutilation fixed by the blow that dropped the ninja; the mutilations and the implants that replace
// them change the rules (rules/effects.ts mods). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle, HOOK_RANGE } from './engine';
import type { BattleSetup } from './engine';
import { attackPreview, damage, passivePerception } from './combat';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
import { canStop } from './nav';
import { KUNAI_LONG } from './units';
import { seesPoint, VISION } from './stealth';
import { battleResult } from './result';
import { mutilationFor, SACRIFICE_LIVES, SACRIFICE_POWER } from './lastStand';
import { addEffect, hasEffect } from '../rules/effects';
import { applyBattleResult, newMission } from '../rules/mission';
import { logLine } from '../components/battle/battleLog';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }],
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

/** Aki down with two death saves lost, the rogue beside her; the blow of `type` is her third. */
function thirdSave(type: 'Slashing' | 'Bludgeoning' | 'Fire' = 'Slashing', seed = 7): { s: BattleState; ev: BattleEvent[] } {
  const s = createBattle(setup({ seed })).state;
  for (const u of Object.values(s.units)) u.jutsus = [];
  place(s, 'a', { x: 8, z: 10 });
  place(s, 'rogue_0', { x: 9, z: 10 });
  const a = s.units.a;
  a.hp = 0;
  a.down = 'downed';
  a.cond = { prone: true };
  a.deathSaves = { ok: 0, bad: 2 };
  const ev: BattleEvent[] = [];
  damage(s, a, 4, type, { source: 'rogue_0', melee: true }, ev);
  return { s, ev };
}

describe('the last stand (the third death save lost)', () => {
  it('asks a player ninja instead of settling it; an enemy or the AI side goes down as before', () => {
    const { s, ev } = thirdSave();
    assert.ok(ev.some((e) => e.t === 'reactionAsk' && e.pending.kind === 'lastStand' && e.pending.reactor === 'a'));
    assert.ok(s.pending && s.pending.kind === 'lastStand');
    assert.equal(s.units.a.down, 'downed', 'nothing settled yet');
    // the same three failures on the rogue: it simply dies
    const t = createBattle(setup()).state;
    const r = t.units.rogue_0;
    r.hp = 0;
    r.down = 'downed';
    r.deathSaves = { ok: 0, bad: 2 };
    const e2: BattleEvent[] = [];
    damage(t, r, 4, 'Slashing', { source: 'a' }, e2);
    assert.ok(!t.pending);
  });

  it('the sacrifice: one free blow at 300 %, then stable or dead by the 34 %', () => {
    let lived = 0;
    let died = 0;
    let struck = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { s } = thirdSave('Slashing', seed);
      const out = ok(applyAction(s, { type: 'react', unit: 'a', take: true }));
      const stands = out.events.filter((e): e is Extract<BattleEvent, { t: 'lastStand' }> => e.t === 'lastStand');
      assert.equal(stands.length, 2);
      assert.equal(stands[0].choice, 'sacrifice');
      const a = out.state.units.a;
      assert.equal(a.hp, 0, 'spent after the blow');
      assert.ok(a.down === 'stable' || a.down === 'dead');
      assert.equal(stands[1].lives, a.down === 'stable');
      if (a.down === 'stable') lived++;
      else died++;
      // the blow: her own attack, no action of hers spent beforehand (she had none), its damage tripled
      const hit = out.events.find((e): e is Extract<BattleEvent, { t: 'damage' }> => e.t === 'damage' && e.unit === 'rogue_0');
      if (hit) {
        struck++;
        assert.equal(hit.amount % SACRIFICE_POWER, 0, `tripled: ${hit.amount}`);
        assert.ok(hit.amount >= SACRIFICE_POWER);
      }
      assert.ok(out.events.some((e) => e.t === 'attack' && e.unit === 'a'), 'she struck');
      assert.ok(!a.lastStand, 'the flag is cleared');
      assert.ok(!out.state.pending || out.state.pending.kind !== 'lastStand');
      assert.ok(logLine(stands[1], out.state, 'es')!.text.length > 0);
    }
    assert.ok(lived > 0 && died > 0, `both fates happen (${lived} lived, ${died} died)`);
    assert.ok(struck > 0, 'some blows land');
    // the owner's numbers
    assert.equal(SACRIFICE_LIVES, 0.34);
    assert.equal(SACRIFICE_POWER, 3);
  });

  it('the sacrifice strikes a foe in reach from where the ninja lies, never dodges or heals (it is at 1 HP)', () => {
    let struck = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { s } = thirdSave('Slashing', seed);
      // the rogue a few steps off: her blade would need a walk she cannot take; her kunai reaches
      place(s, 'rogue_0', { x: s.units.a.pos.x + 4, z: s.units.a.pos.z });
      const out = ok(applyAction(s, { type: 'react', unit: 'a', take: true }));
      assert.ok(out.events.some((e) => e.t === 'attack' && e.unit === 'a' && e.target === 'rogue_0'), `seed ${seed}: she struck`);
      assert.ok(!out.events.some((e) => e.t === 'move' && e.unit === 'a'), 'she does not walk');
      assert.ok(!out.events.some((e) => e.t === 'act' && e.unit === 'a' && e.act === 'dodge'));
      struck++;
    }
    assert.equal(struck, 20);
  });

  it('the retreat: out of the battle alive at 1 HP, with the mutilation the last blow fixed', () => {
    const { s } = thirdSave('Slashing');
    const out = ok(applyAction(s, { type: 'react', unit: 'a', take: false }));
    const a = out.state.units.a;
    assert.equal(a.down, 'fled');
    assert.equal(a.hp, 1);
    assert.equal(a.mutilation, 'missing_eye');
    const stand = out.events.find((e): e is Extract<BattleEvent, { t: 'lastStand' }> => e.t === 'lastStand')!;
    assert.equal(stand.choice, 'retreat');
    assert.equal(stand.mutilation, 'missing_eye');
    assert.ok(logLine(stand, out.state, 'es')!.text.includes('Ojo perdido'));
    // the blow decides the wound
    assert.equal(mutilationFor('Slashing'), 'missing_eye');
    assert.equal(mutilationFor('Piercing'), 'missing_eye');
    assert.equal(mutilationFor('Bludgeoning'), 'missing_leg');
    assert.equal(mutilationFor('Force'), 'missing_leg');
    assert.equal(mutilationFor('Fire'), 'missing_arm');
    assert.equal(mutilationFor(undefined), 'missing_arm');
    assert.equal(ok(applyAction(thirdSave('Bludgeoning').s, { type: 'react', unit: 'a', take: false })).state.units.a.mutilation, 'missing_leg');
    assert.equal(ok(applyAction(thirdSave('Fire').s, { type: 'react', unit: 'a', take: false })).state.units.a.mutilation, 'missing_arm');
  });

  it('the mutilation goes home with the ninja: a permanent effect on the character after the battle', () => {
    const { s } = thirdSave('Bludgeoning');
    const out = ok(applyAction(s, { type: 'react', unit: 'a', take: false }));
    const r = battleResult(out.state);
    const m = r.members.find((x) => x.id === 'a')!;
    assert.equal(m.mutilation, 'missing_leg');
    assert.ok(!m.died);
    const c = hero({ id: 'a', name: 'Aki' });
    const p = newMission([c, HANA], { seed: 4, noRandomness: true });
    const after = applyBattleResult(p, { victory: false, members: [m] }, 'b1').party;
    assert.ok(hasEffect(after.members[0].effects, 'missing_leg'));
    // a second battle does not stack it
    const again = applyBattleResult(after, { victory: true, members: [m] }, 'b2').party;
    assert.equal(again.members[0].effects.filter((e) => e.id === 'missing_leg').length, 1);
  });
});

const withEffect = (id: Parameters<typeof addEffect>[1]) => hero({ id: 'a', name: 'Aki', effects: addEffect([], id).effects });

describe('mutilations and implants (the rules they change)', () => {
  it('a missing arm: a two-handed weapon at disadvantage; a missing leg: 3 m less speed', () => {
    const naginata = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, appearance: { ...c.appearance!, slots: { ...c.appearance!.slots, held: { id: 'held_naginata', colors: {} } } } });
    const whole = createBattle(setup({ party: [{ character: naginata(hero({ id: 'a', name: 'Aki' })), pos: { x: 8, z: 10 } }] })).state;
    const oneArm = createBattle(setup({ party: [{ character: naginata(withEffect('missing_arm')), pos: { x: 8, z: 10 } }] })).state;
    for (const s of [whole, oneArm]) {
      place(s, 'a', { x: 8, z: 10 });
      place(s, 'rogue_0', { x: 10, z: 10 });
    }
    assert.ok(whole.units.a.weapon.twoHanded);
    assert.ok(!attackPreview(whole, whole.units.a, whole.units.rogue_0, 'melee').reasons.includes('oneArm'));
    const p = attackPreview(oneArm, oneArm.units.a, oneArm.units.rogue_0, 'melee');
    assert.ok(p.reasons.includes('oneArm'), p.reasons.join());
    assert.equal(p.adv, 'disadvantage');
    const oneLeg = createBattle(setup({ party: [{ character: withEffect('missing_leg'), pos: { x: 8, z: 10 } }] })).state;
    assert.equal(oneLeg.units.a.speed, whole.units.a.speed - 3);
  });

  it('a missing eye: the kunai flies 3 m less and passive Perception loses 5', () => {
    const whole = createBattle(setup()).state;
    const oneEye = createBattle(setup({ party: [{ character: withEffect('missing_eye'), pos: { x: 8, z: 10 } }] })).state;
    for (const s of [whole, oneEye]) {
      s.units.a.pos = { x: 8, z: 10 };
      s.units.rogue_0.pos = { x: 8 + KUNAI_LONG - 1, z: 10 };
    }
    assert.ok(attackPreview(whole, whole.units.a, whole.units.rogue_0, 'ranged').inRange);
    assert.ok(!attackPreview(oneEye, oneEye.units.a, oneEye.units.rogue_0, 'ranged').inRange);
    assert.equal(passivePerception(oneEye.units.a), passivePerception(whole.units.a) - 5);
  });

  it('a wooden arm: the grapple hook pulls the ninja to a spot in sight within its range, a bonus action', () => {
    const s = createBattle(setup({ party: [{ character: withEffect('implant_wood_arm'), pos: { x: 8, z: 10 } }] })).state;
    const a = s.units.a;
    place(s, 'a', { x: 8, z: 10 });
    s.turn = s.order.indexOf('a');
    a.turn = { move: a.speed, action: true, bonus: true, reaction: true, moved: 0 };
    const from = { ...a.pos };
    // too far: refused; a spot at 4 m: taken, no movement spent
    const far = { x: from.x + HOOK_RANGE + 2, z: from.z };
    assert.ok(!applyAction(structuredClone(s), { type: 'hook', unit: 'a', at: far }).ok);
    let at: Pt | undefined;
    for (let dx = 4; dx >= 2 && !at; dx -= 0.5) {
      const c = cellOf({ x: from.x + dx, z: from.z });
      if (!cellBlocked(s, c) && !waterAtPt(s, cellCenter(c)) && canStop(s, a, c)) at = cellCenter(c);
    }
    assert.ok(at, 'a free spot east of her');
    const out = ok(applyAction(s, { type: 'hook', unit: 'a', at }));
    assert.ok(dist(out.state.units.a.pos, at) < 0.1);
    assert.equal(out.state.units.a.turn.bonus, false);
    assert.equal(out.state.units.a.turn.move, a.speed, 'no movement spent');
    assert.ok(out.events.some((e) => e.t === 'pushed' && e.unit === 'a' && e.what === 'hook'));
    // without the arm there is no hook
    const plain = createBattle(setup()).state;
    plain.turn = plain.order.indexOf('a');
    assert.equal(applyAction(plain, { type: 'hook', unit: 'a', at: { x: plain.units.a.pos.x + 2, z: plain.units.a.pos.z } }).reason, 'noHook');
  });

  it('a steel leg: the ninja jump keeps the bonus action; a transplanted eye: 3 m more sight at night', () => {
    const s = createBattle(setup({ party: [{ character: withEffect('implant_steel_leg'), pos: { x: 8, z: 10 } }] })).state;
    s.turn = s.order.indexOf('a');
    s.units.a.turn = { move: s.units.a.speed, action: true, bonus: true, reaction: true, moved: 0 };
    const out = ok(applyAction(s, { type: 'jump', unit: 'a' }));
    assert.ok(out.state.units.a.cond.ninjaJump);
    assert.equal(out.state.units.a.turn.bonus, true);
    const night = createBattle(setup({ time: 'night', party: [{ character: withEffect('implant_eye'), pos: { x: 8, z: 10 } }] })).state;
    const plainNight = createBattle(setup({ time: 'night' })).state;
    for (const t of [night, plainNight]) {
      t.units.a.pos = { x: 8, z: 10 };
      t.units.a.facing = 1;
      t.walls = [];
    }
    const p = { x: 8 + VISION.night + 2, z: 10 };
    assert.ok(seesPoint(night, night.units.a, p), 'the eye sees it');
    assert.ok(!seesPoint(plainNight, plainNight.units.a, p), 'a plain eye does not');
  });
});
