// Tests for the jutsu that fill the gaps in the elements (the owner's answers of 2026-10-21;
// docs/GAMEPLAY_DESIGN.md, "Jutsu for the gaps"): Water's rank S (the Devouring Tide), Wind's rank A
// (the Whirlwind Tower), the Gale Curtain made an area that fans fire, the Thunder Beam and the
// Rubble Gust, with the pieces they brought (a failed save knocks down, sweeps or drags a ninja, the
// water puts out the flames) and their lines in the log. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, GaleZone, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, levelAtPt, waterAtPt } from './map';
import { canStop } from './nav';
import { endTurn } from './turns';
import { offensive } from './intent';
import { JUTSU, areaEnd, areaOf, enhanced, fanDice, fanned, fannedBy } from './jutsu';
import { addEffect } from '../rules/effects';
import { floatLabel, logLine } from '../components/battle/battleLog';

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

/** Aki on its turn with only the jutsu under test, a rogue near `foe` with no jutsu of its own. */
function duel(id: string, foe: Pt = { x: 14, z: 10 }, over: Partial<BattleSetup> = {}): BattleState {
  const s = turnOf(createBattle(setup(over)).state, 'a');
  for (const u of Object.values(s.units)) {
    u.jutsus = [];
    u.chakra = 30;
  }
  s.units.a.jutsus = [id];
  place(s, 'a', { x: 8, z: 10 });
  place(s, 'rogue_0', foe);
  return s;
}

const cast = (s: BattleState, id: string, at: Pt, o: { target?: string; enhanced?: boolean; unit?: string } = {}) =>
  applyAction(s, { type: 'jutsu', unit: o.unit ?? 'a', jutsu: id, at, target: o.target, enhanced: o.enhanced });

/** The first seed whose outcome passes `want`. */
function seeded(s: BattleState, act: (t: BattleState) => Out, want: (out: Out) => boolean): Out {
  for (let seed = 1; seed < 120; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = ok(act(t));
    if (want(out)) return out;
  }
  throw new Error('no seed gives it');
}

const saved = (out: Out, unit: string) => out.events.some((e) => e.t === 'save' && e.unit === unit && e.roll.success);
const failed = (out: Out, unit: string) => out.events.some((e) => e.t === 'save' && e.unit === unit && !e.roll.success);
const pushedOf = (ev: BattleEvent[], unit: string) => ev.find((e) => e.t === 'pushed' && e.unit === unit) as Extract<BattleEvent, { t: 'pushed' }> | undefined;
const proneOn = (ev: BattleEvent[], unit: string) => ev.some((e) => e.t === 'condition' && e.unit === unit && e.cond === 'prone' && e.on);
const damageOf = (ev: BattleEvent[], unit: string) => ev.filter((e) => e.t === 'damage' && e.unit === unit).reduce((n, e) => n + (e.t === 'damage' ? e.amount : 0), 0);

const NEW = ['water_devouring_tide', 'wind_whirlwind_tower', 'wind_gale_curtain', 'lightning_thunder_beam', 'earth_rubble_gust'];

