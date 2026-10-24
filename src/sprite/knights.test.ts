// Tests for the owner's three knights (items/knights.ts, the 'knight' face and eyes, knightRig.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { KNIGHT_REF } from './knightRefPixels';
import { GRID } from './raster';
import type { BodyType, SpriteAppearance } from './types';

const SETS = ['paladin', 'dark', 'dragon'] as const;
const look = (set: string, body: BodyType): SpriteAppearance => ({ ...LEGENDARY_PRESETS.find((p) => p.character.id === `preset_knight_${set}`)!.character.appearance!, body });
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His figure at our scale (tools/refs/knights_ref.py game()): fine pixel -> his colour. */
function his(set: string): Map<number, string> {
  const ref = KNIGHT_REF[set];
  const out = new Map<number, string>();
  ref.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && out.set((ref.at[1] + j) * GRID + ref.at[0] + i, ref.colors[ch])));
  return out;
}

describe("the owner's three knights", () => {
  for (const set of SETS) {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      it(`the ${set} at rest on the ${body} body is his picture at our scale, pixel for pixel, and nothing else`, () => {
        const want = his(set);
        const f = renderSprite(look(set, body), 'idle', 0);
        const wrong: string[] = [];
        for (let i = 0; i < GRID * GRID; i++) {
          const w = want.get(i);
          const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : undefined;
          if (w !== got) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${w ?? 'none'} / ${got ?? 'none'}`);
        }
        assert.equal(wrong.length, 0, wrong.slice(0, 20).join('\n'));
      });
    }
  }

  it('his pieces are cut for the men: no woman ever wears them', () => {
    for (const set of SETS)
      for (const slot of ['armor', 'hands', 'waist', 'skirt', 'bottom', 'feet', 'cape']) {
        const id = `${slot}_knight_${set}`;
        const d = getItem(id)!;
        assert.ok(d, id);
        assert.ok(fitsBody(d, 'male') && fitsBody(d, 'bulky'), id);
        assert.ok(!fitsBody(d, 'female'), id);
      }
    assert.ok(!fitsBody(getItem('acc_knight_fur')!, 'female'));
  });

  it('his colours recolour through the slots, his black line kept', () => {
    const a = look('paladin', 'male');
    const b = { ...a, slots: { ...a.slots, armor: { id: 'armor_knight_paladin', colors: ['#2a4a8a', '#1f6f3f'] } } };
    const fa = renderSprite(a, 'idle', 0);
    const fb = renderSprite(b, 'idle', 0);
    let changed = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!fa.rgba[i * 4 + 3]) continue;
      if (hex(fa.rgba, i) === '#020206') assert.equal(hex(fb.rgba, i), '#020206', `line at ${i % GRID},${(i / GRID) | 0}`);
      else if (hex(fa.rgba, i) !== hex(fb.rgba, i)) changed++;
    }
    assert.ok(changed > 200, `${changed} pixels recoloured`);
  });
});
