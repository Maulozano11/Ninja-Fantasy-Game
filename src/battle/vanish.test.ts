// Tests for the Vanish Jump, hiding in a tree or a bush: npm test. The owner (2026-10-24): "una
// accion para enconderte en un arbol ... esto para el sigilo", "tambien se podra a arbustos", and
// his answers: "1 tus recomendaciones estan bien 2 accion basica sin chakra para todos, 3 si pasas
// la tirada te pierden de vista 4 un ninja por arbol en el grande caben 2" (docs/GAMEPLAY_DESIGN.md,
// Stealth, "Hiding in a tree or a bush").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, getMap, inTree, perchOf, waterAtPt } from './map';
import { canStop } from './nav';
import { attackPreview, PERFECT_HIDE } from './combat';
import { groundEffects } from './hazards';
import { exposure } from './stealth';
import { aiAction } from './ai';
import { perchers, VANISH_RANGE } from './perch';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

// River Forest props (src/battle/maps/riverForest.ts): the big oak, a maple, a round bush, a stump.
const OAK = 3;
const MAPLE = 2;
const BUSH = 29;
const STUMP = 4;
const prop = (i: number): Pt => {
  const p = getMap('river_forest').props[i];
  return { x: p.x, z: p.z };
};

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 6,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [
      { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 13, z: 5 } },
      { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 11, z: 5 } },
      { character: hero({ id: 'c', name: 'Cai' }), pos: { x: 15, z: 4 } },
    ],
    enemies: [{ kind: 'rogue', pos: { x: 26, z: 16 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...over,
  };
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

/** It is this unit's turn, with its whole turn ahead. */
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

function place(s: BattleState, id: string, p: Pt): void {
  s.units[id].pos = freeAt(s, id, p);
}

/** Sure to hide (or sure to be seen): its Stealth very high (or very low). */
function stealthy(s: BattleState, id: string, good = true): void {
  const u = s.units[id];
  u.stats = { ...u.stats, dex: good ? 40 : 1 };
  if (good && !u.skills.includes('stealth')) u.skills = [...u.skills, 'stealth'];
  if (!good) u.skills = u.skills.filter((k) => k !== 'stealth');
}

/** A whole battle where `a` has just vanished into a prop (hidden). */
function vanished(i = OAK, over: Partial<BattleSetup> = {}): BattleState {
  const s = turnOf(createBattle(setup(over)).state, 'a');
  stealthy(s, 'a');
  return ok(applyAction(s, { type: 'vanish', unit: 'a', prop: i })).state;
}

const has = (ev: BattleEvent[], t: BattleEvent['t']) => ev.some((e) => e.t === t);

describe('the Vanish Jump: into a tree', () => {
  it('a basic action, no chakra: the leap spends its length in movement and Hide\'s roll hides it in the crown', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    stealthy(s, 'a');
    const u0 = s.units.a;
    const d = dist(u0.pos, prop(OAK));
    const out = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK }));
    const u = out.state.units.a;
    assert.equal(u.turn.action, false, 'the action');
    assert.equal(u.turn.bonus, true, 'not the bonus action');
    assert.equal(u.chakra, u0.chakra, 'no chakra');
    assert.ok(Math.abs(u0.turn.move - u.turn.move - d) < 1e-6, 'the leap\'s length in movement');
    assert.equal(perchOf(out.state, u), OAK);
    assert.ok(inTree(out.state, u));
    assert.ok(u.cond.crouched, 'it counts as crouched in the tree');
    assert.ok(u.cond.hidden !== undefined, 'hidden');
    const jump = out.events.find((e) => e.t === 'vanish');
    assert.ok(jump && jump.t === 'vanish' && jump.kind === 'tree' && jump.prop === OAK);
    assert.ok(out.events.some((e) => e.t === 'check' && e.what === 'stealth'), 'Hide\'s Stealth roll');
  });

  it('a failed roll still lands it in the tree, seen', () => {
    // Seed 7: its first roll is a natural 1.
    const s = turnOf(createBattle(setup({ seed: 7 })).state, 'a');
    stealthy(s, 'a', false);
    const out = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK }));
    const u = out.state.units.a;
    const roll = out.events.find((e) => e.t === 'check');
    assert.ok(roll && roll.t === 'check' && !roll.roll.success, 'the roll failed (seed)');
    assert.equal(perchOf(out.state, u), OAK);
    assert.equal(u.cond.hidden, undefined);
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'vanishSeen'));
  });

  it('refuses what it can\'t do: too far, not a tree or bush, no action, too little movement, prone', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'a', { x: 12.6 + VANISH_RANGE + 1.5, z: 4 });
    assert.equal(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK }).reason, 'outOfRange');
    const t = turnOf(createBattle(setup()).state, 'a');
    place(t, 'a', { x: 8.5, z: 7.5 });
    assert.equal(applyAction(t, { type: 'vanish', unit: 'a', prop: STUMP }).reason, 'noPerch');
    const n = structuredClone(t);
    n.units.a.turn.action = false;
    assert.equal(applyAction(n, { type: 'vanish', unit: 'a', prop: OAK }).reason, 'noAction');
    const m = turnOf(createBattle(setup()).state, 'a');
    m.units.a.turn.move = 1;
    assert.equal(applyAction(m, { type: 'vanish', unit: 'a', prop: OAK }).reason, 'noMovement');
    const p = turnOf(createBattle(setup()).state, 'a');
    p.units.a.cond.prone = true;
    assert.equal(applyAction(p, { type: 'vanish', unit: 'a', prop: OAK }).reason, 'prone');
  });

  it('one ninja per tree, two in the big oak, one per bush', () => {
    let s = vanished(OAK);
    s = turnOf(s, 'b');
    stealthy(s, 'b');
    s = ok(applyAction(s, { type: 'vanish', unit: 'b', prop: OAK })).state;
    assert.equal(perchers(s, OAK).length, 2, 'the oak takes two');
    assert.ok(dist(s.units.a.pos, s.units.b.pos) > 0.1, 'each in its own spot');
    s = turnOf(s, 'c');
    place(s, 'c', { x: 12.6, z: 5 });
    assert.equal(applyAction(s, { type: 'vanish', unit: 'c', prop: OAK }).reason, 'perchFull');
    // The maple takes one.
    let m = turnOf(createBattle(setup()).state, 'a');
    place(m, 'a', { x: 9.4, z: 3.5 });
    m = ok(applyAction(m, { type: 'vanish', unit: 'a', prop: MAPLE })).state;
    m = turnOf(m, 'b');
    place(m, 'b', { x: 9.4, z: 4.5 });
    assert.equal(applyAction(m, { type: 'vanish', unit: 'b', prop: MAPLE }).reason, 'perchFull');
    // A bush takes one.
    let b = turnOf(createBattle(setup()).state, 'a');
    place(b, 'a', { x: 20, z: 6 });
    b = ok(applyAction(b, { type: 'vanish', unit: 'a', prop: BUSH })).state;
    b = turnOf(b, 'b');
    place(b, 'b', { x: 20, z: 7 });
    assert.equal(applyAction(b, { type: 'vanish', unit: 'b', prop: BUSH }).reason, 'perchFull');
  });

  it('it stays hidden from turn to turn up there (it counts as crouched)', () => {
    let s = vanished(OAK);
    s = ok(applyAction(s, { type: 'endTurn', unit: 'a' })).state;
    assert.ok(s.units.a.cond.hidden !== undefined);
    assert.equal(perchOf(s, s.units.a), OAK);
  });
});

