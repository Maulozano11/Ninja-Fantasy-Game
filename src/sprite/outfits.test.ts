// Tests for the owner's three new male outfits (items/outfits.ts, the 'wanderer' face and eyes,
// outfitRig.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { OUTFIT_REF } from './outfitRefPixels';
import { GRID } from './raster';
import type { BodyType, SpriteAppearance } from './types';

const FIGURES = ['armored', 'rogue', 'tactical'] as const;
const look = (fig: (typeof FIGURES)[number], body: BodyType): SpriteAppearance => ({ ...LEGENDARY_PRESETS.find((p) => p.character.id === `preset_outfit_${fig}`)!.character.appearance!, body });
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His figure at our scale (tools/refs/outfits_ref.py game()): fine pixel -> his colour. */
function his(fig: (typeof FIGURES)[number]): Map<number, string> {
  const ref = OUTFIT_REF[fig];
  const out = new Map<number, string>();
  ref.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && out.set((ref.at[1] + j) * GRID + ref.at[0] + i, ref.colors[ch])));
  return out;
}

describe("the owner's three outfits", () => {
  for (const fig of FIGURES)
    for (const body of ['male', 'bulky'] as BodyType[]) {
      it(`the ${fig} outfit at rest on the ${body} body is his picture at our scale, pixel for pixel, and nothing else`, () => {
        const want = his(fig);
        const f = renderSprite(look(fig, body), 'idle', 0);
        const wrong: string[] = [];
        for (let i = 0; i < GRID * GRID; i++) {
          const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : undefined;
          if (want.get(i) !== got) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${want.get(i) ?? 'none'} / ${got ?? 'none'}`);
        }
        assert.deepEqual(wrong.slice(0, 20), []);
      });
    }

  it('his pieces are cut for the men: no woman ever wears them', () => {
    const ids = ['armor_warden_plate', 'top_warden_mail', 'hands_warden_gauntlets', 'waist_warden_belt', 'skirt_warden_tassets', 'bottom_warden_cuisses', 'feet_warden_greaves',
      'top_drifter_jacket', 'hands_drifter_gloves', 'waist_drifter_belt', 'bottom_drifter_trousers', 'feet_drifter_boots',
      'armor_vanguard_vest', 'top_vanguard_sleeves', 'hands_vanguard_wraps', 'waist_vanguard_belt', 'bottom_vanguard_cargo', 'feet_vanguard_boots'];
    for (const id of ids) {
      const d = getItem(id)!;
      assert.ok(d, id);
      assert.ok(fitsBody(d, 'male') && fitsBody(d, 'bulky'), id);
      assert.ok(!fitsBody(d, 'female'), id);
    }
  });

  it('his colours recolour through the slots, his black line kept', () => {
    const a = look('armored', 'male');
    const b = { ...a, slots: { ...a.slots, armor: { id: 'armor_warden_plate', colors: ['#8a5a2a'] } } };
    const fa = renderSprite(a, 'idle', 0);
    const fb = renderSprite(b, 'idle', 0);
    const lines = new Set(Object.values(OUTFIT_REF.armored.colors).filter((h) => parseInt(h.slice(1, 3), 16) * 0.299 + parseInt(h.slice(3, 5), 16) * 0.587 + parseInt(h.slice(5, 7), 16) * 0.114 < 9));
    let changed = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!fa.rgba[i * 4 + 3]) continue;
      if (lines.has(hex(fa.rgba, i))) assert.equal(hex(fb.rgba, i), hex(fa.rgba, i), `line at ${i % GRID},${(i / GRID) | 0}`);
      else if (hex(fa.rgba, i) !== hex(fb.rgba, i)) changed++;
    }
    assert.ok(changed > 200, `${changed} pixels recoloured`);
  });
});
