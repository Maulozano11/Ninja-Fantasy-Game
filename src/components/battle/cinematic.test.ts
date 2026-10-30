// The cinematic player's sums: the frame at a time, and where a unit stands under the camera (the
// same numbers tools/cinematics/cine/core.py writes, so the real ninja sits where the preview put it).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { frameAt, toScreen, unitPlacement } from './cinematic';
import type { CinematicManifest } from './cinematic';
import shield from '../../assets/cinematics/fire-avatar-shield.json';
import spear from '../../assets/cinematics/fire-avatar-spear.json';

const still = { zoom: 1, x0: 0, y0: 0, cw: 960, ch: 540, sx: 0, sy: 0 };

describe('cinematic player', () => {
  it('shows frame floor(time x fps), never past the last', () => {
    const m = { fps: 24, frames: 110 };
    assert.equal(frameAt(m, 0), 0);
    assert.equal(frameAt(m, 1), 24);
    assert.equal(frameAt(m, 100), 109);
    assert.equal(frameAt(m, -1), 0);
  });

  it('leaves a point where it is with no push-in and no shake', () => {
    assert.deepEqual(toScreen(still, 480, 526, 960), { x: 480, y: 526, k: 1 });
  });

  it('moves a point with the shake, and with the push-in crops and enlarges about the crop', () => {
    assert.deepEqual(toScreen({ ...still, sx: 2, sy: -1 }, 480, 526, 960), { x: 482, y: 525, k: 1 });
    const p = toScreen({ zoom: 1.05, x0: 22, y0: 6, cw: 914, ch: 514, sx: 0, sy: 0 }, 480, 526, 960);
    assert.ok(Math.abs(p.k - 960 / 914) < 1e-9);
    assert.ok(Math.abs(p.x - (480 - 22) * p.k) < 1e-9 && Math.abs(p.y - (526 - 6) * p.k) < 1e-9);
  });

  for (const m of [shield, spear] as unknown as CinematicManifest[]) {
    it(`${m.name}: a camera for every frame, the caster at the ninja's feet, scaled to the canvas`, () => {
      assert.equal(m.camera.length, m.frames);
      const caster = m.units.find((u) => u.role === 'caster')!;
      assert.deepEqual([caster.x, caster.y, caster.scale], [480, 526, 0.8]);
      const first = unitPlacement(m, 0, caster, 1920);
      assert.ok(Math.abs(first.x - 960 - m.camera[0].sx * 2) < 1e-6);
      const last = unitPlacement(m, m.frames - 1, caster, 1920);
      assert.ok(last.scale > first.scale, 'the push-in makes the ninja bigger at the end');
    });
  }
});
