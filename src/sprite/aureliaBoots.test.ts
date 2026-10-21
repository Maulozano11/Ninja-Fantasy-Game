// Tests for Aurelia's boots (feet_dawn_boots), the owner's pixels from his picture of her at our scale:
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import {
  DAWN_BOOT_CLOTH,
  DAWN_BOOT_GOLD,
  DAWN_FOOT_F,
  DAWN_FOOT_N,
  DAWN_SHIN_F,
  DAWN_SHIN_N,
  DAWN_THIGH_F,
  DAWN_THIGH_N,
} from './items/aureliaBootsArt';
import { type PaintedPiece, segAngle } from './painted';
import { GRID, RES, Vec } from './raster';
import { buildRig } from './rig';
import { rotateTemplate } from './rotsprite';
import type { SpriteAppearance } from './types';

const hexAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};

function look(colors: string[] = []): SpriteAppearance {
  const base = DEFAULT_CHARACTER.appearance!;
  return { ...base, body: 'female', slots: { feet: { id: 'feet_dawn_boots', colors } }, pixelEdits: [] };
}

/** Each pixel of a piece as laid at rest (its pivot on the joint): [x, y, his colour]. */
function laid(p: PaintedPiece, at: Vec, keep: (x: number, y: number) => boolean = () => true): [number, number, string][] {
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const out: [number, number, string][] = [];
  p.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.' && keep(ax + i, ay + j)) out.push([ax + i, ay + j, p.colors[ch]]);
  }));
  return out;
}

describe('Dawn Boots', () => {
  it('is a women-only boot in the feet slot with his white and gold as defaults', () => {
    const item = getItem('feet_dawn_boots')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female', 'slender']);
    assert.deepEqual(item.colors.map((c) => c.default), [DAWN_BOOT_CLOTH, DAWN_BOOT_GOLD]);
  });

  it('stands at rest exactly as laid: every pixel of the near boot and the far shin and shoe is his', () => {
    const f = renderSprite(look(), 'idle', 0);
    const r = buildRig('female', 'idle', 0);
    const farThigh = new Set(
      rotateTemplate(DAWN_THIGH_F, segAngle(r.hipF, r.kneeF) - DAWN_THIGH_F.angle).map((p) => `${Math.floor(r.kneeF.x * RES) + p.dx},${Math.floor(r.kneeF.y * RES) + p.dy}`),
    );
    const pixels = [
      ...laid(DAWN_THIGH_N, r.kneeN),
      ...laid(DAWN_SHIN_N, r.ankleN),
      ...laid(DAWN_FOOT_N, r.ankleN),
      ...laid(DAWN_FOOT_F, r.ankleF),
      // the far thigh's piece (his near lace top, turned with our far thigh) covers the far shin's top
      ...laid(DAWN_SHIN_F, r.ankleF, (x, y) => !farThigh.has(`${x},${y}`)),
    ];
    assert.ok(pixels.length > 400);
    for (const [x, y, hex] of pixels) assert.equal(hexAt(f.rgba, x, y), hex, `pixel ${x},${y}`);
  });

  it('recolours cloth and gold from the colour slots and keeps his black line', () => {
    const r = buildRig('female', 'idle', 0);
    const base = renderSprite(look(), 'idle', 0);
    const f = renderSprite(look(['#3b6fd4', '#c0c0c0']), 'idle', 0);
    let line = 0;
    let changed = 0;
    for (const [x, y, hex] of laid(DAWN_SHIN_N, r.ankleN)) {
      if (hex === DAWN_SHIN_N.colors.k) {
        assert.equal(hexAt(f.rgba, x, y), hex);
        line++;
      } else if (hexAt(f.rgba, x, y) !== hexAt(base.rgba, x, y)) changed++;
    }
    assert.ok(line > 10 && changed > 40);
  });
});
