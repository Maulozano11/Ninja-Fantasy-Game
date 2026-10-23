// Tests for the owner's Roman head as the male standard: his face and eyes raised onto his neck, his
// hair, and the default look that starts with them (2026-10-23): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { hexToRgb, isLine } from './color';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { ROMAN_HAIR_BACK, ROMAN_HAIR_BASE, ROMAN_HAIR_FRONT, ROMAN_HAIR_LINE } from './items/romanHairArt';
import { appearanceFromLegacy, defaultAppearance } from './legacy';
import { MALE_SKIN_BASE } from './maleSkinArt';
import { GRID } from './raster';
import { buildRig, frameCount, rigPoseFor } from './rig';
import { ROMAN_IRIS } from './romanEyeArt';
import { ROMAN_HEAD_UP } from './romanHeadArt';
import { onRomanNeck, romanRig } from './romanNeck';
import { ROMAN_HEAD_PIXELS, ROMAN_OFFSET } from './romanRefPixels';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';
import type { ShinobiCharacter } from '../types/shinobi';

const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
/** Within the 3 a colour of his may move by when the scripts pack his picture's near colours as one. */
const near = (a: string, b: string) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return x.every((v, k) => Math.abs(v - y[k]) <= 3);
};

/** His Roman as he painted it: the default look (his face and eyes) in his outfit, his hair, his skin. */
const romanLook = (body: BodyType = 'male'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.skin = MALE_SKIN_BASE;
  l.slots = {
    hair: { id: 'hair_roman', colors: [] },
    armor: { id: 'armor_bronze', colors: [] },
    skirt: { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } },
    hands: { id: 'hands_bronze_bracers', colors: [] },
    feet: { id: 'feet_gladiator_sandals', colors: [] },
  };
  l.headband = { ...l.headband, position: 'none' };
  return l;
};

/** The same look with our own head (the tapered face, standard eyes) on our neck. */
const ourHead = (l: SpriteAppearance): SpriteAppearance => ({ ...l, faceShape: 'tapered', eyeShape: 'standard' });

/** The open cells a frame closes all round (not reached from the frame's edge through open cells). */
function holes(rgba: Uint8ClampedArray): Set<number> {
  const out = new Set<number>();
  const seen = new Uint8Array(GRID * GRID);
  const stack: number[] = [];
  const open = (p: number) => rgba[p * 4 + 3] === 0;
  for (let i = 0; i < GRID; i++)
    for (const p of [i, (GRID - 1) * GRID + i, i * GRID, i * GRID + GRID - 1])
      if (open(p) && !seen[p]) {
        seen[p] = 1;
        stack.push(p);
      }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % GRID;
    const y = (p / GRID) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx;
      const Y = y + dy;
      const q = Y * GRID + X;
      if (X >= 0 && Y >= 0 && X < GRID && Y < GRID && open(q) && !seen[q]) {
        seen[q] = 1;
        stack.push(q);
      }
    }
  }
  for (let p = 0; p < GRID * GRID; p++) if (open(p) && !seen[p]) out.add(p);
  return out;
}

