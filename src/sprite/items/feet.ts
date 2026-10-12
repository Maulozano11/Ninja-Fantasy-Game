// Footwear. Boots cover the lower shin and the whole foot; sandals and wraps
// leave skin showing through. Geometry is in design units (64 space); the
// fine 128 grid is used for soles, stitching and highlights.

import { DrawCtx, footPoly, ItemDef, legDepth, legJoints, legPoint, Side } from '../ctx';
import { add, along, ellipse, fine, Layer, Pen, poly, RES, seam, ShadeFn, v } from '../raster';
import { GROUND } from '../rig';
import { across, button, crease, fpx, limb, limbR, stamp, stitch, tube, wrapStripes } from './clothes';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'leather') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const sb = (s: Side) => (s === 'F' ? -1 : 0);

export function bootPen(g: DrawCtx, hex: string, s: Side, part: 'shin' | 'foot', kind: Kind = 'leather'): Pen {
  return { mat: g.m(hex, kind), part: `${part}${s}` as Pen['part'], bias: sb(s) };
}

const footLen = (g: DrawCtx, s: Side) => g.bp.footLen * (s === 'F' ? 0.85 : 1);

/**
 * Sole on the bottom fine rows of a foot, from x0 to x1 (design units relative
 * to the ankle). `onlyOver` restricts it to pixels already drawn. The top row is lit.
 */
function soleRow(g: DrawCtx, L: Layer, s: Side, hex: string, x0: number, x1: number, rows = 2, shade = 2, onlyOver = false, kind: Kind = 'leather'): void {
  const a = legJoints(g.rig, s).ankle;
  const sp = bootPen(g, hex, s, 'foot', kind);
  const fy1 = GROUND * RES - 1;
  for (let fy = fy1 - rows + 1; fy <= fy1; fy++) {
    for (let fx = fine(a.x + x0); fx <= fine(a.x + x1); fx++) {
      if (onlyOver && !L.has(fx, fy)) continue;
      L.set(fx, fy, sp.mat, (fy === fy1 - rows + 1 ? shade + 1 : shade) + (sp.bias || 0), sp.part);
    }
  }
}

/** Shaft from `from` (1 = knee, 2 = ankle) to the ankle plus a full shoe. */
export function boot(g: DrawCtx, hex: string, from: number, opts: { grow?: number; toe?: number; kind?: Kind; sole?: string } = {}): void {
  const grow = opts.grow ?? 0.6;
  for (const s of SIDES) {
    const L = g.L(legDepth(s, 'feet'));
    limb(g, L, 'leg', s, from, 2, grow, bootPen(g, hex, s, 'shin', opts.kind), { round1: true });
    const f = footPoly(g, s, grow * 0.8, opts.toe ?? 0.4);
    poly(L, f, bootPen(g, hex, s, 'foot', opts.kind));
    if (opts.sole) {
      const a = legJoints(g.rig, s).ankle;
      soleRow(g, L, s, opts.sole, f[5].x - a.x - 0.5, f[4].x - a.x + 0.5, 3, 2, true);
    }
  }
}

/** Lit toe cap and a crease over the instep of a closed shoe. */
function shoeDetail(g: DrawCtx, L: Layer, s: Side, grow = 0.5): void {
  const a = legJoints(g.rig, s).ankle;
  const fl = footLen(g, s);
  seam(L, v(a.x + fl * 0.55, GROUND - 2.5 - grow * 0.4), v(a.x + fl * 0.85, GROUND - 2.0 - grow * 0.3), 1);
  crease(L, v(a.x + 0.6, a.y + 0.3), v(a.x + 2.0, a.y + 1.4));
}

