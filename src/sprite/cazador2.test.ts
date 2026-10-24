// Tests for the owner's Cazador 2 (her ponytail, half mask, the female chestguard, leggings, wrapped
// boots and kunai): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter } from '../battle/units';
import { renderSprite } from './compose';
import * as boots from './items/shinobiBootsFemaleArt';
import * as eyes from './huntressEyeArt';
import * as face from './huntressHeadArt';
import * as hair from './items/ponyHairArt';
import * as kunai from './items/kunaiArt';
import * as legs from './items/huntressLeggingsArt';
import * as mask from './items/lynxMaskArt';
import * as vest from './items/shadowOpsFemaleArt';
import * as male from './items/shadowOpsArt';
import { hisLeg, type PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { drawRig, rigPoseFor } from './rig';
import { MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const cazador2 = (body: BodyType = 'female'): SpriteAppearance => {
  const l = structuredClone(enemyCharacter('hunter', 1).appearance!);
  l.body = body;
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, 'sit'] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** How many of a piece's cells the idle frame shows in his colour (within 3), where the script says it lands. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      const c = piece.colors[row[i]];
      if (opaque(rgba, p) && [0, 1, 2].every((k) => Math.abs(rgba[p * 4 + k] - parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16)) <= 3)) hit++;
    }
  });
  return hit / n;
}

