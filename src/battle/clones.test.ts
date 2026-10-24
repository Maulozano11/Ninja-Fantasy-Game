// The clone jutsu's clones on the map (battle/clones.ts; docs/GAMEPLAY_DESIGN.md, "Shadow Clone",
// the owner's answer of 2026-10-23): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Cell, Pt, Unit } from './types';
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
import { CLONE, clonesOf, disguisedNow, figuresOf } from './clones';
import { seesThrough } from './combat';
import { encounterSetup } from './encounters';
import { enemyKnowsClone } from './units';
import { openFight } from './stealth';
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

/** Aki casts the clone jutsu: a player's clones come out controlled, and play their turns first. */
const summon = (s: BattleState, enhanced = false) => ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: CLONE_JUTSU, at: { ...s.units.a.pos }, enhanced }));

/** Aki casts the clone jutsu and sets each clone to follow him: the turn comes back to him. */
function follow(s: BattleState, enhanced = false): { state: BattleState; events: BattleEvent[] } {
  const out = summon(s, enhanced);
  let t = out.state;
  const events = [...out.events];
  for (const c of clonesOf(t, 'a')) {
    const o = ok(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'follow' }));
    events.push(...o.events);
    t = o.state;
  }
  assert.equal(current(t)?.id, 'a');
  return { state: t, events };
}

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
    const out = follow(s);
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
    // It stands right above its ninja in the initiative order (following, it takes no turn there).
    assert.equal(out.state.order.indexOf(c.id), out.state.order.indexOf('a') - 1);
  });

  it('enhanced makes two clones on two cells, with 2 points of jutsu', () => {
    const out = follow(battle(), true);
    const cl = clonesOf(out.state, 'a');
    assert.equal(cl.length, 2);
    assert.ok(dist(cl[0].pos, cl[1].pos) > 0.4);
    assert.equal(out.state.units.a.clonePoints, CLONE.points.enhanced);
    assert.equal(out.state.units.a.chakra, 40 - JUTSU[CLONE_JUTSU].cost - JUTSU[CLONE_JUTSU].enhCost);
  });

  it('casting again replaces the clones still standing (and they leave the initiative order)', () => {
    const s = follow(battle(), true).state;
    const old = clonesOf(s, 'a').map((c) => c.id);
    s.units.a.turn.bonus = true;
    const out = summon(s);
    assert.equal(clonesOf(out.state, 'a').length, 1);
    assert.equal(of(out.events, 'clone').filter((e) => !e.on && e.why === 'recast').length, 2);
    assert.ok(old.every((id) => !out.state.order.includes(id)));
  });

  it('can be cast while sneaking too (silently: the guards are none the wiser)', () => {
    const s = createBattle(setup({ stealth: true })).state;
    s.units.a.jutsus = [CLONE_JUTSU];
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: CLONE_JUTSU, at: { ...s.units.a.pos } }));
    assert.equal(out.state.phase, 'stealth');
    const c = clonesOf(out.state, 'a')[0];
    assert.equal(c.clone?.mode, 'control');
    assert.equal(c.turn.move, c.speed, 'it moves this stealth turn');
  });

  it('the clones follow their ninja, to its side, and flank the foe it fights', () => {
    const s = follow(battle()).state;
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
    const out = follow(s, enhanced);
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
    let s = follow(battle()).state;
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
    const s0 = follow(battle()).state;
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
    const s0 = follow(battle()).state;
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
    const s0 = follow(battle(), true).state;
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
    const s = follow(battle()).state;
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
    const s = follow(battle()).state;
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
    const s = follow(battle(), true).state;
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
    assert.equal(clonesOf(s, 'a')[0].clone?.mode, 'follow', "the AI's clones follow it");
    place(s, 'rogue_0', { x: 14, z: 10 });
    s.units.a.turn.action = false;
    const a = aiAction(s);
    const c = clonesOf(s, 'a')[0];
    assert.ok(a?.type === 'jutsu' && a.unit === c.id && (a.jutsu === D_FIRE || a.jutsu === D_KICK), JSON.stringify(a));
  });

  it('foes are fooled by the clones now and then, the same way every time for the same moment', () => {
    const s = follow(battle(), true).state;
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
  const s = follow(battle()).state;
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

// --- the owner's second answer (2026-10-23): combo dice, follow or control, act first, stealth, enemies

/** The nearest free dry cell to a point that a unit could stand on. */
function cellNear(s: BattleState, id: string, p: Pt): Cell {
  const u = s.units[id];
  for (let r = 0; r < 6; r += 0.5) {
    for (let a = 0; a < 16; a++) {
      const c = cellOf({ x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) });
      if (!cellBlocked(s, c) && !waterAtPt(s, cellCenter(c)) && canStop(s, u, c)) return c;
    }
  }
  throw new Error('no free cell');
}

/** Ends turns until it is `id`'s (at most `n` turns). */
function untilTurnOf(s: BattleState, id: string, n = 20): BattleState {
  for (let i = 0; i < n && current(s)?.id !== id; i++) s = ok(applyAction(s, { type: 'endTurn', unit: current(s)!.id })).state;
  assert.equal(current(s)?.id, id);
  return s;
}

describe('summoned clones stand above their ninja in the initiative and act first', () => {
  it('in the order right above Aki; his turn waits while they play theirs, then picks up where it was', () => {
    const s = battle();
    const moveBefore = s.units.a.turn.move;
    const out = summon(s, true);
    let t = out.state;
    const [c1, c2] = clonesOf(t, 'a');
    const ia = t.order.indexOf('a');
    assert.deepEqual(t.order.slice(ia - 2, ia), [c1.id, c2.id]);
    assert.equal(t.initiative[c1.id], t.initiative.a);
    // Its first clone's turn, now: Aki's waits (his bonus action spent, his action and steps kept).
    assert.equal(current(t)?.id, c1.id);
    assert.equal(t.units.a.turn.held, true);
    assert.ok(of(out.events, 'turn').some((e) => e.unit === c1.id));
    assert.equal(t.units[c1.id].turn.move, t.units[c1.id].speed);
    t = ok(applyAction(t, { type: 'endTurn', unit: c1.id })).state;
    assert.equal(current(t)?.id, c2.id);
    const back = ok(applyAction(t, { type: 'endTurn', unit: c2.id }));
    t = back.state;
    assert.equal(current(t)?.id, 'a');
    assert.ok(of(back.events, 'turn').some((e) => e.unit === 'a'), 'the screen hears his turn go on');
    const a = t.units.a;
    assert.ok(!a.turn.held);
    assert.equal(a.turn.action, true);
    assert.equal(a.turn.bonus, false);
    assert.equal(a.turn.move, moveBefore);
    // Next round the clones' turns come right before his, in their order.
    const turns: string[] = [];
    for (let i = 0; i < 12 && turns.filter((x) => x === 'a').length < 2; i++) {
      const o = ok(applyAction(t, { type: 'endTurn', unit: current(t)!.id }));
      turns.push(...of(o.events, 'turn').map((e) => e.unit));
      t = o.state;
    }
    const second = turns.lastIndexOf('a');
    assert.deepEqual(turns.slice(second - 2, second + 1), [c1.id, c2.id, 'a']);
  });

  it('each clone plays its turn only once a round, however often it is switched', () => {
    let t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    // Following: its turn ends and the turn is Aki's.
    t = ok(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'follow' })).state;
    assert.equal(current(t)?.id, 'a');
    // Controlled again this round: no second turn.
    t = ok(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'control' })).state;
    assert.equal(current(t)?.id, 'a');
    assert.equal(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'control' }).reason, 'sameMode');
  });

  it("a following clone taken in hand in its ninja's turn plays its turn right away", () => {
    const s = follow(battle({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 } }] })).state;
    // A new round: the clone hasn't had a turn of its own in it.
    const t = untilTurnOf(ok(applyAction(s, { type: 'endTurn', unit: 'a' })).state, 'a');
    const c = clonesOf(t, 'a')[0];
    const out = ok(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'control' }));
    assert.equal(current(out.state)?.id, c.id);
    assert.equal(out.state.units.a.turn.held, true);
    assert.ok(of(out.events, 'note').some((e) => e.key === 'cloneControlled'));
  });
});

