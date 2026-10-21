// Tests for the elements on the ground (the owner's second round on the gaps' jutsu, 2026-10-21;
// docs/GAMEPLAY_DESIGN.md, "The elements on the ground"): water soaks the ground for a while and
// puts out flames, wet ground carries lightning across the patch it touched (and only that patch),
// fire on wet ground makes steam that blinds and burns, wind blows steam away, and the AI knows
// all this. Also the Devouring Tide's new rank (A) and slot. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellKey, cellOf, dampAt, lineOfSight, waterAtPt } from './map';
import { canStop } from './nav';
import { JUTSU, areaOf } from './jutsu';
import { STEAM_ROUNDS, WET_ROUNDS, cellsInArea, tickGround, wetPatch } from './ground';
import { attackPreview } from './combat';
import { aiAction } from './ai';
import { areaValue, visibleFoes } from './intent';
import { endTurn } from './turns';
import { addEffect } from '../rules/effects';
import { jutsuChoices } from '../rules/jutsuNature';
import { creatorChoices } from '../rules/progression';
import { NO_GROWTH } from '../rules/natureGrowth';
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
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 16, z: 12 } }, { kind: 'rogue', pos: { x: 20, z: 10 } }],
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

/** Aki on its turn with only `ids`, three rogues with no jutsu, each where it is put. */
function scene(ids: string[], foes: Pt[] = [{ x: 14, z: 10 }, { x: 16, z: 12 }, { x: 20, z: 10 }]): BattleState {
  const s = turnOf(createBattle(setup()).state, 'a');
  for (const u of Object.values(s.units)) {
    u.jutsus = [];
    u.chakra = 30;
  }
  s.units.a.jutsus = ids;
  place(s, 'a', { x: 8, z: 10 });
  foes.forEach((p, i) => place(s, `rogue_${i}`, p));
  return s;
}

/** Soaks the cells within `r` m of a point by hand (as a water jutsu would). */
function soakAt(s: BattleState, p: Pt, r: number, rounds = WET_ROUNDS): void {
  s.wet ??= {};
  for (const c of cellsInArea(s, { kind: 'circle', center: p, radius: r })) if (!waterAtPt(s, cellCenter(c))) s.wet[cellKey(c)] = rounds;
}

/** Soaks a straight strip of ground from a to b, `w` m wide. */
function soakStrip(s: BattleState, a: Pt, b: Pt, w = 1): void {
  const dir = (Math.atan2(b.z - a.z, b.x - a.x) * 180) / Math.PI;
  s.wet ??= {};
  for (const c of cellsInArea(s, { kind: 'line', origin: a, dir, length: Math.hypot(b.x - a.x, b.z - a.z), width: w })) s.wet[cellKey(c)] = WET_ROUNDS;
  s.wet[cellKey(cellOf(a))] = WET_ROUNDS;
}

const cast = (s: BattleState, id: string, at: Pt, o: { target?: string; enhanced?: boolean } = {}) =>
  applyAction(s, { type: 'jutsu', unit: 'a', jutsu: id, at, target: o.target, enhanced: o.enhanced });

/** The first seed whose outcome passes `want`. */
function seeded(s: BattleState, act: (t: BattleState) => Out, want: (out: Out) => boolean = () => true): Out {
  for (let seed = 1; seed < 150; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = ok(act(t));
    if (want(out)) return out;
  }
  throw new Error('no seed gives it');
}

const groundEv = (ev: BattleEvent[], kind: 'wet' | 'steam', on: boolean) => ev.filter((e): e is Extract<BattleEvent, { t: 'ground' }> => e.t === 'ground' && e.kind === kind && e.on === on);
const savesOn = (ev: BattleEvent[], what: string) => ev.filter((e): e is Extract<BattleEvent, { t: 'save' }> => e.t === 'save' && e.what === what).map((e) => e.unit);
const burning = (s: BattleState, id: string) => s.units[id].effects.some((e) => e.id === 'burning');
const setBurning = (s: BattleState, id: string) => (s.units[id].effects = addEffect(s.units[id].effects, 'burning', { source: 'test' }).effects);

/** Runs turns (ending each) until a new round has begun `n` times. */
function passRounds(s: BattleState, n: number): BattleState {
  const t = structuredClone(s);
  const start = t.round;
  for (let guard = 0; guard < 200 && t.round < start + n; guard++) endTurn(t, []);
  return t;
}

