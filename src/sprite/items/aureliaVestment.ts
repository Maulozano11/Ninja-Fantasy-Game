// The owner's Aurelia (docs/reference/aurelia-escala-juego-owner-reference.jpg, drawn by him at our
// scale): her white dress bodice with its high gold-edged collar and blue gem, and her detached white
// sleeves with gold bands and cuffs. His pixels one for one (items/aureliaVestmentArt.ts, by
// tools/refs/aurelia-upper-from-ref.py), one painted piece per segment of the rig: the bodice turns
// with the torso, each sleeve with its upper arm and forearm. In our female's idle pose every pixel is
// his. Her skirt from the sash down is another item.

import { retintHex } from '../color';
import { armDepth, armJoints, Depth, DEPTHS, DrawCtx, ItemDef, Side } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, Vec } from '../raster';
import { rotateTemplate, stampTemplate, TemplatePalette } from '../rotsprite';
import {
  AURELIA_BODICE,
  AURELIA_CLOTH,
  AURELIA_CLOTH_CHARS,
  AURELIA_GEM,
  AURELIA_GEM_CHARS,
  AURELIA_GOLD,
  AURELIA_GOLD_CHARS,
  AURELIA_LINE,
  AURELIA_SKIN_SHADES,
  AURELIA_SLEEVE_FORE_F,
  AURELIA_SLEEVE_FORE_N,
  AURELIA_SLEEVE_SPAN_F,
  AURELIA_SLEEVE_SPAN_N,
  AURELIA_SLEEVE_UPPER_F,
  AURELIA_SLEEVE_UPPER_N,
  AURELIA_TORSO_SPAN,
  AURELIA_WAIST,
} from './aureliaVestmentArt';

/**
 * Her colours recoloured: her cloth (white, creams, greys) follows Cloth, her gold follows Gold, her
 * gem follows Gem, each shade as far from the slot's colour as hers was from her own; her black line
 * stays. With the defaults every pixel is hers.
 */
const vestmentColor = (cloth: string, gold: string, gem: string) => (ch: string, hex: string): string =>
  AURELIA_CLOTH_CHARS.includes(ch)
    ? retintHex(hex, AURELIA_CLOTH, cloth)
    : AURELIA_GOLD_CHARS.includes(ch)
      ? retintHex(hex, AURELIA_GOLD, gold)
      : AURELIA_GEM_CHARS.includes(ch)
        ? retintHex(hex, AURELIA_GEM, gem)
        : hex;

/**
 * A dress of the owner's on our fitted female, his pieces for the rig's segments (her Dawn Vestment, and the
 * bodices and sleeves of his other outfits for her, aureliaOutfits.ts): the bodice and its waist ride the torso,
 * each sleeve its upper arm and forearm.
 */
export interface VestmentArt {
  /** The bodice (pivot: the base of the neck) and the bodice carried on under the sash to the hips. */
  bodice?: PaintedPiece;
  waist?: PaintedPiece;
  /** Each sleeve: the upper arm's piece (pivot: the shoulder), the forearm's (pivot: the elbow), and what of our arm it stands for (clearArm). */
  sleeves?: Record<Side, [PaintedPiece, PaintedPiece, [number, number]]>;
  /** What of our torso the bodice stands for (clearTorso). */
  torsoSpan?: [number, number, number];
  /** His black line. */
  line: string;
  /** His skin's characters: drawn in the body's skin, at these shades of it. */
  skinShades: Record<string, number>;
}

/** Her Dawn Vestment's pieces. */
const DAWN_VESTMENT_ART: VestmentArt = {
  bodice: AURELIA_BODICE,
  waist: AURELIA_WAIST,
  sleeves: { F: [AURELIA_SLEEVE_UPPER_F, AURELIA_SLEEVE_FORE_F, AURELIA_SLEEVE_SPAN_F], N: [AURELIA_SLEEVE_UPPER_N, AURELIA_SLEEVE_FORE_N, AURELIA_SLEEVE_SPAN_N] },
  torsoSpan: AURELIA_TORSO_SPAN,
  line: AURELIA_LINE,
  skinShades: AURELIA_SKIN_SHADES,
};

/**
 * Stamps a piece as stampPiece does (at his angle every pixel is his), but his skin (the keyhole under
 * the gem, the armpit) in the body's own skin shades, so it follows the player's skin.
 */
