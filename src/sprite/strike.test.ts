// Tests for the weapon techniques 'throw' and 'pierce': npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { throwRelease } from './grip';
import { defaultAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { drawRig, frameCount, POSE_FPS, rigPoseFor, THROW_RELEASE_FRAME } from './rig';
import { SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const WEAPONS = ['held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_kunai', 'held_naginata'];

const look = (body: BodyType, held?: string, stowed = false): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  if (held) l.slots.held = { id: held, colors: [] };
  if (stowed) l.stowed = true;
  return l;
};

/** The box of the pixels drawn for the held item (part 'held'), or null when there are none. */
function heldBox(l: SpriteAppearance, pose: 'throw' | 'pierce', frame: number) {
  const s = renderSprite(l, pose, frame);
  const held = partIndex('held');
  let box: { x0: number; y0: number; x1: number; y1: number } | null = null;
  for (let i = 0; i < GRID * GRID; i++) {
    if (s.part[i] !== held || !s.rgba[i * 4 + 3]) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
  }
  return box;
}

describe('throw and pierce poses', () => {
  it('are previewed in the creator and play like the attacks', () => {
    for (const pose of ['throw', 'pierce'] as const) {
      assert.ok(SPRITE_POSES.includes(pose), pose);
      assert.ok(POSE_FPS[pose] >= 6, pose);
    }
    assert.equal(frameCount(rigPoseFor('throw')), 4);
    assert.equal(frameCount(rigPoseFor('pierce')), 5);
  });

  it('lets the weapon go at the release frame, the owner reference pose', () => {
    assert.equal(THROW_RELEASE_FRAME, 2);
    for (let f = 0; f < frameCount('throw'); f++) assert.equal(drawRig('male', 'throw', f).released, f >= THROW_RELEASE_FRAME, `frame ${f}`);
    for (const body of BODIES) {
      for (const held of WEAPONS) {
        assert.ok(heldBox(look(body, held), 'throw', THROW_RELEASE_FRAME - 1), `${body} ${held}: in the hand before the release`);
        assert.equal(heldBox(look(body, held), 'throw', THROW_RELEASE_FRAME), null, `${body} ${held}: gone at the release`);
      }
    }
  });

  it('opens the hand at the release', () => {
    const r = drawRig('male', 'throw', THROW_RELEASE_FRAME);
    assert.equal(r.shapeN, 'open');
  });

  it('keeps a stowed weapon where it is, and gives bare hands a kunai to throw', () => {
    assert.ok(heldBox(look('male', 'held_crystal', true), 'throw', THROW_RELEASE_FRAME), 'stowed on the back');
    assert.ok(heldBox(look('male'), 'throw', 1), 'a kunai in the bare hand');
    assert.equal(heldBox(look('male'), 'throw', THROW_RELEASE_FRAME), null, 'thrown');
  });

  it('says where the thrown weapon leaves the hand', () => {
    for (const body of BODIES) {
      const t = throwRelease(body, 'held_katana');
      assert.equal(t.frame, THROW_RELEASE_FRAME);
      assert.equal(t.thrown, 'held_katana');
      const s = renderSprite(look(body, 'held_katana'), 'throw', t.frame);
      const i = Math.floor(t.hand.y) * GRID + Math.floor(t.hand.x);
      assert.ok(s.rgba[i * 4 + 3], `${body}: the release point is on the drawn hand`);
      // the hand is up and behind the head, flung back
      assert.ok(t.hand.y < s.rig.head.y * 2 && t.hand.x < s.rig.head.x * 2, body);
      assert.ok(t.handAngle < -90 && t.handAngle > -180, `${body}: the hand points up and back`);
    }
    assert.equal(throwRelease('male').thrown, 'held_kunai');
  });

  it('thrusts every weapon level at the target on the lunge', () => {
    for (const held of WEAPONS) {
      const b = heldBox(look('male', held), 'pierce', 2)!;
      assert.ok(b, held);
      assert.ok(b.x1 - b.x0 > 2 * (b.y1 - b.y0), `${held}: level`);
      assert.ok(b.x1 > drawRig('male', 'pierce', 2).handN.x * 2, `${held}: pointing forward`);
    }
  });
});
