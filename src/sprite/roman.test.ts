// Tests for the owner's Roman set (Bronze Cuirass, Imperial War Skirt, Bronze Bracers, Gladiator Sandals): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import * as cuirass from './items/bronzeCuirassArt';
import * as skirt from './items/pterugesArt';
import * as kit from './items/bracersSandalsArt';
import { defaultAppearance } from './legacy';
import { MALE_SKIN_BASE } from './maleSkinArt';
import type { PaintedPiece } from './painted';
import { GRID, RES } from './raster';
import { ROMAN_LEG_PIXELS, ROMAN_OFFSET } from './romanRefPixels';
import { buildRig, GROUND, rigPoseFor } from './rig';
import { MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const look = (body: BodyType, drapes = 'on', parts: Partial<Record<'armor' | 'skirt' | 'hands' | 'feet', boolean>> = {}): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  if (parts.armor !== false) l.slots.armor = { id: 'armor_bronze', colors: [] };
  if (parts.skirt !== false) l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes } };
  if (parts.hands !== false) l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  else delete l.slots.hands;
  if (parts.feet !== false) l.slots.feet = { id: 'feet_gladiator_sandals', colors: [] };
  delete l.slots.top;
  delete l.slots.bottom;
  delete l.slots.cape;
  delete l.slots.held;
  return l;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, 'sit'] as SpritePose[];
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
/** Within the 3 a colour of his may move by when the scripts pack his picture's near colours as one. */
const near = (a: string, b: string) => [1, 3, 5].every((k) => Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)) <= 3);

/** The pixels two frames differ in. */
function diff(a: Uint8ClampedArray, b: Uint8ClampedArray): number[] {
  const out: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) for (let k = 0; k < 4; k++) if (a[i * 4 + k] !== b[i * 4 + k]) { out.push(i); break; }
  return out;
}

/**
 * How many of a piece's cells the idle frame shows in his colour, at the place the script says it lands
 * (his skin between the sandals' laces takes the character's skin, so it is not counted).
 */
function atRest(rgba: Uint8ClampedArray, piece: PaintedPiece, rest: [number, number]): number {
  let hit = 0;
  let n = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.' || kit.ROMAN_KIT_KIND[piece.colors[row[i]]] === 'skin') continue;
      n++;
      const p = (rest[1] + j) * GRID + rest[0] + i;
      if (opaque(rgba, p) && hex(rgba, p) === piece.colors[row[i]]) hit++;
    }
  });
  return hit / n;
}

/** Distance from p to the segment a-b. */
function toSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

