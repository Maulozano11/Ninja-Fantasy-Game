// Tests for the owner's noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg, brought to our
// scale and cleaned by tools/refs/noble_ref.py): his head, eyes, hair, headband, coat, breastplate, trousers,
// boots, cuffs, belt, royal cape and Jewel Sabre, and the preset that wears them. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { dojutsuToEye, getAppearance } from './legacy';
import { NOBLE_REF_AT, NOBLE_REF_COLORS, NOBLE_REF_PARTS, NOBLE_REF_ROWS } from './nobleRefPixels';
import { GRID } from './raster';
import type { SpriteAppearance } from './types';

const NOBLE = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_noble_swordsman')!.character;
const look = (): SpriteAppearance => structuredClone(getAppearance(NOBLE));
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** The pixels of the frame that differ from his figure (with `skip`, leaving out his pixels of those parts). */
function differences(rgba: Uint8ClampedArray, skip = ''): string[] {
  const out: string[] = [];
  const [ax, ay] = NOBLE_REF_AT;
  const inRef = new Set<number>();
  NOBLE_REF_ROWS.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const p = (ay + j) * GRID + ax + i;
      if (row[i] === '.') continue;
      inRef.add(p);
      if (skip.includes(NOBLE_REF_PARTS[j][i])) continue;
      const want = NOBLE_REF_COLORS[row[i]];
      if (!opaque(rgba, p) || hex(rgba, p) !== want) out.push(`${ax + i},${ay + j}: ${opaque(rgba, p) ? hex(rgba, p) : 'empty'} for ${want}`);
    }
  });
  if (!skip) for (let p = 0; p < GRID * GRID; p++) if (opaque(rgba, p) && !inRef.has(p)) out.push(`${p % GRID},${(p / GRID) | 0}: drawn outside his figure`);
  return out;
}

describe("the owner's noble swordsman", () => {
  it('at rest, in his outfit, every pixel of the male idle frame 0 is his (the cleaned reduction of his picture)', () => {
    const l = look();
    const f = renderSprite(l, 'idle', 0, dojutsuToEye(NOBLE.dojutsu));
    assert.deepEqual(differences(f.rgba).slice(0, 10), []);
  });

  it("without the cape every pixel of his that is not the cape or his coat's torso is still his", () => {
    const l = look();
    delete l.slots.cape;
    const f = renderSprite(l, 'idle', 0, dojutsuToEye(NOBLE.dojutsu));
    // c the cape's cloth, m the mantles, l the collar and its studs; o and t his coat's torso and tails, which
    // without the cape are the plain shirt (the owner: "ponle una camisa lisa no lo pongas esas telas
    // triangulares raras")
    assert.deepEqual(differences(f.rgba, 'cmlot').slice(0, 10), []);
  });

  it('without the cape the coat is the plain shirt, his tails gone, and so is the Plain Noble Shirt with it', () => {
    const l = look();
    delete l.slots.cape;
    const coat = renderSprite(l, 'idle', 0, dojutsuToEye(NOBLE.dojutsu)).rgba;
    l.slots.top = { id: 'top_noble_shirt', colors: [] };
    const shirt = renderSprite(l, 'idle', 0, dojutsuToEye(NOBLE.dojutsu)).rgba;
    assert.deepEqual([...coat], [...shirt]);
    // with the cape, his coat's tails are drawn (at rest they are his pixels: the first test)
    const withCape = look();
    withCape.slots.top = { id: 'top_noble_shirt', colors: [] };
    const plain = renderSprite(withCape, 'idle', 0, dojutsuToEye(NOBLE.dojutsu)).rgba;
    assert.ok(differences(plain).length > 0, 'the plain shirt is not his coat');
  });

  it('every part is its own creator option, made for the male bodies only (the cape and headband fit everyone)', () => {
    const men = ['top_noble_coat', 'armor_noble_front', 'bottom_noble_trousers', 'feet_noble_boots', 'hands_noble_cuffs', 'waist_noble_belt'];
    for (const id of men) assert.deepEqual(getItem(id)?.bodies, ['male', 'bulky'], id);
    for (const id of ['cape_royal', 'acc_noble_headband', 'held_jewel_sabre', 'hair_noble']) assert.ok(getItem(id), id);
    const l = look();
    assert.equal(l.faceShape, 'noble');
    assert.equal(l.eyeShape, 'noble');
  });
});
