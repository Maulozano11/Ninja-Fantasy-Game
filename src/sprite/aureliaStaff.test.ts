// Tests for Aurelia's staff (the Dawn Staff, held_dawn_staff): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { AURELIA_STAFF_GOLD, AURELIA_STAFF_ORB, DAWN_STAFF } from './items/aureliaStaffArt';
import { DEFAULT_CHARACTER, ALL_PRESETS } from '../data/shinobiData';
import { weaponOf } from '../battle/units';
import { GRID } from './raster';
import { frameCount } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

const look = (colors: string[] = []): SpriteAppearance => ({
  ...DEFAULT_CHARACTER.appearance!,
  body: 'female',
  slots: { held: { id: 'held_dawn_staff', colors } },
});

describe('Aurelia dawn staff', () => {
  it('is a held item with his gold and orb colour as defaults', () => {
    const item = getItem('held_dawn_staff');
    assert.equal(item?.slot, 'held');
    assert.deepEqual(item!.colors.map((c) => c.default), [AURELIA_STAFF_GOLD, AURELIA_STAFF_ORB]);
  });

  it('pivots on its grip and keeps its sparkles inside the template', () => {
    const [px, py] = DAWN_STAFF.pivot;
    assert.notEqual(DAWN_STAFF.rows[py][px], '.');
    for (const [x, y, ch] of DAWN_STAFF.sparks) {
      assert.ok(y < DAWN_STAFF.rows.length && x < DAWN_STAFF.rows[y].length, `spark ${x},${y}`);
      assert.ok(DAWN_STAFF.orb.includes(ch));
    }
  });

  it('draws in every pose and body, and recolours the gold and the orb', () => {
    for (const body of ['female', 'male', 'bulky'] as const)
      for (const pose of ['idle', 'attack', 'cast', 'victory', 'walk', 'downed', 'handsigns', 'sit', 'train'] as const) renderSprite({ ...look(), body }, pose, 0);
    const a = renderSprite(look(), 'idle', 0).rgba;
    assert.notDeepEqual(a, renderSprite(look(['#c0c8d8', AURELIA_STAFF_ORB]), 'idle', 0).rgba);
    assert.notDeepEqual(a, renderSprite(look([AURELIA_STAFF_GOLD, '#80d0ff']), 'idle', 0).rgba);
  });

  it('fights as a quarterstaff', () => {
    const w = weaponOf({ ...DEFAULT_CHARACTER, appearance: look() });
    assert.equal(w.name, 'Quarterstaff');
    assert.equal(w.dice, '1d6');
    assert.equal(w.type, 'Bludgeoning');
  });

  // His sparkles (a few pixels each) twinkle apart from it; the staff itself never does.
  it('stays with her: in her fist at rest on every body, beside her when she is downed', () => {
    const aurelia = ALL_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
    for (const body of ['female', 'male', 'bulky'] as const)
      for (const pose of ['idle', 'downed'] as SpritePose[])
        for (let f = 0; f < frameCount(pose); f++) {
          const { rgba } = renderSprite({ ...aurelia, body }, pose, f);
          // the pieces of the frame (8-connected): one figure and sparkles
          const seen = new Uint8Array(GRID * GRID);
          const sizes: number[] = [];
          for (let s = 0; s < GRID * GRID; s++) {
            if (seen[s] || !rgba[s * 4 + 3]) continue;
            let n = 0;
            const stack = [s];
            seen[s] = 1;
            while (stack.length) {
              const i = stack.pop()!;
              n++;
              const x = i % GRID;
              for (let dy = -GRID; dy <= GRID; dy += GRID)
                for (let dx = -1; dx <= 1; dx++) {
                  const j = i + dy + dx;
                  if (j < 0 || j >= GRID * GRID || x + dx < 0 || x + dx >= GRID || seen[j] || !rgba[j * 4 + 3]) continue;
                  seen[j] = 1;
                  stack.push(j);
                }
            }
            sizes.push(n);
          }
          sizes.sort((a, b) => b - a);
          assert.ok(sizes.slice(1).every((n) => n <= 4), `${body} ${pose} ${f + 1}: pieces apart from her of ${sizes.slice(1).join(', ')} pixels`);
        }
  });
});
