// The owner's Ascended set on the male bodies: his paint-over of our male in the Wrap Kimono, the Wide
// Hakama, the Cloth Sash, the Bandage Wraps and the Foot Wraps (docs/reference/ascended-owner-reference.jpg,
// 2026-10-21, the new standard), his pixels lifted out by tools/refs/ascended-*-from-ref.py. Each piece is
// pinned on our joint and turned rigidly with RotSprite as its limb turns: at rest every pixel is his and
// where he drew it, and in every pose the arms and legs are his sleeves, bandages, fists and hakama legs,
// never our default limb under them. His loose sleeve is the one piece that does not turn whole: its bell
// hangs from the arm like cloth (SLEEVE_HANG). The hair and the cloak are drawn in hair.ts and capes.ts.

import { hexToRgb, retintHex } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, handDraw, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from '../raster';
import type { Rig } from '../rig';
import { rotateTemplate } from '../rotsprite';
import type { BodyType } from '../types';
import { FOOTWRAPS_CLOTH, FOOTWRAPS_FOOT_F, FOOTWRAPS_FOOT_N, FOOTWRAPS_KIND, FOOTWRAPS_SHIN_F, FOOTWRAPS_SHIN_N, FOOTWRAPS_SKIN } from './footWrapsArt';
import { HAKAMA_CLOTH, HAKAMA_KIND, HAKAMA_SEAT, HAKAMA_SHIN_F, HAKAMA_SHIN_N, HAKAMA_THIGH_F, HAKAMA_THIGH_N } from './hakamaArt';
import { KIMONO_BODY, KIMONO_CLOTH, KIMONO_COLLAR, KIMONO_KIND, KIMONO_REST, KIMONO_SLEEVE_F, KIMONO_SLEEVE_N } from './kimonoArt';
import { SASH_BAND, SASH_EDGE, SASH_KIND, SASH_MAIN } from './sashArt';
import { WRAPS_CLOTH, WRAPS_FIST_F, WRAPS_FIST_N, WRAPS_FORE_F, WRAPS_FORE_N, WRAPS_KIND, WRAPS_REST, WRAPS_SKIN } from './wrapsArt';

const SIDES: Side[] = ['F', 'N'];
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;

/**
 * The colours these items had before his art, which the creator saved with every character that wore
 * them: those colours now mean his, so characters that kept the old defaults wear his colours.
 */
const OLD_DEFAULTS: Record<string, Record<string, string>> = {
  top_kimono: { '#ded8ca': KIMONO_CLOTH, '#2b3557': KIMONO_COLLAR },
  bottom_hakama: { '#2c3043': HAKAMA_CLOTH },
  waist_sash: { '#2f62b5': SASH_MAIN, '#1d3f80': SASH_EDGE },
  hands_wraps: { '#e9e3d3': WRAPS_CLOTH },
  feet_wraps: { '#ddd5c2': FOOTWRAPS_CLOTH },
};
/** A colour slot's saved colour, the old default read as his. */
export const ascendedSlot = (id: string, hex: string): string => OLD_DEFAULTS[id]?.[hex.toLowerCase()] ?? hex;

/** His colours recoloured: his line stays; each other kind of his follows its slot (his colour → the slot's). */
const tinter = (kinds: Record<string, string>, to: Record<string, [string, string]>) => (_ch: string, hex: string): string => {
  const k = kinds[hex];
  const t = k && to[k];
  return t ? retintHex(hex, t[0], t[1]) : hex;
};

/** Past this lean (degrees from his picture) a torso piece is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * Stamps a piece of his that rides the torso, leaning `deg`: a small lean shears it, each row moved
 * across whole (his folds and collar stay his pixels, only stepped), as far as a turn would move it; a
 * large one turns it with RotSprite (as armor.ts stamps his cuirass).
 */
function stampRiding(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
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

/** Takes these parts of our body away from a layer (his piece takes their place). */
function partsOff(g: DrawCtx, depth: Depth, parts: PartId[]): void {
  const L = g.L(depth);
  if (!L.used) return;
  const ids = parts.map((p) => partIndex(p));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.includes(L.part[i])) L.mat[i] = -1;
}

/**
 * A piece of his widened for the bulky body, whose torso is broader: single columns repeated, spread
 * evenly (never side by side, so no flat band appears) over its middle third on each side of the pivot,
 * `left` columns before it and `right` after it.
 */