describe('the gaps\' jutsu: the data', () => {
  it('the five he approved, with their names in both languages ("Técnica de <Elemento>: ..."), rank, nature, slot and chakra', () => {
    const want: Record<string, [string, string, string, string, string, number, number, number]> = {
      water_devouring_tide: ['Técnica de Agua: Ola devoradora', 'Water Technique: Devouring Tide', 'S', 'Water', 'Ultimate', 8, 4, 12],
      wind_whirlwind_tower: ['Técnica de Viento: Torre del torbellino', 'Wind Technique: Whirlwind Tower', 'A', 'Wind', 'Elemental', 5, 3, 9],
      wind_gale_curtain: ['Técnica de Viento: Cortina de vendaval', 'Wind Technique: Gale Curtain', 'C', 'Wind', 'Elemental', 2, 2, 6],
      lightning_thunder_beam: ['Técnica de Rayo: Haz de trueno', 'Lightning Technique: Thunder Beam', 'C', 'Lightning', 'Elemental', 2, 2, 9],
      earth_rubble_gust: ['Técnica de Tierra: Polvareda de cascotes', 'Earth Technique: Rubble Gust', 'C', 'Earth', 'Elemental', 2, 2, 4.5],
    };
    for (const id of NEW) {
      const j = JUTSUS_DATA.find((x) => x.id === id)!;
      const sp = JUTSU[id];
      assert.deepEqual([j.nameEs, j.name, j.rank, j.nature, j.category, j.chakraCost, j.enhancementChakraCost, sp.id === 'water_devouring_tide' ? sp.length : sp.range], want[id], id);
      assert.ok(j.description && j.descriptionEs, id);
      assert.equal(sp.elemental, true, `${id}: in the caster's chakra colour`);
    }
    // The beasts are summons now (the owner: "todos los elementales serán invocaciones"): none of these plays one.
    for (const id of NEW) assert.notEqual(JUTSU[id].vfx, 'beast', id);
  });

  it('their battle specs and their enhanced casts', () => {
    const t = JUTSU.water_devouring_tide;
    assert.deepEqual([t.shape, t.length, t.dice, t.dmgType, t.save, t.saveHalf, t.push, t.prone, t.douse], ['cone', 12, '7d12', 'Bludgeoning', 'str', true, { m: 3 }, true, true]);
    const te = enhanced(t);
    assert.deepEqual([te.dice, te.length], ['9d12', 15]);
    const w = JUTSU.wind_whirlwind_tower;
    assert.deepEqual([w.shape, w.range, w.radius, w.dice, w.save, w.push, w.prone, w.env], ['circle', 9, 3, '5d8', 'str', { m: 1.5, toward: true }, true, 'clearFoliage']);
    assert.deepEqual([enhanced(w).dice, enhanced(w).radius], ['6d8', 4.5]);
    const g = JUTSU.wind_gale_curtain;
    assert.deepEqual([g.shape, g.special, g.radius, g.dice, g.loud], ['circle', 'galeZone', 2.25, undefined, false]);
    assert.equal(enhanced(g).radius, 3.375);
    assert.equal(offensive(g), false, 'it hurts nobody');
    const b = JUTSU.lightning_thunder_beam;
    assert.deepEqual([b.shape, b.length, b.dice, b.dmgType, b.save, b.saveHalf, b.env], ['line', 9, '2d8', 'Lightning', 'dex', true, 'electrify']);
    assert.deepEqual([enhanced(b).dice, enhanced(b).length], ['3d8', 11.25]);
    const d = JUTSU.earth_rubble_gust;
    assert.deepEqual([d.shape, d.length, d.dice, d.save, d.saveHalf, d.prone, d.push], ['cone', 4.5, '2d6', 'dex', false, true, undefined]);
    assert.deepEqual([enhanced(d).dice, enhanced(d).length], ['3d6', 5.625]);
  });
});

