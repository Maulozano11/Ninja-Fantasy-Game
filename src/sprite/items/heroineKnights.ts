// The owner's heroine knights (2026-10-24, "nuevos conjuntos de mujer"): his picture of three women's sets
// (docs/reference/heroine-knights-owner-reference.jpg), a golden paladin, a dark rogue and a dragon-armoured
// knight, shrunk to our scale and cleaned with his palette by tools/refs/heroine_knights_ref.py (the owner's
// "Reducir y limpiar yo": the body at the scale that fits our fitted female rig, the head at our Lyra's size),
// lifted part by part by tools/refs/hk-*-from-ref.py, each part its own creator option: per set the armour,
// the arms, the belt, the skirt or tabard, the thighs, the lower legs and feet and the cape (her longsword is
// heroineKnightSword.ts). The sets bring no head of their own: the owner (D-T8, D-T16) wears them with Lyra's
// or Aurelia's whole head, and they must sit on both; his head and hair in the picture only say what they hide
// at rest (each piece is continued whole under them). While she wears them the rig stands where he drew her
// (heroineKnightsRig.ts), so in our female idle frame 0 every pixel of the sets is his picture's; in other
// poses each piece turns whole with its limb. His black line stays whatever the colours; her skin (the rogue's
// bare thigh) follows the character's skin; the rest follows the colour slots, his own colours when they are
// kept. Only the fitted female body wears them (the owner: women are never shown on the men's bodies). Names
// are placeholders for the owner to rename.

import { retintHex } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, skinTone, stampBent, stampLeaning, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, v, Vec } from '../raster';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { heroineGrip } from '../grip';
import { drawRig, GROUND, type Rig } from '../rig';
import { HK_BODIES, hkRestRig, type HkSet } from '../heroineKnightsRig';
import { HK_SKIN } from '../heroineKnightsJointsArt';
import type { BodyType } from '../types';
import { closeAnkle, footTurn } from './ankle';
import { capeWind } from './capes';
import * as ARMOR from './heroineKnightArmorArt';
import * as ARMS from './heroineKnightArmsArt';
import * as BELT from './heroineKnightBeltArt';
import * as CAPE from './heroineKnightCapeArt';
import * as FEET from './heroineKnightFeetArt';
import * as LEGS from './heroineKnightLegsArt';
import * as SKIRT from './heroineKnightSkirtArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const WOMEN = [...HK_BODIES];
const pick = <T>(s: Side, n: T, f: T): T => (s === 'N' ? n : f);
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** A generated module's export by name (the pieces and colours are named HK_<SET>_<PART>). */
type Module = Record<string, unknown>;
const piece = (m: Module, set: HkSet, part: string): PaintedPiece | undefined => m[`HK_${set.toUpperCase()}_${part}`] as PaintedPiece | undefined;
const base = (m: Module, set: HkSet, slot: string): string => m[`HK_${set.toUpperCase()}_${slot}`] as string;
const rest = (m: Module, prefix: string, set: HkSet, part: string): [number, number] => (m[`${prefix}_REST`] as Record<string, [number, number]>)[`HK_${set.toUpperCase()}_${part}`];
const kindsOf = (m: Module, prefix: string) => m[`${prefix}_KIND`] as Record<string, string>;

const PINNED = new Map<string, PaintedPiece>();
/**
 * A piece with its pivot moved so that at rest it lands where he drew it (`at`: its first cell in our frame)
 * whatever the joint it rides stands at in this look's rest rig (`joint`): his pieces stand together as he
 * drew them, and in a pose they turn about the joint the rig has there.
 */
function pinned(p: PaintedPiece, at: [number, number], joint: Vec, key: string): PaintedPiece {
  const k = `${key}|${joint.x}|${joint.y}`;
  let out = PINNED.get(k);
  if (!out) PINNED.set(k, (out = { ...p, pivot: [Math.floor(joint.x * RES) - at[0], Math.floor(joint.y * RES) - at[1]] }));
  return out;
}

/** A colour slot of an item: the kinds of his colours it moves, the colour of his it moves from, and to. */
type Slot = [kinds: string[], from: string, to: string];

/**
 * His colours through an item's slots: his black line and his whites stay, his skin follows the character's
 * skin, each kind of his named in a slot follows that slot (his own colour when the slot keeps his), the rest
 * stay his.
 */
function tint(g: DrawCtx, kinds: Record<string, string>, slots: Slot[]) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line' || k === 'white') return hex;
    if (k === 'skin') return skinTone(hex, HK_SKIN, g.look.skin);
    const s = slots.find(([ks]) => ks.includes(k));
    return s ? retintHex(hex, s[1], s[2]) : hex;
  };
}
const lineOf = (kinds: Record<string, string>) => (hex: string) => kinds[hex] === 'line';

/** Takes these parts of ours out of these layers (his pieces take their place). */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes the stray pixels off a turned piece: a pixel of the part on this layer with at most one other pixel
 * of the layer among its eight neighbours is a 1 px tooth RotSprite left on his line (a corner of a continued
 * piece's edge, the end of a thin strip), never part of the piece. At his angle nothing is touched (every
 * pixel is his).
 */
