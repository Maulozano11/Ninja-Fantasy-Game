// The characters' dark line for the solid parts of jutsu effects (tools/world-sprites/solid-outline.ts):
// it goes outside the silhouette of the solid pieces only, never over a pixel of the drawing, never
// around droplets, spray or faint mist, and never as a second line outside his own dark line. Off by
// default: the water dragon's sheet stays the approved one until the owner says yes.
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { INK, outlineFor, particleColours, solidMask, solidOutline, solidOutlineFrames } from '../../tools/world-sprites/solid-outline';
import { buildWaterDragon } from '../../tools/world-sprites/vfx-beast-waterdragon';

const W = 40, H = 30;
const BODY = [60, 140, 200], DROP = [200, 230, 245], LINE = [1, 7, 26];
const luma = (p: ArrayLike<number>, i: number) => p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11;

function canvas(): Uint8Array {
  return new Uint8Array(W * H * 4);
}
function put(px: Uint8Array, x: number, y: number, c: number[], a = 255): void {
  px.set([...c, a], (y * W + x) * 4);
}
/** A filled disc of the body colour. */
function disc(px: Uint8Array, cx: number, cy: number, r: number, c = BODY): void {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(px, x, y, c);
}
const at = (px: ArrayLike<number>, x: number, y: number) => Array.from({ length: 4 }, (_, k) => px[(y * W + x) * 4 + k]);

describe('solid outline: the characters\' line around solid jutsu parts', () => {
  it('lays a 1 px near-black line outside the body; every pixel of the drawing keeps its colour', () => {
    const px = canvas();
    disc(px, 20, 15, 8);
    const { rgba, added } = solidOutline(px, W, H);
    assert.ok(added > 30, `added ${added}`);
    for (let i = 0; i < W * H; i++) {
      if (px[i * 4 + 3]) assert.deepEqual(at(rgba, i % W, (i / W) | 0), at(px, i % W, (i / W) | 0));
      else if (rgba[i * 4 + 3]) {
        assert.ok(luma(rgba, i) < 20, 'the line is near-black');
        // It touches the body on a side, so the line is 1 px: no line pixel lies two steps out.
        const x = i % W, y = (i / W) | 0;
        assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => px[((y + dy) * W + x + dx) * 4 + 3]));
      }
    }
    // Straight out from the disc's rim: one line pixel, then clear.
    assert.equal(rgba[(15 * W + 29) * 4 + 3], 255);
    assert.equal(rgba[(15 * W + 30) * 4 + 3], 0);
  });

  it('uses the characters\' rule for the colour: the darkest ramp step pulled 70% toward #07060b', () => {
    const [r, g, b] = outlineFor(151, 196, 217);
    const ink = [7, 6, 11];
    for (const [v, k] of [[r, 0], [g, 1], [b, 2]] as const) assert.ok(Math.abs(v - ink[k]) <= 20, `${[r, g, b]} vs ${INK}`);
    assert.ok(b >= r, 'a blue surface gives a line with a whisper of blue');
  });

  it('leaves droplets and faint mist without a line', () => {
    const px = canvas();
    disc(px, 12, 15, 8);
    for (const [x, y] of [[30, 5], [31, 5], [30, 6], [34, 20]]) put(px, x, y, DROP); // spray, apart from the body
    put(px, 25, 15, BODY, 60); // faint mist beside it
    const { rgba } = solidOutline(px, W, H);
    for (const [x, y] of [[29, 5], [32, 5], [30, 4], [30, 7], [33, 20], [35, 20]]) assert.equal(rgba[(y * W + x) * 4 + 3], 0, `around a droplet at ${x},${y}`);
    // The faint mist pixel is not part of the body: the line goes where the body ends (x 21), not round the mist.
    assert.equal(rgba[(15 * W + 21) * 4 + 3], 255);
    assert.equal(rgba[(15 * W + 26) * 4 + 3], 0);
  });

  it('a piece small next to the biggest one is a particle too (minShare)', () => {
    const px = canvas();
    disc(px, 12, 15, 9); // about 250 px
    disc(px, 33, 8, 2.5); // about 20 px: a puff that came off, under 15% of the body
    const solid = solidMask(px, W, H, { minArea: 10 });
    assert.equal(solid[15 * W + 12], 1);
    assert.equal(solid[8 * W + 33], 0);
    assert.equal(solidMask(px, W, H, { minArea: 10, minShare: 0 })[8 * W + 33], 1);
  });

  it('a droplet touching the body keeps no line when its colour lives in the spray over the animation', () => {
    const frames = [0, 1, 2].map((k) => {
      const px = canvas();
      disc(px, 12, 15, 8);
      if (k < 2) for (const [x, y] of [[30, 5 + k], [33, 18], [27, 24]]) put(px, x, y, DROP); // apart
      else for (const [x, y] of [[21, 15], [22, 15], [22, 14]]) put(px, x, y, DROP); // the drop splashes on the body's side
      return { px, w: W, h: H };
    });
    const spray = particleColours(frames);
    assert.ok(spray.has((DROP[0] << 16) | (DROP[1] << 8) | DROP[2]));
    assert.ok(!spray.has((BODY[0] << 16) | (BODY[1] << 8) | BODY[2]));
    const out = solidOutlineFrames(frames)[2];
    for (const [x, y] of [[23, 15], [22, 13], [23, 14]]) assert.equal(out[(y * W + x) * 4 + 3], 0, `no line around the drop at ${x},${y}`);
  });

  it('the generator can name its own energy colours (dust, mist) that stay unlined though attached', () => {
    const px = canvas();
    disc(px, 12, 15, 8);
    disc(px, 24, 15, 4, [190, 150, 90]); // a dust puff stuck to the body
    const dust = (r: number, g: number, b: number) => r > b + 25 && r >= g;
    const plain = solidOutline(px, W, H).rgba, told = solidOutline(px, W, H, { particleColour: dust }).rgba;
    assert.equal(plain[(15 * W + 29) * 4 + 3], 255);
    assert.equal(told[(15 * W + 29) * 4 + 3], 0);
  });

  it('never stacks a second line outside his own dark line', () => {
    const px = canvas();
    disc(px, 20, 15, 8, LINE);
    disc(px, 20, 15, 7);
    const { added } = solidOutline(px, W, H);
    assert.equal(added, 0);
  });
});

