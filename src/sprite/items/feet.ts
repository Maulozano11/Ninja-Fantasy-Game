// Footwear. Boots cover the lower shin and the whole foot; sandals and wraps
// leave skin showing through. Shafts follow the shin procedurally; the feet
// are pixel templates in 3/4 front view (see FootArt in ctx.ts): the near foot
// faces the viewer, the far foot points right and is authored a shade darker.

import { DrawCtx, FootArt, footDraw, ItemDef, legDepth, legJoints, legPoint, Side } from '../ctx';
import { add, along, ellipse, Pen, seam, v } from '../raster';
import { across, crease, fpx, limb, limbR, stitch, stud, tube, wrapStripes } from './clothes';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'leather') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const sb = (s: Side) => (s === 'F' ? -1 : 0);

export function bootPen(g: DrawCtx, hex: string, s: Side, part: 'shin' | 'foot', kind: Kind = 'leather'): Pen {
  return { mat: g.m(hex, kind), part: `${part}${s}` as Pen['part'], bias: sb(s) };
}

// Legend: 0-5 main · a-f second (sole/straps) · p-u skin · v-z third (metal).

/** Closed boot: lit toe cap, instep crease, welt and a two-row sole. */
const BOOT: FootArt = {
  N: {
    pivot: [6, 0],
    rows: [
      '...1234321..',
      '...1234321..',
      '...1234321..',
      '...1233221..',
      '..123443321.',
      '.12344443321',
      '.12344444321',
      '123445544321',
      '123455554321',
      '123444444321',
      '012222222210',
      'bcdddddddddb',
      'abbbbbbbbbba',
    ],
  },
  F: {
    pivot: [4, 0],
    rows: [
      '.12321........',
      '.123221.......',
      '.1233221......',
      '.12333211.....',
      '.123332221....',
      '1122333332211.',
      '11223333343321',
      '01122222233221',
      'abcccccccccccb',
      '.aaaa.....aaa.',
    ],
  },
};

/** Riding boot: pointed toe, stitched vamp (third material), raised heel. */
const COWBOY: FootArt = {
  N: {
    pivot: [6, 0],
    rows: [
      '...1234321..',
      '...1234321..',
      '...1234321..',
      '..12344321..',
      '..1234w4321.',
      '.1234w44321.',
      '.123w444321.',
      '.1234w4431..',
      '..12345431..',
      '...124531...',
      '....1221....',
      '....bccb....',
    ],
  },
  F: {
    pivot: [4, 0],
    rows: [
      '.12321..........',
      '.123221.........',
      '.1233221........',
      '.12333211.......',
      '.1233322211.....',
      '11233w33322211..',
      '112233ww33343321',
      '0112222223333221',
      'abbcb...bccccccb',
      'abbcb...........',
    ],
  },
};

/** Boot with a riveted steel toe cap (third material). */
const GREAVE_BOOT: FootArt = {
  N: {
    pivot: [6, 0],
    rows: [
      '...1234321..',
      '...1234321..',
      '...1234321..',
      '...1233221..',
      '..123443321.',
      '.12344443321',
      '.1vwwwwwwv21',
      'vwxyyxxxwwwv',
      'vxyzzyxxxwwv',
      'vwxyyxxxwwwv',
      '0vwwwwwwwwv0',
      'bcdddddddddb',
      'abbbbbbbbbba',
    ],
  },
  F: {
    pivot: [4, 0],
    rows: [
      '.12321........',
      '.123221.......',
      '.1233221......',
      '.12333211.....',
      '.12333vww.....',
      '112233vwxwww..',
      '1122333vwxyxwv',
      '0112222vwwxwwv',
      'abcccccccccccb',
      '.aaaa.....aaa.',
    ],
  },
};

/** Open-toed shinobi boot: heel and instep covered, bare toes. */
const SHINOBI: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '..1234321',
      '..1234321',
      '..1234321',
      '..1233221',
      '.12344321',
      '.12344321',
      '123444321',
      '012222210',
      'rsttttrtq',
      'rsrsrsqts',
      'qrqrqrqrr',
      'bcdddddcb',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      '12321........',
      '123221.......',
      '1233221......',
      '12333221.....',
      '123333221....',
      '1223333320r..',
      '11223332qrsr.',
      '0112222qrqrq.',
      'abcccccccccb.',
    ],
  },
};

