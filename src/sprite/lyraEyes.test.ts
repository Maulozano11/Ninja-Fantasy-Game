// Tests for Lyra's eyes (the 'keen' eye shape, src/sprite/lyraEyeArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { hexToRgb } from './color';
import { KEEN_BROW_HAIR, KEEN_BROWS, KEEN_EYE_COLORS, KEEN_EYES, KEEN_IRIS } from './lyraEyeArt';
import { GRID, RES } from './raster';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, extra: Partial<SpriteAppearance> = {}): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#fdceb0',
  eyeShape: 'keen',
  eyeColor: KEEN_IRIS,
  slots: { hair: { id: 'hair_none', colors: [KEEN_BROW_HAIR] } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
  ...extra,
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

describe("Lyra's eyes (keen)", () => {
  it('has every lid state on the template cells: five columns near, three far, three rows, a colour of hers on every feature', () => {
    for (const [state, eyes] of Object.entries(KEEN_EYES)) {
      for (const [side, eye] of Object.entries(eyes)) {
        const w = side === 'near' ? 5 : 3;
        assert.equal(eye.letters.length, 3, `${state} ${side}`);
        assert.equal(eye.rows.length, 3, `${state} ${side}`);
        eye.letters.forEach((row, r) => {
          assert.equal(row.length, w, `${state} ${side} letters ${r}`);
          assert.equal(eye.rows[r].length, w, `${state} ${side} rows ${r}`);
          for (let c = 0; c < w; c++) {
            const feature = 'BLhwdi'.includes(row[c]);
            assert.equal(eye.rows[r][c] !== '.', feature, `${state} ${side} ${r},${c}: '${row[c]}' / '${eye.rows[r][c]}'`);
            if (feature) assert.match(KEEN_EYE_COLORS[eye.rows[r][c]] ?? '', /^#[0-9a-f]{6}$/);
          }
        });
      }
    }
    for (const brow of Object.values(KEEN_BROWS)) for (const row of brow.rows) for (const ch of row) if (ch !== '.') assert.ok(KEEN_EYE_COLORS[ch]);
  });

  it('draws her pixels exactly, eyes and brows, in her eye and hair colours, on every body', () => {
    for (const body of ['female', 'male', 'bulky'] as BodyType[]) {
      for (const [pose, state] of [['idle', 'open'], ['read', 'lowered']] as [SpritePose, 'open' | 'lowered'][]) {
        const f = renderSprite(look(body), pose, 0);
        const k = f.rig.bp.headScale;
        const nx = Math.floor((f.rig.head.x - 1.9 * k) * RES);
        const ny = Math.floor((f.rig.head.y + 1.0 * k) * RES);
        for (const [side, x0] of [['near', nx], ['far', nx + 9]] as const) {
          KEEN_EYES[state][side].rows.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) if (row[c] !== '.') assert.equal(hexAt(f.rgba, x0 + c, ny + r), KEEN_EYE_COLORS[row[c]], `${body} ${pose} ${side} ${r},${c}`);
          });
          const { at, rows } = KEEN_BROWS[side];
          rows.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) if (row[c] !== '.') assert.equal(hexAt(f.rgba, x0 + at[0] + c, ny + at[1] + r), KEEN_EYE_COLORS[row[c]], `${body} ${pose} ${side} brow ${r},${c}`);
          });
        }
      }
    }
  });

  it('moves her iris with the eye colour and her brows with the hair colour', () => {
    const f = renderSprite(look('female', { eyeColor: '#3b82f6', slots: { hair: { id: 'hair_none', colors: ['#16161d'] } } }), 'idle', 0);
    const k = f.rig.bp.headScale;
    const nx = Math.floor((f.rig.head.x - 1.9 * k) * RES);
    const ny = Math.floor((f.rig.head.y + 1.0 * k) * RES);
    const lit = hexToRgb(hexAt(f.rgba, nx + 2, ny + 1));
    assert.ok(lit[2] > lit[1] && lit[2] > lit[0], `blue iris, got ${hexAt(f.rgba, nx + 2, ny + 1)}`);
    // her lash stays hers
    assert.equal(hexAt(f.rgba, nx + 1, ny), KEEN_EYE_COLORS[KEEN_EYES.open.near.rows[0][1]]);
    const brow = hexToRgb(hexAt(f.rgba, nx + 1, ny - 1));
    const hers = hexToRgb(KEEN_EYE_COLORS[KEEN_BROWS.near.rows[0][0]]);
    assert.ok(brow[0] < hers[0], 'darker brows for black hair');
  });
});
