// Tests for the owner's Roman legate's chest set (docs/reference/roman-legate-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { LEGATE_FIGURE, LEGATE_FIGURE_AT } from './legateFigureArt';
import { GRID } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const look = (body: 'male' | 'bulky' = 'male'): SpriteAppearance => ({ ...structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_roman_legate')!.character.appearance!), body });
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

describe("the owner's Roman legate", () => {
  it('shows his chest set pixel for pixel at male idle frame 0, but where our Roman chin and neck stand over the cuirass\'s top', () => {
    const f = renderSprite(look(), 'idle', 0);
    const wrong: string[] = [];
    LEGATE_FIGURE.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        const p = (LEGATE_FIGURE_AT[1] + j) * GRID + LEGATE_FIGURE_AT[0] + i;
        if (f.rgba[p * 4 + 3] === 0 || hex(f.rgba, p) !== LEGATE_FIGURE.colors[row[i]]) wrong.push(`${LEGATE_FIGURE_AT[0] + i},${LEGATE_FIGURE_AT[1] + j}`);
      }
    });
    assert.deepEqual(wrong, KNOWN);
  });

  it('is a male set: none of his pieces fits the female body', () => {
    for (const id of ['armor_legate', 'acc_legate_pauldrons', 'top_legate_sleeves']) {
      const d = getItem(id);
      assert.ok(d, id);
      assert.deepEqual(d!.bodies, ['male', 'bulky'], id);
    }
  });

  it('renders every pose on both male bodies', () => {
    const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
    for (const body of ['male', 'bulky'] as const)
      for (const pose of POSES) {
        const f = renderSprite(look(body), pose, 0);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] > 0) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
      }
  });
});

// His cuirass goes on up under his beard to the neck (legate_ref.more_of): there our Roman's chin and neck are in front.
const KNOWN = ['127,144', '128,144', '129,144', '124,145', '125,145', '126,145', '127,145', '128,145', '129,145', '130,145', '131,145'];