function pruneTips(g: DrawCtx, depth: Depth, part: PartId): void {
  const L = g.L(depth);
  if (!L.used) return;
  const id = partIndex(part);
  const tips: number[] = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (L.mat[i] < 0 || L.part[i] !== id) continue;
      let n = 0;
      for (let dy = -GRID; dy <= GRID; dy += GRID) for (let dx = -1; dx <= 1; dx++) if ((dy || dx) && L.mat[i + dy + dx] >= 0) n++;
      if (n <= 1) tips.push(i);
    }
  for (const i of tips) L.mat[i] = -1;
}

/**
 * How long a bite (fine px along the limb) closeBites fills: a notch no longer than this between two cells of
 * the piece in the same lane, or between the hip end and the lane's first cell. Long enough for the far
 * thigh's outer side above his sliver, which at rest is where his far hand hangs (so nothing of the thigh is
 * continued there in the converter) and opens as a bite of up to 12 px once the hand moves away.
 */
const BITE_SPAN = 14;

/**
 * Closes the bites on a turned thigh (the owner, 2026-10-30: "respetar la figura y forma y evitar esos
 * 'mordiscos'"): along the limb from the hip to the knee, in each lane beside the axis, a gap of at most
 * BITE_SPAN cells between two cells of the piece is filled, so each edge of the thigh runs as one smooth
 * column instead of stepping in and back out where RotSprite turned a stair of his line. A filled cell on
 * the piece's new edge is his line; one inside takes the colour of the cell next to it toward the axis (his
 * shading continued across); a cell of his line the fill has left inside takes its inward neighbour's colour
 * too, so the line moves out to the new edge and never stays as a dark streak. Only the thigh's own cells on
 * its layer are touched; at his angle the piece is his and this is not called.
 */
function closeBites(g: DrawCtx, depth: Depth, part: PartId, hip: Vec, knee: Vec, line: (mat: number) => boolean, lineMat: number): void {
  const L = g.L(depth);
  if (!L.used) return;
  const id = partIndex(part);
  const ax = hip.x * RES;
  const ay = hip.y * RES;
  const dx = (knee.x - hip.x) * RES;
  const dy = (knee.y - hip.y) * RES;
  const n = Math.hypot(dx, dy);
  if (n < 1) return;
  const ux = dx / n;
  const uy = dy / n;
  const px = -uy;
  const py = ux;
  // the piece's cells by lane (across) and step (along), and the grid cell of a (step, lane)
  const lanes = new Map<number, Map<number, number>>();
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== id) continue;
    const x = (i % GRID) + 0.5 - ax;
    const y = Math.floor(i / GRID) + 0.5 - ay;
    const st = Math.round(x * ux + y * uy);
    const u = Math.round(x * px + y * py);
    let lane = lanes.get(u);
    if (!lane) lanes.set(u, (lane = new Map()));
    lane.set(st, i);
  }
  const cellAt = (st: number, u: number) => {
    const x = Math.floor(ax + st * ux + u * px);
    const y = Math.floor(ay + st * uy + u * py);
    return x >= 0 && y >= 0 && x < GRID && y < GRID ? y * GRID + x : -1;
  };
  const added: number[] = [];
  // the piece's first step (the hip end) and its width at mid-thigh on each side: a lane within that width
  // that starts late is open at the top (the far thigh's outer side under his hanging hand), a bite too
  let top = Infinity;
  for (const lane of lanes.values()) for (const st of lane.keys()) top = Math.min(top, st);
  const mid = Math.round(n / 2);
  const wide = (u: number) => [mid - 1, mid, mid + 1].some((st) => lanes.get(u)?.has(st));
  const fill = (lane: Map<number, number>, u: number, from: number, to: number, fallback: number) => {
    for (let st = from; st <= to; st++) {
      const i = cellAt(st, u);
      if (i < 0 || L.mat[i] >= 0) continue;
      // the colour beside it toward the axis and on across it (not his line), else the lane's nearest
      // cell of his shading along the limb, else the lane's end cell
      let mat = -1;
      const dir = u >= 0 ? 1 : -1;
      for (let k = 1; mat < 0 && k <= BITE_SPAN; k++) {
        for (const v of [u - k * dir, u + k * dir]) {
          const j = lanes.get(v)?.get(st) ?? -1;
          if (mat < 0 && j >= 0 && !line(L.mat[j])) mat = L.mat[j];
        }
      }
      for (let k = 1; mat < 0 && k <= BITE_SPAN; k++) {
        for (const j of [lane.get(st - k) ?? -1, lane.get(st + k) ?? -1]) if (mat < 0 && j >= 0 && !line(L.mat[j])) mat = L.mat[j];
      }
      if (mat < 0) mat = fallback;
      L.set(i % GRID, (i / GRID) | 0, mat, 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
      lane.set(st, i);
      added.push(i);
    }
  };
  for (const [u, lane] of lanes) {
    const steps = [...lane.keys()].sort((a, b) => a - b);
    for (let k = 1; k < steps.length; k++) {
      const gap = steps[k] - steps[k - 1] - 1;
      if (gap >= 1 && gap <= BITE_SPAN) fill(lane, u, steps[k - 1] + 1, steps[k] - 1, L.mat[lane.get(steps[k - 1])!]);
    }
    if (wide(u) && steps[0] - top >= 1 && steps[0] - top <= BITE_SPAN) fill(lane, u, top, steps[0] - 1, L.mat[lane.get(steps[0])!]);
  }
  if (!added.length) return;
  // his line on the new edge: a filled cell with an empty 4-neighbour, and a line cell of his left inside
  // next to a filled cell takes its inward colour
  const empty = (i: number) => i < 0 || L.mat[i] < 0;
  const onEdge = (i: number) => {
    const x = i % GRID;
    return empty(x > 0 ? i - 1 : -1) || empty(x < GRID - 1 ? i + 1 : -1) || empty(i >= GRID ? i - GRID : -1) || empty(i + GRID < GRID * GRID ? i + GRID : -1);
  };
  for (const i of added) if (onEdge(i)) L.mat[i] = lineMat;
  for (const i of added) {
    const x = i % GRID;
    for (const j of [x > 0 ? i - 1 : -1, x < GRID - 1 ? i + 1 : -1, i - GRID, i + GRID]) {
      if (j < 0 || j >= GRID * GRID || L.mat[j] < 0 || L.part[j] !== id || !line(L.mat[j]) || onEdge(j)) continue;
      // the colour of the cell beyond it from the added one (deeper inside the piece)
      const k = j + (j - i);
      if (k >= 0 && k < GRID * GRID && L.mat[k] >= 0 && L.part[k] === id && !line(L.mat[k])) L.mat[j] = L.mat[k];
    }
  }
}

