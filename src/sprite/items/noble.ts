// The owner's noble swordsman (2026-10-24, docs/reference/noble-swordsman-owner-reference.jpg): his new male
// character, every part its own creator option (his words: "agrega todo este personaje en las opciones de
// creador de personaje todos sus objetos royal cape, su traje su arma sus botas su pantalon su pechera con y
// sin capa"). His picture is drawn at twice our scale: tools/refs/noble_ref.py shrinks it to our male rig (his
// head to our Roman head's size) and cleans it with his palette only (his "Reducir y limpiar yo"), and
// tools/refs/noble-*-from-ref.py lift each part out of that. Here: the Noble Coat, the Noble Breastplate (his
// cravat, chains and front panel), the Noble Trousers, the Noble Boots, the Noble Cuffs (his gloves and
// cuffs), the Noble Belt, the Royal Cape and his headband. (His hair is in hair.ts, his head and eyes in
// body.ts, his sword the Jewel Sabre in accessories.ts.) In our male idle every pixel is his; in other poses
// each piece follows its bone. His black line stays whatever the colours; his skin follows the character's
// skin; the rest follows the colour slots, his own colours when they are kept.

import { retintHex, retintSkinLifted } from '../color';
import { armDepth, armJoints, type Depth, type DrawCtx, handDraw, handPose, type ItemDef, legDepth, legJoints, type Side } from '../ctx';
import { type PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, type PartId, RES, sub, v, type Vec } from '../raster';
import { drawRig, GROUND, type Rig } from '../rig';
import { NOBLE_SKIN } from '../nobleHeadArt';
import { capeWind } from './capes';
import { TOP_ITEMS } from './clothes';
import { NOBLE_BELT, NOBLE_BELT_GOLD, NOBLE_BELT_KIND, NOBLE_BELT_LEATHER } from './nobleBeltArt';
import { NOBLE_BOOT_FOOT_F, NOBLE_BOOT_FOOT_N, NOBLE_BOOT_GOLD, NOBLE_BOOT_SHIN_F, NOBLE_BOOT_SHIN_N, NOBLE_BOOTS, NOBLE_BOOTS_KIND } from './nobleBootsArt';
import { NOBLE_COAT, NOBLE_COAT_BODY, NOBLE_COAT_GOLD, NOBLE_COAT_KIND, NOBLE_SLEEVE_F_LOWER, NOBLE_SLEEVE_F_UPPER, NOBLE_SLEEVE_N_LOWER, NOBLE_SLEEVE_N_UPPER, NOBLE_TAILS } from './nobleCoatArt';
import { NOBLE_CRAVAT, NOBLE_FRONT, NOBLE_FRONT_CLOTH, NOBLE_FRONT_GOLD, NOBLE_FRONT_KIND } from './nobleFrontArt';
import { NOBLE_HAIR_KIND, NOBLE_HEADBAND, NOBLE_HEADBAND_BASE } from './nobleHairArt';
import { NOBLE_CUFF_F, NOBLE_CUFF_GOLD, NOBLE_CUFF_N, NOBLE_CUFFS, NOBLE_GLOVE_F, NOBLE_GLOVE_N, NOBLE_GLOVES, NOBLE_HANDS_KIND } from './nobleHandsArt';
import { NOBLE_LEG_JOINTS, NOBLE_SEAT, NOBLE_SEAT_WHOLE, NOBLE_SHIN_F, NOBLE_SHIN_N, NOBLE_THIGH_F, NOBLE_THIGH_N, NOBLE_TROUSERS, NOBLE_TROUSERS_GOLD, NOBLE_TROUSERS_KIND } from './nobleTrousersArt';
import { ROYAL_CAPE_BACK, ROYAL_CAPE_BLACK, ROYAL_CAPE_COLLAR, ROYAL_CAPE_GOLD, ROYAL_CAPE_KIND, ROYAL_CAPE_LINING, ROYAL_CAPE_MANTLE_F, ROYAL_CAPE_MANTLE_N, ROYAL_CAPE_REST } from './royalCapeArt';
import { faceAnchor } from '../body';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
/** His pieces are cut to the male figure; the female bodies never wear the male sets (the owner, 2026-10-21). */
const MEN = ['male', 'bulky'] as const;