function widened(p: PaintedPiece, left: number, right: number): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const cols = new Set([...spread(Math.round(p.pivot[0] * 0.34), Math.round(p.pivot[0] * 0.9), left), ...spread(Math.round(p.pivot[0] + (w - p.pivot[0]) * 0.1), Math.round(p.pivot[0] + (w - p.pivot[0]) * 0.66), right)]);
  const rows = p.rows.map((r) => r.padEnd(w, '.').split('').map((ch, i) => (cols.has(i) ? ch + ch : ch)).join(''));
  let px = p.pivot[0];
  for (const c of cols) if (c < p.pivot[0]) px++;
  return { ...p, rows, pivot: [px, p.pivot[1]] };
}

/** How far broader the bulky torso is than the male's on each side (fine pixels, at the chest and hips). */
const BULKY_WIDER: Record<'chest' | 'hips', [number, number]> = { chest: [4, 4], hips: [3, 3] };
const forBody = (body: BodyType, p: PaintedPiece, at: 'chest' | 'hips', cache: Map<PaintedPiece, PaintedPiece>): PaintedPiece => {
  if (body !== 'bulky') return p;
  let q = cache.get(p);
  if (!q) cache.set(p, (q = widened(p, ...BULKY_WIDER[at])));
  return q;
};
const BULKY = new Map<PaintedPiece, PaintedPiece>();

// ---------------------------------------------------------------------------
// Wrap Kimono
// ---------------------------------------------------------------------------

/**
 * His kimono: the body over the torso (the V left open, our chest shows there), each wide sleeve on its
 * upper arm in place of our upper arm (the far one behind the body), its bell hanging loose (drawSleeve).
 * His beige follows Kimono and his navy Collar.
 */
export function drawAscendedKimono(g: DrawCtx, main: string, collar: string): void {
  const r = g.rig;
  const tint = tinter(KIMONO_KIND, { cloth: [KIMONO_CLOTH, ascendedSlot('top_kimono', main)], collar: [KIMONO_COLLAR, ascendedSlot('top_kimono', collar)] });
  for (const s of SIDES) partsOff(g, armDepth(s, 'body'), [prt('upperArm', s)]);
  drawSleeve(g, 'F', tint);
  stampRiding(g, 'torso.top', forBody(r.body, KIMONO_BODY, 'chest', BULKY), r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
  drawSleeve(g, 'N', tint);
  torsoBesideOff(g);
}

// ---------------------------------------------------------------------------
// His loose sleeves
// ---------------------------------------------------------------------------

/**
 * How his sleeve sits on the arm, read from his picture (the near arm; the far one is the same, narrower
 * and in shadow): sewn on at the shoulder seam (under the cloak's mantle) and as narrow there as the arm,
 * it falls loose from about the middle of the upper arm, widening behind the arm into a bell about 11
 * of his pixels across (the bandaged forearm is 7 to 8), and ends in a slanting cuff 2 to 3 pixels below
 * the elbow. The arm runs down the bell's front edge; the forearm comes out of the cuff's front part,
 * its first 2 or 3 rows of bandage inside the cuff. So the sleeve is cut across the arm where it falls
 * loose (`SLEEVE_HANG` of his pixels from the shoulder, along his arm): above the cut the band rides the
 * upper arm, turned with it; below it the bell with its cuff hangs from that point on the arm under its
 * own weight, as he drew it, and only follows the arm a little (`FOLLOW`, at most `FOLLOW_MAX`
 * degrees). The cloth between them (the bell's top, `FOLD_R` around the point) is swept from the arm's
 * direction to the hang, as a fold of the same cloth. With the arm held out the bell hangs under it and
 * the forearm comes out of its front; with the arm raised it falls back to the shoulder and the bandaged
 * forearm shows from the elbow. Every piece keeps his size and shape; nothing is stretched.
 */
const SLEEVE_HANG: Record<Side, number> = { N: 6, F: 6 };
const FOLD_R = 6;
const FOLLOW = 0.3;
const FOLLOW_MAX = 30;
/** Degrees between the fold's copies (small enough to leave no holes). */
const FOLD_STEP = 6;

const turnOf = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp = (x: number, m: number): number => Math.max(-m, Math.min(m, x));

/** His dark line and the near-black browns he outlines the sleeves and bandages with. */
const dark = (hex: string): boolean => {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 48;
};

interface SleeveCut {
  /** His sleeve above the cut: rides the upper arm about the shoulder. */
  band: PaintedPiece;
  /** His bell and cuff below the cut, pivoted on the cut's point on his arm. */
  bell: PaintedPiece;
  /** The bell's cells within FOLD_R of that point: the fold swept between the arm and the hang. */
  fold: PaintedPiece;
}
const CUTS = new Map<PaintedPiece, SleeveCut>();

/** His sleeve cut across his arm `along` of his pixels from the shoulder (see SLEEVE_HANG). */
function sleeveCut(p: PaintedPiece, along: number): SleeveCut {
  let c = CUTS.get(p);
  if (c) return c;
  const a = (p.angle * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const [cx, cy] = [p.pivot[0] + 0.5, p.pivot[1] + 0.5];
  const [hx, hy] = [cx + ux * along, cy + uy * along];
  const hang: [number, number] = [Math.floor(hx), Math.floor(hy)];
  const past = (x: number, y: number) => (x + 0.5 - cx) * ux + (y + 0.5 - cy) * uy > along;
  const keep = (f: (x: number, y: number) => boolean) => p.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && f(x, y) ? ch : '.')).join(''));
  c = {
    band: { ...p, rows: keep((x, y) => !past(x, y)) },
    bell: { ...p, pivot: hang, rows: keep(past) },
    fold: { ...p, pivot: hang, rows: keep((x, y) => past(x, y) && Math.hypot(x + 0.5 - hx, y + 0.5 - hy) <= FOLD_R) },
  };
  CUTS.set(p, c);
  return c;
}

