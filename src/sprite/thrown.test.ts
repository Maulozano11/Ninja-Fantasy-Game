// Tests for the weapon a Ryusei throws in its Shooting-Star Thrust (thrown.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { heldAt, throwRelease } from './grip';
import { defaultAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { THROW_RELEASE_FRAME } from './rig';
import { catchLook, RELEASE_MARGIN, releaseClear, releaseStart, renderThrown, THROWN_GRIP, thrownItem } from './thrown';
import type { BodyType, SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky', 'slender'];
const BLADES = ['held_katana', 'held_ice_crystal', 'held_flame_sword', 'held_kunai'];
/** Techniques held in the palm: not weapons, so a throw flings a kunai from the pouch instead. */
const TECHNIQUES = ['held_spiral', 'held_lightning', 'held_palm'];

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

describe('the Shooting-Star Thrust thrown weapon', () => {
  it('throws the held weapon, or a kunai from empty or busy hands or a technique in the palm', () => {
    assert.equal(thrownItem(look('male', 'held_ice_crystal')), 'held_ice_crystal');
    assert.equal(thrownItem(look('male')), 'held_kunai');
    assert.equal(thrownItem(look('male', 'held_none')), 'held_kunai');
    assert.equal(thrownItem(look('male', 'held_ice_crystal', true)), 'held_kunai');
    for (const held of TECHNIQUES) {
      assert.equal(thrownItem(look('male', held)), 'held_kunai', held);
      assert.equal(throwRelease('male', held).thrown, 'held_kunai', held);
    }
  });

  it('catches it with the hand that threw it: a kunai from the pouch is held for the thrust, the rest as it was', () => {
    const armed = look('male', 'held_katana');
    assert.equal(catchLook(armed), armed);
    const bare = catchLook(look('male'));
    assert.ok(bare.pouchKunai);
    assert.equal(bare.slots.held, undefined);
    const stowed = catchLook(look('male', 'held_ice_crystal', true));
    assert.ok(stowed.pouchKunai);
    assert.equal(stowed.slots.held?.id, 'held_ice_crystal');
    assert.ok(stowed.stowed, 'the stowed weapon stays put away');
  });

  it('a technique in the palm makes way for the kunai: the throw and the thrust are drawn as with empty hands', () => {
    // (Two bodies are enough: which items are drawn does not depend on the body.)
    for (const body of ['male', 'slender'] as BodyType[]) {
      const bare = look(body);
      for (const held of TECHNIQUES) {
        const l = look(body, held);
        for (let f = 0; f < THROW_RELEASE_FRAME; f++)
          assert.deepEqual(renderSprite(l, 'throw', f).rgba, renderSprite(bare, 'throw', f).rgba, `${body} ${held}: throw ${f}`);
        for (const f of [1, 4]) assert.deepEqual(renderSprite(catchLook(l), 'pierce', f).rgba, renderSprite(catchLook(bare), 'pierce', f).rgba, `${body} ${held}: pierce ${f}`);
      }
    }
  });

  it('a stowed weapon stays where it is put away while the caught kunai is in the hand', () => {
    for (const body of BODIES) {
      const l = look(body, 'held_ice_crystal', true);
      const c = catchLook(l);
      for (const f of [1, 4]) {
        const own = renderSprite(l, 'pierce', f);
        const caught = renderSprite(c, 'pierce', f);
        // Only the kunai and the fist closed round it may differ.
        const h = heldAt(body, 'pierce', f, 'held_kunai');
        const kunai = renderThrown(l, h.angle);
        const ox = Math.floor(h.at.x) - kunai.grip.x;
        const oy = Math.floor(h.at.y) - kunai.grip.y;
        const hand = partIndex('handN');
        const near = (x: number, y: number): boolean => {
          for (let dy = -4; dy <= 4; dy++)
            for (let dx = -4; dx <= 4; dx++) {
              const kx = x + dx - ox;
              const ky = y + dy - oy;
              if (kx >= 0 && ky >= 0 && kx < GRID && ky < GRID && kunai.rgba[(ky * GRID + kx) * 4 + 3]) return true;
              const j = (y + dy) * GRID + x + dx;
              if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && j >= 0 && j < GRID * GRID && (own.part[j] === hand || caught.part[j] === hand)) return true;
            }
          return false;
        };
        let elsewhere = 0;
        for (let y = 0; y < GRID; y++)
          for (let x = 0; x < GRID; x++) {
            const i = (y * GRID + x) * 4;
            const same = own.rgba[i] === caught.rgba[i] && own.rgba[i + 1] === caught.rgba[i + 1] && own.rgba[i + 2] === caught.rgba[i + 2] && own.rgba[i + 3] === caught.rgba[i + 3];
            if (!same && !near(x, y)) elsewhere++;
          }
        assert.equal(elsewhere, 0, `${body} pierce ${f}: nothing changes but the kunai in the fist`);
        // (The stowed weapon is a held item too: only what lies on the kunai is counted.)
        const r = overlay(caught, kunai, h.at);
        assert.ok(r.both > 40 && r.same >= 0.85 * r.both, `${body} pierce ${f}: the kunai is in the fist (${r.same}/${r.both})`);
      }
    }
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
      for (const l of [undefined, ...BLADES, 'held_spiral'].map((held) => look(body, held))) {
        const held = l.slots.held?.id;
        const c = catchLook(l);
        const h = heldAt(body, 'pierce', 1, thrownItem(l));
        const r = overlay(renderSprite(c, 'pierce', 1), renderThrown(l, h.angle), h.at);
        assert.ok(r.both > 40, `${body} ${held}: drawn (${r.both})`);
        assert.equal(r.missed, 0, `${body} ${held}: it lies on the weapon in the hand`);
        assert.ok(r.same >= 0.85 * r.both, `${body} ${held}: the same colours (${r.same}/${r.both})`);
      }
  });

  it('is first drawn in flight clear of the release pose, which pitches the head where the fist let go of it', () => {
    for (const body of BODIES)
      for (const held of [undefined, ...BLADES, 'held_naginata']) {
        const l = look(body, held);
        const rel = throwRelease(body, held);
        const figure = renderSprite(l, 'throw', THROW_RELEASE_FRAME).rgba;
        const th = renderThrown(l, rel.weaponAngle);
        const clear = releaseClear(figure, th, rel.lastHeld, rel.weaponAngle);
        assert.ok(clear > 0 && clear < 64, `${body} ${held}: flung clear of the face (${clear})`);
        // No pixel of it on the figure or within the margin of it, where it is first drawn.
        const at = releaseStart(rel.lastHeld, rel.weaponAngle, clear);
        const ox = Math.floor(at.x) - th.grip.x;
        const oy = Math.floor(at.y) - th.grip.y;
        let close = 0;
        for (let y = 0; y < GRID; y++)
          for (let x = 0; x < GRID; x++) {
            if (!th.rgba[(y * GRID + x) * 4 + 3]) continue;
            for (let dy = -RELEASE_MARGIN; dy <= RELEASE_MARGIN; dy++)
              for (let dx = -RELEASE_MARGIN; dx <= RELEASE_MARGIN; dx++) {
                const fx = x + ox + dx;
                const fy = y + oy + dy;
                if (dx * dx + dy * dy <= RELEASE_MARGIN * RELEASE_MARGIN && fx >= 0 && fy >= 0 && fx < GRID && fy < GRID && figure[(fy * GRID + fx) * 4 + 3]) close++;
              }
          }
        assert.equal(close, 0, `${body} ${held}: clear of the figure`);
      }
  });

  it('turns crisp to any angle of its flight: every pixel opaque and of the weapon', () => {
    const l = look('male', 'held_ice_crystal');
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
