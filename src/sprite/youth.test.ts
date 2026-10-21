// Tests for the hair, eyes, clothes and sandals lifted out of the owner's Joven salvaje paint-over: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { getItem } from './catalog';
import { defaultAppearance } from './legacy';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { frameCount, GROUND, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SlotId, type SpriteAppearance, type SpritePose } from './types';
import * as jacket from './items/wildJacketArt';
import * as pants from './items/shinobiPantsArt';
import * as belt from './items/pouchBeltArt';
import * as sandals from './items/strawSandalsArt';
import { WILD_EYE_COLORS, WILD_EYES } from './wildEyeArt';
import { YOUTH_SKIN } from './items/youthKit';

/** Our male (or another body) in only these items, at their default colours, holding nothing. */
const look = (items: Partial<Record<SlotId, string>>, body: BodyType = 'male'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots = {};
  for (const [slot, id] of Object.entries(items)) l.slots[slot as SlotId] = { id: id!, colors: getItem(id!)!.colors.map((c) => c.default) };
  return l;
};

/** As the render he painted over: Solen's skin and red eyes. */
const painted = (items: Partial<Record<SlotId, string>>): SpriteAppearance => ({ ...look(items), skin: YOUTH_SKIN, eyeColor: '#d81b2a' });

const SET = { hair: 'hair_youth', top: 'top_wild_jacket', bottom: 'bottom_shinobi', waist: 'waist_pouches', feet: 'feet_sandals' } as const;
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** How many of a piece's cells the frame shows in his colour at the place the script says it lands. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

/** The lowest opaque row of a frame. */
function sole(rgba: Uint8ClampedArray): number {
  for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (opaque(rgba, y * GRID + x)) return y;
  return -1;
}

// Each item alone on our male at rest, and how much of each of its pieces must show his pixels where the
// script placed it (what is missing lies under the item's other pieces, or is the thigh his shin is hung
// under, or was continued where his picture hid it).
type Case = [string, Partial<Record<SlotId, string>>, Record<string, unknown>, Record<string, [number, number]>, Record<string, number>];
const CASES: Case[] = [
  ['wild jacket', { top: 'top_wild_jacket' }, jacket, jacket.WILD_JACKET_REST, { WILD_JACKET_BODY: 0.88, WILD_SLEEVE_UP_N: 0.97, WILD_SLEEVE_FORE_N: 0.72, WILD_SLEEVE_UP_F: 0.71, WILD_SLEEVE_FORE_F: 0.67, WILD_FIST_N: 0.97, WILD_FIST_F: 0.97 }],
  ['shinobi pants', { bottom: 'bottom_shinobi' }, pants, pants.SHINOBI_PANTS_REST, { SHINOBI_PANTS_SEAT: 0.97, SHINOBI_PANTS_THIGH_N: 0.76, SHINOBI_PANTS_SHIN_N: 0.73, SHINOBI_PANTS_THIGH_F: 0.61, SHINOBI_PANTS_SHIN_F: 0.74 }],
  ['pouch belt', { waist: 'waist_pouches' }, belt, belt.POUCH_BELT_REST, { POUCH_BELT_POUCHES: 0.97, POUCH_BELT_STRAP: 0.97 }],
  ['straw sandals', { feet: 'feet_sandals' }, sandals, sandals.STRAW_SANDAL_REST, { STRAW_SANDAL_STRAP_N: 0.9, STRAW_SANDAL_FOOT_N: 0.97, STRAW_SANDAL_SOLE_N: 0.97, STRAW_SANDAL_STRAP_F: 0.79, STRAW_SANDAL_FOOT_F: 0.97, STRAW_SANDAL_SOLE_F: 0.97 }],
];

