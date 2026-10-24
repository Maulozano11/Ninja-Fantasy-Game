// Seats (seats.ts): the owner's rock is a prop of its own, drawn apart from the character and swapped by
// the scene (the owner, 2026-10-22: "puedes usar la piedra tambien como objeto pero ese objeto cambiara
// dependiendo del escenario"); his two rocks are the read seat and the sit seat ("usar las dos una es para leer
// y la otra cuando conversa sentada asi para todos los personajes tendran animaciones sentados"): npm test.
// The male bodies sit as his Roman does and read as his Trunks does (the second half of this file).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { defaultAppearance } from './legacy';
import { LYRA_READ } from './items/lyraReadArt';
import { LYRA_SIT } from './items/lyraSitArt';
import type { OwnerPiece } from './ownerFrames';
import { GRID, partIndex, RES } from './raster';
import { stretchPiece } from './painted';
import { SKIN_THIGH_F, SKIN_THIGH_N } from './maleSkinArt';
import { ANKLE_N, ankleLiftOf, BODY_PARAMS, buildRig, drawRig, FAR_LIFT, frameCount, READ_JOINTS, READ_KEYS, READ_MALE_KEYS, READ_MALE_SEAT_TOP, READ_SEAT_TOP, rigPoseFor, SIT_KEYS, SIT_SEAT_TOP } from './rig';
import { READ_BOOK, READ_HAND_F, READ_HAND_N, READ_SKIN_BASE, type ReadPiece } from './maleReadArt';
import { DEFAULT_SEAT, onSeat, renderSeat, SEATS, seatFor, type SeatId } from './seats';
import { SEAT_ROCK_TOP } from './seatRockArt';
import { SEAT_ROCK_SIT_TOP } from './seatRockSitArt';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
const opaque = (rgba: Uint8ClampedArray) => {
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3]) n++;
  return n;
};

