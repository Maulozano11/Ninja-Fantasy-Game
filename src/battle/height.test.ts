// Height and diagonals (the owner, 2026-10-22): "si me gustaria darle alguna clase de altura ...
// terreno elevado ... trepando una colina bajando un colina ... alguien subio a una torre"; on
// diagonals, after trying 5-10-5, "pon 5-5-5 para hacer mas facil de entender el juego"
// (2026-10-24). These tests pin the 5-5-5 diagonals, climbing (ramps, ledges, walls,
// the ladder), the reach and cover rules of height, and the height test battle. His answers of
// 2026-10-23 on the height rules: the range from high ground for everything thrown or sent, sight
// over an edge "como en xcom 2", falls that hurt only when not on purpose (3d6 at most), and an AI
// that keeps the high ground when it fights from afar and comes down when it fights up close. His
// second round (2026-10-23): "jutsus sin alcance extra ; conos solo conos los demas si les da mas
// alcance ... rocas altas y objetos altos para tapar la vista ... [mirar hacia abajo] es similar
// solo inverso": only cones get no reach from above, tall things hide by their height, and looking
// down works as looking up, the other way round.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { CELL, cellCenter, cellOf, coverBetween, fallDice, gridFor, idx, levelAtPt, lineOfSight, rangeDist, terrainBlocks } from './map';
import { canStop, climbCost, CLIMB_DOWN, CLIMB_UP, DIAGONAL_RULE, diagonalCost, pathCost, pathTo, reachable, walkCost, walkDist } from './nav';
import { attackPreview } from './combat';
import { KUNAI } from './units';
import { JUTSU, areaIn, areaOf, jutsuRange, reachesFromAbove } from './jutsu';
import { fightsFromAfar, ninjaOptions, standScore } from './intent';
import type { BattleEvent } from './types';
import { aiAction } from './ai';
import { current } from './turns';
import { ENCOUNTERS, encounterSetup } from './encounters';
import { HEIGHT_TEST, LADDER, TOWER } from './maps/heightTest';
const getMapProps = (_s: BattleState) => HEIGHT_TEST.props;
import './maps';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const SUPPLIES = { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 };
const at = (x: number, z: number): Pt => ({ x, z });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 12.25, z: 11.25 } }],
    enemies: [{ kind: 'rogue', pos: { x: 50, z: 6 } }],
    stealth: false,
    supplies: { ...SUPPLIES },
    ...over,
  };
}

/** A battle on the height test map: Aki where asked, a rogue where asked (far off by default). */
function onHill(a: Pt, rogue: Pt = at(34.75, 14.75)): BattleState {
  return createBattle(setup({ mapId: 'height_test', party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: a }], enemies: [{ kind: 'rogue', pos: rogue }] })).state;
}

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

/** The cost of the cheapest path from a unit to a point (on the cells), Infinity if none. */
function costTo(s: BattleState, id: string, p: Pt, budget = 40): number {
  const g = gridFor(s.mapId);
  return reachable(s, s.units[id], budget).cost.get(idx(g, cellOf(p))) ?? Infinity;
}

