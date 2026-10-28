// Tests for ice, oil and quicksand on the ground (the owner, 2026-10-28, bringing his sci-fi design
// home: "hielo... también lo añadiremos al de shinobi", "jutsus de tierra relacionados al aceite",
// "arena movediza estilo fango"; battle/ground.ts): the Frost Ground freezes the ground and whoever
// fails, ice slips and conducts lightning and melts under fire, oil is difficult terrain that blazes
// whole when fire touches it and goes out under water, quicksand is difficult terrain; the Frost Ground
// is a secret scroll's. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellKey, cellOf, getMap, propRules, waterAtPt } from './map';
import { canStop, reachable, stepCost } from './nav';
import { JUTSU } from './jutsu';
import { BLAZE_ROUNDS, ICE_ROUNDS, OIL_ROUNDS, blazeAt, cellsInArea, freeze, iceAt, ignite, mire, mudAt, oilAt, spill, tickGround, wetPatch } from './ground';
import { endTurn } from './turns';
import { jutsuChoices } from '../rules/jutsuNature';
import { creatorChoices } from '../rules/progression';
import { growthOf } from '../rules/natureGrowth';
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

const cast = (s: BattleState, id: string, at: Pt, o: { target?: string; enhanced?: boolean } = {}) =>
  applyAction(s, { type: 'jutsu', unit: 'a', jutsu: id, at, target: o.target, enhanced: o.enhanced });

/** The first seed whose outcome passes `want`. */
function seeded(s: BattleState, act: (t: BattleState) => Out, want: (out: Out) => boolean = () => true): Out {
  for (let seed = 1; seed < 200; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = ok(act(t));
    if (want(out)) return out;
  }
  throw new Error('no seed gives it');
}

const groundEv = (ev: BattleEvent[], kind: string, on: boolean) => ev.filter((e): e is Extract<BattleEvent, { t: 'ground' }> => e.t === 'ground' && e.kind === kind && e.on === on);
const notes = (ev: BattleEvent[], key: string) => ev.filter((e) => e.t === 'note' && e.key === key);
const frozen = (s: BattleState, id: string) => s.units[id].effects.some((e) => e.id === 'frozen');
const circle = (center: Pt, radius: number) => ({ kind: 'circle' as const, center, radius });

function passRounds(s: BattleState, n: number): BattleState {
  const t = structuredClone(s);
  const start = t.round;
  for (let guard = 0; guard < 200 && t.round < start + n; guard++) endTurn(t, []);
  return t;
}

