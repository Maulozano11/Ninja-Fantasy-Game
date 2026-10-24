// Tests for how Lyra sits on our body (npm test): her long neck (neck.ts), her face (face shape 'fine',
// lyraFace.ts) and her tabard and belt (items/lyraLower.ts), against the owner's picture of her at our
// scale laid on our frame at (x + 74, y + 121).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { LYRA_FACE } from './lyraFaceArt';
import { carryHead } from './neck';
import { GRID, partIndex } from './raster';
import { drawRig, frameCount, rigPoseFor } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

const lyra = (): SpriteAppearance => LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

const lowest = (rgba: Uint8ClampedArray) => {
  for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (rgba[(y * GRID + x) * 4 + 3]) return y;
  return -1;
};

describe('Lyra on our body', () => {
  it('carries her head on the long neck one unit forward (and on the male bodies one higher), and only on the long neck', () => {
    for (const body of ['female'] as const) {
      const r = drawRig(body, 'idle', 0);
      assert.deepEqual(carryHead(r, 'long').head, { x: r.head.x + 1, y: r.head.y }, body);
      assert.equal(carryHead(r, undefined), r);
    }
    for (const body of ['male', 'bulky'] as const) {
      const r = drawRig(body, 'idle', 0);
      assert.deepEqual(carryHead(r, 'long').head, { x: r.head.x + 1, y: r.head.y - 1 }, body);
    }
  });

  it('puts her face anchor on his near eye with her long neck: his lash start (51, 18) at (125, 139)', () => {
    const look = lyra();
    const rig = carryHead(drawRig('female', 'idle', 0), look.neck);
    const { nx, ny, fx } = faceAnchor({ rig, bp: rig.bp, look } as unknown as DrawCtx);
    assert.deepEqual([nx, ny, fx], [125, 139, 131]);
    assert.equal(LYRA_FACE.rows[LYRA_FACE.pivot[1]][LYRA_FACE.pivot[0]] !== '.', true);
  });

  it('shows his face at idle where he drew it: his mouth, his far eye with its iris, a lit neck under the chin', () => {
    const f = renderSprite(lyra(), 'idle', 0).rgba;
    // his mouth, two dark reds at the near corner of the chin (his 51-52, 25)
    assert.equal(hexAt(f, 125, 146), '#75302b');
    assert.equal(hexAt(f, 126, 146), '#75302b');
    // his far eye: the white, then his dark green, then his face line (his 57-59, 19)
    assert.equal(hexAt(f, 132, 140), '#0d6849');
    assert.equal(hexAt(f, 133, 140), '#010101');
    // the neck under his chin line is skin in its light tones, not a dark red band
    for (const x of [125, 126, 127]) assert.notEqual(hexAt(f, x, 149), '#af4547', `${x}`);
  });

  it('shows his neck, ear and hair round them at idle: his line on the neck, his hair past it and between arm and corset', () => {
    const f = renderSprite(lyra(), 'idle', 0).rgba;
    // the neck's far line (his 54, 27 and 55, 28) and his hair past it (55, 27), not our shoulders' skin
    assert.equal(hexAt(f, 128, 148), '#010101');
    assert.equal(hexAt(f, 129, 149), '#010101');
    assert.equal(hexAt(f, 129, 148), '#3b1023');
    // his shade on the neck under the jaw
    assert.equal(hexAt(f, 126, 148), '#d58771');
    // his ear in his skin colours (her preset's skin is his)
    assert.equal(hexAt(f, 121, 140), '#cb7862');
    // the lock of hair between her near arm and the corset (his 43-46, 41-43), in front of the corset
    for (const [x, y] of [[118, 162], [119, 163], [120, 164]]) assert.equal(hexAt(f, x, y), '#3b1023', `${x},${y}`);
  });

  it('hangs her fists and sword where he drew them on his Lyra\'s long arms, and only on them', () => {
    // standard arms are the body's own
    for (const body of ['female', 'male', 'bulky'] as const) {
      const { T: _a, ...own } = drawRig(body, 'idle', 0, 'standard');
      const { T: _b, ...plain } = drawRig(body, 'idle', 0);
      assert.deepEqual(own, plain, body);
      assert.ok(drawRig(body, 'idle', 0, 'long').wristN.y > drawRig(body, 'idle', 0).wristN.y, body);
    }
    // his picture laid at (x + 74, y + 121): his near fist from (104, 176), his far hand from (139, 177)
    const look = lyra();
    assert.equal(look.arms, 'long');
    const f = renderSprite(look, 'idle', 0);
    const box = (part: string) => {
      const k = partIndex(part as Parameters<typeof partIndex>[0]);
      let x0 = GRID, y0 = GRID;
      for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] && f.part[i] === k) { x0 = Math.min(x0, i % GRID); y0 = Math.min(y0, (i / GRID) | 0); }
      return [x0, y0];
    };
    assert.deepEqual(box('handN'), [104, 176]);
    assert.deepEqual(box('handF'), [139, 177]);
    // the gem in his sword's cross, where he drew it
    assert.equal(hexAt(f.rgba, 111, 181), '#3ed8f2');
  });

  it('never hangs the tabard below her soles', () => {
    const look = lyra();
    const bare = { ...look, slots: { ...look.slots, skirt: undefined } };
    for (const pose of ['idle', 'attack', 'throw', 'pierce', 'walk', 'run', 'crouch', 'sneak', 'sit', 'train'] as SpritePose[]) {
      for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
        assert.ok(lowest(renderSprite(look, pose, f).rgba) <= lowest(renderSprite(bare, pose, f).rgba), `${pose} ${f}`);
      }
    }
  });

  it('cuts her tabard and belt for women, as her blouse, corset, skirt and boots are', () => {
    for (const id of ['skirt_gilded_tabard', 'waist_pouch_belt']) {
      const d = getItem(id)!;
      assert.ok(fitsBody(d, 'female'), id);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'), id);
    }
  });
});