function stamp(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string, skinShades = AURELIA_SKIN_SHADES): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = ch in skinShades ? [g.skin, skinShades[ch]] : [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** Marks in `out` the fine pixels a painted piece covers when stampPiece stamps it. */
function cover(out: Uint8Array, piece: PaintedPiece, at: Vec, deg: number): void {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
}

/** What of our torso (or of a shirt on it) the bodice stands for. */
const UNDER_BODICE: Depth[] = ['torso.body', 'torso.under', 'torso.top'];
/** What of our arms (or of a shirt's sleeves) the sleeves stand for. */
const UNDER_SLEEVE = (s: Side): Depth[] => [armDepth(s, 'body'), armDepth(s, 'cloth')];

/**
 * Takes away what of our torso shows past the bodice: a torso pixel the bodice and its waist do not
 * cover, down to the waist's lower edge (AURELIA_TORSO_SPAN, along the torso), from under his near
 * armhole on the near side and from the neck on the far side. Our torso is wider than hers
 * (our bust stands out past her bodice's far side), so the figure's edge there is her bodice's, with
 * her far sleeve and the gap by her near arm beside it, as he drew her; his far shoulder is hidden
 * behind her far hair lock and her bodice's edge, so ours goes too. Above her near armhole our near
 * shoulder stays bare (his own shoulder rides the near sleeve over it): of our undergarment nothing
 * shows there (its strap over the near shoulder goes).
 */
function clearTorso(g: DrawCtx, bodice: Uint8Array, span: [number, number, number] = AURELIA_TORSO_SPAN): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const [nearFrom, farFrom, to] = span;
  for (const d of UNDER_BODICE) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso || bodice[i]) continue;
      // fine pixels below the neck, along the torso
      const dx = ((i % GRID) + 0.5) / RES - r.neck.x;
      const dy = (Math.floor(i / GRID) + 0.5) / RES - r.neck.y;
      const below = -(dx * r.up.x + dy * r.up.y) * RES;
      // the far side: toward the way she faces, along the shoulder line
      const far = dx * r.right.x + dy * r.right.y > 0;
      // our undergarment's straps go from the neck down: her shoulders are bare, so there our skin shows
      const from = d === 'torso.under' ? 0 : far ? farFrom : nearFrom;
      if (below >= from && below < to) L.mat[i] = -1;
    }
  }
}

/**
 * Takes away what of our arm on side `s` shows past its sleeve: an upper arm pixel below the band's
 * top, or a forearm pixel above the cuff's lower edge (`span`, along each segment), that the sleeve
 * does not cover. Above `span[0]` (the top of his bare near shoulder, which the near sleeve carries; the
 * whole far upper arm, his being hidden) and the wrist under the cuff stay.
 */
function clearArm(g: DrawCtx, s: Side, sleeve: Uint8Array, span: [number, number]): void {
  const { shoulder, elbow, wrist } = armJoints(g.rig, s);
  const upper = partIndex(`upperArm${s}` as PartId);
  const fore = partIndex(`forearm${s}` as PartId);
  const along = (i: number, a: Vec, b: Vec) => {
    const x = ((i % GRID) + 0.5) / RES - a.x;
    const y = (Math.floor(i / GRID) + 0.5) / RES - a.y;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (x * dx + y * dy) / (dx * dx + dy * dy || 1);
  };
  for (const d of UNDER_SLEEVE(s)) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || sleeve[i]) continue;
      const p = L.part[i];
      if ((p === upper && along(i, shoulder, elbow) >= span[0]) || (p === fore && along(i, elbow, wrist) <= span[1])) L.mat[i] = -1;
    }
  }
}

/** How far round the elbow (fine pixels) closeElbow looks. */
const ELBOW_REACH = 6;

/**
 * Closes a sleeve's edge round the elbow: where the bend turns the two pieces apart, the cut edge of
 * one shows past the other's line; a sleeve pixel there that is not her line and touches a pixel
 * outside the sleeve takes her line. And a pixel of her line left standing out on its own past the
 * other piece's edge (touching the sleeve on one side only) goes. In our idle pose her line already
 * closes the sleeve there, so nothing changes.
 */
function closeElbow(g: DrawCtx, d: Depth, sleeve: Uint8Array, elbow: Vec, lineHex = AURELIA_LINE): void {
  const L = g.L(d);
  const line = g.m(lineHex, 'flat');
  const ex = Math.floor(elbow.x * RES);
  const ey = Math.floor(elbow.y * RES);
  const R = ELBOW_REACH;
  const close: number[] = [];
  const spurs: number[] = [];
  for (let y = Math.max(1, ey - R); y <= Math.min(GRID - 2, ey + R); y++) {
    for (let x = Math.max(1, ex - R); x <= Math.min(GRID - 2, ex + R); x++) {
      const i = y * GRID + x;
      if (!sleeve[i] || L.mat[i] < 0) continue;
      const inside = sleeve[i - 1] + sleeve[i + 1] + sleeve[i - GRID] + sleeve[i + GRID];
      if (L.mat[i] === line) {
        if (inside <= 1) spurs.push(i);
      } else if (inside < 4) close.push(i);
    }
  }
  for (const i of close) L.mat[i] = line;
  for (const i of spurs) {
    L.mat[i] = -1;
    sleeve[i] = 0;
  }
}