/** One of his arm's pieces as it is stamped: `turn` from his picture, its pivot on `at`. */
export interface ArmStamp {
  name: 'band' | 'fold' | 'bell' | 'fore' | 'fist';
  piece: PaintedPiece;
  at: Vec;
  turn: number;
}

/**
 * His sleeve on an arm of the rig (see SLEEVE_HANG): the band on the shoulder, turned with the upper
 * arm; the fold's copies from the arm's direction to the hang; the bell hanging from the cut's point,
 * which rides the upper arm.
 */
export function sleeveStamps(r: Rig, s: Side): ArmStamp[] {
  const j = armJoints(r, s);
  const p = s === 'N' ? KIMONO_SLEEVE_N : KIMONO_SLEEVE_F;
  const cut = sleeveCut(p, SLEEVE_HANG[s]);
  const arm = turnOf(segAngle(j.shoulder, j.elbow) - p.angle);
  // (A body laid on the ground has its sleeves lying along its arms on the ground: the bell stays with
  // the arm, the sleeve whole as he drew it.)
  const hang = r.lay ? arm : clamp(FOLLOW * arm, FOLLOW_MAX);
  const bend = turnOf(hang - arm);
  // The cut's point where the band, turned with the arm, puts it (as RotSprite turns his cells).
  const t = (Math.round(arm) * Math.PI) / 180;
  const [dx, dy] = [cut.bell.pivot[0] - p.pivot[0], cut.bell.pivot[1] - p.pivot[1]];
  const at = v((Math.floor(j.shoulder.x * RES) + Math.round(dx * Math.cos(t) - dy * Math.sin(t)) + 0.5) / RES, (Math.floor(j.shoulder.y * RES) + Math.round(dx * Math.sin(t) + dy * Math.cos(t)) + 0.5) / RES);
  const out: ArmStamp[] = [{ name: 'band', piece: cut.band, at: j.shoulder, turn: arm }];
  const n = Math.abs(bend) < 1 ? 0 : Math.ceil(Math.abs(bend) / FOLD_STEP);
  for (let k = 0; k < n; k++) out.push({ name: 'fold', piece: cut.fold, at, turn: arm + (bend * k) / n });
  out.push({ name: 'bell', piece: cut.bell, at, turn: arm + bend });
  return out;
}

/**
 * Stamps his sleeve on an arm (sleeveStamps): the band first, the bell over it, then the fold's copies
 * where nothing of his is yet (or over his dark line, which no longer bounds the cloth there), and his
 * line where a copy's inside lies bare. The forearm inside it goes under it and the bandage that comes
 * out of the cuff over it (drawAscendedWraps).
 */
