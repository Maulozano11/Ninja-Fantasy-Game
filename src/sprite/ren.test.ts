// Tests for the owner's Ren (his paint-over, docs/reference/ren-owner-reference.jpg): his head, eyes,
// hair, jacket, belt, skirt, trousers, boots, gloves and Katana v2, and the Ren preset that wears them.
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import type { DrawCtx, Side } from './ctx';
import { paintedGrip } from './grip';
import { nightFistStamps } from './items/clothes';
import { nightArmStamps, nightSkirtStamps } from './items/night';
import * as kit from './items/nightBootsGlovesArt';
import * as belt from './items/nightBeltArt';
import * as cast from './items/nightCastArmsArt';
import * as hair from './items/nightHairArt';
import * as jacket from './items/nightJacketArt';
import * as katana from './items/katanaV2Art';
import * as skirt from './items/nightSkirtArt';
import * as trousers from './items/nightTrousersArt';
import { dojutsuToEye, getAppearance } from './legacy';
import { NIGHT_HEAD, NIGHT_SKIN } from './nightHeadArt';
import { NIGHT_EYE_COLORS, NIGHT_EYES, NIGHT_IRIS } from './nightEyeArt';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { drawRig, frameCount, GROUND, rigPoseFor } from './rig';
import { rotateTemplate } from './rotsprite';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const REN = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_night')!.character;
const look = (): SpriteAppearance => structuredClone(getAppearance(REN));
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
const POSES = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[];

/** How many of a piece's cells the frame shows in his colour, at `rest` (its first row's first cell) moved by `d`. */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number], d: [number, number] = [0, 0]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      n++;
      const p = (rest[1] + d[1] + j) * GRID + rest[0] + d[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

/** The opaque pixels of a frame not joined (8 ways) to its largest piece. */
function loose(rgba: Uint8ClampedArray): number {
  const seen = new Int32Array(GRID * GRID).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < GRID * GRID; s++) {
    if (!opaque(rgba, s) || seen[s] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [s];
    seen[s] = id;
    while (stack.length) {
      const i = stack.pop()!;
      n++;
      const x = i % GRID;
      const y = (i / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const q = (y + dy) * GRID + x + dx;
          if (x + dx < 0 || x + dx >= GRID || y + dy < 0 || y + dy >= GRID || seen[q] >= 0 || !opaque(rgba, q)) continue;
          seen[q] = id;
          stack.push(q);
        }
    }
    sizes.push(n);
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  return total - Math.max(0, ...sizes);
}

/** The cells a piece has. */
const cells = (p: PaintedPiece) => p.rows.join('').replace(/\./g, '').length;

/** How many pieces (8 ways) a piece turned by `turn` falls into. */
function parts(p: PaintedPiece, turn: number): number {
  const at = new Set(rotateTemplate(p, turn).map(({ dx, dy }) => `${dx},${dy}`));
  const seen = new Set<string>();
  let n = 0;
  for (const k0 of at) {
    if (seen.has(k0)) continue;
    n++;
    seen.add(k0);
    const stack = [k0.split(',').map(Number)];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = `${x + dx},${y + dy}`;
          if (at.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push([x + dx, y + dy]);
          }
        }
    }
  }
  return n;
}

/**
 * Whether a piece turned by `turn` is whole: in no more pieces than he drew it in, and no smaller than
 * 80% of his (a turned 1 px line is shorter across the diagonal; a cut-off piece loses far more).
 */
function whole(p: PaintedPiece, turn: number): string | null {
  const n = rotateTemplate(p, turn).length;
  if (parts(p, turn) > parts(p, 0)) return `in ${parts(p, turn)} pieces, his in ${parts(p, 0)}`;
  return n >= 0.8 * cells(p) ? null : `${n} of ${cells(p)} cells`;
}

