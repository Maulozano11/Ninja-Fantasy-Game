// Tests for the owner's princess's face: the 'noble' face shape (src/sprite/princessHeadArt.ts) and the
// 'noble' eye shape (src/sprite/princessEyeArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hexToRgb } from './color';
import { renderSprite } from './compose';
import { NOBLE_BROW_HAIR, NOBLE_BROWS, NOBLE_EYE_COLORS, NOBLE_EYES, NOBLE_IRIS, NOBLE_IRIS_TINTED } from './princessEyeArt';
import { NOBLE_HEAD, NOBLE_SKIN } from './princessHeadArt';
import { GRID, RES } from './raster';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, extra: Partial<SpriteAppearance> = {}): SpriteAppearance => ({
  version: 1,
  body,
  skin: NOBLE_SKIN,
  eyeShape: 'noble',
  faceShape: 'noble',
  eyeColor: NOBLE_IRIS,
  slots: { hair: { id: 'hair_none', colors: [NOBLE_BROW_HAIR] } },
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

const anchor = (f: ReturnType<typeof renderSprite>) => {
  const k = f.rig.bp.headScale;
  return { nx: Math.floor((f.rig.head.x - 1.9 * k) * RES), ny: Math.floor((f.rig.head.y + 1.0 * k) * RES) };
};

/** Every pixel her eyes, flick and brows paint in a lid state, as [x, y, colour char] off (ex, fx, ny). */
const eyePixels = (state: keyof typeof NOBLE_EYES, ex: number, fx: number, ny: number): [number, number, string][] => {
  const out: [number, number, string][] = [];
  for (const [side, x0] of [['near', ex], ['far', fx]] as const) {
    NOBLE_EYES[state][side].rows.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && out.push([x0 + c, ny + r, ch])));
    const { at, rows } = NOBLE_BROWS[side];
    rows.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && out.push([x0 + at[0] + c, ny + at[1] + r, ch])));
  }
  const { at, ch } = NOBLE_EYES[state].flick;
  out.push([ex + at[0], ny + at[1], ch]);
  return out;
};

