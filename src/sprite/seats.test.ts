// The sit pose on a seat (rig.ts SIT, seats.ts): the owner's Roman sit is the standard sit for every body,
// and his rock is a prop of its own, drawn apart from the character and swapped by the scene (the owner,
// 2026-10-22: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del
// escenario"): npm test. (No hole and one piece in every sit frame: roman.test.ts, over every pose.)

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { defaultAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { stretchPiece } from './painted';
import { SKIN_THIGH_F, SKIN_THIGH_N } from './maleSkinArt';
import { ANKLE_N, BODY_PARAMS, buildRig, drawRig, FAR_LIFT, frameCount, READ_JOINTS, READ_KEYS, READ_SEAT_TOP, rigPoseFor, SIT_SEAT_TOP } from './rig';
import { READ_BOOK, READ_HAND_F, READ_HAND_N, READ_SKIN_BASE, type ReadPiece } from './maleReadArt';
import { DEFAULT_SEAT, onSeat, renderSeat, SEATS, seatFor, type SeatId } from './seats';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance } from './types';

const BODIES: BodyType[] = ['male', 'bulky', 'slender'];
const roman = (body: BodyType): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [] };
  delete l.slots.top;
  delete l.slots.bottom;
  return l;
};
const opaque = (rgba: Uint8ClampedArray) => {
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3]) n++;
  return n;
};
/** The lowest row of a body part in a frame. */
const lowest = (part: Uint8Array, id: number) => {
  for (let i = GRID * GRID - 1; i >= 0; i--) if (part[i] === id) return Math.floor(i / GRID);
  return -1;
};

/**
 * His joints in his four frames (docs/reference/roman-sit-owner-reference.jpg), read off his figure scaled by
 * 1.25 into our frame (his head on our male's, then 6 px up: his soles on our ground line), in fine pixels.
 */
const HIS = [
  { head: [117, 142], neck: [118, 151], shoulderN: [104, 152], shoulderF: [124, 157], elbowN: [108.5, 164], elbowF: [132.5, 166], wristN: [113, 174], wristF: [143.5, 167], handN: [114.5, 177], handF: [147, 167.5], pelvis: [110, 179], kneeN: [119, 191], kneeF: [134, 185], ankleN: [124, 208.5], ankleF: [136, 204] },
  { head: [118, 142], neck: [119, 151], shoulderN: [105, 152], shoulderF: [125, 157], elbowN: [109, 164], elbowF: [133.5, 166], wristN: [113.5, 174], wristF: [144.5, 167], handN: [115, 177], handF: [148, 167.5], pelvis: [110, 179], kneeN: [118, 191], kneeF: [133, 185], ankleN: [124, 208.5], ankleF: [136, 204] },
  { head: [117, 142], neck: [117.5, 151], shoulderN: [103, 152], shoulderF: [123, 157], elbowN: [107.5, 164], elbowF: [132, 166.5], wristN: [112, 174.5], wristF: [143.5, 168], handN: [113.5, 177.5], handF: [147, 168.5], pelvis: [110, 179], kneeN: [116, 191], kneeF: [130, 185], ankleN: [121, 208.5], ankleF: [134, 204] },
  { head: [117, 142], neck: [117.5, 151], shoulderN: [103, 153], shoulderF: [123, 157], elbowN: [102, 169], elbowF: [132, 166], wristN: [109, 177], wristF: [143.5, 167], handN: [113, 180.5], handF: [147, 167.5], pelvis: [110, 179], kneeN: [121, 191], kneeF: [136, 185], ankleN: [125, 208.5], ankleF: [137, 204] },
] as const;
/**
 * How near each joint comes to his (fine px): 2, but our shins (15.4 px) are shorter than his (18 to 19.4 px):
 * the seated thighs lengthen so each knee is as near his as our shin standing on his ankle lets it (rig.ts
 * kneeLeg), 2.1 to 2.6 px for the near knee and 3.6 to 4.0 for the far one, a little low on his shin's line; his
 * frame 4 near arm is longer than ours (his elbow 16 px from the shoulder, ours 12.6), so it cannot reach; and
 * in his frames 3 and 4 the far elbow sits lower on a straighter arm than our arm's bend puts it.
 */
const tolerance = (k: number, j: string) =>
  j === 'kneeN' ? 3 : j === 'kneeF' ? 4.5 : k === 3 && /N$/.test(j) && /^(elbow|wrist|hand)/.test(j) ? 8 : k >= 2 && j === 'elbowF' ? 4 : 2;

