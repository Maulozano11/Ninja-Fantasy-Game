// The clone jutsu's clones on the map (battle/clones.ts; docs/GAMEPLAY_DESIGN.md, "Shadow Clone",
// the owner's answer of 2026-10-23): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt, Unit } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
import { canStop } from './nav';
import { attackPreview } from './combat';
import { current } from './turns';
import { fooledBy, planIntent } from './intent';
import { aiAction, runAi } from './ai';
import { battleResult } from './result';
import { JUTSU } from './jutsu';
import { CLONE, clonesOf } from './clones';
import { logLine } from '../components/battle/battleLog';

const CLONE_JUTSU = Object.values(JUTSU).find((j) => j.special === 'clone')!.id;
const D_FIRE = 'fire_three_embers';
const D_KICK = 'leaf_hurricane_senpuu';
const C_WIND = 'wind_blade_daitoppa';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 11,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
    ...over,
  };
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

/** Puts the turn on a unit with a fresh budget. */
function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

/** Moves a unit to the nearest free dry cell to a point. */
function place(s: BattleState, id: string, p: Pt): void {
  const u = s.units[id];
  for (let r = 0; r < 6; r += 0.5) {
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

/** Aki knows the clone jutsu, a rank D and a rank C jutsu, with plenty of chakra; its turn. */
function battle(over: Partial<BattleSetup> = {}): BattleState {
  const s = turnOf(createBattle(setup(over)).state, 'a');
  const a = s.units.a;
  a.jutsus = [CLONE_JUTSU, D_FIRE, D_KICK, C_WIND];
  a.chakra = a.maxChakra = 40;
  return s;
}

const summon = (s: BattleState, enhanced = false) => ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: CLONE_JUTSU, at: { ...s.units.a.pos }, enhanced }));

/** Tries an action from successive points of the dice stream until `good` holds (the dice decide hits). */
function until(s: BattleState, a: Action, good: (out: ReturnType<typeof applyAction>) => boolean): ReturnType<typeof applyAction> {
  for (let r = 0; r < 200; r++) {
    const t = structuredClone(s);
    t.rolls = r;
    const out = applyAction(t, a);
    if (out.ok && good(out)) return out;
  }
  throw new Error('never happened');
}

const of = <T extends BattleEvent['t']>(ev: BattleEvent[], t: T) => ev.filter((e): e is Extract<BattleEvent, { t: T }> => e.t === t);

describe('the clone jutsu: clones on the map', () => {
  it('summons one clone beside the ninja, a copy of it, paid with its chakra (its bonus action)', () => {
    const s = battle();
    const out = summon(s);
    const a = out.state.units.a;
    const cl = clonesOf(out.state, 'a');
    assert.equal(cl.length, 1);
    const c = cl[0];
    assert.equal(c.clone?.of, 'a');
    assert.equal(c.team, 'party');
    assert.deepEqual(c.look, a.look);
    const d = dist(c.pos, a.pos);
    assert.ok(d >= CLONE.near - 0.01 && d <= CLONE.far + 0.01, `stands beside it (${d.toFixed(2)} m)`);
    assert.equal(a.chakra, 40 - JUTSU[CLONE_JUTSU].cost);
    assert.equal(a.clonePoints, CLONE.points.plain);
    assert.equal(a.turn.bonus, false);
    assert.equal(a.turn.action, true);
    const up = of(out.events, 'clone').find((e) => e.on);
    assert.ok(up && up.by === 'a' && up.unit === c.id && up.at);
    // A clone takes no turns: it isn't in the initiative order.
    assert.ok(!out.state.order.includes(c.id));
  });

  it('enhanced makes two clones on two cells, with 2 points of jutsu', () => {
    const out = summon(battle(), true);
    const cl = clonesOf(out.state, 'a');
    assert.equal(cl.length, 2);
    assert.ok(dist(cl[0].pos, cl[1].pos) > 0.4);
    assert.equal(out.state.units.a.clonePoints, CLONE.points.enhanced);
    assert.equal(out.state.units.a.chakra, 40 - JUTSU[CLONE_JUTSU].cost - JUTSU[CLONE_JUTSU].enhCost);
  });

  it('casting again replaces the clones still standing', () => {
    let s = summon(battle(), true).state;
    s.units.a.turn.bonus = true;
    const out = summon(s);
    assert.equal(clonesOf(out.state, 'a').length, 1);
    assert.equal(of(out.events, 'clone').filter((e) => !e.on && e.why === 'recast').length, 2);
    s = out.state;
  });

  it('is only cast once the fighting starts', () => {
    const s = createBattle(setup({ stealth: true })).state;
    s.units.a.jutsus = [CLONE_JUTSU];
    const out = applyAction(s, { type: 'jutsu', unit: 'a', jutsu: CLONE_JUTSU, at: { ...s.units.a.pos } });
    assert.equal(out.reason, 'combatOnly');
  });

  it('the clones follow their ninja, to its side, and flank the foe it fights', () => {
    const s = summon(battle()).state;
    place(s, 'rogue_0', { x: 16, z: 10 });
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf({ x: 15, z: 10 }) }));
    const a = out.state.units.a;
    const c = clonesOf(out.state, 'a')[0];
    assert.ok(dist(c.pos, a.pos) <= CLONE.far + 0.01);
    assert.ok(dist(c.pos, out.state.units.rogue_0.pos) <= CLONE.reach, 'next to the foe');
    assert.ok(of(out.events, 'move').some((e) => e.unit === c.id));
  });
});