describe('the Devouring Tide (Water, rank S)', () => {
  it('a 12 m cone: a foe 11 m away makes a STR save; failed, 7d12, swept 3 m away from the caster and knocked down', () => {
    const s = duel('water_devouring_tide', { x: 19, z: 10 });
    const before = { ...s.units.rogue_0.pos };
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    const p = pushedOf(out.events, 'rogue_0')!;
    assert.ok(p, 'swept');
    const r = out.state.units.rogue_0;
    assert.ok(Math.abs(dist(r.pos, before) - 3) < 0.8, `about 3 m: ${dist(r.pos, before)}`);
    assert.ok(dist(r.pos, s.units.a.pos) > dist(before, s.units.a.pos), 'away from the caster');
    assert.equal(r.cond.prone, true);
    assert.ok(proneOn(out.events, 'rogue_0'));
    // The order the screen plays: the damage, then the sweep, then the fall.
    const i = (k: string) => out.events.findIndex((e) => e.t === k && 'unit' in e && e.unit === 'rogue_0');
    assert.ok(i('damage') < i('pushed') && i('pushed') < out.events.findIndex((e) => e.t === 'condition' && e.unit === 'rogue_0'));
  });

  it('saved: half the damage, no sweep, still on its feet', () => {
    const s = duel('water_devouring_tide', { x: 16, z: 10 });
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => saved(o, 'rogue_0'));
    assert.ok(damageOf(out.events, 'rogue_0') > 0);
    assert.equal(pushedOf(out.events, 'rogue_0'), undefined);
    assert.ok(!out.state.units.rogue_0.cond.prone);
  });

  it('it puts out the flames of everyone it reaches, saved or not; a friend in the cone is reached too', () => {
    const s = duel('water_devouring_tide', { x: 16, z: 10 }, { party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 12, z: 10 } }] });
    place(s, 'b', { x: 12, z: 10.5 });
    for (const id of ['rogue_0', 'b']) s.units[id].effects = addEffect(s.units[id].effects, 'burning', { source: 'test' }).effects;
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => saved(o, 'rogue_0'));
    for (const id of ['rogue_0', 'b']) {
      assert.ok(out.events.some((e) => e.t === 'save' && e.unit === id), `${id} saves`);
      assert.ok(!out.state.units[id].effects.some((e) => e.id === 'burning'), `${id}: no longer burning`);
      assert.ok(out.events.some((e) => e.t === 'effect' && e.unit === id && e.effect === 'burning' && !e.on));
    }
  });

  it('a sweep stops where something stands in the way: here the edge of the map', () => {
    // The map is 61 m wide (122 cells of 0.5 m).
    const s = duel('water_devouring_tide', { x: 60, z: 10 });
    place(s, 'a', { x: 52, z: 10 });
    const before = { ...s.units.rogue_0.pos };
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    const r = out.state.units.rogue_0;
    assert.ok(r.pos.x < 61 && r.pos.x >= before.x, `on the map: ${r.pos.x}`);
    assert.ok(dist(r.pos, before) < 3 - 0.5, 'it went less than 3 m');
    assert.equal(r.cond.prone, true, 'still knocked down');
  });

  it('swept off a ledge it falls (1d6 a level); swept into the river it ends up in the water', () => {
    // A rise on the river forest map: level 1 at x 37.75, level 0 at 36.25.
    const s = duel('water_devouring_tide', { x: 37.75, z: 1.25 });
    place(s, 'a', { x: 41.75, z: 1.25 });
    const top = levelAtPt(s, s.units.rogue_0.pos);
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    const p = pushedOf(out.events, 'rogue_0')!;
    assert.ok(p.fall >= 1, `it fell: ${p.fall}`);
    assert.ok(levelAtPt(out.state, out.state.units.rogue_0.pos) < top);
    assert.equal(out.events.filter((e) => e.t === 'damage' && e.unit === 'rogue_0').length, 2, 'the wave, then the fall');
    // The river's bank: dry at x 26.25, the water from 27.75.
    const r = duel('water_devouring_tide', { x: 26.25, z: 2.25 });
    place(r, 'a', { x: 22.25, z: 2.25 });
    assert.equal(waterAtPt(r, r.units.rogue_0.pos), 0);
    const wet = seeded(r, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    assert.ok(pushedOf(wet.events, 'rogue_0'));
    assert.ok(waterAtPt(wet.state, wet.state.units.rogue_0.pos) > 0, 'in the river');
  });

  it('big creatures stand firm: the hydra is neither swept nor knocked down', () => {
    const s = turnOf(createBattle(setup({ enemies: [{ kind: 'hydra', pos: { x: 17, z: 10 } }] })).state, 'a');
    s.units.a.jutsus = ['water_devouring_tide'];
    s.units.a.chakra = 30;
    const body = Object.values(s.units).find((u) => u.kind === 'hydra_body')!;
    const out = ok(cast(s, 'water_devouring_tide', body.pos));
    for (const u of Object.values(out.state.units).filter((x) => x.kind !== 'ninja')) {
      assert.equal(pushedOf(out.events, u.id), undefined, u.id);
      assert.ok(!proneOn(out.events, u.id), u.id);
    }
  });
});

