// Tests for the owner's Elise's hair (hair_golden_fall, items/eliseHairArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { hexToRgb } from './color';
import { renderSpriteCached } from './compose';
import { ELISE_HAIR_BACK, ELISE_HAIR_BASE, ELISE_HAIR_FALL, ELISE_HAIR_FRONT, ELISE_HAIR_LINE, ELISE_HAIR_WISP, ELISE_ORNAMENT, ELISE_ORNAMENT_BASE } from './items/eliseHairArt';
import { GRID, RES } from './raster';
import type { BodyType, SpriteAppearance } from './types';
import { DEFAULT_CHARACTER } from '../data/shinobiData';

const look = (body: BodyType, colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body,
  slots: { hair: { id: 'hair_golden_fall', colors } },
  accessories: [],
});

/** The face anchor (body.ts faceAnchor) of a rendered frame. */
const anchor = (f: ReturnType<typeof renderSpriteCached>): [number, number] => {
  const k = f.rig.bp.headScale;
  return [Math.floor((f.rig.head.x - 1.9 * k) * RES), Math.floor((f.rig.head.y + 1.0 * k) * RES)];
};

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number): string => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

describe('hair_golden_fall', () => {
  it('is a hairstyle with her blonde and her flower gold as its colour slots', () => {
    const def = getItem('hair_golden_fall')!;
    assert.equal(def.slot, 'hair');
    assert.deepEqual(def.colors.map((c) => [c.key, c.default]), [['hair', ELISE_HAIR_BASE], ['ornament', ELISE_ORNAMENT_BASE]]);
  });

  it('has whole pictures: even rows, every character coloured, the pivots inside', () => {
    for (const p of [ELISE_HAIR_FRONT, ELISE_HAIR_BACK, ELISE_HAIR_FALL, ELISE_HAIR_WISP]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/, `'${ch}'`);
    }
    for (const p of [ELISE_HAIR_FRONT, ELISE_HAIR_BACK, ELISE_HAIR_FALL]) assert.ok(p.pivot[0] >= 0 && p.pivot[0] < p.rows[0].length && p.pivot[1] >= 0 && p.pivot[1] < p.rows.length);
    assert.notEqual(ELISE_HAIR_FALL.rows[ELISE_HAIR_FALL.pivot[1]][ELISE_HAIR_FALL.pivot[0]], '.', 'the fall hangs from a pixel of hers');
    // the loose strand rides with the fall: the same pivot in our frame
    assert.equal(ELISE_HAIR_WISP.angle, ELISE_HAIR_FALL.angle);
  });

  it('shows her pixels in her colours over our female head at idle', () => {
    const f = renderSpriteCached(look('female'), 'idle', 0);
    const [nx, ny] = anchor(f);
    const p = ELISE_HAIR_FRONT;
    let seen = 0;
    p.rows.forEach((row, j) => {
      const y = ny - p.pivot[1] + j;
      if (y >= ny) return; // above the eyes: nothing of ours is drawn over her hair there
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        assert.equal(hexAt(f.rgba, nx - p.pivot[0] + i, y), p.colors[row[i]], `(${i}, ${j})`);
        seen++;
      }
    });
    assert.ok(seen > 250);
  });

  it('recolours her golds and her flower but keeps her darkest line', () => {
    const plain = renderSpriteCached(look('female'), 'idle', 0);
    const black = renderSpriteCached(look('female', ['#2a2230', ELISE_ORNAMENT_BASE]), 'idle', 0);
    const silver = renderSpriteCached(look('female', [ELISE_HAIR_BASE, '#c0c8d8']), 'idle', 0);
    const [nx, ny] = anchor(plain);
    const p = ELISE_HAIR_FRONT;
    p.rows.forEach((row, j) => {
      const y = ny - p.pivot[1] + j;
      if (y >= ny) return;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const x = nx - p.pivot[0] + i;
        const was = hexAt(plain.rgba, x, y);
        if (ELISE_HAIR_LINE.includes(ch)) assert.equal(hexAt(black.rgba, x, y), was, 'her line stays');
        else if (ELISE_ORNAMENT.includes(ch)) {
          assert.equal(hexAt(black.rgba, x, y), was, 'the flower keeps its gold with a new hair colour');
          assert.notEqual(hexAt(silver.rgba, x, y), was, 'the flower takes its own colour');
        } else {
          const [r, g, b] = hexToRgb(hexAt(black.rgba, x, y));
          assert.ok(r + g + b < hexToRgb(was).reduce((a, c) => a + c, 0), 'her golds darken with black hair');
          assert.equal(hexAt(silver.rgba, x, y), was, 'a new flower colour leaves the hair');
        }
      }
    });
  });

  it('draws on every body, in every pose, laid down too', () => {
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[]) {
      for (const pose of ['idle', 'attack', 'run', 'crouch', 'downed', 'sit'] as const) {
        const bald = renderSpriteCached({ ...look(body), slots: {} }, pose, 0).rgba;
        assert.notDeepEqual(renderSpriteCached(look(body), pose, 0).rgba, bald, `${body} ${pose}`);
      }
    }
  });
});