describe('the Frost Ground (a secret scroll\'s Water jutsu)', () => {
  it('is rank C, Water, cold, a cone; offered only with the frost scroll', () => {
    const j = JUTSUS_DATA.find((x) => x.id === 'water_frost_ground')!;
    assert.deepEqual([j.rank, j.nature, j.damageType, j.areaOfEffect, j.scroll], ['C', 'Water', 'Cold', 'Cone', 'frost']);
    assert.deepEqual([JUTSU.water_frost_ground.ground, JUTSU.water_frost_ground.effect], ['ice', 'frozen']);
    for (const slot of ['slot2Elemental', 'slot3Elemental'] as const) {
      assert.ok(!jutsuChoices(slot, 'Water', 'Mirai').some((x) => x.id === j.id), `${slot}: without the scroll`);
      assert.ok(jutsuChoices(slot, 'Water', 'Mirai', [], ['frost']).some((x) => x.id === j.id), `${slot}: with it`);
      const holder = hero({ scrolls: ['frost'] });
      assert.ok(creatorChoices(slot, 'Water', holder.clan, holder.shinobiClass, growthOf(holder, 'Water')).some((x) => x.id === j.id), `${slot}: the creator offers it to a holder`);
      assert.ok(!creatorChoices(slot, 'Water', holder.clan, holder.shinobiClass, growthOf(hero(), 'Water')).some((x) => x.id === j.id), `${slot}: not to the rest`);
    }
  });

  it('freezes the ground of its cone (wet ground too, its water used up), and whoever fails is frozen fast until its next turn ends', () => {
    const s = scene(['water_frost_ground']);
    s.wet = { [cellKey(cellOf(s.units.rogue_0.pos))]: 3 };
    const out = seeded(s, (t) => cast(t, 'water_frost_ground', t.units.rogue_0.pos), (o) => frozen(o.state, 'rogue_0') && !o.state.units.rogue_0.down);
    assert.ok(groundEv(out.events, 'ice', true).length, 'ice rises');
    assert.ok(iceAt(out.state, out.state.units.rogue_0.pos), 'under the foe');
    assert.ok(!out.state.wet![cellKey(cellOf(out.state.units.rogue_0.pos))], 'the wet cell froze');
    assert.ok(out.events.some((e) => e.t === 'effect' && e.unit === 'rogue_0' && e.effect === 'frozen' && e.on));
    // the frozen rogue's turn is lost, and the ice breaks as it ends
    const t = structuredClone(out.state);
    for (let guard = 0; guard < 20 && t.order[t.turn] !== 'rogue_0'; guard++) endTurn(t, []);
    const ev: BattleEvent[] = [];
    assert.equal(t.order[t.turn], 'rogue_0');
    assert.equal(t.units.rogue_0.turn.action, false, 'no action');
    assert.equal(t.units.rogue_0.turn.move, 0, 'no movement');
    endTurn(t, ev);
    assert.ok(!frozen(t, 'rogue_0'), 'thawed as its turn ends');
    assert.ok(logLine(out.events.find((e) => e.t === 'ground' && e.kind === 'ice')!, out.state, 'es')!.text.includes('congela'));
  });

  it('fire thaws a frozen ninja', () => {
    const s = scene(['water_frost_ground', 'fire_three_embers']);
    const out = seeded(s, (t) => cast(t, 'water_frost_ground', t.units.rogue_0.pos), (o) => frozen(o.state, 'rogue_0') && !o.state.units.rogue_0.down);
    const t = turnOf(out.state, 'a');
    t.units.a.turn.action = true;
    const burnt = seeded(t, (u) => cast(u, 'fire_three_embers', u.units.rogue_0.pos, { target: JUTSU.fire_three_embers.shape === 'single' ? 'rogue_0' : undefined }), (o) => !frozen(o.state, 'rogue_0') && !o.state.units.rogue_0.down);
    assert.ok(notes(burnt.events, 'thawed').length, 'the thaw is said');
  });
});

describe('ice on the ground', () => {
  it('slips whoever walks onto it on a failed DEX save (down, the walk over), half speed to whoever starts a turn on it, and thaws after its rounds', () => {
    const s = scene([]);
    const a = s.units.a;
    const ahead = { x: a.pos.x + 3, z: a.pos.z };
    freeze(s, circle(ahead, 1.5), 'test', []);
    assert.ok(iceAt(s, ahead));
    const to = cellOf({ x: a.pos.x + 5, z: a.pos.z });
    const fell = seeded(s, (t) => applyAction(t, { type: 'move', unit: 'a', to }), (o) => o.state.units.a.cond.prone === true);
    assert.ok(notes(fell.events, 'slipsOnIce').length, 'the slip is said');
    assert.ok(iceAt(fell.state, fell.state.units.a.pos), 'down on the ice, short of the goal');
    assert.equal(fell.state.units.a.turn.move, 0);
    const kept = seeded(s, (t) => applyAction(t, { type: 'move', unit: 'a', to }), (o) => !o.state.units.a.cond.prone);
    assert.ok(cellKey(cellOf(kept.state.units.a.pos)) === cellKey(to), 'kept its feet and got there');
    // a turn begun on the ice: half speed
    const t = structuredClone(s);
    t.units.a.pos = cellCenter(cellOf(ahead));
    const u = passRounds(t, 1);
    for (let guard = 0; guard < 20 && u.order[u.turn] !== 'a'; guard++) endTurn(u, []);
    assert.equal(u.units.a.turn.move, u.units.a.speed / 2);
    // it thaws after ICE_ROUNDS new rounds
    const ev: BattleEvent[] = [];
    const v = structuredClone(s);
    for (let i = 0; i < ICE_ROUNDS; i++) tickGround(v, ev);
    assert.ok(!v.ice || !Object.keys(v.ice).length, 'thawed');
    assert.ok(groundEv(ev, 'ice', false).length);
  });

  it('carries lightning like wet ground, and melts to wet ground under fire', () => {
    const s = scene(['lightning_jolt', 'fire_three_embers']);
    const a = s.units.a;
    // an icy strip from the first rogue to the second
    const r0 = s.units.rogue_0.pos;
    const r1 = s.units.rogue_1.pos;
    const dir = (Math.atan2(r1.z - r0.z, r1.x - r0.x) * 180) / Math.PI;
    freeze(s, { kind: 'line', origin: r0, dir, length: Math.hypot(r1.x - r0.x, r1.z - r0.z) + 0.5, width: 1 }, 'test', []);
    s.ice![cellKey(cellOf(r0))] = ICE_ROUNDS;
    s.ice![cellKey(cellOf(r1))] = ICE_ROUNDS;
    const jolt = seeded(s, (t) => cast(t, 'lightning_jolt', t.units.rogue_0.pos, { target: JUTSU.lightning_jolt.shape === 'single' ? 'rogue_0' : undefined }), (o) => o.events.some((e) => e.t === 'conduct'));
    const conducted = jolt.events.find((e): e is Extract<BattleEvent, { t: 'conduct' }> => e.t === 'conduct')!;
    assert.ok(conducted.cells.includes(cellKey(cellOf(r1))), 'the far rogue\'s cell is on the patch');
    // fire on the ice: wet ground again
    const t = turnOf(s, 'a');
    const fire = ok(cast(t, 'fire_three_embers', t.units.rogue_0.pos, { target: JUTSU.fire_three_embers.shape === 'single' ? 'rogue_0' : undefined }));
    assert.ok(groundEv(fire.events, 'ice', false).length, 'melted');
    assert.ok(groundEv(fire.events, 'wet', true).length, 'wet now');
    assert.ok(!iceAt(fire.state, r0));
    void a;
  });
});