describe('follow or control', () => {
  it('a controlled clone walks by hand and goes its own way; a following one keeps to its ninja', () => {
    let t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    const to = cellNear(t, c.id, { x: c.pos.x - 3, z: c.pos.z + 2 });
    const walked = ok(applyAction(t, { type: 'move', unit: c.id, to }));
    assert.ok(dist(walked.state.units[c.id].pos, cellCenter(to)) < 0.05);
    assert.ok(walked.state.units[c.id].turn.move < c.speed);
    t = ok(applyAction(walked.state, { type: 'endTurn', unit: c.id })).state;
    // Aki walks off: his controlled clone stays where it was sent.
    const at = { ...t.units[c.id].pos };
    const moved = ok(applyAction(t, { type: 'move', unit: 'a', to: cellNear(t, 'a', { x: t.units.a.pos.x + 3, z: t.units.a.pos.z }) }));
    assert.ok(dist(moved.state.units[c.id].pos, at) < 0.05);
    assert.ok(!of(moved.events, 'move').some((e) => e.unit === c.id));
    // A following clone can't be walked: it runs after its ninja.
    const f = follow(battle()).state;
    const fc = clonesOf(f, 'a')[0];
    assert.equal(applyAction(f, { type: 'move', unit: fc.id, to: cellNear(f, fc.id, { x: fc.pos.x - 2, z: fc.pos.z }) }).reason, 'cloneJutsuOnly');
  });

  it('set to follow in its own turn: it runs back to its ninja’s side and its turn ends', () => {
    let t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    t = ok(applyAction(t, { type: 'move', unit: c.id, to: cellNear(t, c.id, { x: c.pos.x - 4, z: c.pos.z + 3 }) })).state;
    const out = ok(applyAction(t, { type: 'cloneMode', unit: c.id, mode: 'follow' }));
    assert.ok(dist(out.state.units[c.id].pos, out.state.units.a.pos) <= CLONE.far + 0.01);
    assert.equal(current(out.state)?.id, 'a');
    assert.ok(of(out.events, 'note').some((e) => e.key === 'cloneFollows'));
  });

  it('a controlled clone strikes in melee for 1d6 (no items, no focus) in its own turn', () => {
    const t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    place(t, 'rogue_0', { x: c.pos.x + 1.2, z: c.pos.z });
    const blow = until(t, { type: 'attack', unit: c.id, target: 'rogue_0' }, (o) => of(o.events, 'attack')[0]?.roll.success && !of(o.events, 'attack')[0]?.roll.crit);
    const d = of(blow.events, 'damage').filter((e) => e.unit === 'rogue_0' && e.source === c.id);
    assert.equal(d.length, 1);
    assert.ok(d[0].amount >= 1 && d[0].amount <= 6, `the owner's 1d6 (${d[0].amount})`);
    assert.equal(applyAction(t, { type: 'item', unit: c.id, item: 'pill' }).reason, 'cloneCantDo');
    assert.equal(applyAction(t, { type: 'focus', unit: c.id }).reason, 'cloneCantDo');
    // Not in Aki's turn: it has its own.
    const later = ok(applyAction(t, { type: 'endTurn', unit: c.id })).state;
    assert.equal(applyAction(later, { type: 'attack', unit: c.id, target: 'rogue_0' }).reason, 'notYourTurn');
  });

  it("a clone's own taijutsu strikes with one die of the jutsu (the owner: \"se usa el dado\")", () => {
    const t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    place(t, 'rogue_0', { x: c.pos.x + 1.2, z: c.pos.z });
    const out = until(t, { type: 'jutsu', unit: c.id, jutsu: D_KICK, at: { ...t.units[c.id].pos } }, (o) => of(o.events, 'damage').some((e) => e.unit === 'rogue_0' && e.source === c.id));
    const d = of(out.events, 'damage').find((e) => e.unit === 'rogue_0' && e.source === c.id)!;
    assert.ok(d.amount >= 1 && d.amount <= 6, `one d6 of the 2d6+3 (${d.amount})`);
    assert.equal(out.state.units.a.clonePoints, 0);
    assert.equal(out.state.units.a.chakra, t.units.a.chakra - JUTSU[D_KICK].cost);
  });

  it('an AI ninja on a controlled clone’s turn sets it to follow', () => {
    const t = summon(battle()).state;
    t.units.a.controller = 'ai';
    for (const c of clonesOf(t, 'a')) c.controller = 'ai';
    const c = clonesOf(t, 'a')[0];
    assert.deepEqual(aiAction(t), { type: 'cloneMode', unit: c.id, mode: 'follow' });
    // Switching the ninja to the AI switches its clones with it.
    const s = summon(battle()).state;
    const sw = ok(applyAction(s, { type: 'setController', unit: 'a', controller: 'ai' })).state;
    assert.ok(clonesOf(sw, 'a').every((x) => x.controller === 'ai'));
    assert.equal(applyAction(s, { type: 'setController', unit: clonesOf(s, 'a')[0].id, controller: 'ai' }).reason, 'noUnit');
  });

  it('only a following clone takes the blow aimed at its ninja: a controlled one, even right beside him, does not', () => {
    const t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    assert.equal(c.clone?.mode, 'control');
    assert.ok(dist(c.pos, t.units.a.pos) <= CLONE.far + 0.01, 'it stands beside him');
    place(t, 'rogue_0', { x: t.units.a.pos.x + 1.2, z: t.units.a.pos.z });
    const r = turnOf(t, 'rogue_0');
    const hp = r.units.a.hp;
    const at = { ...r.units.a.pos };
    const out = until(r, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => of(o.events, 'attack')[0]?.roll.success);
    assert.ok(out.state.units.a.hp < hp, 'the blow lands on Aki');
    assert.ok(!out.state.units[c.id].down, 'the controlled clone stays');
    assert.ok(dist(out.state.units.a.pos, at) < 0.05, 'no trading places');
    assert.ok(!of(out.events, 'clone').some((e) => !e.on));
    // The same clone set to follow takes it.
    const f = structuredClone(r);
    f.units[c.id].clone!.mode = 'follow';
    const fo = until(f, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => of(o.events, 'attack')[0]?.roll.success);
    assert.equal(fo.state.units.a.hp, hp);
    assert.equal(of(fo.events, 'clone').find((e) => !e.on)?.why, 'blow');
  });

  it('a controlled clone off on its own takes no blow for its ninja; foes take it for a ninja', () => {
    let t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    t = ok(applyAction(t, { type: 'move', unit: c.id, to: cellNear(t, c.id, { x: c.pos.x + 4, z: c.pos.z + 3 }) })).state;
    t = ok(applyAction(t, { type: 'endTurn', unit: c.id })).state;
    place(t, 'rogue_0', { x: t.units.a.pos.x + 1.2, z: t.units.a.pos.z });
    const r = turnOf(t, 'rogue_0');
    const hp = r.units.a.hp;
    const out = until(r, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => of(o.events, 'attack')[0]?.roll.success);
    assert.ok(out.state.units.a.hp < hp, 'the blow lands on Aki');
    assert.ok(!out.state.units[c.id].down);
    // The rogue sees it as a foe (Aki hidden, it plans for the clone).
    const h = structuredClone(t);
    h.units.a.cond.hidden = 40;
    place(h, 'rogue_0', { x: h.units[c.id].pos.x + 3, z: h.units[c.id].pos.z });
    assert.equal(planIntent(h, h.units.rogue_0)?.target, c.id);
  });
});