/**
 * How far (fine px) a hand has to have moved from where it hangs at rest for the thigh under it to be closed
 * (closeBites): at rest his hand hangs over the thigh's side, so the converter continues nothing of the thigh
 * there and the hand covers the notch; moved away in a pose, the notch would show. Idle's breathing moves
 * the hands 2 px and keeps his picture.
 */
const HAND_AWAY = 4;

/** Whether a limb points another way than at rest (a piece on it is turned, not his pixels in place). */
const turnedFrom = (now: number, home: number) => Math.round(now - home) % 360 !== 0;

/** Takes our torso away below the neck: his armour is the torso, so none of our skin or cloth shows past it. */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torsoPart = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under', 'torso.bottom', 'torso.top'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torsoPart) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

/** How far the torso has turned from this look's rest (degrees). */
const torsoTurn = (g: DrawCtx): number => {
  const home = hkRestRig(g.look);
  return segAngle(g.rig.pelvis, g.rig.neck) - segAngle(home.pelvis, home.neck);
};

/** A piece riding the torso about a joint of it (the neck, the pelvis), pinned to where he drew it at rest. */
function onTorso(g: DrawCtx, m: Module, prefix: string, set: HkSet, part: string, joint: 'neck' | 'pelvis', depth: Depth, color: (ch: string, hex: string) => string, line: (hex: string) => boolean, partId: PartId): void {
  const p = piece(m, set, part);
  if (!p) return;
  const home = hkRestRig(g.look);
  stampLeaning(g, depth, pinned(p, rest(m, prefix, set, part), home[joint], `${prefix}|${set}|${part}`), g.rig[joint], p.angle + torsoTurn(g), partId, color, line);
}

// ---------------------------------------------------------------------------
// The armour: the breastplate or corset, and the shoulder pieces
// ---------------------------------------------------------------------------

/** How much of the upper arm's turn (from rest, the torso's taken off) a shoulder piece follows: it rides the shoulder. */
const PAULDRON_FOLLOW = 0.6;

/** A shoulder piece's angle: with the torso, and `follow` of the way with its upper arm. */
function pauldronAngle(g: DrawCtx, s: Side, p: PaintedPiece, follow = PAULDRON_FOLLOW): number {
  const t = torsoTurn(g);
  const j = armJoints(g.rig, s);
  const turn = wrap180(segAngle(j.shoulder, j.elbow) - t - p.angle);
  return p.angle + t + follow * turn;
}

/** A shoulder piece on the shoulder, pinned to where he drew it at rest; `follow`: how far it turns with the arm (pauldronAngle). */
function onShoulder(g: DrawCtx, m: Module, prefix: string, set: HkSet, part: string, s: Side, depth: Depth, color: (ch: string, hex: string) => string, line: (hex: string) => boolean, rowsFrom = 0, follow = PAULDRON_FOLLOW): void {
  let p = piece(m, set, part);
  if (!p) return;
  if (rowsFrom > 0) p = { ...p, rows: p.rows.map((r, i) => (i < rowsFrom ? '.'.repeat(r.length) : r)) };
  const home = armJoints(hkRestRig(g.look), s);
  stampPiece(g, depth, pinned(p, rest(m, prefix, set, part), home.shoulder, `${prefix}|${set}|${part}|${rowsFrom}`), armJoints(g.rig, s).shoulder, pauldronAngle(g, s, p, follow), `upperArm${s}` as PartId, color, line);
}

function armorSlots(set: HkSet, c: string[]): Slot[] {
  const M = ARMOR as Module;
  if (set === 'paladin')
    return [
      [['ivory', 'steel', 'warm'], base(M, set, 'PLATE'), c[0]],
      [['gold'], base(M, set, 'TRIM'), c[1]],
      [['blue'], base(M, set, 'GEM'), c[2]],
    ];
  if (set === 'rogue')
    return [
      [['plum', 'warm', 'red'], base(M, set, 'LEATHER'), c[0]],
      [['steel', 'gold'], base(M, set, 'METAL'), c[1]],
    ];
  return [[['warm', 'red', 'skin'], base(M, set, 'SCALES'), c[0]]];
}