describe('the clones flank and strike in a combo', () => {
  /** Aki next to the rogue, its clone on the rogue's other side. */
  function engaged(enhanced = false): BattleState {
    const s = battle();
    place(s, 'rogue_0', { x: 14, z: 10 });
    place(s, 'a', { x: 13, z: 10 });
    const out = summon(s, enhanced);
    const t = out.state;
    for (const c of clonesOf(t, 'a')) place(t, c.id, { x: 15, z: 10 });
    return t;
  }

  it('+2 to melee attacks at a foe a clone stands next to (not to kunai)', () => {
    const s = engaged();
    const a = s.units.a;
    const r = s.units.rogue_0;
    const melee = attackPreview(s, a, r, 'melee');
    assert.equal(melee.flank, CLONE.flank);
    const away = structuredClone(s);
    for (const c of clonesOf(away, 'a')) place(away, c.id, { x: 10, z: 14 });
    assert.equal(attackPreview(away, away.units.a, away.units.rogue_0, 'melee').mod + CLONE.flank, melee.mod);
    assert.equal(attackPreview(s, a, r, 'ranged').flank, undefined);
  });

  it('a blow that lands: the clone joins in, a combo of 1d6 more', () => {
    const s = engaged();
    const out = until(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (o) => of(o.events, 'attack')[0]?.roll.success && !o.state.units.rogue_0.down);
    const c = clonesOf(s, 'a')[0];
    const combo = of(out.events, 'combo');
    assert.equal(combo.length, 1);
    assert.equal(combo[0].unit, c.id);
    assert.equal(combo[0].by, 'a');
    const dmg = of(out.events, 'damage').filter((e) => e.source === c.id);
    assert.equal(dmg.length, 1);
    assert.ok(dmg[0].amount >= 1 && dmg[0].amount <= 6);
    assert.equal(of(out.events, 'attack')[0].flank, CLONE.flank);
  });

  it('a blow that misses: no combo', () => {
    const s = engaged();
    const out = until(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (o) => !of(o.events, 'attack')[0]?.roll.success);
    assert.equal(of(out.events, 'combo').length, 0);
  });

  it('a taijutsu of the ninja: every clone flashes in and strikes too (one die of the jutsu)', () => {
    const s = engaged(true);
    // The clones stand away from the foe: they flash in for the taijutsu.
    for (const c of clonesOf(s, 'a')) place(s, c.id, { x: 11, z: 12 });
    const out = until(s, { type: 'jutsu', unit: 'a', jutsu: D_KICK, at: { ...s.units.a.pos } }, (o) => of(o.events, 'damage').some((e) => e.unit === 'rogue_0' && e.source === 'a') && !o.state.units.rogue_0.down);
    const combo = of(out.events, 'combo');
    assert.equal(combo.length, 2);
    for (const c of clonesOf(out.state, 'a')) {
      assert.ok(of(out.events, 'move').some((e) => e.unit === c.id), 'it flashes in');
      const d = of(out.events, 'damage').find((e) => e.source === c.id);
      assert.ok(d && d.amount >= 1 && d.amount <= 6, 'one d6 of the 2d6+3');
    }
    // The ninja's own spin kick spares its clones.
    assert.equal(clonesOf(out.state, 'a').length, 2);
  });
});

