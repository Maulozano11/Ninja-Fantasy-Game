// Tests for Lyra's hair (hair_copper_braid), from the owner's picture of her at our game scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { LYRA_HAIR_BASE, LYRA_HAIR_BRAID, LYRA_HAIR_COLORS, LYRA_HAIR_HEAD, LYRA_HAIR_LINE, LYRA_HAIR_LONG, LYRA_HAIR_PIN, LYRA_PIN_BASE, LYRA_RIBBON_BASE } from './items/lyraHairArt';
import { GRID } from './raster';
import { drawRig, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['female', 'slender', 'male', 'bulky'];

const look = (body: BodyType, colors?: string[]): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { hair: { id: 'hair_copper_braid', colors: colors ?? getItem('hair_copper_braid')!.colors.map((c) => c.default) } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hex = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
};

/** The head piece's crown (its rows above the face), where nothing else is drawn at rest. */
function crown(body: BodyType): [number, number, string][] {
  const rig = drawRig(body, rigPoseFor('idle'), 0);
  const { nx, ny } = faceAnchor({ rig, bp: rig.bp, look: look(body) } as Parameters<typeof faceAnchor>[0]);
  const p = LYRA_HAIR_HEAD;
  const out: [number, number, string][] = [];
  p.rows.slice(0, 8).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push([nx - p.pivot[0] + i, ny - p.pivot[1] + j, row[i]]);
  });
  return out;
}

describe("Lyra's hair", () => {
  it('is a hairstyle with hair, ribbon and ornament colours', () => {
    const def = getItem('hair_copper_braid')!;
    assert.equal(def.slot, 'hair');
    assert.deepEqual(def.colors.map((c) => [c.key, c.kind]), [['hair', 'hair'], ['ribbon', 'cloth'], ['ornament', 'metal']]);
  });

  it("has whole pieces: even rows, every character one of his colours, the head piece's pivot on the face", () => {
    for (const p of [LYRA_HAIR_HEAD, LYRA_HAIR_LONG, LYRA_HAIR_BRAID]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(LYRA_HAIR_COLORS[ch] ?? '', /^#[0-9a-f]{6}$/, ch);
    }
    // the face anchor is the near eye's lash start: open face in her head piece
    assert.equal(LYRA_HAIR_HEAD.rows[LYRA_HAIR_HEAD.pivot[1]][LYRA_HAIR_HEAD.pivot[0]], '.');
  });

  it('shows her pixels as she drew them at rest, on every body', () => {
    for (const body of BODIES) {
      const rgba = renderSprite(look(body), 'idle', 0).rgba;
      for (const [x, y, ch] of crown(body)) assert.equal(hex(rgba, x, y), LYRA_HAIR_COLORS[ch], `${body} (${x}, ${y})`);
    }
  });

  it('keeps her line and pin when the hair is recoloured, and moves her auburns', () => {
    const rgba = renderSprite(look('female', ['#e3c25a', LYRA_RIBBON_BASE, LYRA_PIN_BASE]), 'idle', 0).rgba;
    for (const [x, y, ch] of crown('female')) {
      if (LYRA_HAIR_LINE.includes(ch) || LYRA_HAIR_PIN.includes(ch)) assert.equal(hex(rgba, x, y), LYRA_HAIR_COLORS[ch], `(${x}, ${y})`);
      else assert.notEqual(hex(rgba, x, y), LYRA_HAIR_COLORS[ch], `(${x}, ${y})`);
    }
  });

  it('draws in every pose and frame on every body', () => {
    for (const body of BODIES) {
      for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES]) {
        for (const frame of [0, 1, 2, 3]) {
          const rgba = renderSprite(look(body), pose, frame).rgba;
          let line = 0;
          for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && hex(rgba, i % GRID, (i / GRID) | 0) === LYRA_HAIR_BASE) line++;
          assert.ok(line > 0, `${body} ${pose} ${frame}: his auburn shows`);
        }
      }
    }
  });
});