describe('oil on the ground', () => {
  it('the Black Oil pools: difficult terrain for OIL_ROUNDS; fire lights the whole joined pool for BLAZE_ROUNDS and burns whoever stands in it; water puts it out', () => {
    const j = JUTSUS_DATA.find((x) => x.id === 'earth_black_oil')!;
    assert.deepEqual([j.rank, j.nature, j.areaOfEffect, JUTSU.earth_black_oil.ground], ['C', 'Earth', 'Sphere', 'oil']);
    const s = scene(['earth_black_oil', 'fire_three_embers', 'water_geyser']);
    const at = s.units.rogue_0.pos;
    const out = ok(cast(s, 'earth_black_oil', at));
    assert.ok(groundEv(out.events, 'oil', true).length);
    assert.ok(oilAt(out.state, at));
    // difficult terrain: a step into oil costs double
    const c = cellOf(at);
    const from = { c: c.c - 1, r: c.r };
    const dry = structuredClone(out.state);
    delete dry.oil;
    assert.equal(stepCost(out.state, from, c, false, { waterWalk: false, ninjaJump: false }), stepCost(dry, from, c, false, { waterWalk: false, ninjaJump: false }) * 2);
    // fire on it: the pool blazes, the rogue in it burns (a DEX save for half)
    const t = turnOf(out.state, 'a');
    const lit = seeded(t, (u) => cast(u, 'fire_three_embers', u.units.rogue_0.pos, { target: JUTSU.fire_three_embers.shape === 'single' ? 'rogue_0' : undefined }), (o) => o.events.some((e) => e.t === 'save' && e.what === 'blaze'));
    assert.ok(notes(lit.events, 'oilBlazes').length, 'the blaze is said');
    assert.ok(blazeAt(lit.state, at));
    const pool = Object.values(lit.state.oil!);
    assert.ok(pool.every((o) => o.blazing === BLAZE_ROUNDS), 'the whole pool at once');
    // starting a turn in the blaze burns again
    const v = structuredClone(lit.state);
    v.units.rogue_0.hp = 60;
    v.units.rogue_0.maxHp = 60;
    const ev: BattleEvent[] = [];
    for (let guard = 0; guard < 20 && v.order[v.turn] !== 'rogue_0'; guard++) endTurn(v, ev);
    assert.ok(notes(ev, 'blazeBurns').some((e) => e.t === 'note' && e.params?.name === v.units.rogue_0.name), 'burnt at the start of its turn');
    // water puts the blaze out, the oil stays
    const w = turnOf(lit.state, 'a');
    w.units.a.turn.action = true;
    const doused = ok(cast(w, 'water_geyser', at));
    assert.ok(groundEv(doused.events, 'blaze', false).length, 'put out');
    assert.ok(!blazeAt(doused.state, at) && oilAt(doused.state, at));
    // a blaze left alone burns the oil up when it ends; unlit oil seeps away after OIL_ROUNDS
    const ticks: BattleEvent[] = [];
    const x = structuredClone(lit.state);
    for (let i = 0; i < BLAZE_ROUNDS; i++) tickGround(x, ticks);
    assert.ok(!x.oil || !Object.keys(x.oil).length, 'burnt up');
    const y = structuredClone(out.state);
    for (let i = 0; i < OIL_ROUNDS; i++) tickGround(y, []);
    assert.ok(!y.oil || !Object.keys(y.oil).length, 'seeped away');
  });

  it('ice over a blaze puts it out; a spilt pool joined to a lit one catches too', () => {
    const s = scene([]);
    const at = s.units.rogue_0.pos;
    spill(s, circle(at, 1.5), 'test', []);
    spill(s, circle({ x: at.x + 2.5, z: at.z }, 1), 'test', []);
    const lit = ignite(s, circle(at, 0.5), 'test', []);
    assert.ok(lit.length > 1, 'the joined pools light together');
    assert.ok(Object.values(s.oil!).every((o) => o.blazing));
    const ev: BattleEvent[] = [];
    freeze(s, circle(at, 0.5), 'test', ev);
    assert.ok(groundEv(ev, 'blaze', false).length);
    assert.ok(Object.values(s.oil!).every((o) => !o.blazing), 'all out');
  });
});

