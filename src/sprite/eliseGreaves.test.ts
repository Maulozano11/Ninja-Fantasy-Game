// Tests for Elise's greaves (feet_azure_greaves), lifted from the owner's Elise picture: npm test.

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
  return { ...base, body: 'female', slots: { feet: { id: 'feet_azure_greaves', colors } }, pixelEdits: [] };
}

describe('Azure Greaves', () => {
  it('is a women-only boot in the feet slot with her colours as defaults', () => {
    const item = getItem('feet_azure_greaves')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female', 'slender']);
    assert.deepEqual(item.colors.map((c) => c.default), ['#ced0dc', '#7d564c', '#e6b75e']);
  });

  it('stands at rest where it is drawn: her gold knee cop, her steel greave, her dark sole', () => {
    const f = renderSprite(look(), 'idle', 0);
    assert.equal(hexAt(f.rgba, 118, 189), '#e6b75e'); // near cop's gold rim
    assert.equal(hexAt(f.rgba, 119, 186), '#7d564c'); // near cuff's leather
    assert.equal(hexAt(f.rgba, 118, 199), '#ced0dc'); // near greave's steel
    assert.equal(hexAt(f.rgba, 140, 209), '#181b37'); // far sole
  });

  it('recolours steel, leather and gold from the colour slots and keeps her black line', () => {
    const f = renderSprite(look(['#3b6fd4', '#202020', '#c0c0c0']), 'idle', 0);
    assert.notEqual(hexAt(f.rgba, 118, 199), '#ced0dc');
    assert.notEqual(hexAt(f.rgba, 119, 186), '#7d564c');
    assert.notEqual(hexAt(f.rgba, 118, 189), '#e6b75e');
    assert.equal(hexAt(f.rgba, 116, 199), '#080613');
  });
});
