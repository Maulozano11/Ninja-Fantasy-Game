// The owner's dice rules in battle (docs/GAMEPLAY_DESIGN.md "Dice"): a natural 20 on an attack is
// a critical with maximum damage; on a save, a natural 20 resists completely (A3) and a natural 1
// takes maximum damage like a critical (B3); on a check, a natural 20 succeeds with an extra and a
// natural 1 fails (C3). Death saves are unchanged.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { maxCritDamage } from '../rules/dice';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt, RollInfo } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
import { canStop } from './nav';
import { PERFECT_HIDE, rollDiceExpr } from './combat';
import { current, endTurn } from './turns';
import { saveHit } from './hazards';
import { JUTSU } from './jutsu';
import { wielded } from './units';
import { logLine } from '../components/battle/battleLog';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const strong = (over: Partial<ShinobiCharacter> = {}) => hero({ ...over, stats: { ...DEFAULT_CHARACTER.stats, str: 30, dex: 30, wis: 30 } });

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

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

function place(s: BattleState, id: string, p: Pt): void {
  const u = s.units[id];
  for (let r = 0; r < 6; r += 0.5)
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (cellBlocked(s, c) || waterAtPt(s, cellCenter(c)) || !canStop(s, u, c)) continue;
      u.pos = cellCenter(c);
      return;
    }
  throw new Error('no free cell');
}

/** Plays `act` on copies of `s` with seeds 1.. until `want` holds, and returns that outcome. */
function seedWhere(s: BattleState, act: (t: BattleState) => ReturnType<typeof applyAction>, want: (ev: BattleEvent[], st: BattleState) => boolean, limit = 600) {
  for (let seed = 1; seed < limit; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = act(t);
    assert.ok(out.ok, out.reason);
    if (want(out.events, out.state)) return { ...out, seed };
  }
  throw new Error('no seed gives that roll');
}

const rollOf = (ev: BattleEvent[], t: BattleEvent['t'], what?: string): RollInfo | undefined => {
  const e = ev.find((x) => x.t === t && (what === undefined || ('what' in x && x.what === what)));
  return e && 'roll' in e ? e.roll : undefined;
};
const damageTo = (ev: BattleEvent[], id: string) => ev.find((e): e is Extract<BattleEvent, { t: 'damage' }> => e.t === 'damage' && e.unit === id);

describe('attacks: a natural 20 is a critical with maximum damage', () => {
  const duel = () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'rogue_0', { x: 9.25, z: 10.25 });
    s.units.rogue_0.hp = s.units.rogue_0.maxHp = 500;
    return s;
  };
  const strike = (t: BattleState) => applyAction(t, { type: 'attack', unit: 'a', target: 'rogue_0' });

  it('every weapon die at its highest, the doubled dice too, plus the modifier (the same on every seed)', () => {
    const s = duel();
    const w = wielded(s.units.a);
    const mods = new Set<number>();
    let found = 0;
    for (let seed = 1; seed < 900 && found < 3; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const out = strike(t);
      const roll = rollOf(out.events, 'attack');
      const dmg = damageTo(out.events, 'rogue_0');
      if (!roll?.crit || !dmg) continue;
      found++;
      assert.equal(dmg.crit, true);
      mods.add(dmg.amount - maxCritDamage(w.dice));
    }
    assert.equal(found, 3, 'three seeds roll a natural 20 that lands');
    assert.equal(mods.size, 1, 'a critical never varies: the dice are always at their maximum');
    const mod = [...mods][0];
    assert.ok(mod >= -1 && mod <= 6, `the weapon's ability modifier, got ${mod}`);
  });

  it('a natural 1 still misses, however strong the attacker', () => {
    const s = duel();
    s.units.a.stats = { ...s.units.a.stats, str: 30, dex: 30 };
    const out = seedWhere(s, strike, (ev) => rollOf(ev, 'attack')?.d20 === 1);
    assert.equal(rollOf(out.events, 'attack')!.success, false);
    assert.equal(damageTo(out.events, 'rogue_0'), undefined);
  });

  it('the dice helper: a critical takes its place in the dice stream, so later rolls stay the same', () => {
    const s = duel();
    const a = structuredClone(s), b = structuredClone(s);
    assert.equal(rollDiceExpr(a, '2d6+3', true), 27);
    rollDiceExpr(b, '2d6+3');
    assert.equal(a.rolls, b.rolls);
    assert.equal(rollDiceExpr(a, '1d20'), rollDiceExpr(b, '1d20'));
  });

  it('the log says it: the natural 20 and the maximum damage, in Spanish and English', () => {
    const s = duel();
    const out = seedWhere(s, strike, (ev) => !!rollOf(ev, 'attack')?.crit && !!damageTo(ev, 'rogue_0'));
    const dmg = damageTo(out.events, 'rogue_0')!;
    assert.match(logLine(out.events.find((e) => e.t === 'attack')!, out.state, 'es')!.text, /^¡20 natural! ¡Aki asesta un crítico/);
    assert.equal(logLine(dmg, out.state, 'es')!.text.startsWith(`¡Crítico! Daño máximo: ${dmg.amount} de `), true);
    assert.equal(logLine(dmg, out.state, 'en')!.text.startsWith(`Critical! Maximum damage: ${dmg.amount} `), true);
  });
});

