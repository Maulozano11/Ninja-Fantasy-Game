// Tests for Aurelia's eyes (eye shape 'dawn', src/sprite/aureliaEyeArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DAWN_EYE_COLORS, DAWN_EYES, DAWN_IRIS } from './aureliaEyeArt';
import { renderSprite } from './compose';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const look = (over: Partial<SpriteAppearance> = {}): SpriteAppearance => ({
  version: 1,
  body: 'female',
  skin: '#f9ccaa',
  eyeShape: 'dawn',
  eyeColor: DAWN_IRIS,
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
  ...over,
});

/** Every colour in a frame, as lower-case hex. */
function colours(l: SpriteAppearance, pose: SpritePose = 'idle'): Set<string> {
  const { rgba } = renderSprite(l, pose, 0);
  const out = new Set<string>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    out.add('#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join(''));
  }
  return out;
}

/** Her colours a lid state uses. */
const used = (state: keyof typeof DAWN_EYES) =>
  new Set([DAWN_EYES[state].near, DAWN_EYES[state].far].flatMap((e) => e.rows.join('').replace(/\./g, '').split('')).map((ch) => DAWN_EYE_COLORS[ch]));

describe("Aurelia's eyes", () => {
  it('lay her pixels on the template eye cells: the same size as the letters, her colours only, nothing on the skin cells', () => {
    for (const [state, eyes] of Object.entries(DAWN_EYES)) {
      for (const [side, eye] of Object.entries(eyes)) {
        const at = `${state} ${side}`;
        assert.equal(eye.rows.length, eye.letters.length, at);
        assert.equal(eye.letters[0].length, side === 'near' ? 5 : 3, at);
        eye.rows.forEach((row, r) => {
          assert.equal(row.length, eye.letters[r].length, at);
          for (let c = 0; c < row.length; c++) {
            const skin = 'osbDl'.includes(eye.letters[r][c]);
            if (row[c] === '.') assert.ok(skin, `${at}: her cell ${r},${c} is empty`);
            else {
              assert.ok(!skin, `${at}: her pixel ${r},${c} sits on the skin`);
              assert.match(DAWN_EYE_COLORS[row[c]] ?? '', /^#[0-9a-f]{6}$/, at);
            }
          }
        });
      }
    }
  });

  it('keep her exact colours in her own blue', () => {
    const got = colours(look());
    for (const hex of used('open')) assert.ok(got.has(hex), hex);
  });

  it('move her iris with the eye colour and keep her lash, whites and cream', () => {
    const got = colours(look({ eyeColor: '#22c55e' }));
    for (const hex of ['#226ba3', '#06285b', '#329cbd', '#5897c6']) assert.ok(!got.has(hex), hex);
    for (const hex of ['#130f17', '#36221f', '#ffffff', '#a9968b', '#eadeca']) assert.ok(got.has(hex), hex);
  });

  it('shut over the eye when downed and lower over it when reading', () => {
    const shut = colours(look(), 'downed');
    for (const hex of ['#226ba3', '#06285b', '#ffffff']) assert.ok(!shut.has(hex), hex);
    assert.ok(shut.has('#130f17'));
    const reading = colours(look(), 'read');
    assert.ok(!reading.has('#06285b'), 'the pupil is under the lid');
    assert.ok(reading.has('#329cbd') && reading.has('#eadeca'), 'the lower row shows');
  });

  it('draw on every body in every pose', () => {
    const poses: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[])
      for (const pose of poses) assert.ok(colours(look({ body }), pose).has('#130f17'), `${body} ${pose}`);
  });
});