export const FEET_ITEMS: ItemDef[] = [
  {
    id: 'feet_leather',
    slot: 'feet',
    name: 'Leather Boots',
    desc: 'Knee-high brown leather boots with a folded cuff and a strapped ankle.',
    colors: [col('main', 'Leather', '#6b4226'), col('sole', 'Sole', '#2a1a12')],
    draw: (g, [c, sole]) => {
      boot(g, c, 1.24, { sole, grow: 0.6 });
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const sp = bootPen(g, c, s, 'shin');
        // folded cuff: a wider band with a dark line under it and a lit edge
        limb(g, L, 'leg', s, 1.12, 1.34, 1.0, sp);
        across(g, L, 'leg', s, 1.33, 1.0, -1);
        const c0 = legPoint(g, s, 1.13);
        const c1 = legPoint(g, s, 1.33);
        seam(L, along(c0, c1, 0, -limbR(g, 'leg', 1.13) - 0.4), along(c0, c1, 1, -limbR(g, 'leg', 1.33) - 0.4), 1);
        // shaft highlight and ankle wrinkles
        const a = legPoint(g, s, 1.4);
        const b = legPoint(g, s, 1.86);
        seam(L, along(a, b, 0, -limbR(g, 'leg', 1.4) * 0.45), along(a, b, 1, -limbR(g, 'leg', 1.86) * 0.4), 1);
        crease(L, along(a, b, 0.78, -0.6), along(a, b, 0.92, 1.2));
        // ankle strap with a small brass buckle
        limb(g, L, 'leg', s, 1.8, 1.87, 0.75, bootPen(g, sole, s, 'shin'));
        button(L, along(legPoint(g, s, 1.8), legPoint(g, s, 1.87), 0.5, 0.6), g.m('#b8955a', 'metal'), `shin${s}` as Pen['part'], 2 + sb(s));
        shoeDetail(g, L, s, 0.5);
      }
    },
  },
  {
    id: 'feet_shinobi',
    slot: 'feet',
    name: 'Blue Shinobi Boots',
    desc: 'Shin-high open-toed ninja boots with a covered heel and a thin sole.',
    colors: [col('main', 'Boot', '#2f5fa8', 'cloth'), col('sole', 'Sole', '#1d2433')],
    draw: (g, [c, sole]) => {
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const a = legJoints(g.rig, s).ankle;
        const fl = footLen(g, s);
        const sp = bootPen(g, c, s, 'shin', 'cloth');
        limb(g, L, 'leg', s, 1.45, 2, [0.55, 0.5], sp, { round1: true });
        // rolled top band
        limb(g, L, 'leg', s, 1.45, 1.54, 0.72, sp);
        across(g, L, 'leg', s, 1.54, 0.72, -1);
        // foot: heel and instep covered, toes open
        const tmp = new Layer();
        poly(tmp, footPoly(g, s, 0.5, 0.3), bootPen(g, c, s, 'foot', 'cloth'));
        const cut = a.x + fl * 0.48;
        stamp(L, tmp, (x, y) => x < cut || y < GROUND - 3.2 - (x - cut) * 0.9);
        soleRow(g, L, s, sole, -2.2, fl + 0.5, 2, 2);
        // centre seam down the front of the shaft and the opening's lit edge
        const p0 = legPoint(g, s, 1.56);
        const p1 = legPoint(g, s, 1.96);
        seam(L, along(p0, p1, 0, limbR(g, 'leg', 1.56) * 0.35), along(p0, p1, 1, limbR(g, 'leg', 1.96) * 0.4), -1);
        seam(L, along(p0, p1, 0, -limbR(g, 'leg', 1.56) * 0.5), along(p0, p1, 1, -limbR(g, 'leg', 1.96) * 0.5), 1);
        seam(L, v(cut - 0.2, a.y + 0.2), v(cut + 0.8, GROUND - 1.4), 1);
        crease(L, v(a.x - 0.4, a.y + 0.4), v(a.x + 1.4, a.y + 1.4));
      }
    },
  },
  {
    id: 'feet_cowboy',
    slot: 'feet',
    name: 'Cowboy Boots',
    desc: 'Stitched riding boots with a pointed toe, a raised heel and a spur.',
    colors: [col('main', 'Leather', '#8b5a2f'), col('stitch', 'Stitching', '#e2bf7a'), col('spur', 'Spur', '#c8ced6', 'metal')],
    draw: (g, [c, st, sp]) => {
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const a = legJoints(g.rig, s).ankle;
        const fl = footLen(g, s);
        const shin = bootPen(g, c, s, 'shin');
        const foot = bootPen(g, c, s, 'foot');
        const G = GROUND;
        limb(g, L, 'leg', s, 1.3, 2, [0.85, 0.7], shin, { round1: true });
        // pull loop at the top of the shaft
        const top = legPoint(g, s, 1.3);
        tube(L, add(top, v(-0.6, 0)), add(top, v(-0.8, -1.3)), 0.55, 0.55, shin, 3);
        // pointed toe, foot and an underslung heel
        poly(L, [
          v(a.x - 2.3, a.y - 1),
          v(a.x + 1.6, a.y - 1),
          v(a.x + fl * 0.7, G - 3.0),
          v(a.x + fl + 2.0, G - 1.3),
          v(a.x + fl + 2.0, G - 0.7),
          v(a.x + fl * 0.45, G - 0.8),
          v(a.x + 0.3, G - 1.2),
          v(a.x - 2.4, G - 1.2),
        ], foot);
        const heel = bootPen(g, '#2a1a12', s, 'foot');
        poly(L, [v(a.x - 0.6, G - 1.4), v(a.x + fl * 0.5, G - 1.0), v(a.x + fl * 0.5, G), v(a.x - 0.6, G)], heel, 1);
        poly(L, [v(a.x - 2.4, G - 1.4), v(a.x - 0.2, G - 1.4), v(a.x - 0.6, G), v(a.x - 2.2, G)], heel, 2);
        poly(L, [v(a.x + fl * 0.4, G - 1.0), v(a.x + fl + 2.0, G - 1.0), v(a.x + fl + 1.6, G - 0.5), v(a.x + fl * 0.4, G - 0.5)], heel, 2);
        // decorative stitching on the shaft and toe
        const stp: Pen = { mat: g.m(st, 'cloth'), part: `shin${s}` as Pen['part'], bias: sb(s) };
        const p0 = legPoint(g, s, 1.42);
        const p1 = legPoint(g, s, 1.86);
        const r = limbR(g, 'leg', 1.6);
        stitch(L, along(p0, p1, 0, -r * 0.1), along(p0, p1, 0.5, r * 0.45), stp, 3, 0);
        stitch(L, along(p0, p1, 0.5, r * 0.45), along(p0, p1, 1, 0), stp, 3, 0);
        stitch(L, v(a.x + fl * 0.5, G - 2.5), v(a.x + fl + 1.0, G - 1.7), { ...stp, part: `foot${s}` as Pen['part'] }, 3, 0);
        seam(L, along(p0, p1, 0, -r * 0.7), along(p0, p1, 1, -r * 0.6), 1);
        // spur: strap, shank and a glinting rowel behind the heel
        const A = g.L(legDepth(s, 'armor'));
        const spm: Pen = { mat: g.m(sp, 'metal'), part: `foot${s}` as Pen['part'], bias: sb(s) };
        tube(L, v(a.x - 2.4, G - 2.6), v(a.x + 1.2, a.y + 0.2), 0.4, 0.4, bootPen(g, '#2a1a12', s, 'foot'), 2);
        tube(A, v(a.x - 1.4, G - 2.3), v(a.x - 2.8, G - 2.5), 0.5, 0.5, spm, 3);
        ellipse(A, a.x - 3.0, G - 2.6, 0.8, 0.8, spm, 4);
        fpx(A, v(a.x - 3.2, G - 2.9), spm.mat, `foot${s}` as Pen['part'], 5 + sb(s));
      }
    },
  },
  {
    id: 'feet_sandals',
    slot: 'feet',
    name: 'Straw Sandals',
    desc: 'Light woven straw sandals with dark thong straps and wrapped ankles; toes and heels stay bare.',
    colors: [col('main', 'Straps', '#1f1e26', 'cloth'), col('sole', 'Sole', '#c9a46c')],
    draw: (g, [c, sole]) => {
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const a = legJoints(g.rig, s).ankle;
        const fl = footLen(g, s);
        const sp = bootPen(g, c, s, 'shin', 'cloth');
        const fp = bootPen(g, c, s, 'foot', 'cloth');
        // dark wrap around the ankle (tabi style), with lit wrap lines
        limb(g, L, 'leg', s, 1.72, 1.97, [0.5, 0.45], sp);
        wrapStripes(L, legPoint(g, s, 1.72), legPoint(g, s, 1.97), limbR(g, 'leg', 1.72) + 1, 0.8, 1, 0.6);
        // straps over the instep: thong from between the toes and a cross strap
        tube(L, v(a.x + 0.9, a.y + 0.5), v(a.x + fl * 0.74, GROUND - 2.0), 0.55, 0.45, fp);
        tube(L, v(a.x + 0.6, a.y + 1.0), v(a.x + 0.2, GROUND - 1.0), 0.5, 0.45, fp);
        tube(L, v(a.x + fl * 0.42, GROUND - 2.9), v(a.x + fl * 0.5, GROUND - 1.0), 0.45, 0.45, fp);
        // woven straw sole, a little longer than the foot
        const weave: ShadeFn = (x, y) => {
          const fx = Math.floor((x + 0.5) * RES);
          const top = y + 0.5 < GROUND - 0.5;
          return top ? (fx % 3 === 0 ? 3 : 4) : 2;
        };
        poly(L, [v(a.x - 2.3, GROUND - 1.1), v(a.x + fl + 0.9, GROUND - 1.1), v(a.x + fl + 0.7, GROUND), v(a.x - 2.1, GROUND)], bootPen(g, sole, s, 'foot', 'leather'), weave);
      }
    },
  },
  {
    id: 'feet_greaves',
    slot: 'feet',
    name: 'Armored Greaves',
    desc: 'Riveted steel shin plates, knee guards and toe caps strapped over sturdy boots.',
    colors: [col('main', 'Steel', '#a7b0bb', 'metal'), col('boot', 'Boots', '#3a2d27')],
    draw: (g, [c, bt]) => {
      boot(g, bt, 1.5, { grow: 0.65, sole: '#1a1412' });
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const mp = bootPen(g, c, s, 'shin', 'metal');
        const R = g.bp.legR;
        // shin plate with a lit ridge and a dark far edge
        limb(g, L, 'leg', s, 1.08, 1.86, [1.0, 0.85], mp);
        const a = legPoint(g, s, 1.1);
        const b = legPoint(g, s, 1.84);
        seam(L, along(a, b, 0.04, -R[2] * 0.3), along(a, b, 1, -R[3] * 0.3), 2);
        seam(L, along(a, b, 0.04, R[2] * 0.6), along(a, b, 1, R[3] * 0.6), -1);
        // leather strap with a buckle, rivets top and bottom
        limb(g, L, 'leg', s, 1.5, 1.57, 1.1, bootPen(g, bt, s, 'shin'));
        button(L, along(legPoint(g, s, 1.5), legPoint(g, s, 1.57), 0.5, -0.3), mp.mat, `shin${s}` as Pen['part'], 4 + sb(s));
        for (const t of [1.16, 1.78]) button(L, along(legPoint(g, s, t), legPoint(g, s, t + 0.02), 0, -R[2] * 0.15), mp.mat, `shin${s}` as Pen['part'], 3 + sb(s));
        // knee guard
        const k = legJoints(g.rig, s).knee;
        const kp = { ...mp, part: `thigh${s}` as Pen['part'] };
        ellipse(L, k.x + 0.5, k.y + 0.2, R[1] + 1.2, R[1] + 1.0, kp);
        seam(L, v(k.x - R[1] + 0.2, k.y + 0.8), v(k.x + R[1] + 1.0, k.y + 0.8), -1);
        fpx(L, v(k.x - 0.6, k.y - 0.8), kp.mat, `thigh${s}` as Pen['part'], 5 + sb(s));
        // steel toe cap
        const an = legJoints(g.rig, s).ankle;
        const fl = footLen(g, s);
        const tmp = new Layer();
        poly(tmp, footPoly(g, s, 0.6, 0.5), bootPen(g, c, s, 'foot', 'metal'));
        stamp(L, tmp, (x, y) => x > an.x + fl * 0.5 && y < GROUND - 0.9);
        seam(L, v(an.x + fl * 0.5, an.y + 0.8), v(an.x + fl * 0.5, GROUND - 1), -1);
        seam(L, v(an.x + fl * 0.6, GROUND - 2.8), v(an.x + fl * 0.9, GROUND - 2.2), 2);
      }
    },
  },
  {
    id: 'feet_wraps',
    slot: 'feet',
    name: 'Foot Wraps',
    desc: 'Cloth bandages wound around the ankles and arches; toes and heels stay bare.',
    colors: [col('main', 'Bandage', '#ddd5c2', 'cloth')],
    draw: (g, [c]) => {
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const a = legJoints(g.rig, s).ankle;
        const fl = footLen(g, s);
        const wp = bootPen(g, c, s, 'shin', 'cloth');
        limb(g, L, 'leg', s, 1.6, 1.98, [0.45, 0.35], wp);
        wrapStripes(L, legPoint(g, s, 1.6), legPoint(g, s, 1.98), limbR(g, 'leg', 1.6) + 1, 0.9, -1, 0.7);
        const tmp = new Layer();
        poly(tmp, footPoly(g, s, 0.25, 0), bootPen(g, c, s, 'foot', 'cloth'));
        stamp(L, tmp, (x) => x > a.x - 0.6 && x < a.x + fl * 0.62);
        for (const dx of [-0.2, 1.0, 2.2]) seam(L, v(a.x + dx - 0.4, a.y + 0.4), v(a.x + dx + 1.0, GROUND - 0.4), -1);
        // loose tail of the bandage
        tube(L, legPoint(g, s, 1.62), add(legPoint(g, s, 1.62), v(-1.6, 1.2)), 0.45, 0.35, wp);
      }
    },
  },
];
