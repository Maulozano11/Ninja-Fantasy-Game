// Tests for Saya's leggings (feet_shade_wraps), copied from the owner's Saya picture at our scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { GRID } from './raster';
import type { SpriteAppearance } from './types';

const hexAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};

function look(colors: string[] = []): SpriteAppearance {
  const base = DEFAULT_CHARACTER.appearance!;
  return { ...base, body: 'female', slots: { feet: { id: 'feet_shade_wraps', colors } }, pixelEdits: [] };
}

describe('Shade Wraps', () => {
  it('is a women-only feet item with her colours as defaults', () => {
    const item = getItem('feet_shade_wraps')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female']);
    assert.deepEqual(item.colors.map((c) => c.default), ['#374061', '#a63133', '#374061']);
  });

  it('stands at rest where he drew it: his knee pad, his red band, his shoe and sole', () => {
    const f = renderSprite(look(), 'idle', 0);
    assert.equal(hexAt(f.rgba, 118, 194), '#374061'); // near knee pad, lit
    assert.equal(hexAt(f.rgba, 118, 199), '#a63133'); // near shin's red band
    assert.equal(hexAt(f.rgba, 114, 216), '#374061'); // near shoe
    assert.equal(hexAt(f.rgba, 113, 217), '#3e2a25'); // near sole
    assert.equal(hexAt(f.rgba, 139, 210), '#374061'); // far shoe's plate, where he drew it
  });

  it('recolours cloth, band and shoe from the colour slots and keeps his black line and sole', () => {
    const f = renderSprite(look(['#2f6b3a', '#d8b04a', '#5a3a22']), 'idle', 0);
    assert.notEqual(hexAt(f.rgba, 118, 194), '#374061');
    assert.notEqual(hexAt(f.rgba, 118, 199), '#a63133');
    assert.notEqual(hexAt(f.rgba, 114, 216), '#374061');
    assert.equal(hexAt(f.rgba, 113, 217), '#3e2a25');
    assert.equal(hexAt(f.rgba, 112, 199), '#010102');
  });
});
