// Where the owner's painted footwear meets the shin. He drew each boot or sandal under its shin as one
// piece; ours stands on the ground flat, like our feet, while its shin turns with our leg. These keep the
// two together in every pose: the boot carried round with the shin, turned with it once the leg swings
// the foot off the ground, and the ankle closed with his line where the two pieces part. Shared by his
// Solen's and his Roman's sandals (feet_gladiator_sandals), his Aiden's sabatons (feet.ts) and his Ren's
// Night Boots (night.ts; this file is the same on fix/boots-aiden and ren/owner-standard), and, through
// footDraw (ctx.ts), by every other foot: our boots, sandals and wraps and our bare foot. The branch
// body/male-skin-face carries its own copy for the Roman sandals (footTurns and closeAnkle in its feet.ts):
// when it merges, it should switch to these.

import { DrawCtx, legDepth, legJoints, Side } from '../ctx';
import { segAngle } from '../painted';
import { hexToRgb } from '../color';
import { GRID, type Layer, partIndex, RES, v, type Vec } from '../raster';
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

/** A shin turned no further than this from rest (degrees): the foot stays flat, as it stands at rest. */
const FOOT_FLAT = 20;
/** A shin turned past this (degrees): the foot turns all of the shin's turn. */
const FOOT_TURN = 45;
/** A shin turned past this (degrees) with its ankle lifted no more than FOOT_LIFT fine pixels lies along the ground: a kneel. */
const KNEEL_TURN = 52;
const FOOT_LIFT = 3;

/**
 * The camp lean ('lean') keeps every foot flat on the ground as it stood before feet turned with their
 * shins, his Aiden's and his Roman's too (their greave or laced shin turns, the boot or sandal stays under
 * the ankle as at rest). The owner chose it on 2026-10-22, looking at the lean turned and flat side by
 * side: "en apoyado antes es lo correcto ahora en en despues esta mal".
 */
export const flatPose = (g: DrawCtx): boolean => g.rig.pose === 'lean';

/**
 * How far a boot, sandal or bare foot turns with its shin (degrees). The owner drew each foot under its
 * shin as one piece; held flat under a shin turned far from rest (a kick, a raised knee, the run's back
 * leg) it hangs apart from the shin or sticks out sideways (2026-10-22: "arregla las botas en donde combo
 * 5/8 ... corrigelo en todos los personajes"). So: flat while the shin stands within FOOT_FLAT degrees of
 * rest (on the ground under the ankle, as at rest); past it the foot turns with the shin, more and more,
 * all of the shin's turn past FOOT_TURN, so it never sits more than FOOT_FLAT degrees off the way it sits
 * on the shin at rest. On the ground it rises on its toes behind a shin slanted back, on its heel in front
 * of one slanted forward. Two exceptions keep the foot flat on the ground: the camp lean (flatPose, the
 * owner's choice), and a shin past KNEEL_TURN with its ankle on the ground (lifted no more than FOOT_LIFT:
 * the crouch's back leg, the sneak's kneel), unless `onGround`: a boot carried round with a shin longer
 * than ours (shinCarried), whose foot only meets the ground on its toes, turns there too. 0 at rest: every
 * foot at rest is drawn exactly as before.
 */
export function footTurn(g: DrawCtx, s: Side, onGround = false): number {
  if (flatPose(g)) return 0;
  const d = shinTurn(g, s);
  const a = Math.abs(d);
  if (a <= FOOT_FLAT) return 0;
  if (a > KNEEL_TURN && !onGround && ankleLift(g, s) <= FOOT_LIFT) return 0;
  if (a >= FOOT_TURN) return d;
  return (Math.sign(d) * (a - FOOT_FLAT) * FOOT_TURN) / (FOOT_TURN - FOOT_FLAT);
}

/**
 * An offset from the ankle (fine pixels, as he drew it at rest) carried round with the shin: where his
 * ankle stands on a shin that stands apart from ours (SABATON_SHIFT). Held fixed, a shin turned from rest
 * carried his greave one way and left his boot behind; turned with the shin, the two stay where he joined
 * them. At rest it is the offset itself, to the bit; in the camp lean too, where his boot stays flat as it
 * stood before (flatPose).
 */
