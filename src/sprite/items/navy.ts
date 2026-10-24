// The owner's navy officer (2026-10-24, docs/reference/navy-officer-*-owner-reference.jpg): his new male character
// and his favourite ("copia todos los conjuntos que puedas sacar de este personaje es mi favorito hasta ahora"),
// every part its own creator option. He drew five pictures of him, the same pose and grid, each with another
// chest: the high-collared coat with its frogging and shoulder pieces, the coat with a folded collar, the open
// coat over a shirt and vest, the buttoned coat over a green waistcoat, and the dark coat over a brocade
// waistcoat with a sash. His pictures are drawn at about twice our scale: tools/refs/navy_ref.py shrinks them to
// our male rig (his head to our Roman head's size) and cleans them with his palette only (his "Reducir y limpiar
// yo"), and tools/refs/navy-*-from-ref.py lift each part out of that. Here: the five coats, the three
// under-layers, the belt and the sash, the trousers, the boots, the gloves, the shoulder pieces and the
// scabbard. (His hairs are in hair.ts, his head and eyes in body.ts, his sabre in accessories.ts.) In our male
// idle every pixel is his; in other poses each piece follows its bone. His black line stays whatever the
// colours; his skin follows the character's skin; the rest follows the colour slots, his own colours when they
// are kept.

import { retintHex, retintSkinLifted } from '../color';
import { armDepth, armJoints, type Depth, type DrawCtx, handDraw, handPose, type ItemDef, legDepth, legJoints, type Side } from '../ctx';
import { handsBusy, handsLimp } from '../grip';
import { NAVY_SKIN } from '../navyHeadArt';
import { type PaintedPiece, segAngle, stampLeaning, stampPiece } from '../painted';
import { add, GRID, partIndex, type PartId, RES, sub, v, type Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import { NAVY_BELT, NAVY_BELT_GOLD, NAVY_BELT_KIND, NAVY_BELT_LEATHER } from './navyBeltArt';
import { NAVY_BOOTS_CUFF, NAVY_BOOTS_FOOT_F, NAVY_BOOTS_FOOT_N, NAVY_BOOTS_GOLD, NAVY_BOOTS_KIND, NAVY_BOOTS_LEATHER, NAVY_BOOTS_SHIN_F, NAVY_BOOTS_SHIN_N } from './navyBootsArt';
import * as HIGH from './navyCoatHighArt';
import * as FOLDED from './navyCoatFoldedArt';
import * as OPEN from './navyCoatOpenArt';
import * as BUTTONED from './navyCoatButtonedArt';
import * as DARK from './navyCoatDarkArt';
import { EPAULET_CLOTH, EPAULET_F, EPAULET_GOLD, EPAULET_KIND, EPAULET_N } from './navyEpauletsArt';
import { NAVY_GLOVE_F, NAVY_GLOVE_KIND, NAVY_GLOVE_LEATHER, NAVY_GLOVE_N } from './navyGlovesArt';
import { NAVY_SASH, NAVY_SASH_CLOTH, NAVY_SASH_GOLD, NAVY_SASH_KIND } from './navySashArt';
import { NAVY_SCABBARD, NAVY_SCABBARD_CLOTH, NAVY_SCABBARD_GOLD, NAVY_SCABBARD_KIND, NAVY_SCABBARD_STONE } from './navyScabbardArt';
import * as TROUSERS from './navyTrousersArt';
import * as VEST_BROCADE from './navyVestBrocadeArt';
import * as VEST_GREEN from './navyVestGreenArt';
import * as VEST_OPEN from './navyVestOpenArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
/** His pieces are cut to the male figure; the female bodies never wear the male sets (the owner, 2026-10-21). */
const MEN = ['male', 'bulky'] as const;
const arm = <T>(s: Side, n: T, f: T): T => (s === 'N' ? n : f);

/**
 * His colours through the item's slots: his black line stays, his skin follows the character's skin, each other
 * kind of his colour follows its slot (`slots`: kind -> [his colour the slot recolours from, the chosen one]).
 */
export function navyColor(g: DrawCtx, kinds: Record<string, string>, slots: Record<string, [string, string] | undefined>) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line') return hex;
    if (k === 'skin') return retintSkinLifted(hex, NAVY_SKIN, g.look.skin);
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
 * Takes our torso away: his coat is the torso, its collar round the neck (and, open at the throat, his throat in
 * the character's skin), so our skin never shows past it.
 */
function torsoOff(g: DrawCtx): void {
  partsOff(g, ['torso.body', 'torso.under'], ['torso']);
}

const IDLE = new Map<string, Rig>();
const idleRig = (body: Rig['body']): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};
const fine = (p: [number, number]): Vec => v(p[0] / RES, p[1] / RES);
const wrap180 = (a: number) => ((a + 540) % 360) - 180;
const turn = (p: Vec, deg: number): Vec => {
  const a = (deg * Math.PI) / 180;
  return v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));
};
/** How far the torso has turned from our male idle (degrees). */
const lean = (g: DrawCtx): number => segAngle(g.rig.pelvis, g.rig.neck) - segAngle(idleRig('male').pelvis, idleRig('male').neck);