describe('5-5-5 diagonals (the owner, 2026-10-24: "pon 5-5-5 para hacer mas facil de entender el juego")', () => {
  it('is the rule in use: a diagonal step costs one cell (0.5 m), as a straight one', () => {
    assert.equal(DIAGONAL_RULE, '5-5-5');
    assert.equal(diagonalCost(), CELL);
    assert.equal(diagonalCost('true'), CELL * Math.SQRT2);
    const s = turnOf(createBattle(setup()).state, 'a');
    const from = s.units.a.pos;
    // 1, 2, 3, 4, 6 diagonal cells up and right: 0.5 m each.
    for (const n of [1, 2, 3, 4, 6]) near(costTo(s, 'a', at(from.x + n * CELL, from.z - n * CELL)), n * CELL);
    // A 5 ft square of 5e is 1.5 m, 3 of our cells: two diagonal squares cost 5 + 5 ft = 3 m.
    near(costTo(s, 'a', at(from.x + 6 * CELL, from.z + 6 * CELL)), 3);
  });

  it('a straight step costs one cell, and a knight\'s move costs its longer side', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const from = s.units.a.pos;
    near(costTo(s, 'a', at(from.x + 3, from.z)), 3);
    // 4 across and 2 into the depth: 2 diagonals and 2 straight, 2 m.
    near(costTo(s, 'a', at(from.x + 4 * CELL, from.z - 2 * CELL)), 2);
    near(walkDist(from, at(from.x + 4 * CELL, from.z - 2 * CELL)), 2);
    near(walkDist(from, at(from.x + 2, from.z + 2), 'true'), 2 * Math.SQRT2);
  });

  it('the reach is a square on open ground: 9 m of movement reach 9 m across and 9 m into the depth at once', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const g = gridFor(s.mapId);
    const r = reachable(s, s.units.a, 3);
    const from = cellOf(s.units.a.pos);
    // The corner 3 m across and 3 m back is in reach, one more cell beyond either side is not.
    assert.ok(r.cost.has(idx(g, { c: from.c + 6, r: from.r - 6 })));
    assert.ok(!r.cost.has(idx(g, { c: from.c + 7, r: from.r - 6 })));
  });

  it('the path the preview shows costs what the reach says, and the move takes exactly that; it doesn\'t zigzag', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const to = cellOf(at(15.25, 8.25));
    const r = reachable(s, s.units.a, 20);
    const path = pathTo(s, r, to)!;
    const cost = pathCost(s, s.units.a, path);
    near(cost, r.cost.get(idx(gridFor(s.mapId), to))!);
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to }));
    near(out.state.units.a.turn.move, s.units.a.turn.move - cost);
    near(cost, 3);
    // 6 diagonals, the straightest of the paths that cost the same.
    assert.equal(path.length, 6);
    near(walkCost(s, s.units.a, path, { diagonals: 'true' }).total, 6 * CELL * Math.SQRT2);
    // Straight across: no step up or down on the way.
    const across = pathTo(s, r, cellOf(at(s.units.a.pos.x + 3, s.units.a.pos.z)))!;
    assert.ok(across.every((c) => c.r === cellOf(s.units.a.pos).r), JSON.stringify(across));
  });

  it('splitting a move or dashing changes nothing: every diagonal costs the same', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    const m0 = s.units.a.turn.move;
    const step = (dx: number, dz: number) => {
      const u = s.units.a;
      s = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(u.pos.x + dx, u.pos.z + dz)) })).state;
    };
    step(CELL, -CELL);
    step(CELL, -CELL);
    step(CELL, 0);
    step(CELL, -CELL);
    near(s.units.a.turn.move, m0 - 2);
    s = ok(applyAction(s, { type: 'dash', unit: 'a' })).state;
    const m = s.units.a.turn.move;
    step(CELL, CELL);
    near(s.units.a.turn.move, m - 0.5);
  });

  it('ranges and reach count squares too: a foe a 5e square away on the diagonal is in reach, and leaving it provokes', () => {
    // The rogue 1.5 m across and 1.5 m back: 2.1 m as the crow flies, one square (1.5 m) by 5-5-5.
    const s = createBattle(setup({ enemies: [{ kind: 'rogue', pos: at(13.75, 9.75) }] })).state;
    near(rangeDist(s.units.a.pos, s.units.rogue_0.pos), 1.5);
    near(rangeDist(s.units.a.pos, s.units.rogue_0.pos, 'true'), 1.5 * Math.SQRT2);
    assert.ok(attackPreview(s, s.units.a, s.units.rogue_0, 'melee').inRange);
    const hit = ok(applyAction(turnOf(s, 'a'), { type: 'attack', unit: 'a', target: 'rogue_0' }));
    assert.ok(hit.events.some((e) => e.t === 'attack' && e.unit === 'a'));
    // Stepping on out of that diagonal reach is an opportunity for Aki's blade.
    const out = ok(applyAction(turnOf(s, 'rogue_0'), { type: 'move', unit: 'rogue_0', to: cellOf(at(15.25, 8.25)) }));
    assert.equal(out.state.pending?.kind, 'opportunity');
    // The kunai's 9 m count the same way: 9 m across and 9 m back is no long throw.
    const pv = attackPreview(s, { ...s.units.a, pos: at(4.25, 18.75) }, { ...s.units.rogue_0, pos: at(13.25, 9.75) }, 'ranged');
    assert.ok(pv.inRange && !pv.reasons.includes('longRange'), JSON.stringify(pv.reasons));
    // A jutsu's range too (a point 9 m off on the diagonal, the explosive tag's throw).
    near(rangeDist(at(0, 0), at(9, -9)), 9);
  });
});

