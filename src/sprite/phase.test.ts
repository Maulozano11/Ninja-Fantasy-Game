// Tests for the Ryusei's phase body (a sprite frame turned into blue light): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSpriteCached } from './compose';
import { getAppearance } from './legacy';
import { GLOW, PHASE_RAMP, phaseBody, phaseFrame, phaseOver } from './phase';
import { GRID } from './raster';
import { ALL_PRESETS } from '../data/shinobiData';

const px = (b: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(b.subarray((y * w + x) * 4, (y * w + x) * 4 + 4));
const BLACK = [0, 0, 0] as const;
/** The river forest's grass, on average. */
const GRASS = [72, 134, 71] as const;
/** Within 2 of a colour (the body's pixels are rounded once they are divided for the two passes). */
const near = (got: number[], want: readonly number[]): boolean => want.every((v, i) => Math.abs(got[i] - v) <= 2);
/** The nearest step of the owner's colours. */
const stepOf = (r: number, g: number, b: number): number => {
  let best = 0;
  let bd = Infinity;
  PHASE_RAMP.forEach((c, i) => {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bd) [best, bd] = [i, d];
  });
  return best;
};

describe('phase body', () => {
  it('turns a figure into light: a near-white silhouette, a see-through blue inside and a fading glow round it', () => {
    // A 10 x 10 grey square in a 32 x 32 frame.
    const w = 32;
    const src = new Uint8ClampedArray(w * w * 4);
    for (let y = 11; y < 21; y++) for (let x = 11; x < 21; x++) src.set([120, 110, 100, 255], (y * w + x) * 4);
    const out = phaseBody(src, w, w);
    const shown = phaseOver(out, BLACK);
    // The silhouette: near-white over black, whitest along the top; opaque.
    assert.ok(near(px(shown, w, 15, 11), PHASE_RAMP[7]), `top ${px(shown, w, 15, 11)}`);
    assert.ok(near(px(shown, w, 11, 15), PHASE_RAMP[6]), `side ${px(shown, w, 11, 15)}`);
    assert.equal(px(out, w, 11, 15)[3], 255);
    // Deep inside: one of his blues over black, and the ground shows through.
    assert.ok(PHASE_RAMP.slice(0, 5).some((c) => near(px(shown, w, 15, 15), c)), `inside ${px(shown, w, 15, 15)}`);
    assert.ok(px(out, w, 15, 15)[3] < 160, `inside alpha ${px(out, w, 15, 15)[3]}`);
    // The glow steps out and fades; past its reach nothing is drawn.
    const glow = [1, 2, 3, 4, 5].map((d) => px(shown, w, 11 - d, 15)[2]);
    glow.forEach((v, i) => assert.ok(Math.abs(v - (PHASE_RAMP[i < 2 ? 4 : 3][2] * GLOW[i + 1]) / 255) <= 2, `glow ${glow}`));
    assert.equal(px(out, w, 10 - GLOW.length + 1, 15)[3], 0);
    assert.equal(px(out, w, 0, 0)[3], 0);
    // An empty frame stays empty.
    assert.ok(phaseBody(new Uint8ClampedArray(w * w * 4), w, w).every((v) => v === 0));
  });

  it('every preset ninja becomes mostly a strong electric blue with thin pale lines, like the owner\'s picture', () => {
    for (const preset of ALL_PRESETS) {
      const spr = renderSpriteCached(getAppearance(preset.character), 'run', 2);
      const out = phaseFrame(spr);
      const shown = phaseOver(out, BLACK);
      let figure = 0;
      let pale = 0;
      let alpha = 0;
      const mean = [0, 0, 0];
      for (let i = 0; i < GRID * GRID; i++) {
        if (spr.rgba[i * 4 + 3] < 24) continue;
        figure++;
        const [r, g, b] = [shown[i * 4], shown[i * 4 + 1], shown[i * 4 + 2]];
        assert.ok(b >= r && b >= g, `${preset.name}: blue where the sprite is`);
        if (stepOf(r, g, b) >= 5) pale++;
        alpha += out[i * 4 + 3];
        mean[0] += r;
        mean[1] += g;
        mean[2] += b;
      }
      const m = mean.map((v) => v / figure);
      // His picture: about a third pale, the mean about (67, 93, 205).
      // (Aurelia's white dress, sleeves and both white boots are pale in any light: she gets a little more.)
      assert.ok(pale / figure < (preset.character.id === 'preset_aurelia' ? 0.42 : 0.36), `${preset.name}: ${Math.round((100 * pale) / figure)}% pale`);
      assert.ok(m[0] < 90 && m[1] < 115 && m[2] > 190, `${preset.name}: mean ${m.map(Math.round)}`);
      // See-through: well under opaque on average.
      assert.ok(alpha / figure < 200, `${preset.name}: alpha ${Math.round(alpha / figure)}`);
    }
  });

  it('a faint body (an after-image, a hidden ninja) stays blue over green grass', () => {
    const look = getAppearance(ALL_PRESETS[0].character);
    const spr = renderSpriteCached(look, 'run', 2);
    assert.ok(spr.hair?.some((v) => v), 'the hair is marked');
    const out = phaseFrame(spr);
    for (const [k, alpha] of [[1, 1], [0.27, 1], [1, 0.35], [0.46, 0.55]]) {
      const shown = phaseOver(out, GRASS, k, alpha);
      let figure = 0;
      let blue = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        if (spr.rgba[i * 4 + 3] < 24) continue;
        figure++;
        if (shown[i * 4 + 2] > shown[i * 4 + 1]) blue++;
      }
      assert.ok(blue / figure > 0.9, `k ${k}, alpha ${alpha}: blue in ${Math.round((100 * blue) / figure)}%`);
    }
  });
});
