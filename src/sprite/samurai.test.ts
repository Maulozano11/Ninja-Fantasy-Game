// Tests for the owner's samurai (items/samurai.ts, the 'samurai' face and eyes, samuraiRig.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { GRID } from './raster';
import { SAMURAI_REF_AT, SAMURAI_REF_COLORS, SAMURAI_REF_ROWS } from './samuraiRefPixels';
import type { BodyType, SpriteAppearance } from './types';

const SAMURAI = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_samurai')!.character.appearance!;
const on = (body: BodyType): SpriteAppearance => ({ ...SAMURAI, body });
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His figure at our scale (tools/refs/samurai_ref.py game()): fine pixel -> his colour. */
const HIS = new Map<number, string>();
SAMURAI_REF_ROWS.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && HIS.set((SAMURAI_REF_AT[1] + j) * GRID + SAMURAI_REF_AT[0] + i, SAMURAI_REF_COLORS[ch])));

describe("the owner's samurai", () => {
  for (const body of ['male', 'bulky'] as BodyType[]) {
    it(`at rest on the ${body} body is his picture at our scale, pixel for pixel, and nothing else`, () => {
      const f = renderSprite(on(body), 'idle', 0);
      const wrong: string[] = [];
      for (let i = 0; i < GRID * GRID; i++) {
        const want = HIS.get(i);
        const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : undefined;
        if (want !== got) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${want ?? 'none'} / ${got ?? 'none'}`);
      }
      assert.deepEqual(wrong.slice(0, 20), []);
    });
  }

  it('his pieces are cut for the men: no woman ever wears them', () => {
    for (const id of ['armor_samurai_do', 'hands_samurai', 'waist_samurai_obi', 'skirt_samurai_kusazuri', 'bottom_samurai_hakama', 'feet_samurai_suneate', 'cape_samurai']) {
      const d = getItem(id)!;
      assert.ok(d, id);
      assert.ok(fitsBody(d, 'male') && fitsBody(d, 'bulky'), id);
      assert.ok(!fitsBody(d, 'female'), id);
    }
  });

  it('his colours recolour through the slots, his black line kept', () => {
    const look = on('male');
    const red = { ...look, slots: { ...look.slots, armor: { id: 'armor_samurai_do', colors: ['#2a4a8a', '#1f6f3f', '#c0c0c8'] } } };
    const a = renderSprite(look, 'idle', 0);
    const b = renderSprite(red, 'idle', 0);
    let changed = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!a.rgba[i * 4 + 3]) continue;
      if (hex(a.rgba, i) === '#000113') assert.equal(hex(b.rgba, i), '#000113', `line at ${i % GRID},${(i / GRID) | 0}`);
      else if (hex(a.rgba, i) !== hex(b.rgba, i)) changed++;
    }
    assert.ok(changed > 200, `${changed} pixels recoloured`);
  });
});
