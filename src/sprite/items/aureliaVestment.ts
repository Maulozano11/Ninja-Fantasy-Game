// The owner's Aurelia (docs/reference/aurelia-escala-juego-owner-reference.jpg, drawn by him at our
// scale): her white dress bodice with its high gold-edged collar and blue gem, and her detached white
// sleeves with gold bands and cuffs. His pixels one for one (items/aureliaVestmentArt.ts, by
// tools/refs/aurelia-upper-from-ref.py), one painted piece per segment of the rig: the bodice turns
// with the torso, each sleeve with its upper arm and forearm. In our female's idle pose every pixel is
// his. Her skirt from the sash down is another item.

import { retintHex } from '../color';
import { armDepth, armJoints, Depth, DrawCtx, ItemDef, Side } from '../ctx';
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
 * Stamps a piece as stampPiece does (at his angle every pixel is his), but his skin (the keyhole under
 * the gem, the armpit) in the body's own skin shades, so it follows the player's skin.
 */
function stamp(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = ch in AURELIA_SKIN_SHADES ? [g.skin, AURELIA_SKIN_SHADES[ch]] : [g.m(color(ch, hex), 'flat'), 3];
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
function clearTorso(g: DrawCtx, bodice: Uint8Array): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const [nearFrom, farFrom, to] = AURELIA_TORSO_SPAN;
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
function closeElbow(g: DrawCtx, d: Depth, sleeve: Uint8Array, elbow: Vec): void {
  const L = g.L(d);
  const line = g.m(AURELIA_LINE, 'flat');
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
 * Draws her vestment. The far sleeve goes behind the torso (over the far leg); the bodice's waist under the skirts (her
 * sash and skirt cover it; without them it closes the dress at the hips); the bodice over the torso;
 * the near sleeve over all. In each sleeve the forearm's piece goes under the upper arm's, reaching on
 * under it, so a bending elbow opens no gap, and the edge round the elbow is closed (closeElbow). Then
 * what of our body shows past her clothes is taken away (clearTorso, clearArm), so the figure's edge is
 * hers.
 */
function drawDawnVestment(g: DrawCtx, cloth: string, gold: string, gem: string): void {
  const r = g.rig;
  const tint = vestmentColor(cloth, gold, gem);
  const torso = segAngle(r.pelvis, r.neck);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stamp(g, d, p, at, deg, part, tint);
  const sleeves: [Side, PaintedPiece, PaintedPiece, [number, number]][] = [
    ['F', AURELIA_SLEEVE_UPPER_F, AURELIA_SLEEVE_FORE_F, AURELIA_SLEEVE_SPAN_F],
    ['N', AURELIA_SLEEVE_UPPER_N, AURELIA_SLEEVE_FORE_N, AURELIA_SLEEVE_SPAN_N],
  ];
  const covers: Uint8Array[] = [];
  const bodice = new Uint8Array(GRID * GRID);
  for (const [s, upper, fore] of sleeves) {
    const { shoulder, elbow, wrist } = armJoints(r, s);
    // the far sleeve hangs by the far hip, over the top of the far thigh (our far leg's top stands
    // out under the waist where hers is under her skirt): it goes over the far leg, under the torso
    const d = s === 'F' ? 'farLeg.armor' : armDepth(s, 'armor');
    const up = segAngle(shoulder, elbow);
    const down = segAngle(elbow, wrist);
    if (s === 'N') {
      put('torso.top', AURELIA_WAIST, r.neck, torso, 'torso');
      put('torso.armor', AURELIA_BODICE, r.neck, torso, 'torso');
      cover(bodice, AURELIA_WAIST, r.neck, torso);
      cover(bodice, AURELIA_BODICE, r.neck, torso);
    }
    put(d, fore, elbow, down, `forearm${s}`);
    put(d, upper, shoulder, up, `upperArm${s}`);
    const c = new Uint8Array(GRID * GRID);
    cover(c, fore, elbow, down);
    cover(c, upper, shoulder, up);
    closeElbow(g, d, c, elbow);
    covers.push(c);
  }
  clearTorso(g, bodice);
  sleeves.forEach(([s, , , span], k) => clearArm(g, s, covers[k], span));
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
  bodies: ['female', 'slender'],
  draw: (g, [cloth, gold, gem]) => drawDawnVestment(g, cloth, gold, gem),
};