/** Straw sandals after the reference: ankle wrap, lit instep strap, bare toes, sole. */
const SANDAL: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '...rstsrq',
      '...2stsrq',
      '...232332',
      '..q12sr20',
      '..rs22230',
      '.q000002r',
      '.02344321',
      '111111132',
      '1rssssr11',
      'rsrsrsqss',
      'qrrrrrqrr',
      'cdeeeeedc',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      'qrsrq........',
      '222222.......',
      '2222r22......',
      '2rrr134......',
      '12r131rr.....',
      'r2221rs132...',
      '2r11rr131qrsr',
      '21111r11rssqr',
      '..bbcdddddddc',
    ],
  },
};

/** Bandage over the arch and ankle; toes and heel stay bare. */
const WRAPS: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '...23432',
      '...12221',
      '...23432',
      '..q12221',
      '..234432',
      '.q122221',
      '.2344432r',
      'r1222221q',
      'rsttttrtq',
      'rsrsrsqts',
      'qrqrqrqrr',
      'pqqqqqpqq',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      '23432........',
      '12221q.......',
      '234432q......',
      '1222221q.....',
      '23443321q....',
      'q12222221rq..',
      'qr23443321sr.',
      'pqr122221rqrq',
      '.pqqqqqqqqqq.',
    ],
  },
};

/** Shaft from `from` (1 = knee, 2 = ankle) down to the ankle, plus the foot template. */
export function boot(g: DrawCtx, hex: string, from: number, art: FootArt, opts: { grow?: number; kind?: Kind; sole?: string; third?: string; thirdKind?: Kind } = {}): void {
  const grow = opts.grow ?? 0.6;
  for (const s of SIDES) {
    const L = g.L(legDepth(s, 'feet'));
    limb(g, L, 'leg', s, from, 2, grow, bootPen(g, hex, s, 'shin', opts.kind), { round1: true });
    footDraw(g, L, s, art, {
      main: g.m(hex, opts.kind ?? 'leather'),
      second: g.m(opts.sole ?? '#2a1a12', 'leather'),
      third: opts.third ? g.m(opts.third, opts.thirdKind ?? 'metal') : undefined,
    });
  }
}

