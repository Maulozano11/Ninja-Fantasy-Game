// Tests for the owner's navy officer (docs/reference/navy-officer-*-owner-reference.jpg, brought to our scale and
// cleaned by tools/refs/navy_ref.py): his head, eyes, two hairs, five coats, three under-layers, belt, sash,
// trousers, boots, gloves, shoulder pieces, sabre and scabbard, and the preset that wears them. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { dojutsuToEye, getAppearance } from './legacy';
import { NAVY_REF } from './navyRefPixels';
import { GRID } from './raster';
import type { ItemChoice, SpriteAppearance } from './types';

const OFFICER = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_navy_officer')!.character;
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
const it_ = (id: string, parts?: Record<string, string>): ItemChoice => ({ id, colors: [], ...(parts ? { parts } : {}) });

/** The officer in each of his pictures' outfits: his first picture's preset with that picture's chest. */
function outfit(pic: string): SpriteAppearance {
  const l = structuredClone(getAppearance(OFFICER));
  if (pic !== 'high') l.accessories = l.accessories.filter((a) => a.id !== 'acc_navy_epaulets');
  if (pic === 'folded') l.slots.top = it_('top_navy_coat_folded');
  if (pic === 'open') Object.assign(l.slots, { top: it_('top_navy_coat_open'), armor: it_('armor_navy_shirt_vest') });
  if (pic === 'buttoned') {
    Object.assign(l.slots, { top: it_('top_navy_coat_buttoned'), armor: it_('armor_navy_green_vest') });
    delete l.slots.waist;
  }
  if (pic === 'dark') Object.assign(l.slots, { top: it_('top_navy_coat_dark'), armor: it_('armor_navy_brocade_vest'), waist: it_('waist_navy_sash'), hair: it_('hair_navy_swept') });
  if (pic === 'open' || pic === 'buttoned' || pic === 'dark') l.slots.bottom = it_('bottom_navy_trousers', { paint: 'black' });
  return l;
}

/** The pixels of the frame that differ from his figure in picture `pic` (and any drawn outside it). */
function differences(rgba: Uint8ClampedArray, pic: string): string[] {
  const ref = NAVY_REF[pic];
  const out: string[] = [];
  const [ax, ay] = ref.at;
  const inRef = new Set<number>();
  ref.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const p = (ay + j) * GRID + ax + i;
      inRef.add(p);
      const want = ref.colors[row[i]];
      if (!opaque(rgba, p) || hex(rgba, p) !== want) out.push(`${ax + i},${ay + j}: ${opaque(rgba, p) ? hex(rgba, p) : 'empty'} for ${want}`);
    }
  });
  for (let p = 0; p < GRID * GRID; p++) if (opaque(rgba, p) && !inRef.has(p)) out.push(`${p % GRID},${(p / GRID) | 0}: drawn outside his figure`);
  return out;
}

describe("the owner's navy officer", () => {
  for (const pic of ['high', 'folded', 'open', 'buttoned', 'dark']) {
    it(`at rest in his ${pic} outfit, every pixel of the male idle frame 0 is his (the cleaned reduction of his picture)`, () => {
      const f = renderSprite(outfit(pic), 'idle', 0, dojutsuToEye(OFFICER.dojutsu));
      assert.deepEqual(differences(f.rgba, pic).slice(0, 10), []);
    });
  }

  it('every part is its own creator option; the clothes are made for the male bodies only', () => {
    const men = [
      'top_navy_coat_high', 'top_navy_coat_folded', 'top_navy_coat_open', 'top_navy_coat_buttoned', 'top_navy_coat_dark',
      'armor_navy_shirt_vest', 'armor_navy_green_vest', 'armor_navy_brocade_vest', 'waist_navy_belt', 'waist_navy_sash',
      'bottom_navy_trousers', 'feet_navy_boots', 'hands_navy_gloves',
    ];
    for (const id of men) assert.deepEqual(getItem(id)?.bodies, ['male', 'bulky'], id);
    for (const id of ['hair_navy_tousle', 'hair_navy_swept', 'held_navy_sabre', 'acc_navy_epaulets', 'acc_navy_scabbard']) assert.ok(getItem(id), id);
    const l = getAppearance(OFFICER);
    assert.equal(l.faceShape, 'navy');
    assert.equal(l.eyeShape, 'navy');
  });
});
