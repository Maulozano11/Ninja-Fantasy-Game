// Footwear. Boots cover the lower shin and the whole foot; sandals and wraps
// leave skin showing through. Shafts follow the shin procedurally; the feet
// are pixel templates in 3/4 front view (see FootArt in ctx.ts): the near foot
// faces the viewer, the far foot points right and is authored a shade darker.

import { retintHex, retintSkinLifted } from '../color';
import { DEPTHS, DrawCtx, FootArt, footDraw, ItemDef, legDepth, legJoints, legPoint, Side } from '../ctx';
import type { BodyType } from '../types';
import { continuedTo, limbOnly, type PaintedPiece, segAngle, stampJoined, stampPiece } from '../painted';
import { ankleLiftOf } from '../rig';
import { add, along, ellipse, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, norm, partIndex, PARTS, type PartId, Pen, RES, seam, sub, v, type Vec } from '../raster';
import { rotateTemplate } from '../rotsprite';
import { takesMaleSkin } from '../maleSkin';
import { MALE_SKIN_BASE } from '../maleSkinArt';
import { sealAgainstFigure } from '../seal';
import { FEET_DAWN_BOOTS } from './aureliaBoots';
import { across, crease, fpx, limb, limbR, stitch, stud, tube, wrapStripes } from './clothes';
import { closeAnkle, footTurn, shinCarried } from './ankle';
import { founderLegLen, founderLegOut, founderLegsStill } from './founderOut';
import { FOUNDER_SANDAL_FOOT_F, FOUNDER_SANDAL_FOOT_N, FOUNDER_SANDAL_KIND, FOUNDER_SANDAL_LEATHER, FOUNDER_SANDAL_SHIN_F, FOUNDER_SANDAL_SHIN_N, FOUNDER_SANDAL_SKIN } from './founderSandalsArt';
import { ROMAN_KIT_KIND, ROMAN_KIT_KNEES, ROMAN_KIT_REACH, ROMAN_KIT_REST, SANDAL_FOOT_F, SANDAL_FOOT_N, SANDAL_LEATHER, SANDAL_SHIN_F, SANDAL_SHIN_N, SANDAL_SKIN } from './bracersSandalsArt';
import { LYRA_BOOTS } from './lyraBoots';
import { BOOT_STEEL, BOOT_TRIM, crimsonKind, SABATON_FOOT_F, SABATON_FOOT_N, SABATON_SHIFT, SABATON_SHIN_F, SABATON_SHIN_N } from './sabatonsGauntletsArt';
import { BOOT_FOOT_F, BOOT_FOOT_N, BOOT_SHAFT_F, BOOT_SHAFT_N, LEATHER_BOOT_BROWN, LEATHER_BOOT_SLOT } from './leatherBootsArt';
import { OPEN_BOOT_FOOT_F, OPEN_BOOT_FOOT_N, OPEN_BOOT_SHAFT_F, OPEN_BOOT_SHAFT_N, OPEN_BOOT_SLOT, OPEN_BOOT_TAN } from './openToeBootsArt';
import { savedAsHis, slotTint } from './trunksKit';

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
    // A closed boot is the whole foot: our bare foot under it (the owner's feet, longer at the toe and
    // higher at the instep than the boot's own foot) would poke out past its toe and over its instep.
    bareFootOff(g, s);
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

/**
 * Takes our foot and our shin below `t` of its length from the knee away (a boot the owner painted takes
 * their place; above his boot's top our shin stays, so legs without trousers keep their knees).
 */
function shinOffBelow(g: DrawCtx, s: Side, t: number): void {
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const { knee, ankle } = legJoints(g.rig, s);
  const d = sub(ankle, knee);
  const l2 = d.x * d.x + d.y * d.y || 1;
  // Only the bare leg: trousers (their own layer) stay, bloused over his boot as he drew them.
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || (L.part[i] !== shin && L.part[i] !== foot)) continue;
    const x = ((i % GRID) + 0.5) / RES - knee.x;
    const y = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
    if (L.part[i] === foot || (x * d.x + y * d.y) / l2 > t) L.mat[i] = -1;
  }
}

