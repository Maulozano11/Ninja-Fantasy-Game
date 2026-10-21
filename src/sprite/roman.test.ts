// Tests for the owner's Roman set (Bronze Cuirass, Imperial War Skirt, Bronze Bracers, Gladiator Sandals): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { CUIRASS_CHEST } from './items/bronzeCuirassArt';
import { PTERUGES_FRONT } from './items/pterugesArt';
import { BRACER_N, SANDAL_FOOT_N } from './items/bracersSandalsArt';
import { defaultAppearance } from './legacy';
import { GRID } from './raster';
import { MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';
import type { PaintedPiece } from './painted';

const look = (body: BodyType, drapes = 'on'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [] };
  delete l.slots.top;
  delete l.slots.bottom;
  delete l.slots.cape;
  delete l.slots.held;
  return l;
};

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** How many of a piece's pixels the frame shows in one of his colours. */
function hisPixels(rgba: Uint8ClampedArray, piece: PaintedPiece): { shown: number; drawn: number } {
  const colors = new Set(Object.values(piece.colors));
  let shown = 0;
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && colors.has(hex(rgba, i))) shown++;
  const drawn = piece.rows.join('').replace(/\./g, '').length;
  return { shown, drawn };
}

describe('the Roman set', () => {
  it('shows his pixels in his colours at rest', () => {
    const f = renderSprite(look('male'), 'idle', 0);
    for (const piece of [CUIRASS_CHEST, PTERUGES_FRONT, BRACER_N, SANDAL_FOOT_N]) {
      const { shown, drawn } = hisPixels(f.rgba, piece);
      assert.ok(shown >= drawn * 0.8, `${shown} of ${drawn} pixels in his colours`);
    }
  });

  it('draws every pose on the male, bulky and slender bodies', () => {
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of [...SPRITE_POSES, ...MOVE_POSES, 'sit'] as const) {
        const f = renderSprite(look(body), pose, 0);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3]) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
      }
    }
  });

  it('leaves the drapes off when the part says so', () => {
    const count = (drapes: string) => {
      const f = renderSprite(look('male', drapes), 'idle', 0);
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3]) n++;
      return n;
    };
    assert.ok(count('off') < count('on') - 300);
  });
});
