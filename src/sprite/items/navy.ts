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
import { type PaintedPiece, segAngle, stampLeaning, stampPiece, stretchPiece } from '../painted';
import { closeAnkle, footTurn } from './ankle';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, type PartId, RES, sub, v, type Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import { NAVY_BELT, NAVY_BELT_GOLD, NAVY_BELT_KIND, NAVY_BELT_LEATHER } from './navyBeltArt';
import { NAVY_BOOTS_CUFF, NAVY_BOOTS_FOOT_F, NAVY_BOOTS_FOOT_N, NAVY_BOOTS_GOLD, NAVY_BOOTS_KIND, NAVY_BOOTS_LEATHER, NAVY_BOOTS_SHIN_F, NAVY_BOOTS_SHIN_N } from './navyBootsArt';
import * as HIGH from './navyCoatHighArt';
import * as FOLDED from './navyCoatFoldedArt';
import * as OPEN from './navyCoatOpenArt';
import * as BUTTONED from './navyCoatButtonedArt';
import * as DARK from './navyCoatDarkArt';
import { EPAULET_CLOTH, EPAULET_F, EPAULET_GOLD, EPAULET_KIND, EPAULET_N } from './navyEpauletsArt';
import { NAVY_GLOVE_KIND, NAVY_GLOVE_LEATHER, NAVY_GLOVE_N } from './navyGlovesArt';
import { NAVY_SASH, NAVY_SASH_CLOTH, NAVY_SASH_GOLD, NAVY_SASH_KIND } from './navySashArt';
import { NAVY_SCABBARD, NAVY_SCABBARD_CLOTH, NAVY_SCABBARD_GOLD, NAVY_SCABBARD_KIND, NAVY_SCABBARD_REST, NAVY_SCABBARD_STONE } from './navyScabbardArt';
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
 * His arm's joints (design units): ours, the arm standing in our pose (the owner on his five outfits, 2026-10-24:
 * "no dibujes la espada ni la mano en la espada ponlo en nuestra pose"); only his shoulder keeps where he drew it
 * from ours (HIGH.COAT_HIGH_JOINTS), turned with the torso, so his sleeve and shoulder piece sit on his coat's
 * shoulder in every pose.
 */
export function navyArm(g: DrawCtx, s: Side): { shoulder: Vec; elbow: Vec; wrist: Vec; hand: Vec } {
  const j = armJoints(g.rig, s);
  const male = armJoints(idleRig('male'), s);
  return { ...j, shoulder: hisJoint(g, 1, HIGH.COAT_HIGH_JOINTS, s)(j.shoulder, 'shoulder', male.shoulder) };
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
    // (his far arm was bent toward us, the fist on the hilt: hanging or moving in our pose it is his near arm,
    // his straight sleeve and its cuff, turned about our far joints)
    const [upper, lower] = c.sleeves.N;
    stampPiece(g, L, lower, j.elbow, segAngle(j.elbow, j.wrist), `forearm${s}` as PartId, tint);
    stampPiece(g, L, upper, j.shoulder, segAngle(j.shoulder, j.elbow), `upperArm${s}` as PartId, tint);
  }
  const torso = segAngle(r.pelvis, r.neck);
  stampLeaning(g, 'torso.top', c.body, r.neck, torso, 'torso', tint);
  // Under it the same coat again where it would hang from the pelvis, so a torso stretched longer than at rest
  // (a sword raised in victory, a lunge) leaves no gap at the waist; and, on a broader body, moved out to each
  // of its shoulders as far as they stand past his (as Ren's jacket is: items/night.ts), so its sides reach the
  // sleeves. His pixels, his line.
  const home = idleRig(r.body);
  const t = ((torso - segAngle(home.pelvis, home.neck)) * Math.PI) / 180;
  const rot = (d: Vec) => v(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t));
  const rest = idleRig('male');
  stampLeaning(g, 'torso.under', c.body, add(r.pelvis, rot(sub(rest.neck, rest.pelvis))), torso, 'torso', tint);
  if (r.body !== 'male') {
    for (const s of SIDES) {
      const sh = (q: Rig) => (s === 'N' ? q.shoulderN : q.shoulderF);
      stampLeaning(g, 'torso.under', c.body, add(r.neck, rot(sub(sub(sh(home), home.neck), sub(sh(rest), rest.neck)))), torso, 'torso', tint);
    }
  }
  const line = (hex: string) => c.kind[hex] === 'line';
  for (const t of tailStamps(r, c)) stampLeaning(g, t.depth, t.piece, t.at, t.deg, t.part, tint, line);
}

