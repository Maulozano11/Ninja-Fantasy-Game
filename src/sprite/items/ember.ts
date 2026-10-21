// The owner's Akira (docs/reference/akira-owner-reference.jpg) where his figure stands otherwise than
// our rig: he drew the far forearm hanging straighter than ours (his far fist nearer the body and
// lower), and his legs wider apart (the near leg splayed out, the far foot lower). Shared by his arm
// guards (Leather Bracers), his legs (Ember Leather Leggings) and his feet (Ember Boot and Sandal).

import { type Depth, type DrawCtx, legDepth, legJoints, type Side } from '../ctx';
import { segAngle } from '../painted';
import { GRID, Layer, partIndex, type PartId, RES, v, Vec } from '../raster';
import { drawRig, Rig } from '../rig';
import type { BodyType } from '../types';
import { EMBER_BRACER_F, EMBER_BRACER_FIST } from './emberBracersArt';
import { LEG_SHIFT } from './emberLegsArt';

export const EMBER_LEGS_ID = 'bottom_ember_leggings';
export const EMBER_FEET_ID = 'feet_ember';

const IDLE = new Map<BodyType, Rig>();
const idleRig = (b: BodyType): Rig => {
  let r = IDLE.get(b);
  if (!r) IDLE.set(b, (r = drawRig(b, 'idle', 0)));
  return r;
};

/** An angle wrapped into -180..180 degrees. */
const wrapDeg = (a: number) => ((a + 540) % 360) - 180;
const turnBy = (p: Vec, d: number): Vec => {
  const a = (d * Math.PI) / 180;
  return v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));
};
/** How much of his own hang a limb keeps: all of it within `near` degrees of rest, none past `far`. */
const keep = (off: number, near: number, far: number) => Math.max(0, Math.min(1, (far - off) / (far - near)));

/** Moves the pixels of some parts in a layer by whole fine pixels. */
function moveParts(L: Layer, parts: number[], dx: number, dy: number): void {
  if ((!dx && !dy) || !L.used) return;
  const moved: [number, number, number, number, number][] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || !parts.includes(L.part[i])) continue;
    moved.push([i, L.mat[i], L.shade[i], L.part[i], L.flags[i]]);
    L.mat[i] = -1;
  }
  for (const [i, mat, shade, p, flags] of moved) {
    const x = (i % GRID) + dx;
    const y = ((i / GRID) | 0) + dy;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    const j = y * GRID + x;
    L.mat[j] = mat;
    L.shade[j] = shade;
    L.part[j] = p;
    L.flags[j] = flags;
  }
}

// ---------------------------------------------------------------------------
// The far arm
// ---------------------------------------------------------------------------

export interface FarArm {
  /** How much of his far arm's hang is kept (1 standing as he drew it, 0 once the arm reaches far from it). */
  w: number;
  /** The far forearm guard's angle (degrees): his angle at rest, our forearm's once the arm reaches out. */
  deg: number;
  /** How far our far hand is carried to his fist (rig units). */
  hand: Vec;
}

/**
 * How close an arm hangs to how it hangs at rest: 1 while its upper arm and forearm are within 30
 * degrees of it (the torso's turn taken off), 0 past 45 (a hand meeting the other hand, a book or a
 * jutsu).
 */
export function armAtRest(g: DrawCtx, s: Side): number {
  const r = g.rig;
  const i = idleRig(r.body);
  const turn = segAngle(r.pelvis, r.neck) - segAngle(i.pelvis, i.neck);
  const [sh, el, wr] = s === 'N' ? (['shoulderN', 'elbowN', 'wristN'] as const) : (['shoulderF', 'elbowF', 'wristF'] as const);
  const du = Math.abs(wrapDeg(segAngle(r[sh], r[el]) - turn - segAngle(i[sh], i[el])));
  const df = Math.abs(wrapDeg(segAngle(r[el], r[wr]) - turn - segAngle(i[el], i[wr])));
  return keep(Math.max(du, df), 30, 45);
}

/**
 * His far arm against ours. While our far arm hangs about as it does at rest (armAtRest), his far
 * forearm keeps its own hang: the guard turns with our forearm but stays as much straighter as he drew
 * it, and our far hand is carried to his fist. As the arm reaches further both come back onto our
 * forearm and hand, so hands that meet still meet.
 */