/** The mean width of a turned piece across its line (`deg`), from `a0` to `a1` fine pixels along it from the pivot. */
function widthAcross(p: PaintedPiece, turn: number, deg: number, a0: number, a1: number): number {
  const u = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const span = new Map<number, [number, number]>();
  for (const { dx, dy } of rotateTemplate(p, turn)) {
    const a = Math.round(dx * u[0] + dy * u[1]);
    const w = -dx * u[1] + dy * u[0];
    if (a < a0 || a > a1) continue;
    const [lo, hi] = span.get(a) ?? [w, w];
    span.set(a, [Math.min(lo, w), Math.max(hi, w)]);
  }
  const ws = [...span.values()].map(([lo, hi]) => hi - lo + 1);
  return ws.reduce((x, y) => x + y, 0) / ws.length;
}

/** Every pose and frame of a body, with the rig the game draws it on. */
function* everyFrame(body: BodyType) {
  for (const pose of POSES) {
    const rp = rigPoseFor(pose, REN.appearance!.cast?.style, 'held_katana_v2');
    for (let f = 0; f < frameCount(rp); f++) yield { pose, f, rig: drawRig(body, rp, f) };
  }
}

describe("the owner's Ren", () => {
  it('wears his parts in his own colours', () => {
    const l = look();
    assert.equal(l.faceShape, 'night');
    assert.equal(l.eyeShape, 'night');
    assert.equal(l.skin, NIGHT_SKIN);
    assert.equal(l.eyeColor, NIGHT_IRIS);
    assert.deepEqual(
      Object.fromEntries(Object.entries(l.slots).map(([k, v]) => [k, v!.id])),
      { hair: 'hair_night', top: 'top_night_jacket', waist: 'waist_night_belt', skirt: 'skirt_night_studded', bottom: 'bottom_night_trousers', feet: 'feet_night_boots', hands: 'hands_fingerless', held: 'held_katana_v2' },
    );
    for (const c of Object.values(l.slots)) assert.ok(getItem(c!.id), c!.id);
  });

  it('lands every piece on his pixels at rest, where the scripts placed it', () => {
    const f = renderSprite(look(), 'idle', 0, dojutsuToEye(REN.dojutsu)).rgba;
    const [nx, ny] = trousers.NIGHT_LEG_SHIFT.N;
    const [fx, fy] = trousers.NIGHT_LEG_SHIFT.F;
    // What each piece shows of his pixels in our idle (the rest is under the pieces in front of it:
    // the jacket under the belt, the forearms under the gloves, the skirt under the sword...).
    const least: [string, PaintedPiece, [number, number], number, [number, number]?][] = [
      ['jacket', jacket.NIGHT_JACKET_BODY, jacket.NIGHT_JACKET_REST.NIGHT_JACKET_BODY, 0.6],
      ['near sleeve', jacket.NIGHT_SLEEVE_N, jacket.NIGHT_JACKET_REST.NIGHT_SLEEVE_N, 0.98],
      ['far sleeve', jacket.NIGHT_SLEEVE_F, jacket.NIGHT_JACKET_REST.NIGHT_SLEEVE_F, 0.85],
      ['near arm', jacket.NIGHT_ARM_N, jacket.NIGHT_JACKET_REST.NIGHT_ARM_N, 0.4],
      ['far arm', jacket.NIGHT_ARM_F, jacket.NIGHT_JACKET_REST.NIGHT_ARM_F, 0.4],
      ['belt', belt.NIGHT_BELT, belt.NIGHT_BELT_REST.NIGHT_BELT, 0.95],
      ['skirt', skirt.NIGHT_SKIRT, skirt.NIGHT_SKIRT_REST.NIGHT_SKIRT, 0.6],
      ['near glove', kit.NIGHT_GLOVE_N, kit.NIGHT_KIT_REST.NIGHT_GLOVE_N, 0.98],
      ['far glove', kit.NIGHT_GLOVE_F, kit.NIGHT_KIT_REST.NIGHT_GLOVE_F, 0.98],
      ['near shin', trousers.NIGHT_SHIN_N, trousers.NIGHT_TROUSERS_REST.NIGHT_SHIN_N, 0.3, [nx, ny]],
      ['near boot', kit.NIGHT_BOOT_SHIN_N, kit.NIGHT_KIT_REST.NIGHT_BOOT_SHIN_N, 0.78, [nx, ny]],
      ['near foot', kit.NIGHT_BOOT_FOOT_N, kit.NIGHT_KIT_REST.NIGHT_BOOT_FOOT_N, 0.98, [nx, ny]],
      ['far boot', kit.NIGHT_BOOT_SHIN_F, kit.NIGHT_KIT_REST.NIGHT_BOOT_SHIN_F, 0.68, [fx, fy]],
      ['far foot', kit.NIGHT_BOOT_FOOT_F, kit.NIGHT_KIT_REST.NIGHT_BOOT_FOOT_F, 0.98, [fx, fy]],
      ['katana', katana.KATANA_V2, katana.KATANA_V2_REST, 0.85],
    ];
    for (const [name, piece, rest, min, d] of least) {
      const got = atRest(f, piece, rest, d);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
  });

  it('draws his head, eyes and hair at the face anchor', () => {
    const f = renderSprite(look(), 'idle', 0).rgba;
    // His head's pivot is the face anchor; the hair's too (both from his picture's (48, 19), our (123, 139)).
    const rest = (p: { pivot: [number, number] }): [number, number] => [123 - p.pivot[0], 139 - p.pivot[1]];
    assert.ok(atRest(f, NIGHT_HEAD, rest(NIGHT_HEAD)) >= 0.3, 'head');
    const front: PaintedPiece = { ...hair.NIGHT_HAIR_FRONT, angle: 0 };
    assert.ok(atRest(f, front, rest(front)) >= 0.97, 'hair');
    // his near eye's bright iris on the third row of the eye, a column right of the anchor
    const iris = NIGHT_EYES.open.near.rows[2][2];
    assert.notEqual(iris, '.');
    assert.equal(hex(f, (139 + 2) * GRID + 123 + 1 + 2), NIGHT_EYE_COLORS[iris]);
  });

  it('draws every pose whole: nothing comes off the body', () => {
    for (const pose of POSES) {
      for (const frame of [0, 1, 2, 3]) {
        const f = renderSprite(look(), pose, frame).rgba;
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(f, i)) n++;
        assert.ok(n > 1500, `${pose} ${frame}: ${n} pixels`);
        // a thrown weapon leaves the hand ('throw' from its release): the body stays one piece (the
        // runes of his cast float before his palm, apart by design)
        if (pose !== 'cast') assert.ok(loose(f) <= 3, `${pose} ${frame}: ${loose(f)} pixels apart from the body`);
      }
    }
  });

  it('turns his arm pieces whole about our joints in every pose, the forearm as wide as at rest', () => {
    const l = look();
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const { pose, f, rig } of everyFrame(body)) {
        for (const s of ['N', 'F'] as Side[]) {
          const where = `${body} ${pose} ${f} ${s}`;
          // (casting the runes he painted the arms himself: see the test of his cast arms)
          if (rig.pose === 'cast') continue;
          const stamps = nightArmStamps(rig, s);
          const fore = stamps.find((t) => t.name === 'fore')!;
          const upper = stamps.find((t) => t.name === 'upper')!;
          const sleeve = stamps.find((t) => t.name === 'sleeve')!;
          // his upper arm's end turns with his sleeve: one piece
          assert.ok(Math.abs(upper.deg - upper.piece.angle - (sleeve.deg - sleeve.piece.angle)) < 1e-6, `${where}: the upper arm breaks from the sleeve`);
          for (const t of stamps) {
            if (t.name === 'elbow') continue;
            const bad = whole(t.piece, t.deg - t.piece.angle);
            assert.equal(bad, null, `${where} ${t.name}: ${bad}`);
          }
          const w0 = widthAcross(fore.piece, 0, fore.piece.angle, 2, 7);
          const w = widthAcross(fore.piece, fore.deg - fore.piece.angle, fore.deg, 2, 7);
          assert.ok(Math.abs(w - w0) <= 1, `${where}: the forearm is ${w.toFixed(1)} px wide, ${w0.toFixed(1)} at rest`);
          // his glove: the cuff turns with the forearm, the fist whole
          const g = { rig, look: l, has: (slot: string, id: string) => (l.slots as Record<string, { id: string } | undefined>)[slot]?.id === id } as unknown as DrawCtx;
          const hold = s === 'N' ? paintedGrip(g) : null;
          const fists = nightFistStamps(rig, s, hold);
          const cuff = fists.find((t) => t.name === 'cuff')!;
          const turn = (cuff.mirror ? 180 - cuff.piece.angle : cuff.piece.angle) + cuff.turn - fore.deg;
          assert.ok(Math.abs(((turn % 360) + 540) % 360 - 180) < 1, `${where}: the cuff leaves the forearm`);
          for (const t of fists) {
            if (t.name === 'wrist') continue;
            const bad = whole(t.piece, t.turn);
            assert.equal(bad, null, `${where} glove ${t.name}: ${bad}`);
          }
        }
      }
    }
  });

  it('casting the runes, wears the arms he painted in frame 0 of his cast picture, in both frames', () => {
    const l = look();
    const g = (rig: ReturnType<typeof drawRig>) => ({ rig, look: l, has: (slot: string, id: string) => (l.slots as Record<string, { id: string } | undefined>)[slot]?.id === id }) as unknown as DrawCtx;
    // the converter's joints are our male 'cast' frame 0 (tools/refs/ren-cast-arms-from-ref.py CAST_JOINTS)
    const r0 = drawRig('male', 'cast', 0);
    const near = (p: { x: number; y: number }, x: number, y: number) => Math.abs(p.x * RES - x) < 0.01 && Math.abs(p.y * RES - y) < 0.01;
    const hold0 = paintedGrip(g(r0))!;
    assert.ok(near(r0.elbowN, 120.815, 164.105) && near(r0.wristN, 131.598, 161.934) && near(r0.elbowF, 151.101, 154.013) && near(r0.wristF, 162.014, 152.636) && near(r0.handF, 165.586, 152.185), 'the rig moved: rerun the converter with its joints');
    assert.ok(near(hold0.at, 134.876, 163.423) && Math.abs(hold0.fist - 24.44) < 0.01, 'the grip moved: rerun the converter with it');
    // in frame 0 every pixel of his fists is where he drew it, and of his forearms all but what the sleeves, the fists and the sword cover
    const f0 = renderSprite(l, 'cast', 0).rgba;
    for (const [name, min] of [['NIGHT_CAST_FIST_N', 1], ['NIGHT_CAST_FIST_F', 1], ['NIGHT_CAST_FORE_N', 0.9], ['NIGHT_CAST_FORE_F', 0.9]] as const) {
      const got = atRest(f0, cast[name], cast.NIGHT_CAST_REST[name]);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const frame of [0, 1]) {
        const rig = drawRig(body, 'cast', frame);
        const hold = paintedGrip(g(rig));
        for (const s of ['N', 'F'] as Side[]) {
          const where = `${body} cast ${frame} ${s}`;
          const fore = nightArmStamps(rig, s).find((t) => t.name === 'fore')!;
          assert.equal(fore.piece, s === 'N' ? cast.NIGHT_CAST_FORE_N : cast.NIGHT_CAST_FORE_F, where);
          assert.equal(whole(fore.piece, fore.deg - fore.piece.angle), null, `${where} forearm`);
          const fists = nightFistStamps(rig, s, s === 'N' ? hold : null);
          assert.deepEqual(fists.map((t) => t.piece), [s === 'N' ? cast.NIGHT_CAST_FIST_N : cast.NIGHT_CAST_FIST_F], where);
          assert.equal(whole(fists[0].piece, fists[0].turn), null, `${where} fist`);
        }
        // the near fist sits where the sword's grip is held, turned with the fist
        const fist = nightFistStamps(rig, 'N', hold)[0];
        assert.deepEqual(fist.at, hold!.at);
        assert.ok(Math.abs(fist.turn + fist.piece.angle - hold!.fist) < 1e-9);
        // with the sword put away to cast (as the battle does) the same fist closes on nothing where he drew it
        const empty = nightFistStamps(rig, 'N', null, true);
        assert.deepEqual(empty.map((t) => t.piece), [cast.NIGHT_CAST_FIST_N]);
        // (his angles are kept to 0.01 degree; RotSprite turns by whole degrees)
        if (body === 'male' && frame === 0) assert.ok(Math.abs(empty[0].at!.x * RES - 134.876) < 0.01 && Math.abs(empty[0].at!.y * RES - 163.423) < 0.01 && Math.abs(empty[0].turn) < 0.01);
        const stowed = renderSprite({ ...l, body, stowed: true }, 'cast', frame).rgba;
        if (body === 'male' && frame === 0) assert.equal(atRest(stowed, cast.NIGHT_CAST_FIST_N, cast.NIGHT_CAST_REST.NIGHT_CAST_FIST_N), 1, 'the empty fist where he drew it');
        // nothing comes off the body but the runes before his far fist (blue and their pale glow, past the
        // wrist, below the blade's point)
        const px = Uint8ClampedArray.from(renderSprite({ ...l, body }, 'cast', frame).rgba);
        for (let i = 0; i < GRID * GRID; i++) {
          const [r, gr, b] = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
          const rune = i % GRID > rig.wristF.x * RES + 6 && i / GRID > 125 && (b > r + 60 || (b >= r && gr >= r && r > 150));
          if (rune) px[i * 4 + 3] = 0;
        }
        assert.ok(loose(px) <= 3, `${body} ${frame}: ${loose(px)} pixels apart from the body`);
      }
    }
    // his colours mean the same in his cast arms as in his gloves and jacket (the items recolour them by kind)
    for (const [h, k] of Object.entries(cast.NIGHT_CAST_KIND)) {
      for (const other of [kit.NIGHT_KIT_KIND, jacket.NIGHT_JACKET_KIND] as Record<string, string>[]) if (other[h]) assert.equal(other[h], k, h);
    }
  });

  it('lays his skirt on the thighs to the knees, hanging from there, whole and never into the ground', () => {
    const colors = new Set(Object.values(skirt.NIGHT_SKIRT.colors).filter((h) => skirt.NIGHT_SKIRT_KIND[h] === 'silver'));
    const none = { N: { x: 0, y: 0 }, F: { x: 0, y: 0 } };
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const home = drawRig(body, 'idle', 0);
      for (const { pose, f, rig } of everyFrame(body)) {
        const where = `${body} ${pose} ${f}`;
        const stamps = nightSkirtStamps(rig, none);
        // the near panel turns with the near thigh swung forward (it lies on it)
        const near = stamps.filter((t) => t.name === 'upper').at(-1)!;
        const thigh = (r: typeof rig) => (Math.atan2(r.kneeN.y - r.hipN.y, r.kneeN.x - r.hipN.x) * 180) / Math.PI;
        const forward = Math.min(0, thigh(rig) - thigh(home));
        if (forward < -5) assert.ok(Math.abs(near.deg - skirt.NIGHT_SKIRT.angle - forward) < 1, `${where}: the near panel does not lie on the thigh`);
        for (const t of stamps) {
          const turn = t.deg - t.piece.angle;
          const bad = whole(t.piece, Math.abs(turn) > 20 ? turn : 0);
          assert.equal(bad, null, `${where} skirt ${t.name}: ${bad}`);
        }
      }
    }
    for (const pose of ['crouch', 'sit', 'sneak', 'run', 'attack'] as SpritePose[]) {
      for (const frame of [0, 1]) {
        const f = renderSprite(look(), pose, frame).rgba;
        for (let i = GROUND * RES * GRID; i < GRID * GRID; i++) assert.ok(!(opaque(f, i) && colors.has(hex(f, i))), `${pose} ${frame}: a stud in the ground`);
      }
    }
  });

  it('gives his katana the chakra colour on a nichirin blade, the Blade colour on a painted one', () => {
    const pixels = (l: SpriteAppearance) => renderSprite(l, 'idle', 0).rgba;
    const his = pixels(look());
    const red = look();
    red.chakra = { ...red.chakra, tint: 'red' };
    assert.notDeepEqual(pixels(red), his);
    const painted = look();
    painted.slots.held = { id: 'held_katana_v2', colors: [], parts: { steel: 'b' } };
    assert.deepEqual(pixels(painted), his, "with his colours the painted blade is his too");
    const redPainted = structuredClone(red);
    redPainted.slots.held = { id: 'held_katana_v2', colors: [], parts: { steel: 'b' } };
    assert.deepEqual(pixels(redPainted), his, 'a painted blade does not take the chakra');
  });

  it('draws the Fingerless Gloves in his colours for the colours characters saved with them', () => {
    const his = renderSprite(look(), 'idle', 0).rgba;
    for (const colors of [['#25252d', '#9aa4b0'], ['#1b1b22', '#9aa4b0']]) {
      const old = look();
      old.slots.hands = { id: 'hands_fingerless', colors };
      assert.deepEqual(renderSprite(old, 'idle', 0).rgba, his, colors.join(' '));
    }
  });

  it('loads a Ren saved before his new look, and one saved with it', () => {
    const before: ShinobiCharacter = structuredClone({
      ...REN,
      appearance: {
        ...REN.appearance!,
        skin: '#f2c7a0',
        faceShape: undefined,
        eyeShape: 'standard',
        eyeColor: '#38bdf8',
        slots: {
          hair: { id: 'hair_midnight', colors: ['#2a3448'] },
          top: { id: 'top_royalcoat', colors: ['#17181f', '#9aa3b2', '#0d0e14'] },
          bottom: { id: 'bottom_shinobi', colors: ['#17181f', '#17181f'] },
          feet: { id: 'feet_leather', colors: ['#1b1b22', '#0d0d12'] },
          hands: { id: 'hands_fingerless', colors: ['#1b1b22', '#9aa4b0'] },
          held: { id: 'held_katana', colors: [], parts: { steel: 'c', blade: 'a', guard: 'c', hilt: 'a' } },
        },
      },
    } as ShinobiCharacter);
    for (const saved of [before, structuredClone(REN)]) {
      const c = migrateCharacter(JSON.parse(JSON.stringify(saved)));
      assert.equal(c.id, 'preset_night');
      const l = getAppearance(c);
      for (const s of Object.values(l.slots)) assert.ok(getItem(s!.id), s!.id);
      for (const pose of ['idle', 'attack'] as SpritePose[]) assert.ok(loose(renderSprite(l, pose, 1).rgba) <= 3);
      // the old Ren comes back in his new look (the owner: "pasa a nuevo aspecto"), his own chakra kept
      assert.deepEqual({ ...l, chakra: REN.appearance!.chakra }, REN.appearance, 'the new look');
      assert.deepEqual(l.chakra, saved.appearance!.chakra);
    }
    // in the old look's pieces but other colours (the preset's colours changed over time): the new look
    const recoloured = structuredClone(before);
    recoloured.appearance!.slots.top = { id: 'top_royalcoat', colors: ['#7a1c1c', '#9aa3b2', '#0d0e14'] };
    assert.deepEqual(getAppearance(migrateCharacter(recoloured)).slots, REN.appearance!.slots);
    // a Ren whose player changed a piece, and another hero in the old Ren's pieces, keep their looks
    const changed = structuredClone(before);
    changed.appearance!.slots.hair = { id: 'hair_raven', colors: ['#2a3448'] };
    const other = { ...structuredClone(before), id: 'hero_ren_fan', name: 'Kuro' } as ShinobiCharacter;
    for (const c of [changed, other]) assert.deepEqual(migrateCharacter(structuredClone(c)).appearance, c.appearance, c.id);
  });
});
