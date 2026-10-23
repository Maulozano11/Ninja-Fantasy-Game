// Tests for the owner's Scarlet's pinstripe trousers and noble belt (items/scarletLowerArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rgbToHex } from './color';
import { renderSprite } from './compose';
import { PARTS } from './raster';
import { BELT_BUCKLE, BELT_CORD, BELT_CROSS, BELT_STAR, PIN_CLOTH_TONES, PIN_LINE, PIN_STRIPE_TONES } from './items/scarletLowerArt';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const look = (body: BodyType, slots: SpriteAppearance['slots']): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6bb96',
  faceShape: 'valiant',
  eyeShape: 'valiant',
  eyeColor: '#d97706',
  slots,
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});
const LOWER = { bottom: { id: 'bottom_pinstripe', colors: [] }, waist: { id: 'waist_noble_belt', colors: [] } };
const hexAt = (rgba: Uint8ClampedArray, i: number) => rgbToHex(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
const LEGS = new Set(['thighN', 'thighF', 'shinN', 'shinF'].map((p) => PARTS.indexOf(p as (typeof PARTS)[number])));
const HIS = new Set<string>([PIN_LINE, ...PIN_CLOTH_TONES, ...PIN_STRIPE_TONES]);

describe('pinstripe trousers', () => {
  it('cover both legs in his colours in every pose on every body: no skin shows through', () => {
    const poses: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
    for (const body of ['male', 'female', 'bulky'] as BodyType[])
      for (const pose of poses) {
        const f = renderSprite(look(body, { bottom: { id: 'bottom_pinstripe', colors: [] } }), pose, 0);
        // the hem stops at the ankle: the bare foot (and the leg's end round the joint) shows below it
        const nearAnkle = (i: number) =>
          [f.rig.ankleN, f.rig.ankleF].some((a) => Math.hypot((i % 256) + 0.5 - a.x * 2, ((i / 256) | 0) + 0.5 - a.y * 2) < 4);
        let legs = 0;
        for (let i = 0; i < f.part.length; i++) {
          if (!LEGS.has(f.part[i]) || !f.rgba[i * 4 + 3] || nearAnkle(i)) continue;
          legs++;
          assert.ok(HIS.has(hexAt(f.rgba, i)), `${body} ${pose}: ${hexAt(f.rgba, i)} at ${i % 256},${(i / 256) | 0}`);
        }
        assert.ok(legs > 100, `${body} ${pose}: the legs are drawn`);
      }
  });

  it('shows his stripes on both legs at rest', () => {
    const f = renderSprite(look('male', { bottom: { id: 'bottom_pinstripe', colors: [] } }), 'idle', 0);
    const seen = new Set<string>();
    for (let i = 0; i < f.part.length; i++) if (LEGS.has(f.part[i])) seen.add(hexAt(f.rgba, i));
    // his lit cloth with its stripe, and the shaded cloth with its stripe
    for (const hex of ['#252328', '#39383c', '#1a191e', '#2e2d33']) assert.ok(seen.has(hex), hex);
  });

  it('recolours his cloth and stripes but keeps his black line', () => {
    const plain = renderSprite(look('male', { bottom: { id: 'bottom_pinstripe', colors: [] } }), 'idle', 0).rgba;
    const navy = renderSprite(look('male', { bottom: { id: 'bottom_pinstripe', colors: ['#1e2a5a', '#c8b070'] } }), 'idle', 0).rgba;
    assert.notDeepEqual(navy, plain);
    let line = 0;
    for (let i = 0; i < plain.length / 4; i++) if (hexAt(plain, i) === PIN_LINE && plain[i * 4 + 3]) line += hexAt(navy, i) === PIN_LINE ? 1 : 0;
    assert.ok(line > 50);
  });
});

describe('noble belt', () => {
  it("puts his ring buckle, cross, tassel and star where the reduced reference has them at rest", () => {
    const f = renderSprite(look('male', LOWER), 'idle', 0);
    // their boxes' top left corners in the reference (tools/refs/scarlet_standard.py ORNAMENTS)
    for (const [piece, x0, y0] of [
      [BELT_BUCKLE, 128, 172],
      [BELT_CROSS, 124, 176],
      [BELT_CORD, 134, 177],
      [BELT_STAR, 122, 184],
    ] as const)
      piece.rows.forEach((row, dy) =>
        [...row].forEach((ch, dx) => {
          if (ch !== '.') assert.equal(hexAt(f.rgba, (y0 + dy) * 256 + x0 + dx), piece.colors[ch], `${ch} at ${x0 + dx},${y0 + dy}`);
        }),
      );
  });

  it('recolours the gold and the tassel', () => {
    const at = (colors: string[] = []) => {
      const f = renderSprite(look('male', { ...LOWER, waist: { id: 'waist_noble_belt', colors } }), 'idle', 0);
      return [hexAt(f.rgba, 173 * 256 + 131), hexAt(f.rgba, 179 * 256 + 134)];
    };
    // the buckle's lit gold on its right (131, 173) and the tassel's cord (134, 179), as painted
    const [gold, red] = at();
    assert.equal(gold, BELT_BUCKLE.colors[BELT_BUCKLE.rows[1][3]]);
    assert.equal(red, BELT_CORD.colors[BELT_CORD.rows[2][0]]);
    const [g2, r2] = at(['#3a2416', '#c0c8d0', '#2050c0']);
    assert.notEqual(g2, gold);
    assert.notEqual(r2, red);
  });
});