describe('the Roman set', () => {
  it('lands every piece on his pixels at rest, where the script placed it', () => {
    const f = renderSprite(look('male'), 'idle', 0);
    // What each piece shows of his pixels in our idle (the rest is under our head, arms and legs).
    const least: [string, PaintedPiece, [number, number], number][] = [
      ['chest', cuirass.CUIRASS_CHEST, cuirass.CUIRASS_REST.CUIRASS_CHEST, 0.85],
      ['near guard', cuirass.CUIRASS_GUARD_N, cuirass.CUIRASS_REST.CUIRASS_GUARD_N, 0.98],
      ['far guard', cuirass.CUIRASS_GUARD_F, cuirass.CUIRASS_REST.CUIRASS_GUARD_F, 0.85],
      ['strips', skirt.PTERUGES_FRONT, skirt.PTERUGES_REST.PTERUGES_FRONT, 0.9],
      ['drape', skirt.PTERUGES_DRAPE, skirt.PTERUGES_REST.PTERUGES_DRAPE, 0.6],
      ['near bracer', kit.BRACER_N, kit.ROMAN_KIT_REST.BRACER_N, 0.98],
      ['far bracer', kit.BRACER_F, kit.ROMAN_KIT_REST.BRACER_F, 0.9],
      ['near shin', kit.SANDAL_SHIN_N, kit.ROMAN_KIT_REST.SANDAL_SHIN_N, 0.9],
      ['near sandal', kit.SANDAL_FOOT_N, kit.ROMAN_KIT_REST.SANDAL_FOOT_N, 0.95],
      ['far shin', kit.SANDAL_SHIN_F, kit.ROMAN_KIT_REST.SANDAL_SHIN_F, 0.9],
      ['far sandal', kit.SANDAL_FOOT_F, kit.ROMAN_KIT_REST.SANDAL_FOOT_F, 0.9],
    ];
    for (const [name, piece, rest, min] of least) {
      const got = atRest(f.rgba, piece, rest);
      assert.ok(got >= min, `${name}: ${(got * 100).toFixed(0)}% of his pixels in place`);
    }
  });

  it('shows no bare leg beside his laced shins at rest: his laces, his line, then what is behind', () => {
    // Our calf is wider than his laced shin and leans where his stands straight: it used to show as a strip
    // of skin between his laces and the drape, from under the skirt to the ankle.
    const f = renderSprite(look('male'), 'idle', 0);
    const skin = (i: number) => {
      const [r, g, b] = [0, 1, 2].map((k) => f.rgba[i * 4 + k]);
      return opaque(f.rgba, i) && r >= 135 && b >= 0.42 * r && g >= 0.33 * r && r > b + 25;
    };
    for (const [name, piece, rest] of [
      ['near', kit.SANDAL_SHIN_N, kit.ROMAN_KIT_REST.SANDAL_SHIN_N],
      ['far', kit.SANDAL_SHIN_F, kit.ROMAN_KIT_REST.SANDAL_SHIN_F],
    ] as [string, PaintedPiece, [number, number]][]) {
      // his rows, and the knee's last rows above his strap band (as wide as the band)
      for (let j = -3; j < piece.rows.length; j++) {
        const row = piece.rows[Math.max(0, j)];
        const left = row.search(/[^.]/);
        const right = row.length - 1 - [...row].reverse().join('').search(/[^.]/);
        for (const x of [rest[0] + left - 2, rest[0] + left - 1, rest[0] + right + 1, rest[0] + right + 2]) {
          assert.ok(!skin((rest[1] + j) * GRID + x), `${name} shin, row ${j}: bare skin at x ${x}`);
        }
      }
    }
  });

  it('shows his legs below the skirt at rest as he painted them: every pixel, moved onto ours as the sandals are', () => {
    // The owner (2026-10-21): "copia la referencia con exactitud en la rodilla izquierda". His knees, his
    // skin between the laces, his sandals and his black line round them, in the skin he painted over; the
    // far leg reaches down to where he drew it. Only what the skirt's strips cover in our frame is not
    // checked (his near knee stands under their hem once moved onto our leg).
    const l = look('male');
    l.skin = MALE_SKIN_BASE;
    const f = renderSprite(l, 'idle', 0);
    const strips = new Set<number>();
    const [sx, sy] = skirt.PTERUGES_REST.PTERUGES_FRONT;
    skirt.PTERUGES_FRONT.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') strips.add((sy + j) * GRID + sx + i);
    });
    for (const s of ['N', 'F'] as const) {
      const [dx, dy] = kit.ROMAN_KIT_LEG_SHIFT[s];
      const wrong: string[] = [];
      let hidden = 0;
      let checked = 0;
      for (const [x, y, c] of ROMAN_LEG_PIXELS[`leg${s}`]) {
        // the strips' hem line where it touches his knee is the skirt's, drawn by the skirt where he drew it
        if (strips.has((y + ROMAN_OFFSET[1]) * GRID + x + ROMAN_OFFSET[0])) continue;
        const p = (y + ROMAN_OFFSET[1] + dy) * GRID + x + ROMAN_OFFSET[0] + dx;
        if (strips.has(p)) {
          hidden++;
          continue;
        }
        checked++;
        if (!opaque(f.rgba, p) || !near(hex(f.rgba, p), c)) wrong.push(`(${x},${y}) his ${c} ours ${opaque(f.rgba, p) ? hex(f.rgba, p) : 'none'}`);
      }
      assert.deepEqual(wrong, [], `leg ${s}: pixels of ours that are not his`);
      assert.ok(checked > 220, `leg ${s}: ${checked} of his pixels checked`);
      assert.ok(hidden <= 12, `leg ${s}: ${hidden} of his pixels under the strips`);
    }
  });

  it('never stands the far sandal below the near one at rest, in any pose or body', () => {
    const lowest = kit.ROMAN_KIT_REST.SANDAL_FOOT_N[1] + kit.SANDAL_FOOT_N.rows.length - 1;
    const farColors = new Set(Object.values(kit.SANDAL_FOOT_F.colors));
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(look(body, 'off'), pose, 0);
        const r = buildRig(body, rigPoseFor(pose), 0);
        // his far sandal's pixels: those of its colours within its size of our far ankle
        let low = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (!opaque(f.rgba, i) || !farColors.has(hex(f.rgba, i))) continue;
          if (Math.hypot((i % GRID) + 0.5 - r.ankleF.x * RES, Math.floor(i / GRID) + 0.5 - r.ankleF.y * RES) > 22) continue;
          low = Math.max(low, Math.floor(i / GRID));
        }
        assert.ok(low <= lowest, `${body} ${pose}: far sandal down to row ${low}, below the near one at rest (${lowest})`);
      }
    }
  });

  it('puts both bracers on the forearms in every pose and body', () => {
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        const on = renderSprite(look(body), pose, 1);
        const off = renderSprite(look(body, 'on', { hands: false }), pose, 1);
        const r = buildRig(body, rigPoseFor(pose), 1);
        const segs = [
          [r.elbowN, r.wristN],
          [r.elbowF, r.wristF],
        ].map(([a, b]) => [{ x: a.x * RES, y: a.y * RES }, { x: b.x * RES, y: b.y * RES }]);
        const px = diff(on.rgba, off.rgba);
        // His bracer is about 8 px across, and the outline it moves lies beside it: within 7 px of the
        // forearm's bone is on the forearm (a bracer left at the hip or under the arm is not).
        const far = px.filter((i) => Math.min(...segs.map(([a, b]) => toSegment({ x: (i % GRID) + 0.5, y: Math.floor(i / GRID) + 0.5 }, a, b))) > 7);
        assert.ok(far.length <= px.length * 0.1, `${body} ${pose}: ${far.length} of ${px.length} bracer pixels off the forearms`);
      }
    }
  });

  it('draws every pose on the male, bulky and slender bodies', () => {
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        const f = renderSprite(look(body), pose, 0);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
      }
    }
  });

  it('never lets the drape hang lower than at rest, nor stand up off a body knocked out', () => {
    const hem = skirt.PTERUGES_REST.PTERUGES_DRAPE[1] + skirt.PTERUGES_DRAPE.rows.length - 1;
    assert.ok(hem < GROUND * RES);
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of POSES) {
        const on = renderSprite(look(body), pose, 0);
        const off = renderSprite(look(body, 'off'), pose, 0);
        const px = diff(on.rgba, off.rgba);
        if (pose === 'downed') {
          // Lying, the drape stays within the body's outline (give or take its folds).
          let top = GRID;
          for (let i = 0; i < GRID * GRID; i++) if (opaque(off.rgba, i)) top = Math.min(top, Math.floor(i / GRID));
          for (const i of px) assert.ok(Math.floor(i / GRID) >= top - 1, `${body} downed: drape above the body at row ${Math.floor(i / GRID)}`);
          continue;
        }
        for (const i of px) assert.ok(Math.floor(i / GRID) <= hem, `${body} ${pose}: drape at row ${Math.floor(i / GRID)}, below its hem at rest (${hem})`);
      }
    }
  });

  it('leaves the drapes off when the part says so', () => {
    const count = (drapes: string) => {
      const f = renderSprite(look('male', drapes), 'idle', 0);
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i)) n++;
      return n;
    };
    assert.ok(count('off') < count('on') - 300);
  });

  it('draws the old default colours, which characters saved, in his colours', () => {
    const his = renderSprite(look('male'), 'idle', 0);
    const old = look('male');
    old.slots.armor = { id: 'armor_bronze', colors: ['#b8833a', '#5a3a24'] };
    old.slots.skirt = { id: 'skirt_imperial', colors: ['#b3202a', '#7a4a2a', '#d4a531'], parts: { drapes: 'on' } };
    assert.equal(diff(renderSprite(old, 'idle', 0).rgba, his.rgba).length, 0);
  });

  it('keeps the fitted cuirass on the female bodies', () => {
    for (const body of ['female', 'slender'] as BodyType[]) {
      const f = renderSprite(look(body), 'idle', 0);
      const colors = new Set(Object.values(cuirass.CUIRASS_CHEST.colors));
      let his = 0;
      for (let i = 0; i < GRID * GRID; i++) if (opaque(f.rgba, i) && colors.has(hex(f.rgba, i))) his++;
      assert.ok(his < 60, `${body}: ${his} pixels of his male chest`);
    }
  });
});
