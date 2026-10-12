// Hairstyles. Names are original ("inspired by") to keep the game clear of
// third-party trademarks. Coordinates are head-local design units (see
// hairkit.ts): skull x -6.7..+6, y -8..+7.5; brows y -1.5, eyes y 0..3
// (near eye x -2..+1.5, far eye x +2.8..+5.3), ear around (-3.4, 1.8).
//
// Every style draws into two depths:
//   hairBack  — behind the head AND the torso/arms (back spikes, long hair
//               down the back, ponytails, far-side volume)
//   hairFront — over the head (cap, bangs, side locks); it may also fall in
//               front of the chest/shoulders (still behind the near arm).

import type { DrawCtx, ItemDef } from '../ctx';
import { ellipse, Layer, Pen, RES, v, Vec } from '../raster';
import { cap, hd, hdots, hlock, hpoly, hseam, lock, LockOpts, shine, unxf } from './hairkit';

const hairColor = (def: string) => [{ key: 'hair', label: 'Hair', default: def, kind: 'hair' as const }];

interface HairPens {
  /** Front pen (over the head). */
  f: Pen;
  /** Back pen: one shade darker, for volume behind the head. */
  b: Pen;
  /** Back pen for hair that hangs along the back (moves with the torso). */
  t: Pen;
}

function pens(g: DrawCtx, hex: string): HairPens {
  const mat = g.m(hex, 'hair');
  return { f: { mat, part: 'head' }, b: { mat, part: 'head', bias: -1 }, t: { mat, part: 'back', bias: -1 } };
}

type L6 = [number, number, number, number, number, number];
type LockSpec = [L6, number, LockOpts?];

/** Draws head-local locks [root, ctrl, tip] of width w, lit as one mass around `form` (head-local). */
function locks(g: DrawCtx, L: Layer, list: LockSpec[], pen: Pen, form: [number, number] = [-1, -3]): void {
  const f = hd(g, form[0], form[1]);
  for (const [c, w, o] of list) hlock(g, L, c, w, pen, { form: f, ...o });
}

/**
 * A point on the back surface of the torso, `ty` units up from the hips,
 * pushed `out` units further behind. Lets long hair drape along the back in
 * every pose and on every body.
 */
function backPt(g: DrawCtx, ty: number, out: number): Vec {
  const b = g.bp;
  const Lt = b.torsoLen;
  const sh = b.shoulderHalf * 0.86;
  const ch = b.chestHalf * 0.86;
  const wa = b.waistHalf * 0.86;
  const hi = b.hipHalf * 0.86 + 0.3;
  let k: number;
  if (ty >= Lt - 1.2) k = sh;
  else if (ty >= Lt - 5) k = ch + (sh - ch) * ((ty - (Lt - 5)) / 3.8);
  else if (ty >= 5) k = wa + (ch - wa) * ((ty - 5) / (Lt - 10));
  else k = hi + (wa - hi) * (Math.max(0, ty) / 5);
  return g.rig.T(-k - out, ty);
}

/**
 * Converts an absolute (screen, design-unit) point to head-local coordinates.
 * The head-group layers are shrunk by `headScale` around the head center, so
 * a body point maps to a proportionally larger head-local offset.
 */
const toHead = (g: DrawCtx, p: Vec): [number, number] => {
  const k = g.bp.headScale || 1;
  return [(p.x - g.rig.head.x) / k, (p.y - g.rig.head.y) / k];
};

/** Sideways swing for hanging hair: trails behind when the body leans forward. */
const sway = (g: DrawCtx, k = 0.22): number => -g.rig.lean * k;

/**
 * Long hair falling from the back of the head down the back to torso height
 * `ty`, as a fan of `n` overlapping locks. `spread` widens the curtain behind
 * the back; `jag` alternates lock lengths for a ragged hem. Returns the outer
 * edge (top, bottom) so callers can add spikes along it.
 */
function curtain(
  g: DrawCtx,
  L: Layer,
  pen: Pen,
  o: { ty: number; out?: number; spread?: number; n?: number; w?: number; jag?: number; top?: number; front?: number; tipW?: number; bulge?: number; hold?: number },
): [Vec, Vec] {
  const n = o.n ?? 4;
  const out = o.out ?? 2;
  const spread = o.spread ?? 3;
  const w = o.w ?? 6;
  const top = o.top ?? -5;
  const front = o.front ?? -2;
  const bulge = o.bulge ?? 1.5;
  const sw = sway(g, 0.12);
  const mid = backPt(g, (o.ty + g.bp.torsoLen) / 2, out + spread);
  const form = hd(g, (toHead(g, mid)[0] - 6) / 2, -4);
  let edge: [Vec, Vec] = [hd(g, -6, top), backPt(g, o.ty, out + spread)];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1); // 0 = outermost (furthest behind), 1 = closest to the body
    const rootX = -6 + (front + 6) * k;
    const rootY = top + 4 * k;
    const jag = o.jag ? (i % 2 ? o.jag : 0) : 0;
    const tip = backPt(g, o.ty + jag + k * 1.2, out + spread * (1 - k));
    const [tx, ty] = toHead(g, tip);
    const ctrl = hd(g, Math.min(rootX - 2, tx) - bulge * (1 - k * 0.5), (rootY + ty) * 0.42);
    const root = hd(g, rootX, rootY);
    const end = hd(g, tx + sw, ty);
    if (i === 0) edge = [root, end];
    lock(L, root, ctrl, end, w, pen, { hold: o.hold ?? 0.65, tipW: o.tipW ?? 1.5, form });
  }
  return edge;
}

