// Face marks and masks, held weapons / techniques, and stackable accessories.
// Everything is placed from the rig (hand + forearm direction, torso-local
// T(), head-local hd()) so it works on every body type and pose.

import { armJoints, DrawCtx, ItemDef, legPoint, Side } from '../ctx';
import { add, capsule, ellipse, F_NO_OUTLINE, fine, GRID, Layer, len, lerp, line, norm, partIndex, Pen, perp, poly, px, RES, scale, seam, sub, UNITS, v, Vec } from '../raster';
import { retintHex, type RampKind } from '../color';
import { hd } from './hairkit';
import { CRYSTAL_SWORD, drawPaintedWeapon, drawWeapon, KUNAI } from './weapons';
import { FLAME_LONGSWORD, FLAME_SWORD_FLAME, FLAME_SWORD_GOLD } from './flameSwordArt';
import { ICE_SWORD, ICE_SWORD_BLADE, ICE_SWORD_KIND } from './iceSwordArt';
import { KATANA_PARTS, katanaHipColors, katanaTemplate } from './katana';
import { stampLeaning } from './armor';
import { FOUNDER_COWL, FOUNDER_COWL_GOLD, FOUNDER_COWL_KIND, FOUNDER_COWL_NEAR, FOUNDER_COWL_NECK, FOUNDER_COWL_STUD, FOUNDER_COWL_STUD_F } from './founderCowlArt';
import { chakraHex } from '../chakraInfo';
import { gripPoint, handsBusy, handsLimp, handsReleased, poleAngle, swordAngle, throwsKunai } from '../grip';

const col = (key: string, label: string, def: string, kind: RampKind = 'cloth') => ({ key, label, default: def, kind });

const rot = (d: Vec, deg: number): Vec => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return v(d.x * c - d.y * s, d.x * s + d.y * c);
};
const fromAngle = (deg: number): Vec => rot(v(1, 0), deg);

/** Breathing-aware torso point (follows the shoulders). */
function topPt(g: DrawCtx) {
  const T = g.rig.T;
  const dy = g.rig.neck.y - T(0.6, g.bp.torsoLen).y;
  return (x: number, y: number) => add(T(x, y), v(0, dy));
}

/** Paints only over pixels already present in the layer (fine detail on top of a shape). */
function paintOver(L: Layer, a: Vec, b: Vec, pen: Pen, shade: number, mat?: number): void {
  const steps = Math.max(1, Math.ceil(len(sub(b, a)) * RES * 1.2));
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const x = fine(p.x);
    const y = fine(p.y);
    if (!L.has(x, y)) continue;
    if (mat !== undefined && L.mat[y * GRID + x] !== mat) continue;
    if (L.getShade(x, y) === 0) continue;
    L.set(x, y, pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
  }
}

// ---------------------------------------------------------------------------
// Held items
// ---------------------------------------------------------------------------

interface Grip {
  hand: Vec;
  /** Direction the weapon points (unit). */
  dir: Vec;
  /** Perpendicular (unit), on the "back/top" side of the blade. */
  n: Vec;
  side: Side;
  /** Design units available from the hand along `dir` before leaving the canvas. */
  room: number;
}

function gripOf(g: DrawCtx, angle: number, side: Side = 'N'): Grip {
  const j = armJoints(g.rig, side);
  const dir = fromAngle(angle);
  // "Back" of the blade: the perpendicular that points more upward.
  let n = perp(dir);
  if (n.y > 0 || (Math.abs(n.y) < 0.15 && n.x > 0)) n = scale(n, -1);
  const lim = (p: number, d: number) => (d > 1e-3 ? (UNITS - 1 - p) / d : d < -1e-3 ? (p - 1) / -d : 999);
  const room = Math.min(lim(j.hand.x, dir.x), lim(j.hand.y, dir.y));
  return { hand: j.hand, dir, n, side, room };
}

/** Wrapped grip with a diamond pattern (fine detail). */
function wrappedHandle(L: Layer, a: Vec, b: Vec, r: number, pen: Pen, wrap: Pen): void {
  capsule(L, a, b, r, r, pen, 2);
  const d = norm(sub(b, a));
  const n = perp(d);
  const l = len(sub(b, a));
  for (let s = 0.4; s < l - 0.2; s += 0.9) {
    const p = add(a, scale(d, s));
    px(L, p.x + n.x * r * 0.3, p.y + n.y * r * 0.3, wrap, 4);
    const q = add(a, scale(d, s + 0.45));
    px(L, q.x - n.x * r * 0.3, q.y - n.y * r * 0.3, wrap, 3);
  }
}

/** Single-edged slightly curved blade with an edge highlight and a fuller line. */
function katanaBlade(L: Layer, base: Vec, gp: Grip, length: number, width: number, pen: Pen, curve = 0.9): void {
  const { dir, n } = gp;
  const at = (t: number, off: number) => add(add(base, scale(dir, length * t)), scale(n, curve * t * t + off));
  const back: Vec[] = [];
  const edge: Vec[] = [];
  const K = 10;
  for (let i = 0; i <= K; i++) {
    const t = (i / K) * 0.9;
    back.push(at(t, width * 0.5));
    edge.push(at(t, -width * 0.5));
  }
  const tip = at(1, width * 0.45);
  const kissaki = at(0.94, -width * 0.25);
  poly(L, [...back, tip, kissaki, ...edge.reverse()], pen, 3);
  // Lit back edge, bright cutting edge, dark fuller groove.
  for (let i = 0; i < K; i++) {
    const t0 = (i / K) * 0.9;
    const t1 = ((i + 1) / K) * 0.9;
    paintOver(L, at(t0, width * 0.18), at(t1, width * 0.18), pen, 2);
    paintOver(L, at(t0, -width * 0.32), at(t1, -width * 0.32), pen, 5);
  }
  paintOver(L, at(0.92, -width * 0.1), tip, pen, 5);
}

function drawNaginata(g: DrawCtx, gp: Grip, c: { blade: string; shaft: string; fittings: string }, depth: 'nearArm.held' | 'backGear' = 'nearArm.held'): void {
  const L = g.L(depth);
  const part = 'held';
  const blade: Pen = { mat: g.m(c.blade, 'metal'), part };
  const shaft: Pen = { mat: g.m(c.shaft, 'leather'), part };
  const fit: Pen = { mat: g.m(c.fittings, 'metal'), part };
  const { hand, dir, n } = gp;
  // Keep the blade on the canvas when thrusting forward.
  const room = gp.room - 10.5;
  const butt = add(hand, scale(dir, -11));
  const head = add(hand, scale(dir, Math.max(6, Math.min(14, room))));
  capsule(L, butt, head, 0.75, 0.75, shaft);
  // wood grain highlight line
  paintOver(L, add(add(butt, scale(n, 0.25)), scale(dir, 0.6)), add(head, scale(n, 0.25)), shaft, 4);
  capsule(L, add(butt, scale(dir, -0.6)), add(butt, scale(dir, 0.8)), 0.75, 0.75, fit);
  // Collar where the blade is mounted, plus a small guard.
  capsule(L, add(head, scale(dir, -1.6)), head, 0.85, 0.85, fit);
  capsule(L, add(head, scale(n, 1.3)), add(head, scale(n, -1.3)), 0.5, 0.5, fit);
  const bgp: Grip = { ...gp };
  katanaBlade(L, add(head, scale(dir, 0.3)), bgp, 10, 2.8, blade, 1.8);
}

/** Moving around the map, a held technique stays in the near hand whatever the other hand does. */
const MOVING = new Set(['walk', 'run', 'crouch', 'sneak']);

/** The hand that holds a technique: the open one (cast uses the far hand), else the near hand. */
function techniqueSide(g: DrawCtx): Side {
  if (g.rig.shapeN === 'open') return 'N';
  if (g.rig.shapeF === 'open' && !MOVING.has(g.rig.pose)) return 'F';
  return 'N';
}

function palmPoint(g: DrawCtx, s: Side, out = 1.4): Vec {
  const j = armJoints(g.rig, s);
  const dir = norm(sub(j.hand, j.wrist));
  return add(j.hand, scale(dir, g.bp.handR * out));
}