export function emberFarArm(g: DrawCtx): FarArm {
  const r = g.rig;
  const i = idleRig(r.body);
  const fore = segAngle(r.elbowF, r.wristF);
  const fore0 = segAngle(i.elbowF, i.wristF);
  const w = armAtRest(g, 'F');
  const deg = fore + w * wrapDeg(EMBER_BRACER_F.angle - fore0);
  // his fist from the elbow, carried round with the guard; our hand from the elbow, with the forearm
  const fist = v(EMBER_BRACER_FIST[0] + 0.5 - i.elbowF.x * RES, EMBER_BRACER_FIST[1] + 0.5 - i.elbowF.y * RES);
  const our = v((i.handF.x - i.elbowF.x) * RES, (i.handF.y - i.elbowF.y) * RES);
  const target = turnBy(fist, deg - EMBER_BRACER_F.angle);
  const ours = turnBy(our, fore - fore0);
  return { w, deg, hand: v((w * (target.x - ours.x)) / RES, (w * (target.y - ours.y)) / RES) };
}

const ARM_DEPTHS: Record<Side, Depth[]> = { N: ['nearArm.body', 'nearArm.cloth'], F: ['farArm.body', 'farArm.cloth'] };

/**
 * Our forearm under his arm guard taken away (his guard is the forearm, so ours never shows past it
 * where he drew the arm otherwise), and our hand carried by `hand` (rig units), or taken away for his
 * own fist.
 */
export function fitArm(g: DrawCtx, s: Side, hand: Vec | null): void {
  const dx = hand ? Math.round(hand.x * RES) : 0;
  const dy = hand ? Math.round(hand.y * RES) : 0;
  const fore = partIndex(`forearm${s}`);
  const fist = partIndex(`hand${s}`);
  for (const d of ARM_DEPTHS[s]) {
    const L = g.L(d);
    if (!L.used) continue;
    if (hand) moveParts(L, [fist], dx, dy);
    for (let i = 0; i < GRID * GRID; i++) if (L.part[i] === fore || (!hand && L.part[i] === fist)) L.mat[i] = -1;
  }
}

/** Our arm's `seg` (skin, sleeve) taken away wherever the arm's armour layer does not cover it. */
export function trimUnder(g: DrawCtx, s: Side, seg: 'upperArm' | 'forearm'): void {
  const A = g.L(s === 'N' ? 'nearArm.armor' : 'farArm.armor');
  const part = partIndex(`${seg}${s}`);
  for (const d of ARM_DEPTHS[s]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.part[i] === part && A.mat[i] < 0) L.mat[i] = -1;
  }
}

// ---------------------------------------------------------------------------
// The legs
// ---------------------------------------------------------------------------

/**
 * Where his leg stands from ours (rig units). With his legs and his feet both on, while a leg stands
 * about as it does at rest (thigh and shin within 15 degrees of it) his leg stands where he drew it,
 * LEG_SHIFT back from ours; as the leg moves further (30 degrees: a stride, a kick, a crouch) it comes
 * onto our leg. With only one of the two on, it stands on our leg, so his legs meet any other footwear
 * and his feet any other legs.
 */
export function emberLegOut(g: DrawCtx, s: Side): Vec {
  const w = legAtRest(g, s);
  const [dx, dy] = LEG_SHIFT[s];
  return v((-w * dx) / RES, (-w * dy) / RES);
}

/** How much of his own stance a leg keeps (see emberLegOut): 0 unless his legs and his feet are both on. */
function legAtRest(g: DrawCtx, s: Side): number {
  if (!g.has('bottom', EMBER_LEGS_ID) || !g.has('feet', EMBER_FEET_ID)) return 0;
  const r = g.rig;
  const j = legJoints(r, s);
  const i = legJoints(idleRig(r.body), s);
  const dt = Math.abs(wrapDeg(segAngle(j.hip, j.knee) - segAngle(i.hip, i.knee)));
  const ds = Math.abs(wrapDeg(segAngle(j.knee, j.ankle) - segAngle(i.knee, i.ankle)));
  return keep(Math.max(dt, ds), 15, 30);
}

const FITTED = new WeakSet<DrawCtx>();

/**
 * Our legs under his, once per figure. Standing about as he drew them, his leg and foot take our leg's
 * place (our skin and anything drawn on it so far are taken away, so nothing of ours shows beside his
 * wider stance); moving further, ours stay under his, carried with them, to fill the bends.
 */
export function fitLegs(g: DrawCtx): void {
  if (FITTED.has(g)) return;
  FITTED.add(g);
  for (const s of ['F', 'N'] as Side[]) {
    const parts = (['thigh', 'shin', 'foot'] as const).map((p) => partIndex(`${p}${s}` as PartId));
    const layers = (['body', 'cloth'] as const).map((k) => g.L(legDepth(s, k)));
    if (legAtRest(g, s) > 0.5) {
      for (const L of layers) for (let i = 0; i < GRID * GRID; i++) if (parts.includes(L.part[i])) L.mat[i] = -1;
      continue;
    }
    const out = emberLegOut(g, s);
    for (const L of layers) moveParts(L, parts, Math.round(out.x * RES), Math.round(out.y * RES));
  }
}