/**
 * How much a tail follows the thigh that swings into it: the front one all of it (it lies on the thigh), the
 * back one part of it (it drapes over the back of the thigh, its own weight pulling it down), at most
 * TAIL_BACK_MOST degrees; and how much one swinging away (it hangs).
 */
const TAIL_PUSH = 1;
const TAIL_BACK_PUSH = 0.55;
const TAIL_BACK_MOST = 40;
const TAIL_TRAIL = 0.3;
/** The rows of a tail under the waist swept from the torso's lean to the tail's, so the cloth folds there without a gap. */
const TAIL_FOLD = 2;
/** Past this lean (degrees, lying down) the tails lie along the body as the torso does. */
const TAIL_LIE = 60;

/** A piece of a coat's tails where the tails stamp it (stampLeaning). */
interface TailStamp {
  depth: Depth;
  piece: PaintedPiece;
  at: Vec;
  deg: number;
  part: PartId;
}

const TAIL_CUTS = new Map<PaintedPiece, Map<string, PaintedPiece>>();
/** His cells of `p` that `keep` keeps (`key` names which), turned about the cell `pivot`. */
function tailCut(p: PaintedPiece, key: string, keep: (x: number, y: number) => boolean, pivot: [number, number]): PaintedPiece {
  const k = `${key}:${pivot.join(',')}`;
  let cuts = TAIL_CUTS.get(p);
  if (!cuts) TAIL_CUTS.set(p, (cuts = new Map()));
  let out = cuts.get(k);
  if (!out) cuts.set(k, (out = { ...p, rows: p.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && keep(x, y) ? ch : '.')).join('')), pivot }));
  return out;
}

const SPLITS = new Map<PaintedPiece, number>();
/**
 * Where his two tails part (a column of his tails piece): the middle of the widest run of empty columns
 * below the waist with his cloth on both sides. Left of it the back tail, right of it the front one.
 */
function tailSplit(p: PaintedPiece): number {
  let at = SPLITS.get(p);
  if (at !== undefined) return at;
  const from = p.pivot[1] + 3;
  const W = Math.max(...p.rows.map((r) => r.length));
  const used = Array.from({ length: W }, (_, x) => p.rows.some((row, y) => y >= from && row[x] !== undefined && row[x] !== '.'));
  let best = [0, 0];
  for (let x = 0; x < W; ) {
    if (used[x]) { x++; continue; }
    let e = x;
    while (e < W && !used[e]) e++;
    if (x > 0 && e < W && e - x > best[1] - best[0]) best = [x, e];
    x = e;
  }
  SPLITS.set(p, (at = Math.floor((best[0] + best[1]) / 2)));
  return at;
}

/** How far each thigh has turned from the way it stands at rest (degrees, - = swung forward). */
function thighTurns(r: Rig): Record<Side, number> {
  const home = idleRig(r.body);
  const t = (s: Side) => wrap180(segAngle(legJoints(r, s).hip, legJoints(r, s).knee) - segAngle(legJoints(home, s).hip, legJoints(home, s).knee));
  return { N: t('N'), F: t('F') };
}