describe('the water dragon with the option', () => {
  it('is off by default: the default build is the approved sheet', () => {
    const def = buildWaterDragon(), off = buildWaterDragon({ outline: false });
    assert.deepEqual(def.anchor, off.anchor);
    def.anims.fly.frames.forEach((f, i) => assert.deepEqual(f.px, off.anims.fly.frames[i].px));
  });

  it('with it on, his pixels stay his; only a few near-black line pixels are added outside the body', () => {
    const off = buildWaterDragon({ outline: false }), on = buildWaterDragon({ outline: true });
    assert.deepEqual(on.anchor, off.anchor);
    let added = 0;
    on.anims.fly.frames.forEach((f, k) => {
      const o = off.anims.fly.frames[k];
      assert.equal(f.w, o.w);
      assert.equal(f.h, o.h);
      for (let i = 0; i < f.w * f.h; i++) {
        if (o.px[i * 4 + 3]) assert.deepEqual(Array.from(f.px.subarray(i * 4, i * 4 + 4)), Array.from(o.px.subarray(i * 4, i * 4 + 4)));
        else if (f.px[i * 4 + 3]) {
          added++;
          assert.ok(luma(f.px, i) < 25);
        }
      }
    });
    // His drake already carries his dark navy line: the option only closes its gaps (claw and fin tips).
    assert.ok(added > 20 && added < 300, `added ${added}`);
  });
});
