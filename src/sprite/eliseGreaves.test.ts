// Tests for Elise's greaves (feet_azure_greaves), lifted from the owner's Elise picture: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { AZURE_FOOT_F } from './items/eliseGreavesArt';
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
    assert.equal(hexAt(f.rgba, 118, 193), '#e6b75e'); // near cop's gold rim
    assert.equal(hexAt(f.rgba, 121, 187), '#7d564c'); // near cuff's leather
    assert.equal(hexAt(f.rgba, 119, 199), '#ced0dc'); // near greave's steel
    assert.equal(hexAt(f.rgba, 140, 209), '#181b37'); // far sole
  });

  it('recolours steel, leather and gold from the colour slots and keeps her black line', () => {
    const f = renderSprite(look(['#3b6fd4', '#202020', '#c0c0c0']), 'idle', 0);
    assert.notEqual(hexAt(f.rgba, 119, 199), '#ced0dc');
    assert.notEqual(hexAt(f.rgba, 121, 187), '#7d564c');
    assert.notEqual(hexAt(f.rgba, 118, 193), '#e6b75e');
    assert.equal(hexAt(f.rgba, 117, 199), '#080613');
  });

  it('gives the far sabaton her shoe: a heel with the arch open behind it, the toe no longer than hers', () => {
    const rows = AZURE_FOOT_F.rows;
    // no wider than her shoe at our scale (about 13 of our pixels with its line)
    assert.ok(Math.max(...rows.map((r) => r.replace(/\.+$/, '').length)) <= 14, rows.join('\n'));
    // the sole's row: her dark sole under the heel, then the arch (her line, nothing under it), then the sole
    const sole = rows[rows.length - 2].replace(/\.+$/, '');
    const under = rows[rows.length - 1];
    const line = Object.entries(AZURE_FOOT_F.colors).find(([, h]) => h === '#080613')![0];
    assert.match(sole, new RegExp(`^${line}[^.${line}]+${line}+[^.${line}]+${line}$`), sole);
    assert.ok(under.includes('..'), `the arch is open under the foot: ${under}`);
  });
});