describe('clones while sneaking: a decoy, an alarm, a trap', () => {
  /** Sneaking: a rogue guard at (20, 10) looking west; Aki casts the clone jutsu at (8, 10). */
  function sneaking(): BattleState {
    const s = createBattle(setup({ stealth: true, enemies: [{ kind: 'rogue', pos: { x: 20, z: 10 }, look: 180, route: [{ x: 20, z: 10 }] }] })).state;
    s.units.a.jutsus = [CLONE_JUTSU, D_FIRE];
    s.units.a.chakra = s.units.a.maxChakra = 40;
    return ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: CLONE_JUTSU, at: { ...s.units.a.pos } })).state;
  }

  it('sent at the bells (a wire): the alarm goes off where it stands, the fight starts, the clone above Aki in the order', () => {
    const s = sneaking();
    const c = clonesOf(s, 'a')[0];
    const to = cellNear(s, c.id, { x: c.pos.x + 3, z: c.pos.z + 2 });
    s.traps.push({ id: 'bells', kind: 'wire', pos: cellCenter(to), owner: 'enemy', dc: 13, dice: '0', radius: 0.75 });
    const out = ok(applyAction(s, { type: 'move', unit: c.id, to }));
    assert.ok(of(out.events, 'trap').some((e) => !e.on && e.trap.id === 'bells'));
    const alert = of(out.events, 'alert')[0];
    assert.ok(alert && alert.at && dist(alert.at, cellCenter(to)) < 0.05);
    assert.equal(out.state.phase, 'combat');
    assert.ok(!out.state.units[c.id].down, 'the bells hurt nobody');
    assert.equal(out.state.order.indexOf(c.id), out.state.order.indexOf('a') - 1);
  });

  it('sent onto an explosive tag: it goes up in smoke and the blast raises the alarm', () => {
    const s = sneaking();
    const c = clonesOf(s, 'a')[0];
    const to = cellNear(s, c.id, { x: c.pos.x + 3, z: c.pos.z - 2 });
    s.traps.push({ id: 'tag', kind: 'tag', pos: cellCenter(to), owner: 'enemy', dc: 13, dice: '3d6', radius: 1.5 });
    const out = ok(applyAction(s, { type: 'move', unit: c.id, to }));
    assert.ok(of(out.events, 'explode').length);
    assert.equal(out.state.units[c.id].down, 'fled');
    assert.equal(out.state.phase, 'combat');
    assert.ok(!out.state.order.includes(c.id));
  });

  it('a decoy in the guard’s eyes: the guard grows suspicious of the clone (not of Aki) and goes to look at it; in the fight it goes for it', () => {
    let s = sneaking();
    const c = clonesOf(s, 'a')[0];
    // The clone walks into the guard's view; Aki slips well out of it.
    place(s, 'a', { x: 3, z: 19 });
    s = ok(applyAction(s, { type: 'move', unit: c.id, to: cellNear(s, c.id, { x: 14, z: 10 }) })).state;
    for (let i = 0; i < 4 && s.phase === 'stealth' && !(s.units.rogue_0.guard!.suspicion[c.id] >= 40); i++) s = ok(applyAction(s, { type: 'endStealthTurn' })).state;
    const g = s.units.rogue_0;
    assert.equal(s.phase, 'stealth');
    assert.ok(g.guard!.suspicion[c.id] >= 40, `${g.guard!.suspicion[c.id]}`);
    assert.ok(!(g.guard!.suspicion.a > 0));
    assert.ok(g.guard!.investigate && dist(g.guard!.investigate, s.units[c.id].pos) < 1.5, 'it goes to look at the clone');
    // The fight starts: the rogue plans for the clone while Aki stays hidden.
    const f = structuredClone(s);
    f.units.a.cond.hidden = 40;
    f.units.a.cond.crouched = true;
    const ev: BattleEvent[] = [];
    openFight(f, 'a', ev);
    assert.equal(f.phase, 'combat');
    assert.equal(f.units.rogue_0.intent?.target, c.id);
  });

  it('a stealth turn is one of its 3 turns', () => {
    let s = sneaking();
    const c = clonesOf(s, 'a')[0];
    s = ok(applyAction(s, { type: 'endStealthTurn' })).state;
    assert.equal(s.units[c.id].clone?.turns, CLONE.turns - 1);
    assert.equal(s.units[c.id].turn.move, s.units[c.id].speed, 'it walks again in the next one');
  });
});