function drawArmor(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = ARMOR as Module;
  const kinds = kindsOf(M, 'HK_ARMOR');
  const color = tint(g, kinds, armorSlots(set, c));
  const line = lineOf(kinds);
  torsoOff(g);
  onShoulder(g, M, 'HK_ARMOR', set, 'PAULD_F', 'F', 'farArm.armor', color, line);
  onTorso(g, M, 'HK_ARMOR', set, 'TORSO', 'neck', 'torso.armor', color, line, 'torso');
  // The dragon's head on her near shoulder rises to where her long hair falls: he drew the hair over it, so
  // the whole head goes under the hair (before 'hairFront'), and its lower rows, which he drew over the
  // sleeve, once more on the arm's own layer; the other pauldrons stay low, on the arm's layer only.
  if (set === 'dragon') onShoulder(g, M, 'HK_ARMOR', set, 'PAULD_N', 'N', 'torso.over', color, line);
  onShoulder(g, M, 'HK_ARMOR', set, 'PAULD_N', 'N', 'nearArm.armor', color, line, set === 'dragon' ? DRAGON_HEAD_ROWS : 0);
}

/** The rows of the dragon-head pauldron that are the head's crest, under her hair; below them it is over the sleeve. */
const DRAGON_HEAD_ROWS = 9;

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

/** How far round the elbow (fine px) his forearm's top is swept through a bend, so the bend closes on his own pixels. */
const ELBOW_R = 4;

/** How far an elbow bends past the way he drew it (degrees). */
function elbowBend(g: DrawCtx, s: Side, upper: PaintedPiece, fore: PaintedPiece): number {
  const j = armJoints(g.rig, s);
  return wrap180(segAngle(j.shoulder, j.elbow) - segAngle(j.elbow, j.wrist) - (upper.angle - fore.angle));
}

/** How far round the knee (fine px) his thigh's end is swept through a bend (stampBent): about half the thigh's width. */
const KNEE_R = 5;

/** How far a knee bends past the way he drew it (degrees): the shin's turn against the thigh beyond their turn at rest. */
function kneeBend(g: DrawCtx, s: Side): number {
  const j = legJoints(g.rig, s);
  const h = legJoints(hkRestRig(g.look), s);
  return wrap180(segAngle(j.knee, j.ankle) - segAngle(j.hip, j.knee) - (segAngle(h.knee, h.ankle) - segAngle(h.hip, h.knee)));
}

function armSlots(set: HkSet, c: string[]): Slot[] {
  const M = ARMS as Module;
  if (set === 'paladin')
    return [
      [['ivory', 'steel', 'warm'], base(M, set, 'ARM_PLATE'), c[0]],
      [['gold'], base(M, set, 'ARM_TRIM'), c[1]],
    ];
  if (set === 'rogue')
    return [
      [['steel'], base(M, set, 'ARM_MAIL'), c[0]],
      [['warm', 'plum', 'red'], base(M, set, 'ARM_LEATHER'), c[1]],
    ];
  return [[['warm', 'red', 'skin'], base(M, set, 'ARM_SCALES'), c[0]]];
}

