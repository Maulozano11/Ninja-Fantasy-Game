// Tests for Saya's ninja top, arm guards and fingerless gloves (items/sayaUpper.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { frameCount, rigPoseFor } from './rig';
import { SAYA_FORE_F, SAYA_FORE_N, SAYA_PLATE, SAYA_TOP, SAYA_TOP_LOW, SAYA_UPPER_F, SAYA_UPPER_N } from './items/sayaUpperArt';
import { RES } from './raster';
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
const SAYA = { armor: { id: 'armor_crimson_shade', colors: [] }, hands: { id: 'hands_shade_fingerless', colors: [] }, held: { id: 'held_katana', colors: [] } };

/** How many pixels of a frame are exactly this colour. */
function count(rgba: Uint8ClampedArray, hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] && rgba[i] === r && rgba[i + 1] === g && rgba[i + 2] === b) n++;
  return n;
}

describe("Saya's top, arm guards and gloves", () => {
  it('are an armour for women and gloves for every body', () => {
    const armor = getItem('armor_crimson_shade')!;
    const gloves = getItem('hands_shade_fingerless')!;
    assert.equal(armor.slot, 'armor');
    assert.equal(gloves.slot, 'hands');
    assert.deepEqual(armor.bodies, ['female', 'slender']);
    assert.ok(!fitsBody(armor, 'male') && !fitsBody(armor, 'bulky'));
    for (const b of ['female', 'slender', 'male', 'bulky'] as BodyType[]) assert.ok(fitsBody(gloves, b));
  });

  it('keeps every piece a whole picture: even rows, every character one of her colours', () => {
    for (const p of [SAYA_TOP, SAYA_TOP_LOW, SAYA_UPPER_N, SAYA_FORE_N, SAYA_UPPER_F, SAYA_FORE_F]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/);
    }
  });

  it('draws her cream plate at her colour by default, and recolours it with the Plate slot', () => {
    const base = renderSprite(look('female', SAYA), 'idle', 0).rgba;
    assert.ok(count(base, SAYA_PLATE) > 40, 'her cream shows on the chest');
    const recoloured = renderSprite(look('female', { ...SAYA, armor: { id: 'armor_crimson_shade', colors: ['', '', '#d0d6e0'] } }), 'idle', 0).rgba;
    assert.equal(count(recoloured, SAYA_PLATE), 0);
  });

  it('covers the long torso: the top on the neck reaches down over the top on the hips', () => {
    // At rest the two pieces are not turned: the upper one's last row lies at or below the lower one's
    // first, so no skin shows between her collar and her belts.
    for (const body of ['female', 'slender'] as BodyType[]) {
      const { rig } = renderSprite(look(body, SAYA), 'idle', 0);
      const bottom = Math.floor(rig.neck.y * RES) - SAYA_TOP.pivot[1] + SAYA_TOP.rows.length - 1;
      const top = Math.floor(rig.pelvis.y * RES) - SAYA_TOP_LOW.pivot[1];
      assert.ok(bottom >= top + 1, `${body}: upper piece ends at ${bottom}, lower starts at ${top}`);
    }
  });

  it('renders every pose on the female and slender bodies, and the gloves alone on the male and bulky', () => {
    const poses: SpritePose[] = ['idle', 'attack', 'cast', 'handsigns', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'sit', 'read', 'lean', 'train'];
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[]) {
      const a = look(body, SAYA);
      for (const pose of poses) {
        // the first and the middle frame of each
        const n = frameCount(rigPoseFor(pose, 'runes', 'held_katana'));
        for (const f of new Set([0, n >> 1])) assert.ok(renderSprite(a, pose, f).rgba.some((v) => v > 0), `${body} ${pose} ${f}`);
      }
    }
  });
});
