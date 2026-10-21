// Tests for Aurelia's vestment (armor_dawn_vestment, the owner's picture at our scale): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import type { PaintedPiece } from './painted';
import { GRID, partIndex, RES } from './raster';
import {
  AURELIA_BODICE,
  AURELIA_CLOTH,
  AURELIA_GEM,
  AURELIA_GOLD,
  AURELIA_SLEEVE_FORE_N,
  AURELIA_SLEEVE_UPPER_N,
} from './items/aureliaVestmentArt';
import type { BodyType, SpriteAppearance } from './types';

const look = (body: BodyType, armor?: string[]): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f9ccaa',
  eyeShape: 'standard',
  eyeColor: '#226ba3',
  slots: armor ? { armor: { id: 'armor_dawn_vestment', colors: armor } } : {},
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number): string => {
  const i = (y * GRID + x) * 4;
  return rgba[i + 3] ? '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('') : '';
};

/** Each pixel of a piece where stampPiece lays it at its own angle: [x, y, its colour]. */
const laid = (p: PaintedPiece, at: { x: number; y: number }): [number, number, string][] => {
  const out: [number, number, string][] = [];
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  p.rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && out.push([ax + i, ay + j, p.colors[ch]])));
  return out;
};

describe("Aurelia's vestment", () => {
  it('is armour for the women, her white, gold and gem the defaults', () => {
    const d = getItem('armor_dawn_vestment')!;
    assert.equal(d.slot, 'armor');
    assert.deepEqual(d.bodies, ['female', 'slender']);
    assert.deepEqual(
      d.colors.map((c) => [c.key, c.default]),
      [
        ['cloth', AURELIA_CLOTH],
        ['gold', AURELIA_GOLD],
        ['gem', AURELIA_GEM],
      ],
    );
  });

  it('lays her near sleeve on our female at idle frame 0 exactly as drawn', () => {
    const f = renderSprite(look('female', []), 'idle', 0);
    const upper = laid(AURELIA_SLEEVE_UPPER_N, f.rig.shoulderN);
    const over = new Set(upper.map(([x, y]) => `${x},${y}`));
    const fore = laid(AURELIA_SLEEVE_FORE_N, f.rig.elbowN).filter(([x, y]) => !over.has(`${x},${y}`));
    for (const [x, y, c] of [...upper, ...fore]) assert.equal(hexAt(f.rgba, x, y), c, `(${x}, ${y})`);
  });

  it('shows her gem at the throat, and follows the colour slots', () => {
    const at = (colors: string[]) => {
      const f = renderSprite(look('female', colors), 'idle', 0);
      const gem = laid(AURELIA_BODICE, f.rig.neck).filter(([, , c]) => c === AURELIA_GEM);
      assert.ok(gem.length > 0);
      return gem.map(([x, y]) => hexAt(f.rgba, x, y));
    };
    assert.ok(at([]).every((c) => c === AURELIA_GEM));
    assert.ok(at(['', '', '#c8202c']).every((c) => c !== AURELIA_GEM));
  });

  it('lets none of our undergarment show past her bodice above the hips', () => {
    // our body's bandeau and shorts on the torso (#3b3a46 and its shades): the bare body shows them there
    const under = new Set(['#3b3a46', '#201f29', '#0d0d12', '#5e5c66', '#0a090f']);
    const torso = partIndex('torso');
    const shown = (armor?: string[]) => {
      const f = renderSprite(look('female', armor), 'idle', 0);
      let n = 0;
      for (let y = 150; y < 172; y++) for (let x = 100; x < 150; x++) if (f.part[y * GRID + x] === torso && under.has(hexAt(f.rgba, x, y))) n++;
      return n;
    };
    assert.ok(shown() > 0);
    assert.equal(shown([]), 0);
  });

  it('is not drawn on the men', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.deepEqual(renderSprite(look(body, []), 'idle', 0).rgba, renderSprite(look(body), 'idle', 0).rgba);
    }
  });
});
