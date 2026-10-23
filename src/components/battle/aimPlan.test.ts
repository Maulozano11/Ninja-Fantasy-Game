// Tests for which way a jutsu's art points (aimPlan.ts; the owner's decision of 2026-10-22: the
// art follows its aim): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AIM_STEP, BEAST_TILT, aimBucket, aimTurn, bandStep, dragonPlace, screenDeg, wallSheet } from './aimPlan';

/** The battle map's projection (map.px): 57 px a metre across, 38 a metre of depth. */
const px = { perM: 57, perMDepth: 38 };
const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

describe('jutsu art follows its aim', () => {
  it('measures the angle on the screen, not on the ground', () => {
    close(screenDeg(px, 1, 0), 0);
    close(screenDeg(px, -1, 0), 0, 1e-9);
    close(screenDeg(px, 0, -1), -90);
    close(screenDeg(px, 0, 1), 90);
    // 45 degrees on the ground looks flatter on the screen: atan(38 / 57), about 33.7.
    close(screenDeg(px, 1, -1), -(Math.atan(38 / 57) * 180) / Math.PI);
    // Leftward, the angle of its mirror image (the art is mirrored to face left).
    close(screenDeg(px, -1, 1), screenDeg(px, 1, 1));
    close(screenDeg(px, 0, 0), 0);
  });

  it('turns in buckets, and never at all within half a bucket of straight across', () => {
    assert.equal(AIM_STEP, 15);
    assert.equal(aimBucket(7.4), 0);
    assert.equal(aimBucket(-7.4), 0);
    assert.ok(!Object.is(aimBucket(-3), -0), 'no -0');
    assert.equal(aimBucket(7.6), 15);
    assert.equal(aimBucket(-33.7), -30);
    assert.equal(aimBucket(-90), -90);
    assert.equal(aimBucket(-90, 15, 45), -45);
    assert.equal(aimBucket(80, 15, 15), 15);
  });

  it('draws an effect aimed straight across exactly as before: unturned, mirrored by its own rule', () => {
    for (const left of [false, true]) {
      const to = { x: left ? 2 : 18, z: 7 };
      assert.deepEqual(aimTurn(px, { x: 10, z: 7 }, to, left), { deg: 0, mirror: left });
    }
    // A target a little up or down the screen still counts as across (8 m away, 0.5 m deeper).
    assert.equal(aimTurn(px, { x: 10, z: 7 }, { x: 18, z: 6.5 }, false).deg, 0);
  });

  it('turns an effect aimed into the depth by its screen angle, the beasts only leaning', () => {
    const from = { x: 10, z: 10 };
    assert.deepEqual(aimTurn(px, from, { x: 16, z: 4 }, false), { deg: -30, mirror: false });
    assert.deepEqual(aimTurn(px, from, { x: 4, z: 16 }, true), { deg: 30, mirror: true });
    assert.equal(aimTurn(px, from, { x: 10, z: 2 }, false).deg, -90);
    // A hound running up the screen leans, it does not stand on its tail.
    assert.equal(aimTurn(px, from, { x: 10, z: 2 }, false, BEAST_TILT.lightning).deg, -15);
    for (const t of Object.values(BEAST_TILT)) assert.ok(t > 0 && t <= 45);
  });

  it('stands a wall in the sheet whose direction on the screen is closest', () => {
    const o = { x: 0, z: 0 };
    assert.deepEqual(wallSheet(px, o, { x: 4, z: 0 }), { name: 'wall', mirror: false });
    assert.deepEqual(wallSheet(px, o, { x: 0, z: 4 }), { name: 'wall_depth', mirror: false });
    // "/" (near-left to far-right) is the sheet as drawn, "\" its mirror image; either end first.
    assert.deepEqual(wallSheet(px, { x: 0, z: 3 }, { x: 3, z: 0 }), { name: 'wall_diag', mirror: false });
    assert.deepEqual(wallSheet(px, { x: 3, z: 0 }, { x: 0, z: 3 }), { name: 'wall_diag', mirror: false });
    assert.deepEqual(wallSheet(px, o, { x: 3, z: 3 }), { name: 'wall_diag', mirror: true });
    // The 3/4 sheet is 45 degrees on the ground, about 34 on the screen: the turns between are
    // halfway on the screen (about 17 and 62 degrees), about 24 and 70 on the ground.
    const at = (g: number) => wallSheet(px, o, { x: Math.cos((g * Math.PI) / 180), z: Math.sin((g * Math.PI) / 180) }).name;
    assert.equal(at(23), 'wall');
    assert.equal(at(25), 'wall_diag');
    assert.equal(at(69), 'wall_diag');
    assert.equal(at(71), 'wall_depth');
  });

  it('lays a side-view band along its aim with its columns upright, never folded into one', () => {
    assert.deepEqual(bandStep(px, 0), { sx: 1, sy: 0, mirror: false });
    const l = bandStep(px, 180);
    close(l.sx, 1);
    assert.equal(l.mirror, true);
    const d = bandStep(px, -45);
    close(d.sx, Math.SQRT1_2);
    close(d.sy, -(38 / 57) * Math.SQRT1_2);
    // Straight into the depth: it still runs up the screen, leaning toward the side it faces.
    const up = bandStep(px, -90);
    assert.equal(up.sx, 0.35);
    close(up.sy, -38 / 57);
  });

  it('puts the dragon and its wall behind the ninja along the aim, drawn behind the ninja', () => {
    const from = { x: 20, z: 10 };
    // Straight across (and with no shape at all): where they always stood.
    for (const f of [1, -1]) {
      for (const dir of [f > 0 ? 0 : 180, null]) {
        const p = dragonPlace(px, from, dir, f, 3.3, 0.7, 0.37);
        assert.deepEqual(p.wall, { x: from.x - f * 3.3, z: from.z - 0.37 });
        assert.deepEqual(p.mouth, { x: from.x - f * 0.7, z: from.z - 0.37 });
        assert.equal(p.depth, from.z - 0.37);
        assert.deepEqual(p.aim, { dx: f, dz: 0 });
      }
    }
    // Aimed up the screen and to the right: behind is down and to the left, still drawn behind.
    const p = dragonPlace(px, from, -45, 1, 3.3, 0.7, 0.37);
    close(p.wall.x, from.x - 3.3 * Math.SQRT1_2);
    close(p.wall.z, from.z + 3.3 * Math.SQRT1_2 - 0.37);
    assert.ok(p.depth <= from.z - 0.37);
    close(p.aim.dx, Math.SQRT1_2);
    close(p.aim.dz, -Math.SQRT1_2);
    // Aimed down the screen: behind is further back, deeper still.
    const q = dragonPlace(px, from, 60, 1, 3.3, 0.7, 0.37);
    assert.ok(q.wall.z < from.z - 0.37 && q.depth === q.wall.z);
  });
});
