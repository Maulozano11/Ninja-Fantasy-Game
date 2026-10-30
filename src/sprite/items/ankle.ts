// Where the owner's painted footwear meets the shin. He drew each boot or sandal under its shin as one
// piece; ours stands on the ground flat, like our feet, while its shin turns with our leg. These keep the
// two together in every pose: the boot carried round with the shin, turned with it once the leg swings
// the foot off the ground, and the ankle closed with his line where the two pieces part. Shared by his
// Solen's and his Roman's sandals (feet_gladiator_sandals), his Aiden's sabatons (feet.ts) and his Ren's
// Night Boots (night.ts; this file is the same on fix/boots-aiden and ren/owner-standard). The branch
// body/male-skin-face carries its own copy for the Roman sandals (footTurns and closeAnkle in its feet.ts):
// when it merges, it should switch to these.

import { DrawCtx, legDepth, legJoints, Side } from '../ctx';
import { segAngle } from '../painted';
import { GRID, partIndex, RES, v, type Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** An angle wrapped into -180..180 degrees. */
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

/** How far a shin has turned from the way it stands at rest (degrees, + = clockwise on screen). */
export function shinTurn(g: DrawCtx, s: Side): number {
  const r = g.rig;
  const idle = idleRig(r.body);
  const { knee, ankle } = legJoints(r, s);
  const rest = legJoints(idle, s);
  return wrap180(segAngle(knee, ankle) - segAngle(rest.knee, rest.ankle));
}

/** How high an ankle is lifted above where it stands at rest (fine pixels). */
export function ankleLift(g: DrawCtx, s: Side): number {
  return (legJoints(idleRig(g.rig.body), s).ankle.y - legJoints(g.rig, s).ankle.y) * RES;
}

/** A shin turned this far from rest (degrees) with its ankle lifted this far (fine pixels): the foot is off the ground. */
const FOOT_TURN = 45;
const FOOT_LIFT = 3;

/**
 * How far a boot or sandal turns with its shin (degrees): none while the shin stands near the way it does
 * at rest (the foot stays flat under the ankle, like our feet), all of the shin's turn once the shin is
 * past FOOT_TURN degrees from rest and the leg swings the foot well off the ground (a knee raised, a leg
 * kicked back or out: the ankle lifted past FOOT_LIFT). He drew the foot under his shin, so held flat under
 * a shin turned that far it hangs apart from it; turned with it, it stays on the shin as he drew it.
 * `onGround`: also while the foot is on the ground (a kneel, a crouched step on the toes), for a boot
 * carried round with a shin longer than ours (shinCarried), whose foot only meets the ground on its toes.
 */
export function footTurn(g: DrawCtx, s: Side, onGround = false, lim: FootLimits = { turn: FOOT_TURN, lift: FOOT_LIFT }): number {
  const d = shinTurn(g, s);
  return Math.abs(d) > lim.turn && (onGround || ankleLift(g, s) > lim.lift) ? d : 0;
}

/** From how far a shin's turn (degrees) and its ankle's lift (fine pixels) a foot turns with the shin. */
export interface FootLimits {
  turn: number;
  lift: number;
}

/**
 * His sandals' limits: the foot turns with its laced shin as soon as the shin leans past SANDAL_TURN with
 * the foot off the ground (the owner, 2026-10-29, on the legate's poses: "el tobillo está mal, se sale de la
 * bota": held flat under a shin turned 20 to 40 degrees, the sandal's foot had come apart from the laces).
 */
export const SANDAL_LIMITS: FootLimits = { turn: 15, lift: 2 };

/** How far from the ankle (fine pixels) the crack between a shin and its foot is looked for. */
const JOIN_R = 6;

/**
 * The crack between a shin and its foot closed with the shin continued: an empty pixel of the layer near the
 * ankle with the shin on one side of it and the foot on the other (among its 8 neighbours, or within two
 * pixels along its row or column) takes the material of the nearest shin pixel, as part of the foot, so the
 * ankle stays inside the sandal where the shin leans away from a foot held flat on the ground (a crouch, a
 * lunge, a step) or the two are rounded apart. Twice, for a crack two pixels wide. Nothing at rest: there
 * he drew the two as one.
 */
export function joinAnkle(g: DrawCtx, s: Side, at: Vec, depth = legDepth(s, 'feet')): number {
  const L = g.L(depth);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const is = (i: number, p: number) => L.mat[i] >= 0 && L.part[i] === p;
  let filled = 0;
  for (let pass = 0; pass < 2; pass++) {
    const add: [number, number][] = [];
    for (let y = ay - JOIN_R; y <= ay + JOIN_R; y++)
      for (let x = ax - JOIN_R; x <= ax + JOIN_R; x++) {
        if (x < 2 || y < 2 || x >= GRID - 2 || y >= GRID - 2) continue;
        const i = y * GRID + x;
        if (L.mat[i] >= 0) continue;
        let nearShin = false;
        let nearFoot = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = i + dy * GRID + dx;
            if (is(j, shin)) nearShin = true;
            if (is(j, foot)) nearFoot = true;
          }
        const across = [[1, 0], [0, 1]].some(([dx, dy]) => {
          const a = [i - dy * GRID - dx, i - 2 * dy * GRID - 2 * dx];
          const b = [i + dy * GRID + dx, i + 2 * dy * GRID + 2 * dx];
          return (a.some((j) => is(j, shin)) && b.some((j) => is(j, foot))) || (a.some((j) => is(j, foot)) && b.some((j) => is(j, shin)));
        });
        if (!((nearShin && nearFoot) || across)) continue;
        // the nearest shin pixel's material (the one above first: his laces run on down)
        let best = -1;
        let bd = 1e9;
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const j = i + dy * GRID + dx;
            const d = dx * dx + dy * dy + (dy < 0 ? 0 : 0.5);
            if (is(j, shin) && d < bd) {
              bd = d;
              best = L.mat[j];
            }
          }
        if (best >= 0) add.push([i, best]);
      }
    for (const [i, m] of add) {
      L.mat[i] = m;
      L.part[i] = foot;
    }
    filled += add.length;
    if (!add.length) break;
  }
  return filled;
}

