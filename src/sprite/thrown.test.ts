// Tests for the weapon a Ryusei throws in its Warp Strike (thrown.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { heldAt, throwRelease } from './grip';
import { defaultAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { THROW_RELEASE_FRAME } from './rig';
import { catchLook, renderThrown, THROWN_GRIP, thrownItem } from './thrown';
import type { BodyType, SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const BLADES = ['held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_kunai'];

const look = (body: BodyType, held?: string, stowed = false): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  if (held) l.slots.held = { id: held, colors: [] };
  else delete l.slots.held;
  if (stowed) l.stowed = true;
  return l;
};

/**
 * The thrown weapon laid over a frame with its anchor on `at`: how many of the frame's held-item
 * pixels it covers with the same colour, and how many it leaves out.
 */
function overlay(frame: { rgba: Uint8ClampedArray; part: Uint8Array }, th: { rgba: Uint8ClampedArray; grip: { x: number; y: number } }, at: { x: number; y: number }) {
  const held = partIndex('held');
  const ox = Math.floor(at.x) - th.grip.x;
  const oy = Math.floor(at.y) - th.grip.y;
  let both = 0;
  let same = 0;
  let missed = 0;
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      const fx = x + ox;
      const fy = y + oy;
      const t = th.rgba[i * 4 + 3] > 0;
      const j = fy * GRID + fx;
      const f = fx >= 0 && fy >= 0 && fx < GRID && fy < GRID && frame.part[j] === held && frame.rgba[j * 4 + 3] > 0;
      if (t && f) {
        both++;
        if (th.rgba[i * 4] === frame.rgba[j * 4] && th.rgba[i * 4 + 1] === frame.rgba[j * 4 + 1] && th.rgba[i * 4 + 2] === frame.rgba[j * 4 + 2]) same++;
      } else if (f) missed++;
    }
  return { both, same, missed };
}

describe('the Warp Strike thrown weapon', () => {
  it('throws the held weapon, or a kunai from empty or busy hands', () => {
    assert.equal(thrownItem(look('male', 'held_crystal')), 'held_crystal');
    assert.equal(thrownItem(look('male')), 'held_kunai');
    assert.equal(thrownItem(look('male', 'held_crystal', true)), 'held_kunai');
  });

  it('catches it with the hand that threw it: a kunai from the pouch is held for the thrust', () => {
    const armed = look('male', 'held_katana');
    assert.equal(catchLook(armed), armed);
    assert.equal(catchLook(look('male')).slots.held?.id, 'held_kunai');
    const stowed = catchLook(look('male', 'held_crystal', true));
    assert.equal(stowed.slots.held?.id, 'held_kunai');
    assert.ok(!stowed.stowed);
  });

  it('is pixel for pixel the weapon that leaves the hand, at the angle it was flung at', () => {
    for (const body of BODIES)
      for (const held of [undefined, ...BLADES, 'held_naginata']) {
        const l = look(body, held);
        const rel = throwRelease(body, held);
        const th = renderThrown(l, rel.weaponAngle);
        assert.ok(Math.abs(th.grip.x - THROWN_GRIP.x) <= 1 && Math.abs(th.grip.y - THROWN_GRIP.y) <= 1, `${body} ${held}: anchored in the middle`);
        const r = overlay(renderSprite(l, 'throw', THROW_RELEASE_FRAME - 1), th, rel.lastHeld);
        assert.ok(r.both > 40, `${body} ${held}: drawn (${r.both})`);
        assert.equal(r.missed, 0, `${body} ${held}: every pixel of it in the hand is in the throw`);
        assert.ok(r.same >= 0.9 * r.both, `${body} ${held}: the same colours (${r.same}/${r.both})`);
      }
  });

  it('meets the hand of the thrust it is caught in', () => {
    for (const body of BODIES)
      for (const held of [undefined, ...BLADES]) {
        const l = look(body, held);
        const c = catchLook(l);
        const h = heldAt(body, 'pierce', 1, c.slots.held?.id);
        const r = overlay(renderSprite(c, 'pierce', 1), renderThrown(l, h.angle), h.at);
        assert.ok(r.both > 40, `${body} ${held}: drawn (${r.both})`);
        assert.equal(r.missed, 0, `${body} ${held}: it lies on the weapon in the hand`);
        assert.ok(r.same >= 0.85 * r.both, `${body} ${held}: the same colours (${r.same}/${r.both})`);
      }
  });

  it('turns crisp to any angle of its flight: every pixel opaque and of the weapon', () => {
    const l = look('male', 'held_crystal');
    const base = renderThrown(l, 0);
    let n0 = 0;
    for (let i = 3; i < base.rgba.length; i += 4) if (base.rgba[i]) n0++;
    for (const a of [-40, -12, 6, 30, 75, 90]) {
      const t = renderThrown(l, a);
      let n = 0;
      for (let i = 3; i < t.rgba.length; i += 4) {
        if (!t.rgba[i]) continue;
        n++;
        assert.equal(t.rgba[i], 255, `${a}: no half-transparent (blurred) pixels`);
      }
      assert.ok(Math.abs(n - n0) < 0.2 * n0, `${a}: as big as level (${n} vs ${n0})`);
    }
  });
});