describe('climbing: terraces and stairs, ledges, walls and the ladder', () => {
  it('the stone stairs up the terraces cost only the ground covered; the cliff face beside them is climbed at half speed', () => {
    // Up the stairs from the field to the terrace (level 1), then up the next ones to the upper terrace (level 2).
    const s = turnOf(onHill(at(15.25, 10.75)), 'a');
    near(costTo(s, 'a', at(15.25, 8.25)), 2.5);
    assert.equal(levelAtPt(s, at(15.25, 8.25)), 1);
    const t = turnOf(onHill(at(11.25, 6.75)), 'a');
    near(costTo(t, 'a', at(11.25, 4.25)), 2.5);
    assert.equal(levelAtPt(t, at(11.25, 4.25)), 2);
    // Straight up the terrace's cliff face instead: the step and 3 m of climbing.
    const f = turnOf(onHill(at(6.25, 8.75)), 'a');
    near(costTo(f, 'a', at(6.25, 8.25)), 0.5 + 3);
  });

  it('a ledge one level high is climbed at half speed: 3 m up, 1.5 m down, on top of the step', () => {
    assert.equal(CLIMB_UP, 3);
    assert.equal(CLIMB_DOWN, 1.5);
    const s = turnOf(onHill(at(21.25, 13.25)), 'a');
    near(costTo(s, 'a', at(21.25, 12.75)), 0.5 + 3);
    const top = turnOf(onHill(at(21.25, 12.75)), 'a');
    near(costTo(top, 'a', at(21.25, 13.25)), 0.5 + 1.5);
  });

  it('a wall two levels high (the upper terrace\'s right side, the tower\'s sides) takes the ninja jump', () => {
    const s = turnOf(onHill(at(18.25, 2.25)), 'a');
    const g = cellOf(at(18.25, 2.25));
    const up = cellOf(at(17.75, 2.25));
    assert.equal(climbCost(s, g, up, { ninjaJump: false }), Infinity);
    assert.equal(climbCost(s, cellOf(at(28.25, 6.25)), cellOf(at(28.25, 5.75)), { ninjaJump: false }), Infinity);
    // So it walks round by the stairs...
    assert.ok(costTo(s, 'a', at(17.75, 2.25)) > 8);
    // ...or, with the ninja jump (a bonus action), goes straight up: 0.5 m + 2 levels at 0.5 m.
    const j = ok(applyAction(s, { type: 'jump', unit: 'a' })).state;
    near(costTo(j, 'a', at(17.75, 2.25)), 0.5 + 2 * 0.5);
  });

  it('the tower\'s ladder: 3 m up at half speed is 6 m, plus the steps; nobody stops on it', () => {
    const foot = at(29.25, LADDER.z1 + 0.25);
    const s = turnOf(onHill(foot), 'a');
    const top = at(29.25, TOWER.z1 - 0.25);
    near(costTo(s, 'a', top), 3 * CELL + 2 * CLIMB_UP);
    const path = pathTo(s, reachable(s, s.units.a, 20), cellOf(top))!;
    near(walkCost(s, s.units.a, path).climb, 6);
    // The ladder's rungs: reached on the way, never a place to stand.
    const mid = cellOf(at(29.25, 6.25));
    assert.ok(reachable(s, s.units.a, 20).cost.has(idx(gridFor(s.mapId), mid)));
    assert.ok(!canStop(s, s.units.a, mid));
  });

  it('a move onto a rung is refused; a move up the ladder ends on the platform, 3 m up', () => {
    const s = turnOf(onHill(at(29.25, 7.25)), 'a');
    assert.equal(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(29.25, 6.25)) }).ok, false);
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(29.25, 5.25)) }));
    assert.equal(levelAtPt(out.state, out.state.units.a.pos), 2);
    near(out.state.units.a.turn.move, s.units.a.turn.move - (4 * CELL + 2 * CLIMB_UP));
  });
});

