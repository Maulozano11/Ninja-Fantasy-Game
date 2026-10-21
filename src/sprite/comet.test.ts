// Tests for the shooting star of the Shooting-Star Thrust (comet.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cometNose, cometRaster, cometTail } from './comet';
import type { CometPath, CometRaster } from './comet';
import { PHASE_RAMP } from './phase';

/** A head flying `len` pixels to the right along the middle of the row of pixels at y = 0, in `fly` ms, at an even speed. */
const straight = (len: number, fly: number): CometPath => ({ at: (w) => ({ x: w * len, y: 0.5 }), msAt: (w) => w * fly });
/** A head flying a half circle of radius `rad` round (0, 0), from (-rad, 0) over the top to (rad, 0), in `fly` ms. */
const arc = (rad: number, fly: number): CometPath => ({
  at: (w) => ({ x: -rad * Math.cos(Math.PI * w), y: -rad * Math.sin(Math.PI * w) }),
  msAt: (w) => w * fly,
});

const alphaAt = (c: CometRaster, x: number, y: number): number => {
  const px = Math.floor(x) - c.x;
  const py = Math.floor(y) - c.y;
  if (px < 0 || py < 0 || px >= c.w || py >= c.h) return 0;
  return c.core[(py * c.w + px) * 4 + 3];
};
const rgbAt = (c: CometRaster, x: number, y: number): number[] => {
  const i = ((Math.floor(y) - c.y) * c.w + Math.floor(x) - c.x) * 4;
  return [c.core[i], c.core[i + 1], c.core[i + 2]];
};
/** How many pixels of the ribbon a column at x crosses (its width there). */
const widthAt = (c: CometRaster, x: number): number => {
  let n = 0;
  for (let y = c.y; y < c.y + c.h; y++) if (alphaAt(c, x, y) > 0) n++;
  return n;
};