/**
 * How much a limb stands as at rest: 1 while its two bones are within 20 degrees of their idle angles (the
 * torso's turn taken off), down to 0 at 35 degrees. His limbs stand his own way at rest (his near arm straighter
 * and nearer the body, his far arm bent with the fist on the hilt at his hip, his legs wider); while ours stand
 * about as at rest his stay where he drew them.
 */
function stillness(g: DrawCtx, s: Side, limb: 'arm' | 'leg'): number {
  const r = g.rig;
  const idle = idleRig(r.body);
  const t = lean(g);
  const j = limb === 'arm' ? armJoints(r, s) : legJoints(r, s);
  const j0 = limb === 'arm' ? armJoints(idle, s) : legJoints(idle, s);
  const [a, b, c] = limb === 'arm' ? (['shoulder', 'elbow', 'wrist'] as const) : (['hip', 'knee', 'ankle'] as const);
  const p = j as unknown as Record<string, Vec>;
  const p0 = j0 as unknown as Record<string, Vec>;
  const du = Math.abs(wrap180(segAngle(p[a], p[b]) - t - segAngle(p0[a], p0[b])));
  const df = Math.abs(wrap180(segAngle(p[b], p[c]) - t - segAngle(p0[b], p0[c])));
  return Math.max(0, Math.min(1, (35 - Math.max(du, df)) / 15));
}

/**
 * Where one of his joints stands (design units): ours (`p`), moved by as much of the way from our male idle's
 * joint (`ours`) to his (`H`) as the limb stands still (`w`), turned with the torso. On the male body at rest
 * exactly his, the middle of the cell he was cut about.
 */
function hisJoint(g: DrawCtx, w: number, H: Record<string, [number, number]>, s: Side) {
  const t = lean(g);
  return (p: Vec, name: string, ours: Vec): Vec => {
    const his = fine(H[name + s]);
    if (w === 1 && Math.abs(t) < 1e-9 && Math.abs(p.x - ours.x) < 1e-9 && Math.abs(p.y - ours.y) < 1e-9) return his;
    const d = turn(sub(his, ours), t);
    return add(p, v(d.x * w, d.y * w));
  };
}

/**
 * His arm's joints (design units). At rest his own (HIGH.COAT_HIGH_JOINTS, where his picture has them, the same
 * in all five pictures); as our arm moves away from its rest, ours. Each of his joints keeps where he drew it
 * from ours at rest, turned with the torso, as much as the arm stands still.
 */
export function navyArm(g: DrawCtx, s: Side): { shoulder: Vec; elbow: Vec; wrist: Vec; hand: Vec; still: number } {
  const j = armJoints(g.rig, s);
  const w = stillness(g, s, 'arm');
  const male = armJoints(idleRig('male'), s);
  const H = HIGH.COAT_HIGH_JOINTS;
  if (!w) return { ...j, still: 0 };
  const blend = hisJoint(g, w, H, s);
  return {
    shoulder: blend(j.shoulder, 'shoulder', male.shoulder),
    elbow: blend(j.elbow, 'elbow', male.elbow),
    wrist: blend(j.wrist, 'wrist', male.wrist),
    hand: blend(j.hand, 'hand', male.hand),
    still: w,
  };
}

/**
 * His leg's joints (design units), as his arm's: at rest where his picture has them (wider than ours, the far
 * foot straighter under the hip); as our leg moves, ours. His ankle keeps where he drew it from ours, so his
 * boots meet the ground where our feet do.
 */