/**
 * Fills the dents a turned piece's edge is left with: RotSprite can leave one pixel of the piece's outline
 * out (in the throw's release, at the bodice's front under her collar), a pixel the piece does not cover
 * with the piece on all four sides of it. Left empty, closeOpen would run his line round it and leave a
 * pocket of background inside her dress; it takes the piece's own colour from its neighbours instead (the
 * one most of them have, her line only when all of them are), so the edge stays his.
 */
function fillDents(g: DrawCtx, d: Depth, cover: Uint8Array, lineHex = AURELIA_LINE): void {
  const L = g.L(d);
  const line = g.m(lineHex, 'flat');
  const layers = DEPTHS.map((x) => g.L(x)).filter((l) => l.used);
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      const around = [i - 1, i + 1, i - GRID, i + GRID];
      if (cover[i] || layers.some((l) => l.mat[i] >= 0) || around.some((j) => !cover[j] || L.mat[j] < 0)) continue;
      const count = new Map<number, number>();
      for (const j of around) if (L.mat[j] !== line) count.set(L.mat[j], (count.get(L.mat[j]) || 0) + 1);
      const best = [...count].sort((a, b) => b[1] - a[1])[0];
      const from = best ? around.find((j) => L.mat[j] === best[0])! : around[0];
      L.mat[i] = L.mat[from];
      L.shade[i] = L.shade[from];
      L.part[i] = L.part[from];
      L.flags[i] = L.flags[from];
    }
  }
}

/**
 * Closes a piece's edge left open when it turns: a pixel of the piece (`cover`) that is not her line and has
 * an empty neighbour (nothing of the figure drawn there) takes his line (`lineHex`), as his line runs round
 * her bodice, sleeves and boots (turned, his bare shoulder on the near sleeve's band came out with its
 * round cut open, and a hand with its wrist out of the cuff). At rest his own line closes every piece, so
 * it is only called on a turned piece.
 */
export function closeOpen(g: DrawCtx, d: Depth, cover: Uint8Array, lineHex = AURELIA_LINE, skinLine = false): void {
  const L = g.L(d);
  const line = g.m(lineHex, 'flat');
  const layers = DEPTHS.map((x) => g.L(x)).filter((l) => l.used);
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && layers.some((l) => l.mat[y * GRID + x] >= 0);
  const close: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (!cover[i] || L.mat[i] < 0 || L.mat[i] === line || (skinLine && L.shade[i] === 0)) continue;
    const x = i % GRID;
    const y = (i - x) / GRID;
    if (!filled(x + 1, y) || !filled(x - 1, y) || !filled(x, y + 1) || !filled(x, y - 1)) close.push(i);
  }
  // (a hand's own line is its skin's darkest shade)
  for (const i of close) {
    if (skinLine) L.shade[i] = 0;
    else L.mat[i] = line;
  }
}

/**
 * Draws her vestment. The far sleeve goes behind the torso (over the far leg); the bodice's waist under the skirts (her
 * sash and skirt cover it; without them it closes the dress at the hips); the bodice over the torso;
 * the near sleeve over all. In each sleeve the forearm's piece goes under the upper arm's, reaching on
 * under it, so a bending elbow opens no gap, and the edge round the elbow is closed (closeElbow). Then
 * what of our body shows past her clothes is taken away (clearTorso, clearArm), so the figure's edge is
 * hers.
 */
function drawDawnVestment(g: DrawCtx, cloth: string, gold: string, gem: string): void {
  drawVestment(g, DAWN_VESTMENT_ART, vestmentColor(cloth, gold, gem), { bodice: true, sleeves: true });
}

/**
 * Draws a dress of his (VestmentArt): its bodice (`parts.bodice`: the bodice over the torso, its waist under the
 * skirts) and its sleeves (`parts.sleeves`), each part on its own when an outfit makes them separate items. The
 * far sleeve goes behind the torso (over the far leg); the near sleeve over all. In each sleeve the forearm's
 * piece goes under the upper arm's, reaching on under it, so a bending elbow opens no gap, and the edge round
 * the elbow is closed (closeElbow). Then what of our body shows past his clothes is taken away (clearTorso,
 * clearArm), so the figure's edge is his.
 */