describe('seats', () => {
  it("are drawn apart from the character: the read and sit poses' sprites have no rock in them", () => {
    for (const [pose, k, frame] of [...[0, 1, 2].map((k) => ['read', k, READ_KEYS.indexOf(k as 0 | 1 | 2)] as const), ['sit', 0, 0] as const]) {
      const rock = renderSeat(seatFor(pose)!);
      assert.ok(opaque(rock) > 1000, `his ${pose} rock`);
      const f = renderSprite(lyra, pose, frame).rgba;
      // the rock's front face, below her lining, is empty in her sprite
      let bare = 0;
      for (let i = 0; i < GRID * GRID; i++) if (rock[i * 4 + 3] && !f[i * 4 + 3]) bare++;
      assert.ok(bare > 600, `${pose} key ${k}: ${bare} pixels of the rock are not hers`);
      // and the character's frame is the same whatever the seat (a seat is not part of the appearance)
      assert.deepEqual(renderSprite(lyra, 'read', 0).rgba, renderSprite(lyra, 'read', 0).rgba);
    }
  });

  it('can be swapped by the scene, his read rock for reading and his sit rock for sitting by default', () => {
    assert.equal(DEFAULT_SEAT, 'seat_rock');
    assert.equal(seatFor('read'), 'seat_rock');
    assert.equal(seatFor('read', 'seat_none'), 'seat_none');
    // sitting to talk, on the rock of his sit picture
    assert.equal(seatFor('sit'), 'seat_rock_sit');
    assert.equal(seatFor('sit', 'seat_rock'), 'seat_rock');
    assert.equal(opaque(renderSeat('seat_none')), 0, 'no seat of ours: the scene draws its own');
    // not seated, no seat
    assert.equal(seatFor('idle'), null);
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
    assert.equal(SEAT_ROCK_SIT_TOP, READ_SEAT_TOP);
    for (const id of Object.keys(SEATS) as SeatId[]) assert.equal(SEATS[id].top, READ_SEAT_TOP, id);
    const rocks = { read: renderSeat(seatFor('read')!), sit: renderSeat(seatFor('sit')!) };
    const on = (pose: 'read' | 'sit', x: number, y: number) => rocks[pose][(y * GRID + x) * 4 + 3] > 0;
    // (his Lyra's read and sit: the fitted female bodies; the male bodies sit as his Roman and read as his
    // Trunks, below)
    for (const body of ['female'] as BodyType[]) {
      const sits = SIT_KEYS.map((_, f) => ['sit', f] as const);
      for (const [pose, f] of [...READ_KEYS.map((_, f) => ['read', f] as const), ...sits]) {
        const r = drawRig(body, pose, f);
        // the hips rest on its top: the pelvis that body's own height above it
        const above = READ_SEAT_TOP - r.pelvis.y * RES;
        assert.ok(above > 3.5 && above < 6, `${body} ${pose} ${f}: the pelvis ${above} px above the seat`);
        const px = Math.floor(r.pelvis.x * RES);
        assert.ok(on(pose, px, READ_SEAT_TOP + 2), `${body} ${pose} ${f}: the rock under the hips`);
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

  it("seat the female bodies toward the owner's joints: hips, feet and both hands on the book", () => {
    for (const body of ['female'] as BodyType[]) {
      const look: SpriteAppearance = { ...lyra, body, faceShape: 'tapered', slots: {} };
      for (const k of [0, 1, 2]) {
        const f = READ_KEYS.indexOf(k as 0 | 1 | 2);
        const r = drawRig(body, 'read', f);
        // the hands meet at the book before the chest, the far one up at the page in the third key
        assert.ok(r.handN.x * RES > 110 && r.handN.x * RES < 125, `${body} ${k}: near hand x ${r.handN.x * RES}`);
        assert.ok(r.handF.x * RES > r.handN.x * RES, `${body} ${k}: the far hand at the far end`);
        // (up at the page: well above where it holds the cover reading; a fitted body that is not his Lyra holds
        // the book from its own neck, rig.ts PoseAt.hisNeck, so the rows depend on the body)
        const reading = drawRig(body, 'read', READ_KEYS.indexOf(1)).handF.y * RES;
        if (k === 2) assert.ok(r.handF.y * RES < reading - 8, `${body}: the far hand up at the page (${r.handF.y * RES}, reading ${reading})`);
        // and it renders
        assert.ok(opaque(renderSprite(look, 'read', f).rgba) > 1000, `${body} ${k}`);
      }
      // sitting (the fitted female bodies, as his Lyra): the far hand reaching out forward past the knees,
      // open; the near one by the hip
      for (let f = 0; f < (BODY_PARAMS[body].fit ? SIT_KEYS.length : 0); f++) {
        const r = drawRig(body, 'sit', f);
        assert.ok(r.handF.x * RES > 138 && r.shapeF === 'open', `${body} sit ${f}: the far hand out at ${r.handF.x * RES}`);
        assert.ok(r.handN.x * RES > 100 && r.handN.x * RES < 116 && r.handN.y * RES > 165, `${body} sit ${f}: the near hand by the hip`);
        assert.ok(opaque(renderSprite(look, 'sit', f).rgba) > 1000, `${body} sit ${f}`);
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

/** His painted frames of her on the seat: the read pose's three keys and his one sit frame. */
const SEATED: { name: string; pose: SpritePose; frame: number; pieces: OwnerPiece[] }[] = [
  ...[0, 1, 2].map((k) => ({ name: `read key ${k}`, pose: 'read' as SpritePose, frame: READ_KEYS.indexOf(k as 0 | 1 | 2), pieces: LYRA_READ[k] })),
  { name: 'sit', pose: 'sit', frame: 0, pieces: LYRA_SIT },
];

// The owner, 2026-10-22, of Lyra reading in the camp: "tiene cortada la pierna corrigelo". His legs were cut
// in the lift (her far shin's line and her far foot went with the next panel of his picture).
describe("Lyra's legs on his rock", () => {
  const legs = (pieces: OwnerPiece[]) => pieces.filter((p) => p.owner === 'feet');

  it('show every pixel of his legs over the seat, facing right and mirrored as in the camp', () => {
    for (const { name, pose, frame, pieces } of SEATED) {
      const f = renderSprite(lyra, pose, frame).rgba;
      const cells = cellsOf(legs(pieces));
      assert.ok(cells.length > 500, `${name}: his legs (${cells.length} pixels)`);
      for (const flip of [false, true]) {
        // the camp lays the seat first, then the member over it, each mirrored on its own
        const seat = flip ? mirror(renderSeat(seatFor(pose)!)) : renderSeat(seatFor(pose)!);
        const her = flip ? mirror(f) : f;
        const laid = seat.slice();
        for (let i = 0; i < GRID * GRID; i++) if (her[i * 4 + 3]) laid.set(her.subarray(i * 4, i * 4 + 4), i * 4);
        let hidden = 0;
        for (const c of cells) {
          const x = flip ? GRID - 1 - c.x : c.x;
          if (!laid[(c.y * GRID + x) * 4 + 3] || hexAt(laid, x, c.y) !== c.hex) hidden++;
        }
        assert.equal(hidden, 0, `${name}${flip ? ' mirrored' : ''}: ${hidden} pixels of his legs not shown`);
      }
    }
  });

  it('are whole: his line closes her shins and boots on every row, and the far toe reaches where he drew it', () => {
    for (const { name, pieces } of SEATED) {
      const low = cellsOf(legs(pieces).filter((p) => /^(shin|foot)/.test(p.part)));
      const rows = new Map<number, (typeof low)[number]>();
      for (const c of low) if (!rows.has(c.y) || c.x > rows.get(c.y)!.x) rows.set(c.y, c);
      // (his line, or where the JPEG read it a shade lighter, his darkest leather: every channel below 56)
      const dark = (h: string) => [1, 3, 5].every((i) => parseInt(h.slice(i, i + 2), 16) < 56);
      for (const [y, c] of rows) assert.ok(c.line || dark(c.hex), `${name}: row ${y} of her legs ends at x ${c.x} in ${c.hex}, not his line`);
      // her soles stand on the ground row, and nothing of the earth round her boots is hers
      assert.equal(Math.max(...low.map((c) => c.y)), 215, `${name}: her soles`);
      // and no boot is cut along a row (where the earth round them is the seat's): his line closes the
      // columns at their bottom, but for a lone pixel where he drew the boot's heel straight on the earth
      const cols = new Map<number, (typeof low)[number]>();
      for (const c of low) if (!cols.has(c.x) || c.y > cols.get(c.x)!.y) cols.set(c.x, c);
      const open = [...cols].filter(([, c]) => !c.line && !dark(c.hex)).map(([x]) => x);
      for (const x of open) assert.ok(!open.includes(x + 1), `${name}: columns ${x} and ${x + 1} of her boots end off his line`);
    }
    // his far foot points forward to his columns 74 and 77 of the read frames (panel 1's), fine x 148 and 151,
    // and to his column 92 sitting, fine x 151
    const toe = (pieces: OwnerPiece[]) => Math.max(...cellsOf(legs(pieces).filter((p) => p.part === 'footF')).map((c) => c.x));
    assert.equal(toe(LYRA_READ[0]), 148);
    assert.equal(toe(LYRA_READ[1]), 151);
    assert.equal(toe(LYRA_SIT), 151);
  });
});

// The owner, 2026-10-22, of the same camp: "yo aun veo el arma cortada". The sword at her hip runs off the left
// edge of his first frame, and the lift had closed it there in a straight black line down a column. Then, of
// "Pasando pagina" next to his sit picture: "mira la referencia la punta es un poco mas larga y afilada": every
// read frame's blade ends in the tip of his sit picture's blade.
describe("Lyra's sword at her hip", () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  /** His blade: its blues (the steel and gold of the hilt are not). */
  const bladeOf = (pieces: OwnerPiece[]) => cellsOf(pieces.filter((p) => p.owner === 'held')).filter((c) => !c.line && rgb(c.hex)[2] > rgb(c.hex)[0] + 25);
  /** How many pixels of blade each column holds, from its point (its leftmost column) back. */
  const taper = (pieces: OwnerPiece[], n: number) => {
    const blade = bladeOf(pieces);
    const end = Math.min(...blade.map((c) => c.x));
    return Array.from({ length: n }, (_, i) => blade.filter((c) => c.x === end + i).length);
  };

  it('ends in a tip closed in his line, not cut along a column', () => {
    for (const { name, pose, frame, pieces } of SEATED) {
      const cells = cellsOf(pieces.filter((p) => p.owner === 'held'));
      const at = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
      const blade = bladeOf(pieces);
      assert.ok(blade.length > 30, `${name}: his blade (${blade.length} pixels)`);
      // it points back and down from her hip: its far end is its leftmost column (the camp's rightmost)
      const end = Math.min(...blade.map((c) => c.x));
      const tip = blade.filter((c) => c.x === end);
      assert.equal(tip.length, 1, `${name}: the blade's last column holds ${tip.length} pixels, not a tip`);
      // closed in his line past the tip, above and below it
      const [t] = tip;
      for (const [dx, dy] of [[-1, 0], [0, -1], [0, 1]]) assert.ok(at.get(`${t.x + dx},${t.y + dy}`)?.line, `${name}: the tip at ${t.x},${t.y} open at ${dx},${dy}`);
      // and no straight cut: his line past the blade's end runs at most two pixels down any one column
      let run = 0;
      for (let y = t.y - 6; y <= t.y + 6; y++) {
        let n = 0;
        while (at.get(`${end - 1},${y + n}`)?.line) n++;
        run = Math.max(run, n);
      }
      assert.ok(run <= 2, `${name}: a straight line of ${run} pixels down x ${end - 1}`);
      // drawn so in the game, facing right and mirrored as in the camp
      const f = renderSprite(lyra, pose, frame).rgba;
      const m = mirror(f);
      const past = at.get(`${t.x - 1},${t.y}`)!;
      assert.equal(hexAt(f, t.x, t.y), t.hex, `${name}: the tip`);
      assert.equal(hexAt(m, GRID - 1 - t.x, t.y), t.hex, `${name}: the tip mirrored`);
      assert.ok(m[(t.y * GRID + GRID - t.x) * 4 + 3] > 0 && hexAt(m, GRID - t.x, t.y) === past.hex, `${name}: his line past the tip, mirrored`);
    }
  });

  it('ends sharp, as his sit picture draws it: one pixel, then two over three columns, then the full blade', () => {
    // his sit picture's blade narrows from three pixels a column to two, then to its one-pixel point
    assert.deepEqual(taper(LYRA_SIT, 5), [1, 2, 2, 2, 3]);
    // and every read frame's blade ends in his tip (not his short tip of the read picture: one pixel, then three)
    for (const k of [0, 1, 2]) assert.deepEqual(taper(LYRA_READ[k], 5), [1, 2, 2, 2, 3], `read key ${k}`);
  });

  // The owner, 2026-10-22, of the read blade next to his sit picture's: "la espada nuestra se ve mas corta que en
  // la referencia arregla esto alargandola y poniendola pixel a pixel con mi referencia".
  it("is his sit picture's blade in every read frame, as long, pixel for pixel, whole in the game", () => {
    /** A blade: its blues left of the guard (fine x below x1) and his line round them, {x,y: hex}. */
    const bladeCells = (pieces: OwnerPiece[], x1: number) => {
      const cells = cellsOf(pieces.filter((p) => p.owner === 'held'));
      const at = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
      const blues = cells.filter((c) => !c.line && c.x < x1 && rgb(c.hex)[2] > rgb(c.hex)[0] + 15);
      const out = new Map(blues.map((c) => [`${c.x},${c.y}`, c.hex]));
      for (const b of blues)
        for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
          const c = at.get(`${b.x + dx},${b.y + dy}`);
          if (c?.line) out.set(`${c.x},${c.y}`, c.hex);
        }
      return out;
    };
    // his sit blade (left of his guard, his column 29: our 88), in the read frames one column right and one
    // row up (where his sit guard lies on theirs)
    const his = new Map([...bladeCells(LYRA_SIT, 88)].map(([k, h]) => {
      const [x, y] = k.split(',').map(Number);
      return [`${x + 1},${y - 1}`, h];
    }));
    const span = (m: Map<string, string>) => {
      const xs = [...m.keys()].map((k) => +k.split(',')[0]);
      return Math.max(...xs) - Math.min(...xs) + 1;
    };
    assert.ok(span(his) >= 24, `his sit blade is ${span(his)} columns long`);
    for (const k of [0, 1, 2]) {
      const ours = bladeCells(LYRA_READ[k], 89);
      // as long as his, every pixel his, in his colour, and none more
      assert.equal(span(ours), span(his), `read key ${k}: the blade's length`);
      for (const [xy, h] of his) assert.equal(ours.get(xy), h, `read key ${k}: his blade's pixel ${xy}`);
      for (const xy of ours.keys()) assert.ok(his.has(xy), `read key ${k}: ${xy} is not his blade`);
      // all of it drawn in the game, facing right and mirrored as in the camp (inside the frame)
      const f = renderSprite(lyra, 'read', READ_KEYS.indexOf(k as 0 | 1 | 2)).rgba;
      const m = mirror(f);
      for (const [xy, h] of ours) {
        const [x, y] = xy.split(',').map(Number);
        assert.ok(x > 0 && x < GRID - 1, `read key ${k}: ${xy} at the frame's edge`);
        assert.equal(hexAt(f, x, y), h, `read key ${k}: ${xy} in the game`);
        assert.equal(hexAt(m, GRID - 1 - x, y), h, `read key ${k}: ${xy} mirrored`);
      }
    }
  });
});

// The male bodies: his Roman sit (docs/reference/roman-sit-owner-reference.jpg) and his Trunks read
// (docs/reference/trunks-read-owner-reference.jpg), from body/male-skin-face.
const MEN: BodyType[] = ['male', 'bulky'];
const roman = (body: BodyType): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
  delete l.slots.top;
  delete l.slots.bottom;
  return l;
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

describe('the male sit on a seat (his Roman)', () => {
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
    for (const body of MEN) {
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
    const rock = renderSeat(seatFor('sit')!);
    const x = Math.round(buildRig('male', rigPoseFor('sit'), 0).pelvis.x * RES);
    let top = 0;
    while (!rock[(top * GRID + x) * 4 + 3]) top++;
    assert.ok(top <= SIT_SEAT_TOP + 2 && top >= SIT_SEAT_TOP - 6, `his rock's top at row ${top} under the hips`);
  });

  it('is drawn apart from the character: the sit sprite has no rock in it', () => {
    const rock = renderSeat(seatFor('sit')!);
    assert.ok(opaque(rock) > 900, 'his rock');
    for (const body of MEN) {
      const f = renderSprite(roman(body), 'sit', 0).rgba;
      let bare = 0;
      for (let i = 0; i < GRID * GRID; i++) if (rock[i * 4 + 3] && !f[i * 4 + 3]) bare++;
      assert.ok(bare > 300, `${body}: ${bare} pixels of the rock are not the character's`);
    }
  });
});

/**
 * The male read: the owner's Trunks reading on a rock (docs/reference/trunks-read-owner-reference.jpg), his frame 2
 * (the book raised in one hand toward his face) in every frame, his decision of 2026-10-23.
 */
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

  it('holds his frame 2 over the whole loop: the book raised in one hand, the other forearm across', () => {
    assert.equal(READ_MALE_KEYS.length, frameCount(rigPoseFor('read')));
    assert.deepEqual([...new Set(READ_MALE_KEYS)], [1]);
    // held still: every frame of the loop is the same picture, on both male bodies
    for (const body of ['male', 'bulky'] as const) {
      const first = renderSprite(roman(body), 'read', 0).rgba;
      for (let f = 1; f < READ_MALE_KEYS.length; f++) assert.deepEqual(renderSprite(roman(body), 'read', f).rgba, first, `${body} read ${f}`);
    }
  });

  it('poses the male toward his joints in his frame', () => {
    // His near hand within 4 px (our hand point lands a little short along the forearm, as in the sit; his hand
    // itself is drawn where he drew it, campfx.ts, so this is where our forearm ends under it); his neck's line
    // and his ankles on the ground under his boots. Our shins are longer than his (15.4 px, his about 11), so the
    // knees stand higher than his, within 6.5 px; the thighs keep their length (his hips are low enough for
    // our legs to reach his ankles).
    for (let f = 0; f < READ_MALE_KEYS.length; f++) {
      const j = READ_JOINTS[READ_MALE_KEYS[f]];
      const r = buildRig('male', rigPoseFor('read'), f);
      const d = (p: { x: number; y: number }, x: number, y: number) => Math.hypot(p.x * RES - x, p.y * RES - y);
      assert.ok(d(r.handN, j.handN[0], j.handN[1]) <= 4, `read ${f} handN: ${d(r.handN, j.handN[0], j.handN[1]).toFixed(1)} px from his`);
      // (his far hand is behind the book, his arm folded tighter than ours folds: only his fingertip beside the
      // book is drawn, our far hand is taken off; 'draws his book' below)
      assert.ok(d(r.kneeN, j.kneeN[0], j.kneeN[1]) <= 6.5, `read ${f} kneeN: ${d(r.kneeN, j.kneeN[0], j.kneeN[1]).toFixed(1)} px from his`);
      assert.ok(d(r.kneeF, j.kneeF[0], j.kneeF[1]) <= 6.5, `read ${f} kneeF: ${d(r.kneeF, j.kneeF[0], j.kneeF[1]).toFixed(1)} px from his`);
      // the neck on the line from the hips to his neck
      const a = Math.atan2(r.neck.x - r.pelvis.x, r.pelvis.y - r.neck.y) - Math.atan2(j.neck[0] / RES - r.pelvis.x, r.pelvis.y - j.neck[1] / RES);
      assert.ok(Math.abs(a) < 0.06, `read ${f}: the neck ${((a * 180) / Math.PI).toFixed(1)} degrees off his`);
      assert.ok(Math.abs(r.ankleN.x * RES - j.ankleN) < 0.01 && Math.abs(r.ankleN.y - ANKLE_N) < 0.01, `read ${f}: the near ankle`);
      assert.ok(Math.abs(r.ankleF.x * RES - j.ankleF) < 0.01 && Math.abs(r.ankleF.y - (ANKLE_N - FAR_LIFT)) < 0.01, `read ${f}: the far ankle`);
    }
  });

  it('sits the male bodies on his read rock, the hips where he drew them; the female bodies read as his Lyra', () => {
    const footN = partIndex('footN');
    const footF = partIndex('footF');
    for (const body of ['male', 'bulky'] as const) {
      const idle = renderSprite(roman(body), 'idle', 0).part;
      assert.equal(seatFor('read'), 'seat_rock');
      for (let f = 0; f < READ_MALE_KEYS.length; f++) {
        const r = buildRig(body, rigPoseFor('read'), f);
        assert.ok(Math.abs(r.pelvis.y * RES - (READ_MALE_SEAT_TOP - 5.4)) < 0.01, `${body} read ${f}: pelvis at ${r.pelvis.y * RES}`);
        const part = renderSprite(roman(body), 'read', f).part;
        assert.ok(Math.abs(lowest(part, footN) - lowest(idle, footN)) <= 1, `${body} read ${f}: near sole on row ${lowest(part, footN)}`);
        assert.ok(Math.abs(lowest(part, footF) - lowest(idle, footF)) <= 1, `${body} read ${f}: far sole on row ${lowest(part, footF)}`);
      }
    }
    // his rock is under the hips: its top in the pelvis's column at most 6 rows above the hips' seat (it stands
    // behind them, as his rock behind his Trunks), never below it
    const rock = renderSeat(seatFor('read')!);
    const x = Math.round(buildRig('male', rigPoseFor('read'), 0).pelvis.x * RES);
    let top = 0;
    while (!rock[(top * GRID + x) * 4 + 3]) top++;
    assert.ok(top <= READ_MALE_SEAT_TOP && top >= READ_MALE_SEAT_TOP - 6, `his rock's top at row ${top} under the hips`);
    // the female bodies read as his Lyra does (her own seat and hands, on the same rock): not on the male read's
    // hips (her hands, held from her own neck as his Lyra holds them, can come near his)
    for (const body of ['female'] as const) {
      const r = buildRig(body, rigPoseFor('read'), 0);
      assert.ok(Math.abs(r.pelvis.y * RES - (READ_MALE_SEAT_TOP - 5.4)) > 2, `${body}: her own read`);
    }
  });

  it('draws his book where he drew it, and his hands over it in the Roman skin', () => {
    const look = roman('male');
    look.skin = READ_SKIN_BASE;
    for (let f = 0; f < READ_MALE_KEYS.length; f++) {
      const k = READ_MALE_KEYS[f];
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
    const near = cells(READ_HAND_N[READ_MALE_KEYS[0]]!);
    assert.ok(near.filter(([i, c]) => hex(fr, i) !== c).length > near.length / 2, 'his near hand in the darker skin');
    for (const [i, c] of near) if (c === '#000000') assert.equal(hex(fr, i), '#000000');
  });
});
