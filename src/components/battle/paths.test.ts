// Tests for the varied projectile paths (paths.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bendsOf, keepAbove, reachOf, rng, seedOf, wanderHeading, wanderPoint } from './paths';

const near = (a: { x: number; y: number }, b: { x: number; y: number }, eps = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) < eps;

describe('varied projectile paths', () => {
  it('are the same for the same seed and differ between seeds', () => {
    assert.equal(seedOf('raider|water_dragon|1'), seedOf('raider|water_dragon|1'));
    assert.notEqual(seedOf('raider|water_dragon|1'), seedOf('raider|water_dragon|2'));
    const a = bendsOf(7, 3, 20, 60);
    assert.deepEqual(a, bendsOf(7, 3, 20, 60));
    assert.notDeepEqual(a, bendsOf(8, 3, 20, 60));
    const r = rng(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      assert.ok(v >= 0 && v < 1);
    }
  });

  it('always start and end on their points and pass through every point between', () => {
    const pts = [{ x: 0, y: 0 }, { x: 200, y: 40 }, { x: 420, y: -10 }];
    for (let seed = 1; seed < 30; seed++) {
      const b = bendsOf(seed, 2, 20, 70);
      assert.ok(near(wanderPoint(pts, b, 0), pts[0]));
      assert.ok(near(wanderPoint(pts, b, 1), pts[2]));
      assert.ok(near(wanderPoint(pts, b, reachOf(pts, 1)), pts[1], 1e-3), `seed ${seed}`);
    }
  });

  it('bow away from the straight line by the bend, not a straight shot', () => {
    const pts = [{ x: 0, y: 100 }, { x: 400, y: 100 }];
    for (let seed = 1; seed < 30; seed++) {
      const b = bendsOf(seed, 1, 30, 60, 0);
      const mid = wanderPoint(pts, b, 0.5);
      assert.ok(Math.abs(mid.y - 100) >= 30 - 1e-9 && Math.abs(mid.y - 100) <= 60 + 1e-9, `seed ${seed}: ${mid.y}`);
    }
    // Different casts swing to both sides.
    const sides = new Set(Array.from({ length: 20 }, (_, s) => Math.sign(bendsOf(s, 1, 30, 60)[0].a)));
    assert.equal(sides.size, 2);
  });

  it('bow by the same pixels when paced by the legs\' length on the ground', () => {
    const pts = [{ x: 0, y: 100 }, { x: 400, y: 100 }];
    const b = [{ a: 30, b: 0 }];
    // 400 px that are 7 m on the ground: the swing is still 30 px.
    assert.ok(Math.abs(wanderPoint(pts, b, 0.5, [7]).y - 100 - 30) < 1e-9);
    assert.ok(near(wanderPoint(pts, b, 1, [7]), pts[1]));
  });

  it('heads where it flies', () => {
    const pts = [{ x: 0, y: 0 }, { x: 300, y: 0 }];
    const h = wanderHeading(pts, [{ a: 0, b: 0 }], 0.5);
    assert.ok(h.x > 0 && Math.abs(h.y) < 1e-9);
  });
});

describe('varied paths kept above the ground', () => {
  it('never dip below the ground line by more than the margin, and keep a bend that clears', () => {
    // A level flight 60 px over the ground (floor y = 160 under points at y = 100).
    const pts = [{ x: 0, y: 100 }, { x: 400, y: 100 }];
    const floor = [160, 160];
    for (let seed = 1; seed < 60; seed++) {
      const kept = keepAbove(pts, floor, bendsOf(seed, 1, 34, 80, 0.5), 28);
      for (let k = 0; k <= 50; k++) assert.ok(wanderPoint(pts, kept, k / 50).y <= 160 - 28 + 1e-6, `seed ${seed}`);
      assert.ok(Math.abs(kept[0].a) > 0, `seed ${seed}: still bends`);
    }
    const up = [{ a: -50, b: 0 }];
    assert.deepEqual(keepAbove(pts, floor, up, 28), up);
  });
});
