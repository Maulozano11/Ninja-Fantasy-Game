// Tests for Saya's face (the 'shade' face shape, src/sprite/sayaFaceArt.ts) and the fixes that came
// with it on her preset (scarf, stowed saber): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { RES } from './raster';
import { SAYA_EYE_COLORS, SAYA_IRIS } from './sayaEyeArt';
import { SAYA_FACE, SAYA_FACE_EYES, SAYA_FACE_SKIN } from './sayaFaceArt';
import type { BodyType, EyeShape, SpriteAppearance, SpritePose } from './types';

const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character.appearance!;

const look = (o: Partial<SpriteAppearance> = {}): SpriteAppearance => ({
  version: 1,
  body: 'female',
  skin: SAYA_FACE_SKIN,
  eyeShape: 'shade',
  eyeColor: SAYA_IRIS,
  faceShape: 'shade',
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
  ...o,
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => '#' + [0, 1, 2].map((k) => rgba[(y * 256 + x) * 4 + k].toString(16).padStart(2, '0')).join('');

/** The face anchor of a render (body.ts faceAnchor's nx, ny). */
function anchor(f: ReturnType<typeof renderSprite>): { nx: number; ny: number } {
  const k = f.rig.bp.headScale;
  return { nx: Math.floor((f.rig.head.x - 1.9 * k) * RES), ny: Math.floor((f.rig.head.y + 1.0 * k) * RES) };
}

describe("Saya's face", () => {
  it('is her preset face, with her eyes', () => {
    assert.equal(saya.faceShape, 'shade');
    assert.equal(saya.eyeShape, 'shade');
  });

  it('draws every pixel of hers in her own skin, the mouth and nose in her tone, and none of the template lip', () => {
    const f = renderSprite(look(), 'idle', 0);
    const { nx, ny } = anchor(f);
    const ox = nx - SAYA_FACE.pivot[0];
    const oy = ny - SAYA_FACE.pivot[1];
    let mouth = 0;
    SAYA_FACE.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        // the eye cells (her lash row and the two under it) are the eyes'; elsewhere every cell is hers
        const eye = r >= SAYA_FACE.pivot[1] && r < SAYA_FACE.pivot[1] + 3 && ((c >= SAYA_FACE.pivot[0] && c < SAYA_FACE.pivot[0] + 5) || (c >= SAYA_FACE.pivot[0] + 8 && c < SAYA_FACE.pivot[0] + 11));
        if (ch === '.' || eye) continue;
        assert.equal(hexAt(f.rgba, ox + c, oy + r), SAYA_FACE.colors[ch], `(${c},${r}) ${ch}`);
        if (ch === 'n') mouth++;
      }
    });
    assert.ok(mouth >= 4, 'her nose and her mouth');
    for (let i = 0; i < 256 * 256; i++) assert.notEqual(hexAt(f.rgba, i % 256, (i / 256) | 0), '#c4566c');
  });

  it('puts her far eye where he drew it: her blue a cell nearer than the template eyes', () => {
    const f = renderSprite(look(), 'idle', 0);
    const { nx, ny } = anchor(f);
    // her far eye's first column is skin, her blue under the lash beside it
    assert.equal(hexAt(f.rgba, nx + SAYA_FACE_EYES.far + 1, ny + 2), SAYA_EYE_COLORS.e);
    assert.equal(hexAt(f.rgba, nx + SAYA_FACE_EYES.far + 1, ny + 1), SAYA_EYE_COLORS.c);
  });

  it('takes the player skin, any eye shape and every body', () => {
    const tan = renderSprite(look({ skin: '#c58a5c' }), 'idle', 0);
    const { nx, ny } = anchor(tan);
    assert.notEqual(hexAt(tan.rgba, nx + 4, ny + 4), SAYA_FACE.colors.b);
    for (const body of ['female', 'male', 'bulky'] as BodyType[]) {
      for (const eyeShape of ['standard', 'shade', 'valiant'] as EyeShape[]) {
        for (const pose of ['idle', 'read', 'downed'] as SpritePose[]) assert.ok(renderSprite(look({ body, eyeShape }), pose, 0).rgba.some((v) => v > 0));
      }
    }
  });
});

describe("Saya's preset in the far-pitched poses", () => {
  it("keeps her scarf's wrap under her chin when the throw puts her head far forward", () => {
    // the wrap follows the head: its lit red lies under the chin, from the face's columns to its far side
    for (const [pose, frame] of [['idle', 0], ['throw', 3], ['throw', 4]] as const) {
      const f = renderSprite(saya, pose, frame);
      const { nx, ny } = anchor(f);
      let under = 0;
      for (let y = ny + 9; y <= ny + 15; y++) for (let x = nx; x <= nx + 12; x++) if (hexAt(f.rgba, x, y) === '#b43134') under++;
      assert.ok(under >= 8, `${pose} ${frame}: ${under}`);
    }
  });
});