/**
 * His coat's tails as cloth. Above the hips they ride the torso (its lean); below, each tail hangs from the
 * waist where it leaves the coat and turns on its own: the front one with the thigh that swings forward
 * into it (lying on it), the back one with the thigh that swings back into it, each only a little the
 * other way, and neither with the torso's lean (they hang); the rows under the waist are swept through the
 * fold between. The lining he drew between the legs goes with the back tail, and the glimpses of it he
 * left behind the legs only where he drew them (the legs at rest). Every piece is his pixels, turned
 * whole; at rest every pixel is where he drew it.
 */
function tailStamps(r: Rig, c: Coat): TailStamp[] {
  const p = c.tails;
  const [px, py] = p.pivot;
  const torso = segAngle(r.pelvis, r.neck);
  const d = wrap180(torso - p.angle);
  const tt = thighTurns(r);
  const fwd = Math.min(tt.N, tt.F);
  const back = Math.max(tt.N, tt.F);
  const lie = Math.abs(wrap180(torso - segAngle(idleRig(r.body).pelvis, idleRig(r.body).neck))) > TAIL_LIE;
  const turnOf = { front: lie ? d : fwd < 0 ? fwd * TAIL_PUSH : fwd * TAIL_TRAIL, back: lie ? d : back > 0 ? Math.min(TAIL_BACK_MOST, back * TAIL_BACK_PUSH) : back * TAIL_TRAIL };
  const split = tailSplit(p);
  const P = [Math.floor(r.pelvis.x * RES), Math.floor(r.pelvis.y * RES)];
  const out: TailStamp[] = [];
  // where the cell (x, y) of his tails stands on the torso leaning `d`: as design units at that pixel's middle
  const onTorso = (x: number, y: number): Vec => {
    const a = (d * Math.PI) / 180;
    const [ox, oy] = [x - px, y - py];
    return v((P[0] + Math.round(ox * Math.cos(a) - oy * Math.sin(a)) + 0.5) / RES, (P[1] + Math.round(ox * Math.sin(a) + oy * Math.cos(a)) + 0.5) / RES);
  };
  const hinges: Record<'front' | 'back', { at: Vec; hinge: [number, number]; turn: number }> = {} as never;
  for (const side of ['back', 'front'] as const) {
    const mine = (x: number) => (side === 'back' ? x < split : x >= split);
    const row = p.rows[py + 1] ?? '';
    const xs = [...row].map((ch, x) => (ch !== '.' && mine(x) ? x : -1)).filter((x) => x >= 0);
    const hinge: [number, number] = [xs.length ? Math.round((xs[0] + xs[xs.length - 1]) / 2) : side === 'back' ? split - 1 : split, py + 1];
    const at = onTorso(...hinge);
    const turn = turnOf[side];
    hinges[side] = { at, hinge, turn };
    const fold = turn - d;
    const n = Math.ceil(Math.abs(fold) / 10);
    for (let k = 0; k < n; k++) out.push({ depth: 'skirt', piece: tailCut(p, `${side}fold`, (x, y) => mine(x) && y > py && y <= py + TAIL_FOLD, hinge), at, deg: p.angle + d + (fold * k) / n, part: 'pelvis' });
    out.push({ depth: 'skirt', piece: tailCut(p, side, (x, y) => mine(x) && y > py, hinge), at, deg: p.angle + turn, part: 'pelvis' });
  }
  out.push({ depth: 'skirt', piece: tailCut(p, 'upper', (_x, y) => y <= py, [px, py]), at: r.pelvis, deg: torso, part: 'pelvis' });
  if (c.back) {
    // his lining, in his tails' cells: its main run with the back tail, the rest only as he drew it
    const b = c.back;
    const [bx, by] = [px - b.pivot[0], py - b.pivot[1]];
    const main = largestRun(b);
    const still = Math.abs(d) < 1 && Math.abs(tt.N) < 1 && Math.abs(tt.F) < 1;
    if (!still && main.size < LINING_RUN) return out;
    const { at, hinge, turn } = hinges.back;
    out.unshift({ depth: 'capeBack', piece: tailCut(b, still ? 'lining' : 'liningMain', (x, y) => still || main.has(y * 1000 + x), [hinge[0] - bx, hinge[1] - by]), at, deg: p.angle + (still ? d : turn), part: 'back' });
  }
  return out;
}

