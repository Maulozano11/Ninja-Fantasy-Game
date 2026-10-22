// Footwear. Boots cover the lower shin and the whole foot; sandals and wraps
// leave skin showing through. Shafts follow the shin procedurally; the feet
// are pixel templates in 3/4 front view (see FootArt in ctx.ts): the near foot
// faces the viewer, the far foot points right and is authored a shade darker.

import { retintHex } from '../color';
import { DEPTHS, DrawCtx, FootArt, footDraw, ItemDef, legDepth, legJoints, legPoint, Side } from '../ctx';
import type { BodyType } from '../types';
import { continuedTo, limbOnly, type PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, along, ellipse, GRID, norm, partIndex, PARTS, Pen, RES, seam, sub, v, type Vec } from '../raster';
import { sealAgainstFigure } from '../seal';
import { across, crease, fpx, limb, limbR, stitch, stud, tube, wrapStripes } from './clothes';
import { founderFootTurn, founderLegLen, founderLegOut, founderLegsStill } from './founderOut';
import { FOUNDER_SANDAL_FOOT_F, FOUNDER_SANDAL_FOOT_N, FOUNDER_SANDAL_KIND, FOUNDER_SANDAL_LEATHER, FOUNDER_SANDAL_SHIN_F, FOUNDER_SANDAL_SHIN_N, FOUNDER_SANDAL_SKIN } from './founderSandalsArt';
import { ROMAN_KIT_KIND, SANDAL_FOOT_F, SANDAL_FOOT_N, SANDAL_LEATHER, SANDAL_SHIN_F, SANDAL_SHIN_N, SANDAL_SKIN } from './bracersSandalsArt';
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

/** How near the ankle (fine pixels) his laced shin and his sandal meet. */
const ANKLE_R = 5;

/**
 * His line round the ankle of a moving leg. He drew his laced shin and his sandal as one: the shin's foot
 * end and the sandal's top are open, each covering the other. As the shin turns away from the sandal (a
 * step, a kick), their open corners come out beside each other bare; there they take his line, as the
 * rest of the leg is closed.
 */
function closeAnkle(g: DrawCtx, s: Side, at: Vec, shin: PaintedPiece, tint: (ch: string, hex: string) => string): void {
  const L = g.L(legDepth(s, 'feet'));
  const lineCh = Object.keys(shin.colors).filter((ch) => FOUNDER_SANDAL_KIND[shin.colors[ch]] === 'line');
  if (!lineCh.length) return;
  const lines = new Set(lineCh.map((ch) => g.m(tint(ch, shin.colors[ch]), 'flat')));
  const edge = g.m(tint(lineCh[0], shin.colors[lineCh[0]]), 'flat');
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
  for (const i of open) L.mat[i] = edge;
}

/** How near the ankle (fine pixels) his Trunks boots' turned shaft and flat foot are closed. */
const BOOT_ANKLE_R = 6;

/**
 * His Trunks boot on a leg: the laced shaft turned with the shin about the ankle, the foot flat on the
 * ground. Turned, the shaft keeps his black line whole (rotateLined: at some angles a cell of his line fell
 * between the turned samples and the leather lay bare against the air), and where the turned shaft and
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
  stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}`, tint);
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

/** His boots' cracks against the trousers, the cape and each other, closed once the figure is drawn. */
const sealBoots = (g: DrawCtx) => sealAgainstFigure(g, ['nearLeg.feet', 'farLeg.feet']);

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
    colors: [col('main', 'Leather', FOUNDER_SANDAL_LEATHER, 'leather')],
    parts: [
      {
        key: 'paint',
        label: 'Paint',
        options: [
          { id: 'founder', label: "Solen's", desc: 'As the owner repainted them on his Solen (the new standard): new laces, the far shin shorter.' },
          { id: 'roman', label: 'Roman', desc: 'As the owner first painted them on his Roman legionary.' },
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
        return k === 'skin' ? retintHex(hex, pieces.skin, g.look.skin) : retintHex(hex, pieces.leather, lc);
      };
      // Moving, his Solen's laced shin goes alone (not what was lifted beside it) and laced on up to the knee
      // (his far one is drawn short: at rest his trouser leg and the sword hide the rest).
      const moving = parts.paint !== 'roman' && !founderLegsStill(g);
      // His Solen's laced shin keeps its line whole as it turns (rotateLined).
      const line = parts.paint !== 'roman' ? (hex: string) => pieces.kind[hex] === 'line' : undefined;
      for (const s of SIDES) {
        const { knee, ankle } = legJoints(g.rig, s);
        bareFootOff(g, s);
        const shin = moving ? sandalShinMoving(g.rig.body, s) : pieces[s].shin;
        const foot = pieces[s].foot;
        const at = add(ankle, founderLegOut(g, s).out);
        stampPiece(g, legDepth(s, 'feet'), shin, at, segAngle(knee, ankle), `shin${s}`, tint, line);
        stampPiece(g, legDepth(s, 'feet'), foot, at, foot.angle + (moving ? founderFootTurn(g, s) : 0), `foot${s}`, tint, line);
        if (moving) closeAnkle(g, s, at, shin, tint);
      }
    },
  },
];
