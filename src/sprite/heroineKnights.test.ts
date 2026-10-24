// Tests for the owner's heroine knights (items/heroineKnights.ts, heroineKnightSword.ts, the 'gallant' face
// and eyes, heroineKnightsRig.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { HK_REF } from './heroineKnightsRefPixels';
import { GRID } from './raster';
import type { SpriteAppearance } from './types';

const SETS = ['paladin', 'rogue', 'dragon'] as const;
const look = (set: string): SpriteAppearance => LEGENDARY_PRESETS.find((p) => p.character.id === `preset_heroine_${set}`)!.character.appearance!;
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** His figure at our scale (tools/refs/heroine_knights_ref.py game()): fine pixel -> his colour. */
function his(set: string): Map<number, string> {
  const ref = HK_REF[set];
  const out = new Map<number, string>();
  ref.rows.forEach((row, j) => {
    for (let i = 0; i < row.length / 2; i++) {
      const p = row.slice(2 * i, 2 * i + 2);
      if (p !== '..') out.set((ref.at[1] + j) * GRID + ref.at[0] + i, ref.colors[DIGITS.indexOf(p[0]) * 36 + DIGITS.indexOf(p[1])]);
    }
  });
  return out;
}

describe("the owner's heroine knights", () => {
  for (const set of SETS) {
    it(`the ${set} at rest is his picture at our scale, pixel for pixel, and nothing else`, () => {
      const want = his(set);
      const f = renderSprite(look(set), 'idle', 0);
      const wrong: string[] = [];
      for (let i = 0; i < GRID * GRID; i++) {
        const w = want.get(i);
        const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : undefined;
        if (w !== got) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${w ?? 'none'} / ${got ?? 'none'}`);
      }
      assert.deepEqual(wrong.slice(0, 20), []);
    });
  }

  it('her sets are cut for the fitted female body: never on a man', () => {
    const ids = ['hair_heroine_auburn', ...SETS.flatMap((s) => ['armor', 'hands', 'waist', 'skirt', 'bottom', 'feet', 'cape'].map((k) => `${k}_heroine_${s}`))];
    for (const id of ids) {
      const d = getItem(id)!;
      assert.ok(d, id);
      assert.ok(fitsBody(d, 'female'), id);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'), id);
    }
  });

  it('her longsword has parts to pick, as the katana has: the blade and the guard, his by default', () => {
    const d = getItem('held_heroine_longsword')!;
    assert.deepEqual(
      d.parts!.map((p) => p.key),
      ['blade', 'guard'],
    );
    assert.equal(d.parts![1].options[0].id, 'cross');
    const pre = d.partsPreview!(look('paladin'), { blade: 'long', guard: 'cross' });
    assert.ok(pre.rows.length > 10 && Object.keys(pre.colors).length > 3);
  });

  it('his colours recolour through the slots, his black line kept', () => {
    const base = look('paladin');
    const red = { ...base, slots: { ...base.slots, armor: { id: 'armor_heroine_paladin', colors: ['#3a6ad0', '#c0c0c8', '#d02040'] } } };
    const a = renderSprite(base, 'idle', 0);
    const b = renderSprite(red, 'idle', 0);
    let changed = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!a.rgba[i * 4 + 3]) continue;
      if (hex(a.rgba, i) === '#000100') assert.equal(hex(b.rgba, i), '#000100', `line at ${i % GRID},${(i / GRID) | 0}`);
      else if (hex(a.rgba, i) !== hex(b.rgba, i)) changed++;
    }
    assert.ok(changed > 150, `${changed} pixels recoloured`);
  });
});
