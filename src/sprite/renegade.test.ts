// Tests for the owner's Renegade (his paint-over of Renegado 2: the Short Crop, Cloth Mask, Sleeveless
// Tunic, Braided Rope Belt, Baggy Cargo Pants, Wrapped Sandals and Kunai): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter } from '../battle/units';
import { renderSprite } from './compose';
import * as belt from './items/ropeBeltArt';
import * as cargo from './items/cargoTrousersArt';
import * as mask from './items/clothMaskArt';
import * as kunai from './items/kunaiArt';
import * as tunic from './items/sleevelessTopArt';
import * as wraps from './items/wrapSandalsArt';
import type { PaintedPiece } from './painted';
import { GRID } from './raster';
import { MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const renegade = (body: BodyType = 'male'): SpriteAppearance => ({ ...enemyCharacter('rogue', 1).appearance!, body });

/**
 * The fraction of a piece's cells the frame shows in his colour where the script says it lands (within 6
 * a channel: the scripts let his near colours share one, and a line two pieces share may come from either).
 */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      const c = piece.colors[row[i]];
      if (rgba[p * 4 + 3] > 0 && [0, 1, 2].every((k) => Math.abs(rgba[p * 4 + k] - parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16)) <= 6)) hit++;
    }
  });
  return hit / n;
}

/** The opaque figure's pieces that touch nothing else (4-connected), smaller than `big` pixels. */
function islands(rgba: Uint8ClampedArray, big = 400): number[] {
  const seen = new Uint8Array(GRID * GRID);
  const out: number[] = [];
  for (let s = 0; s < GRID * GRID; s++) {
    if (seen[s] || rgba[s * 4 + 3] === 0) continue;
    let n = 0;
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      n++;
      const x = i % GRID;
      for (const j of [i - GRID, i + GRID, x > 0 ? i - 1 : -1, x < GRID - 1 ? i + 1 : -1]) {
        if (j < 0 || j >= GRID * GRID || seen[j] || rgba[j * 4 + 3] === 0) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (n < big) out.push(n);
  }
  return out;
}

describe('the Renegade', () => {
  it('lands every piece on his pixels at rest on the male body, where the scripts placed it', () => {
    const f = renderSprite(renegade(), 'idle', 0);
    // What each piece shows of his pixels at rest (the rest is under the mask, the belt, the arms or the fist).
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['mask', mask.CLOTH_MASK, mask.CLOTH_MASK_REST.CLOTH_MASK, 0.99],
      ['tunic', tunic.TUNIC_BODY, tunic.TUNIC_REST.TUNIC_BODY, 0.99],
      ['near upper arm', tunic.TUNIC_UPPER_N, tunic.TUNIC_REST.TUNIC_UPPER_N, 0.99],
      ['near forearm', tunic.TUNIC_FORE_N, tunic.TUNIC_REST.TUNIC_FORE_N, 0.99],
      ['near fist', tunic.TUNIC_FIST_N, tunic.TUNIC_REST.TUNIC_FIST_N, 0.99],
      ['far upper arm', tunic.TUNIC_UPPER_F, tunic.TUNIC_REST.TUNIC_UPPER_F, 0.99],
      ['far forearm', tunic.TUNIC_FORE_F, tunic.TUNIC_REST.TUNIC_FORE_F, 0.99],
      ['far fist', tunic.TUNIC_FIST_F, tunic.TUNIC_REST.TUNIC_FIST_F, 0.99],
      ['belt', belt.BELT_BAND, belt.BELT_REST.BELT_BAND, 0.99],
      ['belt ends (behind the fist, filled)', belt.BELT_ENDS_PIECE, belt.BELT_REST.BELT_ENDS_PIECE, 0.9],
      ['seat', cargo.CARGO_SEAT, cargo.CARGO_REST.CARGO_SEAT, 0.99],
      ['near thigh', cargo.CARGO_THIGH_N, cargo.CARGO_REST.CARGO_THIGH_N, 0.99],
      ['near shin', cargo.CARGO_SHIN_N, cargo.CARGO_REST.CARGO_SHIN_N, 0.99],
      ['far thigh', cargo.CARGO_THIGH_F, cargo.CARGO_REST.CARGO_THIGH_F, 0.99],
      ['far shin', cargo.CARGO_SHIN_F, cargo.CARGO_REST.CARGO_SHIN_F, 0.99],
      ['near wraps', wraps.WRAP_SHIN_N, wraps.WRAP_REST.WRAP_SHIN_N, 0.99],
      ['near sandal', wraps.WRAP_FOOT_N, wraps.WRAP_REST.WRAP_FOOT_N, 0.99],
      ['far wraps', wraps.WRAP_SHIN_F, wraps.WRAP_REST.WRAP_SHIN_F, 0.99],
      ['far sandal', wraps.WRAP_FOOT_F, wraps.WRAP_REST.WRAP_FOOT_F, 0.99],
      ['kunai (its handle in the fist, filled)', kunai.KUNAI_PIECE, kunai.KUNAI_REST.KUNAI_PIECE, 0.75],
    ];
    for (const [name, piece, rest, min] of least) {
      const got = atRest(f.rgba, piece, rest);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(1)}% of his pixels at rest (want ${min * 100}%)`);
    }
  });

  it('dresses the bulky body in the same pieces, fitted to it (his colours, the bulky arms its own)', () => {
    const f = renderSprite(renegade('bulky'), 'idle', 0);
    const seen = new Set<string>();
    for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] > 0) seen.add('#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join(''));
    for (const [name, piece] of [['tunic', tunic.TUNIC_BODY], ['belt', belt.BELT_BAND], ['trousers', cargo.CARGO_THIGH_F], ['wraps', wraps.WRAP_SHIN_F], ['mask', mask.CLOTH_MASK]] as [string, PaintedPiece][]) {
      const his = Object.values(piece.colors);
      const shown = his.filter((h) => seen.has(h)).length;
      assert.ok(shown >= his.length * 0.8, `${name}: ${shown} of his ${his.length} colours on the bulky body`);
    }
  });

  it('keeps every part on the body in every pose: nothing comes loose, the kunai stays in the fist', () => {
    // (cast draws its runes apart from the body)
    const poses = [...SPRITE_POSES, ...MOVE_POSES].filter((p) => p !== 'cast') as SpritePose[];
    for (const body of ['male', 'female', 'slender', 'bulky'] as BodyType[]) {
      for (const pose of poses) {
        for (let fr = 0; fr < 8; fr++) {
          const f = renderSprite(renegade(body), pose, fr);
          const loose = islands(f.rgba).filter((n) => n > 3);
          assert.deepEqual(loose, [], `${body} ${pose} ${fr}: loose bits of ${loose.join(', ')} px`);
        }
      }
    }
  });
});