/** Swirling sphere of chakra with spiral arms that rotate per frame. */
export function drawSpiralOrb(g: DrawCtx, c: { core: string; swirl: string }): void {
  const s = techniqueSide(g);
  const part = s === 'N' ? 'held' : 'handF';
  const R = 3.8;
  const p = palmPoint(g, s, 1 + R / g.bp.handR * 0.75);
  const L = g.L('nearArm.over');
  const core: Pen = { mat: g.m(c.core, 'glow'), part };
  ellipse(L, p.x, p.y, R, R, core, (x, y) => {
    const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) / R;
    const lit = (x + 0.5 - p.x) * -0.7 + (y + 0.5 - p.y) * -0.7 > 0.6;
    return d < 0.22 ? 5 : d > 0.8 ? (lit ? 3 : 2) : lit ? 4 : 3;
  });
  // Spiral arms
  const sw: Pen = { mat: g.m(c.swirl, 'glow'), part, flags: F_NO_OUTLINE };
  const ph = g.rig.frame * 1.3;
  for (let arm = 0; arm < 3; arm++) {
    for (let k = 0; k < 14; k++) {
      const t = k / 14;
      const a = ph + arm * ((Math.PI * 2) / 3) + t * 3.6;
      const r = 0.4 + t * (R - 0.6);
      const q = v(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.9);
      px(L, q.x, q.y, sw, t < 0.6 ? 5 : 4);
      if (t > 0.25) px(L, q.x + 0.5, q.y, sw, 4);
    }
  }
  // Loose wisps outside the sphere (no outline, top-most).
  const T = g.L('top');
  for (let k = 0; k < 4; k++) {
    const a = ph * 0.8 + k * 1.7;
    const r = R + 0.8 + (k % 2) * 0.6;
    px(T, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, sw, 5);
    px(T, p.x + Math.cos(a + 0.12) * r, p.y + Math.sin(a + 0.12) * r, sw, 4);
  }
}

/** Small deterministic PRNG so sparks change per frame but never flicker randomly. */
function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function bolt(L: Layer, from: Vec, dirDeg: number, length: number, rnd: () => number, pen: Pen, shade: number): Vec {
  let p = from;
  let ang = dirDeg;
  const steps = Math.max(2, Math.round(length / 1.2));
  for (let i = 0; i < steps; i++) {
    ang += (rnd() - 0.5) * 80;
    const q = add(p, scale(fromAngle(ang), 1.2));
    line(L, p, q, pen, shade);
    p = q;
  }
  return p;
}

export function drawLightning(g: DrawCtx, c: { spark: string; core: string }): void {
  const s: Side = g.rig.shapeF === 'open' && g.rig.pose === 'cast' ? 'F' : 'N';
  const j = armJoints(g.rig, s);
  const part = s === 'N' ? 'held' : 'handF';
  const center = j.hand;
  // Glow behind the hand
  const back = g.L(s === 'N' ? 'nearArm.held' : 'farArm.held');
  const core: Pen = { mat: g.m(c.core, 'glow'), part };
  ellipse(back, center.x, center.y, g.bp.handR + 1.4, g.bp.handR + 1.4, core, (x, y) => (Math.hypot(x + 0.5 - center.x, y + 0.5 - center.y) < g.bp.handR + 0.6 ? 5 : 4));
  // Crackling bolts on top
  const T = g.L('top');
  const spark: Pen = { mat: g.m(c.spark, 'glow'), part, flags: F_NO_OUTLINE };
  const rnd = prng(977 + g.rig.frame * 131 + (g.rig.pose.length << 4));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (360 / n) * i + rnd() * 40;
    const start = add(center, scale(fromAngle(a), g.bp.handR * 0.6));
    const end = bolt(T, start, a, 3.5 + rnd() * 2.5, rnd, spark, i % 2 ? 5 : 4);
    if (i % 2 === 0) bolt(T, end, a + 50, 1.6, rnd, spark, 3);
  }
  // Bright core pixels over the knuckles
  for (let k = 0; k < 5; k++) px(T, center.x + (rnd() - 0.5) * 2.4, center.y + (rnd() - 0.5) * 2.4, spark, 5);
}

function drawPalmGlow(g: DrawCtx, c: { glow: string }): void {
  const s = techniqueSide(g);
  const part = s === 'N' ? 'held' : 'handF';
  const p = palmPoint(g, s, 0.8);
  const L = g.L(s === 'N' ? 'nearArm.held' : 'farArm.held');
  const pen: Pen = { mat: g.m(c.glow, 'glow'), part };
  const pulse = g.rig.frame % 2 ? 0.4 : 0;
  const R = g.bp.handR + 1.8 + pulse;
  ellipse(L, p.x, p.y, R, R, pen, (x, y) => {
    const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) / R;
    return d < 0.45 ? 5 : d < 0.75 ? 4 : 3;
  });
  // Dithered outer halo (no outline) for a soft falloff.
  const T = g.L('top');
  const halo: Pen = { ...pen, flags: F_NO_OUTLINE };
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + g.rig.frame * 0.4;
    const r = R + 0.9 + (k % 2) * 0.5;
    px(T, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, halo, k % 3 === 0 ? 5 : 4);
  }
}

// While the hands are busy (hand signs, a grimoire, a charged cast) each weapon
// is stowed by its size (small ones at the belt, big ones on the back) and
// held techniques fade.

/** A point on the torso in local units, following the breathing of the chest. */
const stowAt = (g: DrawCtx, x: number, y: number): Vec => topPt(g)(x, y);

const HIP_TACKLE = 0.45;

/** Katana: sheathed at the hip, hilt forward (like the Hip Katana accessory). */
function stowKatanaAtHip(g: DrawCtx, hilt: string, guard: string): void {
  const b = g.bp;
  const dirBack = g.rig.pose === 'tackle' ? norm(add(scale(g.rig.right, -HIP_TACKLE), scale(g.rig.up, -1))) : norm(add(scale(g.rig.right, -1), scale(g.rig.up, -0.62)));
  sheathedSword(g, g.L('waist'), g.rig.T(b.waistHalf * 0.6 + 3.2, 5.6), dirBack, { sheath: '#2a1e1e', hilt, guard }, { hilt: 3.8, sheath: 14, part: 'pelvis' });
}

/** Big blades and polearms ride diagonally across the back, the hilt or blade over the near shoulder. */
function backGrip(g: DrawCtx, deg: number): Vec {
  const b = g.bp;
  return stowAt(g, -b.shoulderHalf - 2.4, b.torsoLen + 2.8 - (deg < 0 ? 9 : 0));
}

const TACKLE_BACK = 30;

/**
 * The angle a weapon stowed on the back is drawn at (`deg`: the one it rides at standing). The
 * weapon techniques pitch the body far forward (the release of 'throw', the lunge of 'pierce', the
 * shoulder of 'tackle'): the weapon turns with the back there, so its blade stays behind the body
 * instead of sticking out under the chin. Every other pose keeps it at `deg`.
 */
const backAngle = (g: DrawCtx, deg: number): number => (g.rig.pose === 'throw' || g.rig.pose === 'pierce' ? deg + g.rig.lean : g.rig.pose === 'tackle' ? deg + Math.min(g.rig.lean, TACKLE_BACK) : deg);

/**
 * Knocked out, a weapon lies dropped on the ground in front of the body. The
 * figure is drawn upright and laid down afterwards (Rig.lay), so the ground is
 * the upright line x = lay.groundX: a weapon drawn pointing up along it ends up
 * lying flat toward the head, lit edge on top. `at` is how far down the body
 * (0 hips .. 1 ankles) its grip lies.
 */
function droppedGrip(g: DrawCtx, at: number, off = 1.2): Vec {
  const r = g.rig;
  const x = (r.lay?.groundX ?? r.pelvis.x + 4) - off;
  return v(x, lerp(r.pelvis, r.ankleN, at).y);
}

/** Hands without a weapon winding up a throw (or that caught the kunai they threw) hold a kunai from the pouch (see throwsKunai), in the Kunai item's colours. */
export function drawThrowKunai(g: DrawCtx): void {
  if (throwsKunai(g)) drawWeapon(g, 'nearArm.held', KUNAI, gripPoint(g), swordAngle(g), { blade: '#aab4c2', grip: '#3a3346', guard: '#aab4c2', wrap: '#e2dccb' });
}

/** The flame longsword's colours: its blade and jewels turned from his flame red, its gold from his gold. */
const flameSwordTint =
  (flame: string, gold: string) =>
  (ch: string, hex: string): string =>
    FLAME_LONGSWORD.flame.includes(ch) ? retintHex(hex, FLAME_SWORD_FLAME, flame) : FLAME_LONGSWORD.gold.includes(ch) ? retintHex(hex, FLAME_SWORD_GOLD, gold) : hex;