describe("the owner's Joven salvaje", () => {
  it('lands every piece on his pixels at rest, where the scripts placed it', () => {
    for (const [name, items, mod, rest, least] of CASES) {
      const f = renderSprite(painted(items), 'idle', 0);
      for (const [piece, min] of Object.entries(least)) {
        const got = atRest(f.rgba, mod[piece] as PaintedPiece, rest[piece]);
        if (process.env.YOUTH_DEBUG) console.log(name, piece, got.toFixed(3));
        assert.ok(got >= min, `${name} ${piece}: ${(got * 100).toFixed(0)}% of his pixels in place`);
      }
    }
  });

  it('stands his sandals on our ground', () => {
    const bare = renderSprite(look({}), 'idle', 0);
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const f = renderSprite(look({ feet: 'feet_sandals', bottom: 'bottom_shinobi' }, body), 'idle', 0);
      assert.equal(sole(f.rgba), sole(bare.rgba), `${body}: his near sole on our ground`);
    }
    assert.ok(sole(bare.rgba) >= GROUND * RES);
  });

  it('draws every pose and frame on the male and bulky bodies', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = { ...look(SET, body), eyeShape: 'wild' as const };
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose));
        for (let fr = 0; fr < n; fr++) {
          const f = renderSprite(l, pose, fr);
          let px = 0;
          for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) px++;
          assert.ok(px > 1800, `${body} ${pose} ${fr}: ${px} pixels`);
        }
      }
    }
  });

  it('turns his sleeves, never our arm, in every pose: no more bare skin than at rest', () => {
    // The pixels that follow the skin colour (with the hands in wraps): the face and neck, his toes, and
    // anything of our bare arms or chest that his jacket let through. In no pose may there be many more
    // of them than at rest (our arms never show beside or instead of his sleeves).
    const skinPixels = (body: BodyType, pose: SpritePose, fr: number) => {
      const l = { ...look({ ...SET, hands: 'hands_wraps' }, body), eyeShape: 'wild' as const };
      const a = renderSprite({ ...l, skin: '#c58c85' }, pose, fr).rgba;
      const b = renderSprite({ ...l, skin: '#8a5a3c' }, pose, fr).rgba;
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (hex(a, i) !== hex(b, i)) n++;
      return n;
    };
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const rest = skinPixels(body, 'idle', 0);
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose));
        for (let fr = 0; fr < n; fr++) {
          const got = skinPixels(body, pose, fr);
          assert.ok(got <= rest * 1.25 + 10, `${body} ${pose} ${fr}: ${got} skin pixels (${rest} at rest)`);
        }
      }
    }
  });

  it('reads the old default colours as his', () => {
    const old: Partial<Record<SlotId, string[]>> = {
      bottom: ['#2b3346', '#e7e1d1'],
      waist: ['#3a2c22', '#86704f', '#b9c0c8'],
      feet: ['#1f1e26', '#c9a46c'],
    };
    // (hair_youth's old colour also means his: the hairstyle draws his base, though our brows keep it.)
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const now = look({ ...SET, hair: 'hair_none' }, body);
      const saved = look({ ...SET, hair: 'hair_none' }, body);
      for (const [slot, colors] of Object.entries(old)) saved.slots[slot as SlotId] = { ...saved.slots[slot as SlotId]!, colors: colors! };
      assert.deepEqual(renderSprite(saved, 'idle', 0).rgba, renderSprite(now, 'idle', 0).rgba, body);
    }
  });

  it('keeps the drawn trousers, belt and sandals on the female bodies, and the jacket off them', () => {
    // His colours, less his black line (near-blacks our own drawing may share) and the item's default colours
    // (his bases, which our drawing also paints its cloth in).
    const bases = [pants.SHINOBI_PANTS_SLATE, pants.SHINOBI_PANTS_WRAP, belt.POUCH_BELT_LEATHER, belt.POUCH_BELT_KHAKI, belt.POUCH_BELT_BUCKLE, sandals.STRAW_SANDAL_STRAPS, sandals.STRAW_SANDAL_SOLE];
    const slots: Record<string, string> = { ...pants.SHINOBI_PANTS_SLOT, ...belt.POUCH_BELT_SLOT, ...sandals.STRAW_SANDAL_SLOT };
    const his = new Set(
      [pants.SHINOBI_PANTS_SEAT, pants.SHINOBI_PANTS_THIGH_N, belt.POUCH_BELT_POUCHES, sandals.STRAW_SANDAL_FOOT_N].flatMap((p) => Object.values(p.colors)).filter((h) => slots[h] !== 'line' && !bases.includes(h)),
    );
    for (const body of ['female', 'slender'] as BodyType[]) {
      const f = renderSprite(look({ bottom: 'bottom_shinobi', waist: 'waist_pouches', feet: 'feet_sandals' }, body), 'idle', 0);
      let mine = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && his.has(hex(f.rgba, i))) mine++;
      assert.ok(mine < 10, `${body}: ${mine} of his pixels`);
      assert.ok(!getItem('top_wild_jacket')!.bodies!.includes(body));
    }
  });

  it('draws his eyes, lowered when reading and shut when knocked out, his red at the default colour', () => {
    // Our face anchor at male idle frame 0 (the near eye's lash start), and where the far eye starts.
    const [nx, ny] = [123, 139];
    for (const [pose, state] of [['idle', 'open'], ['read', 'lowered'], ['downed', 'closed']] as const) {
      const l = { ...painted({}), eyeShape: 'wild' as const };
      const f = renderSprite(l, pose, 0);
      if (pose !== 'idle') {
        // (the other poses move the head: only check the eye states differ from the open eyes)
        const open = renderSprite(l, 'idle', 0);
        assert.notDeepEqual(f.rgba, open.rgba);
        continue;
      }
      for (const [eye, x0] of [['near', nx], ['far', nx + 9]] as const) {
        const e = WILD_EYES[state][eye];
        e.rows.forEach((row, r) => {
          for (let c = 0; c < row.length; c++) {
            if (row[c] === '.') continue;
            const mark = e.marks[r][c];
            const want = WILD_EYE_COLORS[row[c]];
            const i = (ny + e.at[1] + r) * GRID + x0 + e.at[0] + c;
            // His brows follow the hair colour: with no hair they keep his.
            assert.equal(hex(f.rgba, i), want, `${eye} ${mark} at row ${r} col ${c}`);
          }
        });
      }
    }
  });
});