describe('the Devouring Tide is rank A now ("ola devoradora es rango a")', () => {
  it('an Element slot\'s jutsu of Water, 5 chakra, a 9 m cone, 5d8: Water has no S-rank again', () => {
    const j = JUTSUS_DATA.find((x) => x.id === 'water_devouring_tide')!;
    assert.deepEqual([j.rank, j.category, j.nature, j.chakraCost, j.enhancementChakraCost, j.damageDice], ['A', 'Elemental', 'Water', 5, 3, '5d8']);
    assert.deepEqual([JUTSU.water_devouring_tide.length, JUTSU.water_devouring_tide.angle], [9, 60]);
    // The nature filter offers it to a Water ninja's Element slots, not to the S-rank slot.
    for (const slot of ['slot2Elemental', 'slot3Elemental'] as const) assert.ok(jutsuChoices(slot, 'Water', 'Mirai').some((x) => x.id === j.id), slot);
    assert.ok(!jutsuChoices('slot5Ultimate', 'Water', 'Mirai').some((x) => x.id === j.id));
    assert.ok(!jutsuChoices('slot2Elemental', 'Fire', 'Mirai').some((x) => x.id === j.id), 'only Water');
    assert.ok(!JUTSUS_DATA.some((x) => x.nature === 'Water' && x.rank === 'S'), 'Water has no S-rank (open question)');
    // A new ninja picks D and C (and its clan's): the Tide opens at level 7, like every rank A.
    assert.ok(!creatorChoices('slot2Elemental', 'Water', 'Mirai', 'Ninjutsu Specialist').some((x) => x.id === j.id), 'not for a new ninja');
    assert.ok(creatorChoices('slot2Elemental', 'Water', 'Mirai', 'Ninjutsu Specialist', { ...NO_GROWTH, level: 7 }).some((x) => x.id === j.id), 'at level 7');
  });
});

describe('water soaks the ground ("pone el suelo donde pasa mojado por 2 turnos")', () => {
  it('the Tide wets the cone it runs over (not the river, which is water already), for the rest of the round and two more', () => {
    const s = scene(['water_devouring_tide']);
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', t.units.rogue_0.pos));
    const area = areaOf(JUTSU.water_devouring_tide, s.units.a.pos, s.units.rogue_0.pos)!;
    const want = cellsInArea(s, area).filter((c) => !waterAtPt(s, cellCenter(c)) && !cellBlocked(s, c));
    const wet = out.state.wet ?? {};
    assert.ok(want.length > 100);
    for (const c of want) assert.equal(wet[cellKey(c)], WET_ROUNDS, cellKey(c));
    assert.equal(Object.keys(wet).length, want.length, 'only the cone');
    assert.equal(groundEv(out.events, 'wet', true).length, 1);
    assert.equal(logLine(groundEv(out.events, 'wet', true)[0], out.state, 'es')!.text, 'El suelo queda mojado');
    // It dries as the third new round begins.
    const r2 = passRounds(out.state, 2);
    assert.ok(Object.keys(r2.wet ?? {}).length > 0, 'still wet two rounds on');
    const r3 = passRounds(out.state, 3);
    assert.equal(Object.keys(r3.wet ?? {}).length, 0, 'dry on the third');
  });

  it('every water jutsu that strikes soaks the ground and puts flames out, not only the Tide', () => {
    const s = scene(['water_geyser']);
    setBurning(s, 'rogue_0');
    const out = seeded(s, (t) => cast(t, 'water_geyser', t.units.rogue_0.pos, { target: JUTSU.water_geyser.shape === 'single' ? 'rogue_0' : undefined }), (o) => !o.state.units.rogue_0.down);
    assert.equal(JUTSU.water_geyser.douse, true);
    assert.ok(!burning(out.state, 'rogue_0'), 'the geyser put its fire out');
    assert.ok(dampAt(out.state, out.state.units.rogue_0.pos), 'its ground is wet');
    // A heal or a wall is no strike: it soaks nothing.
    assert.ok(!JUTSU.water_shield_suijinheki.douse && !JUTSU.water_healing_dew.douse);
  });

  it('wet ground puts out the flames of whoever starts a turn on it, and no flame catches on it', () => {
    const s = scene(['fireball_goukakyu']);
    soakAt(s, s.units.rogue_0.pos, 1);
    setBurning(s, 'rogue_0');
    const t = structuredClone(s);
    t.turn = t.order.indexOf('rogue_0') - 1;
    if (t.turn < 0) t.turn = t.order.length - 1;
    const ev: BattleEvent[] = [];
    endTurn(t, ev);
    assert.equal(t.order[t.turn], 'rogue_0');
    assert.ok(!burning(t, 'rogue_0'), 'out on wet ground');
    assert.ok(ev.some((e) => e.t === 'effect' && e.unit === 'rogue_0' && e.effect === 'burning' && !e.on));
    // A Fireball on it: the flames don't catch (the water turns to steam instead).
    const f = seeded(scene(['fireball_goukakyu']), (x) => {
      soakAt(x, x.units.rogue_0.pos, 1);
      return cast(x, 'fireball_goukakyu', x.units.rogue_0.pos);
    }, (o) => o.events.some((e) => e.t === 'save' && e.unit === 'rogue_0' && !e.roll.success) && !o.state.units.rogue_0.down);
    assert.ok(!burning(f.state, 'rogue_0'), 'no Burning on wet ground');
  });
});