describe('how long a clone lasts', () => {
  it('3 of its ninja’s turns, the one it was summoned in counted', () => {
    let s = summon(battle()).state;
    const id = clonesOf(s, 'a')[0].id;
    const endTurns = (n: number) => {
      // n of Aki's turns end (the rogue's in between end at once).
      let ended = 0;
      while (ended < n) {
        const who = current(s)!.id;
        s = ok(applyAction(s, { type: 'endTurn', unit: who })).state;
        if (who === 'a') ended++;
      }
    };
    endTurns(1);
    assert.equal(s.units[id].clone?.turns, 2);
    assert.ok(!s.units[id].down);
    endTurns(1);
    assert.ok(!s.units[id].down);
    const before = s;
    endTurns(1);
    assert.equal(s.units[id].down, 'fled');
    assert.equal(s.units.a.clonePoints, undefined);
    void before;
  });

  it('one blow aimed at it: it goes up in smoke', () => {
    const s0 = summon(battle()).state;
    const c = clonesOf(s0, 'a')[0];
    place(s0, 'rogue_0', { x: c.pos.x + 1, z: c.pos.z });
    const s = turnOf(s0, 'rogue_0');
    const out = until(s, { type: 'attack', unit: 'rogue_0', target: c.id }, (o) => of(o.events, 'attack')[0]?.roll.success);
    assert.equal(out.state.units[c.id].down, 'fled');
    const gone = of(out.events, 'clone').find((e) => !e.on);
    assert.equal(gone?.why, 'hit');
    assert.equal(of(out.events, 'damage').filter((e) => e.unit === c.id).length, 0);
  });

  it('a blow aimed at its ninja strikes the clone instead: the ninja stood where the clone was', () => {
    const s0 = summon(battle()).state;
    place(s0, 'rogue_0', { x: s0.units.a.pos.x + 1, z: s0.units.a.pos.z });
    const c = clonesOf(s0, 'a')[0];
    const cloneAt = { ...c.pos };
    const s = turnOf(s0, 'rogue_0');
    const hp = s.units.a.hp;
    const out = until(s, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => of(o.events, 'attack')[0]?.roll.success);
    assert.equal(out.state.units.a.hp, hp);
    assert.equal(out.state.units[c.id].down, 'fled');
    assert.equal(of(out.events, 'clone').find((e) => !e.on)?.why, 'blow');
    assert.ok(dist(out.state.units.a.pos, cloneAt) < 0.05, 'the ninja is where its clone stood');
  });

  it('its ninja falls: its clones go; a side with only clones up has lost; results leave them out', () => {
    const s0 = summon(battle(), true).state;
    const s = turnOf(s0, 'rogue_0');
    s.units.a.hp = 1;
    // Kawarimi and the clones aside, the next blow drops Aki: aimed blows are taken by the clones, so a fireball-like unblockable one.
    s.units.rogue_0.cond.warpEdge = true;
    place(s, 'rogue_0', { x: s.units.a.pos.x + 1, z: s.units.a.pos.z });
    const out = until(s, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => !!o.state.units.a.down);
    assert.equal(clonesOf(out.state, 'a').length, 0);
    assert.ok(of(out.events, 'clone').every((e) => e.on || e.why === 'down'));
    assert.equal(out.state.phase, 'ended');
    assert.equal(out.state.outcome, 'defeat');
    assert.deepEqual(battleResult(out.state).members.map((m) => m.id), ['a']);
  });
});