function drawSleeve(g: DrawCtx, s: Side, tint: (ch: string, hex: string) => string): void {
  const stamps = sleeveStamps(g.rig, s);
  const piece = stamps[0].piece;
  const px = new Map<number, { ch: string; added: boolean }>();
  for (const t of stamps) {
    const ax = Math.floor(t.at.x * RES);
    const ay = Math.floor(t.at.y * RES);
    const added = t.name === 'fold';
    for (const p of rotateTemplate(t.piece, t.turn)) {
      const x = ax + p.dx;
      const y = ay + p.dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const i = y * GRID + x;
      const was = px.get(i);
      if (!added || !was || (dark(piece.colors[was.ch]) && !dark(piece.colors[p.ch]))) px.set(i, { ch: p.ch, added });
    }
  }
  const counts = new Map<string, number>();
  for (const row of piece.rows) for (const ch of row) if (ch !== '.' && dark(piece.colors[ch])) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const edge = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const bare = (x: number, y: number) => !px.has(y * GRID + x);
  const lined: number[] = [];
  for (const [i, p] of px) {
    if (!p.added || dark(piece.colors[p.ch])) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (bare(x - 1, y) || bare(x + 1, y) || bare(x, y - 1) || bare(x, y + 1)) lined.push(i);
  }
  for (const i of lined) px.get(i)!.ch = edge;
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pens[ch] = g.m(tint(ch, hex), 'flat');
  const L = g.L(armDepth(s, 'armor'));
  for (const [i, p] of px) L.set(i % GRID, (i / GRID) | 0, pens[p.ch], 3, prt('upperArm', s), F_NO_TEXTURE | F_NO_OUTLINE);
}

/**
 * Our torso beside his kimono gives way: on each row the kimono covers, our torso's skin outside it (where
 * a twisting pose swings our shoulder away from his kimono) is taken away, so his cloth and what hangs
 * behind it show there, never our bare side. Inside it (his V) our chest stays.
 */
function torsoBesideOff(g: DrawCtx): void {
  const top = g.L('torso.top');
  const body = g.L('torso.body');
  const torso = partIndex('torso');
  for (let y = 0; y < GRID; y++) {
    let x0 = GRID;
    let x1 = -1;
    for (let x = 0; x < GRID; x++) {
      if (top.mat[y * GRID + x] >= 0) {
        x0 = Math.min(x0, x);
        x1 = x;
      }
    }
    if (x1 < 0) continue;
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if ((x < x0 || x > x1) && body.mat[i] >= 0 && body.part[i] === torso) body.mat[i] = -1;
    }
  }
}

// ---------------------------------------------------------------------------
// Wide Hakama
// ---------------------------------------------------------------------------

/**
 * Our leg under his hakama leg gives way down to his hem (his leg is wider at the hip and slants out to
 * the hem, so ours would show beside it): the thigh, and the shin above the hem's height along the shin.
 * Below the hem our shin stays, for the footwear.
 */
function legUnderOff(g: DrawCtx, s: Side, shin: PaintedPiece): void {
  const { knee, ankle } = legJoints(g.rig, s);
  const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const ux = (ankle.x - knee.x) / len;
  const uy = (ankle.y - knee.y) / len;
  const hem = (shin.rows.length - 1 - shin.pivot[1]) / RES;
  const thigh = partIndex(prt('thigh', s));
  const shinPart = partIndex(prt('shin', s));
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0) continue;
    if (L.part[i] === thigh) L.mat[i] = -1;
    else if (L.part[i] === shinPart && (((i % GRID) + 0.5) / RES - knee.x) * ux + ((Math.floor(i / GRID) + 0.5) / RES - knee.y) * uy < hem) L.mat[i] = -1;
  }
}

/**
 * His hakama: each leg's thigh about the hip and shin about the knee, over the footwear (so boots and
 * bandages go inside its hem), and its top round the hips riding the torso over both legs' tops. His
 * black follows Hakama.
 */
export function drawAscendedHakama(g: DrawCtx, main: string): void {
  const r = g.rig;
  const tint = tinter(HAKAMA_KIND, { cloth: [HAKAMA_CLOTH, ascendedSlot('bottom_hakama', main)] });
  for (const s of SIDES) {
    const { hip, knee, ankle } = legJoints(r, s);
    const D = legDepth(s, 'armor');
    legUnderOff(g, s, s === 'N' ? HAKAMA_SHIN_N : HAKAMA_SHIN_F);
    stampPiece(g, D, s === 'N' ? HAKAMA_THIGH_N : HAKAMA_THIGH_F, hip, segAngle(hip, knee), prt('thigh', s), tint);
    stampPiece(g, D, s === 'N' ? HAKAMA_SHIN_N : HAKAMA_SHIN_F, knee, segAngle(knee, ankle), prt('shin', s), tint);
  }
  stampRiding(g, 'torso.bottom', forBody(r.body, HAKAMA_SEAT, 'hips', BULKY), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint);
}

