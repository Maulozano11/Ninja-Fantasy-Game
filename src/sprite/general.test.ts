// Tests for the owner's Roman general (docs/reference/roman-general-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { GENERAL_MUSCLE_FIGURE, GENERAL_MUSCLE_FIGURE_AT, GENERAL_SPIRAL_FIGURE, GENERAL_SPIRAL_FIGURE_AT } from './generalFigureArt';
import { GRID } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const look = (id: string, body: 'male' | 'bulky' = 'male'): SpriteAppearance => ({ ...structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character.appearance!), body });
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** The pixels of his set (as the scripts drew it at rest) the game shows otherwise at male idle frame 0. */
function wrong(id: string, fig: { rows: string[]; colors: Record<string, string> }, at: [number, number]): string[] {
  const f = renderSprite(look(id), 'idle', 0);
  const out: string[] = [];
  fig.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const p = (at[1] + j) * GRID + at[0] + i;
      if (f.rgba[p * 4 + 3] === 0 || hex(f.rgba, p) !== fig.colors[row[i]]) out.push(`${at[0] + i},${at[1] + j}`);
    }
  });
  return out;
}

describe("the owner's Roman general", () => {
  it('shows his spiral set, face and hair pixel for pixel at male idle frame 0', () => {
    assert.deepEqual(wrong('preset_bronze_general_spiral', GENERAL_SPIRAL_FIGURE, GENERAL_SPIRAL_FIGURE_AT), []);
  });

  it('shows his muscle set, face and hair pixel for pixel at male idle frame 0, but where our near arm hangs in front of the cuirass', () => {
    assert.deepEqual(wrong('preset_bronze_general_muscle', GENERAL_MUSCLE_FIGURE, GENERAL_MUSCLE_FIGURE_AT), ['115,161']);
  });

  it('is a male set: none of his pieces fits the female body', () => {
    for (const id of ['armor_general_spiral', 'armor_general_muscle', 'acc_general_pauldrons', 'acc_general_studded_pauldrons', 'top_general_sleeves', 'acc_general_scarf', 'hair_general']) {
      const d = getItem(id);
      assert.ok(d, id);
      assert.deepEqual(d!.bodies, ['male', 'bulky'], id);
    }
  });

  it('renders every pose on both male bodies', () => {
    const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
    for (const id of ['preset_bronze_general_spiral', 'preset_bronze_general_muscle'])
      for (const body of ['male', 'bulky'] as const)
        for (const pose of POSES) {
          const f = renderSprite(look(id, body), pose, 0);
          let n = 0;
          for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] > 0) n++;
          assert.ok(n > 1500, `${id} ${body} ${pose}: ${n} pixels`);
        }
  });
});