describe('the Whirlwind Tower (Wind, rank A)', () => {
  it('a 3 m circle up to 9 m away; failed, 5d8, dragged 1.5 m toward its middle and knocked down', () => {
    const s = duel('wind_whirlwind_tower', { x: 14, z: 10 });
    const centre = { x: 16, z: 10 };
    const before = { ...s.units.rogue_0.pos };
    const out = seeded(s, (t) => cast(t, 'wind_whirlwind_tower', centre), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    const r = out.state.units.rogue_0;
    assert.ok(pushedOf(out.events, 'rogue_0'));
    assert.ok(dist(r.pos, centre) < dist(before, centre) - 0.5, 'nearer the middle');
    assert.ok(dist(r.pos, before) <= 1.6, 'never more than 1.5 m');
    assert.equal(r.cond.prone, true);
    // The pushed event names the jutsu, for the log.
    assert.equal(pushedOf(out.events, 'rogue_0')!.what, 'wind_whirlwind_tower');
  });

  it('the ones it drags don\'t land on top of each other: one stops at least 1.2 m from another', () => {
    const s = duel('wind_whirlwind_tower', { x: 14, z: 10 }, { enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 18, z: 10 } }] });
    for (const u of Object.values(s.units)) u.jutsus = u.id === 'a' ? ['wind_whirlwind_tower'] : [];
    place(s, 'rogue_0', { x: 14.5, z: 10 });
    place(s, 'rogue_1', { x: 18.25, z: 10 });
    const centre = { x: 16, z: 10 };
    const out = seeded(s, (t) => cast(t, 'wind_whirlwind_tower', centre), (o) => failed(o, 'rogue_0') && failed(o, 'rogue_1') && !o.state.units.rogue_0.down && !o.state.units.rogue_1.down);
    const [r0, r1] = [out.state.units.rogue_0, out.state.units.rogue_1];
    assert.ok(r0.cond.prone && r1.cond.prone);
    assert.ok(dist(r0.pos, r1.pos) >= 1.2, `apart: ${dist(r0.pos, r1.pos)}`);
    assert.ok(r1.pos.x < s.units.rogue_1.pos.x, 'the second still dragged in, as far as it can');
  });

  it('one already in its middle stays there (knocked down, not moved)', () => {
    const s = duel('wind_whirlwind_tower', { x: 15, z: 10 });
    const centre = { ...s.units.rogue_0.pos };
    const out = seeded(s, (t) => cast(t, 'wind_whirlwind_tower', centre), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    assert.equal(pushedOf(out.events, 'rogue_0'), undefined);
    assert.deepEqual(out.state.units.rogue_0.pos, centre);
    assert.equal(out.state.units.rogue_0.cond.prone, true);
  });

  it('not past 9 m; saved, half and on its feet', () => {
    const far = duel('wind_whirlwind_tower', { x: 20, z: 10 });
    assert.equal(cast(far, 'wind_whirlwind_tower', { x: far.units.a.pos.x + 10, z: 10 }).reason, 'outOfRange');
    const s = duel('wind_whirlwind_tower', { x: 14, z: 10 });
    const out = seeded(s, (t) => cast(t, 'wind_whirlwind_tower', t.units.rogue_0.pos), (o) => saved(o, 'rogue_0'));
    assert.equal(pushedOf(out.events, 'rogue_0'), undefined);
    assert.ok(!out.state.units.rogue_0.cond.prone);
  });
});