/**
 * An offset from the ankle (fine pixels, as he drew it at rest) carried round with the shin: where his
 * ankle stands on a shin that stands apart from ours (SABATON_SHIFT). Held fixed, a shin turned from rest
 * carried his greave one way and left his boot behind; turned with the shin, the two stay where he joined
 * them. At rest it is the offset itself, to the bit.
 */
export function shinCarried(g: DrawCtx, s: Side, dx: number, dy: number): Vec {
  const d = shinTurn(g, s);
  if (!d) return v(dx / RES, dy / RES);
  const a = (d * Math.PI) / 180;
  return v((dx * Math.cos(a) - dy * Math.sin(a)) / RES, (dx * Math.sin(a) + dy * Math.cos(a)) / RES);
}

/** How near the ankle (fine pixels) his shin and his boot or sandal meet. */
const ANKLE_R = 5;

/**
 * His line round the ankle where the shin and the foot part. He drew the shin's foot end and the boot's top
 * open, each covering the other. As the shin turns away from the foot (a step, a kick) or each is rounded
 * on its own by RotSprite, an open corner of one comes out beside the other bare; there it takes his line
 * (`line`), as the rest of the leg is closed. `lines` are the materials of his line already there.
 */
export function closeAnkle(g: DrawCtx, s: Side, at: Vec, line: number, lines: Set<number>, depth = legDepth(s, 'feet')): void {
  const L = g.L(depth);
  const ids = new Set([partIndex(`shin${s}`), partIndex(`foot${s}`)]);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const open: number[] = [];
  for (let y = ay - ANKLE_R; y <= ay + ANKLE_R; y++)
    for (let x = ax - ANKLE_R; x <= ax + ANKLE_R; x++) {
      if (x < 1 || y < 1 || x >= GRID - 1 || y >= GRID - 1) continue;
      const i = y * GRID + x;
      if (L.mat[i] >= 0 && ids.has(L.part[i]) && !lines.has(L.mat[i]) && [i - 1, i + 1, i - GRID, i + GRID].some((j) => L.mat[j] < 0)) open.push(i);
    }
  // The open corner itself takes his line (a line put outside it would stick out of the leg).
  for (const i of open) L.mat[i] = line;
}
