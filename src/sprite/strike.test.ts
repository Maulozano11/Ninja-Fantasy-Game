// Tests for the weapon techniques 'throw' and 'pierce': npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { throwRelease } from './grip';
import { defaultAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { COMBO_KICKS, COMBO_TURNED, drawRig, frameCount, POSE_FPS, rigPoseFor, THROW_RELEASE_FRAME } from './rig';
import { SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'female', 'bulky'];
const WEAPONS = ['held_katana', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_scarlet_sword', 'held_kunai', 'held_naginata'];

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
        assert.ok(Math.hypot(b.head.x - a.head.x, b.head.y - a.head.y) <= 10, `${body} ${f}: the head moves (${a.head.x},${a.head.y}) -> (${b.head.x},${b.head.y})`);
      }
    }
  });

  it('keeps the head up on the neck at its length through the release and follow-through, on every body', () => {
    // The release once hung the head ahead of the chest by a fixed offset (headDx 6, headDy 8): 13 px from the
    // neck's foot against 9 at rest, below the shoulders, no neck to it (the owner: "hay que arreglarle el
    // cuello y la cabeza a las ultimas 2 poses de arrojar"). As on his heroine's throw (neckPitch), the head
    // stays on the neck at its rest length, the neck 10-30 degrees forward of upright, above the shoulders.
    for (const body of BODIES) {
      const rest = drawRig(body, 'idle', 0);
      const len = Math.hypot(rest.head.x - rest.neck.x, rest.head.y - rest.neck.y) * RES;
      for (let f = 0; f < frameCount('throw'); f++) {
        const r = drawRig(body, 'throw', f);
        const d = Math.hypot(r.head.x - r.neck.x, r.head.y - r.neck.y) * RES;
        // no frame stretches the neck past its length (the head on whole fine pixels: 1.5 px)
        assert.ok(d <= len + 1.5, `${body} throw ${f}: the head ${d.toFixed(1)} px from the neck's foot (at rest ${len.toFixed(1)})`);
        if (f < THROW_RELEASE_FRAME) continue;
        assert.ok(Math.abs(d - len) <= 1.5, `${body} throw ${f}: the head ${d.toFixed(1)} px from the neck's foot (at rest ${len.toFixed(1)})`);
        const deg = (Math.atan2(r.head.x - r.neck.x, r.neck.y - r.head.y) * 180) / Math.PI;
        assert.ok(deg >= 10 && deg <= 30, `${body} throw ${f}: the neck leans ${deg.toFixed(1)} degrees forward`);
        assert.ok(r.head.y < Math.min(r.shoulderN.y, r.shoulderF.y) - 1, `${body} throw ${f}: the head sits above the shoulders`);
      }
    }
  });

  it('joins the head to the body with no gap in every throw frame', () => {
    // From the neck's foot to the head's centre every pixel is the figure (skin, collar or hair): the head
    // never floats off the shoulders. The default look, and the owner's Ren, Aiden and the Roman.
    const looks: [string, SpriteAppearance][] = [['default', look('male')], ...['preset_night', 'preset_reference_aiden'].map((id) => [id, LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character.appearance!] as [string, SpriteAppearance])];
    const roman = look('male');
    roman.slots.armor = { id: 'armor_bronze', colors: [] };
    roman.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
    roman.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
    roman.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
    delete roman.slots.top;
    delete roman.slots.bottom;
    looks.push(['roman', roman]);
    for (const [name, base] of looks) {
      for (const body of BODIES) {
        const l = { ...base, body };
        for (let f = 0; f < frameCount('throw'); f++) {
          const r = drawRig(body, rigPoseFor('throw', l.cast?.style, l.slots.held?.id), f);
          const fr = renderSprite(l, 'throw', f).rgba;
          for (let k = 0; k <= 20; k++) {
            const x = Math.floor((r.neck.x + ((r.head.x - r.neck.x) * k) / 20) * RES);
            const y = Math.floor((r.neck.y + ((r.head.y - r.neck.y) * k) / 20) * RES);
            assert.ok(fr[(y * GRID + x) * 4 + 3] > 0, `${name} ${body} throw ${f}: a gap at ${x},${y} between the neck and the head`);
          }
        }
      }
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
      for (const held of ['held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_scarlet_sword']) {
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

describe('the unarmed combo (the Leaf Hurricane)', () => {
  it('is previewed in the creator and plays its 8 frames like the strikes', () => {
    assert.ok(SPRITE_POSES.includes('combo'));
    assert.equal(frameCount(rigPoseFor('combo')), 8);
    assert.ok(POSE_FPS.combo >= 8);
    assert.deepEqual([...COMBO_TURNED], [3, 4]);
    assert.deepEqual([...COMBO_KICKS], [4, 6]);
  });

  it('is struck with the weapon put away', () => {
    for (const body of BODIES)
      for (let f = 0; f < frameCount('combo'); f++) assert.equal(heldBox(look(body, 'held_katana'), 'combo' as never, f), null, `${body} ${f}`);
  });

  it('punches out at the target, then kicks: back into it while turned, then high at it', () => {
    for (const body of BODIES) {
      const guard = drawRig(body, 'combo', 0);
      const jab = drawRig(body, 'combo', 1);
      assert.ok(jab.handN.x > guard.handN.x + 3, `${body}: the jab reaches out`);
      const back = drawRig(body, 'combo', 4);
      // Drawn facing right and shown mirrored: the heel driven back (left in the drawing) is toward the target.
      assert.ok(back.ankleN.x < back.hipN.x - 8, `${body}: the back kick drives the heel back`);
      const kick = drawRig(body, 'combo', 6);
      assert.ok(kick.ankleN.x > kick.hipN.x + 8, `${body}: the finishing kick goes out in front`);
      assert.ok(kick.ankleN.y < guard.ankleN.y - 8, `${body}: and up off the ground`);
    }
  });
});