describe('the Cazador 2', () => {
  it('lands every piece on his pixels at rest, where the script placed it', () => {
    const f = renderSprite(cazador2(), 'idle', 0);
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['hair', hair.PONY_HAIR, hair.PONY_HAIR_REST.PONY_HAIR, 0.95],
      ['mask', mask.LYNX_MASK, mask.LYNX_MASK_REST.LYNX_MASK, 0.95],
      ['ears', mask.LYNX_EARS, mask.LYNX_MASK_REST.LYNX_EARS, 1],
      ['vest', vest.SHADOW_F_VEST, vest.SHADOW_F_REST.SHADOW_F_VEST, 0.8],
      ['near guard', vest.SHADOW_F_GUARD_N, vest.SHADOW_F_REST.SHADOW_F_GUARD_N, 1],
      ['near arm', vest.SHADOW_F_FORE_N, vest.SHADOW_F_REST.SHADOW_F_FORE_N, 0.95],
      ['near fist', vest.SHADOW_F_FIST_N, vest.SHADOW_F_REST.SHADOW_F_FIST_N, 0.9],
      ['far arm wrap', vest.SHADOW_F_FORE_F, vest.SHADOW_F_REST.SHADOW_F_FORE_F, 0.6],
      ['far fist', vest.SHADOW_F_FIST_F, vest.SHADOW_F_REST.SHADOW_F_FIST_F, 1],
      ['waist', legs.LEGGINGS_WAIST, legs.LEGGINGS_REST.LEGGINGS_WAIST, 1],
      ['near thigh', legs.LEGGINGS_THIGH_N, legs.LEGGINGS_REST.LEGGINGS_THIGH_N, 0.85],
      ['far thigh', legs.LEGGINGS_THIGH_F, legs.LEGGINGS_REST.LEGGINGS_THIGH_F, 0.95],
      ['near boot', boots.BOOT_F_SHIN_N, boots.BOOT_F_REST.BOOT_F_SHIN_N, 0.95],
      ['near foot', boots.BOOT_F_FOOT_N, boots.BOOT_F_REST.BOOT_F_FOOT_N, 1],
      ['far boot', boots.BOOT_F_SHIN_F, boots.BOOT_F_REST.BOOT_F_SHIN_F, 0.95],
      ['far foot', boots.BOOT_F_FOOT_F, boots.BOOT_F_REST.BOOT_F_FOOT_F, 1],
      ['kunai', kunai.KUNAI_ART, kunai.KUNAI_REST.KUNAI_ART, 0.75],
    ];
    for (const [name, piece, rest, min] of least) {
      const got = atRest(f.rgba, piece, rest);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
  });

  it('wears the female chestguard on the female bodies and the male one on the male bodies', () => {
    const count = (body: BodyType, piece: PaintedPiece) => {
      const f = renderSprite(cazador2(body), 'idle', 0);
      const colors = new Set(Object.values(piece.colors));
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && colors.has(hex(f.rgba, i))) n++;
      return n;
    };
    assert.ok(count('female', vest.SHADOW_F_VEST) > count('female', male.SHADOW_VEST));
    assert.ok(count('male', male.SHADOW_VEST) > count('male', vest.SHADOW_F_VEST));
  });

  it('carries her own leg joints with our leg, at her lengths, so her boots stay on her shins', () => {
    const len = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    for (const s of ['N', 'F'] as const) {
      const leg = legs.LEGGINGS_LEGS[s];
      const rest = hisLeg(drawRig('female', 'idle', 0), leg, s);
      // At rest they are where he drew them.
      assert.ok(Math.abs(rest.ankle.x * RES - leg.ankle[0]) < 1e-6 && Math.abs(rest.ankle.y * RES - leg.ankle[1]) < 1e-6);
      const thigh = Math.hypot(leg.knee[0] - leg.hip[0], leg.knee[1] - leg.hip[1]) / RES;
      const shin = Math.hypot(leg.ankle[0] - leg.knee[0], leg.ankle[1] - leg.knee[1]) / RES;
      for (const pose of POSES) {
        for (const frame of [0, 1, 2, 3]) {
          const j = hisLeg(drawRig('female', rigPoseFor(pose), frame), leg, s);
          assert.ok(Math.abs(len(j.hip, j.knee) - thigh) < 1e-6 && Math.abs(len(j.knee, j.ankle) - shin) < 1e-6, `${s} ${pose} ${frame}`);
        }
      }
    }
  });

  it('draws every pose on every body', () => {
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(cazador2(body), pose, 0);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
      }
    }
  });

  it('draws the old default colours, which characters saved, in his colours', () => {
    // (The hair's colour also colours our face's brows, so it is left as it is here.)
    const his = cazador2();
    const old = cazador2();
    old.slots.armor = { id: 'armor_shadowops', colors: ['#8c94a1', '#262833'] };
    old.slots.face = { id: 'face_catmask', colors: ['#f2eee6', '#1f9e9a', '#1b1420'] };
    old.slots.held = { id: 'held_kunai', colors: ['#aab4c2', '#3a3346'] };
    const a = renderSprite(his, 'idle', 0).rgba;
    const b = renderSprite(old, 'idle', 0).rgba;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    assert.equal(d, 0);
  });

  // The face anchor at idle frame 0: where the hair's pivot cell lands.
  const anchor = (): [number, number] => [hair.PONY_HAIR_REST.PONY_HAIR[0] + hair.PONY_HAIR.pivot[0], hair.PONY_HAIR_REST.PONY_HAIR[1] + hair.PONY_HAIR.pivot[1]];
  /** Each cell where her face shows between her strands, as fine pixels of the idle frame. */
  const gaps = (): [number, number][] => {
    const [nx, ny] = anchor();
    const g = hair.PONY_FACE_GAPS;
    const out: [number, number][] = [];
    g.rows.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && out.push([nx - g.pivot[0] + i, ny - g.pivot[1] + j])));
    return out;
  };

  it('shows her face between her strands and over the mask in his pixels, her eyes open on it', () => {
    const f = renderSprite(cazador2(), 'idle', 0).rgba;
    const [nx, ny] = anchor();
    const at = (p: { rows: string[]; colors: Record<string, string> }, x0: number, y0: number, x: number, y: number) => {
      const ch = p.rows[y - y0]?.[x - x0];
      return ch && ch !== '.' ? p.colors[ch] : undefined;
    };
    const head = face.HUNTRESS_HEAD;
    const open = eyes.HUNTRESS_EYES.open;
    const eye = (x: number, y: number) =>
      at({ rows: open.near.rows, colors: eyes.HUNTRESS_EYE_COLORS }, nx, ny, x, y) ?? at({ rows: open.far.rows, colors: eyes.HUNTRESS_EYE_COLORS }, nx + 8, ny, x, y);
    for (const [x, y] of gaps()) {
      // (His line beside her eye is also the hair's, within 3 of it.)
      const want = (eye(x, y) ?? at(head, nx - head.pivot[0], ny - head.pivot[1], x, y))!;
      const i = y * GRID + x;
      assert.ok(opaque(f, i) && [0, 1, 2].every((k) => Math.abs(f[i * 4 + k] - parseInt(want.slice(1 + 2 * k, 3 + 2 * k), 16)) <= 3), `${x},${y}: ${hex(f, i)}, his ${want}`);
    }
  });

  it('keeps the forehead between her strands on any face', () => {
    // (The slender body's face anchor at rest is the female one's.)
    for (const body of ['female'] as BodyType[]) {
      const l = cazador2(body);
      l.faceShape = 'tapered';
      l.eyeShape = 'sharp';
      const f = renderSprite(l, 'idle', 0).rgba;
      for (const [x, y] of gaps()) assert.ok(opaque(f, y * GRID + x), `${body} ${x},${y}`);
    }
  });
});