/** Spikes sticking out of a hair mass at fractions `at` along the edge a→b, pointing along `dir` (head-local). */
function spikesAlong(g: DrawCtx, L: Layer, pen: Pen, a: Vec, b: Vec, at: number[], dir: [number, number], len: number, w: number): void {
  for (const t of at) {
    const p = v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    const root = v(p.x + 1.5, p.y - 0.5);
    const tip = v(p.x + dir[0] * len, p.y + dir[1] * len);
    lock(L, root, v((root.x + tip.x) / 2 - dir[1] * 0.8, (root.y + tip.y) / 2), tip, w, pen, { hold: 0.3, form: hd(g, -2, -4) });
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const HAIR_ITEMS: ItemDef[] = [
  {
    id: 'hair_none',
    slot: 'hair',
    name: 'Shaved',
    desc: 'Clean-shaven scalp.',
    colors: hairColor('#2a2230'),
    draw: () => {},
  },

  // Big wild hero spikes radiating in every direction.
  {
    id: 'hair_sunburst',
    slot: 'hair',
    name: 'Sunburst Spikes',
    desc: 'Wild, sun-bright spikes that point every direction.',
    colors: hairColor('#f5c518'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-2, -5, -5, -9, -7, -12.5], 5],
        [[1, -6, 1.5, -9.5, 2.5, -13.5], 4.5],
        [[3, -5, 6, -8, 8.5, -10.5], 4.5],
        [[-4, -3, -8, -5, -11.5, -7], 4.8],
        [[-4, 0, -8, 0, -12, 1], 4.8],
        [[-4, 3, -7, 4.5, -9.5, 7], 4.2],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.3, browY: -3.5, backY: 4 });
      locks(g, F, [
        [[-3, -3, -7, -4, -9.5, -5], 4.2],
        [[-2, -5, -4, -8.5, -5.5, -11], 4.5],
        [[1, -6, 1.5, -9, 2.2, -11.5], 4],
        [[3, -5, 5.5, -7.5, 7.5, -8.5], 4],
        [[4, -4, 7, -4.5, 9.5, -4], 4],
        [[-2, -5.5, -3, -2.5, -4, 0.5], 4],
        [[0, -6, 0.5, -3, 0, -0.5], 4],
        [[2.3, -6, 2.6, -3, 2.4, 0.2], 3.4],
        [[4.5, -5.5, 5.8, -3, 6.6, -0.6], 3.4],
      ], P.f);
      shine(g, F, P.f, -6, -4, 0);
    },
  },

  // Backward-flaring duck-tail spikes + long straight bangs to the jaw.
  {
    id: 'hair_raven',
    slot: 'hair',
    name: 'Raven Fringe',
    desc: 'Spikes swept back like folded wings, long bangs framing the face.',
    colors: hairColor('#1a1d33'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-2, -6, -6, -8.5, -11, -10], 5.5],
        [[-3, -3, -8, -4.5, -12.5, -4.5], 5.5],
        [[-3, 0, -8, 0.5, -12, 2], 5],
        [[-3, 3, -6.5, 4, -9.5, 6], 4.2],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.2, browY: -3, backY: 4 });
      locks(g, F, [
        [[-2, -6, -5.5, -8.5, -9.5, -9.5], 4.8],
        [[-3, -2.5, -7, -3, -10.5, -2.5], 4.2],
        [[-2.5, -4.5, -3.6, 0, -3.4, 6.5], 3.4, { hold: 0.75, tipW: 1.4 }],
        [[5, -5, 6.8, 0, 6.6, 6.5], 3.4, { hold: 0.75, tipW: 1.4 }],
        [[1.6, -6, 2.1, -3, 2.2, 0.4], 3.2],
      ], P.f);
      shine(g, F, P.f, -6, -3, 1);
    },
  },

  // Huge spiky mane down to the waist, one eye hidden behind a long bang.
  {
    id: 'hair_warlord',
    slot: 'hair',
    name: 'Warlord Mane',
    desc: 'A vast, untamed mane falling to the waist; a heavy bang shadows one eye.',
    colors: hairColor('#16141d'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      const [ea, eb] = curtain(g, B, P.t, { ty: 4, out: 2.5, spread: 4.5, n: 5, w: 6.5, jag: 2.5, tipW: 1.2, hold: 0.5, bulge: 2.5 });
      spikesAlong(g, B, P.t, ea, eb, [0.35, 0.55, 0.75, 0.93], [-0.8, 0.6], 4.5, 3.6);
      locks(g, B, [
        [[-3, -5, -8, -8, -12, -9], 5.2],
        [[-4, -1, -9, -1.5, -13, 0.5], 5],
        [[1, -6, 0, -10, -2, -13.5], 5],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.7, browY: -3.5, backY: 5 });
      locks(g, F, [
        [[-1, -6, -4, -9.5, -8, -11.5], 4.8],
        [[2, -6, 3, -9, 5, -10.5], 4.2],
        [[-3, -3, -7, -3.5, -10.5, -1.5], 4.5],
        [[-2.5, -4, -3.8, 1, -3.4, 7.5], 3.6, { hold: 0.7, tipW: 1.2 }],
        [[2, -6.5, 5.5, -2, 4.8, 4.5], 4.4, { hold: 0.6, tipW: 1.2 }],
        [[5, -5.5, 7.2, -1, 7, 3.5], 3, { hold: 0.6 }],
      ], P.f);
      shine(g, F, P.f, -6.5, -4, -0.5);
    },
  },

  // Spiky top with two long bangs framing the face.
  {
    id: 'hair_flash',
    slot: 'hair',
    name: 'Flash Fringe',
    desc: 'Bright spikes up top and two long bangs framing the face.',
    colors: hairColor('#fde047'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-2, -5, -6, -8, -10, -10], 4.8],
        [[-3, -2, -8, -2.5, -11.5, -1], 4.8],
        [[-3, 1.5, -7, 3, -9.5, 5], 4.2],
        [[1, -6, 1, -10, 0, -13], 4.8],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.3, browY: -4, backY: 4.5 });
      locks(g, F, [
        [[-2, -6, -4, -9.5, -7, -11.5], 4.6],
        [[1.5, -6.5, 3, -9.5, 5.5, -11], 4.2],
        [[3.5, -5, 6.5, -7, 9.5, -7.5], 4],
        [[-3, -2, -7, -2, -10, -0.5], 4],
        [[-2.2, -5, -3.8, 0, -3, 6.5], 3.6, { hold: 0.7, tipW: 1.2 }],
        [[5, -5, 7.8, 0, 7, 6.5], 3.6, { hold: 0.7, tipW: 1.2 }],
        [[0.8, -6, 1.3, -3.5, 1.4, -0.4], 3.4],
        [[3.4, -6, 4.2, -3.5, 4.6, -0.8], 3],
      ], P.f);
      shine(g, F, P.f, -6.5, -3.5, 0.5);
    },
  },

  // Short messy hair with a cowlick sprouting from the crown.
  {
    id: 'hair_tousled',
    slot: 'hair',
    name: 'Tousled Crown',
    desc: 'Short and messy, with one stubborn cowlick that never stays down.',
    colors: hairColor('#f1cf7a'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-3, -4, -6.5, -5.5, -8.3, -4.5], 4.2, { tipW: 1.8 }],
        [[-4, 0, -6.8, 1, -7.8, 3], 3.8, { tipW: 1.6 }],
        [[-3, 3, -5, 4.8, -5.8, 6.2], 3.2, { tipW: 1.4 }],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.5, top: 0.6, browY: -3, backY: 3.5 });
      locks(g, F, [
        [[-1, -6, -3, -8.6, -5.8, -8.8], 4.4, { tipW: 1.8 }],
        [[1.5, -6.5, 2.5, -9, 4.6, -9], 4, { tipW: 1.6 }],
        [[3.8, -5.5, 6, -6.8, 7.8, -5.4], 3.4, { tipW: 1.4 }],
        [[-3, -3, -6, -3.2, -7.8, -1.6], 3.6, { tipW: 1.6 }],
        [[-2.2, -4.5, -3.4, -1.5, -3.3, 1.4], 3],
        [[0, -5.5, 0.8, -3, 0.2, -1], 3.6],
        [[2.4, -5.5, 3.2, -3.5, 3.6, -1.4], 3.2],
        [[4.6, -5, 6, -3.5, 6.9, -2.2], 3],
        // the cowlick
        [[-0.5, -7, 0, -12, 3.5, -12.5], 2.4, { hold: 0.3, tipW: 0.9, strands: false }],
      ], P.f);
      shine(g, F, P.f, -6, -3.5, 0.5);
    },
  },

  // Soft, medium-length waves with side-swept bangs.
  {
    id: 'hair_scholar',
    slot: 'hair',
    name: 'Scholar Waves',
    desc: 'Soft waves down to the nape, side-swept bangs and a tiny cowlick.',
    colors: hairColor('#7a4a2a'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-4, -5, -9.5, -1, -7.8, 6], 5.5, { hold: 0.6, tipW: 2 }],
        [[-3, -1, -7.5, 3, -5.5, 8.2], 5, { hold: 0.6, tipW: 1.6 }],
        [[-6, 4, -9, 6.5, -10, 6], 3, { hold: 0.4 }],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.6, browY: -3, backY: 5 });
      locks(g, F, [
        [[-3, -5, -8, -4, -8.5, 1], 4.6, { hold: 0.6, tipW: 1.6 }],
        [[-2.5, -3, -5.5, 1, -3.8, 5.5], 3.8, { hold: 0.6, tipW: 1.4 }],
        [[-2, -6.5, 2.5, -6.5, 6, -1.5], 4.4, { hold: 0.5 }],
        [[0, -7, 4.5, -5.5, 7.6, -3], 3.6, { hold: 0.5 }],
        [[-2, -6, -1, -2.5, -2, 0], 3, { hold: 0.5 }],
        [[-1, -7.5, -1.5, -10.5, 1.2, -11], 2.2, { hold: 0.3, tipW: 0.9, strands: false }],
      ], P.f);
      shine(g, F, P.f, -6, -4.5, -0.5);
    },
  },

  // Silver hair swept up in a big leaning mass.
  {
    id: 'hair_gravity',
    slot: 'hair',
    name: 'Gravity Defier',
    desc: 'A tall silver mass that leans to one side and ignores gravity.',
    colors: hairColor('#c9ccd6'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-3, -4, -9, -8, -13, -13.5], 6],
        [[-1, -6, -4, -11, -6.5, -15.5], 5.5],
        [[-4, -1, -10, -4, -14, -8], 5],
        [[2, -6, 2, -10, 0.5, -13.5], 4.5],
      ], P.b, [-4, -6]);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.3, browY: -3, backY: 4 });
      locks(g, F, [
        [[-3, -3, -8, -5, -12, -8.5], 4.6],
        [[-1, -6, -5, -10, -9.5, -13.5], 5],
        [[1, -6.5, 0, -10, -1.5, -14], 4.5],
        [[3, -5.5, 3, -9, 2, -11], 3.6],
        [[1.8, -6, 2.8, -3.5, 3.1, -0.6], 3.4],
        [[4.4, -5.5, 6, -3.5, 7, -1.5], 3],
        [[-2.2, -4.5, -3.6, -1, -3.5, 2.5], 3.4],
      ], P.f, [-4, -6]);
      shine(g, F, P.f, -6, -4, 0);
    },
  },

  // Sleek hair with long side locks and a low tail at the nape.
  {
    id: 'hair_lowtail',
    slot: 'hair',
    name: 'Low Tail',
    desc: 'Sleek and severe: long side locks and a low tail tied at the nape.',
    colors: hairColor('#141218'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      // the tail
      const tie = hd(g, -6.2, 4.2);
      const tip = backPt(g, g.bp.torsoLen - 9, 1.8);
      const [tx, ty] = toHead(g, tip);
      lock(B, tie, hd(g, -9 + sway(g, 0.1), (4 + ty) * 0.5), hd(g, tx + sway(g, 0.15), ty), 3.8, P.t, { hold: 0.75, tipW: 1.6 });
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1, browY: -3.5, backY: 4.5 });
      // combed-back strands
      hseam(g, F, [[1, -8], [-3, -7], [-6, -3], [-6.2, 1]], -1);
      hseam(g, F, [[2, -7], [-2, -5.5], [-5, -1.5], [-5, 2.5]], -1);
      hseam(g, F, [[1.5, -7.6], [-2.5, -6.6], [-5.4, -3]], 2);
      hseam(g, F, [[0.5, -6.2], [-3, -4.6]], 1);
      locks(g, F, [
        [[-2.2, -5.5, -3.8, -1, -3.4, 6.5], 3.6, { hold: 0.75, tipW: 1.4 }],
        [[4, -6, 7, -1, 6.6, 6.5], 3.6, { hold: 0.75, tipW: 1.4 }],
        [[1.5, -7, 2.3, -4, 1.8, -1.2], 3, { hold: 0.6 }],
      ], P.f);
      // the tie (dark cord over the tail root)
      ellipse(F, tie.x + 0.2, tie.y + 0.2, 1.4, 1.2, { ...P.f, bias: 0 }, 1);
      hdots(g, F, [[-6.4, 3.6]], P.f, 3);
      shine(g, F, P.f, -6.5, -4, 0);
    },
  },

  // Gelled spikes thrown up and back, a few forward bangs.
  {
    id: 'hair_storm',
    slot: 'hair',
    name: 'Storm Spikes',
    desc: 'Huge gelled spikes swept up and back, with bangs falling forward.',
    colors: hairColor('#e8c34a'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-1, -6, -6, -10.5, -11.5, -13.5], 6],
        [[-3, -3, -9, -6, -15, -7], 6],
        [[-3, 0.5, -9, 0, -14, 1.5], 5.2],
        [[-3, 3.5, -7, 5, -10, 7], 4.4],
        [[2, -6, 0.5, -11, -1.5, -15.5], 5.2],
      ], P.b, [-4, -5]);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.3, browY: -3.5, backY: 4 });
      locks(g, F, [
        [[-3, -3, -8, -5, -12.5, -6], 4.6],
        [[-1, -6, -5, -10, -9.5, -12.5], 5],
        [[1, -6.5, 0, -10, -1, -13], 4.5],
        [[3, -6, 4, -9, 3.5, -11], 3.8],
        [[-2.3, -4.5, -3.8, -1, -3.8, 3], 3.6],
        [[0.2, -6, 0.6, -3, 0.2, 0], 3.8],
        [[2, -6.5, 5.5, -5, 8.5, -1.5], 4.2, { hold: 0.4 }],
        [[4, -5.5, 6.5, -3, 6.6, 0.8], 3.2],
      ], P.f, [-4, -5]);
      shine(g, F, P.f, -6, -4, 0);
    },
  },

  // Very long, straight, center-parted hair falling to the waist.
  {
    id: 'hair_silver',
    slot: 'hair',
    name: 'Silver Cascade',
    desc: 'Waist-length, perfectly straight hair parted in the middle.',
    colors: hairColor('#dfe3ee'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      curtain(g, B, P.t, { ty: 3, out: 1.5, spread: 3, n: 5, w: 5.5, tipW: 1.2, jag: 1.5, bulge: 1, hold: 0.7 });
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.1, browY: -4.5, backY: 5 });
      hseam(g, F, [[1.5, -8], [1.5, -6.5]], -2);
      // long front locks: one over the near shoulder, one down the chest
      const nearTip = toHead(g, g.rig.T(-g.bp.shoulderHalf * 0.6, g.bp.torsoLen - 7));
      const farTip = toHead(g, g.rig.T(g.bp.chestHalf * 0.5, g.bp.torsoLen - 6));
      locks(g, F, [
        [[-3, -5, -7, -3, -7, 4], 4.4, { hold: 0.7, tipW: 2 }],
        [[1, -7.5, -3.5, -4, -3.6, 1], 3.6, { hold: 0.9, tipW: 3.4, tipDark: false }],
        [[2, -7.5, 6.5, -4, 6.4, 1], 3.6, { hold: 0.9, tipW: 3.4, tipDark: false }],
      ], P.f);
      hlock(g, F, [-3.6, 0, -3.8, 4, nearTip[0], nearTip[1]], 3.4, P.f, { hold: 0.75, tipW: 1.4, form: hd(g, -1, -3) });
      hlock(g, F, [6.4, 0, 7, 4, farTip[0], farTip[1]], 3.4, P.f, { hold: 0.75, tipW: 1.4, form: hd(g, -1, -3) });
      shine(g, F, P.f, -6.5, -4.5, -0.5);
    },
  },

  // Medium shaggy hair, uneven bangs, longer at the nape.
  {
    id: 'hair_lion',
    slot: 'hair',
    name: 'Lion Fringe',
    desc: 'Shaggy layers with uneven bangs and a longer nape.',
    colors: hairColor('#6b4a32'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [
        [[-3, -4, -8, -5, -10, -3], 4.8],
        [[-4, 1, -7, 5, -7.5, 9], 4.8, { hold: 0.5 }],
        [[-3, 3, -5, 7, -4.5, 10], 4.2, { hold: 0.5 }],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.5, browY: -3, backY: 5 });
      locks(g, F, [
        [[-2, -6, -5, -8.5, -8.5, -8], 4.6],
        [[0.5, -6.5, -0.5, -9, -3, -10.5], 4.2],
        [[3, -6, 5, -7.5, 7, -7], 3.6],
        [[-2.3, -5, -3.8, -1.5, -3.8, 2.5], 3.8],
        [[0, -6, 0.5, -2.5, -0.4, -0.2], 3.8],
        [[2.4, -6, 2.9, -3, 2.6, 1.2], 3.2],
        [[4.6, -5.5, 5.6, -3.5, 6.6, -1.8], 3],
      ], P.f);
      shine(g, F, P.f, -6, -4, 0);
    },
  },

  // Messy spiky dark hair with long jagged bangs over the eyes.
  {
    id: 'hair_midnight',
    slot: 'hair',
    name: 'Midnight Tousle',
    desc: 'A dark, messy mop with short jagged tufts and bangs that frame the eyes.',
    colors: hairColor('#1c2233'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      // Compact rounded mass close to the skull; the compositor frays the
      // silhouette, so the base shapes stay calm.
      locks(g, g.L('hairBack'), [
        [[-3, -6, -7, -6.5, -8.5, -3], 4.5, { tipW: 2 }],
        [[-4, -1, -8, 0, -8.5, 3.5], 4.5, { tipW: 1.8 }],
        [[-4, 2, -6.5, 4.5, -6.8, 6.5], 3.6, { tipW: 1.4 }],
        [[-5, -4, -8, -5.5, -9.5, -5], 2.8],
        [[-5, 0.5, -8, 1.5, -9.4, 3], 2.8],
      ], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1, top: 0.4, browY: -3, backY: 4.5, sideY: 0.5, earY: 0.5 });
      locks(g, F, [
        [[-3, -3, -6.5, -2.5, -8, 0], 3.6, { tipW: 1.5 }],
        [[-2, -7, -4.5, -8.8, -6.8, -8.6], 3.6, { tipW: 1.4 }],
        [[0.5, -7.5, 0, -9.3, -0.8, -10.2], 3.2],
        [[2.5, -7, 3.8, -8.8, 5.5, -8.8], 3.2],
        [[3.5, -6, 6, -6, 7.5, -3.8], 3.2],
        // side locks past the cheeks to the jaw
        [[-2.4, -4.5, -3.7, 0.5, -3.3, 6], 3, { hold: 0.6, tipW: 1 }],
        [[5, -5, 7.2, -0.5, 6.8, 5.5], 3, { hold: 0.6, tipW: 1 }],
        // bangs framing the eyes
        [[-0.8, -6, -0.6, -3, -1.1, -0.4], 3.6, { hold: 0.5 }],
        [[1.6, -6, 2, -2.5, 2.1, 1.4], 3, { hold: 0.45, tipW: 0.9 }],
        [[3.8, -6, 4.3, -3, 4.3, -0.5], 3.2, { hold: 0.5 }],
      ], P.f);
      shine(g, F, P.f, -7, -4.5, -0.5);
    },
  },

  // Long dark hair swept back from the face, past the shoulders.
  {
    id: 'hair_founder',
    slot: 'hair',
    name: "Founder's Locks",
    desc: 'Long dark hair swept back from a high brow, with a few loose strands.',
    colors: hairColor('#191620'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      curtain(g, B, P.t, { ty: g.bp.torsoLen - 7, out: 1.2, spread: 2.5, n: 5, w: 5.5, tipW: 1.4, bulge: 1, jag: 1.5 });
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.4, browY: -5.2, frontX: 3.5, backY: 5, sideY: -1, earY: 1.5 });
      locks(g, F, [
        [[4.5, -6.5, 0, -9.5, -6.5, -7], 4, { hold: 0.5, tipW: 2.5 }],
        [[4.5, -5, 0, -7, -6.5, -3], 3.6, { hold: 0.5, tipW: 2.5 }],
        [[2, -4.5, -2, -4.5, -5.8, 1], 3.4, { hold: 0.5, tipW: 2 }],
        [[-3, -2, -6.5, 1, -6.8, 6], 4, { hold: 0.6 }],
        [[3.6, -5.8, 5.6, -2, 4.4, 3.5], 2.2, { hold: 0.5, strands: false }],
        [[-1.6, -5, -2.9, -1, -2.6, 3.5], 2.2, { hold: 0.5, strands: false }],
      ], P.f);
      // combed-back sheen
      hseam(g, F, [[3.5, -7], [0, -8.6], [-4, -7.6]], 1);
      hseam(g, F, [[3, -5.4], [0, -6.4], [-3.5, -4.6]], 1);
    },
  },

  // Pointed steel helm (worn in the hair slot).
  {
    id: 'hair_helm',
    slot: 'hair',
    name: 'Pointed Knight Helm',
    desc: 'A steel helm with a tall pointed crest and an open face.',
    colors: [{ key: 'helm', label: 'Helm', default: '#9aa3b5', kind: 'metal' }],
    draw: (g, [c]) => drawHelm(g, c),
  },

  // Hime cut: blunt bangs, chin-length side locks, straight to mid-back.
  {
    id: 'hair_long',
    slot: 'hair',
    name: 'Long Straight',
    desc: 'Blunt bangs, chin-length side locks and straight hair to mid-back.',
    colors: hairColor('#3a2433'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      curtain(g, B, P.t, { ty: g.bp.torsoLen - 9, out: 1.2, spread: 2, n: 5, w: 5.5, tipW: 4, bulge: 1, hold: 0.9 });
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.3, browY: -3, backY: 5 });
      const blunt: LockOpts = { hold: 1, tipW: 3.4, tipDark: false };
      locks(g, F, [
        [[-3, -4, -7, -2, -7, 5], 4.6, { hold: 1, tipW: 4.6 }],
        [[-2.4, -4, -3.7, 1, -3.5, 7.5], 3.6, { hold: 1, tipW: 3.6 }],
        [[6, -4, 7, 1, 6.9, 7.5], 2.8, { hold: 1, tipW: 2.8 }],
        [[-0.6, -6, -0.6, -3, -0.7, -0.6], 3.4, blunt],
        [[2, -6.5, 2, -3, 2, -0.6], 3.4, blunt],
        [[4.6, -6, 4.8, -3, 4.8, -0.6], 3.4, blunt],
        [[6.6, -5, 6.9, -3, 6.9, -0.8], 2.2, blunt],
      ], P.f);
      shine(g, F, P.f, -6, -4.5, 0.5);
    },
  },

  // High ponytail.
  {
    id: 'hair_pony',
    slot: 'hair',
    name: 'High Ponytail',
    desc: 'Pulled up into a high, swinging ponytail.',
    colors: hairColor('#9c4a2c'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const B = g.L('hairBack');
      const sw = sway(g, 0.3);
      locks(g, B, [
        [[-4.5, -7.5, -13, -10, -11 + sw, 8], 4.6, { hold: 0.45, tipW: 1.2 }],
        [[-5, -7, -10.5, -6, -8.5 + sw, 6], 3.4, { hold: 0.4, tipW: 1 }],
      ], P.b, [-8, -6]);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1, browY: -3, backY: 3.5 });
      hseam(g, F, [[3, -5], [-1, -7], [-4.5, -7.5]], -1);
      hseam(g, F, [[-5.5, 3], [-6.5, -2], [-5, -7]], -1);
      locks(g, F, [
        [[-2.3, -4.5, -3.6, -1, -3, 4.5], 3, { hold: 0.6 }],
        [[0, -6, 0.6, -3, 0.1, -0.6], 3.6],
        [[2.4, -6, 3, -3.5, 3.4, -1], 3.2],
        [[4.6, -5.5, 6, -3.5, 6.8, -1.6], 3],
      ], P.f);
      // tie
      const t = hd(g, -4.6, -7.6);
      ellipse(F, t.x, t.y, 1.5, 1.3, { ...P.f, bias: 0 }, 1);
      hdots(g, F, [[-5, -8.2]], P.f, 3);
      shine(g, F, P.f, -6, -3.5, 0.5);
    },
  },

  // Twin buns.
  {
    id: 'hair_buns',
    slot: 'hair',
    name: 'Twin Buns',
    desc: 'Two neat buns on top, with soft bangs.',
    colors: hairColor('#e58fb1'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const bun = (L: Layer, x: number, y: number, r: number, pen: Pen) => {
        const p = hd(g, x, y);
        ellipse(L, p.x, p.y, r, r * 0.95, pen);
        // dark rim on the shadow side so the bun separates from the cap
        const rim: [number, number][] = [];
        for (let a = -0.6; a <= 2.4; a += 0.2) rim.push([x + Math.cos(a) * (r - 0.25), y + Math.sin(a) * (r * 0.95 - 0.25)]);
        hseam(g, L, rim, 0, 1);
        // coiled strands
        hseam(g, L, [[x - r * 0.5, y - r * 0.55], [x + r * 0.3, y - r * 0.5], [x + r * 0.6, y]], -1);
        hseam(g, L, [[x - r * 0.7, y + r * 0.1], [x - r * 0.2, y + r * 0.5], [x + r * 0.5, y + r * 0.45]], -1);
        hdots(g, L, [[x - r * 0.45, y - r * 0.3], [x - r * 0.2, y - r * 0.4]], pen, 5);
      };
      bun(g.L('hairBack'), 3, -10.2, 3, P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.1, browY: -3, backY: 4 });
      hseam(g, F, [[1, -8.5], [1.5, -6]], -2);
      locks(g, F, [
        [[-3, -3, -6, -2, -6.5, 3], 4, { hold: 0.6 }],
        [[-2.3, -4.5, -3.6, -1, -3.2, 4.5], 3.2, { hold: 0.6 }],
        [[-0.2, -6, 0.5, -3, 0, -0.6], 3.6],
        [[2.3, -6, 3, -3.5, 3.3, -1], 3.2],
        [[4.6, -5.5, 6, -3.5, 6.8, -1.6], 3],
      ], P.f);
      bun(F, -5.4, -8.8, 3.3, P.f);
      shine(g, F, P.f, -6, -2.5, 0.5);
    },
  },

  // Chin-length bob.
  {
    id: 'hair_bob',
    slot: 'hair',
    name: 'Short Bob',
    desc: 'A rounded, chin-length bob with a soft fringe.',
    colors: hairColor('#8a4b2e'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      locks(g, g.L('hairBack'), [[[-4, -4, -9.5, 1, -6.5, 7.2], 6, { hold: 0.75, tipW: 3.5 }]], P.b);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 1.7, browY: -3, backY: 6 });
      locks(g, F, [
        [[-4, -4, -8.6, 0, -6.2, 7], 5, { hold: 0.75, tipW: 3 }],
        [[-2.5, -4, -4.8, 2, -3, 7], 3.8, { hold: 0.75, tipW: 2.4 }],
        [[5, -5, 7.8, 0, 6.8, 6.4], 3.2, { hold: 0.7, tipW: 2 }],
        [[-0.5, -6, 0, -3, -0.4, -0.5], 3.6],
        [[2, -6.5, 2.5, -3.5, 2.6, -0.8], 3.4],
        [[4.5, -6, 5.5, -3.5, 6.1, -1.2], 3.2],
      ], P.f);
      shine(g, F, P.f, -6.5, -4.5, 0);
    },
  },

  // Short, neat crop.
  {
    id: 'hair_crop',
    slot: 'hair',
    name: 'Short Crop',
    desc: 'A short, neat cut with a little lift at the front.',
    colors: hairColor('#3a2a22'),
    draw: (g, [c]) => {
      const P = pens(g, c);
      const F = g.L('hairFront');
      cap(g, F, P.f, { grow: 0.9, browY: -4, backY: 2.5, sideY: 0, earY: -0.5 });
      locks(g, F, [
        [[-4, -5, -6, -5.5, -7.2, -3.5], 3, { hold: 0.5, tipW: 2 }],
        [[-2, -7, 1.5, -9, 5, -8], 3.6, { tipW: 1.8 }],
        [[1.5, -6.5, 4.5, -8, 6.6, -5.8], 3.2, { tipW: 1.6 }],
      ], P.f);
      shine(g, F, P.f, -6, -4, -0.5);
    },
  },
];