/** How far down the shin (from the knee) his laced boots' shafts start at rest, a little under it. */
const LEATHER_BOOT_TOP = 0.45;
/** The same for his open-toed boots, whose shafts start just under the knee. */
const OPEN_BOOT_TOP = 0.2;

/** Takes our bare foot away (a sandal the owner painted takes its place); the shin stays. */
function bareFootOff(g: DrawCtx, s: Side): void {
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === foot) L.mat[i] = -1;
  }
}

/** The sandals' pieces in a paint: his Solen's (the default) or his Roman ones (feet_gladiator_sandals' Paint part). */
export function sandalPieces(paint: string | undefined) {
  const solen = paint !== 'roman';
  return {
    N: { shin: solen ? FOUNDER_SANDAL_SHIN_N : SANDAL_SHIN_N, foot: solen ? FOUNDER_SANDAL_FOOT_N : SANDAL_FOOT_N },
    F: { shin: solen ? FOUNDER_SANDAL_SHIN_F : SANDAL_SHIN_F, foot: solen ? FOUNDER_SANDAL_FOOT_F : SANDAL_FOOT_F },
    kind: (solen ? FOUNDER_SANDAL_KIND : ROMAN_KIT_KIND) as Record<string, string>,
    skin: solen ? FOUNDER_SANDAL_SKIN : SANDAL_SKIN,
    leather: solen ? FOUNDER_SANDAL_LEATHER : SANDAL_LEATHER,
  };
}

/** Rows across his laced shin that make one turn of its lacing (continuedTo). */
const LACE_PERIOD = 2;

const SHIN_MOVING = new Map<string, PaintedPiece>();

/** His Solen's laced shin on a moving leg: only the shin (limbOnly), its lacing continued up to the knee. */
function sandalShinMoving(body: BodyType, s: Side): PaintedPiece {
  const key = body + s;
  let p = SHIN_MOVING.get(key);
  if (!p) {
    const shin = s === 'N' ? FOUNDER_SANDAL_SHIN_N : FOUNDER_SANDAL_SHIN_F;
    const line = (hex: string) => FOUNDER_SANDAL_KIND[hex] === 'line';
    const kneeRow = shin.pivot[1] - founderLegLen(body, s, 'shin') * Math.sin((shin.angle * Math.PI) / 180);
    SHIN_MOVING.set(key, (p = continuedTo(limbOnly(shin, line), kneeRow, 3, line, (hex) => !line(hex), LACE_PERIOD)));
  }
  return p;
}

/** How near the ankle (fine pixels) his Trunks boots' turned shaft and flat foot are closed. */
const BOOT_ANKLE_R = 6;

/**
 * His Trunks boot on a leg: the laced shaft turned with the shin about the ankle, the foot flat on the
 * ground, or turned with the shaft once the shin swings far from rest (footTurn). Turned, the shaft keeps
 * his black line whole (rotateLined: at some angles a cell of his line fell between the turned samples
 * and the leather lay bare against the air), and where the turned shaft and
 * the flat foot part at the ankle, the cut is closed with his line: a leather pixel there left bare
 * against the air takes his line, and a notch the two leave between them (an empty pixel walled in on
 * three sides) is filled with it. Unturned (at rest) it is his boot exactly. The owner on Trunks 3,
 * 2026-10-22: "en embestida y en varias poses donde el personaje se inclina hacia delante tienes unos
 * pixeles muertos blancos en la bota derecha".
 */