describe('wet ground conducts lightning ("conduce electricidad")', () => {
  it('a bolt on a foe on wet ground reaches everyone on the connected wet cells, and nobody on a separate patch or on dry ground', () => {
    const s = scene(['lightning_jolt'], [{ x: 14, z: 10 }, { x: 18, z: 10 }, { x: 24, z: 10 }]);
    soakStrip(s, s.units.rogue_0.pos, s.units.rogue_1.pos);
    soakAt(s, s.units.rogue_2.pos, 1);
    const patch = wetPatch(s, [cellKey(cellOf(s.units.rogue_0.pos))]);
    assert.ok(patch.has(cellKey(cellOf(s.units.rogue_1.pos))), 'one patch from rogue 0 to rogue 1');
    assert.ok(!patch.has(cellKey(cellOf(s.units.rogue_2.pos))), 'rogue 2 on another');
    const out = seeded(s, (t) => cast(t, 'lightning_jolt', t.units.rogue_0.pos, { target: 'rogue_0' }), (o) => o.events.some((e) => e.t === 'save' && e.unit === 'rogue_0' && !e.roll.success && !e.roll.fumble));
    assert.deepEqual(savesOn(out.events, 'wet ground'), ['rogue_1'], 'rogue 1 only');
    const c = out.events.find((e) => e.t === 'conduct') as Extract<BattleEvent, { t: 'conduct' }>;
    assert.ok(c, 'the spark across the patch');
    assert.deepEqual(new Set(c.cells), patch);
    assert.equal(c.source, 'a');
    assert.equal(logLine(c, out.state, 'es')!.text, '¡El rayo corre por el suelo mojado!');
    // Half the bolt's damage (its 1d6), halved again on a save.
    const got = out.events.filter((e) => e.t === 'damage' && e.unit === 'rogue_1').reduce((n, e) => n + (e.t === 'damage' ? e.amount : 0), 0);
    assert.ok(got <= 3, `${got}`);
  });

  it('a target on dry ground carries nothing, even with a wet patch near it', () => {
    const dry = scene(['lightning_jolt'], [{ x: 14, z: 10 }, { x: 18, z: 10 }, { x: 24, z: 10 }]);
    soakAt(dry, dry.units.rogue_1.pos, 1);
    const out = seeded(dry, (t) => cast(t, 'lightning_jolt', t.units.rogue_0.pos, { target: 'rogue_0' }));
    assert.deepEqual(savesOn(out.events, 'wet ground'), []);
    assert.ok(!out.events.some((e) => e.t === 'conduct'));
  });

  it('a line or circle of lightning that only touches the wet patch (nobody hit on it) still runs across it', () => {
    const s = scene(['lightning_thunder_beam'], [{ x: 12, z: 14 }, { x: 18, z: 14 }, { x: 30, z: 4 }]);
    // A wet strip from the beam's line (z 10) down to the two rogues standing off it.
    soakStrip(s, { x: 12, z: 10 }, s.units.rogue_0.pos, 1.2);
    soakStrip(s, s.units.rogue_0.pos, s.units.rogue_1.pos, 1);
    const out = seeded(s, (t) => cast(t, 'lightning_thunder_beam', { x: 17, z: 10 }));
    assert.deepEqual(savesOn(out.events, 'lightning_thunder_beam'), [], 'the beam itself hits nobody');
    assert.deepEqual(savesOn(out.events, 'wet ground').sort(), ['rogue_0', 'rogue_1']);
  });
});