export const HELD_ITEMS: ItemDef[] = [
  {
    id: 'held_none',
    slot: 'held',
    name: 'Empty Hands',
    desc: 'Nothing in hand — ready for taijutsu.',
    colors: [],
    draw: () => {},
  },
  {
    id: 'held_katana',
    slot: 'held',
    name: 'Katana',
    desc: 'A curved single-edged blade built from parts in the style of the nichirin swords: steel, blade, guard and hilt.',
    colors: [],
    // The parts the owner approved (2026-10-20); a nichirin blade takes the colour of the chakra.
    parts: KATANA_PARTS,
    partsPreview: (look, parts) => katanaTemplate(parts, chakraHex(look.chakra)),
    draw: (g, _colors, parts) => {
      const t = katanaTemplate(parts, chakraHex(g.look.chakra));
      if (handsBusy(g)) {
        const { hilt, guard } = katanaHipColors(parts);
        stowKatanaAtHip(g, hilt, guard);
      } else if (handsLimp(g)) drawPaintedWeapon(g, 'nearArm.held', t, droppedGrip(g, 0.55), -86);
      else if (!handsReleased(g)) drawPaintedWeapon(g, 'nearArm.held', t, gripPoint(g), swordAngle(g));
    },
  },
  {
    id: 'held_crystal',
    slot: 'held',
    name: 'Crystal Greatsword',
    desc: 'A huge blade of pale-blue crystal that glitters with every swing.',
    colors: [col('blade', 'Crystal', '#8ccbe8', 'metal'), col('hilt', 'Grip', '#2a3348', 'leather'), col('guard', 'Guard', '#6f97c0', 'metal')],
    draw: (g, [blade, hilt, guard]) => {
      const c = { blade, grip: hilt, guard, wrap: '#8a9bb8' };
      if (handsBusy(g)) drawWeapon(g, 'backGear', CRYSTAL_SWORD, backGrip(g, 48), backAngle(g, 48), c);
      else if (handsLimp(g)) drawWeapon(g, 'nearArm.held', CRYSTAL_SWORD, droppedGrip(g, 0.7), -86, c);
      else if (!handsReleased(g)) drawWeapon(g, 'nearArm.held', CRYSTAL_SWORD, gripPoint(g), swordAngle(g), c);
    },
  },
  {
    id: 'held_ice_crystal',
    slot: 'held',
    name: 'Ice Crystal Sword',
    desc: 'A long ice-blue crystal blade with a near-white edge under a steel cross-guard, its grip wrapped in dark blue: painted by the owner, as his Solen holds it.',
    colors: [col('blade', 'Crystal', ICE_SWORD_BLADE, 'metal')],
    draw: (g, [c]) => {
      // The owner's sword on his Solen, his pixels (the new standard, 2026-10-21; tools/refs/
      // solen-sword-from-ref.py): his repaint of this sword, held as the flame longsword is, by its grip
      // at the hand joint at his angle, so at rest every pixel is his. His black line stays; every other
      // colour moves the way his crystal blue does. The crystal blue it had before his repaint, which
      // saved characters carry, now means his.
      const blade = c.toLowerCase() === '#74aac4' ? ICE_SWORD_BLADE : c;
      const tint = (_ch: string, hex: string) => (ICE_SWORD_KIND[hex] === 'line' ? hex : retintHex(hex, ICE_SWORD_BLADE, blade));
      // His black line kept whole as the sword turns (rotateLined).
      const iceLine = (hex: string) => ICE_SWORD_KIND[hex] === 'line';
      if (handsBusy(g)) drawPaintedWeapon(g, 'backGear', ICE_SWORD, backGrip(g, 48), backAngle(g, 48), tint, iceLine);
      else if (handsLimp(g)) drawPaintedWeapon(g, 'nearArm.held', ICE_SWORD, droppedGrip(g, 0.7), -86, tint, iceLine);
      else if (!handsReleased(g)) drawPaintedWeapon(g, 'nearArm.held', ICE_SWORD, g.rig.handN, swordAngle(g), tint, iceLine);
    },
  },
  {
    id: 'held_flame_sword',
    slot: 'held',
    name: 'Flame Longsword',
    desc: 'A long blade burning red, orange and yellow under a gold cross-guard, a red jewel in its pommel: the owner painted it for Aiden.',
    colors: [col('blade', 'Flame', FLAME_SWORD_FLAME, 'glow'), col('guard', 'Guard', FLAME_SWORD_GOLD, 'metal')],
    draw: (g, [flame, gold]) => {
      const tint = flameSwordTint(flame, gold);
      if (handsBusy(g)) drawPaintedWeapon(g, 'backGear', FLAME_LONGSWORD, backGrip(g, 48), backAngle(g, 48), tint);
      else if (handsLimp(g)) drawPaintedWeapon(g, 'nearArm.held', FLAME_LONGSWORD, droppedGrip(g, 0.7), -86, tint);
      // His grip crosses his fist at the hand joint (higher in the fist than our other blades' grip
      // point): held there, at rest every pixel is his and his gauntlet's place is our fist's.
      else if (!handsReleased(g)) drawPaintedWeapon(g, 'nearArm.held', FLAME_LONGSWORD, g.rig.handN, swordAngle(g), tint);
    },
  },
  {
    id: 'held_kunai',
    slot: 'held',
    name: 'Kunai',
    desc: 'A throwing knife with a ring pommel and wrapped grip.',
    colors: [col('blade', 'Blade', '#aab4c2', 'metal'), col('wrap', 'Wrap', '#3a3346')],
    draw: (g, [blade, wrap]) => {
      const c = { blade, grip: wrap, guard: blade, wrap: '#e2dccb' };
      if (handsBusy(g)) drawWeapon(g, 'waist', KUNAI, g.rig.T(-g.bp.hipHalf * 0.55, 3.6), 100, c);
      else if (handsLimp(g)) drawWeapon(g, 'nearArm.held', KUNAI, droppedGrip(g, 0.15, 0.9), -80, c);
      else if (!handsReleased(g)) drawWeapon(g, 'nearArm.held', KUNAI, gripPoint(g), swordAngle(g), c);
    },
  },
  {
    id: 'held_naginata',
    slot: 'held',
    name: 'Naginata',
    desc: 'A long polearm topped with a curved blade.',
    colors: [col('blade', 'Blade', '#d4dbe4', 'metal'), col('shaft', 'Shaft', '#5a3622', 'leather'), col('fit', 'Fittings', '#c9a227', 'metal')],
    draw: (g, [blade, shaft, fittings]) => {
      const c = { blade, shaft, fittings };
      if (handsBusy(g)) drawNaginata(g, { ...gripOf(g, backAngle(g, -62)), hand: backGrip(g, -62), room: 99 }, c, 'backGear');
      else if (handsLimp(g)) drawNaginata(g, { ...gripOf(g, -88), hand: droppedGrip(g, 0.6, 0.8), room: 99 }, c);
      else if (!handsReleased(g)) drawNaginata(g, { ...gripOf(g, poleAngle(g)), hand: gripPoint(g) }, c);
    },
  },
  {
    id: 'held_spiral',
    slot: 'held',
    name: 'Spiral Orb',
    desc: 'A swirling sphere of compressed chakra held in the palm.',
    colors: [col('core', 'Core', '#4aa8ff', 'glow'), col('swirl', 'Swirl', '#d8f1ff', 'glow')],
    draw: (g, [core, swirl]) => !handsBusy(g) && !handsLimp(g) && !handsReleased(g) && !throwsKunai(g) && drawSpiralOrb(g, { core, swirl }),
  },
  {
    id: 'held_lightning',
    slot: 'held',
    name: 'Lightning Hand',
    desc: 'Crackling white-blue sparks dance around the hand.',
    colors: [col('spark', 'Sparks', '#d6f0ff', 'glow'), col('core', 'Glow', '#5cb8ff', 'glow')],
    draw: (g, [spark, core]) => !handsBusy(g) && !handsLimp(g) && !handsReleased(g) && !throwsKunai(g) && drawLightning(g, { spark, core }),
  },
  {
    id: 'held_palm',
    slot: 'held',
    name: 'Palm Glow',
    desc: 'A calm pale-cyan glow gathered in the palm.',
    colors: [col('glow', 'Glow', '#8ff0ea', 'glow')],
    draw: (g, [glow]) => !handsBusy(g) && !handsLimp(g) && !handsReleased(g) && !throwsKunai(g) && drawPalmGlow(g, { glow }),
  },
];

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------

const flatPen = (g: DrawCtx, hex: string): Pen => ({ mat: g.m(hex, 'flat'), part: 'head', flags: F_NO_OUTLINE });

/** Fine 1px line in head-local coords. */
function hline(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, pen: Pen, shade = 3): void {
  line(L, hd(g, x0, y0), hd(g, x1, y1), pen, shade);
}

