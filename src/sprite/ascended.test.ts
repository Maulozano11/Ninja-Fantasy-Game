// Tests for the owner's Ascended set (Ascended Spikes, Rogue Storm Cloak, Wrap Kimono, Wide Hakama, Cloth Sash,
// Bandage Wraps, Foot Wraps): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import * as hair from './items/ascendedHairArt';
import * as cloak from './items/rogueCloakArt';
import * as feet from './items/footWrapsArt';
import * as hakama from './items/hakamaArt';
import * as kimono from './items/kimonoArt';
import * as sash from './items/sashArt';
import * as wraps from './items/wrapsArt';
import type { Side } from './ctx';
import { ascendedPalm, type ArmStamp, sleeveStamps, wrapStamps } from './items/ascended';
import { defaultAppearance } from './legacy';
import { type PaintedPiece, segAngle } from './painted';
import { GRID, partIndex, RES } from './raster';
import { drawRig, frameCount, POSES as RIG_POSES, rigPoseFor } from './rig';
import { rotateTemplate } from './rotsprite';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const SET = {
  hair: 'hair_ascended',
  cape: 'cape_rogue',
  top: 'top_kimono',
  bottom: 'bottom_hakama',
  waist: 'waist_sash',
  hands: 'hands_wraps',
  feet: 'feet_wraps',
} as const;

/** Our male in the whole set, in the item defaults (his colours), with his skin, no headband. */
const look = (body: BodyType, colors: Partial<Record<keyof typeof SET, string[]>> = {}): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.skin = wraps.WRAPS_SKIN;
  l.headband = { ...l.headband!, position: 'none' };
  l.slots = {};
  for (const [slot, id] of Object.entries(SET)) l.slots[slot as keyof typeof SET] = { id, colors: colors[slot as keyof typeof SET] ?? [] };
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;

/** How many of a piece's cells the idle frame shows in his colour, at the place the script says it lands. */
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

/** Every frame of every pose. */
function* frames(l: SpriteAppearance) {
  for (const pose of POSES) {
    const n = RIG_POSES[rigPoseFor(pose, l.cast?.style, l.slots.held?.id)].length;
    for (let f = 0; f < n; f++) yield { pose, f, fr: renderSprite(l, pose, f) };
  }
}