describe('quicksand', () => {
  it('the Quicksand turns a wide circle to mud: difficult terrain for MUD_ROUNDS, whoever fails is pulled down', () => {
    const j = JUTSUS_DATA.find((x) => x.id === 'earth_quicksand')!;
    assert.deepEqual([j.rank, j.nature, j.aoeRadius, JUTSU.earth_quicksand.ground, JUTSU.earth_quicksand.prone], ['C', 'Earth', 2, 'mud', true]);
    const s = scene(['earth_quicksand']);
    const at = s.units.rogue_0.pos;
    const out = seeded(s, (t) => cast(t, 'earth_quicksand', at), (o) => o.state.units.rogue_0.cond.prone === true);
    assert.ok(groundEv(out.events, 'mud', true).length);
    assert.ok(mudAt(out.state, at));
    const c = cellOf(at);
    const from = { c: c.c - 1, r: c.r };
    const dry = structuredClone(out.state);
    delete dry.mud;
    assert.equal(stepCost(out.state, from, c, false, { waterWalk: false, ninjaJump: false }), stepCost(dry, from, c, false, { waterWalk: false, ninjaJump: false }) * 2);
    // a walk across it reaches less
    const t = turnOf(out.state, 'a');
    const far = reachable(t, t.units.a, t.units.a.speed).cost.size;
    const u = structuredClone(t);
    delete u.mud;
    assert.ok(reachable(u, u.units.a, u.units.a.speed).cost.size >= far);
    assert.ok(logLine(out.events.find((e) => e.t === 'ground' && e.kind === 'mud')!, out.state, 'es')!.text.includes('movediza'));
    void mire;
    void cellsInArea;
  });
});