describe('enemies who know the clone jutsu', () => {
  const party = [{ character: hero({ id: 'a', name: 'Aki' }) }];
  const supplies = { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 };
  const raid = (difficulty: 'story' | 'normal' | 'legend') => createBattle({ ...encounterSetup('night_raid', party, { seed: 3, difficulty, supplies }), stealth: false }).state;

  it('captains on every difficulty, the weakest (minions) only on the hardest (his "Elegido": Legend)', () => {
    for (const d of ['story', 'normal', 'legend'] as const) {
      const s = raid(d);
      const enemies = Object.values(s.units).filter((u) => u.team === 'enemy' && u.kind === 'ninja');
      for (const u of enemies) {
        const knows = u.jutsus.includes(CLONE_JUTSU);
        if (u.rank === 'captain') assert.ok(knows, `${d}: ${u.name} (captain)`);
        else if (u.rank === 'minion') assert.equal(knows, d === 'legend', `${d}: ${u.name} (minion)`);
      }
      assert.ok(enemies.some((u) => u.rank === 'captain') && enemies.some((u) => u.rank === 'minion'));
    }
    assert.equal(enemyKnowsClone('subboss', 'legend'), false);
    assert.equal(enemyKnowsClone('boss', 'normal'), false);
  });

  it('an enemy captain summons clones (they follow it, above it in the order) and fights with them', () => {
    const s = createBattle(setup({ enemies: [{ kind: 'jonin', pos: { x: 12, z: 10 } }] })).state;
    const k = Object.values(s.units).find((u) => u.rank === 'captain')!;
    let t = turnOf(s, k.id);
    let seen: Unit[] = [];
    const events: BattleEvent[] = [];
    for (let i = 0; i < 6 && !seen.length && t.phase !== 'ended'; i++) {
      const out = runAi(t, 60);
      events.push(...out.events);
      t = out.state;
      seen = clonesOf(t, k.id);
      if (!seen.length && t.phase !== 'ended') t = untilTurnOf(t, k.id);
    }
    assert.ok(of(events, 'clone').some((e) => e.on && e.by === k.id), 'it summons');
    assert.ok(seen.length);
    assert.ok(seen.every((c) => c.clone?.mode === 'follow' && c.team === 'enemy'));
    assert.equal(t.order.indexOf(seen[seen.length - 1].id), t.order.indexOf(k.id) - 1);
  });
});