function stampBoot(g: DrawCtx, s: Side, shaft: PaintedPiece, foot: PaintedPiece, slot: Record<string, string>, tint: (ch: string, hex: string) => string): void {
  const { knee, ankle } = legJoints(g.rig, s);
  const line = (hex: string) => slot[hex] === 'line';
  const deg = segAngle(knee, ankle);
  stampPiece(g, legDepth(s, 'feet'), shaft, ankle, deg, `shin${s}`, tint, line);
  // Swung far from rest (a kick, combo 5/8, the run's back leg) the foot turns with the shaft, as he drew
  // them as one (footTurn: flat at rest, standing and in the lean).
  stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle + footTurn(g, s), `foot${s}`, tint, line);
  if (Math.round(deg - shaft.angle) % 360 === 0) return;
  const L = g.L(legDepth(s, 'feet'));
  const lineCh = Object.keys(shaft.colors).find((ch) => line(shaft.colors[ch]));
  if (!lineCh) return;
  const edge = g.m(tint(lineCh, shaft.colors[lineCh]), 'flat');
  const lines = new Set([shaft, foot].flatMap((p) => Object.keys(p.colors).filter((ch) => line(p.colors[ch])).map((ch) => g.m(tint(ch, p.colors[ch]), 'flat'))));
  const ax = Math.floor(ankle.x * RES);
  const ay = Math.floor(ankle.y * RES);
  const near: number[] = [];
  for (let y = Math.max(1, ay - BOOT_ANKLE_R); y <= Math.min(GRID - 2, ay + BOOT_ANKLE_R); y++)
    for (let x = Math.max(1, ax - BOOT_ANKLE_R); x <= Math.min(GRID - 2, ax + BOOT_ANKLE_R); x++) near.push(y * GRID + x);
  const sides = (i: number) => [i - 1, i + 1, i - GRID, i + GRID];
  // The air round the leg: nothing drawn there yet in any layer (the trousers come before the boots).
  const drawn = DEPTHS.map((d) => g.L(d)).filter((l) => l.used);
  const air = (i: number) => drawn.every((l) => l.mat[i] < 0);
  // (his bare toes in an open-toed boot keep their skin)
  const skin = new Set([shaft, foot].flatMap((p) => Object.keys(p.colors).filter((ch) => slot[p.colors[ch]] === 'skin').map((ch) => g.m(tint(ch, p.colors[ch]), 'flat'))));
  const bare = near.filter((i) => L.mat[i] >= 0 && !lines.has(L.mat[i]) && !skin.has(L.mat[i]) && sides(i).some(air));
  for (const i of bare) L.mat[i] = edge;
  // A notch filled can leave the next one beside it: a few rounds.
  for (let round = 0; round < 3; round++) {
    const notch = near.filter((i) => air(i) && sides(i).filter((j) => L.mat[j] >= 0).length >= 3);
    if (!notch.length) break;
    for (const i of notch) {
      const j = sides(i).find((q) => L.mat[q] >= 0)!;
      L.set(i % GRID, (i / GRID) | 0, edge, 3, PARTS[L.part[j]], L.flags[j]);
    }
  }
}

/**
 * Gives our lower leg the shape of a laced shin the owner painted, stamped at `at` turned to `deg`
 * (stampPiece). His laced shin is narrower than our calf and stands straight where ours leans, so past it
 * our bare leg showed as a strip of skin between his laces' black line and what lies behind the leg (the
 * drape), from the knee down to the ankle. Row by row of his piece, our shin keeps only what lies between
 * his piece's ends in that row (under his piece, where it fills any gap the turn leaves in it); above his
 * strap band the knee keeps to the band's width, so its sides run on straight into his laces' line as his
 * knee does. Above the knee joint, within the round of the knee (the ends of our shin and thigh), only
 * what stands in front of his laces' front line is taken: the thigh comes into the knee from behind it,
 * so a bent knee keeps its shape behind that line.
 */
