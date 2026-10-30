// Tests for the owner's Roman legate's chest set (docs/reference/roman-legate-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite, spriteLayers } from './compose';
import { LEGATE_FIGURE, LEGATE_FIGURE_AT } from './legateFigureArt';
import { GRID, partIndex } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const look = (body: 'male' | 'bulky' = 'male'): SpriteAppearance => ({ ...structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_roman_legate')!.character.appearance!), body });
const OUR_ARM = new Set([partIndex('upperArmN'), partIndex('forearmN'), partIndex('handN')]);
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

describe("the owner's Roman legate", () => {
  it('shows his chest set pixel for pixel at male idle frame 0, but where our near arm hangs in front of it', () => {
    const f = renderSprite(look(), 'idle', 0);
    // (his cuirass, widened at the stomach, runs on under our near arm's skin at rest: the figure cannot know our arm;
    // his own pauldron and sleeve on that arm are the figure's and are checked)
    const { layers } = spriteLayers(look(), 'idle', 0);
    const arm = [...layers].filter(([d, l]) => l.used && d === 'nearArm.body').map(([, l]) => l);
    const wrong: string[] = [];
    LEGATE_FIGURE.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        const p = (LEGATE_FIGURE_AT[1] + j) * GRID + LEGATE_FIGURE_AT[0] + i;
        if (arm.some((l) => l.mat[p] >= 0 && OUR_ARM.has(l.part[p]))) continue;
        if (f.rgba[p * 4 + 3] === 0 || hex(f.rgba, p) !== LEGATE_FIGURE.colors[row[i]]) wrong.push(`${LEGATE_FIGURE_AT[0] + i},${LEGATE_FIGURE_AT[1] + j}`);
      }
    });
    assert.deepEqual(wrong, []);
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