export function shinCarried(g: DrawCtx, s: Side, dx: number, dy: number): Vec {
  const d = flatPose(g) ? 0 : shinTurn(g, s);
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

/** An offset (design pixels) turned by `deg` degrees (+ = clockwise on screen): a point on a foot turned with its shin (footTurn). Unturned, the offset itself. */
export function turned(o: Vec, deg: number): Vec {
  if (!deg) return o;
  const a = (deg * Math.PI) / 180;
  return v(o.x * Math.cos(a) - o.y * Math.sin(a), o.x * Math.sin(a) + o.y * Math.cos(a));
}

/** How far (fine pixels) a foot kept flat in the lean may be moved to meet its shin. */
const JOIN_R = 6;

/**
 * The lean's foot, kept flat (flatPose) under a shin lying back, stood a pixel or a few apart from the end
 * of his greave or laced shin: the owner, "faltaba juntar la bota porque estaba partida en dos". Moved by
 * the least it takes to meet the shin (no turn: as he chose it, flat). The foot on the leg's feet layer,
 * the shin there or on its armor layer (his Aiden's greave is his plate's); run once every item is drawn.
 */
export function joinFlat(g: DrawCtx, s: Side): void {
  if (!flatPose(g)) return;
  const L = g.L(legDepth(s, 'feet'));
  const A = g.L(legDepth(s, 'armor'));
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const shinAt = new Set<number>();
  const feet: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if ((L.mat[i] >= 0 && L.part[i] === shin) || (A.mat[i] >= 0 && A.part[i] === shin)) shinAt.add(i);
    if (L.mat[i] >= 0 && L.part[i] === foot) feet.push(i);
  }
  if (!shinAt.size || !feet.length) return;
  const meets = (dx: number, dy: number) =>
    feet.some((i) => {
      const x = (i % GRID) + dx;
      const y = Math.floor(i / GRID) + dy;
      for (let ny = y - 1; ny <= y + 1; ny++) for (let nx = x - 1; nx <= x + 1; nx++) if (shinAt.has(ny * GRID + nx)) return true;
      return false;
    });
  if (meets(0, 0)) return;
  const shifts: [number, number][] = [];
  for (let dy = -JOIN_R; dy <= JOIN_R; dy++) for (let dx = -JOIN_R; dx <= JOIN_R; dx++) if (dx * dx + dy * dy <= JOIN_R * JOIN_R) shifts.push([dx, dy]);
  shifts.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
  const to = shifts.find(([dx, dy]) => meets(dx, dy));
  if (!to) return;
  const moved: [number, number, number, number][] = feet.map((i) => [i, L.mat[i], L.shade[i], L.flags[i]]);
  for (const [i] of moved) L.mat[i] = -1;
  for (const [i, mat, shade, flags] of moved) {
    const j = i + to[1] * GRID + to[0];
    L.mat[j] = mat;
    L.shade[j] = shade;
    L.part[j] = foot;
    L.flags[j] = flags;
  }
}

/** His painted footwear whose turned foot came out cut from the leg at the ankle (openJoint). His Trunks boots are drawn as one piece already. */
export const JOINED_FEET = ['feet_crimson_sabatons', 'feet_gladiator_sandals'];

/** How far (fine pixels) his line across the joint may run along the shin between the shin's own pixels and the foot's (openJoint). */
export const JOINT_GAP = 3;
/** How far (fine pixels) from where the foot meets the shin the joint is closed (openJoint). */
const JOINT_R = 8;
/** Darker than this (0-255 luma) reads as his black line, as his pictures' converters sort it. */
export const LINE_LUM = 40;

/**
 * Where a turned foot meets its shin, for his painted footwear (JOINED_FEET): the leg made one piece there,
 * as his Trunks boots are drawn. Turned with the shin, the line he drew between the two (the top of his
 * Aiden's sabaton cuff, the bottom of his plate's greave, the dark band round his sandals' ankle) and the
 * pixels bitten out where the two pieces part cut the foot from the leg (the owner, 2026-10-23: "aiden y
 * romano le falta ahora conectar la punta del pie con la pierna como trunks su pie y su pierna estan
 * conectadas no hay un corte de pixeles"). Within JOINT_R of where they meet:
 *  - where the foot turns all of the shin's turn (FOOT_TURN: a kick, a raised leg), his line across the leg
 *    between them (a dark pixel of either beside the other, the leg on both sides of it across, whose first
 *    light pixel up the shin, within JOINT_GAP, is the shin's and down it the foot's) takes that shin pixel:
 *    the shin runs on into the foot; his line round the outside stays, and so do his laces and straps away
 *    from where the two meet. Turned less, the foot bends at the ankle and his line there is the ankle's;
 *  - a pixel bitten out of the leg (empty, the leg on three sides of it) is filled, with his line where it
 *    touches his line (it is on the outline), else with the pixel beside it.
 * Round after round until none is left, as one opened leaves the next. Run once every item is drawn (his
 * plate's greave and the boots are drawn by different items); a foot not turned (at rest, standing, the
 * camp lean) is left as it is. Tested in sprite/feet.test.ts.
 */