function legToLacedShin(g: DrawCtx, s: Side, piece: PaintedPiece, at: Vec, deg: number): void {
  const shin = partIndex(`shin${s}`);
  const thigh = partIndex(`thigh${s}`);
  const { knee, ankle } = legJoints(g.rig, s);
  const dir = norm(sub(ankle, knee));
  const round = (limbR(g, 'leg', 1) + 1) * RES;
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const turn = deg - piece.angle;
  const covered = new Set(rotateTemplate(piece, turn).map((p) => (ay + p.dy) * GRID + ax + p.dx));
  // A pixel's cell in his piece: rotateTemplate's inverse turn (whole degrees) about the pivot cell.
  const rad = (Math.round(turn) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const spans = piece.rows.map((r) => [r.search(/[^.]/), r.length - 1 - [...r].reverse().join('').search(/[^.]/)]);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || (L.part[i] !== shin && L.part[i] !== thigh)) continue;
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      const kx = x + 0.5 - knee.x * RES;
      const ky = y + 0.5 - knee.y * RES;
      const below = L.part[i] === shin && kx * dir.x + ky * dir.y > 0;
      if (!below && Math.hypot(kx, ky) > round) continue;
      const row = Math.floor(-(x - ax) * sin + (y - ay) * cos + piece.pivot[1] + 0.5);
      const col = Math.floor((x - ax) * cos + (y - ay) * sin + piece.pivot[0] + 0.5);
      const [left, right] = spans[Math.max(0, Math.min(spans.length - 1, row))];
      if (below ? col >= left && col <= right : row >= 0 || col <= right) continue;
      L.mat[i] = -1;
      // Under his piece (where the turn spreads it past its ends) no outline of our calf beside it.
      if (covered.has(i)) L.flags[i] |= F_NO_EDGE;
    }
  }
}

/** His boots' cracks against the trousers, the cape and each other, closed once the figure is drawn. */
const sealBoots = (g: DrawCtx) => sealAgainstFigure(g, ['nearLeg.feet', 'farLeg.feet']);

/**
 * Where a painted piece riding a limb puts each fine pixel, as a cell relative to its pivot cell
 * (rotateTemplate's inverse turn, whole degrees, about the pivot), and the spans of its rows the same way.
 * Several pieces share one frame when they share the pivot cell and the angle (his knee and laced shin).
 */
function pieceFrame(pieces: PaintedPiece[], at: Vec, deg: number) {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const spans = new Map<number, [number, number]>();
  const covered = new Set<number>();
  let cos = 1;
  let sin = 0;
  for (const p of pieces) {
    const turn = deg - p.angle;
    const rad = (Math.round(turn) * Math.PI) / 180;
    cos = Math.cos(rad);
    sin = Math.sin(rad);
    for (const q of rotateTemplate(p, turn)) covered.add((ay + q.dy) * GRID + ax + q.dx);
    p.rows.forEach((r, j) => {
      const left = r.search(/[^.]/);
      if (left < 0) return;
      const right = r.length - 1 - [...r].reverse().join('').search(/[^.]/);
      const key = j - p.pivot[1];
      const had = spans.get(key);
      spans.set(key, had ? [Math.min(had[0], left - p.pivot[0]), Math.max(had[1], right - p.pivot[0])] : [left - p.pivot[0], right - p.pivot[0]]);
    });
  }
  const cell = (x: number, y: number): [number, number] => [Math.floor((x - ax) * cos + (y - ay) * sin + 0.5), Math.floor(-(x - ax) * sin + (y - ay) * cos + 0.5)];
  return { spans, covered, cell };
}

/**
 * Which side of our knee a fine pixel lies on, as the script cuts his knees: the shin's when it lies past
 * the line through the knee that halves the angle between thigh and shin (at rest nearly straight across).
 */
function kneeSide(g: DrawCtx, s: Side): (x: number, y: number) => boolean {
  const { hip, knee, ankle } = legJoints(g.rig, s);
  const n = add(norm(sub(knee, hip)), norm(sub(ankle, knee)));
  return (x, y) => (x + 0.5 - knee.x * RES) * n.x + (y + 0.5 - knee.y * RES) * n.y > 0;
}