describe('the clones cast jutsu with their ninja’s chakra', () => {
  it('one clone: one rank D jutsu in its life, paid by its ninja; its ninja keeps its action', () => {
    const s = summon(battle()).state;
    const c = clonesOf(s, 'a')[0];
    assert.deepEqual(c.jutsus.sort(), [D_FIRE, D_KICK].sort());
    place(s, 'rogue_0', { x: c.pos.x + 4, z: c.pos.z });
    const chakra = s.units.a.chakra;
    const out = ok(applyAction(s, { type: 'jutsu', unit: c.id, jutsu: D_FIRE, at: { ...s.units.rogue_0.pos }, target: 'rogue_0' }));
    assert.equal(out.state.units.a.chakra, chakra - JUTSU[D_FIRE].cost);
    assert.equal(out.state.units.a.clonePoints, 0);
    assert.equal(out.state.units.a.turn.action, true);
    assert.equal(out.state.units[c.id].chakra, 0);
    assert.ok(of(out.events, 'jutsu').some((e) => e.unit === c.id && e.jutsu === D_FIRE));
    assert.ok(of(out.events, 'chakra').some((e) => e.unit === 'a' && e.delta === -JUTSU[D_FIRE].cost));
    // Next turn its action is back, but the clones have no jutsu left.
    const t = turnOf(out.state, 'a');
    t.units[c.id].turn.action = true;
    assert.equal(applyAction(t, { type: 'jutsu', unit: c.id, jutsu: D_FIRE, at: { ...t.units.rogue_0.pos }, target: 'rogue_0' }).reason, 'cloneSpent');
  });

  it('one clone: no rank C, no enhanced cast, nothing but jutsu, and only in its ninja’s turn', () => {
    const s = summon(battle()).state;
    const c = clonesOf(s, 'a')[0];
    place(s, 'rogue_0', { x: c.pos.x + 4, z: c.pos.z });
    const at = { ...s.units.rogue_0.pos };
    assert.equal(applyAction(s, { type: 'jutsu', unit: c.id, jutsu: C_WIND, at }).reason, 'unknownJutsu');
    assert.equal(applyAction(s, { type: 'jutsu', unit: c.id, jutsu: D_FIRE, at, target: 'rogue_0', enhanced: true }).reason, 'noEnhanced');
    assert.equal(applyAction(s, { type: 'attack', unit: c.id, target: 'rogue_0' }).reason, 'cloneJutsuOnly');
    assert.equal(applyAction(s, { type: 'move', unit: c.id, to: cellOf(at) }).reason, 'cloneJutsuOnly');
    assert.equal(applyAction(turnOf(s, 'rogue_0'), { type: 'jutsu', unit: c.id, jutsu: D_FIRE, at, target: 'rogue_0' }).reason, 'notYourTurn');
    // Its ninja's chakra pays: without it, no cast.
    const poor = structuredClone(s);
    poor.units.a.chakra = 0;
    assert.equal(applyAction(poor, { type: 'jutsu', unit: c.id, jutsu: D_FIRE, at, target: 'rogue_0' }).reason, 'noChakra');
  });

  it('enhanced: one rank C, or two rank D, between the two clones', () => {
    const s = summon(battle(), true).state;
    const [c1, c2] = clonesOf(s, 'a');
    assert.ok(c1.jutsus.includes(C_WIND));
    place(s, 'rogue_0', { x: s.units.a.pos.x + 5, z: s.units.a.pos.z });
    const at = { ...s.units.rogue_0.pos };
    // One C spends both points.
    const c = ok(applyAction(s, { type: 'jutsu', unit: c1.id, jutsu: C_WIND, at }));
    assert.equal(c.state.units.a.clonePoints, 0);
    assert.equal(applyAction(c.state, { type: 'jutsu', unit: c2.id, jutsu: D_FIRE, at, target: 'rogue_0' }).reason, 'cloneSpent');
    // Or two D, one from each clone.
    const d1 = ok(applyAction(s, { type: 'jutsu', unit: c1.id, jutsu: D_FIRE, at, target: 'rogue_0' }));
    assert.equal(d1.state.units.a.clonePoints, 1);
    assert.equal(applyAction(d1.state, { type: 'jutsu', unit: c2.id, jutsu: C_WIND, at }).reason, 'cloneSpent');
    const d2 = ok(applyAction(d1.state, { type: 'jutsu', unit: c2.id, jutsu: D_FIRE, at, target: 'rogue_0' }));
    assert.equal(d2.state.units.a.clonePoints, 0);
    assert.equal(d2.state.units.a.chakra, s.units.a.chakra - 2 * JUTSU[D_FIRE].cost);
  });
});