/**
 * His colours through the item's slots: his black line stays, his skin follows the character's skin, each other
 * kind of his colour follows its slot (`slots`: kind -> [his colour the slot recolours from, the chosen one]).
 */
function nobleColor(g: DrawCtx, kinds: Record<string, string>, slots: Record<string, [string, string]>) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line') return hex;
    if (k === 'skin') return retintSkinLifted(hex, NOBLE_SKIN, g.look.skin);
    const s = slots[k];
    return s ? retintHex(hex, s[0], s[1]) : hex;
  };
}

/** Takes these parts of our body out of these layers (his pieces take their place). */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes our torso away below the neck: his coat is the torso, so our skin never shows past it (and the far
 * sleeve he drew beside the chest is not hidden behind ours).
 */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under'] as const) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

/** Past this lean (degrees from his picture) a piece is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * Stamps his piece leaning `deg` about its pivot. A small lean shears it, each row moved across whole (so his
 * piping and panels stay his pixels, only stepped), as far as a turn would move it; a large one turns it with
 * RotSprite. At his angle every pixel is his.
 */
function stampLeaning(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const d = deg - piece.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    stampPiece(g, depth, piece, at, deg, part, color);
    return;
  }
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  const L = g.L(depth);
  const ax = Math.floor(at.x * RES) - piece.pivot[0];
  const ay = Math.floor(at.y * RES) - piece.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  piece.rows.forEach((row, j) => {
    const dx = -Math.round((j - piece.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

const IDLE = new Map<string, Rig>();
const idleRig = (body: Rig['body']): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};
const MALE_IDLE = () => idleRig('male');
const fine = (p: [number, number]): Vec => v(p[0] / RES, p[1] / RES);

/**
 * His leg's joints (design units), while his trousers and his boots dress it: he drew his legs wider than our
 * rig's, the near foot further back and the far foot lower (NOBLE_LEG_JOINTS). His hip sits where he drew it
 * from our hip (turned with the torso), his thigh turns about it as ours turns (his length), and his ankle
 * stands where he drew it from ours, so his boots meet the ground where our feet do in every pose; the shin
 * reaches from his knee to his ankle. At rest every joint is his. With other trousers or footwear, ours.
 */
export function nobleLeg(g: DrawCtx, s: Side): { hip: Vec; knee: Vec; ankle: Vec } {
  const j = legJoints(g.rig, s);
  if (!g.has('bottom', 'bottom_noble_trousers') || !g.has('feet', 'feet_noble_boots')) return j;
  const r = g.rig;
  const rest = MALE_IDLE();
  const j0 = legJoints(rest, s);
  const H = fine(NOBLE_LEG_JOINTS['hip' + s]);
  const K = fine(NOBLE_LEG_JOINTS['knee' + s]);
  const A = fine(NOBLE_LEG_JOINTS['ankle' + s]);
  const lean = ((segAngle(r.pelvis, r.neck) - segAngle(rest.pelvis, rest.neck)) * Math.PI) / 180;
  const turn = (p: Vec, a: number) => v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));
  const hip = add(j.hip, turn(sub(H, j0.hip), lean));
  const t = ((segAngle(j.hip, j.knee) - segAngle(j0.hip, j0.knee)) * Math.PI) / 180;
  const knee = add(hip, turn(sub(K, H), t));
  const ankle = add(j.ankle, sub(A, j0.ankle));
  return { hip, knee, ankle };
}

/** Takes our leg away (his trousers and boots are the leg, standing where he drew it). */
function legOff(g: DrawCtx, s: Side): void {
  partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}`, `shin${s}`, `foot${s}`] as PartId[]);
}

/** Takes our arm away above the hand: his sleeves take its place. */
function armOff(g: DrawCtx, s: Side): void {
  partsOff(g, [armDepth(s, 'body')], [`forearm${s}`, `upperArm${s}`] as PartId[]);
}

const arm = <T>(s: Side, n: T, f: T): T => (s === 'N' ? n : f);

/** His royal cape's hem: how far above the ground line it hangs at rest (the male figure, idle). */
const CAPE_HEM = GROUND * RES - (ROYAL_CAPE_REST.ROYAL_CAPE_BACK[1] + ROYAL_CAPE_BACK.rows.length - 1);

/**
 * The back of his cape (capeBack), hung from the base of the neck: his pixels pushed by the wind as the
 * owner's other capes are (each row slides by how far down the cloth it is), the hem never lower than at rest
 * (crouched or seated the cloth gathers up behind instead of passing through the ground).
 */
function capeBack(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  const L = g.L('capeBack');
  const r = g.rig;
  const p = ROYAL_CAPE_BACK;
  const w = capeWind(g);
  const ax = Math.floor(r.neck.x * RES) - p.pivot[0];
  const ay = Math.floor(r.neck.y * RES) - p.pivot[1];
  const n = p.rows.length;
  const lift = w.lift * 1.4 * RES;
  const over = Math.max(0, ay + n - 1 - Math.round(lift) - (GROUND * RES - CAPE_HEM));
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  p.rows.forEach((row, j) => {
    const k = j / Math.max(1, n - 1);
    const dx = Math.round((w.dx + w.wave) * RES * k ** 1.3);
    const dy = -Math.round((lift + over) * k * k);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j + dy, pens[row[i]], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
  });
  closeCapeHoles(g);
}

/** How near the figure (a leg, the sword) must be on each side of a hole in the cape for it to be his gap. */
const LEG_GAP = 5;

/**
 * Between his legs at rest he drew the background, walled in by his cape behind them; once the legs move off
 * it, that is a hole in the cape. When the whole figure is drawn, an empty cell the cape walls in (it cannot be
 * reached from the frame's edge without crossing the cape) stays open only with the figure in front of the cape
 * (a leg, the sword) within LEG_GAP on both sides of it in its row (his gap between them); else it takes the
 * cape's cloth above it.
 */
function closeCapeHoles(g: DrawCtx): void {
  const L = g.L('capeBack');
  g.after((layers) => {
    const N = GRID * GRID;
    const out = new Uint8Array(N);
    const stack: number[] = [];
    const reach = (i: number) => {
      if (out[i] || L.mat[i] >= 0) return;
      out[i] = 1;
      stack.push(i);
    };
    for (let k = 0; k < GRID; k++) [k, N - GRID + k, k * GRID, k * GRID + GRID - 1].forEach(reach);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % GRID;
      if (x > 0) reach(i - 1);
      if (x < GRID - 1) reach(i + 1);
      if (i >= GRID) reach(i - GRID);
      if (i < N - GRID) reach(i + GRID);
    }
    const body = [...layers].filter(([d, l]) => l.used && d !== 'capeBack').map(([, l]) => l);
    const leg = (x: number, y: number) => x >= 0 && x < GRID && body.some((l) => l.mat[y * GRID + x] >= 0);
    const framed = (x: number, y: number, dx: number) => {
      for (let k = 1; k <= LEG_GAP; k++) if (leg(x + dx * k, y)) return true;
      return false;
    };
    const shown = (i: number) => [...layers].some(([, l]) => l.used && l.mat[i] >= 0);
    for (let i = GRID; i < N; i++) {
      if (out[i] || L.mat[i] >= 0 || shown(i)) continue;
      const x = i % GRID;
      const y = (i / GRID) | 0;
      if (framed(x, y, -1) && framed(x, y, 1)) continue;
      let j = i - GRID;
      while (L.mat[j] < 0) j -= GRID;
      L.set(x, y, L.mat[j], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
    }
    // a bit of the cape left apart from the figure (its top behind the neck, with the head bent away from it)
    // is taken away: nothing hangs loose
    const any = (i: number) => [...layers].some(([, l]) => l.used && l.mat[i] >= 0);
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (seen[i] || !any(i)) continue;
      const bit = [i];
      seen[i] = 1;
      for (let k = 0; k < bit.length; k++) {
        const j = bit[k];
        const x = j % GRID;
        for (let dy = -GRID; dy <= GRID; dy += GRID)
          for (let dx = -1; dx <= 1; dx++) {
            const q = j + dy + dx;
            if (q < 0 || q >= N || x + dx < 0 || x + dx >= GRID || seen[q] || !any(q)) continue;
            seen[q] = 1;
            bit.push(q);
          }
      }
      if (bit.length <= CAPE_BIT && bit.every((q) => L.mat[q] >= 0 && ![...layers].some(([d, l]) => d !== 'capeBack' && l.used && l.mat[q] >= 0))) for (const q of bit) L.clear(q % GRID, (q / GRID) | 0);
    }
  });
}

/** The largest bit of the cape apart from the figure that is taken away. */
const CAPE_BIT = 8;

/**
 * His coat on the body: the torso rides the torso about the neck, each sleeve its upper arm about the shoulder
 * and its forearm about the elbow, the tails hang from the pelvis; ours is taken away under them.
 */
function drawCoat(g: DrawCtx, main: string, gold: string): void {
  const r = g.rig;
  const tint = nobleColor(g, NOBLE_COAT_KIND, { cloth: [NOBLE_COAT, main], gold: [NOBLE_COAT_GOLD, gold] });
  torsoOff(g);
  for (const s of SIDES) {
    armOff(g, s);
    const j = armJoints(r, s);
    const L = armDepth(s, 'cloth');
    stampPiece(g, L, arm(s, NOBLE_SLEEVE_N_LOWER, NOBLE_SLEEVE_F_LOWER), j.elbow, segAngle(j.elbow, j.wrist), `forearm${s}` as PartId, tint);
    stampPiece(g, L, arm(s, NOBLE_SLEEVE_N_UPPER, NOBLE_SLEEVE_F_UPPER), j.shoulder, segAngle(j.shoulder, j.elbow), `upperArm${s}` as PartId, tint);
  }
  const torso = segAngle(r.pelvis, r.neck);
  stampLeaning(g, 'torso.top', NOBLE_COAT_BODY, r.neck, torso, 'torso', tint);
  drawTails(g, torso, tint);
}

/**
 * His coat's tails in three: the band under the belt across the hips, and the long tail beside each leg (the
 * near one behind the near thigh, the far one in front of the far thigh). Cells of NOBLE_TAILS: columns
 * x0..x1 from row y0 down.
 */
const TAIL_PANELS: { x0: number; x1: number; y0: number; on: Side }[] = [
  { x0: 0, x1: 16, y0: 8, on: 'N' },
  { x0: 26, x1: 37, y0: 8, on: 'F' },
];
/** How much a long tail follows its thigh swung forward (all of it: it lies along the thigh) and swung back. */
const TAIL_FORWARD = 0.5;
const TAIL_BACK = 0.5;

let REST_LEGS: Set<number> | undefined;
/** The cells his trousers' legs and his boots cover at rest (male idle, his joints), as pixel indices of the frame. */
function restLegCells(): Set<number> {
  if (REST_LEGS) return REST_LEGS;
  const out = new Set<number>();
  const add = (p: PaintedPiece, at: [number, number]) =>
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.add((Math.floor(at[1]) - p.pivot[1] + j) * GRID + Math.floor(at[0]) - p.pivot[0] + i);
    });
  for (const s of SIDES) {
    add(arm(s, NOBLE_THIGH_N, NOBLE_THIGH_F), NOBLE_LEG_JOINTS['hip' + s]);
    add(arm(s, NOBLE_SHIN_N, NOBLE_SHIN_F), NOBLE_LEG_JOINTS['knee' + s]);
    add(arm(s, NOBLE_BOOT_SHIN_N, NOBLE_BOOT_SHIN_F), NOBLE_LEG_JOINTS['ankle' + s]);
    add(arm(s, NOBLE_BOOT_FOOT_N, NOBLE_BOOT_FOOT_F), NOBLE_LEG_JOINTS['ankle' + s]);
  }
  return (REST_LEGS = out);
}

const TAIL_CUTS = new Map<string, PaintedPiece>();
/** NOBLE_TAILS's cells that `keep` keeps, turned about `pivot`. */
function tailCut(key: string, keep: (x: number, y: number) => boolean, pivot: [number, number]): PaintedPiece {
  let p = TAIL_CUTS.get(key);
  if (!p) {
    const rows = NOBLE_TAILS.rows.map((row, y) => [...row].map((ch, x) => (keep(x, y) ? ch : '.')).join(''));
    TAIL_CUTS.set(key, (p = { ...NOBLE_TAILS, rows, pivot }));
  }
  return p;
}

/**
 * His tails: the band rides the pelvis, leaning with the torso; each long tail hangs from his hip (nobleLeg)
 * and turns about it with his thigh, all the way as the thigh swings forward and part of the way as it swings
 * back, so the tails go with the legs instead of standing still across them. At rest every pixel is his.
 */
function drawTails(g: DrawCtx, torso: number, tint: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const P = NOBLE_TAILS;
  const rest = MALE_IDLE();
  // the piece's first cell at rest
  const ox = Math.floor(rest.pelvis.x * RES) - P.pivot[0];
  const oy = Math.floor(rest.pelvis.y * RES) - P.pivot[1];
  const inPanel = (x: number, y: number) => TAIL_PANELS.some((t) => x >= t.x0 && x <= t.x1 && y >= t.y0);
  stampLeaning(g, 'skirt', tailCut('band', (x, y) => !inPanel(x, y), P.pivot), r.pelvis, torso, 'pelvis', tint);
  for (const t of TAIL_PANELS) {
    const H = NOBLE_LEG_JOINTS['hip' + t.on];
    const K = NOBLE_LEG_JOINTS['knee' + t.on];
    const pivot: [number, number] = [Math.floor(H[0]) - ox, Math.floor(H[1]) - oy];
    const leg = nobleLeg(g, t.on);
    const w = ((((segAngle(leg.hip, leg.knee) - segAngle(fine(H), fine(K)) + 180) % 360) + 360) % 360) - 180;
    const turn = w < 0 ? w * TAIL_FORWARD : w * TAIL_BACK;
    // where he drew a tail over a leg it lies over the legs; the rest hangs behind them
    const legs = restLegCells();
    for (const over of [false, true]) {
      const piece = tailCut(t.on + over, (x, y) => x >= t.x0 && x <= t.x1 && y >= t.y0 && legs.has((oy + y) * GRID + ox + x) === over, pivot);
      stampPiece(g, over ? 'skirt' : 'farLeg.body', piece, leg.hip, P.angle + turn, 'pelvis', tint);
    }
  }
}

/** The default top (legacy.ts), worn in place of his coat without his cape. */
const TEE = TOP_ITEMS.find((t) => t.id === 'top_tee')!;

export const NOBLE_ITEMS: ItemDef[] = [
  {
    id: 'top_noble_coat',
    slot: 'top',
    name: 'Noble Coat',
    desc: 'A long black coat with gold piping: plum sleeves to the cuffs and pointed tails below the belt, a long one down each side. It is worn under the Royal Cape; without it, the Training Tee.',
    colors: [col('main', 'Coat', NOBLE_COAT), col('gold', 'Piping', NOBLE_COAT_GOLD, 'metal')],
    bodies: [...MEN],
    // His coat belongs with his cape: he drew it under the royal cape only, and without it the coat's shoulders
    // and tails are his cape's (the owner, 2026-10-24, on the coat alone: "no lo pongas esas telas triangulares
    // raras"; then "el sin capa nadamas con capa"). Without the royal cape the default top is worn instead.
    draw: (g, colors) => (g.has('cape', 'cape_royal') ? drawCoat(g, colors[0], colors[1]) : TEE.draw(g, TEE.colors.map((c) => c.default), {})),
  },
  {
    id: 'armor_noble_front',
    slot: 'armor',
    name: 'Noble Breastplate',
    desc: 'The front of a noble suit: a white ruffled cravat at the throat, gold chains across it and a front panel between two gold piping lines.',
    colors: [col('main', 'Panel', NOBLE_FRONT_CLOTH), col('gold', 'Chains', NOBLE_FRONT_GOLD, 'metal'), col('cravat', 'Cravat', NOBLE_CRAVAT)],
    statsArmor: 'Ronin Wanderer Cloak',
    bodies: [...MEN],
    draw: (g, [main, gold, cravat]) => {
      const r = g.rig;
      const tint = nobleColor(g, NOBLE_FRONT_KIND, { cloth: [NOBLE_FRONT_CLOTH, main], gold: [NOBLE_FRONT_GOLD, gold], white: [NOBLE_CRAVAT, cravat] });
      stampLeaning(g, 'torso.armor', NOBLE_FRONT, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
    },
  },
  {
    id: 'waist_noble_belt',
    slot: 'waist',
    name: 'Noble Belt',
    desc: 'A brown belt with a round gold buckle.',
    colors: [col('main', 'Belt', NOBLE_BELT_LEATHER, 'leather'), col('gold', 'Buckle', NOBLE_BELT_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, gold]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', NOBLE_BELT, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', nobleColor(g, NOBLE_BELT_KIND, { leather: [NOBLE_BELT_LEATHER, main], gold: [NOBLE_BELT_GOLD, gold] }));
    },
  },
  {
    id: 'bottom_noble_trousers',
    slot: 'bottom',
    name: 'Noble Trousers',
    desc: 'Black trousers with a gold seam down each leg, tucked into the boots.',
    colors: [col('main', 'Trousers', NOBLE_TROUSERS), col('gold', 'Seams', NOBLE_TROUSERS_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, gold]) => {
      // His trousers on each leg: the thigh turns about his hip, the shin about his knee (nobleLeg).
      const tint = nobleColor(g, NOBLE_TROUSERS_KIND, { cloth: [NOBLE_TROUSERS, main], gold: [NOBLE_TROUSERS_GOLD, gold] });
      // the seat between the hips, up to the belt (under his coat's tails at rest; whole without his cape, which
      // shows between his legs at rest)
      stampLeaning(g, 'torso.bottom', g.has('cape', 'cape_royal') ? NOBLE_SEAT : NOBLE_SEAT_WHOLE, g.rig.pelvis, segAngle(g.rig.pelvis, g.rig.neck), 'pelvis', tint);
      for (const s of SIDES) {
        legOff(g, s);
        const { hip, knee, ankle } = nobleLeg(g, s);
        const L = legDepth(s, 'cloth');
        stampPiece(g, L, arm(s, NOBLE_THIGH_N, NOBLE_THIGH_F), hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, arm(s, NOBLE_SHIN_N, NOBLE_SHIN_F), knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'feet_noble_boots',
    slot: 'feet',
    name: 'Noble Boots',
    desc: 'Black boots with gold trim: a gold band below the knee and gold over the foot.',
    colors: [col('main', 'Leather', NOBLE_BOOTS, 'leather'), col('gold', 'Gold', NOBLE_BOOT_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, gold]) => {
      // His boots: the shaft turns with the shin about his ankle, the foot stands flat under it; our foot
      // under it is taken away.
      const tint = nobleColor(g, NOBLE_BOOTS_KIND, { leather: [NOBLE_BOOTS, main], gold: [NOBLE_BOOT_GOLD, gold] });
      for (const s of SIDES) {
        partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`foot${s}`] as PartId[]);
        const { knee, ankle } = nobleLeg(g, s);
        const shin = arm(s, NOBLE_BOOT_SHIN_N, NOBLE_BOOT_SHIN_F);
        const foot = arm(s, NOBLE_BOOT_FOOT_N, NOBLE_BOOT_FOOT_F);
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'hands_noble_cuffs',
    slot: 'hands',
    name: 'Noble Cuffs',
    desc: 'Purple cuffs banded in gold from below the elbow to the wrist, over black gloves (the far one fingerless).',
    colors: [col('main', 'Gloves', NOBLE_GLOVES, 'leather'), col('cuff', 'Cuffs', NOBLE_CUFFS), col('gold', 'Gold', NOBLE_CUFF_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [glove, cuff, gold]) => {
      // His cuffs ride each forearm about the elbow; closed, each hand is his fist (the near one round the
      // grip), ours taken away; open, pointing or signing, our hand in the glove's colour.
      const r = g.rig;
      const tint = nobleColor(g, NOBLE_HANDS_KIND, { dark: [NOBLE_GLOVES, glove], purple: [NOBLE_CUFFS, cuff], gold: [NOBLE_CUFF_GOLD, gold] });
      for (const s of SIDES) {
        const j = armJoints(r, s);
        const kind = handPose(g, s).kind;
        if (kind === 'fist' || kind === 'grip') {
          partsOff(g, [armDepth(s, 'body')], [`hand${s}`] as PartId[]);
          const p = arm(s, NOBLE_GLOVE_N, NOBLE_GLOVE_F);
          stampPiece(g, armDepth(s, 'cloth'), p, j.wrist, segAngle(j.wrist, j.hand), `hand${s}` as PartId, tint);
        } else {
          handDraw(g, g.L(armDepth(s, 'cloth')), s, { mat: g.m(glove, 'leather'), part: `hand${s}` as PartId });
        }
        stampPiece(g, armDepth(s, 'armor'), arm(s, NOBLE_CUFF_N, NOBLE_CUFF_F), j.elbow, segAngle(j.elbow, j.wrist), `forearm${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'cape_royal',
    slot: 'cape',
    name: 'Royal Cape',
    desc: 'A black cape lined in crimson and trimmed in gold, with a very high stand-up collar lined in red and gold studs at its foot, sweeping to the ground.',
    colors: [col('main', 'Outside', ROYAL_CAPE_BLACK), col('lining', 'Lining', ROYAL_CAPE_LINING), col('gold', 'Trim', ROYAL_CAPE_GOLD, 'metal')],
    draw: (g, [black, lining, gold]) => {
      // His cape: the cloth behind the body hangs from the base of the neck (capeBack), the high collar and
      // its studs ride the neck, the black over each shoulder rides that shoulder (over the far arm, and over
      // the near arm in front of it).
      const r = g.rig;
      const tint = nobleColor(g, ROYAL_CAPE_KIND, { black: [ROYAL_CAPE_BLACK, black], red: [ROYAL_CAPE_LINING, lining], gold: [ROYAL_CAPE_GOLD, gold] });
      capeBack(g, tint);
      stampPiece(g, 'torso.acc', ROYAL_CAPE_MANTLE_F, r.shoulderF, ROYAL_CAPE_MANTLE_F.angle, 'upperArmF', tint);
      stampLeaning(g, 'torso.acc', ROYAL_CAPE_COLLAR, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
      stampPiece(g, 'nearArm.over', ROYAL_CAPE_MANTLE_N, r.shoulderN, ROYAL_CAPE_MANTLE_N.angle, 'upperArmN', tint);
    },
  },
  {
    id: 'acc_noble_headband',
    slot: 'accessory',
    name: 'Noble Headband',
    desc: 'A brown cloth band across the brow, knotted behind the head, its two long tails hanging beside the cheek.',
    colors: [col('main', 'Cloth', NOBLE_HEADBAND_BASE)],
    draw: (g, [cloth]) => {
      // His headband, his pixels on the face anchor as his hair is (the game's plain cloth headband is drawn
      // with shapes in one colour and cannot show his).
      if (g.has('hair', 'hair_helm')) return;
      const { nx, ny } = faceAnchor(g);
      stampPiece(g, 'head.gear', NOBLE_HEADBAND, v((nx + 0.5) / RES, (ny + 0.5) / RES), 0, 'head', (_ch, hex) => (NOBLE_HAIR_KIND[hex] === 'line' ? hex : retintHex(hex, NOBLE_HEADBAND_BASE, cloth)));
    },
  },
];