/**
 * Gives our leg the shape of the owner's whole leg below the skirt (male bodies: his knee, his laced shin;
 * the pieces as stamped). Our leg is cut along the knee as the script cuts his (kneeSide): on the thigh's
 * side, row by row of his knee's piece riding the thigh, our leg keeps only what lies between its ends; on
 * the shin's side, the same with his knee and laced shin riding the shin. Past the rows of a side's pieces
 * (under the skirt, or no such piece: his far knee is all on the shin's side) our leg stays, but near the
 * knee it keeps to his knee and laced shin and to behind his knee's front line. With the knee bent away
 * from his, the round of our knee stays, filling where his two halves part. So no skin or line of ours
 * shows beside his, at rest or with the knee bent.
 */
function legToHisLeg(g: DrawCtx, s: Side, thigh: PaintedPiece | null, kneeAt: Vec, thighDeg: number, shin: PaintedPiece[], at: Vec, shinDeg: number, bend: number): void {
  const parts = [partIndex(`shin${s}`), partIndex(`thigh${s}`)];
  const { knee } = legJoints(g.rig, s);
  const onShin = kneeSide(g, s);
  const below = pieceFrame(shin, at, shinDeg);
  const above = thigh ? pieceFrame([thigh], kneeAt, thighDeg) : null;
  const inSpan = (f: ReturnType<typeof pieceFrame>, x: number, y: number): boolean | undefined => {
    const [c, r] = f.cell(x, y);
    const sp = f.spans.get(r);
    return sp ? c >= sp[0] && c <= sp[1] : undefined;
  };
  // Past the rows of its own side's pieces, a pixel near the knee (within twice its round: the ends of
  // our thigh and shin, a wide thigh too) keeps to his knee and laced shin as the shin's side does, and
  // above them only what stands in front of his knee's front line is taken: the thigh comes into the knee
  // from behind it.
  const round = 2 * (limbR(g, 'leg', 1) + 1) * RES;
  const top = Math.min(...below.spans.keys());
  const beside = (x: number, y: number): boolean => {
    if (Math.hypot(x + 0.5 - knee.x * RES, y + 0.5 - knee.y * RES) > round) return true;
    const [c, r] = below.cell(x, y);
    if (r < top) return c <= below.spans.get(top)![1];
    return inSpan(below, x, y) ?? true;
  };
  // With the knee bent away from his (his two halves part on the outside of the bend), the round of our
  // knee fills between them: none of it at his bend, all of it 20 degrees and more away.
  const off = Math.abs(((shinDeg - thighDeg - bend + 540) % 360) - 180);
  const fill = Math.min(1, off / 20) * limbR(g, 'leg', 1) * RES;
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || !parts.includes(L.part[i])) continue;
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      if (Math.hypot(x + 0.5 - knee.x * RES, y + 0.5 - knee.y * RES) < fill) continue;
      const own = onShin(x, y) ? below : above;
      if ((own && inSpan(own, x, y)) ?? beside(x, y)) continue;
      L.mat[i] = -1;
      if (below.covered.has(i) || above?.covered.has(i)) L.flags[i] |= F_NO_EDGE;
    }
  }
}

/**
 * Stamps one of his knee's pieces (as stampPiece does), only on its own side of our knee (kneeSide): with
 * the knee bent, what rides the thigh does not stand out past the shin, nor what rides the shin past the
 * thigh. At rest the script cut them along that line, so every pixel is drawn.
 */
