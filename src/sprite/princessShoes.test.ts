// Tests for the princess's heeled shoes (feet_rose_heels), the owner's pixels from his picture of her at our
// game scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { PRINCESS_SHOE_F, PRINCESS_SHOE_LEGS, PRINCESS_SHOE_N, PRINCESS_STOCKING } from './items/princessShoesArt';
import type { PaintedPiece } from './painted';
import { GRID } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const hexAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};
const alphaAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => rgba[(y * GRID + x) * 4 + 3];

function look(body: BodyType = 'female', colors: string[] = []): SpriteAppearance {
  const base = DEFAULT_CHARACTER.appearance!;
  return { ...base, body, slots: { feet: { id: 'feet_rose_heels', colors } }, pixelEdits: [] };
}

/** The shoes where he drew them (our frame at idle frame 0): (x, y) -> hex. */
function atRest(): Map<string, string> {
  const out = new Map<string, string>();
  const lay = (p: PaintedPiece, foot: readonly [number, number]) => {
    const x0 = foot[0] - 1 - p.pivot[0];
    const y0 = foot[1] - p.pivot[1];
    p.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && out.set(`${x0 + i},${y0 + j}`, p.colors[ch])));
  };
  lay(PRINCESS_SHOE_F, PRINCESS_SHOE_LEGS.F.foot);
  lay(PRINCESS_SHOE_N, PRINCESS_SHOE_LEGS.N.foot);
  return out;
}

describe('Rose Dawn Heels', () => {
  it('is a women-only shoe in the feet slot with her colours as defaults', () => {
    const item = getItem('feet_rose_heels')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female', 'slender']);
    assert.deepEqual(item.colors.map((c) => c.default), ['#eaba5e', '#a884b4']);
  });

  it('stands at idle exactly where he drew it, every pixel his', () => {
    const f = renderSprite(look(), 'idle', 0);
    const rest = atRest();
    for (const [key, hex] of rest) {
      const [x, y] = key.split(',').map(Number);
      assert.equal(hexAt(f.rgba, x, y), hex, `(${x}, ${y})`);
    }
    assert.ok(rest.size > 140);
    // his near toe's light, his far heel, his far sole's line (his pixel (x, y) is our (x + 74, y + 120))
    assert.equal(hexAt(f.rgba, 37 + 74, 96 + 120), '#fdecbb');
    assert.equal(hexAt(f.rgba, 58 + 74, 94 + 120), '#9a663b');
    assert.equal(hexAt(f.rgba, 63 + 74, 96 + 120), '#060317');
  });

  it('recolours gold and stocking from the colour slots and keeps his black line', () => {
    const f = renderSprite(look('female', ['#c0c0c0', '#3b6fd4']), 'idle', 0);
    assert.notEqual(hexAt(f.rgba, 37 + 74, 96 + 120), '#fdecbb');
    assert.notEqual(hexAt(f.rgba, 59 + 74, 90 + 120), '#a884b4');
    assert.equal(hexAt(f.rgba, 63 + 74, 96 + 120), '#060317');
  });

  it('keeps the stocking inside his line in every pose and frame, on both bodies', () => {
    const inner = new Set<string>([PRINCESS_STOCKING.lit, PRINCESS_STOCKING.shade, ...PRINCESS_STOCKING.band]);
    const poses: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const pose of poses) {
        for (const frame of [0, 1, 2, 3]) {
          const f = renderSprite(look(body), pose, frame);
          let n = 0;
          for (let y = 1; y < GRID - 1; y++) {
            for (let x = 1; x < GRID - 1; x++) {
              if (!alphaAt(f.rgba, x, y) || !inner.has(hexAt(f.rgba, x, y))) continue;
              n++;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                assert.ok(alphaAt(f.rgba, x + dx, y + dy), `${body} ${pose} ${frame}: stocking open at (${x}, ${y})`);
              }
            }
          }
          assert.ok(n > 60, `${body} ${pose} ${frame}: stocking drawn`);
        }
      }
    }
  });
});