describe('fighting from high ground', () => {
  it('+2 to hit from a level up, −2 from below (as before)', () => {
    const s = onHill(at(21.25, 13.25), at(21.25, 12.75));
    assert.equal(attackPreview(s, s.units.a, s.units.rogue_0, 'melee').height, -2);
    assert.equal(attackPreview(s, s.units.rogue_0, s.units.a, 'melee').height, 2);
    assert.ok(attackPreview(s, s.units.a, s.units.rogue_0, 'melee').inRange, 'one level up is still in reach');
  });

  it('a blade can\'t reach two levels up: the rogue on the tower is out of reach from its foot', () => {
    const s = turnOf(onHill(at(28.25, 6.25), at(28.25, 5.75)), 'a');
    assert.equal(attackPreview(s, s.units.a, s.units.rogue_0, 'melee').inRange, false);
    assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }).reason, 'outOfRange');
    assert.equal(applyAction(s, { type: 'shove', unit: 'a', target: 'rogue_0', mode: 'push' }).reason, 'outOfRange');
    // A kunai still flies up to it.
    assert.ok(attackPreview(s, s.units.a, s.units.rogue_0, 'ranged').inRange);
  });

  it('a kunai thrown from the tower carries 3 m further (1.5 m a level)', () => {
    // 10.5 m apart: past the kunai's 9 m from the ground, within 12 m from the platform.
    const s = onHill(at(29.75, 4.25), at(19.25, 4.25));
    assert.equal(levelAtPt(s, s.units.a.pos), 2);
    const down = attackPreview(s, s.units.a, s.units.rogue_0, 'ranged');
    assert.ok(!down.reasons.includes('longRange'), String(down.reasons));
    const up = attackPreview(s, s.units.rogue_0, s.units.a, 'ranged');
    assert.ok(up.reasons.includes('longRange'), String(up.reasons));
    assert.equal(KUNAI.reach, 9);
  });

  it('a jutsu sent at a target or a point reaches 1.5 m further a level above it, like a kunai; a blow or a cone doesn\'t', () => {
    const s = onHill(at(29.75, 4.25), at(19.25, 4.25));
    const tower = s.units.a.pos;
    const ground = s.units.rogue_0.pos;
    // 10.5 m apart, the tower 2 levels up: 3 m more for what flies there.
    assert.equal(jutsuRange(s, JUTSU.fire_three_embers, tower, ground), 12);
    assert.equal(jutsuRange(s, JUTSU.fireball_goukakyu, tower, ground), 12);
    assert.equal(jutsuRange(s, JUTSU.fire_three_embers, ground, tower), 9, 'not from below');
    for (const id of ['dragon_fire_bomb', 'great_fire_annihilation', 'mystical_palm', 'taijutsu_rush', 'chidori_lightning_blade']) {
      assert.equal(reachesFromAbove(JUTSU[id]), false, id);
      assert.equal(jutsuRange(s, JUTSU[id], tower, ground), JUTSU[id].range, id);
    }
    // The engine: the embers reach the rogue from the tower, and not the other way.
    const up = turnOf(s, 'a');
    up.units.a.jutsus = ['fire_three_embers'];
    up.units.a.chakra = 30;
    ok(applyAction(up, { type: 'jutsu', unit: 'a', jutsu: 'fire_three_embers', at: { ...ground }, target: 'rogue_0' }));
    const down = turnOf(s, 'rogue_0');
    down.units.rogue_0.jutsus = ['fire_three_embers'];
    down.units.rogue_0.chakra = 30;
    assert.equal(applyAction(down, { type: 'jutsu', unit: 'rogue_0', jutsu: 'fire_three_embers', at: { ...tower }, target: 'a' }).reason, 'outOfRange');
    // A fireball aimed at a point 10.5 m off, an explosive tag too (9 m from the ground).
    const ball = turnOf(s, 'a');
    ball.units.a.jutsus = ['fireball_goukakyu'];
    ball.units.a.chakra = 30;
    ok(applyAction(ball, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { ...ground } }));
    ok(applyAction(turnOf(s, 'a'), { type: 'item', unit: 'a', item: 'tag', at: { ...ground } }));
    const below = turnOf(onHill(at(19.25, 4.25), at(29.75, 4.25)), 'a');
    assert.equal(applyAction(below, { type: 'item', unit: 'a', item: 'tag', at: { ...below.units.rogue_0.pos } }).reason, 'outOfRange');
  });

  it('from the tower low cover is looked down on: the crate gives none, the stack of crates half', () => {
    const s = onHill(at(2.25, 14.75));
    const tower = at(28.25, 4.25);
    const ground = at(28.25, 8.25);
    const behindCrate = at(28.25, 13.75);
    assert.equal(levelAtPt(s, tower), 2);
    assert.equal(coverBetween(s, ground, behindCrate), 2);
    assert.equal(coverBetween(s, tower, behindCrate), 0);
    const behindStack = at(29.75, 13.75);
    assert.equal(coverBetween(s, at(29.75, 8.25), behindStack), 5);
    assert.equal(coverBetween(s, at(29.75, 4.25), behindStack), 2);
    assert.equal(lineOfSight(s, at(29.75, 8.25), behindStack), false);
  });
});

describe('sight over the terraces (the owner\'s cliff faces, "como en xcom 2")', () => {
  it('the ground hides what is behind it, above the line between two ninjas half a level (0.75 m) over their feet', () => {
    const s = onHill(at(2.25, 14.75));
    // Two ninjas on the field don't see each other through the tower's block.
    assert.ok(terrainBlocks(s, at(27.25, 4.75), at(31.25, 4.75)));
    assert.equal(lineOfSight(s, at(27.25, 4.75), at(31.25, 4.75)), false);
    // At the foot of the upper terrace's 3 m wall, the ninja on top behind the edge is out of sight.
    assert.equal(lineOfSight(s, at(18.75, 2.25), at(12.25, 2.25)), false);
    // The one on the tower sees down over the field, but not a ninja right behind the rock ledge
    // (1.5 m high, as high as a man) on the far side of it.
    assert.equal(lineOfSight(s, at(29.75, 4.25), at(24.25, 14.25)), true);
    assert.equal(lineOfSight(s, at(29.75, 4.25), at(20.25, 14.25)), false);
  });

  it('right against the terrace\'s cliff face one sees only the ninjas at its edge; further back, those far back on it', () => {
    const s = onHill(at(2.25, 14.75));
    const wall = at(6.25, 8.75); // 0.25 m from the cliff face (z 8.5), on the field
    const edge = at(6.25, 8.25); // on the terrace, at its edge
    const back = at(6.25, 3.25); // on the terrace, 5 m back from its edge
    assert.deepEqual([levelAtPt(s, wall), levelAtPt(s, edge), levelAtPt(s, back)], [0, 1, 1]);
    assert.equal(lineOfSight(s, wall, edge), true);
    assert.equal(lineOfSight(s, wall, back), false);
    // Both ways: the one far back doesn't see down to the foot of the wall either.
    assert.equal(lineOfSight(s, back, wall), false);
    // Six metres back from the wall, the one far back on the terrace is in sight.
    assert.equal(lineOfSight(s, at(6.25, 15.25), back), true);
    assert.equal(lineOfSight(s, back, at(6.25, 15.25)), true);
    // The same at the watch tower: at the ladder's foot the lookout on the platform is hidden, from 5 m off it is seen.
    assert.equal(lineOfSight(s, at(29.25, 7.25), at(29.25, 4.75)), false);
    assert.equal(lineOfSight(s, at(29.25, 12.25), at(29.25, 4.25)), true);
  });

  it('a kunai needs that sight: from the wall\'s foot the ninja far back can\'t be hit, from further back it can', () => {
    const near = turnOf(onHill(at(6.25, 8.75), at(6.25, 3.25)), 'a');
    assert.equal(applyAction(near, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }).reason, 'noSight');
    const far = turnOf(onHill(at(6.25, 15.25), at(6.25, 3.25)), 'a');
    ok(applyAction(far, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }));
  });
});