export function drawVestment(g: DrawCtx, art: VestmentArt, tint: (ch: string, hex: string) => string, parts: { bodice: boolean; sleeves: boolean }): void {
  const r = g.rig;
  const torso = segAngle(r.pelvis, r.neck);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stamp(g, d, p, at, deg, part, tint, art.skinShades);
  const sleeves: [Side, PaintedPiece | undefined, PaintedPiece | undefined, [number, number]][] = [
    ['F', ...(art.sleeves?.F ?? [undefined, undefined, [0, 0]])],
    ['N', ...(art.sleeves?.N ?? [undefined, undefined, [0, 0]])],
  ];
  const covers: Uint8Array[] = [];
  const turned: [Depth, Uint8Array][] = [];
  const bodice = new Uint8Array(GRID * GRID);
  for (const [s, upper, fore] of sleeves) {
    const { shoulder, elbow, wrist } = armJoints(r, s);
    // the far sleeve hangs by the far hip, over the top of the far thigh (our far leg's top stands
    // out under the waist where hers is under her skirt): it goes over the far leg, under the torso
    const d = s === 'F' ? 'farLeg.armor' : armDepth(s, 'armor');
    const up = segAngle(shoulder, elbow);
    const down = segAngle(elbow, wrist);
    if (s === 'N' && parts.bodice && art.bodice && art.waist) {
      put('torso.top', art.waist, r.neck, torso, 'torso');
      put('torso.armor', art.bodice, r.neck, torso, 'torso');
      cover(bodice, art.waist, r.neck, torso);
      cover(bodice, art.bodice, r.neck, torso);
      if (Math.abs(torso - art.bodice.angle) >= 0.5) {
        const b = new Uint8Array(GRID * GRID);
        cover(b, art.bodice, r.neck, torso);
        turned.push(['torso.armor', b]);
      }
    }
    const c = new Uint8Array(GRID * GRID);
    if (parts.sleeves && upper && fore) {
      put(d, fore, elbow, down, `forearm${s}`);
      put(d, upper, shoulder, up, `upperArm${s}`);
      cover(c, fore, elbow, down);
      cover(c, upper, shoulder, up);
      // At rest both pieces lie as he drew them and his own line closes the sleeve: nothing to close (the
      // sleeve's edge where her belt crosses it is not an open edge).
      if (Math.abs(up - upper.angle) >= 0.5 || Math.abs(down - fore.angle) >= 0.5) {
        closeElbow(g, d, c, elbow, art.line);
        turned.push([d, c]);
      }
    }
    covers.push(c);
  }
  if (parts.bodice && art.bodice) clearTorso(g, bodice, art.torsoSpan);
  if (parts.sleeves && art.sleeves) sleeves.forEach(([s, , , span], k) => clearArm(g, s, covers[k], span));
  for (const [d, c] of turned) {
    // only the bodice: the sleeves' turns are his approved walk, pixel for pixel
    if (d === 'torso.armor') fillDents(g, d, c, art.line);
    closeOpen(g, d, c, art.line);
  }
  // her hands come out of the cuffs: a wrist the cuff does not cover is closed in his line (his bare
  // woman's fists, the female body's hands, are bigger than the hands he drew her with, so even at rest
  // the fist's top shows past the cuff)
  if (!parts.sleeves || !art.sleeves) return;
  for (const s of ['N', 'F'] as Side[]) {
    const d = armDepth(s, 'body');
    const L = g.L(d);
    const hand = partIndex(`hand${s}` as PartId);
    const c = new Uint8Array(GRID * GRID);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === hand && L.shade[i] > 0) c[i] = 1;
    closeOpen(g, d, c, art.line, true);
  }
}

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/** The armor slot's entry (items/armor.ts ARMOR_ITEMS). */
export const ARMOR_DAWN_VESTMENT: ItemDef = {
  id: 'armor_dawn_vestment',
  slot: 'armor',
  name: 'Dawn Vestment',
  desc: "A priestess's white dress: a high gold-edged collar with a blue gem at the throat, bare shoulders, a bodice embroidered in gold, and white sleeves of their own banded and cuffed in gold (+1 AC). Women only.",
  colors: [col('cloth', 'Cloth', AURELIA_CLOTH), col('gold', 'Gold', AURELIA_GOLD, 'metal'), col('gem', 'Gem', AURELIA_GEM)],
  statsArmor: 'Ronin Wanderer Cloak',
  bodies: ['female'],
  draw: (g, [cloth, gold, gem]) => drawDawnVestment(g, cloth, gold, gem),
};
