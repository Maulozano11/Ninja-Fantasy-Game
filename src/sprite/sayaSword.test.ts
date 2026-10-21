// Tests for Saya's sword (the Shade Saber, held_shade_saber): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { SAYA_SABER, SAYA_SABER_LEVEL, SAYA_SWORD_BLADE, SAYA_SWORD_GUARD } from './items/sayaSwordArt';
import { weaponOf } from '../battle/units';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { SpriteAppearance } from './types';

const look = (colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body: 'female',
  slots: { held: { id: 'held_shade_saber', colors } },
});

describe('Saya shade saber', () => {
  it('is a held item with her blade steel and hilt gold as defaults', () => {
    const item = getItem('held_shade_saber');
    assert.equal(item?.slot, 'held');
    assert.deepEqual(item!.colors.map((c) => c.default), [SAYA_SWORD_BLADE, SAYA_SWORD_GUARD]);
  });

  it('pivots on its grip in both drawings and keeps its sparkles inside them', () => {
    for (const t of [SAYA_SABER, SAYA_SABER_LEVEL]) {
      const [px, py] = t.pivot;
      assert.notEqual(t.rows[py][px], '.');
      for (const [x, y, ch] of t.sparks) {
        assert.ok(y < t.rows.length && x < t.rows[y].length, `spark ${x},${y}`);
        assert.equal(t.rows[y][x], '.', `spark ${x},${y} on the sword`);
        assert.ok(t.blade.includes(ch));
      }
    }
  });

  it('draws in every pose, and recolours the blade', () => {
    for (const pose of ['idle', 'attack', 'victory', 'walk', 'crouch', 'downed', 'handsigns', 'sit'] as const) renderSprite(look(), pose, 0);
    const a = renderSprite(look(), 'idle', 0).rgba;
    const b = renderSprite(look(['#40c0ff', SAYA_SWORD_GUARD]), 'idle', 0).rgba;
    assert.notDeepEqual(a, b);
  });

  it('fights as a finesse saber', () => {
    const w = weaponOf({ ...DEFAULT_CHARACTER, appearance: look() });
    assert.equal(w.dice, '1d8');
    assert.equal(w.type, 'Slashing');
    assert.equal(w.finesse, true);
  });
});
