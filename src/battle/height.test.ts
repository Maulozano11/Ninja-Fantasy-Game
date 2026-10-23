// Height and diagonals (the owner, 2026-10-22): "si me gustaria darle alguna clase de altura ...
// terreno elevado ... trepando una colina bajando un colina ... alguien subio a una torre", and
// "vamos a probar 5-10-5". These tests pin the 5-10-5 diagonals, climbing (ramps, ledges, walls,
// the ladder), the reach and cover rules of height, and the height test battle.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { CELL, cellOf, coverBetween, gridFor, idx, levelAtPt, lineOfSight, terrainBlocks } from './map';
import { canStop, climbCost, CLIMB_DOWN, CLIMB_UP, DIAGONAL_RULE, diagonalCost, pathCost, pathTo, reachable, walkCost } from './nav';
import { attackPreview } from './combat';
import { KUNAI } from './units';
import { aiAction } from './ai';
import { current } from './turns';
import { ENCOUNTERS, encounterSetup } from './encounters';
import { LADDER, TOWER } from './maps/heightTest';
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

describe('5-10-5 diagonals (being tried, 2026-10-22)', () => {
  it('is the rule in use: diagonal steps alternate one cell (0.5 m) and two (1 m)', () => {
    assert.equal(DIAGONAL_RULE, '5-10-5');
    assert.equal(diagonalCost(false), CELL);
    assert.equal(diagonalCost(true), 2 * CELL);
    assert.equal(diagonalCost(false, 'true'), CELL * Math.SQRT2);
    const s = turnOf(createBattle(setup()).state, 'a');
    const from = s.units.a.pos;
    // 1, 2, 3, 4, 6 diagonal cells up and right: 0.5, 1.5, 2, 3, 4.5 m.
    const want = [0, 0.5, 1.5, 2, 3, 4, 4.5];
    for (const n of [1, 2, 3, 4, 6]) near(costTo(s, 'a', at(from.x + n * CELL, from.z - n * CELL)), want[n]);
    // A 5 ft square of 5e is 1.5 m, 3 of our cells: two diagonal squares cost 5 + 10 ft = 4.5 m.
    near(costTo(s, 'a', at(from.x + 6 * CELL, from.z + 6 * CELL)), 4.5);
  });

  it('a straight step still costs one cell, and a knight\'s move mixes the two', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const from = s.units.a.pos;
    near(costTo(s, 'a', at(from.x + 3, from.z)), 3);
    // 4 across and 2 into the depth: 2 diagonals (0.5 + 1) and 2 straight (1).
    near(costTo(s, 'a', at(from.x + 4 * CELL, from.z - 2 * CELL)), 2.5);
  });

  it('the path the preview shows costs what the reach says, and the move takes exactly that', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const to = cellOf(at(15.25, 8.25));
    const r = reachable(s, s.units.a, 20);
    const path = pathTo(s, r, to)!;
    const cost = pathCost(s, s.units.a, path);
    near(cost, r.cost.get(idx(gridFor(s.mapId), to))!);
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to }));
    near(out.state.units.a.turn.move, s.units.a.turn.move - cost);
    // The same path at true length is cheaper: 6 diagonals of 0.71 m.
    near(walkCost(s, s.units.a, path, { diagonals: 'true' }).total, 6 * CELL * Math.SQRT2);
    near(cost, 4.5);
  });

  it('the count runs over the whole turn: splitting a diagonal move saves nothing', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    const m0 = s.units.a.turn.move;
    const step = (dx: number, dz: number) => {
      const u = s.units.a;
      s = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(u.pos.x + dx, u.pos.z + dz)) })).state;
    };
    step(CELL, -CELL);
    near(s.units.a.turn.move, m0 - 0.5);
    step(CELL, -CELL);
    near(s.units.a.turn.move, m0 - 1.5);
    // A straight step in between doesn't reset it.
    step(CELL, 0);
    step(CELL, -CELL);
    near(s.units.a.turn.move, m0 - 2.5);
    step(-CELL, -CELL);
    near(s.units.a.turn.move, m0 - 3.5);
    // A new turn starts the count again.
    s = turnOf(s, 'a');
    assert.equal(s.units.a.turn.diag, undefined);
    step(CELL, CELL);
    near(s.units.a.turn.move, s.units.a.speed - 0.5);
  });

  it('a dash carries the count on', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    s = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(12.75, 10.75)) })).state;
    s = ok(applyAction(s, { type: 'dash', unit: 'a' })).state;
    const m = s.units.a.turn.move;
    s = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf(at(13.25, 10.25)) })).state;
    near(s.units.a.turn.move, m - 1);
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

  it('from the tower low cover is looked down on: the crate gives none, the stack of crates half and no longer hides', () => {
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
    assert.equal(lineOfSight(s, at(29.75, 4.25), behindStack), true);
  });
});

describe('sight over the terraces (the owner\'s cliff faces)', () => {
  it('the ground hides what is behind it, above the line between two ninjas\' eyes (1.5 m over their feet)', () => {
    const s = onHill(at(2.25, 14.75));
    // Two ninjas on the field don't see each other through the tower's block.
    assert.ok(terrainBlocks(s, at(27.25, 4.75), at(31.25, 4.75)));
    assert.equal(lineOfSight(s, at(27.25, 4.75), at(31.25, 4.75)), false);
    // At the foot of the terrace's cliff face (1.5 m) one still sees the ninja on top, both ways.
    assert.equal(lineOfSight(s, at(6.25, 8.75), at(6.25, 3.25)), true);
    assert.equal(lineOfSight(s, at(6.25, 3.25), at(6.25, 8.75)), true);
    // At the foot of the upper terrace's 3 m wall, the ninja on top behind the edge is out of sight.
    assert.equal(lineOfSight(s, at(18.75, 2.25), at(12.25, 2.25)), false);
    // And the one on the tower sees down over the field.
    assert.equal(lineOfSight(s, at(29.75, 4.25), at(20.25, 14.25)), true);
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