export function openJoint(g: DrawCtx, s: Side): void {
  if (flatPose(g) || !JOINED_FEET.some((id) => g.has('feet', id))) return;
  // (turned as the item turns it: his sabatons turn on the ground too, items/feet.ts)
  const turn = Math.abs(footTurn(g, s, g.has('feet', 'feet_crimson_sabatons')));
  if (!turn) return;
  const asOne = turn >= FOOT_TURN;
  // the leg's layers, the one on top first
  const layers = (['armor', 'feet', 'cloth', 'body'] as const).map((k) => g.L(legDepth(s, k)));
  const F = g.L(legDepth(s, 'feet'));
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const { knee, ankle } = legJoints(g.rig, s);
  const n = Math.hypot(ankle.x - knee.x, ankle.y - knee.y) || 1;
  const [ux, uy] = [(ankle.x - knee.x) / n, (ankle.y - knee.y) / n];
  const top = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return undefined;
    const i = y * GRID + x;
    const L = layers.find((l) => l.mat[i] >= 0);
    return L && { L, i, part: L.part[i], line: lum(g.mats.ramps[L.mat[i]][L.shade[i]]) < LINE_LUM };
  };
  const along = (x: number, y: number, k: number) => top(Math.round(x + ux * k), Math.round(y + uy * k));
  /** The first light pixel from (x, y) along the shin (`dir` +1 down to the foot, -1 up to the knee), within JOINT_GAP over the leg. */
  const firstLight = (x: number, y: number, dir: number) => {
    for (let k = 1; k <= JOINT_GAP; k++) {
      const q = along(x, y, dir * k);
      if (!q) return undefined;
      if (!q.line) return q;
    }
    return undefined;
  };
  // where they meet: the foot's pixels beside the shin's
  let cx = 0;
  let cy = 0;
  let cn = 0;
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++) {
      const p = top(x, y);
      if (p?.part !== foot) continue;
      if ([top(x + 1, y), top(x - 1, y), top(x, y + 1), top(x, y - 1)].some((q) => q?.part === shin)) [cx, cy, cn] = [cx + x, cy + y, cn + 1];
    }
  if (!cn) return;
  [cx, cy] = [cx / cn, cy / cn];
  const near: [number, number][] = [];
  for (let y = Math.floor(cy - JOINT_R); y <= cy + JOINT_R; y++) for (let x = Math.floor(cx - JOINT_R); x <= cx + JOINT_R; x++) if (Math.hypot(x - cx, y - cy) <= JOINT_R) near.push([x, y]);
  for (let round = 0; round < 16; round++) {
    const fills: [Layer, number, Layer, number][] = [];
    for (const [x, y] of near) {
      const p = top(x, y);
      if (p) {
        if (!asOne || !p.line || (p.part !== shin && p.part !== foot)) continue;
        // between the two: beside the other piece, and the leg on both sides of it across
        const other = p.part === shin ? foot : shin;
        if (![top(x - 1, y), top(x + 1, y), top(x, y - 1), top(x, y + 1)].some((q) => q?.part === other)) continue;
        if (!top(Math.round(x - uy), Math.round(y + ux)) || !top(Math.round(x + uy), Math.round(y - ux))) continue;
        const up = firstLight(x, y, -1);
        const down = firstLight(x, y, 1);
        if (up?.part === shin && down?.part === foot) fills.push([p.L, p.i, up.L, up.i]);
      } else {
        const sides = [top(x - 1, y), top(x + 1, y), top(x, y - 1), top(x, y + 1)].filter((q) => !!q);
        if (sides.length < 3) continue;
        const from = sides.find((q) => q.line) ?? sides[0];
        fills.push([F, y * GRID + x, from.L, from.i]);
      }
    }
    if (!fills.length) break;
    for (const [L, i, from, j] of fills) {
      L.mat[i] = from.mat[j];
      L.shade[i] = from.shade[j];
      L.part[i] = from.part[j];
      L.flags[i] = from.flags[j];
    }
    F.used = true;
  }
}

const lum = (hex: string) => {
  const [r, gr, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * gr + 0.114 * b;
};