describe("The princess's face (noble)", () => {
  it('has her head as a whole piece: even rows, his colours, its pivot on her face', () => {
    const w = NOBLE_HEAD.rows[0].length;
    for (const row of NOBLE_HEAD.rows) {
      assert.equal(row.length, w);
      for (const ch of row) if (ch !== '.') assert.match(NOBLE_HEAD.colors[ch] ?? '', /^#[0-9a-f]{6}$/);
    }
    assert.ok(Object.values(NOBLE_HEAD.colors).includes(NOBLE_SKIN));
    assert.notEqual(NOBLE_HEAD.rows[NOBLE_HEAD.pivot[1]][NOBLE_HEAD.pivot[0]], '.');
  });

  it('has her eyes in every lid state on the template cells: five columns near, three far, three rows', () => {
    for (const [state, eyes] of Object.entries(NOBLE_EYES)) {
      for (const side of ['near', 'far'] as const) {
        const eye = eyes[side];
        const w = side === 'near' ? 5 : 3;
        assert.equal(eye.letters.length, 3, `${state} ${side}`);
        assert.equal(eye.rows.length, 3, `${state} ${side}`);
        eye.letters.forEach((row, r) => {
          assert.equal(row.length, w, `${state} ${side} letters ${r}`);
          assert.equal(eye.rows[r].length, w, `${state} ${side} rows ${r}`);
          for (let c = 0; c < w; c++) {
            const feature = 'Lhwdi'.includes(row[c]);
            assert.equal(eye.rows[r][c] !== '.', feature, `${state} ${side} ${r},${c}: '${row[c]}' / '${eye.rows[r][c]}'`);
            if (feature) assert.match(NOBLE_EYE_COLORS[eye.rows[r][c]] ?? '', /^#[0-9a-f]{6}$/);
          }
        });
      }
      assert.ok(NOBLE_EYE_COLORS[eyes.flick.ch]);
    }
    for (const ch of NOBLE_IRIS_TINTED) assert.ok(NOBLE_EYE_COLORS[ch]);
    assert.ok(Object.values(NOBLE_EYE_COLORS).includes(NOBLE_IRIS));
  });

  it('draws her head, eyes and brows exactly as he painted them, on every body (her far eye eight columns on)', () => {
    for (const body of ['female', 'male', 'bulky', 'slender'] as BodyType[]) {
      for (const [pose, state] of [['idle', 'open'], ['read', 'lowered']] as [SpritePose, 'open' | 'lowered'][]) {
        const f = renderSprite(look(body), pose, 0);
        const { nx, ny } = anchor(f);
        const eyes = eyePixels(state, nx, nx + 8, ny);
        const covered = new Set(eyes.map(([x, y]) => y * GRID + x));
        for (const [x, y, ch] of eyes) assert.equal(hexAt(f.rgba, x, y), NOBLE_EYE_COLORS[ch], `${body} ${pose} eye ${x},${y}`);
        const ox = nx - NOBLE_HEAD.pivot[0];
        const oy = ny - NOBLE_HEAD.pivot[1];
        NOBLE_HEAD.rows.forEach((row, r) => {
          for (let c = 0; c < row.length; c++) {
            // the lash row and the rows of the eyes are the eye options' (and her mouth is hers: no template mouth)
            if (row[c] === '.' || covered.has((oy + r) * GRID + ox + c)) continue;
            if (oy + r >= ny && oy + r <= ny + 2 && ((ox + c >= nx && ox + c <= nx + 4) || (ox + c >= nx + 8 && ox + c <= nx + 10))) continue;
            assert.equal(hexAt(f.rgba, ox + c, oy + r), NOBLE_HEAD.colors[row[c]], `${body} ${pose} head ${c},${r}`);
          }
        });
      }
    }
  });

  it('moves her iris with the eye colour, her brows with the hair colour, her head with the skin', () => {
    const f = renderSprite(look('female', { eyeColor: '#3b82f6', skin: '#6b3f2a', slots: { hair: { id: 'hair_none', colors: ['#16161d'] } } }), 'idle', 0);
    const { nx, ny } = anchor(f);
    const iris = hexToRgb(hexAt(f.rgba, nx + 2, ny + 1));
    assert.ok(iris[2] > iris[1] && iris[2] > iris[0], `blue iris, got ${hexAt(f.rgba, nx + 2, ny + 1)}`);
    // her black lash and her white stay hers
    assert.equal(hexAt(f.rgba, nx, ny), NOBLE_EYE_COLORS[NOBLE_EYES.open.near.rows[0][0]]);
    assert.equal(hexAt(f.rgba, nx + 1, ny + 2), NOBLE_EYE_COLORS[NOBLE_EYES.open.near.rows[2][1]]);
    const brow = hexToRgb(hexAt(f.rgba, nx + NOBLE_BROWS.near.at[0], ny - 1));
    const hers = hexToRgb(NOBLE_EYE_COLORS[NOBLE_BROWS.near.rows[0][0]]);
    assert.ok(brow[0] < hers[0], 'darker brows for black hair');
    const cheek = hexToRgb(hexAt(f.rgba, nx + 5, ny + 3));
    assert.ok(cheek[0] < hexToRgb(NOBLE_SKIN)[0] - 60, `dark skin, got ${hexAt(f.rgba, nx + 5, ny + 3)}`);
  });

  it('lets our eye shapes draw on her face, and hers on ours', () => {
    const ours = renderSprite(look('female', { eyeShape: 'standard', eyeColor: '#3b82f6' }), 'idle', 0);
    const a = anchor(ours);
    // the standard eye's dark iris row: its far eye's iris eight columns on, on her narrower face
    const far = hexToRgb(hexAt(ours.rgba, a.nx + 8, a.ny + 1));
    assert.ok(far[2] > far[0], `far iris on her face, got ${hexAt(ours.rgba, a.nx + 8, a.ny + 1)}`);
    const hersOnOurs = renderSprite(look('female', { faceShape: 'tapered' }), 'idle', 0);
    const b = anchor(hersOnOurs);
    for (const [x, y, ch] of eyePixels('open', b.nx, b.nx + 9, b.ny)) assert.equal(hexAt(hersOnOurs.rgba, x, y), NOBLE_EYE_COLORS[ch], `on ours ${x},${y}`);
  });
});
