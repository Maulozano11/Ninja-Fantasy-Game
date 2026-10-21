// Tests for the owner's skin on our male bodies and his Roman face (both from his Roman paint-over): npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { makeRamp, retintSkin } from './color';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { defaultAppearance } from './legacy';
import { widenPiece } from './maleSkin';
import * as skin from './maleSkinArt';
import type { PaintedPiece } from './painted';
import { GRID, partIndex, type PartId } from './raster';
import { buildRig } from './rig';
import { ROMAN_EYE_COLORS, ROMAN_EYES, ROMAN_IRIS } from './romanEyeArt';
import { ROMAN_HEAD, ROMAN_SKIN } from './romanHeadArt';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** A bare body (only the undergarments), in a skin. */
const bare = (body: BodyType, skinHex = skin.MALE_SKIN_BASE): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.skin = skinHex;
  l.slots = {};
  l.accessories = [];
  return l;
};

const LIMBS: [string, PaintedPiece, PartId][] = [
  ['SKIN_UPPER_ARM_N', skin.SKIN_UPPER_ARM_N, 'upperArmN'],
  ['SKIN_UPPER_ARM_F', skin.SKIN_UPPER_ARM_F, 'upperArmF'],
  ['SKIN_HAND_N', skin.SKIN_HAND_N, 'handN'],
  ['SKIN_HAND_F', skin.SKIN_HAND_F, 'handF'],
  ['SKIN_THIGH_N', skin.SKIN_THIGH_N, 'thighN'],
  ['SKIN_THIGH_F', skin.SKIN_THIGH_F, 'thighF'],
];