// ---------------------------------------------------------------------------
// Cloth Sash
// ---------------------------------------------------------------------------

/** His sash round the waist, its panel across the far thigh, riding the torso. His blues follow Sash, his navy Edge. */
export function drawAscendedSash(g: DrawCtx, main: string, edge: string): void {
  const r = g.rig;
  const tint = tinter(SASH_KIND, { main: [SASH_MAIN, ascendedSlot('waist_sash', main)], edge: [SASH_EDGE, ascendedSlot('waist_sash', edge)] });
  stampRiding(g, 'waist', forBody(r.body, SASH_BAND, 'hips', BULKY), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint);
}

// ---------------------------------------------------------------------------
// Bandage Wraps
// ---------------------------------------------------------------------------

/**
 * Whether the pose needs an open hand: hand signs, a book cradled, the hand that points or opens to cast
 * or to let a weapon fly. Every other hand is his fist (he drew them closed).
 */
export function ascendedPalm(r: Rig, s: Side): boolean {
  const shape = armJoints(r, s).shape;
  if (shape === 'sign' || shape === 'cradle' || shape === 'point') return true;
  return shape === 'open' && (r.pose === 'throw' || r.pose.startsWith('cast'));
}

/**
 * His bandaged forearm on an arm of the rig, whole about the elbow, and his fist whole about the wrist
 * (none where the pose opens the hand: ascendedPalm).
 */
export function wrapStamps(r: Rig, s: Side): ArmStamp[] {
  const j = armJoints(r, s);
  const fore = s === 'N' ? WRAPS_FORE_N : WRAPS_FORE_F;
  const fist = s === 'N' ? WRAPS_FIST_N : WRAPS_FIST_F;
  const out: ArmStamp[] = [{ name: 'fore', piece: fore, at: j.elbow, turn: segAngle(j.elbow, j.wrist) - fore.angle }];
  if (!ascendedPalm(r, s)) out.push({ name: 'fist', piece: fist, at: j.wrist, turn: segAngle(j.wrist, j.hand) - fist.angle });
  return out;
}

/** His bandage's tones from dark to light (his line, his shadow, middle, lit and brightest), for an open hand. */
const PALM_TONES: string[] = (() => {
  const lum = (h: string) => {
    const [r, g, b] = hexToRgb(h);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  const line = Object.values(WRAPS_FORE_N.colors).filter((h) => WRAPS_KIND[h] !== 'skin' && dark(h)).sort((a, b) => lum(a) - lum(b));
  const cloth = Object.values(WRAPS_FORE_N.colors).filter((h) => WRAPS_KIND[h] === 'cloth' && !dark(h)).sort((a, b) => lum(a) - lum(b));
  const q = (f: number) => cloth[Math.min(cloth.length - 1, Math.floor(cloth.length * f))];
  return [line[line.length - 1], q(0.05), q(0.35), q(0.65), q(0.95)];
})();

/**
 * His forearm cut where it comes out of the sleeve's cuff in his picture: `inside`, the cells his sleeve
 * covers at rest (his bandage under the cuff, continued up to the elbow), and `out`, the bandage he drew
 * below the cuff.
 */
const FORE_PARTS = new Map<PaintedPiece, { inside: PaintedPiece; out: PaintedPiece }>();
function foreParts(s: Side): { inside: PaintedPiece; out: PaintedPiece } {
  const fore = s === 'N' ? WRAPS_FORE_N : WRAPS_FORE_F;
  let c = FORE_PARTS.get(fore);
  if (c) return c;
  const sleeve = s === 'N' ? KIMONO_SLEEVE_N : KIMONO_SLEEVE_F;
  const [sx, sy] = KIMONO_REST[s === 'N' ? 'KIMONO_SLEEVE_N' : 'KIMONO_SLEEVE_F'];
  const [fx, fy] = WRAPS_REST[s === 'N' ? 'WRAPS_FORE_N' : 'WRAPS_FORE_F'];
  const covered = (x: number, y: number) => (sleeve.rows[fy + y - sy]?.[fx + x - sx] ?? '.') !== '.';
  const keep = (f: (x: number, y: number) => boolean) => fore.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && f(x, y) ? ch : '.')).join(''));
  c = { inside: { ...fore, rows: keep(covered) }, out: { ...fore, rows: keep((x, y) => !covered(x, y)) } };
  FORE_PARTS.set(fore, c);
  return c;
}

