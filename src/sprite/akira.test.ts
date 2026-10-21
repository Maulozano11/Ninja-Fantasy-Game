// Tests for the owner's Akira (his paint-over, docs/reference/akira-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { emberLegOut } from './items/ember';
import * as bracers from './items/emberBracersArt';
import * as feet from './items/emberFeetArt';
import * as katana from './items/emberKatanaArt';
import * as armor from './items/emberLeatherArt';
import * as legs from './items/emberLegsArt';
import * as tassets from './items/emberTassetsArt';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { drawRig, frameCount, rigPoseFor } from './rig';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const AKIRA = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_ember')!.character;
const look = (body: BodyType = 'male'): SpriteAppearance => ({ ...structuredClone(AKIRA.appearance!), body });

const POSES: SpritePose[] = ['idle', 'walk', 'run', 'attack', 'cast', 'handsigns', 'hurt', 'victory', 'charge', 'crouch', 'sneak', 'downed', 'sit', 'read', 'lean', 'train', 'throw', 'pierce'];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/**
 * How many of a piece's cells the idle frame shows in his colour (within the few levels his JPEG's
 * colours are merged by), at the place the script says he drew it. `skip` leaves out his skin, which
 * follows the character's.
 */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number], skip: (hex: string) => boolean = () => false): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.' || skip(piece.colors[row[i]])) continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      const c = rgb(piece.colors[row[i]]);
      if (opaque(rgba, p) && [0, 1, 2].every((k) => Math.abs(rgba[p * 4 + k] - c[k]) <= 8)) hit++;
    }
  });
  return hit / n;
}

/** Opaque pixels outside the figure's largest 8-connected part: pieces come off the figure. */
function detached(rgba: Uint8ClampedArray): number {
  const seen = new Uint8Array(GRID * GRID);
  let total = 0;
  let best = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!opaque(rgba, i)) continue;
    total++;
    if (seen[i]) continue;
    let n = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const q = stack.pop()!;
      n++;
      const x = q % GRID;
      const y = (q / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx;
          const Y = y + dy;
          if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
          const r = Y * GRID + X;
          if (!seen[r] && opaque(rgba, r)) {
            seen[r] = 1;
            stack.push(r);
          }
        }
    }
    best = Math.max(best, n);
  }
  return total - best;
}

