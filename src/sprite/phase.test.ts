// Tests for the Ryusei's phase body (a sprite frame turned into blue light): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSpriteCached } from './compose';
import { getAppearance } from './legacy';
import { GLOW, PHASE_RAMP, phaseBody, phaseFrame } from './phase';
import { GRID } from './raster';
import { LEGENDARY_PRESETS } from '../data/shinobiData';

const px = (b: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(b.subarray((y * w + x) * 4, (y * w + x) * 4 + 4));

describe('phase body', () => {
  it('turns a figure into light: a near-white silhouette, a see-through blue inside and a fading glow round it', () => {
    // A 10 x 10 grey square in a 32 x 32 frame.
    const w = 32;
    const src = new Uint8ClampedArray(w * w * 4);
    for (let y = 11; y < 21; y++) for (let x = 11; x < 21; x++) src.set([120, 110, 100, 255], (y * w + x) * 4);
    const out = phaseBody(src, w, w);
    // The silhouette: the brightest step, opaque.
    assert.deepEqual(px(out, w, 11, 15), [...PHASE_RAMP[8], 255]);
    // Deep inside: blue, and the ground shows through.
    const [r, g, b, a] = px(out, w, 15, 15);
    assert.ok(b > r && b > g && a < 255, `inside ${[r, g, b, a]}`);
    // The glow steps out and fades; past its reach nothing is drawn.
    const glow = [1, 2, 3, 4, 5].map((d) => px(out, w, 10 - d + 1, 15)[3]);
    assert.deepEqual(glow, [...GLOW.slice(1)]);
    assert.equal(px(out, w, 10 - GLOW.length + 1, 15)[3], 0);
    assert.equal(px(out, w, 0, 0)[3], 0);
    // An empty frame stays empty.
    assert.ok(phaseBody(new Uint8ClampedArray(w * w * 4), w, w).every((v) => v === 0));
  });

  it('a ninja\'s phase body is blue light where the sprite is, with its hair lit', () => {
    const look = getAppearance(LEGENDARY_PRESETS[0].character);
    const spr = renderSpriteCached(look, 'run', 2);
    assert.ok(spr.hair?.some((v) => v), 'the hair is marked');
    const out = phaseFrame(spr);
    let figure = 0;
    let blue = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (spr.rgba[i * 4 + 3] === 0) continue;
      figure++;
      assert.ok(out[i * 4 + 3] > 0, 'every pixel of the figure is in the phase body');
      if (out[i * 4 + 2] >= out[i * 4] && out[i * 4 + 2] >= out[i * 4 + 1]) blue++;
    }
    assert.equal(blue, figure);
  });
});
