// Tests for the weapon techniques 'throw' and 'pierce': npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { throwRelease } from './grip';
import { defaultAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { BODY_PARAMS, drawRig, frameCount, POSE_FPS, rigPoseFor, THROW_RELEASE_FRAME } from './rig';
import { SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const WEAPONS = ['held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_gilded_rapier', 'held_kunai', 'held_naginata'];

const look = (body: BodyType, held?: string, stowed = false, cape?: string): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  if (held) l.slots.held = { id: held, colors: [] };
  if (stowed) l.stowed = true;
  if (cape) l.slots.cape = { id: cape, colors: [] };
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
    assert.equal(frameCount(rigPoseFor('throw')), 5);
    assert.equal(frameCount(rigPoseFor('pierce')), 5);
  });

  it('lets the weapon go at the release frame, the owner reference pose', () => {
    assert.equal(THROW_RELEASE_FRAME, 3);
    for (let f = 0; f < frameCount('throw'); f++) assert.equal(drawRig('male', 'throw', f).released, f >= THROW_RELEASE_FRAME, `frame ${f}`);
    for (const body of BODIES) {
      for (const held of WEAPONS) {
        assert.ok(heldBox(look(body, held), 'throw', THROW_RELEASE_FRAME - 1), `${body} ${held}: in the hand before the release`);
        assert.equal(heldBox(look(body, held), 'throw', THROW_RELEASE_FRAME), null, `${body} ${held}: gone at the release`);
      }
    }
  });

  it('flings the weapon forward, level at the target, in the frame before the release', () => {
    for (const body of BODIES) {
      const r = drawRig(body, 'throw', THROW_RELEASE_FRAME - 1);
      assert.ok(r.handN.x > r.neck.x + 2, `${body}: the throwing hand is out in front`);
      for (const held of WEAPONS) {
        const b = heldBox(look(body, held), 'throw', THROW_RELEASE_FRAME - 1)!;
        // (the short kunai is as tall as its ring and guard)
        assert.ok(b.x1 - b.x0 > (held === 'held_kunai' ? 1.5 : 2) * (b.y1 - b.y0), `${body} ${held}: level`);
        assert.ok(b.x1 > r.handN.x * RES + 4, `${body} ${held}: pointing at the target`);
      }
    }
  });

  it('pitches into the release over two frames instead of jumping', () => {
    for (const body of BODIES) {
      for (let f = 1; f < frameCount('throw'); f++) {
        const a = drawRig(body, 'throw', f - 1);
        const b = drawRig(body, 'throw', f);
        assert.ok(Math.abs(b.lean - a.lean) <= 12, `${body} ${f}: lean ${a.lean} -> ${b.lean}`);
        // The same pitch carries the head further on a longer torso (the female bodies, the owner's
        // heroines at our scale), so the step allowed grows with it.
        const most = 10 * Math.max(1, BODY_PARAMS[body].torsoLen / BODY_PARAMS.male.torsoLen);
        assert.ok(Math.hypot(b.head.x - a.head.x, b.head.y - a.head.y) <= most, `${body} ${f}: the head moves (${a.head.x},${a.head.y}) -> (${b.head.x},${b.head.y})`);
      }
    }
  });

  it('hangs the head ahead of the chest and below the shoulders at the release, like the reference', () => {
    // The female bodies follow the owner's own repaint of this moment on his heroine (Lyra) instead: the
    // head up on the neck at its length (femaleBase.test.ts checks them).
    for (const body of BODIES.filter((b) => !BODY_PARAMS[b].fit)) {
      const r = drawRig(body, 'throw', THROW_RELEASE_FRAME);
      const below = (Math.atan2(r.head.y - r.neck.y, r.head.x - r.neck.x) * 180) / Math.PI;
      assert.ok(below > 20 && below < 45, `${body}: neck to head ${below.toFixed(1)} degrees below level (his 33)`);
      assert.ok(r.head.y > r.shoulderN.y, `${body}: the head hangs below the shoulder line`);
    }
  });

  it('keeps the free hand away from the throwing arm at the release', () => {
    for (const body of BODIES) {
      for (const f of [THROW_RELEASE_FRAME, THROW_RELEASE_FRAME + 1]) {
        const r = drawRig(body, 'throw', f);
        const d = Math.hypot(r.handF.x - r.elbowN.x, r.handF.y - r.elbowN.y);
        assert.ok(d > 10, `${body} ${f}: the free hand is ${d.toFixed(1)} from the throwing elbow`);
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
    assert.ok(heldBox(look('male'), 'throw', THROW_RELEASE_FRAME - 1), 'the kunai flung');
    assert.equal(heldBox(look('male'), 'throw', THROW_RELEASE_FRAME), null, 'thrown');
  });

  it('keeps a blade stowed on the back behind the body when it pitches forward', () => {
    for (const body of BODIES) {
      for (const held of ['held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_gilded_rapier']) {
        for (const f of [THROW_RELEASE_FRAME, THROW_RELEASE_FRAME + 1]) {
          const b = heldBox(look(body, held, true), 'throw', f)!;
          const neck = drawRig(body, 'throw', f).neck;
          assert.ok(b.x1 < neck.x * RES, `${body} ${held} ${f}: nothing of it in front of the neck (${b.x1} vs ${neck.x * RES})`);
        }
      }
    }
  });

  it('streams a cape back along the back on the pitched frames, not down between the legs', () => {
    const back = partIndex('back');
    for (const body of BODIES) {
      for (const cape of ['cape_knight', 'cape_rose', 'cape_crimson', 'cape_shadow']) {
        const s = renderSprite(look(body, 'held_katana', false, cape), 'throw', THROW_RELEASE_FRAME);
        const r = s.rig;
        const b = r.bp;
        let along = 0;
        let between = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (s.part[i] !== back || !s.rgba[i * 4 + 3]) continue;
          const dx = ((i % GRID) + 0.5) / RES - r.pelvis.x;
          const dy = (((i / GRID) | 0) + 0.5) / RES - r.pelvis.y;
          const lx = dx * r.right.x + dy * r.right.y;
          const ly = dx * r.up.x + dy * r.up.y;
          if (lx < -b.shoulderHalf && ly > 2 && ly < b.torsoLen) along++;
          if (lx > 0 && ly < -2) between++;
        }
        assert.ok(along > 40, `${body} ${cape}: cloth along the back (${along})`);
        assert.equal(between, 0, `${body} ${cape}: cloth between the legs`);
      }
    }
  });

  it("hangs a coat's front panel with the pitched torso, not down to the ankles", () => {
    const torso = partIndex('torso');
    for (const body of BODIES) {
      for (const cape of ['cape_haori', 'cape_rogue']) {
        const s = renderSprite(look(body, 'held_katana', false, cape), 'throw', THROW_RELEASE_FRAME);
        // halfway down the back shin
        const shin = ((s.rig.kneeN.y + s.rig.ankleN.y) / 2) * RES;
        let low = 0;
        for (let i = 0; i < GRID * GRID; i++) if (s.part[i] === torso && s.rgba[i * 4 + 3] && ((i / GRID) | 0) > shin) low++;
        assert.equal(low, 0, `${body} ${cape}: panel down the shins`);
      }
    }
  });

  it('says where the thrown weapon leaves the hand', () => {
    for (const body of BODIES) {
      const t = throwRelease(body, 'held_katana');
      assert.equal(t.frame, THROW_RELEASE_FRAME);
      assert.equal(t.thrown, 'held_katana');
      const s = renderSprite(look(body, 'held_katana'), 'throw', t.frame);
      const i = Math.floor(t.hand.y) * GRID + Math.floor(t.hand.x);
      assert.ok(s.rgba[i * 4 + 3], `${body}: the open hand is drawn there`);
      // the open hand is up and behind the head, flung back
      assert.ok(t.hand.y < s.rig.head.y * RES && t.hand.x < s.rig.head.x * RES, body);
      assert.ok(t.handAngle < -90 && t.handAngle > -180, `${body}: the hand points up and back`);
      // the weapon flies from the fist of the throw, in front of the body, level at the target
      const before = renderSprite(look(body, 'held_katana'), 'throw', t.frame - 1);
      const j = Math.floor(t.lastHeld.y) * GRID + Math.floor(t.lastHeld.x);
      assert.ok(before.rgba[j * 4 + 3], `${body}: the flight starts on the drawn fist`);
      assert.ok(t.lastHeld.x > before.rig.neck.x * RES, `${body}: in front of the body`);
      assert.ok(Math.abs(t.weaponAngle) <= 15, `${body}: level at the target, point first (${t.weaponAngle})`);
      assert.ok(Math.hypot(t.lastHeld.x - t.hand.x, t.lastHeld.y - t.hand.y) > 20, `${body}: the hand moves between the throw and the release`);
      // the flame longsword is held by its own grip, at the hand joint
      assert.deepEqual(throwRelease(body, 'held_flame_sword').lastHeld, { x: before.rig.handN.x * RES, y: before.rig.handN.y * RES });
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
