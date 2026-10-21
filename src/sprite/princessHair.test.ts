// Tests for the princess's hair (hair_rose_dawn) and tiara (acc_rose_tiara), from the owner's princess picture
// at our game scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import {
  PRINCESS_HAIR_BACK,
  PRINCESS_HAIR_BARE,
  PRINCESS_HAIR_BASE,
  PRINCESS_HAIR_COLORS,
  PRINCESS_HAIR_EAR,
  PRINCESS_HAIR_HEAD,
  PRINCESS_HAIR_LINE,
  PRINCESS_HAIR_LONG,
  PRINCESS_HAIR_STRAND,
  PRINCESS_TIARA,
  PRINCESS_TIARA_COLORS,
  PRINCESS_TIARA_FIXED,
  PRINCESS_TIARA_GEM,
} from './items/princessHairArt';
import { GRID } from './raster';
import { drawRig, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type ItemChoice, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['female', 'slender', 'male', 'bulky'];
const defaults = (id: string) => getItem(id)!.colors.map((c) => c.default);

const look = (body: BodyType, hair?: string[], tiara?: string[] | null): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { hair: { id: 'hair_rose_dawn', colors: hair ?? defaults('hair_rose_dawn') } },
  accessories: tiara === null ? [] : ([{ id: 'acc_rose_tiara', colors: tiara ?? defaults('acc_rose_tiara') }] as ItemChoice[]),
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hex = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
};

/** A face piece's cells in the frame at idle (rows from `from` to `to`), with their characters. */
function cells(body: BodyType, p: { pivot: [number, number]; rows: string[] }, from = 0, to = p.rows.length): [number, number, string][] {
  const rig = drawRig(body, rigPoseFor('idle'), 0);
  const { ex, ny } = faceAnchor({ rig, bp: rig.bp, look: look(body) } as unknown as DrawCtx);
  const out: [number, number, string][] = [];
  p.rows.slice(from, to).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push([ex - p.pivot[0] + i, ny - p.pivot[1] + j + from, row[i]]);
  });
  return out;
}

describe("The princess's hair and tiara", () => {
  it('are a hairstyle with a hair colour and an accessory with gold and gem colours', () => {
    const hair = getItem('hair_rose_dawn')!;
    assert.equal(hair.slot, 'hair');
    assert.deepEqual(hair.colors.map((c) => [c.key, c.kind]), [['hair', 'hair']]);
    const tiara = getItem('acc_rose_tiara')!;
    assert.equal(tiara.slot, 'accessory');
    assert.deepEqual(tiara.colors.map((c) => [c.key, c.kind]), [['gold', 'metal'], ['gem', 'cloth']]);
  });

  it('has whole pieces: even rows, every character one of his colours', () => {
    for (const p of [PRINCESS_HAIR_HEAD, PRINCESS_HAIR_BARE, PRINCESS_HAIR_BACK, PRINCESS_HAIR_LONG, PRINCESS_HAIR_STRAND]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(PRINCESS_HAIR_COLORS[ch] ?? '', /^#[0-9a-f]{6}$/, ch);
    }
    for (const r of PRINCESS_TIARA.rows) for (const ch of r) if (ch !== '.') assert.match(PRINCESS_TIARA_COLORS[ch] ?? '', /^#[0-9a-f]{6}$/, ch);
    // the face anchor is the near eye: his face is open in the head piece there
    assert.equal(PRINCESS_HAIR_HEAD.rows[PRINCESS_HAIR_HEAD.pivot[1]][PRINCESS_HAIR_HEAD.pivot[0]], '.');
  });

  it('shows his pixels as he drew them at rest, on every body: the head piece, and the tiara over it', () => {
    for (const body of BODIES) {
      const rgba = renderSprite(look(body), 'idle', 0).rgba;
      const tiara = new Set(cells(body, PRINCESS_TIARA).map(([x, y]) => y * GRID + x));
      for (const [x, y, ch] of cells(body, PRINCESS_TIARA)) assert.equal(hex(rgba, x, y), PRINCESS_TIARA_COLORS[ch], `${body} tiara (${x}, ${y})`);
      for (const [x, y, ch] of cells(body, PRINCESS_HAIR_HEAD, 0, PRINCESS_HAIR_HEAD.pivot[1] - 1)) {
        if (tiara.has(y * GRID + x) || ch in PRINCESS_HAIR_EAR) continue;
        assert.equal(hex(rgba, x, y), PRINCESS_HAIR_COLORS[ch], `${body} hair (${x}, ${y})`);
      }
    }
  });

  it('fills the crown under the tiara when it is not worn', () => {
    const rgba = renderSprite(look('female', undefined, null), 'idle', 0).rgba;
    const bare = new Map(cells('female', PRINCESS_HAIR_BARE).map(([x, y, ch]) => [y * GRID + x, ch]));
    for (const [x, y, ch] of cells('female', PRINCESS_TIARA)) {
      const head = cells('female', PRINCESS_HAIR_HEAD).find(([hx, hy]) => hx === x && hy === y);
      if (!head) assert.equal(rgba[(y * GRID + x) * 4 + 3], 0, `(${x}, ${y}) is off the head`);
      else assert.equal(hex(rgba, x, y), PRINCESS_HAIR_COLORS[bare.get(y * GRID + x) ?? head[2]], `(${x}, ${y}) ${ch}`);
    }
  });

  it('keeps his line when recoloured and moves his pinks; the tiara keeps its line and white', () => {
    const rgba = renderSprite(look('female', ['#2b2b38'], ['#c8ccd6', '#2f6bd8']), 'idle', 0).rgba;
    const tiara = new Set(cells('female', PRINCESS_TIARA).map(([x, y]) => y * GRID + x));
    for (const [x, y, ch] of cells('female', PRINCESS_HAIR_HEAD, 0, PRINCESS_HAIR_HEAD.pivot[1] - 1)) {
      if (tiara.has(y * GRID + x) || ch in PRINCESS_HAIR_EAR) continue;
      if (PRINCESS_HAIR_LINE.includes(ch)) assert.equal(hex(rgba, x, y), PRINCESS_HAIR_COLORS[ch], `(${x}, ${y})`);
      else assert.notEqual(hex(rgba, x, y), PRINCESS_HAIR_COLORS[ch], `(${x}, ${y})`);
    }
    for (const [x, y, ch] of cells('female', PRINCESS_TIARA)) {
      if (PRINCESS_TIARA_FIXED.includes(ch)) assert.equal(hex(rgba, x, y), PRINCESS_TIARA_COLORS[ch], `(${x}, ${y})`);
      else assert.notEqual(hex(rgba, x, y), PRINCESS_TIARA_COLORS[ch], `(${x}, ${y}) ${PRINCESS_TIARA_GEM.includes(ch) ? 'gem' : 'gold'}`);
    }
  });

  it('draws in every pose on every body (two frames on the female bodies)', () => {
    for (const body of BODIES) {
      for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES]) {
        for (const frame of body === 'female' || body === 'slender' ? [0, 2] : [0]) {
          const rgba = renderSprite(look(body), pose, frame).rgba;
          let pink = 0;
          for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && hex(rgba, i % GRID, (i / GRID) | 0) === PRINCESS_HAIR_BASE) pink++;
          assert.ok(pink > 0, `${body} ${pose} ${frame}: his pink shows`);
        }
      }
    }
  });
});