describe('the Vanish Jump: what it can do from the tree (the bonus action, his rule)', () => {
  it('it can\'t walk or do other things up there; climbing down costs the bonus action', () => {
    const s = turnOf(vanished(OAK), 'a');
    assert.equal(applyAction(s, { type: 'move', unit: 'a', to: cellOf({ x: 14, z: 6 }) }).reason, 'perched');
    assert.equal(applyAction(s, { type: 'dodge', unit: 'a' }).reason, 'perched');
    const nb = structuredClone(s);
    nb.units.a.turn.bonus = false;
    assert.equal(applyAction(nb, { type: 'climbDown', unit: 'a' }).reason, 'noBonus');
    const out = ok(applyAction(s, { type: 'climbDown', unit: 'a' }));
    const u = out.state.units.a;
    assert.equal(perchOf(out.state, u), -1);
    assert.equal(u.cond.perch, undefined);
    assert.equal(u.turn.bonus, false);
    assert.equal(u.turn.action, true, 'the action stays');
    assert.ok(dist(u.pos, prop(OAK)) < 3, 'at the foot of the tree');
    assert.ok(!cellBlocked(out.state, cellOf(u.pos)));
    assert.equal(u.cond.hidden, undefined, 'seen at the foot');
    assert.ok(has(out.events, 'leavePerch'));
  });

  it('a throw from the crown: bonus + action, from hiding and from above (+2), then down to the foot', () => {
    const s = turnOf(vanished(OAK), 'a');
    place(s, 'rogue_0', { x: 15, z: 9 });
    const pv = attackPreview(s, s.units.a, s.units.rogue_0, 'ranged');
    assert.equal(pv.height, 2, 'the height');
    assert.ok(pv.reasons.includes('hidden'));
    const nb = structuredClone(s);
    nb.units.a.turn.bonus = false;
    assert.equal(applyAction(nb, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }).reason, 'noBonus');
    const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }));
    const atk = out.events.findIndex((e) => e.t === 'attack');
    const down = out.events.findIndex((e) => e.t === 'leavePerch');
    assert.ok(atk >= 0 && down > atk, 'it throws, then drops');
    const u = out.state.units.a;
    assert.equal(u.turn.bonus, false);
    assert.equal(u.turn.action, false);
    assert.equal(perchOf(out.state, u), -1);
    assert.equal(u.cond.hidden, undefined);
  });

  it('dropping onto a foe within 3 m of the trunk: lands beside it and strikes from hiding', () => {
    const s = turnOf(vanished(OAK), 'a');
    place(s, 'rogue_0', { x: 12.6, z: 3.5 });
    assert.ok(dist(s.units.rogue_0.pos, prop(OAK)) <= 3);
    const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
    const down = out.events.findIndex((e) => e.t === 'leavePerch');
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(down >= 0 && atk && atk.t === 'attack' && !atk.ranged);
    assert.ok(atk && atk.t === 'attack' && atk.reasons?.includes('hidden'), 'with advantage, from hiding');
    const u = out.state.units.a;
    assert.ok(dist(u.pos, out.state.units.rogue_0.pos) <= 1.6, 'beside it');
    assert.equal(u.turn.bonus, false);
    // Farther than 3 m from the trunk: out of reach.
    const far = turnOf(vanished(OAK), 'a');
    place(far, 'rogue_0', { x: 12.6, z: 6.5 });
    assert.equal(applyAction(far, { type: 'attack', unit: 'a', target: 'rogue_0' }).reason, 'outOfRange');
  });

  it('jumping on to another tree: bonus + action, a new roll', () => {
    const s = turnOf(vanished(OAK), 'a');
    const out = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: MAPLE }));
    const u = out.state.units.a;
    assert.equal(perchOf(out.state, u), MAPLE);
    assert.equal(u.turn.bonus, false);
    assert.ok(out.events.some((e) => e.t === 'check' && e.what === 'stealth'));
  });
});