describe("the owner's Akira", () => {
  it('lands every piece on his pixels at rest, where he drew it', () => {
    const f = renderSprite(look(), 'idle', 0);
    const skin = (kinds: Record<string, string>) => (hex: string) => kinds[hex] === 'skin';
    // What each piece shows of his pixels in Akira's idle: the rest lies under his other pieces and
    // our head, or is his pixels continued where he hid them (the chest under the near guard, the
    // tassets and the far leg behind the katana, the wrap in his fist).
    const least: [string, PaintedPiece, [number, number], number, ((h: string) => boolean)?][] = [
      ['chest', armor.EMBER_CHEST, armor.EMBER_REST.EMBER_CHEST, 0.85],
      ['near shoulder guard', armor.EMBER_PAULDRON_N, armor.EMBER_REST.EMBER_PAULDRON_N, 0.98],
      ['far shoulder guard', armor.EMBER_PAULDRON_F, armor.EMBER_REST.EMBER_PAULDRON_F, 0.98],
      ['near arm guard', bracers.EMBER_BRACER_N, bracers.EMBER_BRACER_REST.EMBER_BRACER_N, 0.9],
      ['far arm guard', bracers.EMBER_BRACER_F, bracers.EMBER_BRACER_REST.EMBER_BRACER_F, 0.98],
      ['far fist', bracers.EMBER_FIST_F, bracers.EMBER_BRACER_REST.EMBER_FIST_F, 0.98],
      ['near fist', bracers.EMBER_FIST_N, bracers.EMBER_BRACER_REST.EMBER_FIST_N, 0.98],
      ['tassets', tassets.TASSET_FRONT, tassets.TASSET_REST.TASSET_FRONT, 0.75],
      ['near shin', legs.LEG_SHIN_N, legs.LEG_REST.LEG_SHIN_N, 0.98],
      ['far leg', legs.LEG_SHIN_F, legs.LEG_REST.LEG_SHIN_F, 0.68],
      ['near boot', feet.FOOT_BOOT_N, feet.FOOT_REST.FOOT_BOOT_N, 0.98],
      ['far sandal', feet.FOOT_SANDAL_F, feet.FOOT_REST.FOOT_SANDAL_F, 0.98, skin(feet.FOOT_KIND)],
      ['katana', katana.EMBER_KATANA, katana.KATANA_REST.EMBER_KATANA, 0.9],
    ];
    for (const [name, piece, rest, min, skip] of least) {
      const got = atRest(f.rgba, piece, rest, skip);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
  });

  it('keeps his far arm exactly where he drew it at rest', () => {
    const f = renderSprite(look(), 'idle', 0);
    for (const [piece, rest] of [
      [armor.EMBER_PAULDRON_F, armor.EMBER_REST.EMBER_PAULDRON_F],
      [bracers.EMBER_BRACER_F, bracers.EMBER_BRACER_REST.EMBER_BRACER_F],
      [bracers.EMBER_FIST_F, bracers.EMBER_BRACER_REST.EMBER_FIST_F],
    ] as [PaintedPiece, [number, number]][]) {
      assert.ok(atRest(f.rgba, piece, rest) >= 0.98);
    }
  });

  it('keeps every pose whole: no piece comes off the figure', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = look(body);
      for (const pose of POSES) {
        // the cast poses' chakra runes float off the hand by design
        if (pose === 'cast') continue;
        const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
        for (let fr = 0; fr < n; fr++) {
          const off = detached(renderSprite(l, pose, fr).rgba);
          assert.equal(off, 0, `${body} ${pose} ${fr}: ${off} pixels off the figure`);
        }
      }
    }
  });

  it('draws a saved Akira, with the old items and colours, in every pose', () => {
    const old = look();
    old.slots.hair = { id: 'hair_lion', colors: ['#16141d'] };
    old.slots.bottom = { id: 'bottom_shinobi', colors: ['#2b2420', '#3a2c22'] };
    old.slots.armor = { id: 'armor_leather', colors: ['#4d3528', '#a2a7ae', '#c0502c'] };
    old.slots.skirt = { id: 'skirt_tassets', colors: ['#4d3528', '#1d1c26'] };
    old.slots.feet = { id: 'feet_leather', colors: ['#3a2a22', '#1a120e'] };
    old.slots.hands = { id: 'hands_bracers', colors: ['#4d3528', '#2a1a12'] };
    old.slots.held = { id: 'held_katana', colors: [], parts: { steel: 'a', blade: 'b', guard: 'a', hilt: 'b' } };
    for (const pose of POSES) assert.ok(renderSprite(old, pose, 0).rgba.some((v) => v > 0), pose);
  });

  it('draws the colours the old items saved in his colours', () => {
    const his = renderSprite(look(), 'idle', 0).rgba;
    // (the hair is left out: our face draws its brows in the hair's colour)
    const old = look();
    old.slots.armor = { id: 'armor_leather', colors: ['#4d3528', '#a2a7ae', '#c0502c'] };
    old.slots.skirt = { id: 'skirt_tassets', colors: ['#4d3528', '#1d1c26'] };
    old.slots.hands = { id: 'hands_bracers', colors: ['#4d3528', '#2a1a12'] };
    const got = renderSprite(old, 'idle', 0).rgba;
    let differ = 0;
    for (let i = 0; i < his.length; i++) if (his[i] !== got[i]) differ++;
    assert.equal(differ, 0);
  });

  it('stands his legs where he drew them only with his legs and his feet both on', () => {
    const ctx = (l: SpriteAppearance): DrawCtx =>
      ({ rig: drawRig('male', 'idle', 0), look: l, has: (slot: string, id?: string) => (id ? (l.slots as Record<string, { id: string } | undefined>)[slot]?.id === id : !!(l.slots as Record<string, unknown>)[slot]) }) as unknown as DrawCtx;
    const both = look();
    const out = emberLegOut(ctx(both), 'N');
    assert.deepEqual([Math.round(out.x * RES), Math.round(out.y * RES)], [-legs.LEG_SHIFT.N[0], -legs.LEG_SHIFT.N[1]]);
    const mixed = look();
    mixed.slots.feet = { id: 'feet_leather', colors: [] };
    const none = emberLegOut(ctx(mixed), 'F');
    assert.deepEqual([none.x, none.y].map(Math.abs), [0, 0]);
  });

  it('keeps the old armour, arm guards and tassets on the female bodies', () => {
    for (const body of ['female', 'slender'] as BodyType[]) {
      const f = renderSprite(look(body), 'idle', 0);
      // his own colours, less his black line (his hair has it too) and the slots' bases (the fitted
      // pieces' shading has the base colour too)
      const bases = new Set([armor.EMBER_LEATHER, armor.EMBER_STEEL, armor.EMBER_FLAME, tassets.TASSET_LEATHER, tassets.TASSET_LACE]);
      const kind = { ...armor.EMBER_KIND, ...tassets.TASSET_KIND } as Record<string, string>;
      const colors = new Set([...Object.values(armor.EMBER_CHEST.colors), ...Object.values(tassets.TASSET_FRONT.colors)].filter((c) => !bases.has(c) && kind[c] !== 'line'));
      let his = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        const hex = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
        if (opaque(f.rgba, i) && colors.has(hex)) his++;
      }
      assert.ok(his < 60, `${body}: ${his} pixels of his male armour`);
    }
  });
});