describe('the Gale Curtain (Wind, rank C): a gale on the ground that fans fire', () => {
  const galeAt = (s: BattleState, at: Pt) => {
    const out = ok(cast(s, 'wind_gale_curtain', at));
    return out;
  };

  it('a gale 2.25 m round up to 6 m away: no save, no damage, silent; it lasts the rest of the round and two more', () => {
    const s = duel('wind_gale_curtain');
    const out = galeAt(s, { x: 12, z: 10 });
    const z = out.state.zones!;
    assert.equal(z.length, 1);
    assert.deepEqual([z[0].radius, z[0].owner, z[0].rounds], [2.25, 'a', 3]);
    assert.ok(out.events.some((e) => e.t === 'zone' && e.on));
    assert.ok(!out.events.some((e) => e.t === 'save' || e.t === 'damage'));
    assert.equal(cast(s, 'wind_gale_curtain', { x: s.units.a.pos.x + 7, z: 10 }).reason, 'outOfRange');
    // Three new rounds and it is gone, with an event for the screen and the log.
    let t = out.state;
    const ev: BattleEvent[] = [];
    const startRound = t.round;
    for (let i = 0; i < 40 && t.round < startRound + 3; i++) {
      t = structuredClone(t);
      endTurn(t, ev);
      if (t.round < startRound + 3) assert.equal(t.zones!.length, 1, `round ${t.round}: still there`);
    }
    assert.equal(t.zones!.length, 0);
    assert.ok(ev.some((e) => e.t === 'zone' && !e.on));
  });

  it('a fire jutsu whose flight or area goes through the gale burns harder: one more die (two for rank S)', () => {
    assert.equal(fanned(JUTSU.fireball_goukakyu).dice, '4d8');
    assert.equal(fanned(JUTSU.great_fire_annihilation).dice, '9d12');
    assert.equal(fanned(JUTSU.fireball_goukakyu).radius, JUTSU.fireball_goukakyu.radius, 'the area stays as it was aimed');
    const z = [{ id: 'g', center: { x: 12, z: 10 }, radius: 2.25 }];
    const from = { x: 8, z: 10 };
    // Through it on the way, or bursting over it.
    assert.ok(fannedBy(JUTSU.fire_three_embers, from, { x: 16, z: 10 }, z), 'a single target behind it');
    assert.ok(fannedBy(JUTSU.fireball_goukakyu, from, { x: 12, z: 11 }, z), 'a ball bursting in it');
    assert.ok(fannedBy(JUTSU.dragon_fire_stream, from, { x: 9, z: 10 }, z), 'a line running through it');
    assert.ok(fannedBy(JUTSU.great_fire_annihilation, from, { x: 9, z: 10 }, z), 'a cone reaching into it');
    // Not through it: another way, or not fire.
    assert.equal(fannedBy(JUTSU.fire_three_embers, from, { x: 8, z: 16 }, z), null, 'away from it');
    assert.equal(fannedBy(JUTSU.wind_whirl, from, { x: 16, z: 10 }, z), null, 'wind is not fire');
    assert.equal(fannedBy(JUTSU.lightning_thunder_beam, from, { x: 16, z: 10 }, z), null, 'lightning is not fire');
    // Where the fire meets the wind (for the screen): on its flight, at the gale's edge nearest the caster's line.
    const hit = fannedBy(JUTSU.fire_three_embers, from, { x: 16, z: 10 }, z)!;
    assert.equal(hit.zone, 'g');
    assert.ok(dist(hit.at, z[0].center) <= 2.25 + 1e-6);
  });

  it('enhanced, the gale is 3.4 m round', () => {
    const s = duel('wind_gale_curtain');
    const out = ok(cast(s, 'wind_gale_curtain', { x: 12, z: 10 }, { enhanced: true }));
    assert.equal(out.state.zones![0].radius, 3.375);
  });

  it('fanned and enhanced add up: the enhanced die and the gale\'s (two for a rank S)', () => {
    assert.deepEqual([fanDice(JUTSU.fireball_goukakyu), fanDice(JUTSU.great_fire_annihilation)], [1, 2]);
    assert.equal(fanned(enhanced(JUTSU.fireball_goukakyu)).dice, '5d8');
    assert.equal(fanned(enhanced(JUTSU.great_fire_annihilation)).dice, '11d12');
  });

  it('a cone aimed past its length meets only the gales it reaches', () => {
    const cone = JUTSU.dragon_fire_bomb;
    const from = { x: 8, z: 10 };
    const L = cone.length!;
    const aim = { x: from.x + L + 1.5, z: 10 };
    // Its far edge 0.25 m past the cone's end: not reached, though the point aimed at is inside it.
    assert.equal(fannedBy(cone, from, aim, [{ id: 'g', center: { x: from.x + L + 2.5, z: 10 }, radius: 2.25 }]), null);
    // Its near edge 0.75 m inside the cone: reached.
    assert.ok(fannedBy(cone, from, aim, [{ id: 'g', center: { x: from.x + L + 1.5, z: 10 }, radius: 2.25 }]));
    // A line, aimed short: it runs its whole length, and so through a gale past the point.
    assert.ok(fannedBy(JUTSU.dragon_fire_stream, from, { x: 9.5, z: 10 }, [{ id: 'g', center: { x: 14, z: 10 }, radius: 1 }]));
  });

  it('a rank S fire through it: two more dice, and the log and the aim say two', () => {
    const s = duel('great_fire_annihilation', { x: 15, z: 10 });
    s.zones = [{ id: 'g1', center: { x: 12, z: 10 }, radius: 2.25, owner: 'a', rounds: 3 }];
    const out = ok(cast(s, 'great_fire_annihilation', s.units.rogue_0.pos));
    const note = out.events.find((e) => e.t === 'note' && e.key.startsWith('fanned'))!;
    assert.equal(note.t === 'note' && note.key, 'fanned2');
    assert.equal(logLine(note, out.state, 'es')!.text, 'El vendaval aviva el fuego de Aki: dos dados de daño más');
    assert.equal(logLine(note, out.state, 'en')!.text, 'The gale fans Aki’s fire: two more damage dice');
    assert.equal(floatLabel(note, out.state, 'es'), '¡Avivado!');
  });

  it('in battle: the fire cast through it says so (the event and the log) and deals at least as much as without it', () => {
    const plain = duel('fireball_goukakyu', { x: 15, z: 10 });
    plain.units.a.jutsus = ['fireball_goukakyu', 'wind_gale_curtain'];
    const z: GaleZone = { id: 'g1', center: { x: 12, z: 10 }, radius: 2.25, owner: 'a', rounds: 3 };
    const windy = structuredClone(plain);
    windy.zones = [z];
    const at = plain.units.rogue_0.pos;
    for (let seed = 1; seed < 20; seed++) {
      const a = structuredClone(plain);
      const b = structuredClone(windy);
      a.seed = b.seed = seed;
      const o1 = ok(cast(a, 'fireball_goukakyu', at));
      const o2 = ok(cast(b, 'fireball_goukakyu', at));
      const j = o2.events.find((e) => e.t === 'jutsu');
      assert.ok(j?.t === 'jutsu' && j.fanned?.zone === 'g1', 'the jutsu event says it was fanned');
      assert.ok(o2.events.some((e) => e.t === 'note' && e.key === 'fanned'));
      assert.ok(!o1.events.some((e) => e.t === 'note' && e.key === 'fanned'));
      // Same rolls but one more die: never less.
      if (saved(o1, 'rogue_0') === saved(o2, 'rogue_0')) assert.ok(damageOf(o2.events, 'rogue_0') >= damageOf(o1.events, 'rogue_0'), `seed ${seed}`);
    }
  });

  it('whoever casts the fire: a foe\'s fire through the party\'s gale is fanned too', () => {
    const s = duel('wind_gale_curtain', { x: 16, z: 10 });
    const g = galeAt(s, { x: 12, z: 10 }).state;
    const t = turnOf(g, 'rogue_0');
    t.units.rogue_0.jutsus = ['fire_three_embers'];
    const out = ok(applyAction(t, { type: 'jutsu', unit: 'rogue_0', jutsu: 'fire_three_embers', at: { ...t.units.a.pos }, target: 'a' }));
    const j = out.events.find((e) => e.t === 'jutsu');
    assert.ok(j?.t === 'jutsu' && !!j.fanned);
  });

  it('the screen\'s aim shows no one hit by it: it is not an attack (areaOf is still its circle)', () => {
    const area = areaOf(JUTSU.wind_gale_curtain, { x: 8, z: 10 }, { x: 12, z: 10 });
    assert.deepEqual(area, { kind: 'circle', center: { x: 12, z: 10 }, radius: 2.25 });
  });
});

