// Tests for the owner's heroine knights (items/heroineKnights.ts, heroineKnightSword.ts, heroineKnightsRig.ts):
// his three women's sets, worn with Lyra's or Aurelia's whole head (the owner, D-T8 and D-T16: the sets bring
// no head of their own and must sit on both). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import { HK_SKIN } from './heroineKnightsJointsArt';
import { HK_REF } from './heroineKnightsRefPixels';
import { HK_LEGS_KIND } from './items/heroineKnightLegsArt';
import { skinTone } from './painted';
import { GRID, partIndex } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const SETS = ['paladin', 'rogue', 'dragon'] as const;
const HEADS = ['lyra', 'aurelia'] as const;
const PARTS = ['armor', 'hands', 'waist', 'skirt', 'bottom', 'feet', 'cape'] as const;
const N = GRID * GRID;
const preset = (id: string): SpriteAppearance => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character.appearance!;
const hex = (rgba: Uint8ClampedArray | Uint8Array, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const at = (i: number) => `${i % GRID},${(i / GRID) | 0}`;
const bit = (m: Uint8Array | undefined, i: number) => !!m && !!(m[i >> 3] & (1 << (i & 7)));
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** A set worn with one of the sample heads: that heroine's whole head (her skin, eyes, neck, face and hair) on the set's preset. */
function wearing(set: (typeof SETS)[number], head: (typeof HEADS)[number]): SpriteAppearance {
  const base = preset(`preset_heroine_${set}`);
  const h = preset(`preset_${head}`);
  return { ...base, skin: h.skin, eyeShape: h.eyeShape, eyeColor: h.eyeColor, neck: h.neck, faceShape: h.faceShape, slots: { ...base.slots, hair: h.slots.hair } };
}

/** His set at our scale (tools/refs/heroine_knights_ref.py game()): fine pixel -> his colour, or '##' where his head or long hair is. */
function his(set: string): Map<number, string> {
  const ref = HK_REF[set];
  const out = new Map<number, string>();
  ref.rows.forEach((row, j) => {
    for (let i = 0; i < row.length / 2; i++) {
      const p = row.slice(2 * i, 2 * i + 2);
      if (p === '##') out.set((ref.at[1] + j) * GRID + ref.at[0] + i, '##');
      else if (p !== '..') out.set((ref.at[1] + j) * GRID + ref.at[0] + i, ref.colors[DIGITS.indexOf(p[0]) * 36 + DIGITS.indexOf(p[1])]);
    }
  });
  return out;
}

/** The sizes of the pieces of a frame apart from the figure (8-connected), but effects (holes.test.ts loose). */
function loose(rgba: Uint8ClampedArray, fx: Uint8Array | undefined): number[] {
  const seen = new Uint8Array(N);
  const pieces: { n: number; fx: boolean }[] = [];
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3] || seen[i]) continue;
    const p = { n: 0, fx: false };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      p.n++;
      if (bit(fx, j)) p.fx = true;
      const x = j % GRID;
      for (let dy = -GRID; dy <= GRID; dy += GRID)
        for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy + dx;
          if (k < 0 || k >= N || x + dx < 0 || x + dx >= GRID || seen[k] || !rgba[k * 4 + 3]) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    pieces.push(p);
  }
  const main = pieces.reduce((m, p) => (p.n > m.n ? p : m), pieces[0]);
  return pieces.filter((p) => p !== main && !p.fx).map((p) => p.n);
}

describe("the owner's heroine knights", () => {
  for (const set of SETS)
    for (const head of HEADS) {
      it(`the ${set} at rest with ${head}'s head is his picture at our scale, pixel for pixel, and nothing else`, () => {
        // every pixel of the set that shows past her head is his (her skin, the rogue's bare thigh, in the
        // character's skin); under his head and long hair the set is not his picture, and her own head is hers
        const look = wearing(set, head);
        const want = his(set);
        const f = renderSprite(look, 'idle', 0);
        const HEAD = partIndex('head');
        const wrong: string[] = [];
        for (let i = 0; i < N; i++) {
          const w = want.get(i);
          if (w === '##') continue;
          const got = f.rgba[i * 4 + 3] ? hex(f.rgba, i) : undefined;
          if (got && (f.part[i] === HEAD || bit(f.hair, i))) continue;
          const ok = w === got || (w !== undefined && HK_LEGS_KIND[w] === 'skin' && got === skinTone(w, HK_SKIN, look.skin));
          if (!ok) wrong.push(`${at(i)}: ${w ?? 'none'} / ${got ?? 'none'}`);
        }
        assert.deepEqual(wrong.slice(0, 20), []);
      });
    }

  it('each set is whole on both heads in every pose: no loose pieces apart from the figure', () => {
    const poses = [...SPRITE_POSES, ...MOVE_POSES] as SpritePose[];
    const bad: string[] = [];
    for (const set of SETS)
      for (const head of HEADS) {
        const look = wearing(set, head);
        poses.forEach((pose, pi) => {
          const fc = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
          for (let fr = 0; fr < fc; fr++) {
            // every frame of the short poses, every third of the long ones
            if (fc > 6 && (fr + pi) % 3) continue;
            const f = renderSprite(look, pose, fr);
            const specks = loose(f.rgba, f.fx);
            if (specks.length) bad.push(`${set} ${head} ${pose} ${fr}: ${specks.join(', ')} px apart`);
          }
        });
      }
    assert.deepEqual(bad, []);
  });

  it('her sets are one item per part, cut for the fitted female body only, every armour with its stats', () => {
    for (const set of SETS)
      for (const part of PARTS) {
        const id = `${part}_heroine_${set}`;
        const d = getItem(id)!;
        assert.ok(d, id);
        assert.equal(d.slot, part, id);
        assert.deepEqual(d.bodies, ['female'], id);
        assert.ok(fitsBody(d, 'female') && !fitsBody(d, 'male') && !fitsBody(d, 'bulky'), id);
        if (part === 'armor') assert.ok(d.statsArmor, `${id} statsArmor`);
      }
  });

  it('her longsword has parts to pick, as the katana has: the blade and the guard, his by default', () => {
    const d = getItem('held_heroine_longsword')!;
    assert.deepEqual(
      d.parts!.map((p) => p.key),
      ['blade', 'guard'],
    );
    assert.equal(d.parts![1].options[0].id, 'cross');
    const pre = d.partsPreview!(preset('preset_heroine_paladin'), { blade: 'long', guard: 'cross' });
    assert.ok(pre.rows.length > 10 && Object.keys(pre.colors).length > 3);
  });

  it('his colours recolour through the slots, his black line kept', () => {
    const base = preset('preset_heroine_paladin');
    const red = { ...base, slots: { ...base.slots, armor: { id: 'armor_heroine_paladin', colors: ['#3a6ad0', '#c0c0c8', '#d02040'] } } };
    const a = renderSprite(base, 'idle', 0);
    const b = renderSprite(red, 'idle', 0);
    let changed = 0;
    for (let i = 0; i < N; i++) {
      if (!a.rgba[i * 4 + 3]) continue;
      if (hex(a.rgba, i) === '#000100') assert.equal(hex(b.rgba, i), '#000100', `line at ${at(i)}`);
      else if (hex(a.rgba, i) !== hex(b.rgba, i)) changed++;
    }
    assert.ok(changed > 150, `${changed} pixels recoloured`);
  });
});