describe("the owner's Roman head on his neck", () => {
  it('is his picture at rest: hair, face, eyes and neck, every pixel where he painted it', () => {
    const f = renderSprite(romanLook(), 'idle', 0);
    const wrong: string[] = [];
    for (const [x, y, c] of ROMAN_HEAD_PIXELS) {
      const p = (y + ROMAN_OFFSET[1]) * GRID + x + ROMAN_OFFSET[0];
      const ours = f.rgba[p * 4 + 3] ? hex(f.rgba, p) : 'nothing';
      if (ours === 'nothing' || !near(ours, c)) wrong.push(`(${x},${y}) his ${c} ours ${ours}`);
    }
    assert.deepEqual(wrong, []);
    // and nothing of ours round it where he painted none (above his collar)
    const his = new Set(ROMAN_HEAD_PIXELS.map(([x, y]) => `${x},${y}`));
    const extra: string[] = [];
    for (let y = 0; y < 24; y++)
      for (let x = 25; x < 70; x++) {
        const p = (y + ROMAN_OFFSET[1]) * GRID + x + ROMAN_OFFSET[0];
        if (f.rgba[p * 4 + 3] && !his.has(`${x},${y}`)) extra.push(`(${x},${y}) ${hex(f.rgba, p)}`);
      }
    assert.deepEqual(extra, []);
  });

  it('raises the head by his HEAD_UP on the male bodies only, under his face only', () => {
    for (const body of ['male', 'bulky', 'female'] as BodyType[]) {
      const l = { ...defaultAppearance(), body };
      const r = buildRig(body, 'idle', 0);
      const up = romanRig(r, l);
      const male = body === 'male' || body === 'bulky';
      assert.equal(onRomanNeck(l), male, body);
      assert.equal((r.head.y - up.head.y) * 2, male ? ROMAN_HEAD_UP : 0, body);
      const a = faceAnchor({ rig: r, bp: r.bp, look: l } as unknown as DrawCtx);
      const b = faceAnchor({ rig: up, bp: up.bp, look: l } as unknown as DrawCtx);
      assert.equal(a.ny - b.ny, male ? ROMAN_HEAD_UP : 0, body);
      // any other face keeps its head where it was
      assert.equal(romanRig(r, { ...l, faceShape: 'tapered' }), r);
    }
  });

  it('is whole in every pose and frame of the male and bulky bodies: no hole about the head and neck, his hair and eyes on', () => {
    const hair = new Set(Object.values(ROMAN_HAIR_FRONT.colors));
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const l = romanLook(body);
      for (const pose of POSES) {
        for (let fr = 0; fr < frameCount(rigPoseFor(pose)); fr++) {
          const f = renderSprite(l, pose, fr);
          const key = `${body} ${pose} ${fr}`;
          let his = 0;
          for (let p = 0; p < GRID * GRID; p++) if (f.rgba[p * 4 + 3] && hair.has(hex(f.rgba, p))) his++;
          assert.ok(his > 150, `${key}: ${his} pixels of his hair`);
          if (f.rig.lay) continue; // laid on the ground: the frame is transposed (checked whole below)
          const { nx, ny } = faceAnchor({ rig: f.rig, bp: f.rig.bp, look: l } as unknown as DrawCtx);
          // His neck, from under the chin to below the collar: no cell the figure closes all round that our
          // own head, drawn lower on our short neck, leaves closed (a gap between an arm and the chest
          // there is the pose's, with any head).
          const ours = holes(renderSprite(ourHead(l), pose, fr).rgba);
          const inside = [...holes(f.rgba)].filter((p) => !ours.has(p) && Math.abs((p % GRID) - nx - 3) <= 10 && ((p / GRID) | 0) >= ny + 3 && ((p / GRID) | 0) <= ny + 16);
          assert.deepEqual(inside.map((p) => [p % GRID - nx, ((p / GRID) | 0) - ny]), [], key);
        }
      }
    }
  });

  it('lays the knocked-down figure with his head on', () => {
    const f = renderSprite(romanLook(), 'downed', 0);
    const hair = new Set(Object.values(ROMAN_HAIR_FRONT.colors));
    let his = 0;
    for (let p = 0; p < GRID * GRID; p++) if (f.rgba[p * 4 + 3] && hair.has(hex(f.rgba, p))) his++;
    assert.ok(his > 150, `${his}`);
  });

  it('recolours his hair from his middle blue, his black line kept', () => {
    const l = romanLook();
    l.slots.hair = { id: 'hair_roman', colors: ['#d8a040'] };
    const f = renderSprite(l, 'idle', 0);
    const seen = new Set<string>();
    for (let p = 0; p < GRID * GRID; p++) if (f.rgba[p * 4 + 3]) seen.add(hex(f.rgba, p));
    const blues = Object.entries(ROMAN_HAIR_FRONT.colors).filter(([ch]) => !ROMAN_HAIR_LINE.includes(ch)).map(([, h]) => h);
    assert.ok(blues.every((h) => !seen.has(h)), 'his blues are recoloured');
    assert.ok(Object.entries(ROMAN_HAIR_FRONT.colors).some(([ch, h]) => ROMAN_HAIR_LINE.includes(ch) && seen.has(h)), 'his line stays');
    assert.ok(ROMAN_HAIR_LINE.split('').every((ch) => isLine(ROMAN_HAIR_FRONT.colors[ch])));
    assert.ok(Object.values(ROMAN_HAIR_BACK.colors).includes(ROMAN_HAIR_BASE));
  });

  it('is the default male head, in his red eyes; older characters keep their own', () => {
    const d = defaultAppearance();
    assert.equal(d.body, 'male');
    assert.equal(d.faceShape, 'roman');
    assert.equal(d.eyeShape, 'roman');
    assert.equal(d.eyeColor, ROMAN_IRIS);
    // a character saved before the layered look keeps our default face, its own eye colour or blue
    const old = appearanceFromLegacy({ palette: {}, hairstyle: '', armorStyle: '' } as unknown as ShinobiCharacter);
    assert.equal(old.faceShape, undefined);
    assert.equal(old.eyeShape, 'standard');
    assert.equal(old.eyeColor, '#3b82f6');
  });
});
