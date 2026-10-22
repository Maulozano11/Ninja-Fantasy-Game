// Tests for Saya's pleated skirt, belts and scabbard (items/sayaLower.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { frameCount, rigPoseFor } from './rig';
import { SHADE_BASE, SHADE_BELTS, SHADE_SCABBARD, SHADE_SKIRT } from './items/sayaLowerArt';
import type { BodyType, SlotId, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, slots: Partial<Record<SlotId, { id: string; colors: string[] }>>): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots,
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});
const SAYA = { skirt: { id: 'skirt_shade_pleats', colors: [] }, waist: { id: 'waist_shade_belts', colors: [] }, held: { id: 'held_katana', colors: [] } };

/** How many pixels of a frame are exactly this colour. */
function count(rgba: Uint8ClampedArray, hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] && rgba[i] === r && rgba[i + 1] === g && rgba[i + 2] === b) n++;
  return n;
}

describe("Saya's skirt, belts and scabbard", () => {
  it('are a skirt and a waist item for women', () => {
    const skirt = getItem('skirt_shade_pleats')!;
    const belts = getItem('waist_shade_belts')!;
    assert.equal(skirt.slot, 'skirt');
    assert.equal(belts.slot, 'waist');
    for (const d of [skirt, belts]) {
      assert.deepEqual(d.bodies, ['female']);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'));
    }
  });

  it('keeps every piece a whole picture: even rows, every character one of her colours', () => {
    for (const p of [SHADE_SKIRT, SHADE_BELTS, SHADE_SCABBARD]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/);
    }
  });

  it('draws her navy, her leather and her scabbard at her colours by default, and recolours them with the slots', () => {
    const base = renderSprite(look('female', SAYA), 'idle', 0).rgba;
    assert.ok(count(base, SHADE_BASE.cloth) > 30, 'her navy pleats show');
    assert.ok(count(base, SHADE_BASE.leather) > 30, 'her belts show');
    assert.ok(count(base, SHADE_BASE.scabbard) > 10, 'her scabbard shows');
    const recoloured = renderSprite(
      look('female', { ...SAYA, skirt: { id: 'skirt_shade_pleats', colors: ['#2e6b3a'] }, waist: { id: 'waist_shade_belts', colors: ['#1a1a1a'] } }),
      'idle',
      0,
    ).rgba;
    assert.equal(count(recoloured, SHADE_BASE.cloth), 0);
    assert.equal(count(recoloured, SHADE_BASE.leather), 0);
  });

  it('renders every pose on the female body', () => {
    const poses: SpritePose[] = ['idle', 'attack', 'cast', 'handsigns', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'sit', 'read', 'lean', 'train'];
    for (const body of ['female'] as BodyType[]) {
      const a = look(body, SAYA);
      for (const pose of poses) {
        const n = frameCount(rigPoseFor(pose, 'runes', 'held_katana'));
        for (const f of new Set([0, n >> 1])) assert.ok(renderSprite(a, pose, f).rgba.some((v) => v > 0), `${body} ${pose} ${f}`);
      }
    }
  });
});