/** Steel bascinet with a pointed crest, brow band, cheek guard and an open face. */
function drawHelm(g: DrawCtx, hex: string): void {
  const F = g.L('hairFront');
  const B = g.L('hairBack');
  const pen: Pen = { mat: g.m(hex, 'metal'), part: 'head' };
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const ccx = hx - 0.5;
  const ccy = hy - 2.5;
  // Spherical shading around the dome center, with a hot spot upper-left.
  const shade = (x: number, y: number): number => {
    const dx = (x + 0.5 - ccx) / 8;
    const dy = (y + 0.5 - ccy) / 9;
    const lt = dx * -0.72 + dy * -0.69;
    if (lt > 0.5) return 5;
    if (lt > 0.18) return 4;
    if (lt > -0.3) return 3;
    return 2;
  };
  // Face opening (head-local design coords).
  const open = (x: number, y: number) => {
    const lx = x + 0.5 - hx;
    const ly = y + 0.5 - hy;
    return lx > -2.6 && ly > -2.4 && ly < 8.5;
  };
  // Mail neck guard behind (darker, textured).
  hpoly(g, B, [[-6, 3], [-8.5, 9], [-2, 10], [2, 9], [2, 5]], { ...pen, bias: -1 }, 3);
  for (let y = 4; y <= 9.5; y += 1) hseam(g, B, [[-8.5, y], [2, y]], -1);
  // Dome + pointed crest.
  hpoly(g, F, [
    [-7.4, 6.5], [-7.6, 0], [-7, -5], [-5.2, -8.5], [-3, -10.6], [-0.8, -16], [1.6, -10.6], [4.2, -9], [6.6, -6], [7.6, -2.5], [7.6, 1.5], [6.8, 1.5],
    [6.8, 8], [-2.6, 8], [-2.6, 6.5],
  ], pen, 3);
  // re-shade using the dome normal and cut the face opening
  for (let fy = Math.floor((hy - 17) * RES); fy <= Math.ceil((hy + 9) * RES); fy++) {
    for (let fx = Math.floor((hx - 9) * RES); fx <= Math.ceil((hx + 9) * RES); fx++) {
      if (!F.has(fx, fy)) continue;
      // back to the layer's design space (the head group is drawn shrunk)
      const d = unxf(F, v((fx + 0.5) / RES, (fy + 0.5) / RES));
      const x = d.x - 0.5;
      const y = d.y - 0.5;
      if (open(x, y)) {
        F.clear(fx, fy);
        continue;
      }
      F.reshade(fx, fy, shade(x, y));
    }
  }
  // Crest ridge: a lit line up the front and a dark one behind it.
  hseam(g, F, [[-0.4, -15.5], [0.8, -11], [3.2, -8.5], [5.8, -5.5]], 0, 5);
  hseam(g, F, [[-0.9, -15], [0.1, -10.6], [2.5, -8], [5.1, -5]], 0, 2);
  // Plate join running down the near side, with a lit lip.
  hseam(g, F, [[-1.2, -13.5], [-3, -9.5], [-5, -6.5], [-5.6, -4.8]], 0, 1);
  hseam(g, F, [[-1.8, -13.5], [-3.6, -9.6], [-5.6, -6.6], [-6.2, -4.8]], 0, 5);
  // Brow band around the opening + rim.
  hseam(g, F, [[-2.6, -4.6], [7.6, -4.6]], 0, 1);
  hseam(g, F, [[-2.6, -3.1], [7.6, -3.1]], 0, 4);
  hseam(g, F, [[-3.2, -2.6], [-3.2, 7.6]], 0, 4);
  hseam(g, F, [[-4, -4], [-4, 7.6]], 0, 1);
  // Cheek-guard hinge line and the lower rim.
  hseam(g, F, [[-7.4, 2.5], [-4, 2.5]], 0, 1);
  hseam(g, F, [[-7.4, 6.2], [-2.6, 6.2]], 0, 2);
  // Rivets.
  for (const [x, y] of [[-1, -3.8], [2.5, -3.8], [6, -3.8], [-6, 1.3], [-5.5, 4.5], [-3.6, 0.5], [-3.6, 4.5]] as [number, number][]) {
    hdots(g, F, [[x, y]], pen, 5);
    hdots(g, F, [[x + 0.5, y + 0.5]], pen, 1);
  }
}