function stampKnee(g: DrawCtx, s: Side, piece: PaintedPiece, at: Vec, deg: number, shinSide: boolean, color: (ch: string, hex: string) => string): void {
  const onShin = kneeSide(g, s);
  const L = g.L(legDepth(s, 'feet'));
  const part: PartId = shinSide ? `shin${s}` : `thigh${s}`;
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const mats: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) mats[ch] = g.m(color(ch, hex), 'flat');
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (onShin(x, y) !== shinSide) continue;
    L.set(x, y, mats[p.ch], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

/** The near sandal's sole at rest (the lowest row of the frame his feet stand on). */
const LOWEST_SOLE = ROMAN_KIT_REST.SANDAL_FOOT_N[1] + SANDAL_FOOT_N.rows.length - 1;

/**
 * How far past our ankle his sandal's pivot lands on a male body (ROMAN_KIT_REACH, given at the shin's rest
 * angle, turned as the shin now turns by `turn` degrees): his far leg reaches down to where he drew it. It
 * is shortened where it would put his sandal's sole below the near sandal's at rest (a far foot standing in
 * front of the near one), which no pose of his shows.
 */
function reach(s: Side, ankle: Vec, turn: number, foot: PaintedPiece): Vec {
  const [dx, dy] = ROMAN_KIT_REACH[s];
  const a = (turn * Math.PI) / 180;
  const r = v((dx * Math.cos(a) - dy * Math.sin(a)) / RES, (dx * Math.sin(a) + dy * Math.cos(a)) / RES);
  const room = LOWEST_SOLE - (Math.floor(ankle.y * RES) + foot.rows.length - 1 - foot.pivot[1]);
  const k = r.y > 0 && r.y * RES > room ? Math.max(0, room) / (r.y * RES) : 1;
  return v(r.x * k, r.y * k);
}

/**
 * His Roman paint of the sandals (body/male-skin-face): his legs stand wider than ours, so each is moved onto
 * our leg (his sole on ours), and our lower leg takes his laced shin's shape (legToLacedShin), so no bare calf
 * shows beside it. His skin between the laces follows the character's skin as his skin on the male limbs does
 * (maleSkin.ts), from the skin he painted on, so in that skin it is his pixels and it meets the knee above it.
 * On the male bodies his legs come whole (owner, 2026-10-21: "copia la referencia con exactitud en la
 * rodilla"): his knee between the skirt and the strap band rides the leg too, all of it his skin (his muscle
 * lines too) and his black line, and his far leg reaches down to where he drew it (ROMAN_KIT_REACH, turned
 * with the shin), so at rest his legs below the skirt are his pixels. The female bodies keep their own knees,
 * the sandals on our ankles. Lifted well off the ground, his sandal turns with his laced shin (ankle.ts).
 */
function drawRomanSandals(g: DrawCtx, tint: (ch: string, hex: string) => string): void {
  const skinTint = (_ch: string, hex: string) => (ROMAN_KIT_KIND[hex] === 'line' ? hex : retintSkinLifted(hex, MALE_SKIN_BASE, g.look.skin));
  const whole = takesMaleSkin(g.rig.body);
  for (const s of SIDES) {
    const { hip, knee, ankle } = legJoints(g.rig, s);
    bareFootOff(g, s);
    const shin = s === 'N' ? SANDAL_SHIN_N : SANDAL_SHIN_F;
    const foot = s === 'N' ? SANDAL_FOOT_N : SANDAL_FOOT_F;
    const shinDeg = segAngle(knee, ankle);
    const at = whole ? add(ankle, reach(s, ankle, shinDeg - shin.angle, foot)) : ankle;
    const kneeP = ROMAN_KIT_KNEES[s];
    const L = legDepth(s, 'feet');
    if (whole) {
      const thighDeg = segAngle(hip, knee);
      legToHisLeg(g, s, kneeP.thigh, knee, thighDeg, kneeP.shin ? [kneeP.shin, shin] : [shin], at, shinDeg, kneeP.bend);
      if (kneeP.thigh) stampKnee(g, s, kneeP.thigh, knee, thighDeg, false, skinTint);
      if (kneeP.shin) stampKnee(g, s, kneeP.shin, at, shinDeg, true, skinTint);
    } else {
      legToLacedShin(g, s, shin, ankle, shinDeg);
    }
    stampPiece(g, L, shin, at, shinDeg, `shin${s}`, tint);
    const turn = footTurn(g, s);
    stampPiece(g, L, foot, at, foot.angle + turn, `foot${s}`, tint);
    if (turn) {
      const lineHex = [...Object.values(shin.colors), ...Object.values(foot.colors)].filter((hex) => ROMAN_KIT_KIND[hex] === 'line');
      if (lineHex.length) closeAnkle(g, s, at, g.m(lineHex[0], 'flat'), new Set(lineHex.map((hex) => g.m(hex, 'flat'))));
    }
  }
}

export const FEET_ITEMS: ItemDef[] = [
  {
    id: 'feet_leather',
    slot: 'feet',
    name: 'Leather Boots',
    desc: 'Brown laced leather boots to mid-shin, worn and creased, on a dark sole.',
    colors: [col('main', 'Leather', LEATHER_BOOT_BROWN)],
    finish: sealBoots,
    draw: (g, [c]) => {
      // The owner's boots from his Trunks 2 picture (2026-10-21; tools/refs/trunks-leather-boots-from-ref.py):
      // on each leg the laced shaft turns with the shin about the ankle and the foot stays flat on the
      // ground, our shin under the shaft and our foot taken away. At rest every pixel is his, where he drew
      // it. His browns follow the slot (the old default means his); his black line stays.
      const brown = savedAsHis(c, '#6b4226', LEATHER_BOOT_BROWN);
      const tint = slotTint(g, LEATHER_BOOT_SLOT, { main: LEATHER_BOOT_BROWN }, { main: brown });
      for (const s of SIDES) {
        shinOffBelow(g, s, LEATHER_BOOT_TOP);
        const [shaft, foot] = s === 'N' ? [BOOT_SHAFT_N, BOOT_FOOT_N] : [BOOT_SHAFT_F, BOOT_FOOT_F];
        stampBoot(g, s, shaft, foot, LEATHER_BOOT_SLOT, tint);
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
    name: 'Open-Toed Boots',
    desc: 'Tan leather boots to mid-shin, scuffed and creased, open at the front over the bare toes.',
    colors: [col('main', 'Leather', OPEN_BOOT_TAN)],
    finish: sealBoots,
    draw: (g, [c]) => {
      // The owner's boots from his Trunks 3 picture (2026-10-21; tools/refs/trunks-cowboy-from-ref.py): he
      // drew this slot's boots (the Cowboy Boots) open over the toes, so they are open-toed boots now.
      // Drawn as his leather boots are (feet_leather); his toes follow the character's skin.
      const tan = savedAsHis(c, '#8b5a2f', OPEN_BOOT_TAN);
      const tint = slotTint(g, OPEN_BOOT_SLOT, { main: OPEN_BOOT_TAN }, { main: tan });
      for (const s of SIDES) {
        shinOffBelow(g, s, OPEN_BOOT_TOP);
        const [shaft, foot] = s === 'N' ? [OPEN_BOOT_SHAFT_N, OPEN_BOOT_FOOT_N] : [OPEN_BOOT_SHAFT_F, OPEN_BOOT_FOOT_F];
        stampBoot(g, s, shaft, foot, OPEN_BOOT_SLOT, tint);
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
        // His ankle, carried round with the shin (shinCarried): his greave, turned about our knee, and his
        // sabaton meet there in every pose as at rest; lifted well off the ground the sabaton turns with the shin.
        const [dx, dy] = SABATON_SHIFT[s];
        // A body standing on lower ankles (the female bodies' small feet) keeps his sabaton on the ground.
        const at = add(ankle, add(shinCarried(g, s, dx, dy), v(0, -ankleLiftOf(g.bp, s))));
        const shin = s === 'N' ? SABATON_SHIN_N : SABATON_SHIN_F;
        const foot = s === 'N' ? SABATON_FOOT_N : SABATON_FOOT_F;
        // (as one: turned with the shin, the sabaton stays joined to his greave as he drew them, stampJoined)
        stampJoined(g, legDepth(s, 'feet'), shin, foot, at, segAngle(knee, ankle), foot.angle + footTurn(g, s, true), [`shin${s}`, `foot${s}`], (hex) => crimsonKind(hex) === 'line', tint);
      }
    },
  },
  FEET_DAWN_BOOTS,
  {
    id: 'feet_gladiator_sandals',
    slot: 'feet',
    name: 'Gladiator Sandals',
    desc: 'Leather sandals laced up the shins to a strap under the knee; the toes stay bare.',
    colors: [col('main', 'Leather', FOUNDER_SANDAL_LEATHER, 'leather')],
    parts: [
      {
        key: 'paint',
        label: 'Paint',
        options: [
          { id: 'founder', label: "Solen's", desc: 'As the owner repainted them on his Solen (the new standard): new laces, the far shin shorter.' },
          { id: 'roman', label: 'Roman paint', desc: 'As the owner first painted them on his Roman legionary.' },
        ],
      },
    ],
    draw: (g, [leather], parts) => {
      // The owner's sandals, his pixels from his Roman picture (2026-10-21; tools/refs/
      // roman-bracers-sandals-from-ref.py), or as he repainted them on his Solen (tools/refs/
      // solen-sandals-from-ref.py): on each leg the laced shin turns with the shin about the ankle and
      // the sandal stays flat on the ground like our feet, our bare foot under it taken away. His Roman
      // legs stand wider than ours, so those are moved onto our leg (his sole on ours); under his Solen's
      // trousers his legs stand where he drew them at rest (founderOut.ts). His skin between the laces
      // follows the character's skin, his leather the slot; his black line stays.
      const pieces = sandalPieces(parts.paint);
      // Either paint's own leather (the default before and after his repaint) means his.
      const lc = [SANDAL_LEATHER, FOUNDER_SANDAL_LEATHER].includes(leather.toLowerCase()) ? pieces.leather : leather;
      const tint = (_ch: string, hex: string) => {
        const k = pieces.kind[hex];
        if (k === 'line') return hex;
        // His Roman skin follows the character's as his skin on the male limbs does (maleSkin.ts).
        if (k === 'skin') return parts.paint === 'roman' ? retintSkinLifted(hex, MALE_SKIN_BASE, g.look.skin) : retintHex(hex, pieces.skin, g.look.skin);
        return retintHex(hex, pieces.leather, lc);
      };
      // Moving, his Solen's laced shin goes alone (not what was lifted beside it) and laced on up to the knee
      // (his far one is drawn short: at rest his trouser leg and the sword hide the rest).
      const roman = parts.paint === 'roman';
      const moving = !roman && !founderLegsStill(g);
      // His Solen's laced shin keeps its line whole as it turns (rotateLined).
      const line = !roman ? (hex: string) => pieces.kind[hex] === 'line' : undefined;
      if (roman) {
        drawRomanSandals(g, tint);
        return;
      }
      for (const s of SIDES) {
        const { knee, ankle } = legJoints(g.rig, s);
        bareFootOff(g, s);
        const shin = moving ? sandalShinMoving(g.rig.body, s) : pieces[s].shin;
        const foot = pieces[s].foot;
        const at = add(ankle, founderLegOut(g, s).out);
        // Lifted well off the ground (a kick, the run's back leg), either sandal turns with its laced shin about
        // the ankle, as he drew them as one (footTurn: 0 standing, so at rest every pixel is his).
        const turn = moving || roman ? footTurn(g, s) : 0;
        // (as one: turned with the shin, the sandal stays joined to his laced shin as he drew them, stampJoined)
        stampJoined(g, legDepth(s, 'feet'), shin, foot, at, segAngle(knee, ankle), foot.angle + turn, [`shin${s}`, `foot${s}`], (hex) => pieces.kind[hex] === 'line', tint, line);
        if (moving || turn) {
          // His line round the ankle: the pieces' line colours (his line is never tinted).
          const lineHex = [...Object.values(shin.colors), ...(roman ? Object.values(foot.colors) : [])].filter((hex) => pieces.kind[hex] === 'line');
          if (lineHex.length) closeAnkle(g, s, at, g.m(lineHex[0], 'flat'), new Set(lineHex.map((hex) => g.m(hex, 'flat'))));
        }
      }
    },
  },
  // Lyra's thigh-high boots, the owner's pixels (items/lyraBoots.ts)
  LYRA_BOOTS,
];
