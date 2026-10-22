// Seats (seats.ts): the owner's rock is a prop of its own, drawn apart from the character and swapped by
// the scene (the owner, 2026-10-22: "puedes usar la piedra tambien como objeto pero ese objeto cambiara
// dependiendo del escenario"), and every body reading sits on it: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { GRID, RES } from './raster';
import { ANKLE_N, ankleLiftOf, BODY_PARAMS, drawRig, FAR_LIFT, READ_KEYS, READ_SEAT_TOP } from './rig';
import { DEFAULT_SEAT, onSeat, renderSeat, SEATS, seatFor, type SeatId } from './seats';
import { SEAT_ROCK_TOP } from './seatRockArt';
import type { BodyType, SpriteAppearance } from './types';

const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
const opaque = (rgba: Uint8ClampedArray) => {
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3]) n++;
  return n;
};

describe('seats', () => {
  it("are drawn apart from the character: the read pose's sprite has no rock in it", () => {
    const rock = renderSeat('seat_rock');
    assert.ok(opaque(rock) > 1000, 'his rock');
    for (const k of [0, 1, 2]) {
      const f = renderSprite(lyra, 'read', READ_KEYS.indexOf(k as 0 | 1 | 2)).rgba;
      // the rock's front face, below her lining, is empty in her sprite
      let bare = 0;
      for (let i = 0; i < GRID * GRID; i++) if (rock[i * 4 + 3] && !f[i * 4 + 3]) bare++;
      assert.ok(bare > 600, `key ${k}: ${bare} pixels of the rock are not hers`);
      // and the character's frame is the same whatever the seat (a seat is not part of the appearance)
      assert.deepEqual(renderSprite(lyra, 'read', 0).rgba, renderSprite(lyra, 'read', 0).rgba);
    }
  });

  it('can be swapped by the scene, his rock by default', () => {
    assert.equal(DEFAULT_SEAT, 'seat_rock');
    assert.equal(seatFor('read'), 'seat_rock');
    assert.equal(seatFor('read', 'seat_none'), 'seat_none');
    assert.equal(opaque(renderSeat('seat_none')), 0, 'no seat of ours: the scene draws its own');
    // not seated, no seat; 'sit' keeps the camp's log until the owner's sit picture
    assert.equal(seatFor('idle'), null);
    assert.equal(seatFor('sit'), null);
    // laid under a character: the character over it, the seat where she is not
    const f = renderSprite(lyra, 'read', 0).rgba;
    for (const id of Object.keys(SEATS) as SeatId[]) {
      const both = onSeat(f, id);
      const seat = renderSeat(id);
      for (let i = 0; i < GRID * GRID; i++) {
        const top = f[i * 4 + 3] ? f : seat;
        for (let c = 0; c < 4; c++) assert.equal(both[i * 4 + c], top[i * 4 + c]);
      }
    }
  });

  it('have their top where the seated poses sit, under the hips of every body', () => {
    assert.equal(SEAT_ROCK_TOP, READ_SEAT_TOP);
    for (const id of Object.keys(SEATS) as SeatId[]) assert.equal(SEATS[id].top, READ_SEAT_TOP, id);
    const rock = renderSeat('seat_rock');
    const on = (x: number, y: number) => rock[(y * GRID + x) * 4 + 3] > 0;
    for (const body of ['male', 'female', 'bulky', 'slender'] as BodyType[]) {
      for (let f = 0; f < READ_KEYS.length; f++) {
        const r = drawRig(body, 'read', f);
        // the hips rest on its top: the pelvis that body's own height above it
        const above = READ_SEAT_TOP - r.pelvis.y * RES;
        assert.ok(above > 3.5 && above < 6, `${body} ${f}: the pelvis ${above} px above the seat`);
        const px = Math.floor(r.pelvis.x * RES);
        assert.ok(on(px, READ_SEAT_TOP + 2), `${body} ${f}: the rock under the hips`);
        // both feet on the body's own ground
        const bp = BODY_PARAMS[body];
        const ground = (s: 'N' | 'F') => (bp.fit ? bp.fit[`ankle${s}`].y : ANKLE_N - (s === 'F' ? FAR_LIFT : 0) + ankleLiftOf(bp, s));
        // On the ground, or, on a body whose legs are too short for his rock (the male and bulky ones),
        // hanging off it: the knee forward of the hip and the shin straight down from it.
        for (const s of ['N', 'F'] as const) {
          const up = ground(s) - r[`ankle${s}`].y;
          assert.ok(up > -0.01, `${body} ${f}: the ${s} foot not under the ground`);
          if (up > 0.01) {
            assert.ok(!bp.fit, `${body} ${f}: the ${s} foot hangs ${up * RES} px`);
            assert.ok(Math.abs(r[`ankle${s}`].x - r[`knee${s}`].x) < 0.01 && r[`knee${s}`].x > r[`hip${s}`].x + 4, `${body} ${f}: the ${s} shin hangs from a knee forward`);
          }
        }
      }
    }
  });

  it("seat every body the same way, toward the owner's joints: hips, feet and both hands on the book", () => {
    for (const body of ['male', 'female', 'bulky', 'slender'] as BodyType[]) {
      const look: SpriteAppearance = { ...lyra, body, faceShape: 'tapered', slots: {} };
      for (const k of [0, 1, 2]) {
        const f = READ_KEYS.indexOf(k as 0 | 1 | 2);
        const r = drawRig(body, 'read', f);
        // the hands meet at the book before the chest, the far one up at the page in the third key
        assert.ok(r.handN.x * RES > 110 && r.handN.x * RES < 125, `${body} ${k}: near hand x ${r.handN.x * RES}`);
        assert.ok(r.handF.x * RES > r.handN.x * RES, `${body} ${k}: the far hand at the far end`);
        if (k === 2) assert.ok(r.handF.y * RES < 158, `${body}: the far hand up at the page (${r.handF.y * RES})`);
        // and it renders
        assert.ok(opaque(renderSprite(look, 'read', f).rgba) > 1000, `${body} ${k}`);
      }
    }
  });
});