describe('the Vanish Jump: found', () => {
  it('no blade reaches it up in a tree; throws do (with the tree\'s half cover)', () => {
    let s = vanished(OAK);
    s = turnOf(s, 'rogue_0');
    place(s, 'rogue_0', { x: 12.6, z: 2.6 });
    const pv = attackPreview(s, s.units.rogue_0, s.units.a, 'melee');
    assert.ok(!pv.inRange && pv.reasons.includes('inTree'));
    assert.equal(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'a' }).reason, 'outOfRange');
    const r = attackPreview(s, s.units.rogue_0, s.units.a, 'ranged');
    assert.ok(r.inRange);
    assert.equal(r.cover, 2, 'the tree\'s half cover');
  });

  it('hit in a tree, it falls to the foot: found, prone and 1d6 more', () => {
    let s = vanished(OAK);
    s = turnOf(s, 'rogue_0');
    place(s, 'rogue_0', { x: 15, z: 7 });
    // Seen (its Perception beats the roll), and sure to be hit.
    s.units.a.cond.hidden = 5;
    s.units.a.ac = -20;
    s.units.a.hp = 200;
    s.units.a.maxHp = 200;
    const out = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'a', ranged: true }));
    const fall = out.events.find((e) => e.t === 'leavePerch');
    assert.ok(fall && fall.t === 'leavePerch' && fall.fall, 'it falls');
    const u = out.state.units.a;
    assert.equal(perchOf(out.state, u), -1);
    assert.ok(u.cond.prone);
    assert.equal(u.cond.hidden, undefined);
    assert.equal(out.events.filter((e) => e.t === 'damage' && e.unit === 'a').length, 2, 'the blow and the fall');
  });

  it('hit in a bush, it is only found (no fall)', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'a', { x: 20, z: 6 });
    stealthy(s, 'a');
    s = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: BUSH })).state;
    s = turnOf(s, 'rogue_0');
    place(s, 'rogue_0', { x: 25, z: 9 });
    s.units.a.cond.hidden = 5;
    s.units.a.ac = -20;
    s.units.a.hp = 200;
    s.units.a.maxHp = 200;
    const out = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'a', ranged: true }));
    assert.ok(!has(out.events, 'leavePerch'));
    assert.equal(perchOf(out.state, out.state.units.a), BUSH, 'still in the bush');
    assert.equal(out.state.units.a.cond.hidden, undefined, 'but found');
  });

  it('fire burns the tree: out of it, seen; the wind cuts the bush, but not a tree', () => {
    const s = vanished(OAK);
    const ev: BattleEvent[] = [];
    groundEffects(s, { kind: 'circle', center: prop(OAK), radius: 1 }, 'Fire', ev);
    assert.ok(s.props[OAK].destroyed);
    assert.ok(ev.some((e) => e.t === 'leavePerch'));
    assert.equal(s.units.a.cond.perch, undefined);
    assert.equal(s.units.a.cond.hidden, undefined);
    assert.ok(!cellBlocked(s, cellOf(s.units.a.pos)), 'on open ground');
    // Wind: the bush is cut, the tree stands.
    let b = turnOf(createBattle(setup()).state, 'a');
    place(b, 'a', { x: 20, z: 6 });
    stealthy(b, 'a');
    b = ok(applyAction(b, { type: 'vanish', unit: 'a', prop: BUSH })).state;
    const wev: BattleEvent[] = [];
    groundEffects(b, { kind: 'circle', center: prop(BUSH), radius: 1 }, 'Wind', wev, new Set(), true);
    assert.ok(b.props[BUSH].destroyed);
    assert.equal(b.units.a.cond.perch, undefined);
    assert.equal(b.units.a.cond.hidden, undefined);
    const t = vanished(OAK);
    groundEffects(t, { kind: 'circle', center: prop(OAK), radius: 1 }, 'Wind', [], new Set(), true);
    assert.ok(!t.props[OAK].destroyed);
    assert.equal(perchOf(t, t.units.a), OAK);
  });

  it('Search: Perception against the roll finds it; a perfect hide is never found', () => {
    let s = vanished(OAK);
    s = turnOf(s, 'rogue_0');
    place(s, 'rogue_0', { x: 15, z: 7 });
    const r = s.units.rogue_0;
    r.stats = { ...r.stats, wis: 40 };
    s.units.a.cond.hidden = 12;
    const out = ok(applyAction(s, { type: 'search', unit: 'rogue_0' }));
    assert.ok(out.events.some((e) => e.t === 'check' && e.what === 'perception'));
    assert.equal(out.state.units.a.cond.hidden, undefined, 'found');
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'searchFound'));
    assert.equal(out.state.units.rogue_0.turn.action, false, 'an action');
    const p = structuredClone(s);
    p.units.a.cond.hidden = PERFECT_HIDE;
    const none = ok(applyAction(p, { type: 'search', unit: 'rogue_0' }));
    assert.equal(none.state.units.a.cond.hidden, PERFECT_HIDE);
    assert.ok(none.events.some((e) => e.t === 'note' && e.key === 'searchNothing'));
  });

  it('leaving a foe\'s reach with the leap provokes its opportunity attack first', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    stealthy(s, 'a');
    place(s, 'rogue_0', { x: 14, z: 5 });
    place(s, 'a', { x: 13, z: 5 });
    s.units.a.hp = 200;
    s.units.a.maxHp = 200;
    assert.ok(dist(s.units.a.pos, s.units.rogue_0.pos) <= 1.6);
    const out = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK }));
    const oa = out.events.findIndex((e) => e.t === 'attack' && e.unit === 'rogue_0');
    const jump = out.events.findIndex((e) => e.t === 'vanish');
    assert.ok(oa >= 0 && jump > oa, 'struck, then away');
    assert.equal(out.state.units.rogue_0.turn.reaction, false);
  });
});