/** The fewest cells of his lining that hang on with the back tail as it moves (fewer are a glimpse he left only at rest). */
const LINING_RUN = 8;

const RUNS = new Map<PaintedPiece, Set<number>>();
/** The cells (y * 1000 + x) of a piece's largest 4-connected run of cells. */
function largestRun(p: PaintedPiece): Set<number> {
  let best = RUNS.get(p);
  if (best) return best;
  best = new Set();
  const seen = new Set<number>();
  const has = (x: number, y: number) => y >= 0 && y < p.rows.length && x >= 0 && (p.rows[y][x] ?? '.') !== '.';
  p.rows.forEach((row, y) => [...row].forEach((_ch, x) => {
    if (!has(x, y) || seen.has(y * 1000 + x)) return;
    const run = new Set<number>();
    const todo = [[x, y]];
    seen.add(y * 1000 + x);
    while (todo.length) {
      const [cx, cy] = todo.pop()!;
      run.add(cy * 1000 + cx);
      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) if (has(nx, ny) && !seen.has(ny * 1000 + nx)) { seen.add(ny * 1000 + nx); todo.push([nx, ny]); }
    }
    if (run.size > best!.size) best = run;
  }));
  RUNS.set(p, best);
  return best;
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

/** His thighs' lengths (fine pixels) at rest, hip to knee. */
const HIS_THIGH: Record<Side, number> = (() => {
  const J = TROUSERS.TROUSERS_NAVY_JOINTS;
  const len = (s: Side) => Math.hypot(J['knee' + s][0] - J['hip' + s][0], J['knee' + s][1] - J['hip' + s][1]);
  return { N: len('N'), F: len('F') };
})();

/** His boots' black line colours, and the one used most (the line closing the ankle). */
const BOOT_LINES = Object.keys(NAVY_BOOTS_KIND).filter((hex) => NAVY_BOOTS_KIND[hex] === 'line');
const BOOT_LINE = BOOT_LINES[0];

/** How far below the pelvis (fine px) the trousers' crotch is closed (crotch). */
const CROTCH = 4;

/**
 * The trousers' crotch closed behind the legs: between the two hips and a point CROTCH px below the pelvis,
 * his trousers' darkest cloth, his line along its edge. His seat leaves the crotch to the thighs, which
 * cover it at rest; in a wide stance the legs part and the background would show up into the seat.
 */
function crotch(g: DrawCtx, kinds: Record<string, string>, tint: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const len = Math.hypot(r.pelvis.x - r.neck.x, r.pelvis.y - r.neck.y) || 1;
  const low = v(r.pelvis.x + ((r.pelvis.x - r.neck.x) / len) * (CROTCH / RES), r.pelvis.y + ((r.pelvis.y - r.neck.y) / len) * (CROTCH / RES));
  const tri = [r.hipN, r.hipF, low].map((p) => [p.x * RES, p.y * RES]);
  const cross = (a: number[], b: number[], x: number, y: number) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const inside = (x: number, y: number) => {
    const c = [0, 1, 2].map((k) => cross(tri[k], tri[(k + 1) % 3], x + 0.5, y + 0.5));
    return c.every((z) => z >= 0) || c.every((z) => z <= 0);
  };
  const cloths = Object.keys(kinds).filter((hex) => kinds[hex] === 'cloth');
  const lines = Object.keys(kinds).filter((hex) => kinds[hex] === 'line');
  if (!cloths.length || !lines.length) return;
  const dark = cloths.reduce((a, b) => (parseInt(a.slice(1), 16) <= parseInt(b.slice(1), 16) ? a : b));
  const cloth = g.m(tint('', dark), 'flat');
  const line = g.m(tint('', lines[0]), 'flat');
  const L = g.L('farLeg.body');
  const xs = tri.map((p) => p[0]);
  const ys = tri.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      L.set(x, y, edge ? line : cloth, 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
    }
}

