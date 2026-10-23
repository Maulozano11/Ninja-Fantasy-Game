// Tests for the clothes, boots and hair lifted out of the owner's two Trunks paint-overs: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { getItem } from './catalog';
import { defaultAppearance } from './legacy';
import { DEPTHS, type Depth, type DrawCtx } from './ctx';
import type { PaintedPiece } from './painted';
import { GRID, Layer, RES, type Vec } from './raster';
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
import { GLINT_EYE_COLORS, GLINT_EYES, GLINT_FAR_FROM } from './glintEyeArt';
import { frameCount, rigPoseFor } from './rig';
import { PARTS } from './raster';

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
// where his picture hid it; the lower piece of a joint is partly under the end of the upper one, which
// overlaps it; the near cargo shin is almost all under its thigh and its boot; the cape's back goes on,
// hidden, behind the body).
type Case = [string, Partial<Record<SlotId, string>>, Record<string, unknown>, Record<string, [number, number]>, Record<string, string>, Record<string, number>];
const CASES: Case[] = [
  ['short-sleeved shirt', { top: 'top_highcollar' }, shirt, shirt.SHIRT_REST, shirt.SHIRT_SLOT, { SHIRT_BODY: 0.95, SHIRT_SLEEVE_F: 0.65, SHIRT_ARM_UP_F: 0.95, SHIRT_ARM_FORE_F: 0.68, SHIRT_ARM_UP_N: 0.9, SHIRT_ARM_FORE_N: 0.66 }],
  ['cargo trousers', { bottom: 'bottom_cargo' }, cargo, cargo.CARGO_REST, cargo.CARGO_SLOT, { CARGO_SEAT: 0.93, CARGO_THIGH_N: 0.5, CARGO_SHIN_N: 0.06, CARGO_THIGH_F: 0.64, CARGO_SHIN_F: 0.58, CARGO_GAP: 0.9 }],
  ['leather boots', { feet: 'feet_leather' }, boots, boots.LEATHER_BOOT_REST, boots.LEATHER_BOOT_SLOT, { BOOT_SHAFT_N: 0.63, BOOT_FOOT_N: 0.95, BOOT_SHAFT_F: 0.7, BOOT_FOOT_F: 0.87 }],
  ['belt', { waist: 'waist_belt' }, belt, belt.BELT_REST, belt.BELT_SLOT, { BELT: 0.95 }],
  ["traveler's gloves", { hands: 'hands_traveler_gloves' }, gloves, gloves.TRAVELER_GLOVE_REST, gloves.TRAVELER_GLOVE_SLOT, { TRAVELER_GLOVE_N: 0.95, TRAVELER_GLOVE_F: 0.95 }],
  ["traveler's cape", { cape: 'cape_traveler' }, cape, cape.TRAVELER_REST, cape.TRAVELER_SLOT, { TRAVELER_HOOD: 0.82, TRAVELER_SHOULDER: 0.95, TRAVELER_BACK: 0.48 }],
  ['bomber jacket', { top: 'top_bomber' }, bomber, bomber.BOMBER_REST, bomber.BOMBER_SLOT, { BOMBER_BODY: 0.88, BOMBER_SLEEVE_UP_N: 0.95, BOMBER_SLEEVE_FORE_N: 0.57, BOMBER_SLEEVE_UP_F: 0.68, BOMBER_SLEEVE_FORE_F: 0.52, BOMBER_FIST_F: 0.83 }],
  ['belted trousers', { bottom: 'bottom_leggings' }, leggings, leggings.LEGGINGS_REST, leggings.LEGGINGS_SLOT, { LEGGINGS_SEAT: 0.94, LEGGINGS_THIGH_N: 0.5, LEGGINGS_SHIN_N: 0.13, LEGGINGS_THIGH_F: 0.68, LEGGINGS_SHIN_F: 0.42 }],
  ['open-toed boots', { feet: 'feet_cowboy' }, openBoots, openBoots.OPEN_BOOT_REST, openBoots.OPEN_BOOT_SLOT, { OPEN_BOOT_SHAFT_N: 0.59, OPEN_BOOT_FOOT_N: 0.95, OPEN_BOOT_SHAFT_F: 0.9, OPEN_BOOT_FOOT_F: 0.91 }],
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

  it('draw the arms and legs only in his colours, in every pose and frame, on the male and bulky bodies', () => {
    // His sleeves, bare arms, fists, gloves, trousers and boots turn with our limbs; nothing of our own
    // limbs (our skin, its outline, our hand pictures in our skin) may show past them. The cast's runes
    // and the knocked-out cape (the drawn one, lying along the body) are not his pieces.
    const his = new Set<string>();
    for (const m of [shirt, cargo, boots, belt, gloves, cape, bomber, leggings, openBoots]) {
      for (const v of Object.values(m)) {
        if (v && typeof v === 'object' && 'colors' in v) for (const h of Object.values((v as PaintedPiece).colors)) his.add(h);
        if (Array.isArray(v)) for (const h of v) his.add(h);
      }
    }
    const limbs = new Set(['upperArmN', 'forearmN', 'handN', 'upperArmF', 'forearmF', 'handF', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF'].map((p) => PARTS.indexOf(p as never)));
    const looks = [
      painted({ cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves' }),
      painted({ top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy' }),
    ];
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const l of looks) {
        l.body = body;
        for (const pose of POSES) {
          if (pose === 'cast' || pose === 'downed') continue;
          const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
          for (let fr = 0; fr < n; fr++) {
            const f = renderSprite(l, pose, fr);
            // A pinhole (up to 3 px) between his piece and another (the blade it holds, the head) is closed with
            // the other's line (holes.ts closePinholes, "si arregla el hueco de 1 pixel a todos"): that colour,
            // running on into the piece it came from, is not ours.
            const fromBeside = (i: number, c: string) => {
              const seen = new Set([i]);
              const todo = [i];
              while (todo.length && seen.size <= 4) {
                const k = todo.pop()!;
                const x = k % GRID;
                for (const d of [-GRID - 1, -GRID, -GRID + 1, -1, 1, GRID - 1, GRID, GRID + 1]) {
                  const j = k + d;
                  if (j < 0 || j >= GRID * GRID || Math.abs((j % GRID) - x) > 1 || seen.has(j) || !opaque(f.rgba, j) || hex(f.rgba, j) !== c) continue;
                  if (!limbs.has(f.part[j])) return true;
                  seen.add(j);
                  todo.push(j);
                }
              }
              return false;
            };
            const ours: string[] = [];
            for (let i = 0; i < GRID * GRID; i++) {
              const c = opaque(f.rgba, i) ? hex(f.rgba, i) : '';
              if (c && limbs.has(f.part[i]) && !his.has(c) && !fromBeside(i, c)) ours.push(`${i % GRID},${Math.floor(i / GRID)}`);
            }
            assert.ok(ours.length === 0, `${body} ${l.slots.top!.id} ${pose} ${fr}: not his at ${ours.join(' ')}`);
          }
        }
      }
    }
  });

  it('draw his Trunks 3 eyes (glint) in his pixels at rest, his iris following the eye colour', () => {
    // Our face anchor (the near eye's lash start) at male idle frame 0, where his eyes start.
    const [nx, ny] = [123, 139];
    const eyesAt = (l: SpriteAppearance, pose: SpritePose = 'idle') => {
      const f = renderSprite(l, pose, 0);
      return (eye: 'near' | 'far', r: number, c: number) => hex(f.rgba, (ny + r) * GRID + nx + (eye === 'near' ? 0 : GLINT_FAR_FROM) + c);
    };
    const l = painted({ hair: 'hair_surge' });
    l.eyeShape = 'glint';
    l.eyeColor = '#d81b2a';
    const at = eyesAt(l);
    for (const eye of ['near', 'far'] as const) {
      GLINT_EYES.open[eye].rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === '.') continue;
          // (his lock of hair over the near eye's lash end is the hair's)
          assert.equal(at(eye, r, c), GLINT_EYE_COLORS[row[c]], `${eye} eye ${r},${c}`);
        }
      });
    }
    // Another eye colour moves his reds, not his lashes nor his whites.
    const blue = { ...l, eyeColor: '#2563eb' };
    const bt = eyesAt(blue);
    assert.notEqual(bt('near', 1, 3), at('near', 1, 3));
    assert.equal(bt('near', 1, 0), at('near', 1, 0));
    assert.equal(bt('near', 2, 1), at('near', 2, 1));
    // Reading (his lids lowered) and knocked out (shut) draw too.
    for (const pose of ['read', 'downed'] as SpritePose[]) {
      const f = renderSprite(l, pose, 0);
      assert.ok(f.rgba.length > 0, pose);
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
        // (a crack the hem closes against the figure takes its line, a row below it at most: seal.ts sealAgainstFigure)
        const sealed = (i: number) => Math.floor(i / GRID) === hem + 1 && hex(on.rgba, i) === '#000000';
        for (const i of diff(on.rgba, off.rgba)) assert.ok(Math.floor(i / GRID) <= hem || sealed(i), `${body} ${pose}: cape at row ${Math.floor(i / GRID)}, below its hem at rest (${hem})`);
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

  it('turn the far trouser leg whole: one piece, no hole, joined to the boot, as wide as at rest, in every pose and frame', () => {
    // The owner: "el pantalón de trunks en la pierna izquierda tiene un bug" (a dark flap and a notch at the
    // knee, the hem off the boot). The far leg's own layers as the trousers drew them (their draw wrapped).
    const farLeg = (l: SpriteAppearance, pose: SpritePose, fr: number) => {
      const item = getItem(l.slots.bottom!.id)!;
      const draw = item.draw;
      let g: DrawCtx | undefined;
      item.draw = (gg, c, p) => {
        g = gg;
        draw(gg, c, p);
      };
      try {
        renderSprite(l, pose, fr);
      } finally {
        item.draw = draw;
      }
      return { cloth: g!.L('farLeg.cloth'), boot: g!.L('farLeg.feet'), rig: g!.rig };
    };
    // How wide the leg is across the limb from `a` to `b`, `t` of the way along (fine pixels): its cloth
    // (of `part` alone, when given) in a slab 6 pixels thick across the limb there, by area, so a turned
    // piece's stairs do not count.
    const across = (L: Layer, a: Vec, b: Vec, t: number, part?: number) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y) * RES;
      const [ux, uy] = [((b.x - a.x) * RES) / len, ((b.y - a.y) * RES) / len];
      const [px, py] = [(a.x + (b.x - a.x) * t) * RES, (a.y + (b.y - a.y) * t) * RES];
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        if (L.mat[i] < 0 || (part !== undefined && L.part[i] !== part)) continue;
        const [dx, dy] = [(i % GRID) + 0.5 - px, Math.floor(i / GRID) + 0.5 - py];
        if (Math.abs(dx * ux + dy * uy) <= 3 && Math.abs(-dx * uy + dy * ux) <= 16) n++;
      }
      return n / 6;
    };
    const turnOf = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
    const angle = (a: Vec, b: Vec) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const thighF = PARTS.indexOf('thighF');
    // 4-neighbours of a pixel inside the frame.
    const around = (i: number) => [i - 1, i + 1, i - GRID, i + GRID].filter((j) => j >= 0 && j < GRID * GRID && Math.abs((j % GRID) - (i % GRID)) <= 1);
    const looks = [
      painted({ cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves' }),
      painted({ top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy' }),
    ];
    const bad: string[] = [];
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const l of looks) {
        l.body = body;
        const name = `${body} ${l.slots.bottom!.id}`;
        let rest: { thigh: number; shin: number; bend: number } | undefined;
        for (const pose of POSES) {
          const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
          for (let fr = 0; fr < n; fr++) {
            const { cloth, boot, rig } = farLeg(l, pose, fr);
            const at = `${name} ${pose} ${fr}`;
            // One piece (4-connected), touching the boot (on it or beside it).
            const seen = new Uint8Array(GRID * GRID);
            let pieces = 0;
            let joined = false;
            for (let i0 = 0; i0 < GRID * GRID; i0++) {
              if (cloth.mat[i0] < 0 || seen[i0]) continue;
              pieces++;
              const stack = [i0];
              seen[i0] = 1;
              while (stack.length) {
                const i = stack.pop()!;
                for (const j of around(i)) {
                  if (boot.mat[j] >= 0 || boot.mat[i] >= 0) joined = true;
                  if (cloth.mat[j] >= 0 && !seen[j]) {
                    seen[j] = 1;
                    stack.push(j);
                  }
                }
              }
            }
            if (pieces !== 1) bad.push(`${at}: the far trouser leg in ${pieces} pieces`);
            if (!joined) bad.push(`${at}: the far trouser leg off its boot`);
            // No hole in it: every empty pixel reaches the frame's edge round the leg.
            const out = new Uint8Array(GRID * GRID);
            const stack: number[] = [];
            for (let k = 0; k < GRID; k++) for (const i of [k, (GRID - 1) * GRID + k, k * GRID, k * GRID + GRID - 1]) if (cloth.mat[i] < 0 && !out[i]) (out[i] = 1), stack.push(i);
            while (stack.length) for (const j of around(stack.pop()!)) if (cloth.mat[j] < 0 && !out[j]) (out[j] = 1), stack.push(j);
            const holes: string[] = [];
            for (let i = 0; i < GRID * GRID; i++) if (cloth.mat[i] < 0 && !out[i]) holes.push(`${i % GRID},${Math.floor(i / GRID)}`);
            if (holes.length) bad.push(`${at}: holes in the far trouser leg at ${holes.join(' ')}`);
            // As wide as at rest, give or take a pixel: across the thigh (its own cloth, whatever lies under
            // it), and across the leg under the knee while the knee bends no more than 20 degrees past the way
            // he drew it (folded further, the back of the thigh rightly comes down over the calf).
            const thigh = across(cloth, rig.hipF, rig.kneeF, 0.6, thighF);
            const shin = across(cloth, rig.kneeF, rig.ankleF, 0.35);
            const bend = turnOf(angle(rig.kneeF, rig.ankleF) - angle(rig.hipF, rig.kneeF));
            rest ??= { thigh, shin, bend };
            if (Math.abs(thigh - rest.thigh) > 1) bad.push(`${at}: the thigh ${thigh.toFixed(2)} wide, ${rest.thigh.toFixed(2)} at rest`);
            if (Math.abs(turnOf(bend - rest.bend)) <= 20 && Math.abs(shin - rest.shin) > 1) bad.push(`${at}: the leg under the knee ${shin.toFixed(2)} wide, ${rest.shin.toFixed(2)} at rest`);
          }
        }
      }
    }
    assert.deepEqual(bad, []);
  });
});

// Dead pixels in his cape and his boots (the owner, 2026-10-22: "tienes muchos pixeles muertos blancos en
// la capa de trunks en muchas de las poses"; on Trunks 3: "en embestida y en varias poses donde el
// personaje se inclina hacia delante tienes unos pixeles muertos blancos en la bota derecha"). On the
// finished frame, beside the cape's or a boot's pixels:
//  - hole: an empty pixel in a pocket of at most 4 that the figure walls in;
//  - crack: an empty pixel with the figure on both sides of it, across or down (a 1 px white line or dot);
//  - gap: a pixel of something behind it showing through a 1 px crack in it, much lighter;
//  - light: a near-white pixel of its own.
// Left as drawn: a notch of one piece's outline (three sides, all its line: his outline's notches), the
// gaps beside the head (his white between the hair, the face and the hood) and those the held blade
// crosses (between the legs, beside a boot).
describe("the owner's Trunks cape and boots", () => {
  const LOOKS: [string, Partial<Record<SlotId, string>>][] = [
    ['Trunks 2', { cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves', hair: 'hair_drifter' }],
    ['Trunks 3', { top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy', hair: 'hair_surge' }],
  ];
  const N = GRID * GRID;
  const depth = (d: Depth) => DEPTHS.indexOf(d);
  const HEAD = new Set((['hairBack', 'head.body', 'head.face', 'head.mask', 'hairFront', 'head.gear', 'neck'] as Depth[]).map(depth));
  const HELD = new Set((['farArm.held', 'nearArm.held', 'backGear'] as Depth[]).map(depth));
  const HELD_PART = PARTS.indexOf('held' as never);
  type Subject = 'cape' | 'bootN' | 'bootF';

  /** The dead pixels beside the cape's and each boot's pixels in one frame ("x,y kind"). */
  function deadPixels(l: SpriteAppearance, pose: SpritePose, fr: number): Record<Subject, string[]> {
    // The frame's layers (taken when the held item, drawn last, is drawn), and the pixels the cape drew.
    let G: DrawCtx | null = null;
    let capeOwn: Map<Depth, Int16Array> | null = null;
    const capeDef = l.slots.cape && getItem(l.slots.cape.id);
    const heldDef = getItem(l.slots.held!.id)!;
    const restore: (() => void)[] = [];
    if (capeDef) {
      const orig = capeDef.draw;
      capeDef.draw = (g, c, p) => {
        // (a pitched cape is drawn a second time on an upright rig, into layers of its own)
        if (capeOwn) return orig(g, c, p);
        const before = new Map(DEPTHS.map((d) => [d, g.L(d).mat.slice()] as [Depth, Int16Array]));
        orig(g, c, p);
        capeOwn = new Map();
        for (const d of DEPTHS) {
          const m = g.L(d).mat;
          const b = before.get(d)!;
          const o = new Int16Array(N);
          for (let i = 0; i < N; i++) if (m[i] >= 0 && m[i] !== b[i]) o[i] = m[i] + 1;
          capeOwn.set(d, o);
        }
      };
      restore.push(() => (capeDef.draw = orig));
    }
    const heldDraw = heldDef.draw;
    heldDef.draw = (g, c, p) => {
      G = g;
      heldDraw(g, c, p);
    };
    restore.push(() => (heldDef.draw = heldDraw));
    let f;
    try {
      f = renderSprite(l, pose, fr);
    } finally {
      restore.forEach((r) => r());
    }
    const g = G as DrawCtx | null;
    assert.ok(g, 'the held item was not drawn');
    const own = capeOwn as Map<Depth, Int16Array> | null;
    const rgba = f.rgba;
    // The upright drawing's front-most layer and subject at each pixel (a knocked-out figure is laid down after).
    const top = new Int16Array(N).fill(-1);
    const sub = new Uint8Array(N); // 1 the cape, 2 the near boot, 3 the far boot
    const part = new Uint8Array(N);
    DEPTHS.forEach((d, k) => {
      const L = g.L(d);
      if (!L.used) return;
      const o = own?.get(d);
      for (let i = 0; i < N; i++) {
        if (L.mat[i] < 0) continue;
        top[i] = k;
        part[i] = L.part[i];
        sub[i] = d === 'nearLeg.feet' ? 2 : d === 'farLeg.feet' ? 3 : capeDef && (d === 'capeBack' || d === 'capeFront' || (o && o[i] === L.mat[i] + 1)) ? 1 : 0;
      }
    });
    const lay = g.rig.lay;
    const back = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) {
      if (!lay) back[i] = i;
      else {
        const X = ((i / GRID) | 0) + lay.dx;
        const Y = (i % GRID) + lay.dy;
        if (X >= 0 && Y >= 0 && X < GRID && Y < GRID) back[Y * GRID + X] = i;
      }
    }
    const op = (j: number) => rgba[j * 4 + 3] > 0;
    const topOf = (j: number) => (back[j] < 0 ? -1 : top[back[j]]);
    const subOf = (j: number) => (back[j] < 0 ? 0 : sub[back[j]]);
    const isHead = (j: number) => HEAD.has(topOf(j));
    const isHeld = (j: number) => HELD.has(topOf(j)) || (topOf(j) >= 0 && part[back[j]] === HELD_PART);
    const isLine = (j: number) => Math.max(rgba[j * 4], rgba[j * 4 + 1], rgba[j * 4 + 2]) + Math.min(rgba[j * 4], rgba[j * 4 + 1], rgba[j * 4 + 2]) <= 102;
    const luma = (j: number) => rgba[j * 4] * 0.3 + rgba[j * 4 + 1] * 0.59 + rgba[j * 4 + 2] * 0.11;
    const sides = (j: number) => [j - 1, j + 1, j - GRID, j + GRID];
    // The empty pixels reached from the frame's edge (the air), and the pockets the figure walls in.
    const air = new Uint8Array(N);
    const stack: number[] = [];
    const reach = (j: number) => {
      if (op(j) || air[j]) return;
      air[j] = 1;
      stack.push(j);
    };
    for (let k = 0; k < GRID; k++) [k, N - GRID + k, k * GRID, k * GRID + GRID - 1].forEach(reach);
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % GRID;
      if (x > 0) reach(j - 1);
      if (x < GRID - 1) reach(j + 1);
      if (j >= GRID) reach(j - GRID);
      if (j < N - GRID) reach(j + GRID);
    }
    const pocket = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (op(s) || air[s] || pocket[s]) continue;
      const comp = [s];
      pocket[s] = -1;
      for (let k = 0; k < comp.length; k++) {
        for (const j of sides(comp[k])) {
          if (op(j) || pocket[j]) continue;
          pocket[j] = -1;
          comp.push(j);
        }
      }
      for (const j of comp) pocket[j] = comp.length;
    }
    const out: Record<Subject, string[]> = { cape: [], bootN: [], bootF: [] };
    const names: Subject[] = ['cape', 'bootN', 'bootF'];
    for (let j = GRID + 1; j < N - GRID - 1; j++) {
      const x = j % GRID;
      if (x < 1 || x > GRID - 2) continue;
      const at = `${x},${(j / GRID) | 0}`;
      const nb = sides(j);
      names.forEach((name, k) => {
        const is = (q: number) => subOf(q) === k + 1;
        if (!op(j)) {
          if (!nb.some(is) || nb.some(isHeld) || nb.some((q) => op(q) && isHead(q))) return;
          const crack = (op(j - 1) && op(j + 1)) || (op(j - GRID) && op(j + GRID));
          if (!crack && !(pocket[j] > 0 && pocket[j] <= 4)) return;
          const solid = nb.filter(op);
          if (air[j] && solid.length === 3 && solid.every(isLine) && solid.every((q) => topOf(q) === topOf(solid[0]))) return;
          out[name].push(`${at} ${air[j] ? 'crack' : 'hole'}`);
          return;
        }
        if (is(j)) {
          if (rgba[j * 4] > 200 && rgba[j * 4 + 1] > 200 && rgba[j * 4 + 2] > 200) out[name].push(`${at} light`);
          return;
        }
        if (isHead(j) || isHeld(j)) return;
        const across = is(j - 1) && (is(j + 1) || is(j + 2));
        const down = is(j - GRID) && (is(j + GRID) || is(j + 2 * GRID));
        if (!across && !down) return;
        const ns = nb.filter(is);
        if (ns.some((q) => topOf(q) <= topOf(j))) return;
        if (luma(j) - ns.reduce((a, q) => a + luma(q), 0) / ns.length > 70) out[name].push(`${at} gap`);
      });
    }
    return out;
  }

  for (const [name, items] of LOOKS) {
    it(`${name}: no dead pixel in the cape or the boots, in any pose or frame, on the male and bulky bodies`, () => {
      const bad: string[] = [];
      for (const body of ['male', 'bulky'] as BodyType[]) {
        const l = painted(items);
        l.body = body;
        l.accessories = [];
        l.headband = { ...l.headband, position: 'none' };
        for (const pose of new Set(POSES)) {
          const n = frameCount(rigPoseFor(pose, l.cast?.style, l.slots.held?.id));
          for (let fr = 0; fr < n; fr++) {
            const dead = deadPixels(l, pose, fr);
            for (const [what, px] of Object.entries(dead)) if (px.length) bad.push(`${body} ${pose} ${fr} ${what}: ${px.join(', ')}`);
          }
        }
      }
      assert.deepEqual(bad, []);
    });
  }
});