describe('fire on wet ground makes steam ("vapor que es como una cortina de humo")', () => {
  it('a Fireball on wet ground: the wet cells it reaches turn to steam, the rest stay wet', () => {
    const s = scene(['fireball_goukakyu']);
    soakStrip(s, { x: 12, z: 10 }, { x: 22, z: 10 }, 2);
    const before = Object.keys(s.wet!).length;
    const out = seeded(s, (t) => cast(t, 'fireball_goukakyu', t.units.rogue_0.pos));
    const steam = Object.keys(out.state.steam ?? {});
    assert.ok(steam.length > 0);
    for (const k of steam) {
      assert.ok(!(k in out.state.wet!), `${k}: the water is used up`);
      assert.equal(out.state.steam![k].rounds, STEAM_ROUNDS);
      assert.equal(out.state.steam![k].by, 'a');
    }
    assert.equal(Object.keys(out.state.wet!).length + steam.length, before, 'the far end stays wet');
    assert.equal(groundEv(out.events, 'steam', true).length, 1);
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'steamRises'));
    // Dry ground makes no steam.
    const dry = seeded(scene(['fireball_goukakyu']), (t) => cast(t, 'fireball_goukakyu', t.units.rogue_0.pos));
    assert.equal(Object.keys(dry.state.steam ?? {}).length, 0);
  });

  it('nobody sees into, out of or through the steam: no kunai, no aimed jutsu across it; a blow into it has disadvantage', () => {
    const s = scene(['lightning_jolt'], [{ x: 14, z: 10 }, { x: 18, z: 10 }, { x: 30, z: 4 }]);
    s.steam = {};
    for (const c of cellsInArea(s, { kind: 'circle', center: { x: 11, z: 10 }, radius: 1 })) s.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    assert.equal(lineOfSight(s, s.units.a.pos, s.units.rogue_0.pos), false, 'through it');
    assert.equal(applyAction(structuredClone(s), { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }).reason, 'noSight');
    assert.equal(cast(structuredClone(s), 'lightning_jolt', s.units.rogue_0.pos, { target: 'rogue_0' }).reason, 'noSight');
    // Into it: the rogue stands in the steam beside Aki.
    const m = structuredClone(s);
    m.steam = {};
    m.units.rogue_0.pos = { ...cellCenter(cellOf({ x: m.units.a.pos.x + 1, z: m.units.a.pos.z })) };
    for (const c of cellsInArea(m, { kind: 'circle', center: m.units.rogue_0.pos, radius: 0.6 })) if (!(Math.hypot(cellCenter(c).x - m.units.a.pos.x, cellCenter(c).z - m.units.a.pos.z) < 0.3)) m.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    assert.ok(!(cellKey(cellOf(m.units.a.pos)) in m.steam), 'Aki outside');
    const pv = attackPreview(m, m.units.a, m.units.rogue_0, 'melee');
    assert.ok(pv.reasons.includes('obscured') && pv.adv === 'disadvantage', pv.reasons.join());
    // From inside, out at one beside it: neither sees the other, so it evens out.
    const back = attackPreview(m, m.units.rogue_0, m.units.a, 'melee');
    assert.ok(!back.reasons.includes('obscured'));
    // In the steam, out of every watcher's sight: a ninja can hide there.
    const h = structuredClone(s);
    h.steam = {};
    for (const c of cellsInArea(h, { kind: 'circle', center: h.units.a.pos, radius: 1 })) h.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    assert.notEqual(applyAction(h, { type: 'hide', unit: 'a' }).reason, 'nowhereToHide');
  });

  it('steam burns whoever starts a turn in it (1d6 fire), and thins away after its rounds', () => {
    const s = scene([]);
    s.steam = {};
    for (const c of cellsInArea(s, { kind: 'circle', center: s.units.rogue_0.pos, radius: 1 })) s.steam[cellKey(c)] = { rounds: STEAM_ROUNDS, by: 'a' };
    const t = structuredClone(s);
    t.turn = (t.order.indexOf('rogue_0') + t.order.length - 1) % t.order.length;
    const ev: BattleEvent[] = [];
    const hp = t.units.rogue_0.hp;
    endTurn(t, ev);
    const burn = ev.find((e) => e.t === 'damage' && e.unit === 'rogue_0') as Extract<BattleEvent, { t: 'damage' }>;
    assert.ok(burn && burn.dmgType === 'Fire' && burn.amount >= 1 && burn.amount <= 6, 'one d6 of fire');
    assert.equal(burn.source, 'a', 'the fire\'s maker');
    assert.ok(t.units.rogue_0.hp < hp);
    assert.ok(ev.some((e) => e.t === 'note' && e.key === 'steamBurns'));
    const later = passRounds(s, STEAM_ROUNDS);
    assert.equal(Object.keys(later.steam ?? {}).length, 0, 'gone');
    const g: BattleEvent[] = [];
    const x = structuredClone(s);
    for (const k of Object.keys(x.steam!)) x.steam![k].rounds = 1;
    tickGround(x, g);
    assert.equal(logLine(g.find((e) => e.t === 'ground')!, x, 'es')!.text, 'El vapor se disipa');
  });

  it('wind blows the steam away (a wind jutsu\'s area, a gale)', () => {
    const s = scene(['wind_whirlwind_tower', 'wind_gale_curtain']);
    s.steam = {};
    for (const c of cellsInArea(s, { kind: 'circle', center: s.units.rogue_0.pos, radius: 2 })) s.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    const out = seeded(s, (t) => cast(t, 'wind_whirlwind_tower', t.units.rogue_0.pos));
    assert.ok(Object.keys(out.state.steam!).length < Object.keys(s.steam).length, 'the tower blew it');
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'steamBlown'));
    const g = ok(cast(structuredClone(s), 'wind_gale_curtain', s.units.rogue_0.pos));
    assert.ok(Object.keys(g.state.steam!).length < Object.keys(s.steam).length, 'the gale blew it');
  });
});