describe('the Thunder Beam (Lightning, rank C) and the Rubble Gust (Earth, rank C)', () => {
  it('Thunder Beam: a 9 m line; everyone in it makes a DEX save for half of 2d8 lightning; not past its end', () => {
    const s = duel('lightning_thunder_beam', { x: 12, z: 10 }, { enemies: [{ kind: 'rogue', pos: { x: 12, z: 10 } }, { kind: 'rogue', pos: { x: 15, z: 10 } }, { kind: 'rogue', pos: { x: 19, z: 10 } }] });
    for (const u of Object.values(s.units)) u.jutsus = u.id === 'a' ? ['lightning_thunder_beam'] : [];
    place(s, 'rogue_1', { x: 15.5, z: 10 });
    place(s, 'rogue_2', { x: 19.5, z: 10 });
    const out = ok(cast(s, 'lightning_thunder_beam', { x: 20, z: s.units.a.pos.z }));
    const who = out.events.filter((e) => e.t === 'save').map((e) => (e.t === 'save' ? e.unit : '')).sort();
    assert.deepEqual(who, ['rogue_0', 'rogue_1']);
  });

  it('Thunder Beam: the beam the screen draws ends where the line ends, wherever it was aimed', () => {
    const from = { x: 8, z: 10 };
    for (const aim of [{ x: 10.5, z: 10 }, { x: 18, z: 10 }, { x: 11, z: 14 }]) {
      const line = areaOf(JUTSU.lightning_thunder_beam, from, aim)!;
      assert.equal(line.kind, 'line');
      if (line.kind !== 'line') continue;
      assert.ok(Math.abs(dist(from, areaEnd(line)) - 9) < 1e-9, JSON.stringify(aim));
    }
  });

  it('Rubble Gust: a 4.5 m cone, a DEX save; failed, 2d6 and knocked down; saved, nothing at all', () => {
    const s = duel('earth_rubble_gust', { x: 11, z: 10 });
    const fail = seeded(s, (t) => cast(t, 'earth_rubble_gust', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    assert.ok(damageOf(fail.events, 'rogue_0') >= 2);
    assert.equal(fail.state.units.rogue_0.cond.prone, true);
    assert.equal(pushedOf(fail.events, 'rogue_0'), undefined, 'it knocks down, it doesn\'t push');
    const pass = seeded(s, (t) => cast(t, 'earth_rubble_gust', t.units.rogue_0.pos), (o) => saved(o, 'rogue_0'));
    assert.equal(damageOf(pass.events, 'rogue_0'), 0);
    assert.ok(!pass.state.units.rogue_0.cond.prone);
  });

  it('every new damage jutsu is one the AI weighs; the Gale Curtain is not (it hurts nobody)', () => {
    for (const id of ['water_devouring_tide', 'wind_whirlwind_tower', 'lightning_thunder_beam', 'earth_rubble_gust']) assert.ok(offensive(JUTSU[id]), id);
  });
});

describe('the gaps\' jutsu in the log', () => {
  it('the knock-down, the sweep, the gale and the fanned fire read in both languages', () => {
    const s = duel('water_devouring_tide', { x: 16, z: 10 });
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos), (o) => failed(o, 'rogue_0') && !o.state.units.rogue_0.down);
    const st = out.state;
    const swept = pushedOf(out.events, 'rogue_0')!;
    assert.match(logLine(swept, st, 'es')!.text, /es arrastrad[oa] \(Técnica de Agua: Ola devoradora\)/);
    assert.match(logLine(swept, st, 'en')!.text, /is swept away \(Water Technique: Devouring Tide\)/);
    // A tornado drags inward, it doesn't sweep away.
    const dragged: BattleEvent = { ...swept, what: 'wind_whirlwind_tower' };
    assert.match(logLine(dragged, st, 'en')!.text, /is dragged in \(Wind Technique: Whirlwind Tower\)/);
    assert.match(logLine(dragged, st, 'es')!.text, /es arrastrad[oa] al centro \(Técnica de Viento: Torre del torbellino\)/);
    const down = out.events.find((e) => e.t === 'note' && e.key === 'knockedDown')!;
    assert.match(logLine(down, st, 'es')!.text, /cae derribad[oa]/);
    assert.match(floatLabel(down, st, 'es')!, /^Derribad[oa]$/);
    assert.equal(logLine({ t: 'zone', zone: { id: 'g', center: { x: 0, z: 0 }, radius: 2, owner: 'a', rounds: 1 }, on: true }, st, 'es')!.text, 'Un vendaval empieza a girar sobre el suelo');
    assert.equal(logLine({ t: 'zone', zone: { id: 'g', center: { x: 0, z: 0 }, radius: 2, owner: 'a', rounds: 1 }, on: false }, st, 'en')!.text, 'The gale dies down');
    assert.equal(logLine({ t: 'note', key: 'fanned', params: { name: 'Aki' } }, st, 'es')!.text, 'El vendaval aviva el fuego de Aki: un dado de daño más');
    assert.equal(floatLabel({ t: 'note', key: 'fanned', params: { name: 'Aki' } }, st, 'en'), 'Fanned!');
    for (const id of NEW) {
      const ev: BattleEvent = { t: 'jutsu', unit: 'a', jutsu: id, at: { x: 0, z: 0 }, shape: null, enhanced: false };
      assert.ok(logLine(ev, st, 'es')!.text.includes(JUTSU[id].nameEs!), id);
    }
  });
});
