// Tests for Lyra's sword (the Gilded Rapier, held_gilded_rapier): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { LYRA_RAPIER, LYRA_SWORD_BLADE, LYRA_SWORD_GUARD } from './items/lyraSwordArt';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { SpriteAppearance } from './types';

const look = (colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body: 'female',
  slots: { held: { id: 'held_gilded_rapier', colors } },
});

describe('Lyra gilded rapier', () => {
  it('is a held item with his blade cyan and guard gold as defaults', () => {
    const item = getItem('held_gilded_rapier');
    assert.equal(item?.slot, 'held');
    assert.deepEqual(item!.colors.map((c) => c.default), [LYRA_SWORD_BLADE, LYRA_SWORD_GUARD]);
  });

  it('pivots on its grip, uses only its own colours and keeps its sparkles inside the template', () => {
    const [px, py] = LYRA_RAPIER.pivot;
    assert.notEqual(LYRA_RAPIER.rows[py][px], '.');
    for (const r of LYRA_RAPIER.rows) for (const ch of r) assert.ok(ch === '.' || ch in LYRA_RAPIER.colors, ch);
    for (const [x, y, ch] of LYRA_RAPIER.sparks) {
      assert.ok(y < LYRA_RAPIER.rows.length && x < LYRA_RAPIER.rows[y].length, `spark ${x},${y}`);
      assert.ok(LYRA_RAPIER.blade.includes(ch));
    }
  });

  it('draws in every pose, and recolours the blade and the guard', () => {
    for (const pose of ['idle', 'attack', 'victory', 'walk', 'downed', 'handsigns', 'sit', 'train'] as const) renderSprite(look(), pose, 0);
    const a = renderSprite(look(), 'idle', 0).rgba;
    assert.notDeepEqual(a, renderSprite(look(['#ff6040', LYRA_SWORD_GUARD]), 'idle', 0).rgba);
    assert.notDeepEqual(a, renderSprite(look([LYRA_SWORD_BLADE, '#c0c0d0']), 'idle', 0).rgba);
  });
});