describe('the AI and the elements on the ground', () => {
  it('an AI ninja standing in steam walks out of it first', () => {
    const s = scene([]);
    const r = structuredClone(s);
    r.turn = r.order.indexOf('rogue_0');
    const u = r.units.rogue_0;
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    r.steam = {};
    for (const c of cellsInArea(r, { kind: 'circle', center: u.pos, radius: 1.5 })) r.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    const a = aiAction(r)!;
    assert.equal(a.type, 'move');
    if (a.type === 'move') assert.ok(!(cellKey(a.to) in r.steam), 'out of the steam');
  });

  it('it weighs lightning on a wet group: the foes on the patch count; a foe lost in the steam far away is not seen', () => {
    const s = scene(['lightning_jolt'], [{ x: 14, z: 10 }, { x: 18, z: 10 }, { x: 24, z: 10 }]);
    const enemy = structuredClone(s);
    // From the rogues' side: Aki and a friend of hers on a wet strip.
    const r = enemy.units.rogue_2;
    r.jutsus = ['lightning_jolt'];
    const dry = areaValue(enemy, r, JUTSU.lightning_jolt, enemy.units.a);
    soakStrip(enemy, enemy.units.a.pos, enemy.units.rogue_0.pos);
    // rogue_0 is the rogue's own friend on the patch: that counts against it.
    assert.ok(areaValue(enemy, r, JUTSU.lightning_jolt, enemy.units.a) < dry, 'a friend on the patch');
    const party = scene(['lightning_jolt'], [{ x: 14, z: 10 }, { x: 18, z: 10 }, { x: 24, z: 10 }]);
    soakStrip(party, party.units.rogue_0.pos, party.units.rogue_1.pos);
    assert.equal(areaValue(party, party.units.a, JUTSU.lightning_jolt, party.units.rogue_0), 1.5, 'the target and half the other on the patch');
    party.steam = {};
    for (const c of cellsInArea(party, { kind: 'circle', center: party.units.rogue_2.pos, radius: 1 })) party.steam[cellKey(c)] = { rounds: 3, by: 'a' };
    assert.ok(!visibleFoes(party, party.units.a).some((f) => f.id === 'rogue_2'));
  });
});