/** The first unit pushed in these events, and the fall damage it took. */
const pushedIn = (ev: BattleEvent[], id: string) => ev.find((e): e is Extract<BattleEvent, { t: 'pushed' }> => e.t === 'pushed' && e.unit === id);

describe('falling (the owner, 2026-10-23: only when it isn\'t on purpose)', () => {
  it('1d6 a level fallen, 3 levels at most (3d6)', () => {
    assert.deepEqual([1, 2, 3, 4].map(fallDice), ['1d6', '2d6', '3d6', '3d6']);
  });

  it('shoved off the tower: it falls two levels, takes 2d6 and lies prone', () => {
    // Both on the platform; the push goes east, off its side (x 30.5) onto the field.
    const s = turnOf(onHill(at(28.75, 4.75), at(30.25, 4.75)), 'a');
    s.units.a.stats.str = 30;
    let out: ReturnType<typeof applyAction> | undefined;
    for (let seed = 1; seed < 120 && !out; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const o = ok(applyAction(t, { type: 'shove', unit: 'a', target: 'rogue_0', mode: 'push' }));
      if (pushedIn(o.events, 'rogue_0')) out = o;
    }
    assert.ok(out, 'no seed pushes it');
    const r = out.state.units.rogue_0;
    assert.equal(pushedIn(out.events, 'rogue_0')!.fall, 2);
    assert.equal(levelAtPt(out.state, r.pos), 0);
    assert.equal(r.cond.prone, true);
    const lost = s.units.rogue_0.hp - r.hp;
    assert.ok(lost >= 2 && lost <= 12, `2d6: ${lost}`);
  });

  it('going down on purpose never hurts: stepping off a ledge, the ninja jump down a 3 m wall', () => {
    const s = turnOf(onHill(at(6.25, 8.25)), 'a');
    const hp = s.units.a.hp;
    const off = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(6.25, 9.75)) }));
    assert.equal(levelAtPt(off.state, off.state.units.a.pos), 0);
    assert.equal(off.state.units.a.hp, hp);
    assert.ok(!off.state.units.a.cond.prone);
    // From the upper terrace (level 2) straight down its right side to the field.
    const top = turnOf(onHill(at(17.75, 2.25)), 'a');
    assert.equal(levelAtPt(top, top.units.a.pos), 2);
    const j = ok(applyAction(top, { type: 'jump', unit: 'a' }));
    const down = ok(applyAction(j.state, { type: 'move', unit: 'a', to: cellOf(at(19.25, 2.25)) }));
    assert.equal(levelAtPt(down.state, down.state.units.a.pos), 0);
    assert.equal(down.state.units.a.hp, top.units.a.hp);
    assert.ok(!down.state.units.a.cond.prone);
    assert.ok(![...off.events, ...down.events].some((e) => e.t === 'damage'));
  });
});

