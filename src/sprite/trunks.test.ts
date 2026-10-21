// Tests for the clothes, boots and hair lifted out of the owner's two Trunks paint-overs: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { getItem } from './catalog';
import { defaultAppearance } from './legacy';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { GROUND } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SlotId, type SpriteAppearance, type SpritePose } from './types';
import * as shirt from './items/shortSleeveShirtArt';
import * as cargo from './items/cargoPantsArt';
import * as boots from './items/leatherBootsArt';
import * as belt from './items/beltArt';
import * as gloves from './items/travelerGlovesArt';
import * as cape from './items/travelerCapeArt';
import * as bomber from './items/bomberJacketArt';
import * as leggings from './items/leggingsArt';
import * as openBoots from './items/openToeBootsArt';
import { PAINTED_SKIN } from './items/trunksKit';

/** Our male (or another body) in only these items, at their default colours, holding nothing. */
const look = (items: Partial<Record<SlotId, string>>, body: BodyType = 'male'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots = {};
  for (const [slot, id] of Object.entries(items)) l.slots[slot as SlotId] = { id: id!, colors: getItem(id!)!.colors.map((c) => c.default) };
  return l;
};

/** As the renders he painted over: Solen's skin, the crystal greatsword in the near hand. */
const painted = (items: Partial<Record<SlotId, string>>): SpriteAppearance => {
  const l = look({ ...items, held: 'held_crystal' });
  l.skin = PAINTED_SKIN;
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** The pixels two frames differ in. */
function diff(a: Uint8ClampedArray, b: Uint8ClampedArray): number[] {
  const out: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) for (let k = 0; k < 4; k++) if (a[i * 4 + k] !== b[i * 4 + k]) { out.push(i); break; }
  return out;
}