describe('the Vanish Jump in the stealth phase', () => {
  const sneak = (over: Partial<BattleSetup> = {}) =>
    createBattle(setup({ stealth: true, enemies: [{ kind: 'rogue', pos: { x: 17, z: 5 }, look: 180, route: [{ x: 17, z: 5 }] }], ...over })).state;

  it('a guard who saw the leap and beat the roll grows suspicious and comes to look; one who didn\'t lost it', () => {
    const s = sneak({ seed: 7 });
    stealthy(s, 'a', false);
    const g = s.units.rogue_0;
    g.stats = { ...g.stats, wis: 40 };
    const out = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK }));
    // Suspicious and coming to look, or (close enough) the alarm at once.
    if (out.state.phase === 'stealth') {
      assert.ok((out.state.units.rogue_0.guard!.suspicion.a ?? 0) > 0);
      assert.ok(out.state.units.rogue_0.guard!.investigate);
    } else assert.ok(out.events.some((e) => e.t === 'alert'), 'the alarm');
    const h = sneak();
    stealthy(h, 'a');
    const lost = ok(applyAction(h, { type: 'vanish', unit: 'a', prop: OAK }));
    assert.equal(lost.state.phase, 'stealth');
    assert.equal(lost.state.units.rogue_0.guard!.suspicion.a ?? 0, 0, 'it lost the ninja');
  });

  it('a guard passing under the tree doesn\'t see it; in a bush, within 1.5 m, it does', () => {
    const s = sneak();
    stealthy(s, 'a');
    const t = ok(applyAction(s, { type: 'vanish', unit: 'a', prop: OAK })).state;
    const g = t.units.rogue_0;
    g.pos = freeAt(t, 'rogue_0', { x: 12.6, z: 2.6 });
    g.guard!.look = -90;
    assert.ok(dist(g.pos, t.units.a.pos) <= 1.5);
    assert.equal(exposure(t, g, t.units.a), 0);
    let b = sneak();
    place(b, 'a', { x: 20, z: 6 });
    stealthy(b, 'a');
    b = ok(applyAction(b, { type: 'vanish', unit: 'a', prop: BUSH })).state;
    const gb = b.units.rogue_0;
    gb.pos = freeAt(b, 'rogue_0', { x: 22.6 - 1.2, z: 6.25 });
    assert.ok(dist(gb.pos, b.units.a.pos) <= 1.5);
    assert.equal(exposure(b, gb, b.units.a), 100);
  });
});

