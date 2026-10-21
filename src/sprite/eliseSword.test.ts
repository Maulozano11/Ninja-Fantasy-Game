// Tests for Elise's sword (the Azure Rapier, held_azure_rapier): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { GRID } from './raster';
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

  it('stowed on her back, turns with her as the other back swords do: no blade pokes out in front when she lunges or throws', () => {
    // How far right a stowed sword reaches: the pixels that change when it is put on her back.
    const reach = (held: string, pose: 'pierce' | 'throw', frame: number): number => {
      const base = { ...look(), stowed: true };
      const a = renderSprite({ ...base, slots: { held: { id: held, colors: [] } } }, pose, frame).rgba;
      const b = renderSprite({ ...base, slots: {} }, pose, frame).rgba;
      let x = -1;
      for (let i = 0; i < GRID * GRID; i++) {
        const differs = a[i * 4 + 3] && (!b[i * 4 + 3] || a[i * 4] !== b[i * 4] || a[i * 4 + 1] !== b[i * 4 + 1] || a[i * 4 + 2] !== b[i * 4 + 2]);
        if (differs) x = Math.max(x, i % GRID);
      }
      return x;
    };
    for (const [pose, frames] of [['pierce', 5], ['throw', 4]] as const) {
      for (let f = 0; f < frames; f++) {
        const ours = reach('held_azure_rapier', pose, f);
        const flame = reach('held_flame_sword', pose, f);
        assert.ok(ours <= flame + 1, `${pose} ${f}: reaches x ${ours}, the flame longsword ${flame}`);
      }
    }
  });

  it('keeps the knuckle bow close round the fist, and the dropped sword no lower than the flame longsword', () => {
    // the bow is a thin bar a pixel off the glove, not a hoop wider than the hand
    assert.ok(ELISE_RAPIER.pivot[0] <= 11, `the hilt reaches ${ELISE_RAPIER.pivot[0]} px left of the grip`);
    const lowest = (held: string): number => {
      const a = renderSprite({ ...look(), slots: { held: { id: held, colors: [] } } }, 'downed', 0).rgba;
      let y = -1;
      for (let i = 0; i < GRID * GRID; i++) if (a[i * 4 + 3]) y = Math.max(y, (i / GRID) | 0);
      return y;
    };
    assert.ok(lowest('held_azure_rapier') <= lowest('held_flame_sword'));
  });
});
