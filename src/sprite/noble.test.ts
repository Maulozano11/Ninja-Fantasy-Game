// Tests for the owner's Scarlet boots and fingerless gloves (feet_noble_boots, hands_noble_fingerless): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { hexToRgb } from './color';
import type { PaintedPiece } from './painted';
import { RES, Vec } from './raster';
import { NOBLE_FOOT_F, NOBLE_FOOT_N, NOBLE_GLOVE_N, NOBLE_KIND, NOBLE_SHAFT_N } from './items/nobleBootsGlovesArt';
import type { SpriteAppearance } from './types';

const look = (colors: { boots?: string[]; gloves?: string[] } = {}, skin = '#f8d4b8'): SpriteAppearance => ({
  version: 1,
  body: 'male',
  skin,
  eyeShape: 'valiant',
  eyeColor: '#c88038',
  slots: {
    feet: { id: 'feet_noble_boots', colors: colors.boots ?? [] },
    hands: { id: 'hands_noble_fingerless', colors: colors.gloves ?? [] },
    held: { id: 'held_flame_sword', colors: [] },
  },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

/** Each pixel of a piece stamped unturned on a joint: its place in the frame and its colour. */
function* pixels(piece: PaintedPiece, at: Vec): Generator<[number, number, string]> {
  const ax = Math.floor(at.x * RES) - piece.pivot[0];
  const ay = Math.floor(at.y * RES) - piece.pivot[1];
  for (let y = 0; y < piece.rows.length; y++) for (let x = 0; x < piece.rows[y].length; x++) {
    const ch = piece.rows[y][x];
    if (ch !== '.') yield [ax + x, ay + y, piece.colors[ch]];
  }
}

const at = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * 256 + x) * 4;
  return [rgba[i], rgba[i + 1], rgba[i + 2]];
};

describe('the owner\'s Scarlet boots and gloves', () => {
  it('stand at rest where the study put them, every pixel his', () => {
    // the near fist round the sword's grip; the feet without it (its blade crosses the far foot)
    const held = renderSprite(look(), 'idle', 0);
    for (const [x, y, hex] of pixels(NOBLE_GLOVE_N, held.rig.wristN)) assert.deepEqual(at(held.rgba, x, y), hexToRgb(hex), `glove ${x},${y}`);
    const { held: _, ...slots } = look().slots;
    const f = renderSprite({ ...look(), slots }, 'idle', 0);
    for (const [piece, joint] of [[NOBLE_FOOT_N, f.rig.ankleN], [NOBLE_FOOT_F, f.rig.ankleF]] as const) {
      for (const [x, y, hex] of pixels(piece, joint)) assert.deepEqual(at(f.rgba, x, y), hexToRgb(hex), `foot ${x},${y}`);
    }
  });

  it('keep his black line and turn his leather and skin with the colour slots and the skin tone', () => {
    const f = renderSprite(look({ boots: ['#6b4226', '#d4a84a'], gloves: ['#7a4b2c'] }, '#8d5524'), 'idle', 0);
    const kinds = new Set<string>();
    for (const [piece, joint] of [[NOBLE_FOOT_N, f.rig.ankleN], [NOBLE_GLOVE_N, f.rig.wristN]] as const) {
      for (const [x, y, hex] of pixels(piece, joint)) {
        const kind = NOBLE_KIND[hex];
        kinds.add(kind);
        if (kind === 'line') assert.deepEqual(at(f.rgba, x, y), hexToRgb(hex), `line ${x},${y}`);
        else assert.notDeepEqual(at(f.rgba, x, y), hexToRgb(hex), `${kind} ${x},${y}`);
      }
    }
    assert.deepEqual([...kinds].sort(), ['leather', 'line', 'skin']);
  });

  it('take the leg off below the boot top only: the trousers above it stay', () => {
    const plain = renderSprite({ ...look(), slots: { held: { id: 'held_flame_sword', colors: [] } } }, 'idle', 0);
    const f = renderSprite(look(), 'idle', 0);
    const [[x0, y0]] = pixels(NOBLE_SHAFT_N, f.rig.ankleN);
    // the row over the shaft's top line, across its width, is the bare leg as before
    for (let x = x0 + 2; x < x0 + 7; x++) assert.deepEqual(at(f.rgba, x, y0 - 1), at(plain.rgba, x, y0 - 1), `${x},${y0 - 1}`);
  });
});
