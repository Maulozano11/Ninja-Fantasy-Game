// Tests for Saya's eyes (the 'shade' eye shape, src/sprite/sayaEyeArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { RES } from './raster';
import { SAYA_EYE_CELLS, SAYA_EYE_COLORS, SAYA_EYES, SAYA_IRIS } from './sayaEyeArt';
import type { SpriteAppearance, SpritePose } from './types';

const look = (eyeColor = SAYA_IRIS, eyeShape: SpriteAppearance['eyeShape'] = 'shade'): SpriteAppearance => ({
  version: 1,
  body: 'female',
  skin: '#f2c7a0',
  eyeShape,
  eyeColor,
  slots: {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** Her open eyes' pixels in a render (the face anchor as body.ts finds it): [x, y, letter, colour drawn]. */
function painted(pose: SpritePose, eyeColor?: string): [number, number, string, string][] {
  const f = renderSprite(look(eyeColor), pose, 0);
  const k = f.rig.bp.headScale;
  const nx = Math.floor((f.rig.head.x - 1.9 * k) * RES);
  const ny = Math.floor((f.rig.head.y + 1.0 * k) * RES);
  const out: [number, number, string, string][] = [];
  for (const [name, x0] of [['near', nx], ['far', nx + 9]] as const) {
    const eye = SAYA_EYES.open[name];
    eye.rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '.') out.push([x0 + c, ny + r, eye.letters[r][c], hex(f.rgba, (ny + r) * 256 + x0 + c)]);
    }));
  }
  return out;
}

describe("Saya's eyes", () => {
  it('are whole pictures: letters and colours line up, every colour is hers', () => {
    for (const state of Object.values(SAYA_EYES)) {
      for (const eye of [state.near, state.far]) {
        assert.equal(eye.rows.length, eye.letters.length);
        eye.rows.forEach((row, r) => {
          assert.equal(row.length, eye.letters[r].length);
          [...row].forEach((ch, c) => {
            if (ch !== '.') assert.match(SAYA_EYE_COLORS[ch] ?? '', /^#[0-9a-f]{6}$/);
            else assert.ok('.oDsbl'.includes(eye.letters[r][c]), `only skin shows where she has no pixel (${eye.letters[r][c]})`);
          });
        });
      }
    }
  });

  it("give the template's eye cells the letters of her pixels there", () => {
    for (const [state, eyes] of Object.entries(SAYA_EYES) as [keyof typeof SAYA_EYES, (typeof SAYA_EYES)['open']][]) {
      for (const [name, w] of [['near', 5], ['far', 3]] as const) {
        assert.equal(eyes[name].letters.length, 3, `${state} ${name}`);
        for (const row of eyes[name].letters) assert.equal(row.length, w, `${state} ${name}`);
        assert.deepEqual(SAYA_EYE_CELLS[state][name], eyes[name].letters, `${state} ${name}`);
      }
    }
  });

  it('are drawn in her own colours in her blue, and the eye colour moves only her iris', () => {
    const blue = painted('idle');
    assert.ok(blue.length >= 12);
    for (const [x, y, , drawn] of blue) assert.ok(Object.values(SAYA_EYE_COLORS).includes(drawn), `${x},${y} ${drawn} is one of her colours`);
    const green = painted('idle', '#22c55e');
    blue.forEach(([x, y, letter, drawn], i) => {
      const [, , , g] = green[i];
      if (letter === 'd' || letter === 'i') assert.notEqual(g, drawn, `iris at ${x},${y}`);
      else assert.equal(g, drawn, `lash and whites stay hers at ${x},${y}`);
    });
  });

  it('lower their lids to read and close them when knocked out', () => {
    for (const pose of ['read', 'downed'] as const) {
      assert.notDeepEqual(renderSprite(look(), pose, 0).rgba, renderSprite(look(SAYA_IRIS, 'standard'), pose, 0).rgba, pose);
    }
  });
});
