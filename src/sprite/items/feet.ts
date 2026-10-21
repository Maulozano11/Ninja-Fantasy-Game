// Footwear. Boots cover the lower shin and the whole foot; sandals and wraps
// leave skin showing through. Shafts follow the shin procedurally; the feet
// are pixel templates in 3/4 front view (see FootArt in ctx.ts): the near foot
// faces the viewer, the far foot points right and is authored a shade darker.

import { retintHex } from '../color';
import { DrawCtx, FootArt, footDraw, ItemDef, legDepth, legJoints, legPoint, Side } from '../ctx';
import { segAngle, stampPiece } from '../painted';
import { add, along, ellipse, GRID, norm, partIndex, Pen, RES, seam, sub, v } from '../raster';
import { across, crease, fpx, limb, limbR, stitch, stud, tube, wrapStripes } from './clothes';
import { ROMAN_KIT_KIND, SANDAL_FOOT_F, SANDAL_FOOT_N, SANDAL_LEATHER, SANDAL_SHIN_F, SANDAL_SHIN_N, SANDAL_SKIN } from './bracersSandalsArt';
import { EMBER_FEET_ID, emberLegOut, fitLegs } from './ember';
import { FOOT_BOOT_N, FOOT_KIND, FOOT_LEATHER, FOOT_SANDAL_F, FOOT_SKIN } from './emberFeetArt';
import { BOOT_STEEL, BOOT_TRIM, crimsonKind, SABATON_FOOT_F, SABATON_FOOT_N, SABATON_SHIFT, SABATON_SHIN_F, SABATON_SHIN_N } from './sabatonsGauntletsArt';

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

/** Open-toed shinobi boot in the owner's foot shape: heel and instep covered, bare toes, a sole. */
const SHINOBI: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '..11333331',
      '.111111111',
      '.131133111',
      '.133111311',
      '1311111331',
      '1133333111',
      '1111111331',
      '1stttts111',
      'stststrtt1',
      'rsrsrsrsr1',
      'cccccccccc',
      '.bbbbbbbbb',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      '111113111......',
      '11333133111....',
      '111313133111...',
      '13113133131111.',
      '1131133131qrtr1',
      '1111113113ttrs1',
      'ccccccccccccccc',
      '....bbbbbbbbbb.',
    ],
  },
};

/** The owner's sandals, copied from his picture: dark straps wrapped over the ankle and instep, bare toes, a dark sole. */
const SANDAL: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '..11ssssq1',
      '.111111111',
      '.1r11ss111',
      '.1ss111311',
      '1r111112s1',
      '1123333111',
      '1111111321',
      '1stttts111',
      'stststrtt1',
      'rsrsrsrsr1',
      '1133333111',
      '.111111111',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      '11111s111......',
      '11sss133111....',
      '111s131ss111...',
      '1s1121st131111.',
      '11r11ss131qrtr1',
      '111111s11sttrs1',
      '111111111112111',
      '....1111111111.',
    ],
  },
};

/** Bandage over the ankle and instep in the owner's foot shape; toes bare, a skin sole. */
const WRAPS: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '..22444432',
      '.222222222',
      '.232244222',
      '.244222322',
      '2322222342',
      '2233333222',
      '2222222332',
      '1stttts111',
      'stststrtt1',
      'rsrsrsrsr1',
      'qqqqqqqqqq',
      '.qqqqqqqqq',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      '222224222......',
      '22444233222....',
      '222423244222...',
      '24223244232222.',
      '2232244232qrtr2',
      '2222224224ttrs2',
      'qqqqqqqqqqqqqqq',
      '....qqqqqqqqqq.',
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

/**
 * Takes the leg off below the knee (skin and trousers: the shin and the foot), for boots painted in
 * their own shape that stand where the owner drew them rather than on our leg. The round of the knee
 * above the joint stays, so the thigh still ends round.
 */
function lowerLegOff(g: DrawCtx, s: Side): void {
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const { knee, ankle } = legJoints(g.rig, s);
  const dir = norm(sub(ankle, knee));
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || (L.part[i] !== shin && L.part[i] !== foot)) continue;
      const below = ((i % GRID) + 0.5) / RES - knee.x;
      const down = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
      if (L.part[i] === foot || below * dir.x + down * dir.y > 0) L.mat[i] = -1;
    }
  }
}

