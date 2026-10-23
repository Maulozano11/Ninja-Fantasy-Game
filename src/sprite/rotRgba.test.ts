// Tests for RotSprite on RGBA frames (rotRgba.ts), which turns the jutsu effects to their aim:
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rotSpriteRgba } from './rotRgba';
import type { Rgba } from './rotRgba';

/** A w x h frame whose pixel (x, y) is colour(x, y) ([r, g, b, a]). */
function frame(w: number, h: number, colour: (x: number, y: number) => [number, number, number, number]): Rgba {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(colour(x, y), (y * w + x) * 4);
  return { w, h, data };
}

const px = (f: Rgba, x: number, y: number): string => Array.from(f.data.subarray((y * f.w + x) * 4, (y * f.w + x) * 4 + 4)).join(',');

/** A small sprite: a dark outlined blob with a bright core and a clear background. */
const blob = frame(12, 9, (x, y) => {
  const d = Math.hypot((x - 5.5) / 5, (y - 4) / 3.5);
  if (d > 1) return [0, 0, 0, 0];
  if (d > 0.78) return [7, 6, 11, 255];
  return x > 6 ? [250, 200, 60, 255] : [200, 80, 20, 255];
});

describe('RotSprite on RGBA frames', () => {
  it('gives the frame back unchanged at 0 degrees, its pivot where it was', () => {
    const t = rotSpriteRgba(blob, [3, 4], 0);
    assert.equal(t.w, blob.w);
    assert.equal(t.h, blob.h);
    assert.deepEqual(Array.from(t.data), Array.from(blob.data));
    assert.deepEqual([t.ox, t.oy], [3, 4]);
    assert.deepEqual(Array.from(rotSpriteRgba(blob, [3, 4], 360).data), Array.from(blob.data));
  });

  it('turns a quarter turn exactly, pixel for pixel', () => {
    // All colours different: Scale2x changes nothing, so a quarter turn is an exact one.
    const f = frame(3, 2, (x, y) => [x * 80, y * 120, 7, 255]);
    const t = rotSpriteRgba(f, [0, 0], 90);
    assert.equal(t.w, 2);
    assert.equal(t.h, 3);
    // Clockwise (y points down): (x, y) goes to (h - 1 - y, x); the pivot corner stays on (0, 0).
    for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) assert.equal(px(t, 1 - y, x), px(f, x, y));
    assert.deepEqual([t.ox, t.oy], [2, 0]);
  });

  it('never invents a colour: every pixel turned is one of the frame\'s own', () => {
    const own = new Set<string>();
    for (let y = 0; y < blob.h; y++) for (let x = 0; x < blob.w; x++) own.add(px(blob, x, y));
    for (const deg of [15, 30, 45, -60, 75, -90]) {
      for (const scale of [4, 8] as const) {
        const t = rotSpriteRgba(blob, [6, 4], deg, scale);
        for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
          const c = px(t, x, y);
          assert.ok(c === '0,0,0,0' || own.has(c), `${deg} degrees, ${scale}x: ${c}`);
        }
      }
    }
  });

  it('keeps the pivot on the same part of the sprite', () => {
    // The pixel just right of and below the pivot is the core; turned, the pixel at the pivot's
    // place still is (a turn round the pivot never moves what is on it).
    for (const deg of [15, 30, 45, -45, 90]) {
      const t = rotSpriteRgba(blob, [6, 4], deg);
      assert.equal(px(t, t.ox, t.oy), px(blob, 6, 4), `${deg} degrees`);
    }
  });

  it('keeps about as many solid pixels at any angle (no holes, no smears)', () => {
    const solid = (f: Rgba) => {
      let n = 0;
      for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) n++;
      return n;
    };
    const n0 = solid(blob);
    for (const deg of [15, 30, 45, 60, 75]) {
      const n = solid(rotSpriteRgba(blob, [6, 4], deg));
      assert.ok(Math.abs(n - n0) <= n0 * 0.12, `${deg} degrees: ${n} of ${n0}`);
    }
  });
});
