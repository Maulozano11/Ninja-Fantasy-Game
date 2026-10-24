// Tests for Aurelia's sorceress and alchemist outfits (items/aureliaOutfits.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { GRID, partIndex } from './raster';
import * as REF from './aureliaOutfitsRefPixels';
import type { BodyType, SpriteAppearance } from './types';

const look = (id: string): SpriteAppearance => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character.appearance!;
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His outfit at rest (tools/refs/aurelia_outfits_ref.py at_rest()): fine pixel -> his colour. */
function his(at: [number, number], rows: string[], colors: Record<string, string>): Map<number, string> {
  const out = new Map<number, string>();
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && out.set((at[1] + j) * GRID + at[0] + i, colors[ch])));
  return out;
}

/** The pixels of his skin there: the game draws them in the body's skin. */
function skinOf(at: [number, number], rows: string[], letters: string): Set<number> {
  const out = new Set<number>();
  rows.forEach((row, j) => [...row].forEach((ch, i) => letters.includes(ch) && out.add((at[1] + j) * GRID + at[0] + i)));
  return out;
}

const OUTFITS = [
  { id: 'preset_aurelia_sorceress', ref: his(REF.SORCERESS_REF_AT, REF.SORCERESS_REF_ROWS, REF.SORCERESS_REF_COLORS), skin: skinOf(REF.SORCERESS_REF_AT, REF.SORCERESS_REF_ROWS, REF.SORCERESS_REF_SKIN), items: ['armor_nightshade_corset', 'top_nightshade_sleeves', 'hands_nightshade_gloves', 'waist_nightshade_sash', 'skirt_nightshade_tatters', 'feet_nightshade_boots'] },
  { id: 'preset_aurelia_alchemist', ref: his(REF.ALCHEMIST_REF_AT, REF.ALCHEMIST_REF_ROWS, REF.ALCHEMIST_REF_COLORS), skin: skinOf(REF.ALCHEMIST_REF_AT, REF.ALCHEMIST_REF_ROWS, REF.ALCHEMIST_REF_SKIN), items: ['armor_alchemist_corset', 'top_alchemist_blouse', 'acc_alchemist_pauldron', 'hands_alchemist_bracers', 'waist_alchemist_belt', 'skirt_alchemist_tabard', 'feet_alchemist_greaves'] },
];

describe("Aurelia's sorceress and alchemist outfits", () => {
  for (const { id, ref, skin } of OUTFITS) {
    it(`${id} at rest is his outfit at our scale, pixel for pixel, where her head and hair do not lie over it`, () => {
      // (without her staff: at rest it hangs in front of her far side, over his pieces)
      const l = look(id);
      const f = renderSprite({ ...l, slots: { ...l.slots, held: undefined } }, 'idle', 0);
      const head = partIndex('head');
      const wrong: string[] = [];
      for (const [i, want] of ref) {
        if (f.part[i] === head || (f.hair?.[i >> 3] ?? 0) & (1 << (i & 7))) continue;
        const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : 'none';
        // (his skin in the body's skin: drawn, its colour the skin's)
        if (skin.has(i) && got !== 'none') continue;
        if (got !== want) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${want} / ${got}`);
      }
      assert.deepEqual(wrong.slice(0, 60), [], `${wrong.length} pixels differ`);
    });
  }

  it('her head stays her approved head in both outfits', () => {
    const dawn = renderSprite(look('preset_aurelia'), 'idle', 0);
    for (const { id } of OUTFITS) {
      const f = renderSprite(look(id), 'idle', 0);
      const head = partIndex('head');
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        if (dawn.part[i] !== head || f.part[i] !== head) continue;
        // her eyes may be another colour (the sorceress's violet) and wear makeup: the rest of her head is hers
        n++;
      }
      assert.ok(n > 150, `${id}: ${n} head pixels in common`);
    }
  });

  it('the pieces are for the fitted female body only', () => {
    for (const { items } of OUTFITS)
      for (const it of items) {
        const d = getItem(it)!;
        assert.ok(d, it);
        assert.ok(fitsBody(d, 'female'), it);
        for (const b of ['male', 'bulky'] as BodyType[]) assert.ok(!fitsBody(d, b), `${it} on ${b}`);
      }
  });
});