/** Takes our bare foot away (a sandal the owner painted takes its place); the shin stays. */
function bareFootOff(g: DrawCtx, s: Side): void {
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === foot) L.mat[i] = -1;
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
  {
    id: 'feet_crimson_sabatons',
    slot: 'feet',
    name: 'Crimson Sabatons',
    desc: 'Plate boots: a round knee cop rimmed in gold, a steel greave, and sabatons with gold cuffs and straps on brown soles.',
    colors: [col('main', 'Steel', BOOT_STEEL, 'metal'), col('trim', 'Trim', BOOT_TRIM, 'metal')],
    draw: (g, [steel, trim]) => {
      // The owner's plate boots, his pixels from his Aiden picture (2026-10-21, the new standard for
      // characters; tools/refs/aiden-boots-gloves-from-ref.py): on each leg the knee cop and greave turn
      // with the shin about the ankle, and the sabaton stays flat on the ground like our feet. His legs
      // stand a little apart from our rig's, so each boot hangs from our ankle moved to his (at rest
      // every pixel is where he drew it) and replaces our leg below the knee. His steel and gold follow
      // the colour slots; his black line and brown soles stay.
      const tint = (_ch: string, hex: string) => {
        const k = crimsonKind(hex);
        return k === 'steel' ? retintHex(hex, BOOT_STEEL, steel) : k === 'gold' ? retintHex(hex, BOOT_TRIM, trim) : hex;
      };
      for (const s of SIDES) {
        const { knee, ankle } = legJoints(g.rig, s);
        lowerLegOff(g, s);
        const [dx, dy] = SABATON_SHIFT[s];
        const at = add(ankle, v(dx / RES, dy / RES));
        const shin = s === 'N' ? SABATON_SHIN_N : SABATON_SHIN_F;
        const foot = s === 'N' ? SABATON_FOOT_N : SABATON_FOOT_F;
        stampPiece(g, legDepth(s, 'feet'), shin, at, segAngle(knee, ankle), `shin${s}`, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, at, foot.angle, `foot${s}`, tint);
      }
    },
  },
  {
    id: 'feet_gladiator_sandals',
    slot: 'feet',
    name: 'Gladiator Sandals',
    desc: 'Leather sandals laced up the shins to a strap under the knee; the toes stay bare.',
    colors: [col('main', 'Leather', SANDAL_LEATHER, 'leather')],
    draw: (g, [leather]) => {
      // The owner's sandals, his pixels from his Roman picture (2026-10-21; tools/refs/
      // roman-bracers-sandals-from-ref.py): on each leg the laced shin turns with the shin about the
      // ankle and the sandal stays flat on the ground like our feet, our bare foot under it taken away.
      // His legs stand wider than ours, so each is moved onto our leg (his sole on ours). His skin
      // between the laces follows the character's skin, his leather the slot; his black line stays.
      const tint = (_ch: string, hex: string) => {
        const k = ROMAN_KIT_KIND[hex];
        if (k === 'line') return hex;
        return k === 'skin' ? retintHex(hex, SANDAL_SKIN, g.look.skin) : retintHex(hex, SANDAL_LEATHER, leather);
      };
      for (const s of SIDES) {
        const { knee, ankle } = legJoints(g.rig, s);
        bareFootOff(g, s);
        const shin = s === 'N' ? SANDAL_SHIN_N : SANDAL_SHIN_F;
        const foot = s === 'N' ? SANDAL_FOOT_N : SANDAL_FOOT_F;
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}`, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}`, tint);
      }
    },
  },
  {
    id: EMBER_FEET_ID,
    slot: 'feet',
    name: 'Ember Boot and Sandal',
    desc: 'A brown leather boot on the near foot and a strapped sandal on the far foot, painted by the owner for Akira.',
    colors: [col('main', 'Leather', FOOT_LEATHER, 'leather')],
    bodies: ['male', 'bulky'],
    draw: (g, [leather]) => {
      // The owner's near boot and far sandal, his pixels from his Akira picture (2026-10-21; tools/refs/
      // akira-feet-from-ref.py): each stays flat on the ground under its ankle, our bare foot under it
      // taken away, standing where he drew it at rest (ember.ts). His skin in the sandal follows the
      // character's skin, his leather the slot; his black line stays.
      fitLegs(g);
      const tint = (_ch: string, hex: string) => {
        const k = FOOT_KIND[hex];
        if (k === 'line') return hex;
        return k === 'skin' ? retintHex(hex, FOOT_SKIN, g.look.skin) : retintHex(hex, FOOT_LEATHER, leather);
      };
      for (const s of SIDES) {
        bareFootOff(g, s);
        const foot = s === 'N' ? FOOT_BOOT_N : FOOT_SANDAL_F;
        stampPiece(g, legDepth(s, 'feet'), foot, add(legJoints(g.rig, s).ankle, emberLegOut(g, s)), foot.angle, `foot${s}`, tint);
      }
    },
  },
];