/** How far round the knee (fine px) the trouser leg is closed where it bends (closeKnee). */
const KNEE_R = 7;

/**
 * His trouser leg closed round a knee bent further than he drew it (seated, crouched), as Ren's is
 * (items/night.ts): his thigh and shin pieces end in tapers, so bent that far the two ends part on the
 * outside of the knee. Round the knee the leg is filled out to the hull of the two pieces with his trousers'
 * cloth (the cloth colour most of the leg there has), his line along the new edge.
 */
function closeKnee(g: DrawCtx, s: Side, depth: Depth, knee: Vec, kinds: Record<string, string>, tint: (ch: string, hex: string) => string): void {
  const L = g.L(depth);
  const ids = new Set([partIndex(`thigh${s}` as PartId), partIndex(`shin${s}` as PartId)]);
  const kx = knee.x * RES;
  const ky = knee.y * RES;
  const near = (x: number, y: number) => Math.hypot(x + 0.5 - kx, y + 0.5 - ky) <= KNEE_R;
  const pts: [number, number][] = [];
  const count = new Map<number, number>();
  const lineHex = Object.keys(kinds).filter((hex) => kinds[hex] === 'line');
  const lines = new Set(lineHex.map((hex) => g.m(tint('', hex), 'flat')));
  for (let y = Math.floor(ky - KNEE_R); y <= ky + KNEE_R; y++)
    for (let x = Math.floor(kx - KNEE_R); x <= kx + KNEE_R; x++) {
      if (!near(x, y) || !L.has(x, y)) continue;
      const i = y * GRID + x;
      if (L.mat[i] < 0 || !ids.has(L.part[i])) continue;
      pts.push([x, y]);
      if (!lines.has(L.mat[i])) count.set(L.mat[i], (count.get(L.mat[i]) ?? 0) + 1);
    }
  if (pts.length < 3 || !count.size || !lineHex.length) return;
  const cloth = [...count].sort((a, b) => b[1] - a[1])[0][0];
  const line = g.m(tint('', lineHex[0]), 'flat');
  // The hull of the leg's pixels round the knee (Andrew's monotone chain), counter-clockwise.
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  if (hull.length < 3) return;
  const inside = (x: number, y: number) => hull.every((a, k) => cross(a, hull[(k + 1) % hull.length], [x, y]) >= 0);
  const filled: number[] = [];
  for (let y = Math.floor(ky - KNEE_R); y <= ky + KNEE_R; y++)
    for (let x = Math.floor(kx - KNEE_R); x <= kx + KNEE_R; x++) {
      if (x < 1 || y < 1 || x >= GRID - 1 || y >= GRID - 1 || !near(x, y) || L.mat[y * GRID + x] >= 0 || !inside(x, y)) continue;
      L.set(x, y, cloth, 3, `shin${s}` as PartId, F_NO_TEXTURE | F_NO_OUTLINE);
      filled.push(y * GRID + x);
    }
  // His line along the new edge: a filled pixel beside the outside takes it.
  for (const i of filled) if ([i - 1, i + 1, i - GRID, i + GRID].some((j) => L.mat[j] < 0)) L.mat[i] = line;
}

/** The scabbard's throat in our male idle frame 0 (fine pixels): where he drew it, at the front of the near hip. */
const NAVY_SCABBARD_THROAT: [number, number] = [NAVY_SCABBARD_REST.NAVY_SCABBARD[0] + NAVY_SCABBARD.pivot[0] + 0.5, NAVY_SCABBARD_REST.NAVY_SCABBARD[1] + NAVY_SCABBARD.pivot[1] + 0.5];
/** How much more upright than he drew it the scabbard hangs (degrees): clear of the near fist at rest. */
const HANG = -12;
/** How much of the torso's lean the scabbard takes (it hangs from its straps, swinging back toward straight down). */
const SWING = 0.4;