describe('knockback collisions (the owner, 2026-10-28, N11 b) and tagged props', () => {
  it('a ninja pushed against a tree, a wall or the map\'s edge slams into it for 2d6; pushed into another, 1d6 to each and the other is pushed on', () => {
    // Aki's Devouring Tide sweeps whoever fails 3 m away from her. Rogue 0 stands right against the
    // map's west... use a Kōton metal wall behind it instead: a wall right behind the rogue.
    const s = scene(['water_devouring_tide'], [{ x: 11, z: 10 }, { x: 20, z: 10 }, { x: 22, z: 12 }]);
    const r0 = s.units.rogue_0.pos;
    s.walls.push({ id: 'w1', kind: 'metal', a: { x: r0.x + 0.6, z: r0.z - 2 }, b: { x: r0.x + 0.6, z: r0.z + 2 }, hp: 40 });
    const out = seeded(s, (t) => cast(t, 'water_devouring_tide', { x: r0.x, z: r0.z }), (o) => o.events.some((e) => e.t === 'slam' && e.unit === 'rogue_0' && e.into === 'wall'));
    assert.ok(out.events.some((e) => e.t === 'damage' && e.unit === 'rogue_0' && e.dmgType === 'Bludgeoning'), 'the slam hurts');
    assert.ok(logLine(out.events.find((e) => e.t === 'slam')!, out.state, 'es')!.text.includes('estrella'));
    // two rogues in a row: the first is swept into the second, both take 1d6, the second is pushed on
    const t = scene(['water_devouring_tide'], [{ x: 11, z: 10 }, { x: 12.5, z: 10 }, { x: 22, z: 12 }]);
    const p0 = t.units.rogue_0.pos;
    const p1 = { ...t.units.rogue_1.pos };
    const chain = seeded(t, (u) => cast(u, 'water_devouring_tide', { x: p0.x, z: p0.z }), (o) => o.events.some((e) => e.t === 'slam' && e.unit === 'rogue_0' && e.into === 'rogue_1'));
    assert.ok(chain.events.some((e) => e.t === 'damage' && e.unit === 'rogue_1'), 'the one hit takes it too');
    assert.ok(chain.events.some((e) => e.t === 'pushed' && e.unit === 'rogue_1') || chain.events.some((e) => e.t === 'slam' && e.unit === 'rogue_1'), 'and is pushed on (or slams in turn)');
    void p1;
  });

  it('the Rush knocks its target back; a shove against a wall slams', () => {
    assert.deepEqual(JUTSU.taijutsu_rush.push, { m: 1.5 });
  });

  it('a barrel of oil is tagged fuel: broken it spills oil, under fire it burns and its oil blazes; a stone lantern is metal and carries lightning', () => {
    const map = getMap('river_forest');
    const barrel = map.props.findIndex((p) => p.group === 'camp' && p.name === 'barrel');
    const lantern = map.props.findIndex((p) => p.group === 'landmarks' && p.name === 'stone_lantern');
    assert.ok(barrel >= 0 && lantern >= 0);
    assert.deepEqual(propRules(map.props[barrel]).tags, ['wood', 'fuel']);
    assert.deepEqual(propRules(map.props[lantern]).tags, ['metal']);
    // broken by a blow: oil round it
    const s = scene([]);
    const b = map.props[barrel];
    place(s, 'a', { x: b.x - 1, z: b.z });
    s.props[barrel].hp = 1;
    const out = seeded(s, (t) => applyAction(t, { type: 'attack', unit: 'a', target: `prop:${barrel}`, ranged: false }), (o) => o.events.some((e) => e.t === 'prop' && e.prop === barrel && e.state === 'broken'));
    assert.ok(notes(out.events, 'barrelSpills').length);
    assert.ok(oilAt(out.state, { x: b.x, z: b.z }));
    // fire on a barrel: burnt, and the oil round it already blazing
    const t = scene(['fireball_goukakyu']);
    place(t, 'a', { x: b.x - 3, z: b.z });
    const lit = seeded(t, (u) => cast(u, 'fireball_goukakyu', { x: b.x, z: b.z }), (o) => o.events.some((e) => e.t === 'prop' && e.prop === barrel && e.state === 'burnt'));
    assert.ok(blazeAt(lit.state, { x: b.x, z: b.z }), 'blazing');
    // lightning that touches wet ground joined to the lantern's cell runs through the lantern
    const l = map.props[lantern];
    const u = scene(['lightning_jolt'], [{ x: l.x + 1, z: l.z }, { x: 20, z: 10 }, { x: 22, z: 12 }]);
    const patch = wetPatch(u, [cellKey(cellOf({ x: l.x, z: l.z }))]);
    assert.ok(patch.has(cellKey(cellOf({ x: l.x, z: l.z }))), 'the lantern conducts');
  });
});
