// Tests for the owner's skin on our male bodies and his Roman face (both from his Roman paint-over): npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { hexToRgb, isLine, makeRamp, retintSkinLifted, rgbToHsl } from './color';
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
import { ROMAN_OFFSET, ROMAN_SKIN_PIXELS } from './romanRefPixels';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
/** Our hand shapes his fists are not laid on. */
const OPEN_HANDS = ['open', 'point', 'sign', 'cradle'];
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
  ['SKIN_SHIN_N', skin.SKIN_SHIN_N, 'shinN'],
  ['SKIN_SHIN_F', skin.SKIN_SHIN_F, 'shinF'],
];

/** The outfit he painted over: the Bronze Cuirass, the Imperial War Skirt, the bracers and the sandals. */
const romanOutfit = (body: BodyType = 'male'): SpriteAppearance => {
  const l = bare(body);
  l.slots = {
    armor: { id: 'armor_bronze', colors: [] },
    skirt: { id: 'skirt_imperial', colors: [] },
    hands: { id: 'hands_bronze_bracers', colors: [] },
    feet: { id: 'feet_gladiator_sandals', colors: [] },
  };
  return l;
};

/** Within the 3 a colour of his may move by when the scripts pack his picture's near colours as one. */
const near = (a: string, b: string) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return x.every((v, k) => Math.abs(v - y[k]) <= 3);
};

/**
 * His picture against a frame: each of his skin pixels in a region, moved as that limb is registered on
 * ours, is `right` where the frame shows his colour there, `wrong` where it shows skin that is not his
 * (our own skin ramp, or another colour of his) on that limb's parts, and neither where something covers
 * it (a strap, the bracer, the skirt, the outline) or it falls past our limb (on the chest, say).
 */
function againstHim(f: { rgba: Uint8ClampedArray; part: Uint8Array }, region: string, shift: [number, number], skinHex: string, parts: PartId[], skip: string[] = []) {
  const rgba = f.rgba;
  const on = new Set(parts.map(partIndex));
  const all = Object.values(ROMAN_SKIN_PIXELS).flat();
  const skinColours = new Set([...makeRamp(skinHex, 'skin'), skin.MALE_SKIN_DARK, ...all.map((c) => c[2])]);
  let right = 0;
  const wrong: string[] = [];
  for (const [x, y, c] of ROMAN_SKIN_PIXELS[region]) {
    const p = (y + ROMAN_OFFSET[1] + shift[1]) * GRID + x + ROMAN_OFFSET[0] + shift[0];
    if (!rgba[p * 4 + 3] || !on.has(f.part[p]) || skip.includes(`${x},${y}`)) continue;
    const ours = hex(rgba, p);
    if (near(ours, c)) right++;
    else if (skinColours.has(ours)) wrong.push(`(${x},${y}) his ${c} ours ${ours}`);
  }
  return { right, wrong };
}

// How each limb of his is registered on ours (tools/refs/roman-skin-from-ref.py): his near arm 2 px out, his
// far arm 3 px out (he tucked it in), his near hand 2 px in and a row down, his legs as his sandals are.
const REGISTERED: [string, [number, number], PartId[], number][] = [
  ['upperArmN', [2, 0], ['upperArmN', 'forearmN'], 45],
  ['upperArmF', [3, 0], ['upperArmF', 'forearmF'], 12],
  ['handN', [-2, 1], ['handN'], 30],
  ['handF', [3, 0], ['handF'], 15],
  ['legN', [6, 0], ['thighN', 'shinN'], 70],
  ['legF', [2, -6], ['thighF', 'shinF'], 25],
];

