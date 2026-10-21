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
import { GRID } from './raster';
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
  it('carries her head on the long neck one unit higher and one forward, and only on the long neck', () => {
    const r = drawRig('female', 'idle', 0);
    assert.deepEqual(carryHead(r, 'long').head, { x: r.head.x + 1, y: r.head.y - 1 });
    for (const n of [undefined, 'slim', 'strong'] as const) assert.equal(carryHead(r, n), r);
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
      assert.ok(fitsBody(d, 'female') && fitsBody(d, 'slender'), id);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'), id);
    }
  });
});