describe('the Vanish Jump: the AI', () => {
  it('an enemy about to throw, with a tree near and nobody close, vanishes into it', () => {
    let s = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 5 } }] })).state;
    s = turnOf(s, 'rogue_0');
    place(s, 'a', { x: 17, z: 10 });
    place(s, 'b', { x: 18, z: 11 });
    place(s, 'c', { x: 19, z: 10 });
    s.units.rogue_0.intent = { kind: 'ranged', what: 'Kunai', target: 'a' };
    const a = aiAction(s);
    assert.ok(a && a.type === 'vanish', JSON.stringify(a));
  });

  it('in its tree it strikes from it; seeing no foe at all, it searches', () => {
    let s = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 13, z: 5 } }], party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 15, z: 9 } }] })).state;
    s = turnOf(s, 'rogue_0');
    stealthy(s, 'rogue_0');
    s = ok(applyAction(s, { type: 'vanish', unit: 'rogue_0', prop: OAK })).state;
    s = turnOf(s, 'rogue_0');
    const a = aiAction(s);
    assert.ok(a && a.type === 'attack' && a.target === 'a', JSON.stringify(a));
    // Nobody in sight, someone hiding: it searches.
    let h = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 20, z: 12 } }] })).state;
    h = turnOf(h, 'rogue_0');
    for (const id of ['a', 'b', 'c']) h.units[id].cond.hidden = PERFECT_HIDE;
    h.units.rogue_0.intent = undefined;
    const sr = aiAction(h);
    assert.ok(sr && sr.type === 'search', JSON.stringify(sr));
  });
});