describe('saves against a jutsu (the owner\'s A3 and B3)', () => {
  const base = () => createBattle(setup()).state;
  const save = (s: BattleState, dc: number) => {
    const ev: BattleEvent[] = [];
    const hit = saveHit(s, s.units.rogue_0, 'dex', dc, 10, 'Fire', true, 'a', 'fireball_goukakyu', { effect: 'burning' }, ev, 'none', 27);
    return { hit, roll: rollOf(ev, 'save')! };
  };
  const until = (dc: number, want: (r: RollInfo) => boolean) => {
    for (let seed = 1; seed < 600; seed++) {
      const s = base();
      s.seed = seed;
      const r = save(s, dc);
      if (want(r.roll)) return r;
    }
    throw new Error('no seed');
  };

  it('A3: a natural 20 resists completely, even an impossible DC: no damage, not even half, no effect', () => {
    const { hit, roll } = until(40, (r) => r.d20 === 20);
    assert.equal(roll.success, true);
    assert.equal(hit.amount, 0);
    assert.equal(hit.effect, undefined);
  });

  it('B3: a natural 1 fails even an easy DC and takes the maximum, as a critical, with the full effect', () => {
    const { hit, roll } = until(2, (r) => r.d20 === 1);
    assert.equal(roll.success, false);
    assert.equal(hit.amount, 27);
    assert.equal(hit.crit, true);
    assert.equal(hit.effect, 'burning');
  });

  it('any other roll is unchanged: half on a success, all on a failure', () => {
    assert.equal(until(12, (r) => r.success && r.d20 !== 20).hit.amount, 5);
    assert.equal(until(12, (r) => !r.success && r.d20 !== 1).hit.amount, 10);
  });

  it('a Fireball whose target rolls a natural 1 lands as a critical: maximum damage, the critical animation, the log', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.units.rogue_0.hp = s.units.rogue_0.maxHp = 500;
    const cast = (t: BattleState) => applyAction(t, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { ...s.units.rogue_0.pos } });
    const out = seedWhere(s, cast, (ev) => rollOf(ev, 'save')?.d20 === 1 && !!damageTo(ev, 'rogue_0'));
    const dmg = damageTo(out.events, 'rogue_0')!;
    assert.equal(dmg.crit, true);
    assert.equal(dmg.amount, maxCritDamage(JUTSU.fireball_goukakyu.dice!));
    assert.match(logLine(out.events.find((e) => e.t === 'save')!, out.state, 'es')!.text, /^¡1 natural! /);
  });
});