describe("the owner's skin on the male bodies", () => {
  it('is his picture at rest, in his outfit and bare, in the skin he painted over', () => {
    // Every pixel of his skin that lands on our skin shows his colour: our own skin never shows where he
    // painted his (his knees and lower thighs under the skirt, his skin between the laces, his elbows).
    for (const [what, look] of [['his outfit', romanOutfit()], ['bare', bare('male')]] as const) {
      const f = renderSprite(look, 'idle', 0);
      for (const [region, shift, parts, least] of REGISTERED) {
        const { right, wrong } = againstHim(f, region, shift, skin.MALE_SKIN_BASE, parts);
        assert.deepEqual(wrong, [], `${what} ${region}: our skin where he painted his`);
        assert.ok(right >= least, `${what} ${region}: ${right} of his pixels show`);
      }
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
          // His fists go on our closed hands only (not an open palm, a pointing hand, a hand sign or a hand
          // cradling a book: those are tested below).
          const shape = part === 'handN' ? f.rig.shapeN : part === 'handF' ? f.rig.shapeF : undefined;
          if (shape && OPEN_HANDS.includes(shape)) continue;
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
    const moved = new Set(Object.values(piece.colors).map((c) => retintSkinLifted(c, skin.MALE_SKIN_BASE, dark)));
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

  it('keeps his shading apart from the black line on a dark skin', () => {
    // On a very dark skin his darks are lifted (retintSkinLifted): none sinks below our own skin ramp's
    // darkest shade, toward the black line, and his tones stay apart from each other.
    const dark = '#3d2216';
    const L = (c: string) => rgbToHsl(...hexToRgb(c))[2];
    const moved = Object.values(skin.SKIN_UPPER_ARM_N.colors).filter((c) => !isLine(c)).map((c) => retintSkinLifted(c, skin.MALE_SKIN_BASE, dark));
    assert.ok(Math.min(...moved.map(L)) >= L(makeRamp(dark, 'skin')[1]), `darkest ${Math.min(...moved.map(L))}`);
    assert.ok(new Set(moved).size >= 8, `${new Set(moved).size} tones`);
    assert.equal(retintSkinLifted('#07060b', skin.MALE_SKIN_BASE, dark), '#07060b');
    assert.equal(retintSkinLifted('#904f4b', skin.MALE_SKIN_BASE, skin.MALE_SKIN_BASE), '#904f4b');
  });

  it('lays his fists only on our closed hands', () => {
    const fist = new Set([...Object.values(skin.SKIN_HAND_N.colors), ...Object.values(skin.SKIN_HAND_F.colors)]);
    for (const c of makeRamp(skin.MALE_SKIN_BASE, 'skin')) fist.delete(c);
    fist.delete(skin.MALE_SKIN_DARK);
    let open = 0;
    for (const pose of POSES) {
      for (const frame of [0, 1, 2]) {
        const f = renderSprite(bare('male'), pose, frame);
        for (const [side, part] of [['N', 'handN'], ['F', 'handF']] as const) {
          if (!OPEN_HANDS.includes(side === 'N' ? f.rig.shapeN : f.rig.shapeF)) continue;
          open++;
          for (let p = 0; p < GRID * GRID; p++)
            if (f.part[p] === partIndex(part) && f.rgba[p * 4 + 3] && fist.has(hex(f.rgba, p))) assert.fail(`${pose} ${frame}: his fist on our ${side === 'N' ? f.rig.shapeN : f.rig.shapeF} hand`);
        }
      }
    }
    assert.ok(open >= 5, `${open} open hands checked`);
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

  it('is his picture: his face skin where he painted it (3 px lower), on a bald male', () => {
    const f = renderSprite(roman('male', false), 'idle', 0);
    // Not the shadow his bangs cast on his forehead, which the bald skull leaves out (it read as a scar).
    const { right, wrong } = againstHim(f, 'face', [0, 3], ROMAN_SKIN, ['head'], ['52,15', '50,16']);
    assert.deepEqual(wrong, []);
    assert.ok(right / ROMAN_SKIN_PIXELS.face.length > 0.9, `${right} of ${ROMAN_SKIN_PIXELS.face.length}`);
  });

  it('has a clean bald skull: no shadow of his hair on the forehead, no seam behind the ear', () => {
    const l = roman('male', false);
    const f = renderSprite(l, 'idle', 0);
    const r = buildRig('male', 'idle', 0);
    const { nx, ny } = faceAnchor({ rig: r, bp: r.bp, look: l } as unknown as DrawCtx);
    // The forehead above the brow, from the temple to the far brow, is his skull's base skin only (the row
    // over the brow is his own forehead between the bangs).
    const forehead = new Set<string>();
    for (let y = ny - 6; y < ny - 1; y++) for (let x = nx - 2; x <= nx + 6; x++) forehead.add(hex(f.rgba, y * GRID + x));
    assert.equal(forehead.size, 1, [...forehead].join(' '));
    // Behind the ear, down to its lobe, no skin pixel of the head between two pixels of black line in a
    // row (a seam: his ear's line inside the skull's).
    let seams = 0;
    for (let y = ny - 12; y < ny + 4; y++)
      for (let x = nx - 9; x < nx - 3; x++) {
        const p = y * GRID + x;
        const dark = (q: number) => f.rgba[q * 4 + 3] > 0 && isLine(hex(f.rgba, q));
        if (f.part[p] === partIndex('head') && !dark(p) && dark(p - 1) && dark(p + 1)) seams++;
      }
    assert.equal(seams, 0);
  });

  it('keeps his black line black in every skin', () => {
    const l = { ...roman('male', false), skin: '#7fbf6a' };
    const f = renderSprite(l, 'idle', 0);
    const lines = Object.values(ROMAN_HEAD.colors).filter(isLine);
    const seen = new Set<string>();
    for (let p = 0; p < GRID * GRID; p++) if (f.part[p] === partIndex('head') && f.rgba[p * 4 + 3]) seen.add(hex(f.rgba, p));
    // (the eyes cover some of his line cells)
    assert.ok(lines.filter((c) => seen.has(c)).length >= lines.length / 2, `${lines.filter((c) => seen.has(c)).length} of ${lines.length} of his line colours`);
  });

  it('is the module lifted for it, pixel for pixel, on a bald male in the skin he painted over', () => {
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
    // The other face and eye shapes on the female and slender bodies (where the male skin does not
    // reach), as the integration branch drew them before his Roman face (421b9f6); his Aiden head in the
    // skin he painted it in.
    const was: Record<string, string> = {
      'female tapered sharp': '97e1cf96e344970a',
      'female tapered valiant': 'a0decd31b3d725d0',
      'female soft sharp': 'b7a785d83b4a1666',
      'female soft valiant': '840e7d300d4e0f34',
      'female square sharp': 'c7294669412887c7',
      'female square valiant': '7740ce7375a28eb3',
      'female valiant sharp': '7c1c575c756f6907',
      'female valiant valiant': '439579fad6bf660a',
      'slender tapered sharp': 'b5d2f2ec5aaebf3c',
      'slender soft valiant': 'c39edf8b338e256f',
      'slender square sharp': '49bd580d4abe655e',
      'slender valiant valiant': '5b5ff7065013120e',
    };
    for (const [key, sum] of Object.entries(was)) {
      const [body, face, eye] = key.split(' ');
      const l = defaultAppearance();
      l.body = body as BodyType;
      l.faceShape = face as SpriteAppearance['faceShape'];
      l.eyeShape = eye as SpriteAppearance['eyeShape'];
      if (face === 'valiant') l.skin = '#f6bb96';
      const f = renderSprite(l, 'idle', 0);
      assert.equal(createHash('sha1').update(f.rgba).digest('hex').slice(0, 16), sum, key);
    }
  });
});
