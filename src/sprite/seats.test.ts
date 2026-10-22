// Seats (seats.ts): the owner's rock is a prop of its own, drawn apart from the character and swapped by
// the scene (the owner, 2026-10-22: "puedes usar la piedra tambien como objeto pero ese objeto cambiara
// dependiendo del escenario"), and every body reading sits on it: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { LYRA_READ } from './items/lyraReadArt';
import type { OwnerPiece } from './ownerFrames';
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

/** A frame mirrored like a party member facing left in the camp (campArt.ts gradedMember, gradedSeat). */
function mirror(src: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) out.set(src.subarray((y * GRID + GRID - 1 - x) * 4, (y * GRID + GRID - x) * 4), (y * GRID + x) * 4);
  return out;
}

/** His pixels of some pieces where they lie in the frame: fine x, y, his colour and whether it is his line. */
function cellsOf(pieces: OwnerPiece[]): { x: number; y: number; hex: string; line: boolean }[] {
  return pieces.flatMap((p) =>
    p.rows.flatMap((row, j) =>
      [...row].flatMap((c, i) => (c === '.' ? [] : [{ x: p.at[0] - p.pivot[0] + i, y: p.at[1] - p.pivot[1] + j, hex: p.colors[c], line: p.kinds[c] === 'line' }])),
    ),
  );
}

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) =>
  '#' + [0, 1, 2].map((c) => rgba[(y * GRID + x) * 4 + c].toString(16).padStart(2, '0')).join('');

// The owner, 2026-10-22, of Lyra reading in the camp: "tiene cortada la pierna corrigelo". His legs were cut
// in the lift (her far shin's line and her far foot went with the next panel of his picture).
describe("Lyra's legs on his rock", () => {
  const legs = (k: number) => LYRA_READ[k].filter((p) => p.owner === 'feet');

  it('show every pixel of his legs over the seat, facing right and mirrored as in the camp', () => {
    for (const k of [0, 1, 2]) {
      const f = renderSprite(lyra, 'read', READ_KEYS.indexOf(k as 0 | 1 | 2)).rgba;
      const cells = cellsOf(legs(k));
      assert.ok(cells.length > 500, `key ${k}: his legs (${cells.length} pixels)`);
      for (const flip of [false, true]) {
        // the camp lays the seat first, then the member over it, each mirrored on its own
        const seat = flip ? mirror(renderSeat('seat_rock')) : renderSeat('seat_rock');
        const her = flip ? mirror(f) : f;
        const laid = seat.slice();
        for (let i = 0; i < GRID * GRID; i++) if (her[i * 4 + 3]) laid.set(her.subarray(i * 4, i * 4 + 4), i * 4);
        let hidden = 0;
        for (const c of cells) {
          const x = flip ? GRID - 1 - c.x : c.x;
          if (!laid[(c.y * GRID + x) * 4 + 3] || hexAt(laid, x, c.y) !== c.hex) hidden++;
        }
        assert.equal(hidden, 0, `key ${k}${flip ? ' mirrored' : ''}: ${hidden} pixels of his legs not shown`);
      }
    }
  });

  it('are whole: his line closes her shins and boots on every row, and the far toe reaches where he drew it', () => {
    for (const k of [0, 1, 2]) {
      const low = cellsOf(legs(k).filter((p) => /^(shin|foot)/.test(p.part)));
      const rows = new Map<number, (typeof low)[number]>();
      for (const c of low) if (!rows.has(c.y) || c.x > rows.get(c.y)!.x) rows.set(c.y, c);
      // (his line, or where the JPEG read it a shade lighter, his darkest leather: every channel below 56)
      const dark = (h: string) => [1, 3, 5].every((i) => parseInt(h.slice(i, i + 2), 16) < 56);
      for (const [y, c] of rows) assert.ok(c.line || dark(c.hex), `key ${k}: row ${y} of her legs ends at x ${c.x} in ${c.hex}, not his line`);
      // her soles stand on the ground row, and nothing of the earth round her boots is hers
      assert.equal(Math.max(...low.map((c) => c.y)), 215, `key ${k}: her soles`);
    }
    // his far foot points forward to his columns 74 and 77 (panel 1's), fine x 148 and 151
    const toe = (k: number) => Math.max(...cellsOf(legs(k).filter((p) => p.part === 'footF')).map((c) => c.x));
    assert.equal(toe(0), 148);
    assert.equal(toe(1), 151);
  });
});

// The owner, 2026-10-22, of the same camp: "yo aun veo el arma cortada". The sword at her hip runs off the left
// edge of his first frame, and the lift had closed it there in a straight black line down a column.
describe("Lyra's sword at her hip", () => {
  it('ends in a tip closed in his line, not cut along a column', () => {
    for (const k of [0, 1, 2]) {
      const cells = cellsOf(LYRA_READ[k].filter((p) => p.owner === 'held'));
      const at = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
      const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      // his blade: its blues (the steel and gold of the hilt are not)
      const blade = cells.filter((c) => !c.line && rgb(c.hex)[2] > rgb(c.hex)[0] + 25);
      assert.ok(blade.length > 30, `key ${k}: his blade (${blade.length} pixels)`);
      // it points back and down from her hip: its far end is its leftmost column (the camp's rightmost)
      const end = Math.min(...blade.map((c) => c.x));
      const tip = blade.filter((c) => c.x === end);
      assert.equal(tip.length, 1, `key ${k}: the blade's last column holds ${tip.length} pixels, not a tip`);
      // closed in his line past the tip, above and below it
      const [t] = tip;
      for (const [dx, dy] of [[-1, 0], [0, -1], [0, 1]]) assert.ok(at.get(`${t.x + dx},${t.y + dy}`)?.line, `key ${k}: the tip at ${t.x},${t.y} open at ${dx},${dy}`);
      // and no straight cut: his line past the blade's end runs at most two pixels down any one column
      let run = 0;
      for (let y = t.y - 6; y <= t.y + 6; y++) {
        let n = 0;
        while (at.get(`${end - 1},${y + n}`)?.line) n++;
        run = Math.max(run, n);
      }
      assert.ok(run <= 2, `key ${k}: a straight line of ${run} pixels down x ${end - 1}`);
      // drawn so in the game, facing right and mirrored as in the camp
      const f = renderSprite(lyra, 'read', READ_KEYS.indexOf(k as 0 | 1 | 2)).rgba;
      const m = mirror(f);
      const past = at.get(`${t.x - 1},${t.y}`)!;
      assert.equal(hexAt(f, t.x, t.y), t.hex, `key ${k}: the tip`);
      assert.equal(hexAt(m, GRID - 1 - t.x, t.y), t.hex, `key ${k}: the tip mirrored`);
      assert.ok(m[(t.y * GRID + GRID - t.x) * 4 + 3] > 0 && hexAt(m, GRID - t.x, t.y) === past.hex, `key ${k}: his line past the tip, mirrored`);
    }
  });
});