describe('the AI and height (the owner: far-fighters keep it, close fighters come down)', () => {
  /** Aki as a thrower (kunai, no blade worth closing in for) or a brawler (a strong arm, no throw). */
  const style = (s: BattleState, id: string, afar: boolean) => {
    const u = s.units[id];
    u.jutsus = [];
    u.stats = afar ? { ...u.stats, str: 6, dex: 20 } : { ...u.stats, str: 20, dex: 6 };
    return u;
  };

  it('who fights from afar: its best hit from a distance beats its best blow', () => {
    const s = onHill(at(2.25, 14.75));
    assert.equal(fightsFromAfar(style(s, 'a', true)), true);
    assert.equal(fightsFromAfar(style(s, 'a', false)), false);
    // A brawler with a fireball and the chakra for it fights from afar; out of chakra, up close.
    const u = style(s, 'a', false);
    u.jutsus = ['fireball_goukakyu'];
    u.chakra = 30;
    assert.equal(fightsFromAfar(u), true);
    u.chakra = 0;
    assert.equal(fightsFromAfar(u), false);
  });

  it('where it likes to stand: a thrower wants the tower over the ground; a brawler likes height only within reach', () => {
    const s = onHill(at(2.25, 14.75), at(29.25, 11.25));
    const foe = s.units.rogue_0;
    const tower = at(29.25, 4.75);
    const ground = at(29.25, 7.75);
    const thrower = style(s, 'a', true);
    assert.ok(standScore(s, thrower, foe, tower) <= standScore(s, thrower, foe, ground) - 3, 'two levels up: 3 better');
    assert.ok(standScore(s, thrower, foe, at(29.25, 8.75)) > standScore(s, thrower, foe, ground), 'and further off');
    const brawler = style(structuredClone(s), 'a', false);
    assert.equal(standScore(s, brawler, foe, tower), 0, 'out of its reach, the tower is worth nothing');
  });

  it('on the tower, a thrower stays up and throws; a brawler climbs down to fight', () => {
    const base = onHill(at(29.25, 4.75), at(29.25, 12.75));
    const t = turnOf(base, 'a');
    style(t, 'a', true);
    t.units.a.controller = 'ai';
    assert.equal(ninjaOptions(t, t.units.a)[0].intent.kind, 'ranged');
    const throwAct = aiAction(t);
    assert.deepEqual(throwAct, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true });
    const b = turnOf(base, 'a');
    style(b, 'a', false);
    b.units.a.controller = 'ai';
    assert.equal(ninjaOptions(b, b.units.a)[0].intent.kind, 'melee');
    const step = aiAction(b);
    assert.equal(step?.type, 'move');
    const moved = ok(applyAction(b, step!));
    assert.ok(levelAtPt(moved.state, moved.state.units.a.pos) < 2, 'it came down');
  });
});

describe('the height test battle', () => {
  it('is a practice battle on its own map: the rogues on the summit, the ledge and the tower', () => {
    const e = ENCOUNTERS.height_test;
    assert.equal(e.mapId, 'height_test');
    const s = createBattle(encounterSetup('height_test', [{ character: hero({ id: 'a' }) }], { seed: 1, difficulty: 'normal', supplies: { ...SUPPLIES } })).state;
    const levels = Object.values(s.units).filter((u) => u.team === 'enemy').map((u) => levelAtPt(s, u.pos));
    assert.deepEqual(levels, [2, 1, 2]);
    for (const u of Object.values(s.units)) if (u.team === 'party') assert.equal(levelAtPt(s, u.pos), 0);
  });

  it('the AI fights it to the end, climbing and coming down', () => {
    const party = [hero({ id: 'a', name: 'Aki' }), HANA, KENJI, hero({ id: 'n', name: 'Yua', clan: 'Northstar' })].map((c) => ({
      character: { ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } },
      controller: 'ai' as const,
    }));
    let s = createBattle(encounterSetup('height_test', party, { seed: 5, difficulty: 'normal', supplies: { ...SUPPLIES } })).state;
    // The levels each unit stood on.
    const seen = new Map<string, Set<number>>();
    for (let step = 0; s.phase !== 'ended'; step++) {
      assert.ok(step < 4000, 'no end');
      const a = aiAction(s);
      assert.ok(a, `${current(s)?.id}: the AI has nothing to do`);
      const out = applyAction(s, a);
      assert.ok(out.ok, `${current(s)?.id} sent ${JSON.stringify(a)}, refused: ${out.reason}`);
      s = out.state;
      for (const u of Object.values(s.units)) {
        if (u.down) continue;
        // Nobody ever ends a step on a rung.
        assert.ok(!gridFor(s.mapId).climb[idx(gridFor(s.mapId), cellOf(u.pos))], `${u.id} stands on the ladder`);
        if (!seen.has(u.id)) seen.set(u.id, new Set());
        seen.get(u.id)!.add(Math.round(levelAtPt(s, u.pos)));
      }
    }
    // Someone went from the ground to two levels up or the other way (the tower's rogue comes down).
    assert.ok([...seen.values()].some((l) => l.has(0) && l.has(2)), JSON.stringify([...seen].map(([id, l]) => [id, [...l]])));
  });
});