/** How many of a piece's cells the frame shows in his colour at the place the script says it lands. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number], skip: (hex: string) => boolean = () => false): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.' || skip(piece.colors[row[i]])) continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

// Each item alone on our male at rest, and how much of each of its pieces must show his pixels where he
// drew them (what is missing is under the item's other pieces, our head or our hands, or continued
// where his picture hid it).
type Case = [string, Partial<Record<SlotId, string>>, Record<string, unknown>, Record<string, [number, number]>, Record<string, string>, Record<string, number>];
const CASES: Case[] = [
  ['short-sleeved shirt', { top: 'top_highcollar' }, shirt, shirt.SHIRT_REST, shirt.SHIRT_SLOT, { SHIRT_BODY: 0.95, SHIRT_SLEEVE_F: 0.65, SHIRT_ARM_UP_F: 0.95, SHIRT_ARM_FORE_F: 0.8, SHIRT_ARM_UP_N: 0.9, SHIRT_ARM_FORE_N: 0.78 }],
  ['cargo trousers', { bottom: 'bottom_cargo' }, cargo, cargo.CARGO_REST, cargo.CARGO_SLOT, { CARGO_SEAT: 0.93, CARGO_THIGH_N: 0.5, CARGO_SHIN_N: 0.42, CARGO_THIGH_F: 0.64, CARGO_SHIN_F: 0.72 }],
  ['leather boots', { feet: 'feet_leather' }, boots, boots.LEATHER_BOOT_REST, boots.LEATHER_BOOT_SLOT, { BOOT_SHAFT_N: 0.73, BOOT_FOOT_N: 0.95, BOOT_SHAFT_F: 0.85, BOOT_FOOT_F: 0.87 }],
  ['belt', { waist: 'waist_belt' }, belt, belt.BELT_REST, belt.BELT_SLOT, { BELT: 0.95 }],
  ["traveler's gloves", { hands: 'hands_traveler_gloves' }, gloves, gloves.TRAVELER_GLOVE_REST, gloves.TRAVELER_GLOVE_SLOT, { TRAVELER_GLOVE_N: 0.95, TRAVELER_GLOVE_F: 0.95 }],
  ["traveler's cape", { cape: 'cape_traveler' }, cape, cape.TRAVELER_REST, cape.TRAVELER_SLOT, { TRAVELER_HOOD: 0.82, TRAVELER_SHOULDER: 0.95, TRAVELER_BACK: 0.55 }],
  ['bomber jacket', { top: 'top_bomber' }, bomber, bomber.BOMBER_REST, bomber.BOMBER_SLOT, { BOMBER_BODY: 0.88, BOMBER_SLEEVE_UP_N: 0.95, BOMBER_SLEEVE_FORE_N: 0.68, BOMBER_SLEEVE_UP_F: 0.95, BOMBER_SLEEVE_FORE_F: 0.72, BOMBER_FIST_F: 0.83 }],
  ['belted trousers', { bottom: 'bottom_leggings' }, leggings, leggings.LEGGINGS_REST, leggings.LEGGINGS_SLOT, { LEGGINGS_SEAT: 0.94, LEGGINGS_THIGH_N: 0.5, LEGGINGS_SHIN_N: 0.28, LEGGINGS_THIGH_F: 0.68, LEGGINGS_SHIN_F: 0.6 }],
  ['open-toed boots', { feet: 'feet_cowboy' }, openBoots, openBoots.OPEN_BOOT_REST, openBoots.OPEN_BOOT_SLOT, { OPEN_BOOT_SHAFT_N: 0.65, OPEN_BOOT_FOOT_N: 0.95, OPEN_BOOT_SHAFT_F: 0.93, OPEN_BOOT_FOOT_F: 0.91 }],
];

describe("the owner's Trunks clothes", () => {
  it('land every piece on his pixels at rest, where the scripts placed it', () => {
    for (const [name, items, mod, rest, , least] of CASES) {
      const f = renderSprite(painted(items), 'idle', 0);
      for (const [piece, min] of Object.entries(least)) {
        const got = atRest(f.rgba, mod[piece] as PaintedPiece, rest[piece]);
        assert.ok(got >= min, `${name} ${piece}: ${(got * 100).toFixed(0)}% of his pixels in place`);
      }
    }
  });

  it('draw every pose on the male, bulky and slender bodies', () => {
    const all = look({ cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves', hair: 'hair_drifter' });
    const jacket = look({ top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy', hair: 'hair_surge' });
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const l of [all, jacket]) {
        l.body = body;
        for (const pose of POSES) {
          const f = renderSprite(l, pose, 0);
          let n = 0;
          for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
          assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
        }
      }
    }
  });

  it("never lets the traveler's cape hang lower than at rest", () => {
    const hem = cape.TRAVELER_REST.TRAVELER_BACK[1] + cape.TRAVELER_BACK.rows.length - 1;
    assert.ok(hem < GROUND * RES);
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        if (pose === 'downed') continue;
        const on = renderSprite(look({ cape: 'cape_traveler' }, body), pose, 0);
        const off = renderSprite(look({}, body), pose, 0);
        for (const i of diff(on.rgba, off.rgba)) assert.ok(Math.floor(i / GRID) <= hem, `${body} ${pose}: cape at row ${Math.floor(i / GRID)}, below its hem at rest (${hem})`);
      }
    }
  });

  it('show only his pixels on the far shoulder and arm at rest, nothing of our arm past them', () => {
    // The far arm right of the torso, from the shoulder to the fist (frame pixels; our male idle).
    const AREA = { x0: 134, x1: 152, y0: 146, y1: 184 };
    for (const [items, mods] of [
      [{ top: 'top_highcollar', hands: 'hands_traveler_gloves', waist: 'waist_belt', bottom: 'bottom_cargo' }, [shirt, gloves, belt, cargo]],
      [{ top: 'top_bomber', bottom: 'bottom_leggings' }, [bomber, leggings]],
    ] as [Partial<Record<SlotId, string>>, Record<string, unknown>[]][]) {
      const his = new Set<string>();
      for (const m of mods) for (const v of Object.values(m)) if (v && typeof v === 'object' && 'rows' in v) for (const h of Object.values((v as PaintedPiece).colors)) his.add(h);
      const f = renderSprite(painted(items), 'idle', 0);
      const ours: string[] = [];
      for (let y = AREA.y0; y < AREA.y1; y++) {
        for (let x = AREA.x0; x < AREA.x1; x++) {
          const i = y * GRID + x;
          if (opaque(f.rgba, i) && !his.has(hex(f.rgba, i))) ours.push(`${x},${y}`);
        }
      }
      assert.ok(ours.length <= 2, `${JSON.stringify(items)}: not his at ${ours.join(' ')}`);
    }
  });

  it('draw the old default colours, which characters saved, in his colours', () => {
    const OLD: [string, Partial<Record<SlotId, string>>, SlotId, string[]][] = [
      ['shirt', { top: 'top_highcollar' }, 'top', ['#1e2a4a', '#e5e7eb']],
      ['cargo', { bottom: 'bottom_cargo' }, 'bottom', ['#55603f', '#6e5a3c']],
      ['boots', { feet: 'feet_leather' }, 'feet', ['#6b4226', '#2a1a12']],
      ['belt', { waist: 'waist_belt' }, 'waist', ['#4a3122', '#c9b27a']],
      ['cape', { cape: 'cape_traveler' }, 'cape', ['#7d5b3b', '#5f4530']],
      ['jacket', { top: 'top_bomber' }, 'top', ['#1f4f8f', '#2b2a33']],
      ['trousers', { bottom: 'bottom_leggings' }, 'bottom', ['#2a2433', '#7a68a0']],
      ['open boots', { feet: 'feet_cowboy' }, 'feet', ['#8b5a2f', '#e2bf7a', '#c8ced6']],
      ['drifter hair', { hair: 'hair_drifter' }, 'hair', ['#938fc0']],
      ['surge hair', { hair: 'hair_surge' }, 'hair', ['#f8ac01']],
    ];
    for (const [name, items, slot, colors] of OLD) {
      const his = look(items);
      const old = look(items);
      old.slots[slot] = { id: items[slot]!, colors };
      // Our face draws the brows in the hair's colour as it is: they may differ, his hair may not.
      const brows = slot === 'hair' ? 8 : 0;
      assert.ok(diff(renderSprite(old, 'idle', 0).rgba, renderSprite(his, 'idle', 0).rgba).length <= brows, name);
    }
  });

  it('keep the drawn shirt, jacket, trousers and belt on the female bodies', () => {
    // His base colours are the drawn garments' defaults now, so the drawn ones show them too.
    const BASES = new Set([shirt.SHIRT_BLUE, shirt.SHIRT_TRIM, bomber.BOMBER_BLUE, bomber.BOMBER_SHIRT, cargo.CARGO_GREEN, leggings.LEGGINGS_PURPLE, leggings.LEGGINGS_CREST, belt.BELT_LEATHER, belt.BELT_BUCKLE]);
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const [items, mod] of [
        [{ top: 'top_highcollar' }, shirt.SHIRT_BODY],
        [{ top: 'top_bomber' }, bomber.BOMBER_BODY],
        [{ bottom: 'bottom_cargo' }, cargo.CARGO_SEAT],
        [{ bottom: 'bottom_leggings' }, leggings.LEGGINGS_SEAT],
        [{ waist: 'waist_belt' }, belt.BELT],
      ] as [Partial<Record<SlotId, string>>, PaintedPiece][]) {
        const f = renderSprite(look(items, body), 'idle', 0);
        const colors = new Set(Object.values(mod.colors).filter((h) => h > '#202020' && !BASES.has(h)));
        let his = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && colors.has(hex(f.rgba, i))) his++;
        assert.ok(his < 30, `${body} ${JSON.stringify(items)}: ${his} pixels of his`);
      }
    }
  });
});