describe('the sit on a seat', () => {
  it('poses the male toward his joints in each of his four frames', () => {
    for (let k = 0; k < 4; k++) {
      const r = buildRig('male', rigPoseFor('sit'), k) as unknown as Record<string, { x: number; y: number }>;
      for (const [j, [x, y]] of Object.entries(HIS[k])) {
        const d = Math.hypot(r[j].x * RES - x, r[j].y * RES - y);
        assert.ok(d <= tolerance(k, j), `frame ${k + 1} ${j}: ${d.toFixed(1)} px from his`);
      }
    }
  });

  it('lengthens the thighs on the seat only, his skin with them', () => {
    const thigh = (r: ReturnType<typeof buildRig>, s: 'N' | 'F') => Math.hypot(r[`knee${s}`].x - r[`hip${s}`].x, r[`knee${s}`].y - r[`hip${s}`].y);
    for (const body of ['male', 'bulky'] as const) {
      const bp = BODY_PARAMS[body];
      for (let f = 0; f < frameCount(rigPoseFor('sit')); f++) {
        const r = buildRig(body, rigPoseFor('sit'), f);
        for (const s of ['N', 'F'] as const) {
          // longer than the body's, about his (his hips to his knees: 18 to 23 px), never past 26 px
          const t = thigh(r, s) * RES;
          assert.ok(t > bp.thigh * RES + 3 && t < 26, `${body} sit ${f} thigh${s}: ${t.toFixed(1)} px`);
          // and his thigh skin is as long as it: rows of his repeated, none made up
          const p = s === 'N' ? SKIN_THIGH_N : SKIN_THIGH_F;
          const long = stretchPiece(p, t - bp.thigh * RES, bp.thigh * RES);
          assert.ok(long.rows.length > p.rows.length, `${body} sit ${f}: his thigh${s} skin lengthened`);
          const his = new Set(p.rows.map((row) => row.replace(/^\.+|\.+$/g, '')));
          for (const row of long.rows) assert.ok(his.has(row.replace(/^\.+|\.+$/g, '')), `${body} sit ${f}: a row of his thigh${s} skin`);
        }
      }
      // every other pose keeps the body's own thighs (and his skin as painted)
      for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'sit')) {
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const r = drawRig(body, rigPoseFor(pose), f);
          for (const s of ['N', 'F'] as const) {
            assert.ok(Math.abs(thigh(r, s) - bp.thigh) < 1e-9, `${body} ${pose} ${f}: thigh${s} ${thigh(r, s)}`);
            const p = s === 'N' ? SKIN_THIGH_N : SKIN_THIGH_F;
            assert.equal(stretchPiece(p, (thigh(r, s) - bp.thigh) * RES, bp.thigh * RES), p);
          }
        }
      }
    }
  });

  it('sits every body on the seat, both feet on the ground', () => {
    const footN = partIndex('footN');
    const footF = partIndex('footF');
    for (const body of BODIES) {
      const idle = renderSprite(roman(body), 'idle', 0).part;
      for (let f = 0; f < frameCount(rigPoseFor('sit')); f++) {
        const r = buildRig(body, rigPoseFor('sit'), f);
        // the hips on the seat's top, as on every seat
        assert.ok(Math.abs(r.pelvis.y * RES - (SIT_SEAT_TOP - 5.4)) < 0.01, `${body} ${f}: pelvis at ${r.pelvis.y * RES}`);
        // each sole on the row it stands on at rest
        const part = renderSprite(roman(body), 'sit', f).part;
        assert.ok(Math.abs(lowest(part, footN) - lowest(idle, footN)) <= 1, `${body} sit ${f}: near sole on row ${lowest(part, footN)}, at rest ${lowest(idle, footN)}`);
        assert.ok(Math.abs(lowest(part, footF) - lowest(idle, footF)) <= 1, `${body} sit ${f}: far sole on row ${lowest(part, footF)}, at rest ${lowest(idle, footF)}`);
      }
    }
    // his rock is under the hips: its top in the pelvis's column is on the seat's top, or as he drew it, 2 rows
    // under it (the seat's top is his, row 184, where his hips put it; his skirt and drape lie on the rock)
    const rock = renderSeat('seat_boulder');
    const x = Math.round(buildRig('male', rigPoseFor('sit'), 0).pelvis.x * RES);
    let top = 0;
    while (!rock[(top * GRID + x) * 4 + 3]) top++;
    assert.ok(top <= SIT_SEAT_TOP + 2 && top >= SIT_SEAT_TOP - 6, `his rock's top at row ${top} under the hips`);
  });

  it('is drawn apart from the character: the sit sprite has no rock in it', () => {
    const rock = renderSeat('seat_boulder');
    assert.ok(opaque(rock) > 900, 'his rock');
    for (const body of BODIES) {
      const f = renderSprite(roman(body), 'sit', 0).rgba;
      let bare = 0;
      for (let i = 0; i < GRID * GRID; i++) if (rock[i * 4 + 3] && !f[i * 4 + 3]) bare++;
      assert.ok(bare > 300, `${body}: ${bare} pixels of the rock are not the character's`);
    }
  });

  it('can be swapped by the scene, his rock by default', () => {
    assert.equal(DEFAULT_SEAT, 'seat_boulder');
    assert.equal(seatFor('sit'), 'seat_boulder');
    assert.equal(seatFor('sit', 'seat_none'), 'seat_none');
    assert.equal(seatFor('idle'), null);
    assert.equal(opaque(renderSeat('seat_none')), 0, 'no seat of ours: the scene draws its own');
    const f = renderSprite(roman('male'), 'sit', 0).rgba;
    for (const id of Object.keys(SEATS) as SeatId[]) {
      const both = onSeat(f, id);
      for (let i = 0; i < GRID * GRID; i++) if (f[i * 4 + 3]) assert.equal(both[i * 4 + 3], f[i * 4 + 3]);
    }
  });
});

