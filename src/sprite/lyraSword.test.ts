// Tests for Lyra's sword (the Gilded Rapier, held_gilded_rapier): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { LYRA_RAPIER, LYRA_SWORD_BLADE, LYRA_SWORD_GUARD } from './items/lyraSwordArt';
import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '../data/shinobiData';
import { GRID } from './raster';
import { frameCount, rigPoseFor } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

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
    // the pivot is our grip point under his fist: on his grip or beside it (his grip runs through the top of the fist)
    const [px, py] = LYRA_RAPIER.pivot;
    assert.ok([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => (LYRA_RAPIER.rows[py + dy]?.[px + dx] ?? '.') !== '.')));
    for (const r of LYRA_RAPIER.rows) for (const ch of r) assert.ok(ch === '.' || ch in LYRA_RAPIER.colors, ch);
    for (const [x, y, ch] of LYRA_RAPIER.sparks) {
      assert.ok(y < LYRA_RAPIER.rows.length && x < LYRA_RAPIER.rows[y].length, `spark ${x},${y}`);
      assert.ok(LYRA_RAPIER.blade.includes(ch));
    }
  });

  it("stows on Lyra's back with no bit of the blade showing past her far side", () => {
    const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
    const empty = { ...lyra, slots: { ...lyra.slots, held: undefined } };
    for (const [pose, stowed] of [['handsigns', false], ['read', false], ['idle', true], ['walk', true], ['run', true], ['cast', true]] as [SpritePose, boolean][]) {
      const n = frameCount(rigPoseFor(pose, undefined, stowed ? undefined : lyra.slots.held!.id));
      for (let f = 0; f < n; f++) {
        const a = renderSprite({ ...lyra, stowed }, pose, f);
        const b = renderSprite({ ...empty, stowed }, pose, f).rgba;
        // past the middle of her body (x 128 and on), the sword adds nothing where she is not drawn
        let out = 0;
        for (let y = 0; y < GRID; y++) for (let x = 128; x < GRID; x++) if (a.rgba[(y * GRID + x) * 4 + 3] && !b[(y * GRID + x) * 4 + 3]) out++;
        assert.equal(out, 0, `${pose} ${f}`);
      }
    }
  });

  it('draws in every pose, and recolours the blade and the guard', () => {
    for (const pose of ['idle', 'attack', 'victory', 'walk', 'downed', 'handsigns', 'sit', 'train'] as const) renderSprite(look(), pose, 0);
    const a = renderSprite(look(), 'idle', 0).rgba;
    assert.notDeepEqual(a, renderSprite(look(['#ff6040', LYRA_SWORD_GUARD]), 'idle', 0).rgba);
    assert.notDeepEqual(a, renderSprite(look([LYRA_SWORD_BLADE, '#c0c0d0']), 'idle', 0).rgba);
  });
});