export const FEET_ITEMS: ItemDef[] = [
  {
    id: 'feet_leather',
    slot: 'feet',
    name: 'Leather Boots',
    desc: 'Knee-high brown leather boots with a folded cuff and a strapped ankle.',
    colors: [col('main', 'Leather', '#6b4226'), col('sole', 'Sole', '#2a1a12')],
    draw: (g, [c, sole]) => {
      boot(g, c, 1.24, BOOT, { sole, grow: 0.6 });
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
        stud(L, along(legPoint(g, s, 1.8), legPoint(g, s, 1.87), 0.5, 0.6), g.m('#b8913a', 'metal'), `shin${s}` as Pen['part'], s === 'N');
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
        const sp = bootPen(g, c, s, 'shin', 'cloth');
        limb(g, L, 'leg', s, 1.45, 2, [0.55, 0.5], sp, { round1: true });
        // rolled top band
        limb(g, L, 'leg', s, 1.45, 1.54, 0.72, sp);
        across(g, L, 'leg', s, 1.54, 0.72, -1);
        footDraw(g, L, s, SHINOBI, { main: g.m(c, 'cloth'), second: g.m(sole, 'leather') });
        // centre seam down the front of the shaft and the opening's lit edge
        const p0 = legPoint(g, s, 1.56);
        const p1 = legPoint(g, s, 1.96);
        seam(L, along(p0, p1, 0, limbR(g, 'leg', 1.56) * 0.35), along(p0, p1, 1, limbR(g, 'leg', 1.96) * 0.4), -1);
        seam(L, along(p0, p1, 0, -limbR(g, 'leg', 1.56) * 0.5), along(p0, p1, 1, -limbR(g, 'leg', 1.96) * 0.5), 1);
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
      boot(g, c, 1.3, COWBOY, { grow: 0.7, sole: '#2a1a12', third: st, thirdKind: 'cloth' });
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'feet'));
        const a = legJoints(g.rig, s).ankle;
        const shin = bootPen(g, c, s, 'shin');
        // pull loop at the top of the shaft
        const top = legPoint(g, s, 1.3);
        tube(L, add(top, v(-0.6, 0)), add(top, v(-0.8, -1.3)), 0.55, 0.55, shin, 3);
        // decorative stitching on the shaft
        const stp: Pen = { mat: g.m(st, 'cloth'), part: `shin${s}` as Pen['part'], bias: sb(s) };
        const p0 = legPoint(g, s, 1.42);
        const p1 = legPoint(g, s, 1.86);
        const r = limbR(g, 'leg', 1.6);
        stitch(L, along(p0, p1, 0, -r * 0.1), along(p0, p1, 0.5, r * 0.45), stp, 3, 0);
        stitch(L, along(p0, p1, 0.5, r * 0.45), along(p0, p1, 1, 0), stp, 3, 0);
        seam(L, along(p0, p1, 0, -r * 0.7), along(p0, p1, 1, -r * 0.6), 1);
        // spur: shank and a glinting rowel behind the heel
        const A = g.L(legDepth(s, 'armor'));
        const spm: Pen = { mat: g.m(sp, 'metal'), part: `foot${s}` as Pen['part'], bias: sb(s) };
        const heel = s === 'F' ? v(a.x - 2.0, a.y + 3.0) : v(a.x - 2.4, a.y + 2.2);
        tube(A, heel, add(heel, v(-1.2, -0.2)), 0.45, 0.45, spm, 3);
        ellipse(A, heel.x - 1.6, heel.y - 0.2, 0.8, 0.8, spm, 4);
        fpx(A, v(heel.x - 1.8, heel.y - 0.5), spm.mat, `foot${s}` as Pen['part'], 5 + sb(s));
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
        // dark wrap around the ankle (tabi style), with lit wrap lines
        limb(g, L, 'leg', s, 1.8, 1.97, [0.5, 0.45], bootPen(g, c, s, 'shin', 'cloth'));
        wrapStripes(L, legPoint(g, s, 1.8), legPoint(g, s, 1.97), limbR(g, 'leg', 1.8) + 1, 0.8, 1, 0.6);
        footDraw(g, L, s, SANDAL, { main: g.m(c, 'cloth'), second: g.m(sole, 'leather') });
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
      boot(g, bt, 1.5, GREAVE_BOOT, { grow: 0.65, sole: '#1a1412', third: c });
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
        stud(L, along(legPoint(g, s, 1.5), legPoint(g, s, 1.57), 0.5, -0.3), mp.mat, `shin${s}` as Pen['part'], s === 'N');
        for (const t of [1.16, 1.78]) stud(L, along(legPoint(g, s, t), legPoint(g, s, t + 0.02), 0, -R[2] * 0.15), mp.mat, `shin${s}` as Pen['part'], false, true);
        // knee guard
        const k = legJoints(g.rig, s).knee;
        const kp = { ...mp, part: `thigh${s}` as Pen['part'] };
        ellipse(L, k.x + 0.5, k.y + 0.2, R[1] + 1.2, R[1] + 1.0, kp);
        seam(L, v(k.x - R[1] + 0.2, k.y + 0.8), v(k.x + R[1] + 1.0, k.y + 0.8), -1);
        fpx(L, v(k.x - 0.6, k.y - 0.8), kp.mat, `thigh${s}` as Pen['part'], 5 + sb(s));
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
        const wp = bootPen(g, c, s, 'shin', 'cloth');
        limb(g, L, 'leg', s, 1.6, 1.98, [0.45, 0.35], wp);
        wrapStripes(L, legPoint(g, s, 1.6), legPoint(g, s, 1.98), limbR(g, 'leg', 1.6) + 1, 0.9, -1, 0.7);
        footDraw(g, L, s, WRAPS, { main: g.m(c, 'cloth') });
        // loose tail of the bandage
        tube(L, legPoint(g, s, 1.62), add(legPoint(g, s, 1.62), v(-1.6, 1.2)), 0.45, 0.35, wp);
      }
    },
  },
];