describe('the Ascended set', () => {
  it('lands every piece on his pixels at rest, where the script placed it', () => {
    const f = renderSprite(look('male'), 'idle', 0);
    // What each piece shows of his pixels in our idle (the rest lies under other pieces of his or our head).
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['hair', hair.ASCENDED_HAIR_FRONT, hair.ASCENDED_HAIR_REST.ASCENDED_HAIR_FRONT, 0.98],
      ['collar', cloak.CLOAK_COLLAR, cloak.CLOAK_REST.CLOAK_COLLAR, 0.95],
      ['near shoulder', cloak.CLOAK_SHOULDER_N, cloak.CLOAK_REST.CLOAK_SHOULDER_N, 0.98],
      ['far shoulder', cloak.CLOAK_SHOULDER_F, cloak.CLOAK_REST.CLOAK_SHOULDER_F, 0.98],
      ['cloak front', cloak.CLOAK_FRONT, cloak.CLOAK_REST.CLOAK_FRONT, 0.6],
      ['kimono', kimono.KIMONO_BODY, kimono.KIMONO_REST.KIMONO_BODY, 0.55],
      ['near sleeve', kimono.KIMONO_SLEEVE_N, kimono.KIMONO_REST.KIMONO_SLEEVE_N, 0.8],
      ['far sleeve', kimono.KIMONO_SLEEVE_F, kimono.KIMONO_REST.KIMONO_SLEEVE_F, 0.65],
      ['sash', sash.SASH_BAND, sash.SASH_REST.SASH_BAND, 0.95],
      ['near hakama', hakama.HAKAMA_THIGH_N, hakama.HAKAMA_REST.HAKAMA_THIGH_N, 0.75],
      ['near forearm', wraps.WRAPS_FORE_N, wraps.WRAPS_REST.WRAPS_FORE_N, 0.4],
      ['near fist', wraps.WRAPS_FIST_N, wraps.WRAPS_REST.WRAPS_FIST_N, 0.98],
      ['far fist', wraps.WRAPS_FIST_F, wraps.WRAPS_REST.WRAPS_FIST_F, 0.75],
      ['near foot', feet.FOOTWRAPS_FOOT_N, feet.FOOTWRAPS_REST.FOOTWRAPS_FOOT_N, 0.98],
      ['far foot', feet.FOOTWRAPS_FOOT_F, feet.FOOTWRAPS_REST.FOOTWRAPS_FOOT_F, 0.98],
    ];
    for (const [name, piece, rest, min] of least) {
      const got = atRest(f.rgba, piece, rest);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(1)}% of his pixels at rest`);
    }
  });

  it('reads the colours saved with the old defaults as his', () => {
    // (The hair's old gold is his too, but our face draws the brows in the saved hair colour, so the
    // hair is checked alone: its pixels are his.)
    const old = look('male', {
      cape: ['#1e1d24', '#c8192e', '#6e1020'],
      top: ['#ded8ca', '#2b3557'],
      bottom: ['#2c3043', '#cfc8b6'],
      waist: ['#2f62b5', '#1d3f80'],
      hands: ['#e9e3d3'],
      feet: ['#ddd5c2'],
    });
    for (const pose of ['idle', 'walk'] as SpritePose[]) assert.deepEqual(renderSprite(old, pose, 1).rgba, renderSprite(look('male'), pose, 1).rgba);
    const f = renderSprite(look('male', { hair: ['#e6c020'] }), 'idle', 0);
    assert.equal(atRest(f.rgba, hair.ASCENDED_HAIR_FRONT, hair.ASCENDED_HAIR_REST.ASCENDED_HAIR_FRONT), atRest(renderSprite(look('male'), 'idle', 0).rgba, hair.ASCENDED_HAIR_FRONT, hair.ASCENDED_HAIR_REST.ASCENDED_HAIR_FRONT));
  });

  for (const body of ['male', 'bulky'] as BodyType[]) {
    it(`never shows our bare arm or a missing forearm under his sleeves and bandages (${body})`, () => {
      // Our skin's colours on the arms, from the bare body in every pose.
      const bare = look(body);
      bare.slots = {};
      const skin = new Set<string>();
      const arms = ['upperArmN', 'upperArmF', 'forearmN', 'forearmF'].map((p) => partIndex(p as never));
      for (const { fr } of frames(bare)) for (let i = 0; i < GRID * GRID; i++) if (opaque(fr.rgba, i) && arms.includes(fr.part[i])) skin.add(hex(fr.rgba, i));
      const fore = [partIndex('forearmN'), partIndex('forearmF')];
      for (const { pose, f, fr } of frames(look(body))) {
        let shown = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (!opaque(fr.rgba, i) || !arms.includes(fr.part[i])) continue;
          assert.ok(!skin.has(hex(fr.rgba, i)), `${pose} ${f}: our bare arm shows at ${i % GRID},${(i / GRID) | 0}`);
          if (fore.includes(fr.part[i])) shown++;
        }
        assert.ok(shown > 0 || pose === 'downed', `${pose} ${f}: no forearm drawn`);
      }
    });
  }

  it('turns his arm pieces whole about our joints, at his size, in every pose (male, bulky)', () => {
    // What a stamped piece covers: its cells, its length along its limb and its width across it.
    const measure = (p: PaintedPiece, turn: number) => {
      const cells = rotateTemplate(p, turn);
      const a = ((p.angle + turn) * Math.PI) / 180;
      const along = cells.map(({ dx, dy }) => dx * Math.cos(a) + dy * Math.sin(a));
      const across = cells.map(({ dx, dy }) => -dx * Math.sin(a) + dy * Math.cos(a));
      const span = (xs: number[]) => Math.max(...xs) - Math.min(...xs) + 1;
      return { n: cells.length, long: span(along), wide: span(across) };
    };
    const rest = new Map<PaintedPiece, ReturnType<typeof measure>>();
    const atRestOf = (p: PaintedPiece) => rest.get(p) ?? rest.set(p, measure(p, 0)).get(p)!;
    const drawn = (stamps: ArmStamp[]) => {
      const at = new Set<string>();
      for (const t of stamps) for (const { dx, dy } of rotateTemplate(t.piece, t.turn)) at.add(`${Math.floor(t.at.x * RES) + dx},${Math.floor(t.at.y * RES) + dy}`);
      return at.size;
    };
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const sleeve0 = { N: drawn(sleeveStamps(drawRig(body, 'idle', 0), 'N')), F: drawn(sleeveStamps(drawRig(body, 'idle', 0), 'F')) };
      for (const pose of POSES) {
        const rp = rigPoseFor(pose);
        for (let f = 0; f < frameCount(rp); f++) {
          const rig = drawRig(body, rp, f);
          for (const s of ['N', 'F'] as Side[]) {
            const where = `${body} ${pose} ${f} ${s}`;
            const sleeve = sleeveStamps(rig, s);
            const j = s === 'N' ? { a: rig.shoulderN, b: rig.elbowN } : { a: rig.shoulderF, b: rig.elbowF };
            const band = sleeve.find((t) => t.name === 'band')!;
            const bell = sleeve.find((t) => t.name === 'bell')!;
            // the band rides the upper arm; the bell hangs down as he drew it, swung at most 30 degrees by
            // the arm (lying on the ground, the sleeve lies whole along the arm)
            const off = (d: number) => Math.abs((((d % 360) + 540) % 360) - 180);
            assert.ok(off(band.piece.angle + band.turn - segAngle(j.a, j.b)) < 1e-6, `${where}: the band leaves the upper arm`);
            if (rig.lay) assert.ok(off(bell.turn - band.turn) < 1e-6, `${where}: the bell leaves the arm of a body lying down`);
            else assert.ok(off(bell.turn) <= 30 + 1e-6, `${where}: the bell is turned ${bell.turn.toFixed(0)} degrees from his`);
            // every piece (the sleeve's band and bell, the forearm, the fist) whole and at his size
            for (const t of [band, bell, ...wrapStamps(rig, s)]) {
              const m = measure(t.piece, t.turn);
              const m0 = atRestOf(t.piece);
              // (RotSprite thins a 1 px line across a diagonal: a turned piece keeps at least 80% of his cells)
              assert.ok(m.n >= 0.8 * m0.n && m.n <= 1.1 * m0.n, `${where} ${t.name}: ${m.n} pixels, ${m0.n} at rest`);
              assert.ok(Math.abs(m.long - m0.long) <= 2 && Math.abs(m.wide - m0.wide) <= 2, `${where} ${t.name}: ${m.long} x ${m.wide} px, ${m0.long} x ${m0.wide} at rest`);
            }
            // the fold between them only fills the turn (most for a raised arm, whose sleeve falls to the
            // shoulder): the sleeve as drawn stays near his size
            const n = drawn(sleeve);
            assert.ok(n <= 1.5 * sleeve0[s] && n >= 0.9 * sleeve0[s], `${where}: the sleeve covers ${n} pixels, ${sleeve0[s]} at rest`);
            // his fist everywhere but where the pose opens the hand
            const open = ascendedPalm(rig, s);
            assert.equal(wrapStamps(rig, s).some((t) => t.name === 'fist'), !open, `${where}: fist`);
            if (open) assert.ok(['sign', 'cradle', 'point', 'open'].includes(s === 'N' ? rig.shapeN : rig.shapeF), `${where}: open hand`);
          }
        }
      }
    }
  });

  it('keeps the drawn items on the female bodies', () => {
    const his = new Set([...Object.values(wraps.WRAPS_FORE_N.colors), ...Object.values(kimono.KIMONO_BODY.colors), ...Object.values(sash.SASH_BAND.colors)]);
    for (const body of ['female', 'slender'] as BodyType[]) {
      const l = look(body);
      delete l.slots.hair;
      delete l.slots.cape;
      const f = renderSprite(l, 'idle', 0);
      let mine = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && his.has(hex(f.rgba, i))) mine++;
      assert.ok(mine < 20, `${body}: ${mine} of his kimono, sash or bandage pixels`);
    }
  });
});