describe('the owner\'s second round (2026-10-23): only cones get no reach from above', () => {
  const tower = at(29.75, 4.25);
  const ground = at(19.25, 4.25);

  it('everything aimed somewhere reaches 1.5 m further a level above it: lines, walls, heals, warps, genjutsu, Command, Submission', () => {
    const s = onHill(tower, ground);
    const ids = ['dragon_fire_stream', 'earth_spear_doryuudan', 'lightning_thunder_beam', 'wind_blade_daitoppa', 'water_healing_dew', 'genjutsu_mirage', 'temple_of_nirvana', 'northstar_command', 'northstar_submission', 'earth_wall_doryuheki', 'water_shield_suijinheki', 'koton_block', 'koton_wall', 'body_flicker', 'wind_gale_curtain', 'ryusei_warp', 'ryusei_swap', 'adamantine_sealing_chains'];
    for (const id of ids) {
      assert.equal(reachesFromAbove(JUTSU[id]), true, id);
      assert.equal(jutsuRange(s, JUTSU[id], tower, ground), JUTSU[id].range + 3, id);
      assert.equal(jutsuRange(s, JUTSU[id], ground, tower), JUTSU[id].range, `${id}, not from below`);
    }
  });

  it('a cone keeps its range and its size; a blow, a touch and what works around the caster get nothing', () => {
    const s = onHill(tower, ground);
    for (const id of ['dragon_fire_bomb', 'water_devouring_tide', 'water_tide_s', 'earth_rubble_gust', 'lightning_spark_fan', 'great_fire_annihilation', 'hydra_roar']) {
      assert.equal(JUTSU[id].shape, 'cone', id);
      assert.equal(reachesFromAbove(JUTSU[id]), false, id);
      assert.deepEqual(areaIn(s, JUTSU[id], tower, ground), areaOf(JUTSU[id], tower, ground), id);
    }
    for (const id of ['mystical_palm', 'taijutsu_rush', 'crescent_moon_dance', 'chidori_lightning_blade', 'leaf_hurricane_senpuu', 'shadow_clone', 'substitution_kawarimi']) {
      assert.equal(reachesFromAbove(JUTSU[id]), false, id);
      assert.equal(jutsuRange(s, JUTSU[id], tower, ground), JUTSU[id].range, id);
    }
  });

  it('a line runs 1.5 m longer a level below the caster where it is aimed: the thunder beam reaches a rogue 10.5 m off from the tower', () => {
    const s = turnOf(onHill(tower, ground), 'a');
    const beam = JUTSU.lightning_thunder_beam;
    const area = areaIn(s, beam, tower, ground);
    assert.ok(area?.kind === 'line');
    assert.equal(area.length, beam.length! + 3);
    s.units.a.jutsus = ['lightning_thunder_beam'];
    s.units.a.chakra = 30;
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'lightning_thunder_beam', at: { ...ground } }));
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'), 'the rogue is in the beam');
    // From the ground, the same beam stops 1.5 m short of the tower.
    const below = turnOf(onHill(ground, tower), 'a');
    below.units.a.jutsus = ['lightning_thunder_beam'];
    below.units.a.chakra = 30;
    const miss = ok(applyAction(below, { type: 'jutsu', unit: 'a', jutsu: 'lightning_thunder_beam', at: { ...tower } }));
    assert.ok(!miss.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'));
  });

  it('a heal at range from the tower reaches a friend 7.5 m off below (6 m from the ground); a wall goes up 7 m off', () => {
    const party = (a: Pt, b: Pt) => [
      { character: hero({ id: 'a', name: 'Aki', clan: 'Northstar' }), pos: a },
      { character: hero({ id: 'b', name: 'Bo' }), pos: b },
    ];
    const mk = (a: Pt, b: Pt) => {
      const s = turnOf(createBattle(setup({ mapId: 'height_test', party: party(a, b), enemies: [{ kind: 'rogue', pos: at(2.25, 14.75) }] })).state, 'a');
      s.units.a.jutsus = ['water_healing_dew', 'earth_wall_doryuheki', 'northstar_command'];
      s.units.a.chakra = 40;
      s.units.b.hp = 1;
      return s;
    };
    const up = mk(tower, at(22.25, 4.25));
    const healed = ok(applyAction(up, { type: 'jutsu', unit: 'a', jutsu: 'water_healing_dew', at: { ...up.units.b.pos }, target: 'b' }));
    assert.ok(healed.events.some((e) => e.t === 'heal' && e.unit === 'b'));
    const down = mk(at(22.25, 4.25), tower);
    assert.equal(applyAction(down, { type: 'jutsu', unit: 'a', jutsu: 'water_healing_dew', at: { ...down.units.b.pos }, target: 'b' }).reason, 'outOfRange');
    // An earth wall raised 7 m off on the field below the tower (6 m from the ground).
    ok(applyAction(mk(tower, at(2.25, 12.25)), { type: 'jutsu', unit: 'a', jutsu: 'earth_wall_doryuheki', at: at(22.75, 4.25) }));
    assert.equal(applyAction(mk(at(29.75, 9.25), at(2.25, 12.25)), { type: 'jutsu', unit: 'a', jutsu: 'earth_wall_doryuheki', at: at(22.75, 9.25) }).reason, 'outOfRange');
  });

  it('Command takes a mind 10.5 m off from the tower, not from the ground', () => {
    // A rogue of no clan that shields its mind (the Mirai's does).
    const mind = (st: BattleState) => {
      const r = st.units.rogue_0;
      if (r.character) r.character = { ...r.character, clan: 'Koton' };
      return st;
    };
    const s = mind(turnOf(onHill(tower, ground), 'a'));
    s.units.a.jutsus = ['northstar_command'];
    s.units.a.chakra = 30;
    const out = applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'northstar_command', at: { ...ground }, target: 'rogue_0' });
    ok(out);
    const below = mind(turnOf(onHill(ground, tower), 'a'));
    below.units.a.jutsus = ['northstar_command'];
    below.units.a.chakra = 30;
    assert.equal(applyAction(below, { type: 'jutsu', unit: 'a', jutsu: 'northstar_command', at: { ...tower }, target: 'rogue_0' }).reason, 'outOfRange');
  });

  it('the AI counts it: a beam-caster on the tower aims at a foe 10.5 m below', () => {
    const s = turnOf(onHill(ground, tower), 'rogue_0');
    const r = s.units.rogue_0;
    r.jutsus = ['lightning_thunder_beam'];
    r.chakra = 30;
    assert.ok(ninjaOptions(s, r).some((o) => o.intent.kind === 'jutsu' && o.intent.what === 'lightning_thunder_beam' && o.intent.target === 'a'));
  });
});