export function navyLeg(g: DrawCtx, s: Side): { hip: Vec; knee: Vec; ankle: Vec } {
  const j = legJoints(g.rig, s);
  const w = stillness(g, s, 'leg');
  if (!w) return j;
  const male = legJoints(idleRig('male'), s);
  const blend = hisJoint(g, w, TROUSERS.TROUSERS_NAVY_JOINTS, s);
  return { hip: blend(j.hip, 'hip', male.hip), knee: blend(j.knee, 'knee', male.knee), ankle: blend(j.ankle, 'ankle', male.ankle) };
}

/** Takes our arm away above the hand: his sleeves take its place. */
function armOff(g: DrawCtx, s: Side): void {
  partsOff(g, [armDepth(s, 'body')], [`forearm${s}`, `upperArm${s}`] as PartId[]);
}

/** Takes our leg away (his trousers and boots are the leg). */
function legOff(g: DrawCtx, s: Side): void {
  partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}`, `shin${s}`, `foot${s}`] as PartId[]);
}

/** One of his coats, as its module gives it (tools/refs/navy-coat-from-ref.py). */
interface Coat {
  body: PaintedPiece;
  tails: PaintedPiece;
  back?: PaintedPiece;
  sleeves: Record<Side, [PaintedPiece, PaintedPiece]>;
  kind: Record<string, string>;
  cloth: string;
  gold: string;
  lining?: string;
  accent?: string;
}

/** A coat module's pieces under their common names (each module's constants carry its prefix). */
function coatOf(m: Record<string, unknown>, p: string): Coat {
  const g = (n: string) => m[`${p}_${n}`] as never;
  return {
    body: g('BODY'),
    tails: g('TAILS'),
    back: g('TAILS_BACK'),
    sleeves: { N: [g('SLEEVE_N_UPPER'), g('SLEEVE_N_LOWER')], F: [g('SLEEVE_F_UPPER'), g('SLEEVE_F_LOWER')] },
    kind: g('KIND'),
    cloth: g('CLOTH'),
    gold: g('GOLD'),
    lining: g('LINING'),
    accent: g('ACCENT'),
  };
}

const COATS = {
  high: coatOf(HIGH, 'COAT_HIGH'),
  folded: coatOf(FOLDED, 'COAT_FOLDED'),
  open: coatOf(OPEN, 'COAT_OPEN'),
  buttoned: coatOf(BUTTONED, 'COAT_BUTTONED'),
  dark: coatOf(DARK, 'COAT_DARK'),
};

/**
 * One of his coats on the body: the body rides the torso about the neck, each sleeve its upper arm about his
 * shoulder and its forearm (with the cuff) about his elbow, the tails hang from the pelvis in front of the legs
 * and their lining behind them; ours is taken away under them.
 */
function drawCoat(g: DrawCtx, c: Coat, colors: string[]): void {
  const r = g.rig;
  const [cloth, gold, lining, accent] = colors;
  const tint = navyColor(g, c.kind, { cloth: [c.cloth, cloth], gold: [c.gold, gold], lining: c.lining ? [c.lining, lining] : undefined, accent: c.accent ? [c.accent, accent] : undefined });
  torsoOff(g);
  for (const s of SIDES) {
    armOff(g, s);
    const j = navyArm(g, s);
    const L = armDepth(s, 'cloth');
    const [upper, lower] = c.sleeves[s];
    stampPiece(g, L, lower, j.elbow, segAngle(j.elbow, j.wrist), `forearm${s}` as PartId, tint);
    stampPiece(g, L, upper, j.shoulder, segAngle(j.shoulder, j.elbow), `upperArm${s}` as PartId, tint);
  }
  const torso = segAngle(r.pelvis, r.neck);
  stampLeaning(g, 'torso.top', c.body, r.neck, torso, 'torso', tint);
  stampLeaning(g, 'skirt', c.tails, r.pelvis, torso, 'pelvis', tint);
  if (c.back) stampLeaning(g, 'capeBack', c.back, r.pelvis, torso, 'back', tint);
}

/** A coat as a creator option: its colour slots in the order drawCoat takes them. */
function coatItem(id: string, name: string, desc: string, c: Coat): ItemDef {
  const colors = [col('cloth', 'Coat', c.cloth), col('gold', 'Trim', c.gold, 'metal')];
  colors.push(col('lining', 'Lining', c.lining ?? c.cloth));
  if (c.accent) colors.push(col('accent', 'Flames', c.accent));
  return { id, slot: 'top', name, desc, colors, bodies: [...MEN], draw: (g, cs) => drawCoat(g, c, cs) };
}

/** An under-layer's module (tools/refs/navy-vest-from-ref.py). */
interface Vest {
  piece: PaintedPiece;
  kind: Record<string, string>;
  shirt?: string;
  vest?: string;
  gold?: string;
}
function vestOf(m: Record<string, unknown>, p: string): Vest {
  return { piece: m[p] as PaintedPiece, kind: m[`${p}_KIND`] as Record<string, string>, shirt: m[`${p}_SHIRT`] as string, vest: m[`${p}_VEST`] as string, gold: m[`${p}_GOLD`] as string };
}

/** An under-layer as a creator option: under the coat (in front of the trousers), riding the torso. */
function vestItem(id: string, name: string, desc: string, labels: [string, string], vs: Vest): ItemDef {
  return {
    id,
    slot: 'armor',
    name,
    desc,
    statsArmor: 'Ronin Wanderer Cloak',
    bodies: [...MEN],
    colors: [col('shirt', labels[0], vs.shirt ?? '#d8c8a0'), col('vest', labels[1], vs.vest ?? '#3a1a28'), col('gold', 'Buttons', vs.gold ?? '#c8904b', 'metal')],
    draw: (g, [shirt, vest, gold]) => {
      const r = g.rig;
      const tint = navyColor(g, vs.kind, { shirt: vs.shirt ? [vs.shirt, shirt] : undefined, vest: vs.vest ? [vs.vest, vest] : undefined, gold: vs.gold ? [vs.gold, gold] : undefined });
      // (the trousers' seat is on this layer too: the vest, drawn after the trousers, lies over it)
      stampLeaning(g, 'torso.bottom', vs.piece, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
    },
  };
}

const PAINTS = [
  { id: 'navy', label: 'Navy', desc: 'Navy, as in his first picture.' },
  { id: 'black', label: 'Black', desc: 'Black, as in his open-coat, buttoned and dark-coat pictures.' },
];

/** The trousers in one of his paints. */
function trousersOf(paint: string) {
  const black = paint === 'black';
  return {
    thigh: { N: black ? TROUSERS.TROUSERS_BLACK_N_UPPER : TROUSERS.TROUSERS_NAVY_N_UPPER, F: black ? TROUSERS.TROUSERS_BLACK_F_UPPER : TROUSERS.TROUSERS_NAVY_F_UPPER },
    shin: { N: black ? TROUSERS.TROUSERS_BLACK_N_LOWER : TROUSERS.TROUSERS_NAVY_N_LOWER, F: black ? TROUSERS.TROUSERS_BLACK_F_LOWER : TROUSERS.TROUSERS_NAVY_F_LOWER },
    seat: black ? TROUSERS.TROUSERS_BLACK_SEAT : TROUSERS.TROUSERS_NAVY_SEAT,
    kind: black ? TROUSERS.TROUSERS_BLACK_KIND : TROUSERS.TROUSERS_NAVY_KIND,
    base: black ? TROUSERS.TROUSERS_BLACK : TROUSERS.TROUSERS_NAVY,
  };
}

/** Whether the scabbard is in his near fist as he drew it: the near arm still and its fist closed, not busy. */
export function scabbardInHand(g: DrawCtx): boolean {
  return navyArm(g, 'N').still === 1 && !handsBusy(g) && !handsLimp(g) && ['fist', 'grip'].includes(handPose(g, 'N').kind);
}

export const NAVY_ITEMS: ItemDef[] = [
  coatItem('top_navy_coat_high', "Officer's Coat (High Collar)", 'A long navy officer\'s coat: a high gold-trimmed collar lined in burgundy, gold frogging down the chest, gold-embroidered cuffs and long split tails with gold trim and burgundy lining. Wear it with the shoulder pieces as he drew it.', COATS.high),
  coatItem('top_navy_coat_folded', "Officer's Coat (Folded Collar)", 'The long navy officer\'s coat with a folded-down collar open at the throat, plain shoulders seamed in gold, gold frogging down the chest, embroidered cuffs and long split tails.', COATS.folded),
  coatItem('top_navy_coat_open', "Officer's Coat (Open)", 'The long navy coat worn open: wide lapels richly embroidered in gold, plain shoulders, embroidered cuffs and plain tails. Wear a shirt and vest under it.', COATS.open),
  coatItem('top_navy_coat_buttoned', "Officer's Coat (Buttoned)", 'The long navy coat with notched lapels edged in gold, buttoned across with gold frog bars, a flap pocket and heavy gold embroidery on the near tail.', COATS.buttoned),
  coatItem('top_navy_coat_dark', "Dark Officer's Coat", 'A dark plum open coat: gold-edged lapels embroidered in gold and red, cuffs with red and gold flames, and tails with red flames along the lower edge and gold trim.', COATS.dark),
  vestItem('armor_navy_shirt_vest', 'Shirt and Vest', 'A cream shirt with an open folded collar under a dark burgundy vest with small gold buttons, its points below the belt.', ['Shirt', 'Vest'], vestOf(VEST_OPEN, 'VEST_OPEN')),
  vestItem('armor_navy_green_vest', 'Green Waistcoat and Cravat', 'A cream cravat at the throat and a dark green patterned waistcoat.', ['Cravat', 'Waistcoat'], vestOf(VEST_GREEN, 'VEST_GREEN')),
  vestItem('armor_navy_brocade_vest', 'Black Shirt and Brocade Waistcoat', 'A black shirt open at the throat and a dark red brocade waistcoat with small gold buttons.', ['Shirt', 'Waistcoat'], vestOf(VEST_BROCADE, 'VEST_BROCADE')),
  {
    id: 'waist_navy_belt',
    slot: 'waist',
    name: "Officer's Belt",
    desc: 'A dark brown leather belt with a round gold buckle.',
    colors: [col('main', 'Belt', NAVY_BELT_LEATHER, 'leather'), col('gold', 'Buckle', NAVY_BELT_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, gold]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', NAVY_BELT, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', navyColor(g, NAVY_BELT_KIND, { leather: [NAVY_BELT_LEATHER, main], gold: [NAVY_BELT_GOLD, gold] }));
    },
  },
  {
    id: 'waist_navy_sash',
    slot: 'waist',
    name: "Officer's Sash",
    desc: 'A burgundy sash tied at the waist, its end hanging at the far hip, and a gold chain hanging below it.',
    colors: [col('main', 'Sash', NAVY_SASH_CLOTH), col('gold', 'Chain', NAVY_SASH_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, gold]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', NAVY_SASH, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', navyColor(g, NAVY_SASH_KIND, { cloth: [NAVY_SASH_CLOTH, main], gold: [NAVY_SASH_GOLD, gold] }));
    },
  },
  {
    id: 'bottom_navy_trousers',
    slot: 'bottom',
    name: "Officer's Trousers",
    desc: 'Close trousers tucked into the boots, navy or black as he painted them.',
    colors: [col('main', 'Trousers', TROUSERS.TROUSERS_NAVY)],
    parts: [{ key: 'paint', label: 'Paint', options: PAINTS }],
    bodies: [...MEN],
    draw: (g, [main], parts) => {
      // His trousers on each leg: the thigh turns about his hip, the shin about his knee (navyLeg); the seat
      // between the hips under the tails. The colour moves his navy (or his black) as far as it moves his
      // first paint's middle colour.
      const t = trousersOf(parts.paint);
      const tint = navyColor(g, t.kind, { cloth: [TROUSERS.TROUSERS_NAVY, main] });
      const r = g.rig;
      stampLeaning(g, 'torso.bottom', t.seat, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint);
      for (const s of SIDES) {
        legOff(g, s);
        const { hip, knee, ankle } = navyLeg(g, s);
        const L = legDepth(s, 'cloth');
        stampPiece(g, L, t.thigh[s], hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, t.shin[s], knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'feet_navy_boots',
    slot: 'feet',
    name: "Officer's Boots",
    desc: 'Tall black boots with folded brown cuffs trimmed in gold.',
    colors: [col('main', 'Leather', NAVY_BOOTS_LEATHER, 'leather'), col('cuff', 'Cuffs', NAVY_BOOTS_CUFF, 'leather'), col('gold', 'Trim', NAVY_BOOTS_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, cuff, gold]) => {
      // His boots: the shaft and its cuff turn with the shin about his ankle, the foot stands flat under it;
      // our foot under it is taken away.
      const tint = navyColor(g, NAVY_BOOTS_KIND, { cloth: [NAVY_BOOTS_LEATHER, main], cuff: [NAVY_BOOTS_CUFF, cuff], gold: [NAVY_BOOTS_GOLD, gold] });
      for (const s of SIDES) {
        partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`foot${s}`] as PartId[]);
        const { knee, ankle } = navyLeg(g, s);
        const shin = arm(s, NAVY_BOOTS_SHIN_N, NAVY_BOOTS_SHIN_F);
        const foot = arm(s, NAVY_BOOTS_FOOT_N, NAVY_BOOTS_FOOT_F);
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'hands_navy_gloves',
    slot: 'hands',
    name: "Officer's Gloves",
    desc: 'Black leather gloves.',
    colors: [col('main', 'Gloves', NAVY_GLOVE_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [glove]) => {
      // Closed, each hand is his fist (the far one on the sabre's hilt at rest, in front of it); open, pointing
      // or signing, our hand in the glove's colour.
      const tint = navyColor(g, NAVY_GLOVE_KIND, { leather: [NAVY_GLOVE_LEATHER, glove] });
      for (const s of SIDES) {
        const j = navyArm(g, s);
        const kind = handPose(g, s).kind;
        if (kind === 'fist' || kind === 'grip') {
          partsOff(g, [armDepth(s, 'body')], [`hand${s}`] as PartId[]);
          const p = arm(s, NAVY_GLOVE_N, NAVY_GLOVE_F);
          const depth: Depth = s === 'F' && j.still === 1 ? 'farHand.front' : armDepth(s, 'cloth');
          stampPiece(g, depth, p, j.wrist, segAngle(j.wrist, j.hand), `hand${s}` as PartId, tint);
        } else {
          handDraw(g, g.L(armDepth(s, 'cloth')), s, { mat: g.m(glove, 'leather'), part: `hand${s}` as PartId });
        }
      }
    },
  },
  {
    id: 'acc_navy_epaulets',
    slot: 'accessory',
    name: "Officer's Shoulder Pieces",
    desc: 'Ornate navy shoulder pieces edged and embroidered in gold, one over each shoulder.',
    colors: [col('main', 'Cloth', EPAULET_CLOTH), col('gold', 'Gold', EPAULET_GOLD, 'metal')],
    draw: (g, [main, gold]) => {
      // Each rides its shoulder: the far one over the far sleeve (behind the head), the near one over the near arm.
      if (!g.has('top')) return;
      const tint = navyColor(g, EPAULET_KIND, { cloth: [EPAULET_CLOTH, main], gold: [EPAULET_GOLD, gold] });
      stampPiece(g, 'torso.acc', EPAULET_F, navyArm(g, 'F').shoulder, EPAULET_F.angle, 'upperArmF', tint);
      stampPiece(g, 'nearArm.over', EPAULET_N, navyArm(g, 'N').shoulder, EPAULET_N.angle, 'upperArmN', tint);
    },
  },
  {
    id: 'acc_navy_scabbard',
    slot: 'accessory',
    name: 'Sabre Scabbard',
    desc: 'A navy scabbard with gold fittings and a red stone at its throat, held in the near fist at rest, hung at the hip otherwise.',
    colors: [col('main', 'Scabbard', NAVY_SCABBARD_CLOTH, 'leather'), col('gold', 'Fittings', NAVY_SCABBARD_GOLD, 'metal'), col('stone', 'Stone', NAVY_SCABBARD_STONE, 'metal')],
    draw: (g, [main, gold, stone]) => {
      const tint = navyColor(g, NAVY_SCABBARD_KIND, { cloth: [NAVY_SCABBARD_CLOTH, main], gold: [NAVY_SCABBARD_GOLD, gold], stone: [NAVY_SCABBARD_STONE, stone] });
      if (scabbardInHand(g)) {
        // in his near fist as he drew it, behind the fist
        stampPiece(g, 'nearArm.held', NAVY_SCABBARD, navyArm(g, 'N').hand, NAVY_SCABBARD.angle, 'held', tint);
        return;
      }
      // hung at the near hip, its throat at the belt, pointing down and back
      const r = g.rig;
      const hip = add(r.pelvis, v(-1.2, 0.6));
      stampPiece(g, 'skirt', NAVY_SCABBARD, hip, segAngle(r.pelvis, r.neck) + 90 + 48, 'pelvis', tint);
    },
  },
];