describe('the Shadow Shuffle (the owner: "Me encanta A+B+C juntas")', () => {
  /** Aki with two following clones, the rogue 5 m off. */
  function shuffled(seed = 11): BattleState {
    const s0 = battle({ seed });
    place(s0, 'rogue_0', { x: s0.units.a.pos.x + 5, z: s0.units.a.pos.z });
    const s = follow(s0, true).state;
    s.units.a.turn.bonus = true;
    return ok(applyAction(s, { type: 'shuffle', unit: 'a' })).state;
  }

  it('A: a bonus action and no chakra (the owner: "cuesta 1 accion adicional"): Aki and his following clones swap places in secret, and every foe starts unknowing', () => {
    const s0 = battle();
    const s = follow(s0, true).state;
    s.units.a.turn.bonus = true;
    const before = Object.fromEntries(figuresOf(s, s.units.a).map((f) => [f.id, { ...f.pos }]));
    const spots = Object.values(before);
    const out = ok(applyAction(s, { type: 'shuffle', unit: 'a' }));
    const t = out.state;
    assert.ok(disguisedNow(t, t.units.a));
    assert.equal(t.units.a.chakra, s.units.a.chakra, 'no chakra');
    assert.ok(!of(out.events, 'chakra').length);
    assert.equal(t.units.a.turn.bonus, false);
    assert.deepEqual(t.units.a.disguise, { n: 1, known: [], struck: [] });
    // The same cells, shared out again.
    for (const f of figuresOf(t, t.units.a)) assert.ok(spots.some((p) => dist(p, f.pos) < 0.05));
    assert.ok(of(out.events, 'note').some((e) => e.key === 'shadowShuffle'));
    // The same state shuffles the same way.
    assert.deepEqual(applyAction(s, { type: 'shuffle', unit: 'a' }).state.units.a.pos, t.units.a.pos);
    // No following clone: nothing to shuffle with.
    const none = battle();
    assert.equal(applyAction(none, { type: 'shuffle', unit: 'a' }).reason, 'noClones');
    // Its bonus action spent (the cast itself is one): no shuffle in the turn it summons.
    const cast = follow(battle(), true).state;
    assert.equal(applyAction(cast, { type: 'shuffle', unit: 'a' }).reason, 'noBonus');
  });

  it('A: a foe that does not see through picks among the look-alikes; one that does goes for the real one', () => {
    let fooledSeeds = 0;
    let seeingSeeds = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = shuffled(seed);
      const r = s.units.rogue_0;
      const plan = { kind: 'melee' as const, what: 'Blade', target: clonesOf(s, 'a')[0].id };
      if (seesThrough(s, r, s.units.a)) {
        seeingSeeds++;
        assert.equal(fooledBy(s, r, plan).target, 'a', 'it ignores the clone it knows for one');
      } else {
        fooledSeeds++;
        const picks = new Set<string>();
        for (let tick = 0; tick < 60; tick++) picks.add(fooledBy({ ...s, tick }, r, { ...plan, target: 'a' }).target!);
        assert.deepEqual([...picks].sort(), figuresOf(s, s.units.a).map((f) => f.id).sort());
      }
    }
    assert.ok(fooledSeeds > 0 && seeingSeeds > 0, `${fooledSeeds} / ${seeingSeeds}`);
  });

  it('A: a keen-eyed clan (the Mirai) sees through more often', () => {
    let plain = 0;
    let keen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = shuffled(seed);
      const r = s.units.rogue_0;
      if (seesThrough(s, r, s.units.a)) plain++;
      const k = structuredClone(r);
      k.character = { ...k.character!, clan: 'Mirai' };
      const m = structuredClone(r);
      m.character = { ...m.character!, clan: 'Koton' };
      if (seesThrough(s, k, s.units.a) && !seesThrough(s, m, s.units.a)) keen++;
    }
    assert.ok(keen > 10, `${keen}`);
    void plain;
  });

  it('B: the real one strikes a foe that does not know with advantage, once', () => {
    let s: BattleState | undefined;
    for (let seed = 1; seed <= 40 && !s; seed++) {
      const t = shuffled(seed);
      if (!seesThrough(t, t.units.rogue_0, t.units.a)) s = t;
    }
    assert.ok(s);
    place(s, 'rogue_0', { x: s.units.a.pos.x + 1.2, z: s.units.a.pos.z });
    const pv = attackPreview(s, s.units.a, s.units.rogue_0, 'melee');
    assert.ok(pv.reasons.includes('deceived'));
    assert.equal(pv.adv, 'advantage');
    const out = until(s, { type: 'attack', unit: 'a', target: 'rogue_0' }, (o) => !of(o.events, 'attack')[0]?.roll.success);
    assert.ok(of(out.events, 'attack')[0].reasons?.includes('deceived'));
    assert.deepEqual(out.state.units.a.disguise?.struck, ['rogue_0']);
    assert.ok(!attackPreview(out.state, out.state.units.a, out.state.units.rogue_0, 'melee').reasons.includes('deceived'), 'only the first attack');
    // A clone's blow has no such edge (it is the deceit, not the one it hides).
    const c = clonesOf(s, 'a')[0];
    assert.ok(!attackPreview(s, c, s.units.rogue_0, 'melee').reasons.includes('deceived'));
  });

  it('C: hit, the real one bleeds and everyone knows ("¡Era el verdadero!")', () => {
    const s = shuffled();
    s.units.rogue_0.cond.warpEdge = true; // unblockable: no clone takes it
    place(s, 'rogue_0', { x: s.units.a.pos.x + 1.2, z: s.units.a.pos.z });
    const r = turnOf(s, 'rogue_0');
    const out = until(r, { type: 'attack', unit: 'rogue_0', target: 'a' }, (o) => of(o.events, 'damage').some((e) => e.unit === 'a'));
    assert.equal(out.state.units.a.disguise, undefined);
    assert.ok(of(out.events, 'note').some((e) => e.key === 'disguiseRevealed'));
    assert.equal(logLine({ t: 'note', key: 'disguiseRevealed', params: { name: 'Aki' } }, s, 'es')?.text, '¡Era el verdadero! Aki queda al descubierto');
  });

  it('C: what no clone can do gives him away (an item, a rank B+ jutsu); a kunai, a rank C jutsu do not; with no following clone the trick is over', () => {
    const s = shuffled();
    s.supplies.soldierPills = 1;
    s.units.a.chakra = 20;
    s.units.a.turn.bonus = true;
    const pill = ok(applyAction(s, { type: 'item', unit: 'a', item: 'pill' }));
    assert.equal(pill.state.units.a.disguise, undefined);
    assert.ok(of(pill.events, 'note').some((e) => e.key === 'disguiseRevealed'));
    const kunai = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }));
    assert.ok(kunai.state.units.a.disguise, 'a clone could throw it too');
    const c = structuredClone(s);
    c.units.a.chakra = 40;
    const rankC = ok(applyAction(c, { type: 'jutsu', unit: 'a', jutsu: C_WIND, at: { ...c.units.rogue_0.pos } }));
    assert.ok(rankC.state.units.a.disguise, 'a clone may cast a rank C (enhanced)');
    const rankB = Object.values(JUTSU).find((j) => j.rank === 'B' && !j.special && j.dmgType && !j.melee && !j.ability && j.cast !== 'reaction' && j.shape === 'single')!;
    c.units.a.jutsus.push(rankB.id);
    const cast = ok(applyAction(c, { type: 'jutsu', unit: 'a', jutsu: rankB.id, at: { ...c.units.rogue_0.pos }, target: 'rogue_0' }));
    assert.equal(cast.state.units.a.disguise, undefined);
    // Both clones taken in hand (they walk apart): no look-alike left.
    let t = shuffled();
    const [c1, c2] = clonesOf(t, 'a');
    t = ok(applyAction(t, { type: 'cloneMode', unit: c1.id, mode: 'control' })).state;
    assert.ok(disguisedNow(t, t.units.a), 'one look-alike still beside him');
    t = ok(applyAction(t, { type: 'cloneMode', unit: c2.id, mode: 'control' })).state;
    assert.equal(t.units.a.disguise, undefined);
  });

  it('C: a keen-eyed foe beside the real one may uncover him on its turn (it alone knows then)', () => {
    let found = false;
    for (let seed = 1; seed <= 80 && !found; seed++) {
      const s = shuffled(seed);
      s.units.rogue_0.character = { ...s.units.rogue_0.character!, clan: 'Mirai' };
      if (seesThrough(s, s.units.rogue_0, s.units.a)) continue;
      place(s, 'rogue_0', { x: s.units.a.pos.x + 1.2, z: s.units.a.pos.z });
      const out = ok(applyAction(s, { type: 'endTurn', unit: 'a' }));
      const st = out.state;
      if (st.units.a.disguise?.known.includes('rogue_0')) {
        found = true;
        assert.ok(of(out.events, 'note').some((e) => e.key === 'disguiseSeen'));
        assert.ok(seesThrough(st, st.units.rogue_0, st.units.a));
        assert.ok(disguisedNow(st, st.units.a), 'the others still don’t know');
      }
    }
    assert.ok(found, 'some seed uncovers him');
  });

  it('clones throw too (the owner: "los clones si podrian lanzar shurikens o kunai o senbons"): the thrown weapon, CLONE.throwDice', () => {
    const t = summon(battle()).state;
    const c = clonesOf(t, 'a')[0];
    place(t, 'rogue_0', { x: c.pos.x + 5, z: c.pos.z });
    const out = until(t, { type: 'attack', unit: c.id, target: 'rogue_0', ranged: true }, (o) => of(o.events, 'attack')[0]?.roll.success && !of(o.events, 'attack')[0]?.roll.crit);
    assert.equal(of(out.events, 'attack')[0].what, 'Kunai');
    const d = of(out.events, 'damage').find((e) => e.unit === 'rogue_0' && e.source === c.id)!;
    assert.ok(d.amount >= 1 && d.amount <= 4, `1d4 (${d.amount})`);
    assert.equal(d.dmgType, 'Piercing');
  });

  it('the AI: a ninja with clones beside it shuffles when a foe comes near', () => {
    const s = summon(battle({ party: [{ character: hero({ id: 'a', name: 'Aki', clan: 'Koton' }), pos: { x: 8, z: 10 }, controller: 'ai' }] }), true).state;
    s.units.a.turn.bonus = true;
    s.units.a.turn.action = true;
    place(s, 'rogue_0', { x: s.units.a.pos.x + 5, z: s.units.a.pos.z });
    assert.deepEqual(aiAction(s), { type: 'shuffle', unit: 'a' });
  });
});
