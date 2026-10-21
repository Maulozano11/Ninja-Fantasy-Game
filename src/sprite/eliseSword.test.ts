// Tests for Elise's sword (the Azure Rapier, held_azure_rapier): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { ELISE_RAPIER, ELISE_SWORD_BLADE, ELISE_SWORD_GUARD } from './items/eliseSwordArt';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { SpriteAppearance } from './types';

const look = (colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body: 'female',
  slots: { held: { id: 'held_azure_rapier', colors } },
});

describe('Elise azure rapier', () => {
  it('is a held item with her blade glow and guard gold as defaults', () => {
    const item = getItem('held_azure_rapier');
    assert.equal(item?.slot, 'held');
    assert.deepEqual(item!.colors.map((c) => c.default), [ELISE_SWORD_BLADE, ELISE_SWORD_GUARD]);
  });

  it('pivots on its grip and keeps its sparkles inside the template', () => {
    const [px, py] = ELISE_RAPIER.pivot;
    assert.notEqual(ELISE_RAPIER.rows[py][px], '.');
    for (const [x, y, ch] of ELISE_RAPIER.sparks) {
      assert.ok(y < ELISE_RAPIER.rows.length && x < ELISE_RAPIER.rows[y].length, `spark ${x},${y}`);
      assert.ok(ELISE_RAPIER.blade.includes(ch));
    }
  });

  it('draws in every pose, and recolours the blade', () => {
    for (const pose of ['idle', 'attack', 'victory', 'walk', 'downed', 'handsigns', 'sit'] as const) renderSprite(look(), pose, 0);
    const a = renderSprite(look(), 'idle', 0).rgba;
    const b = renderSprite(look(['#40c0ff', ELISE_SWORD_GUARD]), 'idle', 0).rgba;
    assert.notDeepEqual(a, b);
  });
});