describe('the shooting star of the Shooting-Star Thrust', () => {
  it('is white and widest at its head, tapering through the blues to one faint pixel', () => {
    // Mid-flight: the head at x 200, a tail of up to 150 px.
    const tail = cometTail(straight(400, 400), 0.5, 200, 150, 150, 4.5);
    const c = cometRaster(tail)!;
    assert.deepEqual(rgbAt(c, 199.5, 0.5), [...PHASE_RAMP[8]]);
    const widths = [196, 170, 140, 110, 80, 62].map((x) => widthAt(c, x + 0.5));
    for (let i = 1; i < widths.length; i++) assert.ok(widths[i] <= widths[i - 1], `narrower further back: ${widths}`);
    assert.ok(widths[0] >= 8, `wide at the head: ${widths}`);
    assert.ok(widths[widths.length - 1] <= 1, `one pixel at the end: ${widths}`);
    // Its heart goes from white to a deep blue, and grows clearer.
    const heart = (x: number) => rgbAt(c, x + 0.5, 0.5);
    assert.ok(heart(120)[0] < heart(190)[0] && heart(80)[0] < heart(120)[0], 'darker toward the end');
    assert.ok(alphaAt(c, 70.5, 0.5) < alphaAt(c, 190.5, 0.5));
    // Nothing ahead of the head, nor past the tail's length.
    assert.equal(alphaAt(c, 206.5, 0.5), 0);
    assert.equal(alphaAt(c, 45.5, 0.5), 0);
  });

  it('is as long as the way its head went in its last moments, never longer than its cap nor from before the throw', () => {
    // A slow head (100 px in 400 ms): 150 ms of it is about 37 px.
    const slow = cometTail(straight(100, 400), 1, 400, 150, 150, 4);
    const lenSlow = Math.hypot(slow[0].x - slow[slow.length - 1].x, slow[0].y - slow[slow.length - 1].y);
    assert.ok(lenSlow > 30 && lenSlow < 39, `${lenSlow}`);
    // A fast one is capped.
    const fast = cometTail(straight(2000, 400), 0.8, 320, 150, 150, 4);
    const lenFast = Math.hypot(fast[0].x - fast[fast.length - 1].x, fast[0].y - fast[fast.length - 1].y);
    assert.ok(lenFast > 140 && lenFast <= 150, `${lenFast}`);
    // Just after the throw it only reaches back to where the flight began.
    const early = cometTail(straight(400, 400), 0.05, 20, 150, 150, 4);
    assert.ok(early.every((s) => s.x >= 0));
    // And tapers all the same, not cut off blunt where the flight began.
    assert.ok(early[0].r > 3.5 && early[early.length - 1].r < 1, `${early[0].r} → ${early[early.length - 1].r}`);
  });

  it('follows the curve of the flight, not a straight line', () => {
    // Half way round a half circle of radius 120: the tail bends with it.
    const tail = cometTail(arc(120, 400), 0.75, 300, 200, 160, 4);
    const c = cometRaster(tail)!;
    let lit = 0;
    for (let y = 0; y < c.h; y++)
      for (let x = 0; x < c.w; x++) {
        if (c.core[(y * c.w + x) * 4 + 3] === 0) continue;
        lit++;
        const off = Math.abs(Math.hypot(c.x + x + 0.5, c.y + y + 0.5) - 120);
        assert.ok(off <= 5, `a pixel ${off.toFixed(1)} px off the curve`);
      }
    assert.ok(lit > 300);
    // It reaches round the bend: lit near the top of the circle as well as at the head.
    assert.ok(alphaAt(c, 0, -120) > 0 || alphaAt(c, -1, -120) > 0);
    assert.ok(alphaAt(c, 120 * Math.cos(Math.PI / 4), -120 * Math.sin(Math.PI / 4)) > 0);
  });

  it('runs on into the head and cools once it stops', () => {
    const path = straight(300, 300);
    const at = (ms: number) => cometTail(path, Math.min(1, ms / 300), ms, 150, 200, 4);
    const len = (t: ReturnType<typeof at>) => (t.length ? t[0].x - t[t.length - 1].x : 0);
    assert.ok(len(at(300)) > 100);
    assert.ok(len(at(360)) < len(at(300)) && len(at(420)) < len(at(360)));
    assert.ok(at(360)[0].v < at(300)[0].v, 'cooler at its head');
    assert.equal(at(450).length, 0);
  });

  it('is the same every time, and keeps off what the mask hides', () => {
    const tail = cometTail(arc(90, 300), 0.6, 180, 150, 140, 4);
    const a = cometRaster(tail)!;
    const b = cometRaster(cometTail(arc(90, 300), 0.6, 180, 150, 140, 4))!;
    assert.deepEqual([a.x, a.y, a.w, a.h], [b.x, b.y, b.w, b.h]);
    assert.ok(Buffer.from(a.core).equals(Buffer.from(b.core)) && Buffer.from(a.halo).equals(Buffer.from(b.halo)));
    const masked = cometRaster(tail, 1, (x) => (x < 0 ? 0 : 1))!;
    for (let y = 0; y < masked.h; y++)
      for (let x = 0; x < masked.w; x++) if (masked.x + x + 0.5 < 0) assert.equal(masked.core[(y * masked.w + x) * 4 + 3] + masked.halo[(y * masked.w + x) * 4 + 3], 0);
    // A faded comet is fainter, not smaller.
    const faint = cometRaster(tail, 0.5)!;
    assert.equal(faint.w, a.w);
    assert.ok(faint.core.some((v, i) => i % 4 === 3 && v > 0 && v < 255));
  });

  it('wraps the weapon in a white-hot head, widest at its back end', () => {
    const nose = cometNose({ x: 0, y: 0 }, { x: 40, y: 0 }, 4.5, 1.5);
    const c = cometRaster(nose)!;
    assert.ok(widthAt(c, 1.5) > widthAt(c, 38.5));
    // White round the blade: the pixels 2 and 3 px off its line near the back are white and near-white.
    assert.deepEqual(rgbAt(c, 4.5, 2.5), [...PHASE_RAMP[8]]);
    assert.deepEqual(rgbAt(c, 4.5, 3.5), [...PHASE_RAMP[7]]);
  });
});