/** The male read: the owner's two frames of his Trunks reading on a rock (docs/reference/trunks-read-owner-reference.jpg). */
describe('the male read on a seat', () => {
  const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
  /** The pixels of one of his pieces: [frame index, his colour]. */
  const cells = (p: ReadPiece) => {
    const out: [number, string][] = [];
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push([(p.at[1] + j) * GRID + p.at[0] + i, p.colors[row[i]]]);
    });
    return out;
  };

  it('is his two frames over the loop: reading, then the book shut at the chest', () => {
    assert.equal(READ_KEYS.length, frameCount(rigPoseFor('read')));
    assert.deepEqual([...new Set(READ_KEYS)], [0, 1]);
  });

  it('poses the male toward his joints in both of his frames', () => {
    // His hands within 4 px (our hand point lands a little short along the forearm, as in the sit; his hand
    // itself is drawn where he drew it, campfx.ts, so this is where our forearm ends under it); his neck's line
    // and his ankles on the ground under his boots. Our shins are longer than his (15.4 px, his about 11), so the
    // knees stand higher than his, within 6.5 px; the thighs keep their length (his hips are low enough for
    // our legs to reach his ankles).
    for (let f = 0; f < READ_KEYS.length; f++) {
      const j = READ_JOINTS[READ_KEYS[f]];
      const r = buildRig('male', rigPoseFor('read'), f);
      const d = (p: { x: number; y: number }, x: number, y: number) => Math.hypot(p.x * RES - x, p.y * RES - y);
      assert.ok(d(r.handN, j.handN[0], j.handN[1]) <= 4, `read ${f} handN: ${d(r.handN, j.handN[0], j.handN[1]).toFixed(1)} px from his`);
      // (in his second frame his far hand is behind the book, his arm folded tighter than ours folds: only his
      // fingertip beside the book is drawn, our far hand is taken off; seats.test 'draws his book')
      if (READ_KEYS[f] === 0) assert.ok(d(r.handF, j.handF[0], j.handF[1]) <= 4, `read ${f} handF: ${d(r.handF, j.handF[0], j.handF[1]).toFixed(1)} px from his`);
      assert.ok(d(r.kneeN, j.kneeN[0], j.kneeN[1]) <= 6.5, `read ${f} kneeN: ${d(r.kneeN, j.kneeN[0], j.kneeN[1]).toFixed(1)} px from his`);
      assert.ok(d(r.kneeF, j.kneeF[0], j.kneeF[1]) <= 6.5, `read ${f} kneeF: ${d(r.kneeF, j.kneeF[0], j.kneeF[1]).toFixed(1)} px from his`);
      // the neck on the line from the hips to his neck
      const a = Math.atan2(r.neck.x - r.pelvis.x, r.pelvis.y - r.neck.y) - Math.atan2(j.neck[0] / RES - r.pelvis.x, r.pelvis.y - j.neck[1] / RES);
      assert.ok(Math.abs(a) < 0.06, `read ${f}: the neck ${((a * 180) / Math.PI).toFixed(1)} degrees off his`);
      assert.ok(Math.abs(r.ankleN.x * RES - j.ankleN) < 0.01 && Math.abs(r.ankleN.y - ANKLE_N) < 0.01, `read ${f}: the near ankle`);
      assert.ok(Math.abs(r.ankleF.x * RES - j.ankleF) < 0.01 && Math.abs(r.ankleF.y - (ANKLE_N - FAR_LIFT)) < 0.01, `read ${f}: the far ankle`);
    }
  });

  it('sits the male bodies on his rock, the hips where he drew them; the female bodies keep their read', () => {
    const footN = partIndex('footN');
    const footF = partIndex('footF');
    for (const body of ['male', 'bulky'] as const) {
      const idle = renderSprite(roman(body), 'idle', 0).part;
      assert.equal(seatFor('read', undefined, body), 'seat_boulder');
      for (let f = 0; f < READ_KEYS.length; f++) {
        const r = buildRig(body, rigPoseFor('read'), f);
        assert.ok(Math.abs(r.pelvis.y * RES - (READ_SEAT_TOP - 5.4)) < 0.01, `${body} read ${f}: pelvis at ${r.pelvis.y * RES}`);
        const part = renderSprite(roman(body), 'read', f).part;
        assert.ok(Math.abs(lowest(part, footN) - lowest(idle, footN)) <= 1, `${body} read ${f}: near sole on row ${lowest(part, footN)}`);
        assert.ok(Math.abs(lowest(part, footF) - lowest(idle, footF)) <= 1, `${body} read ${f}: far sole on row ${lowest(part, footF)}`);
      }
    }
    // his rock is under the hips: its top in the pelvis's column at most 6 rows above the hips' seat (it stands
    // behind them, as his rock behind his Trunks), never below it
    const rock = renderSeat('seat_boulder');
    const x = Math.round(buildRig('male', rigPoseFor('read'), 0).pelvis.x * RES);
    let top = 0;
    while (!rock[(top * GRID + x) * 4 + 3]) top++;
    assert.ok(top <= READ_SEAT_TOP && top >= READ_SEAT_TOP - 6, `his rock's top at row ${top} under the hips`);
    // the female bodies keep their own read on the camp's seat (until her read, heroine/lyra-v2)
    for (const body of ['female', 'slender'] as const) {
      assert.equal(seatFor('read', undefined, body), null);
      const r = buildRig(body, rigPoseFor('read'), 0);
      assert.ok(Math.hypot(r.handF.x * RES - READ_JOINTS[0].handF[0], r.handF.y * RES - READ_JOINTS[0].handF[1]) > 3, `${body}: her own read`);
    }
  });

  it('draws his book where he drew it, and his hands over it in the Roman skin', () => {
    const look = roman('male');
    look.skin = READ_SKIN_BASE;
    for (let f = 0; f < READ_KEYS.length; f++) {
      const k = READ_KEYS[f];
      const fr = renderSprite(look, 'read', f).rgba;
      const hands = [READ_HAND_N[k], READ_HAND_F[k]].filter((p): p is ReadPiece => !!p);
      const under = new Set(hands.flatMap((p) => cells(p).map(([i]) => i)));
      // every pixel of his book that his hands leave in sight is his
      const book = cells(READ_BOOK[k]).filter(([i]) => !under.has(i));
      const off = book.filter(([i, c]) => hex(fr, i) !== c);
      assert.equal(off.length, 0, `read ${f}: ${off.length} of ${book.length} pixels of his book not his`);
      // his hands: his shape, his Roman fists' tones in the skin he painted the Roman in, his black line; and
      // none of our hand's pixels beside them
      const all = renderSprite(look, 'read', f);
      for (const [p, part] of [
        [READ_HAND_N[k], 'handN'],
        [READ_HAND_F[k], 'handF'],
      ] as const) {
        if (!p) continue;
        const bad = cells(p).filter(([i, c]) => hex(fr, i) !== c);
        assert.equal(bad.length, 0, `read ${f}: ${bad.length} pixels of his ${part} not his`);
        const his = new Set(cells(p).map(([i]) => i));
        let ours = 0;
        for (let i = 0; i < GRID * GRID; i++) if (all.part[i] === partIndex(part) && all.rgba[i * 4 + 3] && !his.has(i)) ours++;
        assert.equal(ours, 0, `read ${f}: ${ours} pixels of our ${part} beside his`);
      }
    }
    // in another skin his hands take it, his line stays black
    const dark = roman('male');
    dark.skin = '#8d5524';
    const fr = renderSprite(dark, 'read', 0).rgba;
    const near = cells(READ_HAND_N[0]!);
    assert.ok(near.filter(([i, c]) => hex(fr, i) !== c).length > near.length / 2, 'his near hand in the darker skin');
    for (const [i, c] of near) if (c === '#000000') assert.equal(hex(fr, i), '#000000');
  });
});