/**
 * His bandaged forearms, each whole about its elbow in place of our forearm, and his fists whole about
 * the wrist in place of our hand (wrapStamps); an open hand (ascendedPalm) is our hand picture in his
 * bandage's tones. His bandage follows Bandage and his bare fingers the character's skin. The forearm
 * comes out of the sleeve as he drew it: what his cuff covers at rest goes under the sleeve (the cloth
 * layer), the bandage below the cuff and the hand over it (the armor layer, after the sleeve: the hands
 * slot draws after the top), so however the loose sleeve hangs, the forearm and fist show whole.
 */
export function drawAscendedWraps(g: DrawCtx, main: string): void {
  const bandage = ascendedSlot('hands_wraps', main);
  const tint = tinter(WRAPS_KIND, { cloth: [WRAPS_CLOTH, bandage], skin: [WRAPS_SKIN, g.look.skin] });
  for (const s of SIDES) {
    partsOff(g, armDepth(s, 'body'), [prt('forearm', s), prt('hand', s)]);
    const over = armDepth(s, 'armor');
    for (const t of wrapStamps(g.rig, s)) {
      const deg = t.piece.angle + t.turn;
      if (t.name === 'fist') {
        stampPiece(g, over, t.piece, t.at, deg, prt('hand', s), tint);
        continue;
      }
      const { inside, out } = foreParts(s);
      stampPiece(g, armDepth(s, 'cloth'), inside, t.at, deg, prt('forearm', s), tint);
      stampPiece(g, over, out, t.at, deg, prt('forearm', s), tint);
    }
    if (!ascendedPalm(g.rig, s)) continue;
    const tmp = new Layer();
    handDraw(g, tmp, s, { mat: 0, part: prt('hand', s) });
    const tones = PALM_TONES.map((h) => g.m(tint('', h), 'flat'));
    const L = g.L(over);
    for (let i = 0; i < GRID * GRID; i++) if (tmp.mat[i] >= 0) L.set(i % GRID, (i / GRID) | 0, tones[Math.min(tmp.shade[i], tones.length - 1)], 3, prt('hand', s), F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

// ---------------------------------------------------------------------------
// Foot Wraps
// ---------------------------------------------------------------------------

/**
 * Our shin gives way under his bandaged one: from `above` (rig units) over the ankle down, so our leg's
 * edge never shows beside his narrower bandage.
 */
function shinUnderOff(g: DrawCtx, s: Side, above: number): void {
  const { knee, ankle } = legJoints(g.rig, s);
  const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const ux = (ankle.x - knee.x) / len;
  const uy = (ankle.y - knee.y) / len;
  const shin = partIndex(prt('shin', s));
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== shin) continue;
    if ((((i % GRID) + 0.5) / RES - knee.x) * ux + ((Math.floor(i / GRID) + 0.5) / RES - knee.y) * uy > len - above) L.mat[i] = -1;
  }
}

/**
 * His bandaged shins and bare-toed feet on our legs (moved there from where he drew his wider stance:
 * his sole on ours): each shin turns with the shin about the ankle, each foot stays flat like our feet.
 * Our bare foot and the shin under his bandage give way. His bandage follows Bandage, his toes the
 * character's skin.
 */
export function drawAscendedFootWraps(g: DrawCtx, main: string): void {
  const tint = tinter(FOOTWRAPS_KIND, { cloth: [FOOTWRAPS_CLOTH, ascendedSlot('feet_wraps', main)], skin: [FOOTWRAPS_SKIN, g.look.skin] });
  for (const s of SIDES) {
    const { knee, ankle } = legJoints(g.rig, s);
    const shin = s === 'N' ? FOOTWRAPS_SHIN_N : FOOTWRAPS_SHIN_F;
    partsOff(g, legDepth(s, 'body'), [prt('foot', s)]);
    shinUnderOff(g, s, shin.pivot[1] / RES);
    const foot = s === 'N' ? FOOTWRAPS_FOOT_N : FOOTWRAPS_FOOT_F;
    stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), prt('shin', s), tint);
    stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, prt('foot', s), tint);
  }
}