describe('checks (the owner\'s C3): a natural 20 succeeds with an extra, a natural 1 fails', () => {
  it('hide: a natural 20 hides perfectly until the ninja\'s next turn, crouched or not', () => {
    const s = turnOf(createBattle(setup({ time: 'night' })).state, 'a');
    const out = seedWhere(s, (t) => applyAction(t, { type: 'hide', unit: 'a' }), (ev) => !!rollOf(ev, 'check', 'stealth')?.crit);
    const a = out.state.units.a;
    assert.equal(a.cond.hidden, PERFECT_HIDE);
    const total = rollOf(out.events, 'check', 'stealth')!.total;
    assert.equal(a.cond.perfectHide, total);
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'hideCrit'));
    // Its turn ends without crouching: still hidden. At its next turn the hide is an ordinary one.
    const st = structuredClone(out.state);
    const ev: BattleEvent[] = [];
    endTurn(st, ev);
    assert.equal(st.units.a.cond.hidden, PERFECT_HIDE);
    for (let i = 0; i < 20 && current(st)?.id !== 'a'; i++) endTurn(st, ev);
    assert.equal(current(st)?.id, 'a');
    assert.equal(st.units.a.cond.hidden, total);
    assert.equal(st.units.a.cond.perfectHide, undefined);
  });

  it('hide: a natural 1 fails, however stealthy', () => {
    const s = turnOf(createBattle(setup({ time: 'night', party: [{ character: strong({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }] })).state, 'a');
    const out = seedWhere(s, (t) => applyAction(t, { type: 'hide', unit: 'a' }), (ev) => rollOf(ev, 'check', 'stealth')?.d20 === 1, 6000);
    assert.equal(out.state.units.a.cond.hidden, undefined);
  });

  const shoveSetup = (character = hero({ id: 'a', name: 'Aki' })) => {
    const s = turnOf(createBattle(setup({ party: [{ character, pos: { x: 8, z: 10 } }] })).state, 'a');
    place(s, 'rogue_0', { x: 9.25, z: 10.25 });
    return s;
  };
  const shove = (t: BattleState) => applyAction(t, { type: 'shove', unit: 'a', target: 'rogue_0', mode: 'push' });

  it('shove: a natural 20 wins, knocks the target down and throws it 3 m', () => {
    const s = shoveSetup();
    const from = { ...s.units.rogue_0.pos };
    const out = seedWhere(s, shove, (ev) => !!rollOf(ev, 'check', 'shove')?.crit && !rollOf(ev, 'check', 'resistShove')?.crit);
    const r = out.state.units.rogue_0;
    assert.equal(rollOf(out.events, 'check', 'shove')!.success, true);
    assert.equal(r.cond.prone, true);
    assert.ok(dist(r.pos, from) > 2.5, `thrown about 3 m, got ${dist(r.pos, from)}`);
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'shoveCrit'));
  });

  it('shove: resisting with a natural 20 wins even against the strongest, and the shover falls', () => {
    const s = shoveSetup(strong({ id: 'a', name: 'Aki' }));
    const out = seedWhere(s, shove, (ev) => !!rollOf(ev, 'check', 'resistShove')?.crit);
    assert.equal(rollOf(out.events, 'check', 'shove')!.success, false);
    assert.equal(rollOf(out.events, 'check', 'resistShove')!.success, true);
    assert.equal(out.state.units.a.cond.prone, true);
    assert.deepEqual(out.state.units.rogue_0.pos, s.units.rogue_0.pos);
  });

  it('shove: a natural 1 loses, however strong', () => {
    const s = shoveSetup(strong({ id: 'a', name: 'Aki' }));
    const out = seedWhere(s, shove, (ev) => rollOf(ev, 'check', 'shove')?.d20 === 1 && !rollOf(ev, 'check', 'resistShove')?.fumble);
    assert.equal(rollOf(out.events, 'check', 'shove')!.success, false);
    assert.deepEqual(out.state.units.rogue_0.pos, s.units.rogue_0.pos);
  });

  const medicSetup = (character = hero({ id: 'a', name: 'Aki' })) => {
    const s = turnOf(createBattle(setup({ party: [{ character, pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 9.5, z: 10 } }] })).state, 'a');
    const b = s.units.b;
    b.hp = 0;
    b.down = 'downed';
    b.deathSaves = { ok: 0, bad: 0 };
    b.cond = { prone: true };
    return s;
  };
  const stabilize = (t: BattleState) => applyAction(t, { type: 'stabilize', unit: 'a', target: 'b' });

  it('medicine: a natural 20 does more than stabilize, the ally gets up with 1 HP', () => {
    const out = seedWhere(medicSetup(), stabilize, (ev) => !!rollOf(ev, 'check', 'medicine')?.crit);
    const b = out.state.units.b;
    assert.equal(b.down, undefined);
    assert.equal(b.hp, 1);
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'medicineCrit'));
  });

  it('medicine: a natural 1 fails against DC 10, however wise', () => {
    const out = seedWhere(medicSetup(strong({ id: 'a', name: 'Aki' })), stabilize, (ev) => rollOf(ev, 'check', 'medicine')?.d20 === 1);
    assert.equal(out.state.units.b.down, 'downed');
  });

  it('death saves are not checks: they stay as they were (a 20 wakes the ninja, a 1 counts twice)', () => {
    const s = medicSetup();
    // The rule did not touch them: a natural 1 is two failures, nothing more.
    for (let seed = 1; seed < 300; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const ev: BattleEvent[] = [];
      for (let i = 0; i < t.order.length && current(t)?.id !== 'b'; i++) endTurn(t, ev);
      const d = ev.find((e) => e.t === 'deathSave');
      if (d && d.t === 'deathSave' && d.roll.d20 === 1) {
        assert.equal(d.bad, 2);
        assert.equal(d.roll.kind, 'death');
        return;
      }
    }
    assert.fail('no seed rolls a natural 1 death save');
  });
});