describe("the owner's skin on the male bodies", () => {
  it('shows his exact pixels at rest in the skin he painted over (the unturned pieces)', () => {
    const f = renderSprite(bare('male'), 'idle', 0);
    // The upper arms and hands are unturned at rest; the thighs are turned from his thigh's angle to ours.
    for (const [name, piece, part] of LIMBS.slice(0, 4)) {
      const [rx, ry] = skin.MALE_SKIN_REST[name];
      const own = new Set(Object.values(piece.colors));
      let hit = 0;
      let wrong = 0;
      piece.rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '.') continue;
          const p = (ry + j) * GRID + rx + i;
          if (f.part[p] !== partIndex(part) || !f.rgba[p * 4 + 3] || !own.has(hex(f.rgba, p))) continue;
          if (hex(f.rgba, p) === piece.colors[row[i]]) hit++;
          else wrong++;
        }
      });
      assert.equal(wrong, 0, `${name}: a pixel of his is not where he painted it`);
      assert.ok(hit >= 10, `${name}: only ${hit} of his pixels show`);
    }
  });

  it('covers most of each limb with his pixels, in every pose, on the male and the bulky bodies', () => {
    const ours = new Set([...makeRamp(skin.MALE_SKIN_BASE, 'skin').slice(1), skin.MALE_SKIN_DARK]);
    for (const body of ['male', 'bulky'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(bare(body), pose, 0);
        for (const [name, piece, part] of LIMBS) {
          const own = new Set(Object.values(piece.colors));
          let limb = 0;
          let his = 0;
          for (let p = 0; p < GRID * GRID; p++) {
            if (f.part[p] !== partIndex(part) || !f.rgba[p * 4 + 3]) continue;
            const c = hex(f.rgba, p);
            // skin only: his, or our ramp's (not the outline, nor a glove, a glow or a cast effect)
            if (!own.has(c) && !ours.has(c)) continue;
            limb++;
            if (own.has(c)) his++;
          }
          // Only limbs that show enough to judge (a far limb behind the body shows a sliver).
          if (limb < 25) continue;
          // His far hand is small (19 pixels) and his far upper arm the strip he shows beside the chest, so
          // where our far limbs show whole (leaning, casting) most of them is ours.
          const least = { SKIN_UPPER_ARM_F: 0.1, SKIN_HAND_F: 0.25, SKIN_HAND_N: 0.4 }[name] ?? 0.5;
          assert.ok(his / limb >= least, `${body} ${pose} ${name}: his pixels cover ${his} of ${limb}`);
        }
      }
    }
  });

  it('follows the limb: turned with it, his pixels stay on that limb', () => {
    // The near upper arm in the attack (raised across the chest) and the victory (raised overhead).
    for (const pose of ['attack', 'victory'] as SpritePose[]) {
      const f = renderSprite(bare('male'), pose, 1);
      const own = new Set(Object.values(skin.SKIN_UPPER_ARM_N.colors));
      const r = f.rig;
      let n = 0;
      for (let p = 0; p < GRID * GRID; p++) {
        if (f.part[p] !== partIndex('upperArmN') || !own.has(hex(f.rgba, p))) continue;
        n++;
        const x = (p % GRID) / 2;
        const y = Math.floor(p / GRID) / 2;
        const dx = r.elbowN.x - r.shoulderN.x;
        const dy = r.elbowN.y - r.shoulderN.y;
        const t = Math.max(0, Math.min(1, ((x - r.shoulderN.x) * dx + (y - r.shoulderN.y) * dy) / (dx * dx + dy * dy)));
        assert.ok(Math.hypot(x - r.shoulderN.x - t * dx, y - r.shoulderN.y - t * dy) < 4, `${pose}: his arm pixel off the arm`);
      }
      assert.ok(n > 30, `${pose}: ${n}`);
    }
  });

  it('moves his skin as far as the player moves the skin, and darkens the ramp to his tone', () => {
    const dark = '#8d5a3c';
    const f = renderSprite(bare('male', dark), 'idle', 0);
    const [name, piece, part] = LIMBS[0];
    const [rx, ry] = skin.MALE_SKIN_REST[name];
    const moved = new Set(Object.values(piece.colors).map((c) => retintSkin(c, skin.MALE_SKIN_BASE, dark)));
    let hit = 0;
    piece.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const p = (ry + j) * GRID + rx + i;
        if (row[i] !== '.' && f.part[p] === partIndex(part) && moved.has(hex(f.rgba, p))) hit++;
      }
    });
    assert.ok(hit >= 10);
  });

  it("draws the male body's darks (shade 1) in his darker tone, and the female's in ours", () => {
    const has = (rgba: Uint8ClampedArray, c: string) => {
      for (let p = 0; p < GRID * GRID; p++) if (rgba[p * 4 + 3] && hex(rgba, p) === c) return true;
      return false;
    };
    const ours = makeRamp(skin.MALE_SKIN_BASE, 'skin')[1];
    const male = renderSprite(bare('male'), 'idle', 0).rgba;
    const female = renderSprite(bare('female'), 'idle', 0).rgba;
    assert.ok(has(male, skin.MALE_SKIN_DARK) && !has(male, ours));
    assert.ok(has(female, ours) && !has(female, skin.MALE_SKIN_DARK));
  });

  it('widens his pieces for the bulky body by repeating his own columns', () => {
    const w = widenPiece(skin.SKIN_THIGH_N, 3);
    const cols = (p: PaintedPiece) => new Set(p.rows.flatMap((r) => [...r]));
    assert.deepEqual(cols(w), cols(skin.SKIN_THIGH_N));
    assert.equal(Math.max(...w.rows.map((r) => r.length)), Math.max(...skin.SKIN_THIGH_N.rows.map((r) => r.length)) + 3);
    assert.equal(w.rows[w.pivot[1]][w.pivot[0]], skin.SKIN_THIGH_N.rows[skin.SKIN_THIGH_N.pivot[1]][skin.SKIN_THIGH_N.pivot[0]]);
  });

  it('leaves the female bodies exactly as they were', () => {
    // The default look on the female and slender bodies, as the integration branch drew them before his
    // male skin (421b9f6). A later change to the female art updates these with it.
    const was: Record<string, string> = {
      'female idle 0': '4f66aa1be065dd83',
      'female attack 1': '1b4219cd3403ebe6',
      'female cast 0': '3d1a84bf30cbd4b5',
      'female run 1': '88ab786d1622e6c8',
      'female downed 0': '3d024464cbf49c72',
      'female sit 0': '577f43f888f362dd',
      'slender idle 0': 'e0bc32b6e79f2997',
      'slender attack 1': '0003aebf087158d8',
      'slender cast 0': '9b90c2c39509bd0d',
      'slender run 1': 'b80b3518c0f108b2',
      'slender downed 0': 'e66bae752441b118',
      'slender sit 0': '344cf8732c7e9051',
    };
    for (const [key, sum] of Object.entries(was)) {
      const [body, pose, frame] = key.split(' ');
      const l = defaultAppearance();
      l.body = body as BodyType;
      const f = renderSprite(l, pose as SpritePose, +frame);
      assert.equal(createHash('sha1').update(f.rgba).digest('hex').slice(0, 16), sum, key);
    }
  });
});

