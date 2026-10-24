// Tests for the owner's Cazador 1 (his hair, oni mask, vest, trousers, boots and naginata): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter } from '../battle/units';
import { renderSprite } from './compose';
import * as boots from './items/shinobiBootsArt';
import * as hair from './items/hunterHairArt';
import * as mask from './items/oniMaskArt';
import * as nag from './items/naginataArt';
import * as vest from './items/shadowOpsArt';
import * as trousers from './items/hunterTrousersArt';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { buildRig, rigPoseFor } from './rig';
import { MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const cazador = (body: BodyType = 'male'): SpriteAppearance => {
  const l = structuredClone(enemyCharacter('hunter', 0).appearance!);
  l.body = body;
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, 'sit'] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/**
 * How many of a piece's cells the idle frame shows in his colour, at the place the script says it lands
 * (within 3 in each channel: where two pieces share his pixels, each keeps its own of his near colours).
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
      if (opaque(rgba, p) && [0, 1, 2].every((k) => Math.abs(rgba[p * 4 + k] - parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16)) <= 3)) hit++;
    }
  });
  return hit / n;
}

/** Distance from p to the segment a-b. */
function toSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

describe('the Cazador 1', () => {
  it('lands every piece on his pixels at rest, where the script placed it', () => {
    const f = renderSprite(cazador(), 'idle', 0);
    // What each piece shows of his pixels in our idle (the rest is the cloth continued under what covers
    // it in his picture: the guard, the naginata, the vest, the horns, the strands of hair).
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['hair', hair.HUNTER_HAIR, hair.HUNTER_HAIR_REST.HUNTER_HAIR, 0.95],
      ['mask', mask.ONI_MASK, mask.ONI_MASK_REST.ONI_MASK, 0.9],
      ['horns', mask.ONI_HORNS, mask.ONI_MASK_REST.ONI_HORNS, 1],
      ['vest', vest.SHADOW_VEST, vest.SHADOW_REST.SHADOW_VEST, 0.9],
      ['near guard', vest.SHADOW_GUARD_N, vest.SHADOW_REST.SHADOW_GUARD_N, 1],
      ['near arm', vest.SHADOW_FORE_N, vest.SHADOW_REST.SHADOW_FORE_N, 0.98],
      ['near fist', vest.SHADOW_FIST_N, vest.SHADOW_REST.SHADOW_FIST_N, 1],
      ['far sleeve', vest.SHADOW_UPPER_F, vest.SHADOW_REST.SHADOW_UPPER_F, 0.45],
      ['far arm guard', vest.SHADOW_FORE_F, vest.SHADOW_REST.SHADOW_FORE_F, 0.88],
      ['far fist', vest.SHADOW_FIST_F, vest.SHADOW_REST.SHADOW_FIST_F, 1],
      ['waist', trousers.TROUSERS_WAIST, trousers.TROUSERS_REST.TROUSERS_WAIST, 1],
      ['near thigh', trousers.TROUSERS_THIGH_N, trousers.TROUSERS_REST.TROUSERS_THIGH_N, 0.9],
      ['far thigh', trousers.TROUSERS_THIGH_F, trousers.TROUSERS_REST.TROUSERS_THIGH_F, 0.95],
      ['near boot', boots.BOOT_SHIN_N, boots.BOOT_REST.BOOT_SHIN_N, 0.85],
      ['near foot', boots.BOOT_FOOT_N, boots.BOOT_REST.BOOT_FOOT_N, 1],
      ['far boot', boots.BOOT_SHIN_F, boots.BOOT_REST.BOOT_SHIN_F, 0.88],
      ['far foot', boots.BOOT_FOOT_F, boots.BOOT_REST.BOOT_FOOT_F, 1],
      ['naginata', nag.NAGINATA, nag.NAGINATA_REST.NAGINATA, 0.9],
    ];
    for (const [name, piece, rest, min] of least) {
      const got = atRest(f.rgba, piece, rest);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
  });

  it('holds the naginata at his angle at rest, blade down across the legs', () => {
    assert.equal(nag.NAGINATA.angle, 45);
  });

  it('keeps both arm guards on the forearms in every pose on the male and bulky bodies', () => {
    const plate = new Set(Object.entries(vest.SHADOW_FORE_F.colors).filter(([, h]) => vest.SHADOW_KIND[h] === 'plate').map(([, h]) => h));
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const pose of POSES) {
        const r = buildRig(body, rigPoseFor(pose), 1);
        const f = renderSprite(cazador(body), pose, 1);
        const fore = [
          [r.elbowN, r.wristN],
          [r.elbowF, r.wristF],
        ].map(([a, b]) => [{ x: a.x * RES, y: a.y * RES }, { x: b.x * RES, y: b.y * RES }]);
        // Every pixel in his far guard's plate colours lies on a forearm (it is not left at the hip or cut
        // loose), give or take the guard's width.
        let off = 0;
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (!opaque(f.rgba, i) || !plate.has(hex(f.rgba, i))) continue;
          n++;
          const p = { x: (i % GRID) + 0.5, y: Math.floor(i / GRID) + 0.5 };
          if (Math.min(...fore.map(([a, b]) => toSegment(p, a, b))) > 7) off++;
        }
        assert.ok(off <= n * 0.1, `${body} ${pose}: ${off} of ${n} guard pixels off the forearms`);
      }
    }
  });

  it('draws every pose on every body', () => {
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(cazador(body), pose, 0);
        let n = 0;
        let white = 0;
        const porcelain = new Set(Object.values(mask.ONI_MASK.colors).filter((h) => mask.ONI_MASK_KIND[h] === 'porcelain'));
        for (let i = 0; i < GRID * GRID; i++) {
          if (!opaque(f.rgba, i)) continue;
          n++;
          if (porcelain.has(hex(f.rgba, i))) white++;
        }
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
        assert.ok(white > 0, `${body} ${pose}: the mask's porcelain is missing`);
      }
    }
  });

  it('draws the old default colours, which characters saved, in his colours', () => {
    const his = cazador();
    const old = cazador();
    old.slots.armor = { id: 'armor_shadowops', colors: ['#8c94a1', '#262833'] };
    old.slots.face = { id: 'face_foxmask', colors: ['#f2eee6', '#cf2a2a', '#1b1420'] };
    old.slots.hair = { id: 'hair_lowtail', colors: ['#141218'] };
    old.slots.held = { id: 'held_naginata', colors: ['#d4dbe4', '#5a3622', '#c9a227'] };
    const a = renderSprite(his, 'idle', 0).rgba;
    const b = renderSprite(old, 'idle', 0).rgba;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    assert.equal(d, 0);
  });
});
