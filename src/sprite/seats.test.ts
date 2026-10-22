// The sit pose on a seat (rig.ts SIT, seats.ts): the owner's Roman sit is the standard sit for every body,
// and his rock is a prop of its own, drawn apart from the character and swapped by the scene (the owner,
// 2026-10-22: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del
// escenario"): npm test. (No hole and one piece in every sit frame: roman.test.ts, over every pose.)

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { defaultAppearance } from './legacy';
import { GRID, partIndex, RES } from './raster';
import { buildRig, frameCount, rigPoseFor, SIT_SEAT_TOP } from './rig';
import { DEFAULT_SEAT, onSeat, renderSeat, SEATS, seatFor, type SeatId } from './seats';
import type { BodyType, SpriteAppearance } from './types';

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
 * His legs are a fifth longer than ours at this scale: from his hips our legs reach the ground only hanging
 * straight down. So the seat is lower than his (SIT_SEAT_TOP, his pelvis was 5.4 px above row 184): the body
 * from the pelvis up keeps his pose that much lower, the feet stand where he drew them.
 */
const DROP = SIT_SEAT_TOP - 184;
const LEGS = new Set(['kneeN', 'kneeF', 'ankleN', 'ankleF']);
/**
 * How near each joint comes to his (fine px): 2, but our thighs (16 px) are shorter than his (20 px), so the
 * knees sit lower and further back; his frame 4 near arm is longer than ours (his elbow 16 px from the
 * shoulder, ours 12.6), so it cannot reach; and in his frames 3 and 4 the far elbow sits lower on a straighter
 * arm than our arm's bend puts it.
 */
const tolerance = (k: number, j: string) => (j.startsWith('knee') ? 12 : k === 3 && /N$/.test(j) && /^(elbow|wrist|hand)/.test(j) ? 8 : k >= 2 && j === 'elbowF' ? 4 : 2);

describe('the sit on a seat', () => {
  it('poses the male toward his joints in each of his four frames', () => {
    for (let k = 0; k < 4; k++) {
      const r = buildRig('male', rigPoseFor('sit'), k) as unknown as Record<string, { x: number; y: number }>;
      for (const [j, [x, y]] of Object.entries(HIS[k])) {
        const d = Math.hypot(r[j].x * RES - x, r[j].y * RES - (y + (LEGS.has(j) ? 0 : DROP)));
        assert.ok(d <= tolerance(k, j), `frame ${k + 1} ${j}: ${d.toFixed(1)} px from his`);
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
    // his rock is under the hips: its top in the pelvis's column is a few rows above the seat's top
    const rock = renderSeat('seat_boulder');
    const x = Math.round(buildRig('male', rigPoseFor('sit'), 0).pelvis.x * RES);
    let top = 0;
    while (!rock[(top * GRID + x) * 4 + 3]) top++;
    assert.ok(top <= SIT_SEAT_TOP && top >= SIT_SEAT_TOP - 6, `his rock's top at row ${top} under the hips`);
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