describe("the owner's Roman face", () => {
  const roman = (body: BodyType, hair = true): SpriteAppearance => {
    const l = defaultAppearance();
    l.body = body;
    l.skin = ROMAN_SKIN;
    l.faceShape = 'roman';
    l.eyeShape = 'roman';
    l.eyeColor = ROMAN_IRIS;
    if (!hair) {
      delete l.slots.hair;
      l.headband = { ...l.headband, position: 'none' };
    }
    return l;
  };

  it('is his face, pixel for pixel, on a bald male in the skin he painted over', () => {
    const l = roman('male', false);
    const f = renderSprite(l, 'idle', 0);
    const r = buildRig('male', 'idle', 0);
    const { nx, ny, ex, fx } = faceAnchor({ rig: r, bp: r.bp, look: l } as unknown as DrawCtx);
    // His eyes over his head: where an eye has a pixel of his, that; elsewhere his head.
    const want = new Map<number, string>();
    ROMAN_HEAD.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') want.set((ny - ROMAN_HEAD.pivot[1] + j) * GRID + nx - ROMAN_HEAD.pivot[0] + i, ROMAN_HEAD.colors[row[i]]);
    });
    for (const [eye, x0] of [[ROMAN_EYES.open.near, ex], [ROMAN_EYES.open.far, fx]] as const)
      eye.rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] !== '.') want.set((ny + j) * GRID + x0 + i, ROMAN_EYE_COLORS[row[i]]);
      });
    let same = 0;
    for (const [p, c] of want) if (hex(f.rgba, p) === c) same++;
    // All but the neck under his chin, which the body's own neck and collar line meet.
    assert.ok(same / want.size > 0.97, `${same} of ${want.size}`);
    // His mouth is his: the face template draws none on his head.
    assert.ok([...want.values()].includes(hex(f.rgba, (ny + 6) * GRID + ex + 4)));
  });

  it('draws on every body and in every pose, its eyes shut when knocked down', () => {
    const white = ROMAN_EYE_COLORS[ROMAN_EYES.open.near.rows[2][1]];
    const red = ROMAN_EYE_COLORS[ROMAN_EYES.open.near.rows[2][2]];
    const head = new Set(Object.values(ROMAN_HEAD.colors));
    for (const body of ['male', 'bulky', 'female', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(roman(body), pose, 0);
        const seen = new Set<string>();
        let his = 0;
        for (let p = 0; p < GRID * GRID; p++) {
          if (!f.rgba[p * 4 + 3]) continue;
          const c = hex(f.rgba, p);
          seen.add(c);
          if (head.has(c)) his++;
        }
        assert.ok(his > 40, `${body} ${pose}: ${his} pixels of his head`);
        if (pose === 'downed') assert.ok(!seen.has(red), `${body} downed: eyes open`);
        else assert.ok(seen.has(white) && seen.has(red), `${body} ${pose}: his eyes do not show`);
      }
    }
  });

  it('keeps the other faces as they were', () => {
    const l = roman('male');
    const a = renderSprite({ ...l, faceShape: 'tapered', eyeShape: 'sharp' }, 'idle', 0);
    const b = renderSprite(l, 'idle', 0);
    assert.notDeepEqual(a.rgba, b.rgba);
  });
});