function drawArms(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = ARMS as Module;
  const kinds = kindsOf(M, 'HK_ARMS');
  const color = tint(g, kinds, armSlots(set, c));
  const line = lineOf(kinds);
  const home = hkRestRig(g.look);
  for (const s of SIDES) {
    const j = armJoints(g.rig, s);
    const h = armJoints(home, s);
    const up = `upperArm${s}` as PartId;
    const fore = `forearm${s}` as PartId;
    const hand = `hand${s}` as PartId;
    // his sleeves, forearms and hands are the arm: ours goes
    partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [up, fore, hand]);
    const U = piece(M, set, `UPPER_${s}`);
    const F = piece(M, set, `FORE_${s}`);
    const H = piece(M, set, `HAND_${s}`);
    // The upper arm about the shoulder; its end past the elbow (continued under his vambrace, the converter's
    // PAST) rides the forearm, and its cells next to the elbow fill the outside of the bend (stampBent), so
    // the elbow never opens on the ground: the owner's rule, SPRITE_STYLE_GUIDE "Legs, knees and ankles".
    const bend = U && F ? elbowBend(g, s, U, F) : 0;
    if (U) stampBent(g, armDepth(s, 'cloth'), pinned(U, rest(M, 'HK_ARMS', set, `UPPER_${s}`), h.shoulder, `arms|${set}|U${s}`), j.shoulder, segAngle(j.shoulder, j.elbow) + (U.angle - segAngle(h.shoulder, h.elbow)), up, [{ about: j.elbow, r: ELBOW_R, bend: -bend, carry: true }], line, color);
    if (F) {
      stampBent(g, armDepth(s, 'armor'), pinned(F, rest(M, 'HK_ARMS', set, `FORE_${s}`), h.elbow, `arms|${set}|F${s}`), j.elbow, segAngle(j.elbow, j.wrist) + (F.angle - segAngle(h.elbow, h.wrist)), fore, [{ about: j.elbow, r: ELBOW_R, bend }], line, color);
    }
    if (H) {
      const P = pinned(H, rest(M, 'HK_ARMS', set, `HAND_${s}`), h.wrist, `arms|${set}|H${s}`);
      const hold = s === 'N' ? heroineGrip(g) : null;
      if (hold) {
        // Round her longsword the gauntlet turns as grip.ts heroineGrip says: with the forearm, the wrist bent
        // toward the blade, mirrored where the grip crosses the other way (at rest, unbent, his pixels).
        const pal: TemplatePalette = {};
        for (const [ch, hex] of Object.entries(P.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
        const base = hold.mirror ? 180 - P.angle : P.angle;
        stampTemplate(g.L(armDepth(s, 'armor')), P, j.wrist, hold.fist + (H.angle - segAngle(h.elbow, h.wrist)) - base, pal, hand, { flipX: hold.mirror, flags: F_NO_TEXTURE | F_NO_OUTLINE, line: (ch: string) => line(P.colors[ch]) });
      } else stampPiece(g, armDepth(s, 'armor'), P, j.wrist, segAngle(j.elbow, j.wrist) + (H.angle - segAngle(h.elbow, h.wrist)), hand, color, line, true);
    }
    if (U && turnedFrom(segAngle(j.shoulder, j.elbow) + (U.angle - segAngle(h.shoulder, h.elbow)), U.angle)) pruneTips(g, armDepth(s, 'cloth'), up);
    if (F && turnedFrom(segAngle(j.elbow, j.wrist) + (F.angle - segAngle(h.elbow, h.wrist)), F.angle)) {
      pruneTips(g, armDepth(s, 'armor'), fore);
      pruneTips(g, armDepth(s, 'armor'), hand);
    }
  }
}

// ---------------------------------------------------------------------------
// The belt and the skirt
// ---------------------------------------------------------------------------

function beltSlots(set: HkSet, c: string[]): Slot[] {
  const M = BELT as Module;
  if (set === 'paladin')
    return [
      [['warm', 'red', 'plum'], base(M, set, 'BELT_LEATHER'), c[0]],
      [['gold'], base(M, set, 'BELT_GOLD'), c[1]],
      [['blue'], base(M, set, 'BELT_GEM'), c[2]],
    ];
  if (set === 'rogue')
    return [
      [['red', 'plum'], base(M, set, 'SASH'), c[0]],
      [['steel', 'warm'], base(M, set, 'SASH_BELT'), c[1]],
    ];
  return [
    [['warm', 'red', 'plum'], base(M, set, 'BELT_LEATHER'), c[0]],
    [['steel', 'gold'], base(M, set, 'BELT_METAL'), c[1]],
  ];
}

function skirtSlots(set: HkSet, c: string[]): Slot[] {
  const M = SKIRT as Module;
  if (set === 'paladin')
    return [
      [['red', 'plum', 'warm'], base(M, set, 'TABARD'), c[0]],
      [['gold'], base(M, set, 'TABARD_TRIM'), c[1]],
    ];
  if (set === 'rogue') return [[['plum', 'warm', 'red', 'steel'], base(M, set, 'SKIRT_CLOTH'), c[0]]];
  return [
    [['green', 'cyan'], base(M, set, 'TABARD'), c[0]],
    [['gold'], base(M, set, 'TABARD_TRIM'), c[1]],
  ];
}

/** His skirts and tabards never go into the ground: crouched or kneeling, what would reach below the soles ends on the ground line on his line. */
function hemOnGround(g: DrawCtx, depth: Depth, line: number, partId: PartId): void {
  if (g.rig.lay) return;
  const L = g.L(depth);
  const hemY = GROUND * RES - 1;
  const id = partIndex(partId);
  for (let x = 0; x < GRID; x++) {
    let cut = false;
    for (let y = hemY + 1; y < GRID; y++) {
      const i = y * GRID + x;
      if (L.mat[i] >= 0 && L.part[i] === id) {
        L.mat[i] = -1;
        cut = true;
      }
    }
    const h = hemY * GRID + x;
    if (cut && L.mat[h] >= 0 && L.part[h] === id) L.set(x, hemY, line, 3, partId, F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

function drawSkirt(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = SKIRT as Module;
  const kinds = kindsOf(M, 'HK_SKIRT');
  const line = lineOf(kinds);
  onTorso(g, M, 'HK_SKIRT', set, 'SKIRT', 'pelvis', 'skirt', tint(g, kinds, skirtSlots(set, c)), line, 'pelvis');
  const lineHex = Object.keys(kinds).find((h) => kinds[h] === 'line')!;
  hemOnGround(g, 'skirt', g.m(lineHex, 'flat'), 'pelvis');
}

// ---------------------------------------------------------------------------
// The thighs, the lower legs and the feet
// ---------------------------------------------------------------------------

function legSlots(set: HkSet, c: string[]): Slot[] {
  const M = LEGS as Module;
  if (set === 'paladin')
    return [
      [['ivory', 'steel', 'warm'], base(M, set, 'LEG_PLATE'), c[0]],
      [['gold'], base(M, set, 'LEG_TRIM'), c[1]],
    ];
  if (set === 'rogue') return [[['plum', 'warm', 'red', 'steel'], base(M, set, 'LEGGINGS'), c[0]]];
  return [[['warm', 'red'], base(M, set, 'LEG_SCALES'), c[0]]];
}

function drawThighs(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = LEGS as Module;
  const kinds = kindsOf(M, 'HK_LEGS');
  const color = tint(g, kinds, legSlots(set, c));
  const line = lineOf(kinds);
  const home = hkRestRig(g.look);
  // his thighs and hips are hers: our hips go too (they would show past his far arm)
  partsOff(g, ['torso.body', 'torso.under', 'torso.bottom'], ['pelvis']);
  for (const s of SIDES) {
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}` as PartId]);
    const p = piece(M, set, `THIGH_${s}`);
    if (!p) continue;
    const j = legJoints(g.rig, s);
    const h = legJoints(home, s);
    // The thigh about the hip; its end past the knee (continued under his knee cop, the converter's PAST) rides
    // the shin, and its cells next to the knee fill the outside of the bend (stampBent), so the knee never
    // opens on the ground: the owner's rule, SPRITE_STYLE_GUIDE "Legs, knees and ankles".
    const deg = segAngle(j.hip, j.knee) + (p.angle - segAngle(h.hip, h.knee));
    const bend = kneeBend(g, s);
    stampBent(g, legDepth(s, 'cloth'), pinned(p, rest(M, 'HK_LEGS', set, `THIGH_${s}`), h.hip, `legs|${set}|${s}`), j.hip, deg, `thigh${s}` as PartId, [{ about: j.knee, r: KNEE_R, bend, carry: true }], line, color);
    const moved = turnedFrom(deg, p.angle) || Math.abs(bend) >= 1;
    if (moved) pruneTips(g, legDepth(s, 'cloth'), `thigh${s}` as PartId);
    const wrist = armJoints(g.rig, s).wrist;
    const wristHome = armJoints(home, s).wrist;
    if (moved || Math.hypot(wrist.x - wristHome.x, wrist.y - wristHome.y) * RES > HAND_AWAY) {
      const lineMats = new Set(Object.keys(kinds).filter((hex) => kinds[hex] === 'line').map((hex) => g.m(hex, 'flat')));
      closeBites(g, legDepth(s, 'cloth'), `thigh${s}` as PartId, j.hip, j.knee, (m) => lineMats.has(m), g.m(Object.keys(kinds).find((hex) => kinds[hex] === 'line')!, 'flat'));
    }
  }
}

function feetSlots(set: HkSet, c: string[]): Slot[] {
  const M = FEET as Module;
  if (set === 'paladin')
    return [
      [['ivory', 'steel', 'warm'], base(M, set, 'GREAVE'), c[0]],
      [['gold'], base(M, set, 'GREAVE_TRIM'), c[1]],
    ];
  if (set === 'rogue') return [[['warm', 'plum', 'red', 'steel'], base(M, set, 'BOOT'), c[0]]];
  return [[['warm', 'red', 'skin'], base(M, set, 'GREAVE_SCALES'), c[0]]];
}

function drawFeet(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = FEET as Module;
  const kinds = kindsOf(M, 'HK_FEET');
  const color = tint(g, kinds, feetSlots(set, c));
  const line = lineOf(kinds);
  const lineHex = Object.keys(kinds).filter((h) => kinds[h] === 'line');
  const home = hkRestRig(g.look);
  for (const s of SIDES) {
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`shin${s}` as PartId, `foot${s}` as PartId]);
    const j = legJoints(g.rig, s);
    const h = legJoints(home, s);
    const D = legDepth(s, 'feet');
    const foot = piece(M, set, `FOOT_${s}`);
    const shin = piece(M, set, `SHIN_${s}`);
    const turn = footTurn(g, s);
    // the foot flat on the ground under the ankle (turned with the shin once the leg swings it off the
    // ground), the greave over it about the knee along the shin
    // (closed: turned, a pixel of the piece left on the layer's edge becomes his line, so his line stays whole)
    if (foot) stampPiece(g, D, pinned(foot, rest(M, 'HK_FEET', set, `FOOT_${s}`), h.ankle, `feet|${set}|F${s}`), j.ankle, foot.angle + turn, `foot${s}` as PartId, color, line, true);
    if (shin) {
      const shinDeg = segAngle(j.knee, j.ankle) + (shin.angle - segAngle(h.knee, h.ankle));
      stampPiece(g, D, pinned(shin, rest(M, 'HK_FEET', set, `SHIN_${s}`), h.knee, `feet|${set}|S${s}`), j.knee, shinDeg, `shin${s}` as PartId, color, line, true);
      if (turn && lineHex.length) closeAnkle(g, s, j.ankle, g.m(lineHex[0], 'flat'), new Set(lineHex.map((x) => g.m(x, 'flat'))));
      if (turnedFrom(shinDeg, shin.angle)) {
        pruneTips(g, D, `shin${s}` as PartId);
        pruneTips(g, D, `foot${s}` as PartId);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The cape (the rogue's with her hood and high collar)
// ---------------------------------------------------------------------------

/** How far (degrees) a cape swings back for each design unit of the pose's wind (capes.ts capeWind), and the most. */
const CAPE_SWING = 2.4;
const CAPE_SWING_MAX = 32;

function capeSlots(set: HkSet, c: string[]): Slot[] {
  const M = CAPE as Module;
  if (set === 'paladin')
    return [
      [['red', 'plum', 'warm'], base(M, set, 'CAPE_RED'), c[0]],
      [['gold'], base(M, set, 'CAPE_GOLD'), c[1]],
    ];
  if (set === 'rogue') return [[['red', 'plum', 'warm'], base(M, set, 'CAPE_RED'), c[0]]];
  return [
    [['red', 'plum', 'warm'], base(M, set, 'CAPE_RED'), c[0]],
    [['ember', 'gold'], base(M, set, 'CAPE_EMBER'), c[1]],
  ];
}

function drawCape(g: DrawCtx, set: HkSet, c: string[]): void {
  const M = CAPE as Module;
  const kinds = kindsOf(M, 'HK_CAPE');
  const color = tint(g, kinds, capeSlots(set, c));
  const line = lineOf(kinds);
  const p = piece(M, set, 'CAPE');
  if (p) {
    const home = hkRestRig(g.look);
    const w = capeWind(g);
    const swing = Math.max(-8, Math.min(CAPE_SWING_MAX, -w.dx * CAPE_SWING + w.wave));
    stampLeaning(g, 'capeBack', pinned(p, rest(M, 'HK_CAPE', set, 'CAPE'), home.neck, `cape|${set}`), g.rig.neck, p.angle + torsoTurn(g) + swing, 'back', color, line);
    const lineHex = Object.keys(kinds).find((h) => kinds[h] === 'line')!;
    hemOnGround(g, 'capeBack', g.m(lineHex, 'flat'), 'back');
  }
  // the rogue's hood, down over her near shoulder, and her high collar's far side: cloth hanging from the
  // neck, they stay with the torso (follow 0), so a raised or extended arm comes out from under the hood
  // and the torso keeps its own side under the armpit (the owner's rule, SPRITE_STYLE_GUIDE "The figure in
  // the striking poses"), instead of the hood swinging off the shoulder with the arm
  onShoulder(g, M, 'HK_CAPE', set, 'MANTLE_F', 'F', 'torso.over', color, line, 0, 0);
  onShoulder(g, M, 'HK_CAPE', set, 'MANTLE_N', 'N', 'nearArm.over', color, line, 0, 0);
}

// ---------------------------------------------------------------------------
// The items
// ---------------------------------------------------------------------------

const NAME: Record<HkSet, string> = { paladin: 'Gilded Paladin', rogue: 'Crimson Rogue', dragon: 'Dragonscale' };

/** One set's items, in its colours. */
function setItems(set: HkSet): ItemDef[] {
  const n = NAME[set];
  const A = ARMOR as Module;
  const R = ARMS as Module;
  const B = BELT as Module;
  const S = SKIRT as Module;
  const L = LEGS as Module;
  const F = FEET as Module;
  const C = CAPE as Module;
  const armor: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('plate', 'Plate', base(A, set, 'PLATE'), 'metal'), col('trim', 'Trim', base(A, set, 'TRIM'), 'metal'), col('gem', 'Gems', base(A, set, 'GEM'), 'metal')],
    rogue: [col('leather', 'Leather', base(A, set, 'LEATHER'), 'leather'), col('metal', 'Studs', base(A, set, 'METAL'), 'metal')],
    dragon: [col('scales', 'Scales', base(A, set, 'SCALES'), 'metal')],
  };
  const arms: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('plate', 'Plate', base(R, set, 'ARM_PLATE'), 'metal'), col('trim', 'Trim', base(R, set, 'ARM_TRIM'), 'metal')],
    rogue: [col('mail', 'Mail', base(R, set, 'ARM_MAIL'), 'metal'), col('leather', 'Leather', base(R, set, 'ARM_LEATHER'), 'leather')],
    dragon: [col('scales', 'Scales', base(R, set, 'ARM_SCALES'), 'metal')],
  };
  const belt: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('leather', 'Leather', base(B, set, 'BELT_LEATHER'), 'leather'), col('gold', 'Gold', base(B, set, 'BELT_GOLD'), 'metal'), col('gem', 'Gem', base(B, set, 'BELT_GEM'), 'metal')],
    rogue: [col('sash', 'Sash', base(B, set, 'SASH')), col('belt', 'Belt', base(B, set, 'SASH_BELT'), 'leather')],
    dragon: [col('leather', 'Leather', base(B, set, 'BELT_LEATHER'), 'leather'), col('metal', 'Metal', base(B, set, 'BELT_METAL'), 'metal')],
  };
  const skirt: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('main', 'Tabard', base(S, set, 'TABARD')), col('trim', 'Embroidery', base(S, set, 'TABARD_TRIM'), 'metal')],
    rogue: [col('main', 'Skirt', base(S, set, 'SKIRT_CLOTH'))],
    dragon: [col('main', 'Tabard', base(S, set, 'TABARD')), col('trim', 'Trim', base(S, set, 'TABARD_TRIM'), 'metal')],
  };
  const legs: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('plate', 'Plate', base(L, set, 'LEG_PLATE'), 'metal'), col('trim', 'Trim', base(L, set, 'LEG_TRIM'), 'metal')],
    rogue: [col('main', 'Leggings', base(L, set, 'LEGGINGS'))],
    dragon: [col('scales', 'Scales', base(L, set, 'LEG_SCALES'), 'metal')],
  };
  const feet: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('plate', 'Plate', base(F, set, 'GREAVE'), 'metal'), col('trim', 'Trim', base(F, set, 'GREAVE_TRIM'), 'metal')],
    rogue: [col('boot', 'Boots', base(F, set, 'BOOT'), 'leather')],
    dragon: [col('scales', 'Scales', base(F, set, 'GREAVE_SCALES'), 'metal')],
  };
  const cape: Record<HkSet, ItemDef['colors']> = {
    paladin: [col('main', 'Cape', base(C, set, 'CAPE_RED')), col('trim', 'Embroidery', base(C, set, 'CAPE_GOLD'), 'metal')],
    rogue: [col('main', 'Cape', base(C, set, 'CAPE_RED'))],
    dragon: [col('main', 'Cape', base(C, set, 'CAPE_RED')), col('ember', 'Embers', base(C, set, 'CAPE_EMBER'))],
  };
  const desc: Record<HkSet, Record<string, string>> = {
    paladin: {
      armor: 'Ivory and gold plate with blue gems at the chest and shoulders, ornate gold pauldrons (+5 AC).',
      hands: 'Ivory and gold rerebraces and vambraces, an ivory gauntlet and a dark glove.',
      waist: 'A gold belt with a blue gem at the buckle and a leather pouch at the hip.',
      skirt: 'A red tabard down the front, embroidered in gold.',
      bottom: 'Ivory and gold cuisses over the thighs.',
      feet: 'Ivory and gold knee cops, greaves and sabatons.',
      cape: 'A red cape with gold-embroidered edges.',
    },
    rogue: {
      armor: 'A dark plum leather corset with studs and buckles over mail (+3 AC).',
      hands: 'Mail sleeves with leather wraps on the forearms, and dark gloves.',
      waist: 'A crimson sash over a studded belt, its end hanging down the hip.',
      skirt: 'A torn dark skirt, its hem tattered.',
      bottom: 'Dark leggings, the thigh bare where the skirt is torn.',
      feet: 'Dark leggings with knee pads and buckled leather boots.',
      cape: 'A crimson hooded cape with a high collar, the hood down, tattered at the hem.',
    },
    dragon: {
      armor: 'Copper dragon-scale armour with a dragon-head pauldron, its eye green (+5 AC).',
      hands: 'Copper scale sleeves and gauntlets.',
      waist: 'A leather belt with a ring buckle, pouches and vials.',
      skirt: 'A green tabard with gold trim.',
      bottom: 'Copper scale cuisses over the thighs.',
      feet: 'Copper scale greaves and boots.',
      cape: 'A red cape with glowing ember veins.',
    },
  };
  const id = (slot: string) => `${slot}_heroine_${set}`;
  return [
    { id: id('armor'), slot: 'armor', name: `${n} Armour`, desc: desc[set].armor, colors: armor[set], statsArmor: set === 'rogue' ? 'Mist Storm Vest' : 'Dark Knight Plate', bodies: [...WOMEN], draw: (g, c) => drawArmor(g, set, c) },
    { id: id('hands'), slot: 'hands', name: `${n} Arms`, desc: desc[set].hands, colors: arms[set], bodies: [...WOMEN], draw: (g, c) => drawArms(g, set, c) },
    { id: id('waist'), slot: 'waist', name: `${n} Belt`, desc: desc[set].waist, colors: belt[set], bodies: [...WOMEN], draw: (g, c) => onTorso(g, B, 'HK_BELT', set, 'BELT', 'pelvis', 'waist', tint(g, kindsOf(B, 'HK_BELT'), beltSlots(set, c)), lineOf(kindsOf(B, 'HK_BELT')), 'pelvis') },
    { id: id('skirt'), slot: 'skirt', name: `${n} ${set === 'rogue' ? 'Skirt' : 'Tabard'}`, desc: desc[set].skirt, colors: skirt[set], bodies: [...WOMEN], draw: (g, c) => drawSkirt(g, set, c) },
    { id: id('bottom'), slot: 'bottom', name: `${n} ${set === 'rogue' ? 'Leggings' : 'Cuisses'}`, desc: desc[set].bottom, colors: legs[set], bodies: [...WOMEN], draw: (g, c) => drawThighs(g, set, c) },
    { id: id('feet'), slot: 'feet', name: `${n} ${set === 'rogue' ? 'Boots' : 'Greaves'}`, desc: desc[set].feet, colors: feet[set], bodies: [...WOMEN], draw: (g, c) => drawFeet(g, set, c) },
    { id: id('cape'), slot: 'cape', name: `${n} Cape`, desc: desc[set].cape, colors: cape[set], bodies: [...WOMEN], draw: (g, c) => drawCape(g, set, c) },
  ];
}

export const HEROINE_KNIGHT_ITEMS: ItemDef[] = [
  ...setItems('paladin'),
  ...setItems('rogue'),
  ...setItems('dragon'),
];

void pick;
void idleRig;