/** Copies the head silhouette (head.body pixels) inside a head-local region into a layer. */
function headRegion(g: DrawCtx, L: Layer, pen: Pen, keep: (x: number, y: number) => boolean, shade: (x: number, y: number) => number): void {
  // head.body and head.mask share the head-group transform, so their fine
  // pixels line up 1:1; local coordinates are recovered through the inverse.
  const H = g.L('head.body');
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const k = L.xf ? L.xf.k : 1;
  for (let fy = fine(hy - 10); fy <= fine(hy + 10); fy++) {
    for (let fx = fine(hx - 10); fx <= fine(hx + 10); fx++) {
      if (!H.has(fx, fy)) continue;
      const x = ((fx + 0.5) / RES - hx) / k;
      const y = ((fy + 0.5) / RES - hy) / k;
      if (!keep(x, y)) continue;
      L.set(fx, fy, pen.mat, shade(x, y) + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
}

/** Porcelain animal mask (fox / cat). */
function animalMask(g: DrawCtx, c: { base: string; paint: string; eyes: string }, kind: 'fox' | 'cat'): void {
  const L = g.L('head.mask');
  const base: Pen = { mat: g.m(c.base, 'cloth'), part: 'head' };
  const shadeAt = (x: number, y: number) => {
    // Rounded face plate lit from the upper-left; the side of the head falls into shadow.
    if (x < -2.4) return 2;
    if (y > 5.5) return 2;
    if (x < 0.6 && y < 1) return 4;
    return 3;
  };
  headRegion(g, L, base, (x, y) => x > -3.6 && y > -5.2 && y < 7.6, shadeAt);
  // Snout (fox) or soft cheeks (cat) poking past the face in 3/4 view.
  if (kind === 'fox') {
    poly(L, [hd(g, 3.6, 1.2), hd(g, 8.6, 3.4), hd(g, 8.2, 4.4), hd(g, 4, 5.6)], base, (_x, y) => (y + 0.5 < g.rig.head.y + 3.4 ? 4 : 2));
    px(L, g.rig.head.x + 8.2, g.rig.head.y + 3.5, flatPen(g, '#1b1420'));
    px(L, g.rig.head.x + 7.7, g.rig.head.y + 3.5, flatPen(g, '#1b1420'));
  } else {
    ellipse(L, g.rig.head.x + 5.6, g.rig.head.y + 4, 1.9, 1.6, base, 3);
    px(L, g.rig.head.x + 6.6, g.rig.head.y + 3.2, flatPen(g, '#e58a9a'));
    px(L, g.rig.head.x + 7.1, g.rig.head.y + 3.2, flatPen(g, '#e58a9a'));
    px(L, g.rig.head.x + 6.6, g.rig.head.y + 3.7, flatPen(g, '#e58a9a'));
  }
  // Eye holes
  const hole = flatPen(g, c.eyes);
  const slant = kind === 'fox' ? 0.5 : 0;
  for (const [x0, x1] of [
    [-1.5, 1.5],
    [3, 5],
  ]) {
    for (let x = x0; x < x1; x += 0.5) {
      const t = (x - x0) / (x1 - x0);
      const yy = 1 - slant * t;
      px(L, g.rig.head.x + x, g.rig.head.y + yy, hole);
      px(L, g.rig.head.x + x, g.rig.head.y + yy + 0.5, hole);
      if (kind === 'cat') px(L, g.rig.head.x + x, g.rig.head.y + yy + 1, hole);
    }
  }
  // Painted lines
  const paint = flatPen(g, c.paint);
  if (kind === 'fox') {
    hline(g, L, -1.8, -0.2, 1.6, -1.2, paint); // brow flicks
    hline(g, L, -1.8, 0.3, 1.6, -0.7, paint);
    hline(g, L, 3, -0.6, 5.2, -1.4, paint);
    hline(g, L, -2.6, 3, -0.6, 2.6, paint); // cheek stripes
    hline(g, L, -2.6, 4, -0.6, 3.8, paint);
    hline(g, L, 0.5, -3.2, 1.6, -4.6, paint); // forehead flame
    hline(g, L, 1, -3.2, 1.6, -4.2, paint);
    hline(g, L, 4.4, 5.2, 7, 4.4, paint); // mouth line
  } else {
    hline(g, L, -1.6, 2.6, 1.4, 2.6, paint); // under-eye
    hline(g, L, 3, 2.6, 5, 2.6, paint);
    hline(g, L, -2.8, 4, -0.6, 3.8, paint); // whiskers
    hline(g, L, -2.8, 5, -0.6, 4.8, paint);
    hline(g, L, 0.6, -2, 0.6, -4.5, paint); // forehead stripes
    hline(g, L, 2, -2, 2, -4, paint);
    hline(g, L, -0.8, -2, -0.8, -3.6, paint);
  }
  // Ears on top of the head (over the hair).
  const E = g.L('head.gear');
  const inner: Pen = { mat: g.m(c.paint, 'cloth'), part: 'head' };
  const ears: [number, number, number, number, number, number][] =
    kind === 'fox'
      ? [
          [-4.6, -5, -0.8, -6.6, -3.6, -12.2],
          [1, -6.8, 4.8, -5.2, 4.4, -11.6],
        ]
      : [
          [-4.4, -5.2, -0.8, -6.6, -3.4, -10],
          [1, -6.8, 4.6, -5.4, 4, -9.8],
        ];
  ears.forEach(([ax, ay, bx, by, tx, ty], i) => {
    const a = hd(g, ax, ay);
    const b = hd(g, bx, by);
    const t = hd(g, tx, ty);
    if (kind === 'fox') poly(E, [a, t, b], { ...base, bias: i ? 0 : -0 }, i ? 3 : 4);
    else {
      const m = lerp(a, b, 0.5);
      poly(E, [a, add(lerp(a, t, 0.75), v(-0.5, 0)), t, add(lerp(b, t, 0.75), v(0.5, 0)), b, add(m, v(0, 0.6))], base, i ? 3 : 4);
    }
    const ia = lerp(a, b, 0.25);
    const ib = lerp(a, b, 0.75);
    const it = lerp(lerp(a, b, 0.5), t, 0.72);
    poly(E, [add(ia, v(0, -0.4)), it, add(ib, v(0, -0.4))], inner, 3);
  });
}

export const FACE_ITEMS: ItemDef[] = [
  {
    id: 'face_beast',
    slot: 'face',
    name: 'Beast Marks',
    desc: 'Three whisker-like marks on each cheek.',
    colors: [col('mark', 'Marks', '#3b2a2e', 'flat')],
    draw: (g, [c]) => {
      const L = g.L('head.mask');
      const p = flatPen(g, c);
      // Near cheek (between the ear and the nose) and the far cheek.
      for (const [k, y] of [
        [0, 3.6],
        [1, 4.4],
        [2, 5.2],
      ]) {
        hline(g, L, -2.2 + k * 0.3, y - 0.3 + k * 0.1, 0, y + (k - 1) * 0.3, p);
        hline(g, L, 4.6, y + (k - 1) * 0.3, 6, y - 0.1 + k * 0.1, p);
      }
    },
  },
  {
    id: 'face_scar',
    slot: 'face',
    name: 'Battle Scar',
    desc: 'An old diagonal scar running across the near eye and cheek.',
    colors: [col('scar', 'Scar', '#b0505a', 'flat')],
    draw: (g, [c]) => {
      const L = g.L('head.mask');
      const p = flatPen(g, c);
      const hi = flatPen(g, '#f2b9a8');
      const a = hd(g, -1.9, -3);
      const b = hd(g, 1.3, 5.6);
      const steps = 44;
      for (let i = 0; i <= steps; i++) {
        const q = lerp(a, b, i / steps);
        const ly = q.y - g.rig.head.y;
        if (ly > -0.1 && ly < 3.1) continue; // the eye stays visible
        px(L, q.x, q.y, p);
        px(L, q.x - 0.5, q.y, hi);
      }
      // Stitch marks across the scar
      for (const t of [0.1, 0.72, 0.86]) {
        const q = lerp(a, b, t);
        px(L, q.x - 0.5, q.y - 0.5, p);
        px(L, q.x + 0.5, q.y + 0.5, p);
      }
    },
  },
  {
    id: 'face_sage',
    slot: 'face',
    name: 'Sage Markings',
    desc: 'Orange pigment painted around the eyes, a sign of nature energy.',
    colors: [col('pigment', 'Pigment', '#e8701a', 'flat')],
    draw: (g, [c]) => {
      const L = g.L('head.mask');
      const p = flatPen(g, c);
      const hx = g.rig.head.x;
      const hy = g.rig.head.y;
      const P = (x: number, y: number) => px(L, hx + x, hy + y, p);
      // Pigment over the lids (between brow and lashes) sweeping out past the corners.
      for (let x = -2.5; x <= 1.5; x += 0.5) P(x, -0.5);
      P(-3, 0);
      P(-3, 0.5);
      P(-2.5, 0);
      for (let x = 2.5; x <= 5.5; x += 0.5) P(x, -0.5);
      P(5.5, 0);
      P(5.5, 0.5);
      // Crescents under the eyes
      for (let x = -1.5; x <= 1; x += 0.5) P(x, 3.5);
      P(-2, 3);
      for (let x = 3; x <= 4.5; x += 0.5) P(x, 3);
    },
  },
  {
    id: 'face_warpaint',
    slot: 'face',
    name: 'War Paint',
    desc: 'Bold red stripes painted beneath the eyes.',
    colors: [col('paint', 'Paint', '#c81e2a', 'flat')],
    draw: (g, [c]) => {
      const L = g.L('head.mask');
      const p = flatPen(g, c);
      const stripe = (x: number, y0: number, y1: number, w = 1) => {
        for (let y = y0; y <= y1; y += 0.5) for (let k = 0; k < w; k += 0.5) px(L, g.rig.head.x + x + k - (y - y0) * 0.25, g.rig.head.y + y, p);
      };
      stripe(-1.4, 3.5, 5.5, 1);
      stripe(0.4, 3.5, 5, 1);
      stripe(4.4, 3, 4.5, 1);
    },
  },
  {
    id: 'face_clothmask',
    slot: 'face',
    name: 'Cloth Mask',
    desc: 'A dark cloth mask that covers the face from the nose down.',
    colors: [col('cloth', 'Cloth', '#2a2d3a')],
    draw: (g, [c]) => {
      const L = g.L('head.mask');
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'head' };
      headRegion(
        g,
        L,
        pen,
        (x, y) => y > 2.4 + Math.max(0, -x - 1) * 0.35 && x > -4.6,
        (x, y) => (x < -2.6 ? 2 : y < 3.6 && x < 2 ? 4 : x > 4.2 ? 2 : 3),
      );
      // Nose bridge bump and the cloth tucked under the chin.
      poly(L, [hd(g, 4.5, 2.6), hd(g, 6.9, 3.4), hd(g, 6.6, 4.6), hd(g, 4.5, 4.6)], pen, 3);
      poly(L, [hd(g, -3.8, 5.5), hd(g, 4.4, 6.4), hd(g, 3.4, 9), hd(g, -2.6, 9)], pen, 2);
      // Fold lines
      seam(L, hd(g, 0.2, 4.2), hd(g, 3.2, 5.6), -1);
      seam(L, hd(g, -1.6, 5.4), hd(g, 1.8, 7.2), -1);
      seam(L, hd(g, 4.9, 3), hd(g, 6.4, 3.4), 1);
    },
  },
  {
    id: 'face_foxmask',
    slot: 'face',
    name: 'Fox Mask',
    desc: 'A white porcelain fox mask with red painted markings.',
    colors: [col('base', 'Porcelain', '#f2eee6'), col('paint', 'Paint', '#cf2a2a'), col('eyes', 'Eye Holes', '#1b1420', 'flat')],
    draw: (g, [base, paint, eyes]) => animalMask(g, { base, paint, eyes }, 'fox'),
  },
  {
    id: 'face_catmask',
    slot: 'face',
    name: 'Cat Mask',
    desc: 'A white porcelain cat mask with teal painted markings.',
    colors: [col('base', 'Porcelain', '#f2eee6'), col('paint', 'Paint', '#1f9e9a'), col('eyes', 'Eye Holes', '#1b1420', 'flat')],
    draw: (g, [base, paint, eyes]) => animalMask(g, { base, paint, eyes }, 'cat'),
  },
];

// ---------------------------------------------------------------------------
// Accessories (stackable)
// ---------------------------------------------------------------------------

/** Keep-callback that clips to the torso (body + clothes + armor). */
function torsoClip(g: DrawCtx) {
  const layers = (['torso.body', 'torso.top', 'torso.armor', 'torso.over', 'torso.bottom'] as const).map((d) => g.L(d));
  return (x: number, y: number) => {
    const fx = fine(x + 0.5);
    const fy = fine(y + 0.5);
    return layers.some((l) => l.has(fx, fy));
  };
}

/** A diagonal strap across the torso with stitching along both edges. */
function strap(g: DrawCtx, L: Layer, a: Vec, b: Vec, w: number, pen: Pen): void {
  const n = norm(perp(sub(b, a)));
  const pts = [add(a, scale(n, w)), add(b, scale(n, w)), add(b, scale(n, -w)), add(a, scale(n, -w))];
  poly(L, pts, pen, (x, y) => {
    const d = (x + 0.5 - a.x) * n.x + (y + 0.5 - a.y) * n.y;
    return d * (n.y < 0 ? 1 : -1) > w * 0.35 ? 4 : d * (n.y < 0 ? 1 : -1) < -w * 0.45 ? 2 : 3;
  }, torsoClip(g));
  // Stitching: dashed lighter line along the middle.
  const l = len(sub(b, a));
  const d = norm(sub(b, a));
  for (let s = 0.5; s < l; s += 1) {
    const p = add(a, scale(d, s));
    const fx = fine(p.x);
    const fy = fine(p.y);
    if (L.has(fx, fy) && L.mat[fy * GRID + fx] === pen.mat) L.reshade(fx, fy, 4);
  }
}

/** Gold stud with a 1px shine. */
function stud(L: Layer, p: Vec, pen: Pen, r = 0.75): void {
  ellipse(L, p.x, p.y, r, r, pen, 3);
  px(L, p.x - r * 0.4, p.y - r * 0.4, { ...pen, flags: F_NO_OUTLINE }, 5);
}

/** A sheathed sword lying along a line (scabbard + guard + wrapped hilt). */
function sheathedSword(g: DrawCtx, L: Layer, hiltEnd: Vec, dir: Vec, c: { sheath: string; hilt: string; guard: string }, opts: { hilt?: number; sheath?: number; part?: Pen['part'] } = {}): void {
  const part = opts.part ?? 'back';
  const hl = opts.hilt ?? 4;
  const sl = opts.sheath ?? 13;
  const sheath: Pen = { mat: g.m(c.sheath, 'leather'), part };
  const hilt: Pen = { mat: g.m(c.hilt, 'leather'), part };
  const guard: Pen = { mat: g.m(c.guard, 'metal'), part };
  const n = perp(dir);
  const g0 = add(hiltEnd, scale(dir, hl));
  // Scabbard (slightly wider, lacquer shine line)
  const s1 = add(g0, scale(dir, sl));
  capsule(L, add(g0, scale(dir, 0.4)), s1, 0.95, 0.8, sheath);
  paintOver(L, add(add(g0, scale(dir, 1)), scale(n, 0.35)), add(s1, scale(n, 0.3)), sheath, 4, sheath.mat);
  capsule(L, add(s1, scale(dir, -1)), s1, 1, 0.85, guard);
  // Guard and hilt
  capsule(L, add(g0, scale(n, 1.2)), add(g0, scale(n, -1.2)), 0.55, 0.55, guard);
  wrappedHandle(L, hiltEnd, add(g0, scale(dir, -0.5)), 0.7, hilt, { ...hilt, mat: g.m('#d9d2c0', 'cloth') });
  capsule(L, add(hiltEnd, scale(dir, -0.5)), hiltEnd, 0.75, 0.75, guard);
}

/** Small kunai seen as a handle with a ring, poking out of a sheath/strap. */
function kunaiHandle(L: Layer, base: Vec, dir: Vec, metal: Pen, wrap: Pen): void {
  const top = add(base, scale(dir, 2));
  capsule(L, base, top, 0.5, 0.5, wrap, 3);
  const rc = add(top, scale(dir, 0.9));
  ellipse(L, rc.x, rc.y, 0.85, 0.85, metal, 4);
  px(L, rc.x, rc.y, { ...metal, flags: 0 }, 0);
}

function scrollShape(g: DrawCtx, L: Layer, a: Vec, b: Vec, r: number, c: { paper: string; caps: string; band: string }, part: Pen['part']): void {
  const paper: Pen = { mat: g.m(c.paper, 'cloth'), part };
  const caps: Pen = { mat: g.m(c.caps, 'leather'), part };
  const band: Pen = { mat: g.m(c.band, 'cloth'), part };
  const d = norm(sub(b, a));
  const n = perp(d);
  const up = n.y < 0 ? n : scale(n, -1);
  const lit = (x: number, y: number) => {
    const o = (x + 0.5 - a.x) * up.x + (y + 0.5 - a.y) * up.y;
    return o > r * 0.35 ? 4 : o < -r * 0.45 ? 2 : 3;
  };
  capsule(L, a, b, r, r, paper, lit);
  // Wound-paper lines and the binding band
  const l = len(sub(b, a));
  for (let s = 1.2; s < l - 1; s += 1.6) paintOver(L, add(add(a, scale(d, s)), scale(up, r * 0.8)), add(add(a, scale(d, s + 0.3)), scale(up, -r * 0.8)), paper, 2, paper.mat);
  const m0 = add(a, scale(d, l * 0.5 - 0.6));
  const m1 = add(a, scale(d, l * 0.5 + 0.6));
  capsule(L, m0, m1, r + 0.15, r + 0.15, band, lit);
  // End caps (rollers)
  capsule(L, add(a, scale(d, -0.8)), add(a, scale(d, 0.6)), r + 0.35, r + 0.35, caps, lit);
  capsule(L, add(b, scale(d, -0.6)), add(b, scale(d, 0.8)), r + 0.35, r + 0.35, caps, lit);
}

/** Clears pixels of a front layer that cover the head, so wraps sit under the chin. */
function tuckUnderChin(g: DrawCtx, L: Layer): void {
  const H = g.L('head.body');
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  for (let fy = fine(hy - 9); fy <= fine(hy + 9); fy++) {
    for (let fx = fine(hx - 9); fx <= fine(hx + 9); fx++) if (H.has(fx, fy) && L.has(fx, fy)) L.clear(fx, fy);
  }
}

export const ACCESSORY_ITEMS: ItemDef[] = [
  {
    id: 'acc_kunai_leg',
    slot: 'accessory',
    name: 'Leg Kunai Holster',
    desc: 'A holster strapped to the thigh, with kunai handles ready to draw.',
    colors: [col('holster', 'Holster', '#2f3442', 'leather'), col('strap', 'Straps', '#e2dccb'), col('metal', 'Kunai', '#a7b0bd', 'metal')],
    draw: (g, [h, s, m]) => {
      const L = g.L('nearLeg.armor');
      const r = g.rig;
      const hp: Pen = { mat: g.m(h, 'leather'), part: 'thighN' };
      const sp: Pen = { mat: g.m(s, 'cloth'), part: 'thighN' };
      const mp: Pen = { mat: g.m(m, 'metal'), part: 'thighN' };
      const dir = norm(sub(r.kneeN, r.hipN));
      const n = perp(dir);
      const out = n.x < 0 ? n : scale(n, -1); // toward screen-left (outer side of the near thigh)
      const R = g.bp.legR[0];
      const a = add(legPoint(g, 'N', 0.3), scale(out, R * 0.15));
      const b = add(legPoint(g, 'N', 0.62), scale(out, R * 0.1));
      // Kunai first so the holster mouth covers their blades.
      kunaiHandle(L, add(a, scale(out, -0.2)), rot(scale(dir, -1), -12), mp, { ...hp, mat: g.m('#3a3346', 'cloth') });
      kunaiHandle(L, add(a, scale(out, 1.3)), rot(scale(dir, -1), -26), mp, { ...hp, mat: g.m('#3a3346', 'cloth') });
      poly(L, [add(a, scale(out, R * 0.9 + 0.4)), add(a, scale(out, -R * 0.55)), add(b, scale(out, -R * 0.45)), add(b, scale(out, R * 0.7))], hp, (x, y) => {
        const o = (x + 0.5 - a.x) * out.x + (y + 0.5 - a.y) * out.y;
        return o > R * 0.45 ? 4 : o < -R * 0.2 ? 2 : 3;
      });
      seam(L, add(a, scale(out, R * 0.9)), add(a, scale(out, -R * 0.5)), -1);
      // Two straps wrapping the thigh
      for (const t of [0.36, 0.56]) {
        const p = legPoint(g, 'N', t);
        const w = R + 0.35;
        capsule(L, add(add(p, scale(n, w)), scale(dir, -0.35)), add(add(p, scale(n, -w)), scale(dir, 0.35)), 0.45, 0.45, sp, 3);
      }
    },
  },
  {
    id: 'acc_kunai_shoulder',
    slot: 'accessory',
    name: 'Shoulder Kunai Strap',
    desc: 'A bandolier slung across the chest, lined with kunai.',
    colors: [col('strap', 'Strap', '#6b4a30', 'leather'), col('metal', 'Kunai', '#a7b0bd', 'metal'), col('wrap', 'Grips', '#e2dccb')],
    draw: (g, [s, m, w]) => {
      const L = g.L('torso.acc');
      const b = g.bp;
      const top = topPt(g);
      const sp: Pen = { mat: g.m(s, 'leather'), part: 'torso' };
      const a = top(-b.shoulderHalf * 0.75, b.torsoLen + 0.6);
      const z = g.rig.T(b.hipHalf * 0.62, 1.2);
      strap(g, L, a, z, 0.95, sp);
      const d = norm(sub(z, a));
      const mp: Pen = { mat: g.m(m, 'metal'), part: 'torso' };
      const wp: Pen = { mat: g.m(w, 'cloth'), part: 'torso' };
      const up = norm(add(g.rig.up, scale(g.rig.right, 0.25)));
      for (const t of [0.28, 0.45, 0.62]) {
        const p = lerp(a, z, t);
        // pocket
        capsule(L, add(p, scale(d, -0.7)), add(p, scale(d, 0.7)), 1.1, 1.1, sp, 2);
        kunaiHandle(L, add(p, scale(up, 0.6)), up, mp, wp);
      }
    },
  },
  {
    id: 'acc_giant_shuriken',
    slot: 'accessory',
    name: 'Giant Back Shuriken',
    desc: 'A huge four-point throwing star carried on the back.',
    colors: [col('metal', 'Steel', '#7c8696', 'metal'), col('wrap', 'Center Wrap', '#7a1f2b')],
    draw: (g, [m, w]) => {
      const L = g.L('backGear');
      const b = g.bp;
      const top = topPt(g);
      const c = top(-b.shoulderHalf - 1.8, b.torsoLen - 3.5);
      const mp: Pen = { mat: g.m(m, 'metal'), part: 'back' };
      const wp: Pen = { mat: g.m(w, 'cloth'), part: 'back' };
      const base = 45 + g.rig.lean * 0.5;
      const R = 9.5 + b.shoulderHalf * 0.25;
      for (let k = 0; k < 4; k++) {
        const ang = base + k * 90;
        const d = fromAngle(ang);
        const n = perp(d);
        const tip = add(c, scale(d, R));
        const l = add(add(c, scale(d, 2.4)), scale(n, 2.6));
        const rr = add(add(c, scale(d, 2.4)), scale(n, -2.6));
        // Each blade: lit face and shadowed face split along its spine.
        poly(L, [c, l, tip], mp, 4);
        poly(L, [c, tip, rr], mp, 2);
        paintOver(L, add(c, scale(d, 2)), add(c, scale(d, R - 1)), mp, 5, mp.mat);
      }
      ellipse(L, c.x, c.y, 2.4, 2.4, wp);
      ellipse(L, c.x, c.y, 0.8, 0.8, mp, 1);
    },
  },
  {
    id: 'acc_shield',
    slot: 'accessory',
    name: 'Round Shield',
    desc: 'A small round shield strapped to the off-hand forearm.',
    colors: [col('face', 'Face', '#6b4428', 'leather'), col('rim', 'Rim', '#a6aeb8', 'metal'), col('paint', 'Paint', '#8f1d24')],
    draw: (g, [f, rim, paint]) => {
      const L = g.L('farArm.held');
      const r = g.rig;
      const c = lerp(r.elbowF, r.wristF, 0.45);
      const fp: Pen = { mat: g.m(f, 'leather'), part: 'forearmF', bias: -1 };
      const rp: Pen = { mat: g.m(rim, 'metal'), part: 'forearmF', bias: -1 };
      const pp: Pen = { mat: g.m(paint, 'cloth'), part: 'forearmF', bias: -1 };
      const RX = 4.6 + g.bp.armR[2] * 0.3;
      const RY = 5.8 + g.bp.armR[2] * 0.3;
      ellipse(L, c.x, c.y, RX, RY, rp);
      ellipse(L, c.x, c.y, RX - 0.9, RY - 0.9, fp, (x, y) => ((x + 0.5 - c.x) / RX + (y + 0.5 - c.y) / RY < -0.35 ? 4 : 3));
      // Painted band and planks
      ellipse(L, c.x, c.y, RX - 2.2, RY - 2.2, pp, 3);
      ellipse(L, c.x, c.y, RX - 3.1, RY - 3.1, fp, 3);
      seam(L, v(c.x - 1.6, c.y - RY + 1), v(c.x - 1.6, c.y + RY - 1), -1);
      seam(L, v(c.x + 1.4, c.y - RY + 1), v(c.x + 1.4, c.y + RY - 1), -1);
      // Boss
      ellipse(L, c.x, c.y, 1.4, 1.4, rp);
      px(L, c.x - 0.5, c.y - 0.5, { ...rp, flags: F_NO_OUTLINE }, 5);
      // Rim rivets
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        px(L, c.x + Math.cos(a) * (RX - 0.45), c.y + Math.sin(a) * (RY - 0.45), { ...rp, flags: F_NO_OUTLINE }, 5);
      }
    },
  },
  {
    id: 'acc_twin_swords',
    slot: 'accessory',
    name: 'Twin Back Swords',
    desc: 'Two swords crossed on the back, hilts rising over both shoulders.',
    colors: [col('sheath', 'Scabbards', '#1f1c26', 'leather'), col('hilt', 'Grips', '#3a2a4a', 'leather'), col('guard', 'Guards', '#c9a227', 'metal')],
    draw: (g, [sh, hi, gu]) => {
      // Hilts rise past the shoulders, clear of the head and hair.
      const L = g.L('backGear');
      const b = g.bp;
      const top = topPt(g);
      const up = g.rig.up;
      const right = g.rig.right;
      const c = { sheath: sh, hilt: hi, guard: gu };
      // Sword over the far shoulder (drawn first, it sits deeper).
      const d1 = norm(add(scale(up, -1), scale(right, -0.95)));
      sheathedSword(g, L, top(b.shoulderHalf * 0.55 + 4.2, b.torsoLen + 4.2), d1, c, { sheath: 17, hilt: 4.2 });
      const d2 = norm(add(scale(up, -1), scale(right, 0.95)));
      sheathedSword(g, L, top(-b.shoulderHalf - 3.6, b.torsoLen + 4.4), d2, c, { sheath: 17, hilt: 4.2 });
    },
  },
  {
    id: 'acc_back_katana',
    slot: 'accessory',
    name: 'Back Katana',
    desc: 'A sword slung diagonally across the back, hilt over the shoulder.',
    colors: [col('sheath', 'Scabbard', '#1f1c26', 'leather'), col('hilt', 'Grip', '#2b2233', 'leather'), col('guard', 'Guard', '#b8bfc9', 'metal')],
    draw: (g, [sh, hi, gu]) => {
      const L = g.L('backGear');
      const b = g.bp;
      const top = topPt(g);
      const d = norm(add(scale(g.rig.up, -1), scale(g.rig.right, 0.9)));
      sheathedSword(g, L, top(-b.shoulderHalf - 4, b.torsoLen + 4.6), d, { sheath: sh, hilt: hi, guard: gu }, { sheath: 19, hilt: 4.6 });
    },
  },
  {
    id: 'acc_hip_katana',
    slot: 'accessory',
    name: 'Hip Katana',
    desc: 'A sheathed katana worn at the hip, hilt forward.',
    colors: [col('sheath', 'Scabbard', '#2a1e1e', 'leather'), col('hilt', 'Grip', '#2b2233', 'leather'), col('guard', 'Guard', '#c9a227', 'metal')],
    draw: (g, [sh, hi, gu]) => {
      const L = g.L('waist');
      const T = g.rig.T;
      const b = g.bp;
      // Hilt points forward and up; scabbard trails back and down past the hip.
      const dirBack = g.rig.pose === 'tackle' ? norm(add(scale(g.rig.right, -HIP_TACKLE), scale(g.rig.up, -1))) : norm(add(scale(g.rig.right, -1), scale(g.rig.up, -0.62)));
      const hiltEnd = T(b.waistHalf * 0.6 + 3.2, 5.6);
      sheathedSword(g, L, hiltEnd, dirBack, { sheath: sh, hilt: hi, guard: gu }, { hilt: 3.8, sheath: 14, part: 'pelvis' });
      // Sageo cord loop
      const cord: Pen = { mat: g.m('#c9b48a', 'cloth'), part: 'pelvis' };
      const p = add(hiltEnd, scale(dirBack, 5.6));
      capsule(L, p, add(p, v(-0.6, 1.4)), 0.4, 0.4, cord, 3);
    },
  },
  {
    id: 'acc_scroll_back',
    slot: 'accessory',
    name: 'Back Scroll',
    desc: 'A large summoning scroll strapped horizontally across the lower back.',
    colors: [col('paper', 'Paper', '#e9dfc4'), col('caps', 'Rollers', '#7a2f2a', 'leather'), col('band', 'Band', '#2f4a7a')],
    draw: (g, [p, c, bd]) => {
      const L = g.L('backGear');
      const T = g.rig.T;
      const b = g.bp;
      scrollShape(g, L, T(-b.hipHalf - 5.2, 5.6), T(b.hipHalf + 2.4, 5.6), 2.5, { paper: p, caps: c, band: bd }, 'back');
    },
  },
  {
    id: 'acc_scroll_waist',
    slot: 'accessory',
    name: 'Waist Scroll',
    desc: 'A small scroll tucked into the belt at the back of the waist.',
    colors: [col('paper', 'Paper', '#e9dfc4'), col('caps', 'Rollers', '#2f2a38', 'leather'), col('band', 'Band', '#a1272c')],
    draw: (g, [p, c, bd]) => {
      const L = g.L('waist');
      const T = g.rig.T;
      const b = g.bp;
      scrollShape(g, L, T(-b.hipHalf - 3.6, 1.4), T(-b.hipHalf + 1.2, 3.4), 1.5, { paper: p, caps: c, band: bd }, 'pelvis');
    },
  },
  {
    id: 'acc_pouch',
    slot: 'accessory',
    name: 'Hip Pouch',
    desc: 'A leather tool pouch on the belt.',
    colors: [col('leather', 'Leather', '#5a3a24', 'leather'), col('buckle', 'Buckle', '#c9a227', 'metal')],
    draw: (g, [l, bk]) => {
      const L = g.L('waist');
      const T = g.rig.T;
      const b = g.bp;
      const lp: Pen = { mat: g.m(l, 'leather'), part: 'pelvis' };
      const bp: Pen = { mat: g.m(bk, 'metal'), part: 'pelvis' };
      const x0 = b.hipHalf * 0.15;
      const x1 = x0 + 3.4;
      poly(L, [T(x0, 3), T(x1, 3), T(x1 + 0.2, -0.6), T(x0 - 0.2, -0.6)], lp, (x) => (x + 0.5 < T(x0 + 1, 0).x ? 4 : 3));
      // Flap
      poly(L, [T(x0 - 0.3, 3.3), T(x1 + 0.3, 3.3), T(x1 + 0.1, 1.3), T((x0 + x1) / 2, 0.8), T(x0 - 0.1, 1.3)], lp, 2);
      seam(L, T(x0 + 0.2, 3), T(x1 - 0.2, 3), 1);
      stud(L, T((x0 + x1) / 2, 1.3), bp, 0.6);
    },
  },
  {
    id: 'acc_scarf',
    slot: 'accessory',
    name: 'Neck Scarf',
    desc: 'A thick scarf bunched in folds around the neck and shoulders.',
    colors: [col('main', 'Scarf', '#2c2b35')],
    draw: (g, [c]) => {
      // The owner's black cloak brings its own mantle round the neck (it reads as a scarf, but it is
      // the cape): with it on, this scarf is under it.
      if (g.look.slots.cape?.id === 'cape_shadow' && g.rig.pose !== 'downed') return;
      // Drawn in front of the torso and any cloak collar (capeFront), tucked under
      // the chin, and on top of a cloak's shoulder drape (see the end).
      const L = g.L('capeFront');
      const b = g.bp;
      const sh = b.shoulderHalf;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'torso' };
      const p = g.rig.pose;
      const w = p === 'attack' || p === 'throw' || p === 'pierce' || p === 'hurt' || p === 'run' ? -1.2 : g.rig.frame % 4 >= 2 ? -0.4 : 0;
      // Hanging end over the near shoulder blade (behind the main wrap).
      poly(L, [top(-sh * 0.55, Lt - 0.5), top(-sh * 0.2, Lt - 1.6), add(top(-sh * 0.45, Lt - 6.2), v(w, 0)), add(top(-sh * 0.8, Lt - 5.4), v(w * 1.4, 0))], pen, 2);
      seam(L, top(-sh * 0.42, Lt - 1.4), add(top(-sh * 0.6, Lt - 5.6), v(w, 0)), -1);
      // Lower roll draping over both shoulders.
      const lowC = top(-sh * 0.1, Lt - 1.7);
      const lowRx = sh * 0.84 + 0.9;
      const rollShade = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => {
        const t = (y + 0.5 - (cy - ry)) / (2 * ry); // 0 top .. 1 bottom
        // Mostly dark with a lit crest on the light side, like the reference's bunched scarf.
        if (t < 0.13 && x + 0.5 < cx + rx * 0.35) return 4;
        return t < 0.26 ? 3 : t > 0.64 ? 1 : 2;
      };
      ellipse(L, lowC.x, lowC.y, lowRx, 3.2, pen, rollShade(lowC.x, lowC.y, lowRx, 3.2));
      // Upper roll bunched under the chin.
      const upC = top(0.6, Lt + 0.6);
      const upRx = sh * 0.66 + 1.1;
      ellipse(L, upC.x, upC.y, upRx, 3.2, pen, rollShade(upC.x, upC.y, upRx, 3.2));
      // Folds: curved creases between the rolls plus a couple of pinches.
      const crease = (ax: number, ay: number, bx: number, by: number, dd: number) => {
        const p0 = top(ax, ay);
        const p1 = top(bx, by);
        const steps = Math.ceil(len(sub(p1, p0)) * RES * 1.4);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const q = lerp(p0, p1, t);
          const yy = q.y + Math.sin(t * Math.PI) * 0.6;
          const fx = fine(q.x);
          const fy = fine(yy);
          if (L.has(fx, fy) && L.mat[fy * GRID + fx] === pen.mat && L.getShade(fx, fy) > 0) L.reshade(fx, fy, Math.max(1, Math.min(5, L.getShade(fx, fy) + dd)));
        }
      };
      crease(-upRx + 1.4, Lt - 1, upRx - 0.2, Lt - 0.8, -2);
      crease(-lowRx + 0.8, Lt - 3.1, lowRx - 1.2, Lt - 2.8, -2);
      crease(-lowRx + 1.2, Lt - 2.6, lowRx - 1.6, Lt - 2.3, 1);
      crease(-sh * 0.3, Lt + 2, -sh * 0.15, Lt - 0.4, -1);
      crease(sh * 0.25, Lt + 1.8, sh * 0.35, Lt - 0.5, -1);
      tuckUnderChin(g, L);
      // Sit on top of whatever shares the layer (a cloak's collar) and of a
      // cloak's shoulder drape: dark edge where the scarf meets other pixels,
      // and drape cloth cleared from under the scarf.
      const O = g.L('nearArm.over');
      const arm = (['nearArm.body', 'nearArm.cloth', 'nearArm.armor'] as const).map((d) => g.L(d));
      const edge: number[] = [];
      for (let i = 0; i < GRID * GRID; i++) {
        if (L.mat[i] !== pen.mat) continue;
        const x = i % GRID;
        const y = (i / GRID) | 0;
        const om = O.mat[i];
        // Only where the scarf would really show (the near arm is not in front of it).
        const armHere = arm.some((l) => l.mat[i] >= 0);
        if (!armHere && om >= 0 && g.mats.kinds[om] === 'cloth' && (O.part[i] === partIndex('upperArmN') || O.part[i] === partIndex('torso'))) O.clear(x, y);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const j = (y + dy) * GRID + x + dx;
          if (j >= 0 && j < GRID * GRID && L.mat[j] >= 0 && L.mat[j] !== pen.mat) {
            edge.push(i);
            break;
          }
        }
      }
      for (const i of edge) L.shade[i] = 0;
    },
  },
  {
    id: 'acc_founder_cowl',
    slot: 'accessory',
    name: "Founder's Cowl",
    desc: 'Dark grey cloth wound round the neck and over both shoulders, pinned with gold studs, a white stud on the far shoulder: painted by the owner for Solen.',
    colors: [col('main', 'Cowl', FOUNDER_COWL), col('studs', 'Studs', FOUNDER_COWL_GOLD, 'metal'), col('stud', 'Shoulder stud', FOUNDER_COWL_STUD, 'metal')],
    draw: (g, [c, gold, stud]) => {
      // The owner's cowl on his Solen, his pixels (the new standard, 2026-10-21; tools/refs/
      // solen-cowl-from-ref.py): round the neck in front of the torso and under the chin, over the near
      // shoulder in front of the sleeve, and the white stud on the far shoulder; each leans with the torso
      // about its joint. His line stays; his greys follow Cowl, his gold Studs, his white Shoulder stud.
      const r = g.rig;
      const torso = (Math.atan2(r.neck.y - r.pelvis.y, r.neck.x - r.pelvis.x) * 180) / Math.PI;
      const tint = (_ch: string, hex: string): string => {
        const k = FOUNDER_COWL_KIND[hex];
        if (k === 'line') return hex;
        if (k === 'gold') return retintHex(hex, FOUNDER_COWL_GOLD, gold);
        if (k === 'white' || k === 'stud' || k === 'steel') return retintHex(hex, FOUNDER_COWL_STUD, stud);
        return retintHex(hex, FOUNDER_COWL, c);
      };
      const cowlLine = (hex: string) => FOUNDER_COWL_KIND[hex] === 'line';
      stampLeaning(g, 'capeFront', FOUNDER_COWL_NECK, r.neck, torso, 'torso', tint, cowlLine);
      stampLeaning(g, 'capeFront', FOUNDER_COWL_STUD_F, r.shoulderF, torso, 'upperArmF', tint, cowlLine);
      stampLeaning(g, 'nearArm.over', FOUNDER_COWL_NEAR, r.shoulderN, torso, 'upperArmN', tint, cowlLine);
    },
  },
  {
    id: 'acc_shoulder_pad',
    slot: 'accessory',
    name: 'Shoulder Guard',
    desc: 'A single layered armor plate over the near shoulder.',
    colors: [col('plate', 'Plate', '#5c6573', 'metal'), col('trim', 'Trim', '#c9a227', 'metal')],
    draw: (g, [p, t]) => {
      const L = g.L('nearArm.armor');
      const r = g.rig;
      const pp: Pen = { mat: g.m(p, 'metal'), part: 'upperArmN' };
      const tp: Pen = { mat: g.m(t, 'metal'), part: 'upperArmN' };
      const d = norm(sub(r.elbowN, r.shoulderN));
      const R = g.bp.armR[0];
      const s = r.shoulderN;
      // Three overlapping lames, top one largest.
      const lame = (t0: number, t1: number, w: number) => {
        const a = add(s, scale(d, t0));
        const b = add(s, scale(d, t1));
        capsule(L, a, b, w, w * 0.92, pp);
      };
      lame(2.6, 3.6, R + 1.0);
      lame(1.4, 2.6, R + 1.25);
      lame(-0.6, 1.4, R + 1.5);
      const n = perp(d);
      for (const k of [1.4, 2.6]) seam(L, add(add(s, scale(d, k + 0.3)), scale(n, R + 1.4)), add(add(s, scale(d, k + 0.3)), scale(n, -R - 1.4)), -1);
      // Gold trim along the top lame's edge + rivet
      const e = add(s, scale(d, 1.3));
      seam(L, add(e, scale(n, R + 1.3)), add(e, scale(n, -R - 1.3)), 2);
      stud(L, add(s, scale(d, 0.3)), tp, 0.6);
    },
  },
  {
    id: 'acc_chest_strap',
    slot: 'accessory',
    name: 'Chest Strap',
    desc: 'A diagonal leather strap with gold fittings across the chest.',
    colors: [col('strap', 'Strap', '#3a2a22', 'leather'), col('gold', 'Fittings', '#d4a73a', 'metal')],
    draw: (g, [s, gd]) => {
      const L = g.L('torso.acc');
      const b = g.bp;
      const top = topPt(g);
      const sp: Pen = { mat: g.m(s, 'leather'), part: 'torso' };
      const gp: Pen = { mat: g.m(gd, 'metal'), part: 'torso' };
      const a = top(b.shoulderHalf * 0.5, b.torsoLen + 0.6);
      const z = g.rig.T(-b.hipHalf * 0.9, 0.8);
      strap(g, L, a, z, 0.85, sp);
      // Buckle on the chest
      const bk = lerp(a, z, 0.3);
      const d = norm(sub(z, a));
      const n = perp(d);
      const q = [add(add(bk, scale(d, -1)), scale(n, 1.3)), add(add(bk, scale(d, 1)), scale(n, 1.3)), add(add(bk, scale(d, 1)), scale(n, -1.3)), add(add(bk, scale(d, -1)), scale(n, -1.3))];
      poly(L, q, gp, (x, y) => (x + 0.5 < bk.x && y + 0.5 < bk.y ? 5 : 3));
      poly(L, [add(add(bk, scale(d, -0.4)), scale(n, 0.6)), add(add(bk, scale(d, 0.4)), scale(n, 0.6)), add(add(bk, scale(d, 0.4)), scale(n, -0.6)), add(add(bk, scale(d, -0.4)), scale(n, -0.6))], sp, 2);
      // Rivets
      for (const t of [0.55, 0.72]) stud(L, lerp(a, z, t), gp, 0.55);
    },
  },
];
