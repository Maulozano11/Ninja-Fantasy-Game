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
import { GRID, Layer, partIndex, RES } from './raster';
import { ROMAN_LEG_PIXELS, ROMAN_OFFSET } from './romanRefPixels';
import { buildRig, drawRig, frameCount, GROUND, rigPoseFor } from './rig';
import type { TemplatePalette } from './rotsprite';
import { clothHole, drapeLayer, skirtHoles } from './items/armor';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

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

/** The whole Roman set rendered, once for the sweeps over every pose and frame that share it. */
const DRESSED = new Map<string, ReturnType<typeof renderSprite>>();
const dressed = (body: BodyType, pose: SpritePose, f: number) => {
  const key = `${body}|${pose}|${f}`;
  let fr = DRESSED.get(key);
  if (!fr) DRESSED.set(key, (fr = renderSprite(look(body), pose, f)));
  return fr;
};

const POSES = [...SPRITE_POSES, ...MOVE_POSES, 'sit'] as SpritePose[];
const ALL_POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
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

  it('keeps each sandal on its shin, and the figure in one piece, in every pose and frame of every body', () => {
    // The owner, on the combo's kick: "el pie en combo con el que patea esta separado y cortado". Every piece
    // of a sandal in sight touches its own shin, or, for the far one, the near leg or the skirt in front of
    // it (the far sandal peeks out on both sides of the near shin as he walks). Only the cast's chakra at the
    // far hand stands apart from the body.
    const near8 = (i: number) => [-GRID - 1, -GRID, -GRID + 1, -1, 1, GRID - 1, GRID, GRID + 1].map((d) => i + d);
    const pieces = (on: (i: number) => boolean): number[][] => {
      const seen = new Uint8Array(GRID * GRID);
      const out: number[][] = [];
      for (let i = 0; i < GRID * GRID; i++) {
        if (seen[i] || !on(i)) continue;
        const px: number[] = [];
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const p = stack.pop()!;
          px.push(p);
          for (const q of near8(p)) if (q >= 0 && q < GRID * GRID && Math.abs((q % GRID) - (p % GRID)) <= 1 && !seen[q] && on(q)) (seen[q] = 1), stack.push(q);
        }
        out.push(px);
      }
      return out;
    };
    const handF = partIndex('handF');
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of ALL_POSES) {
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const fr = dressed(body, pose, f);
          for (const s of ['N', 'F'] as const) {
            const foot = partIndex(`foot${s}`);
            const ok = new Set([partIndex(`shin${s}`), ...(s === 'F' ? (['thighN', 'shinN', 'footN', 'pelvis'] as const).map(partIndex) : [])]);
            for (const px of pieces((i) => opaque(fr.rgba, i) && fr.part[i] === foot)) {
              const joined = px.some((p) => near8(p).some((q) => opaque(fr.rgba, q) && ok.has(fr.part[q])));
              assert.ok(joined, `${body} ${pose} ${f}: a piece of the ${s} sandal (${px.length} px at ${px[0] % GRID},${Math.floor(px[0] / GRID)}) apart from its shin`);
            }
          }
          const parts = pieces((i) => opaque(fr.rgba, i)).sort((a, b) => b.length - a.length);
          for (const px of parts.slice(1)) {
            const effect = pose === 'cast' && px.every((p) => fr.part[p] === handF);
            assert.ok(effect, `${body} ${pose} ${f}: ${px.length} px apart from the figure at ${px[0] % GRID},${Math.floor(px[0] / GRID)}`);
          }
        }
      }
    }
  });

  it('keeps the body in one piece at the waist in every pose and frame: no gap between the cuirass and the skirt', () => {
    // The owner, on the victory: "victoria se corta el cuerpo por la mitad". His cuirass rides the neck and the
    // skirt's strips hang from the pelvis, so a chest lifted off the hips (victory's second frame) opened a gap
    // between them. Up lines along the torso's axis, through its middle (6 px either side of the pelvis), from
    // below the hips into the chest: the first of the torso's pixels after the skirt's comes right after it,
    // with no background between.
    const torso = partIndex('torso');
    const pelvis = partIndex('pelvis');
    for (const body of ['male', 'bulky', 'female', 'slender'] as BodyType[]) {
      for (const pose of ALL_POSES) {
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const fr = dressed(body, pose, f);
          const r = fr.rig;
          const n = Math.hypot(r.up.x, r.up.y);
          const up = { x: r.up.x / n, y: r.up.y / n };
          const gaps: string[] = [];
          for (let o = -6; o <= 6; o++) {
            let skirtSeen = false;
            let open = false;
            for (let k = -8; k <= 24; k++) {
              const x = Math.floor(r.pelvis.x * RES - up.y * o + up.x * k);
              const y = Math.floor(r.pelvis.y * RES + up.x * o + up.y * k);
              const i = y * GRID + x;
              const empty = !opaque(fr.rgba, i);
              if (!empty && fr.part[i] === pelvis) {
                skirtSeen = true;
                open = false;
              } else if (empty) {
                open ||= skirtSeen;
              } else if (fr.part[i] === torso) {
                if (open) gaps.push(`${x},${y}`);
                break;
              } else open = false;
            }
          }
          assert.equal(gaps.length, 0, `${body} ${pose} ${f}: the body cut at the waist, the gap under ${gaps.join(' ')}`);
        }
      }
    }
  });

  it('turns the sandal with its shin when the leg swings the foot off the ground', () => {
    // He drew the sandal under his laced shin as one: wherever the shin is turned well away from rest (past
    // 45 degrees) with the foot lifted, the sandal stays where it is on the shin at rest (measured along and
    // across the shin from our ankle), not flat under the ankle beside a shin kicked out.
    const place = (fr: ReturnType<typeof renderSprite>, s: 'N' | 'F') => {
      const r = fr.rig;
      const [knee, ankle] = s === 'N' ? [r.kneeN, r.ankleN] : [r.kneeF, r.ankleF];
      const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
      const [ux, uy] = [(ankle.x - knee.x) / len, (ankle.y - knee.y) / len];
      const foot = partIndex(`foot${s}`);
      let along = 0;
      let across = 0;
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        if (!opaque(fr.rgba, i) || fr.part[i] !== foot) continue;
        const dx = (i % GRID) + 0.5 - ankle.x * RES;
        const dy = Math.floor(i / GRID) + 0.5 - ankle.y * RES;
        along += dx * ux + dy * uy;
        across += dx * uy - dy * ux;
        n++;
      }
      return { along: along / n, across: across / n, n, deg: (Math.atan2(uy, ux) * 180) / Math.PI, lift: ankle.y };
    };
    let lifted = 0;
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      const rest = renderSprite(look(body), 'idle', 0);
      for (const pose of ALL_POSES) {
        if (pose === 'downed') continue;
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const fr = dressed(body, pose, f);
          for (const s of ['N', 'F'] as const) {
            const r0 = place(rest, s);
            const now = place(fr, s);
            const turn = Math.abs(((now.deg - r0.deg + 540) % 360) - 180);
            if (turn <= 45 || (r0.lift - now.lift) * RES <= 3) continue;
            // a sandal mostly hidden (behind the skirt or the other leg) has no place to measure
            if (now.n < r0.n * 0.6) continue;
            lifted++;
            const off = Math.hypot(now.along - r0.along, now.across - r0.across);
            assert.ok(off <= 3, `${body} ${pose} ${f}: the ${s} sandal ${off.toFixed(1)} px from its place on the shin (shin turned ${turn.toFixed(0)} degrees)`);
          }
        }
      }
    }
    assert.ok(lifted >= 6, `${lifted} lifted sandals measured`);
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

  it('never lets the drape go into the ground, nor stand up off a body knocked out', () => {
    const hem = GROUND * RES - 1;
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
        for (const i of px) assert.ok(Math.floor(i / GRID) <= hem, `${body} ${pose}: drape at row ${Math.floor(i / GRID)}, below the ground line (${hem})`);
      }
    }
  });

  it('draws his drape at rest exactly as he drew it, in every idle frame of every body', () => {
    // Each colour of his as its own pen: the drape's own layer holds his cell, and nothing else, at each place.
    const pal: TemplatePalette = {};
    Object.keys(skirt.PTERUGES_DRAPE.colors).forEach((ch, k) => (pal[ch] = [k, 3]));
    const index = Object.fromEntries(Object.keys(skirt.PTERUGES_DRAPE.colors).map((ch, k) => [ch, k]));
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (let f = 0; f < frameCount('idle'); f++) {
        const r = drawRig(body, 'idle', f);
        const L = drapeLayer(r, pal);
        // his drape hangs from the pelvis: on each body as far from it as on our male
        const male = drawRig('male', 'idle', 0);
        const ox = skirt.PTERUGES_REST.PTERUGES_DRAPE[0] + Math.floor(r.pelvis.x * RES) - Math.floor(male.pelvis.x * RES);
        const oy = skirt.PTERUGES_REST.PTERUGES_DRAPE[1] + Math.floor(r.pelvis.y * RES) - Math.floor(male.pelvis.y * RES);
        const want = new Map<number, number>();
        skirt.PTERUGES_DRAPE.rows.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) if (row[i] !== '.') want.set((oy + j) * GRID + ox + i, index[row[i]]);
        });
        let wrong = 0;
        for (let p = 0; p < GRID * GRID; p++) if ((L.mat[p] >= 0 ? L.mat[p] : undefined) !== want.get(p)) wrong++;
        assert.equal(wrong, 0, `${body} idle ${f}: ${wrong} pixels of the drape not his`);
      }
    }
  });

  it('hangs the drape on the legs as a skirt in every pose and frame: never trailing like a cape, never holed', () => {
    // The skirt's bones: each thigh from hip to knee, the hips, and the cloth hanging from each knee as far
    // as his hem hangs below our knee at rest. Every pixel of the drape stays as near them as the farthest
    // of his at rest (his flap behind the near leg), and never further behind the legs than at rest.
    const pal: TemplatePalette = {};
    Object.keys(skirt.PTERUGES_DRAPE.colors).forEach((ch, k) => (pal[ch] = [k, 3]));
    const hang = skirt.PTERUGES_REST.PTERUGES_DRAPE[1] + skirt.PTERUGES_DRAPE.rows.length - 1 - drawRig('male', 'idle', 0).kneeN.y * RES;
    const measure = (body: BodyType, pose: SpritePose, f: number) => {
      const r = drawRig(body, rigPoseFor(pose), f);
      const L = drapeLayer(r, pal);
      const at = (p: { x: number; y: number }) => ({ x: p.x * RES, y: p.y * RES });
      const [hN, kN, hF, kF] = [r.hipN, r.kneeN, r.hipF, r.kneeF].map(at);
      const bones = [[hN, kN], [hF, kF], [hN, hF], [kN, { x: kN.x, y: kN.y + hang }], [kF, { x: kF.x, y: kF.y + hang }]];
      const back = Math.min(hN.x, kN.x, hF.x, kF.x);
      let far = 0;
      let behind = -GRID;
      let holes = 0;
      for (let p = 0; p < GRID * GRID; p++) {
        const x = p % GRID;
        const y = Math.floor(p / GRID);
        if (clothHole(L, x, y)) holes++;
        if (L.mat[p] < 0) continue;
        const q = { x: x + 0.5, y: y + 0.5 };
        far = Math.max(far, Math.min(...bones.map(([a, b]) => toSegment(q, a, b))));
        behind = Math.max(behind, back - q.x);
      }
      return { far, behind, holes };
    };
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      const rest = measure(body, 'idle', 0);
      assert.equal(rest.holes, 0, `${body} idle: holes in his drape`);
      for (const pose of ALL_POSES) {
        if (pose === 'downed') continue;
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const m = measure(body, pose, f);
          assert.ok(m.far <= rest.far + 1, `${body} ${pose} ${f}: drape ${m.far.toFixed(1)} px from the legs (at rest ${rest.far.toFixed(1)})`);
          assert.ok(m.behind <= rest.behind + 1, `${body} ${pose} ${f}: drape ${m.behind.toFixed(1)} px behind the legs (at rest ${rest.behind.toFixed(1)})`);
          assert.equal(m.holes, 0, `${body} ${pose} ${f}: ${m.holes} holes in the drape`);
        }
      }
    }
  });

  it('shows his drape behind his fist, where the owner marked the gap beside our fist', () => {
    // His fist hid the cloth above the drape's top line beside the strips (the first rows of his drape):
    // the script continues it there, and our fist, a few pixels left of his, leaves it in sight. At rest no
    // background shows between the near fist (from its top) and the strips, down to his drape's top line.
    const [ox, oy] = skirt.PTERUGES_REST.PTERUGES_DRAPE;
    const arm = new Set([partIndex('handN'), partIndex('forearmN')]);
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (let f = 0; f < frameCount(rigPoseFor('idle')); f++) {
        const fr = dressed(body, 'idle', f);
        const hand = [...fr.part.keys()].find((i) => fr.part[i] === partIndex('handN'))!;
        let open = 0;
        for (let y = Math.floor(hand / GRID); y < oy + skirt.PTERUGES_DRAPE_FIST_ROWS; y++) {
          // the near arm's right edge in the row, and what lies between it and the body beside it
          let x = ox + 24;
          while (x > 0 && !arm.has(fr.part[y * GRID + x])) x--;
          for (x++; x < GRID && !opaque(fr.rgba, y * GRID + x); x++) open++;
        }
        assert.equal(open, 0, `${body} idle ${f}: ${open} pixels of background beside the fist`);
      }
    }
  });

  it('cuts the drape behind his fist on his slant: one column a row up to the strips, his line along it', () => {
    // The owner: "sigue la orientacion que tiene ahorita la capa en diagonal de abajo arriba". The cloth's
    // left edge goes on up from his drape's top left corner one column a row (his own slant below it moves
    // one column a row, or keeps its column), so no row sticks out past the slant, and its edge is his line.
    const rows = skirt.PTERUGES_DRAPE.rows;
    const n = skirt.PTERUGES_DRAPE_FIST_ROWS;
    const left = rows.map((r) => r.search(/[^.]/));
    for (let j = n; j < n + 10; j++) assert.ok([0, 1].includes(left[j] - left[j + 1]), `his slant at row ${j}: ${left[j]} then ${left[j + 1]}`);
    for (let j = 0; j < n; j++) {
      assert.equal(left[j] - left[j + 1], 1, `row ${j} of the cloth behind his fist starts at ${left[j]}, the row below at ${left[j + 1]}`);
      assert.equal(skirt.PTERUGES_KIND[skirt.PTERUGES_DRAPE.colors[rows[j][left[j]]]], 'line', `row ${j}: the slanted edge is not his line`);
      assert.ok(!rows[j].slice(left[j]).replace(/\.+$/, '').includes('.'), `row ${j}: a gap in the cloth`);
    }
    // it reaches the strips: its first row is one cell, his line, beside them
    assert.equal(rows[0].replace(/\./g, '').length, 1);
  });

  it('never shows the background through the skirt, in any pose or frame of any body', () => {
    // No hole within the drape's outline, no pinhole or nick (a cell with the skirt on three sides) beside
    // the skirt, and no white in it: the owner's "white dead pixels". The skirt is what the pelvis wears.
    const pal: TemplatePalette = {};
    Object.keys(skirt.PTERUGES_DRAPE.colors).forEach((ch, k) => (pal[ch] = [k, 3]));
    const pelvis = partIndex('pelvis');
    const white = (rgba: Uint8ClampedArray, i: number) => [0, 1, 2].every((k) => rgba[i * 4 + k] >= 200);
    for (const body of ['male', 'bulky', 'slender'] as BodyType[]) {
      for (const pose of ALL_POSES) {
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const fr = dressed(body, pose, f);
          // knocked out the frame is laid down: only the pinholes and nicks, which lying does not change
          const drape = pose === 'downed' ? new Layer() : drapeLayer(fr.rig, pal);
          const holes = skirtHoles((i) => opaque(fr.rgba, i), drape, (i) => fr.part[i] === pelvis);
          const at = holes.slice(0, 6).map((i) => `${i % GRID},${Math.floor(i / GRID)}`);
          assert.equal(holes.length, 0, `${body} ${pose} ${f}: background through the skirt at ${at.join(' ')}`);
          let whites = 0;
          for (let i = 0; i < GRID * GRID; i++) if (opaque(fr.rgba, i) && fr.part[i] === pelvis && white(fr.rgba, i)) whites++;
          assert.equal(whites, 0, `${body} ${pose} ${f}: ${whites} white pixels in the skirt`);
        }
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