describe('looking down from high ground (the owner, 2026-10-23: "es similar solo inverso")', () => {
  it('at the terrace\'s edge one sees the ninjas at the foot of its cliff face; 5 m back, not the one hugging it, only those further out', () => {
    const s = onHill(at(2.25, 14.75));
    const edge = at(6.25, 8.25); // on the terrace (level 1), at its edge
    const back = at(6.25, 3.25); // on the terrace, 5 m back from its edge
    const foot = at(6.25, 8.75); // on the field, against the cliff face
    const out = at(6.25, 15.25); // on the field, 6.75 m out from it
    assert.equal(lineOfSight(s, edge, foot), true);
    assert.equal(lineOfSight(s, edge, at(6.25, 10.25)), true);
    assert.equal(lineOfSight(s, back, foot), false);
    assert.equal(lineOfSight(s, back, at(6.25, 12.25)), false);
    assert.equal(lineOfSight(s, back, out), true);
  });

  it('the same from the tower (two levels up): at its side one sees the foot of it, from its other side only further out', () => {
    const s = onHill(at(2.25, 14.75));
    const side = at(30.25, 4.75); // on the platform, at its east edge (x 30.5)
    const far = at(28.25, 4.75); // on the platform, 2 m back from that edge
    const foot = at(30.75, 4.75);
    assert.equal(lineOfSight(s, side, foot), true);
    assert.equal(lineOfSight(s, far, foot), false);
    assert.equal(lineOfSight(s, far, at(40.25, 4.75)), true);
  });

  it('a kunai follows it: from the edge it hits the ninja at the foot; from far back, no sight', () => {
    ok(applyAction(turnOf(onHill(at(6.25, 8.25), at(6.25, 8.75)), 'a'), { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }));
    assert.equal(applyAction(turnOf(onHill(at(6.25, 3.25), at(6.25, 8.75)), 'a'), { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }).reason, 'noSight');
  });
});

describe('tall things hide by their height (the owner, 2026-10-23: "rocas altas y objetos altos para tapar la vista")', () => {
  it('on flat ground a boulder, a tent, a stack of crates and a tree hide who stands behind them; a low crate or rock doesn\'t', () => {
    const s = createBattle(setup()).state;
    // River Forest's boulder at (41, 15.25), 1.3 m high; a little in front of it, the view is clear.
    assert.equal(lineOfSight(s, at(37.25, 15.25), at(44.25, 15.25)), false);
    assert.equal(lineOfSight(s, at(37.25, 17.25), at(44.25, 17.25)), true);
    const h = onHill(at(2.25, 14.75));
    // The stack of crates (1.6 m) and the barrel (0.9 m) in front of the tower, from the field.
    assert.equal(lineOfSight(h, at(29.75, 8.25), at(29.75, 13.75)), false);
    assert.equal(lineOfSight(h, at(32.75, 8.25), at(32.75, 12.75)), true);
  });

  it('from the tower a stack of crates hides one close behind it, not one further off; a tree hides from up there too', () => {
    const s = onHill(at(2.25, 14.75));
    const tower = at(29.75, 4.25);
    assert.equal(levelAtPt(s, tower), 2);
    assert.equal(lineOfSight(s, tower, at(29.75, 13.75)), false, 'close behind the stack');
    assert.equal(lineOfSight(s, tower, at(29.75, 15.25)), true, 'further off');
    // The oak (7.5 m) at (38.6, 0.7): from the platform, the one behind it is hidden, one beside it isn't.
    assert.equal(lineOfSight(s, at(30.25, 3.75), at(40.25, 0.25)), false);
    assert.equal(lineOfSight(s, at(30.25, 3.75), at(40.25, 3.25)), true);
  });

  it('what is not there doesn\'t hide: a burnt-down stack of crates', () => {
    const s = onHill(at(2.25, 14.75));
    const i = getMapProps(s).findIndex((p) => p.name === 'crate_stack');
    s.props[i] = { ...s.props[i], destroyed: true };
    assert.equal(lineOfSight(s, at(29.75, 8.25), at(29.75, 13.75)), true);
  });
});