/**
 * Where the scabbard hangs (acc_navy_scabbard): its throat (design units) at the belt where he drew it, at
 * the front of the near hip, turned with the torso, and the way it points from there (degrees). The sabre
 * is sheathed there while the hands are busy (accessories.ts held_navy_sabre).
 */
export function navyScabbardMouth(g: DrawCtx): { throat: Vec; deg: number } {
  const r = g.rig;
  const t = segAngle(r.pelvis, r.neck) - segAngle(idleRig('male').pelvis, idleRig('male').neck);
  return { throat: add(r.pelvis, turn(sub(fine(NAVY_SCABBARD_THROAT), idleRig('male').pelvis), t)), deg: NAVY_SCABBARD.angle + t * SWING + HANG };
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
      crotch(g, t.kind, tint);
      for (const s of SIDES) {
        legOff(g, s);
        const { hip, knee, ankle } = navyLeg(g, s);
        const L = legDepth(s, 'cloth');
        // A thigh longer than his (seated, crouched: rig.ts kneeLeg) takes his trouser leg lengthened with it
        // (stretchPiece: his rows repeated), so it still reaches the knee; the knee closed round the bend.
        const his = HIS_THIGH[s];
        const extra = Math.hypot(knee.x - hip.x, knee.y - hip.y) * RES - his;
        stampPiece(g, L, extra > 0.5 ? stretchPiece(t.thigh[s], extra, his) : t.thigh[s], hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, t.shin[s], knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        if (extra > 0.5) closeKnee(g, s, L, knee, t.kind, tint);
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
        // Lifted well off the ground the foot turns with the shaft, as he drew them as one, and his line closes
        // the ankle where the two part (items/ankle.ts); standing, it stays flat.
        const ft = footTurn(g, s);
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle + ft, `foot${s}` as PartId, tint);
        if (ft) closeAnkle(g, s, ankle, g.m(tint('', BOOT_LINE), 'flat'), new Set(BOOT_LINES.map((hex) => g.m(tint('', hex), 'flat'))));
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
      // Closed, each hand is his fist; open, pointing or signing, our hand in the glove's colour.
      const tint = navyColor(g, NAVY_GLOVE_KIND, { leather: [NAVY_GLOVE_LEATHER, glove] });
      for (const s of SIDES) {
        const j = navyArm(g, s);
        const kind = handPose(g, s).kind;
        if (kind === 'fist' || kind === 'grip') {
          partsOff(g, [armDepth(s, 'body')], [`hand${s}`] as PartId[]);
          // (his far fist held the hilt toward us: closed in our pose it is his near fist)
          const p = NAVY_GLOVE_N;
          stampPiece(g, armDepth(s, 'cloth'), p, j.wrist, segAngle(j.wrist, j.hand), `hand${s}` as PartId, tint);
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
    desc: 'A navy scabbard with gold fittings and a red stone at its throat, hung at the near hip.',
    colors: [col('main', 'Scabbard', NAVY_SCABBARD_CLOTH, 'leather'), col('gold', 'Fittings', NAVY_SCABBARD_GOLD, 'metal'), col('stone', 'Stone', NAVY_SCABBARD_STONE, 'metal')],
    draw: (g, [main, gold, stone]) => {
      const tint = navyColor(g, NAVY_SCABBARD_KIND, { cloth: [NAVY_SCABBARD_CLOTH, main], gold: [NAVY_SCABBARD_GOLD, gold], stone: [NAVY_SCABBARD_STONE, stone] });
      // Hung at the near hip, its throat at the belt where he drew it, pointing down and back at his angle there
      // turned with the torso; behind the near arm (he drew it in his near fist; the owner, 2026-10-24: "no
      // dibujes la espada ni la mano en la espada ponlo en nuestra pose").
      const { throat, deg } = navyScabbardMouth(g);
      stampPiece(g, 'nearArm.held', NAVY_SCABBARD, throat, deg, 'pelvis', tint);
    },
  },
];