describe('the AI and the clones', () => {
  it('an AI ninja who knows the jutsu summons its clones to fight in melee, they flank and join its blows', () => {
    const s = battle({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 }, controller: 'ai' }] });
    place(s, 'rogue_0', { x: 11, z: 10 });
    s.units.a.jutsus = [CLONE_JUTSU];
    const first = aiAction(s);
    assert.equal(first?.type, 'jutsu');
    assert.ok(first?.type === 'jutsu' && first.jutsu === CLONE_JUTSU && first.enhanced);
    const out = runAi(s, 40);
    // Its first move: two clones beside it (it summons again later, when they are gone).
    const cast = out.events.findIndex((e) => e.t === 'jutsu');
    assert.deepEqual(out.events.slice(cast + 1, cast + 3).map((e) => e.t), ['clone', 'clone']);
    assert.ok(of(out.events, 'combo').length > 0, 'they join its blows');
    assert.ok(of(out.events, 'attack').some((e) => e.unit === 'a' && e.flank === CLONE.flank), 'it strikes with the clones flanking');
  });

  it('an AI ninja has its clone cast a rank D jutsu once its own action is spent', () => {
    const s = summon(battle({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 }, controller: 'ai' }] })).state;
    place(s, 'rogue_0', { x: 14, z: 10 });
    s.units.a.turn.action = false;
    const a = aiAction(s);
    const c = clonesOf(s, 'a')[0];
    assert.ok(a?.type === 'jutsu' && a.unit === c.id && (a.jutsu === D_FIRE || a.jutsu === D_KICK), JSON.stringify(a));
  });

  it('foes are fooled by the clones now and then, the same way every time for the same moment', () => {
    const s = summon(battle(), true).state;
    const rogue = s.units.rogue_0;
    const plan = { kind: 'melee' as const, what: 'Blade', target: 'a' };
    let atClone = 0;
    let atNinja = 0;
    for (let tick = 0; tick < 200; tick++) {
      const t = { ...s, tick };
      const i = fooledBy(t, rogue, plan);
      assert.deepEqual(fooledBy(t, rogue, plan), i);
      if (i.target === 'a') atNinja++;
      else {
        assert.ok(clonesOf(s, 'a').some((c) => c.id === i.target));
        atClone++;
      }
    }
    // Two clones: about half the plans go at a clone (n in n + 2).
    assert.ok(atClone > 60 && atNinja > 60, `${atClone} / ${atNinja}`);
    // No clones: never fooled.
    assert.equal(fooledBy(battle(), rogue, plan).target, 'a');
    // Enemies don't plan on their own for a clone, and clones plan nothing.
    for (const c of clonesOf(s, 'a')) assert.equal(planIntent(s, c)?.target === c.id, false);
  });

  it('a battle with clones survives JSON and replays exactly', () => {
    const s = summon(battle({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 }, controller: 'ai' }] }), true).state;
    const saved: BattleState = JSON.parse(JSON.stringify(s));
    const a = runAi(s, 60);
    const b = runAi(saved, 60);
    assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
  });
});

describe('the clones in the battle log', () => {
  const s = summon(battle()).state;
  const c: Unit = clonesOf(s, 'a')[0];
  it('summoned, struck instead of its ninja, gone, in Spanish and English', () => {
    assert.equal(logLine({ t: 'clone', unit: c.id, on: true, by: 'a', at: c.pos }, s, 'es')?.text, 'Aparece un clon de Aki');
    assert.equal(logLine({ t: 'clone', unit: c.id, on: true, by: 'a', at: c.pos }, s, 'en')?.text, 'A clone of Aki appears');
    assert.equal(logLine({ t: 'clone', unit: c.id, on: false, by: 'a', at: c.pos, why: 'blow' }, s, 'es')?.text, 'El golpe da en un clon; Aki estaba a su lado');
    assert.equal(logLine({ t: 'clone', unit: c.id, on: false, by: 'a', at: c.pos, why: 'blow' }, s, 'en')?.text, 'The blow strikes a clone; Aki stood beside it');
    assert.equal(logLine({ t: 'clone', unit: c.id, on: false, by: 'a', at: c.pos, why: 'hit' }, s, 'es')?.text, 'El Clon de Aki se desvanece en humo');
    assert.equal(logLine({ t: 'clone', unit: c.id, on: false, by: 'a', at: c.pos, why: 'expired' }, s, 'en')?.text, "Aki's clone fades away");
    assert.equal(logLine({ t: 'clone', unit: c.id, on: false, by: 'a', at: c.pos, why: 'recast' }, s, 'es'), null);
  });

  it('the combo, and the +2 of the flank on the attack line', () => {
    assert.equal(logLine({ t: 'combo', unit: c.id, by: 'a', target: 'rogue_0' }, s, 'es')?.text, '¡El Clon de Aki se une: combo contra el Renegado!');
    assert.equal(logLine({ t: 'combo', unit: c.id, by: 'a', target: 'rogue_0' }, s, 'en')?.text, "Aki's clone joins in: combo on Rogue!");
    const roll = { kind: 'attack' as const, d20: 15, rolls: [15], mod: 7, total: 22, dc: 13, success: true, chance: 0.8 };
    const es = logLine({ t: 'attack', unit: 'a', target: 'rogue_0', what: 'Katana', roll, ranged: false, flank: 2 }, s, 'es')?.text ?? '';
    assert.ok(es.endsWith('(+2, un clon flanquea)'), es);
    const en = logLine({ t: 'attack', unit: 'a', target: 'rogue_0', what: 'Katana', roll, ranged: false, flank: 2 }, s, 'en')?.text ?? '';
    assert.ok(en.endsWith('(+2, a clone flanks)'), en);
  });

  it('the old decoy of a battle saved before still reads as it did', () => {
    assert.equal(logLine({ t: 'clone', unit: 'a', on: false }, s, 'es')?.text, 'Un clon recibe el golpe');
  });
});
