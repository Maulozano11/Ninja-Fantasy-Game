// The owner's Elise's lower clothes as creator items: her pleated skirt (skirt_navy_pleats), her coat's
// tails (cape_azure_coattails), her belts (waist_azure_belt) and her fingerless gloves
// (hands_azure_fingerless). Her pixels brought down to our scale (eliseLowerArt.ts,
// tools/refs/elise-lower-from-ref.py) ride the rig as painted pieces: at rest every pixel is hers.

import { hexToRgb, hslToHex, retintHex, rgbToHsl } from '../color';
import { armDepth, armJoints, armSpan, Depth, DrawCtx, handDraw, handPose, ItemDef, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, partIndex, RES } from '../raster';
import { GROUND } from '../rig';
import { rotateTemplate, type RotatedPixel, stampTemplate, TemplatePalette } from '../rotsprite';
import {
  ELISE_BELT,
  ELISE_BELT_LEATHER,
  ELISE_BELT_STEEL,
  ELISE_COAT_BACK,
  ELISE_COAT_BLUE,
  ELISE_COAT_FRONT,
  ELISE_COAT_HEM_Y,
  ELISE_COAT_LINING,
  ELISE_COAT_TRIM,
  ELISE_FINGER_TONES,
  ELISE_GLOVE,
  ELISE_GLOVE_F,
  ELISE_GLOVE_N,
  ELISE_GLOVE_STRAP,
  ELISE_GLOVE_TONES,
  ELISE_HAND_SKIN,
  ELISE_KIND,
  ELISE_SKIRT,
  ELISE_SKIRT_CLOTH,
  ELISE_SKIRT_HEM,
} from './eliseLowerArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const FLAGS = F_NO_TEXTURE | F_NO_OUTLINE;

/** The torso's angle (pelvis to neck): the skirt, the coat and the belts turn with it. */
const torsoAngle = (g: DrawCtx): number => segAngle(g.rig.pelvis, g.rig.neck);

/** The undershorts' colour (body.ts): the short skirt takes their legs off, which would show under it. */
const SHORTS = '#3b3a46';

/**
 * Takes the undershorts' legs off the thighs (the seat stays under the skirt): under her short skirt
 * the thighs are bare. Only the shorts' own pixels go; trousers drawn over them stay.
 */
function shortsLegsOff(g: DrawCtx): void {
  const m = g.m(SHORTS, 'cloth');
  const thighs = new Set([partIndex('thighN'), partIndex('thighF')]);
  for (const d of ['nearLeg.cloth', 'farLeg.cloth'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] === m && thighs.has(L.part[i])) L.mat[i] = -1;
  }
}

// ---------------------------------------------------------------------------
// The coat's tails: hung from the pelvis, swaying with the pose, the hem never lower than at rest
// ---------------------------------------------------------------------------

/** Wind for the tails (capes.ts capeWind: they are passed it, so this module needs nothing of capes.ts). */
export interface TailWind {
  dx: number;
  lift: number;
  wave: number;
}

/** How far above the ground line her tails' hem hangs at rest (fine pixels; the female figure, idle). */
const HEM_ABOVE_GROUND = GROUND * RES - ELISE_COAT_HEM_Y;

/**
 * The tails behind the legs (backGear): her pixels hung from the waist as the torso turns (hangPixels), pushed back by the wind
 * further down (they hang from the waist, so the wind moves them half as far as a cape's), the hem
 * never lower than at rest (crouched or seated the cloth gathers up behind: the lower rows ride up
 * over the ones above, so her hem stays whole). Knocked out (drawn upright, then laid face down) the
 * near tail's edge lies along her legs instead (layTails): the flared tail would stand up in the air.
 */
function coatBack(g: DrawCtx, wind: TailWind, color: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const p = ELISE_COAT_BACK;
  const L = g.L('backGear');
  const ax = Math.floor(r.pelvis.x * RES);
  const ay = Math.floor(r.pelvis.y * RES);
  const px = r.lay ? rotateTemplate(p, torsoAngle(g) - p.angle) : hangPixels(p, torsoAngle(g));
  let top = Infinity;
  let bot = -Infinity;
  for (const q of px) {
    top = Math.min(top, q.dy);
    bot = Math.max(bot, q.dy);
  }
  const span = Math.max(1, bot - top);
  const lift = wind.lift * 0.7 * RES;
  const over = r.lay ? 0 : Math.max(0, ay + bot - Math.round(lift) - (GROUND * RES - HEM_ABOVE_GROUND));
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  // Top rows first, so the rows below (the hem) are drawn over them where the cloth gathers.
  const order = [...px].sort((a, b) => a.dy - b.dy);
  const laid = new Map<number, Map<number, string>>();
  for (const q of order) {
    const k = (q.dy - top) / span;
    const x = ax + q.dx + Math.round((wind.dx + wind.wave) * 0.5 * RES * k ** 1.3);
    const y = ay + q.dy - Math.round((lift + over) * k * k);
    if (!r.lay) L.set(x, y, pens[q.ch], 3, 'back', FLAGS);
    else if (x >= 0 && y >= 0 && x < GRID && y < GRID) {
      if (!laid.has(y)) laid.set(y, new Map());
      laid.get(y)!.set(x, q.ch);
    }
  }
  if (r.lay) layTails(g, laid, p, pens);
}

/**
 * Knocked out, the tails lie along the back of her legs: in each row the near tail's opening edge (her
 * black line, her gold, then her blues) is laid against the body's back, LAY_TAILS pixels of it, with
 * her line over it and across its two ends, as the owner's cape lies along Aiden's back (capes.ts
 * crimsonBack). The flare past them, the lining and the far tail would stand up in the air once the
 * figure is laid down: they are left out.
 */
function layTails(g: DrawCtx, laid: Map<number, Map<number, string>>, p: PaintedPiece, pens: Record<string, number>): void {
  const L = g.L('backGear');
  const back = bodyBack(g);
  const line = g.m(LINE, 'flat');
  const lining = (ch: string | undefined) => ch !== undefined && ELISE_KIND[p.colors[ch]] === 'lining';
  const band = new Map<number, number>();
  for (const [y, row] of laid) {
    const b = back.get(y);
    if (b === undefined) continue;
    // the near tail: the first run of cloth from the left, to its own line or to the lining
    let e = Math.min(...row.keys());
    while (row.has(e + 1) && !lining(row.get(e + 1)) && !(row.get(e) === 'k' && e > Math.min(...row.keys()))) e++;
    for (let i = 0; i < LAY_TAILS; i++) {
      const ch = row.get(e - i);
      L.set(b - 1 - i, y, ch && !lining(ch) ? pens[ch] : line, 3, 'back', FLAGS);
    }
    L.set(b - 1 - LAY_TAILS, y, line, 3, 'back', FLAGS);
    band.set(y, b);
  }
  // close the band's two ends with her line
  for (const [y, b] of band) {
    for (const end of [y - 1, y + 1]) {
      if (band.has(end)) continue;
      for (let i = 0; i <= LAY_TAILS; i++) L.set(b - 1 - i, end, line, 3, 'back', FLAGS);
    }
  }
}

/** Knocked out, how many pixels of the near tail lie along the back of her legs (her line, her gold, her blues). */
const LAY_TAILS = 5;

/** Knocked out (drawn upright, then laid face down), where the body's back is in each row: its first pixel from the left. */
function bodyBack(g: DrawCtx): Map<number, number> {
  const back = new Map<number, number>();
  for (const d of ['torso.body', 'nearLeg.body', 'farLeg.body'] as const) {
    const B = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (B.mat[i] < 0) continue;
      const y = (i / GRID) | 0;
      back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
    }
  }
  return back;
}

/**
 * Knocked out (drawn upright, then laid face down: compose.ts transposes the frame), the skirt and the
 * coat's front edges lie along the body: only the cloth from the body's back to the column that lands
 * on the ground is kept, so they never stand up off her back in the air (as capes.ts crimsonBack
 * does). Standing, everything is kept.
 */
function layKeep(g: DrawCtx): (x: number, y: number) => boolean {
  const r = g.rig;
  if (!r.lay) return () => true;
  const back = bodyBack(g);
  const front = Math.floor(r.lay.groundX * RES);
  return (x, y) => back.has(y) && x >= back.get(y)! && x < front;
}

/**
 * How far toward plumb the cloth below her waist hangs when her torso leans (0: it turns with the
 * torso as one stiff piece, 1: it hangs straight down).
 */
const HANG = 0.5;
/** Up to this turn of the torso (degrees) the cloth turns with it whole (RotSprite); past it, the rest of the turn hangs as HANG says. */
const HANG_FROM = 15;

/**
 * A piece hung from the waist (the skirt, the coat's front edges and tails), as pixels from its pivot:
 * its top row follows the torso's turn, as the belt does, and when the torso turns past HANG_FROM
 * (leaning far in, crouching, seated) the rows below hang part of the way back toward straight down
 * (HANG), so the cloth drapes instead of tilting with her as a stiff slab. Turned less, the piece
 * turns whole with RotSprite as before; at the angle it was drawn at every pixel is hers, unmoved.
 */
export function hangPixels(p: PaintedPiece, deg: number): RotatedPixel[] {
  const turn = Math.round(deg - p.angle);
  if (Math.abs(turn) <= HANG_FROM) return rotateTemplate(p, turn);
  const t = (turn * Math.PI) / 180;
  // the piece's own across turned with the torso; its down turned less, by what of the turn hangs
  const a = { x: Math.cos(t), y: Math.sin(t) };
  const down = { x: -Math.sin(t), y: Math.cos(t) };
  const h = ((turn - Math.sign(turn) * HANG * (Math.abs(turn) - HANG_FROM)) * Math.PI) / 180;
  const b = { x: -Math.sin(h), y: Math.cos(h) };
  // the top row (v0 rows from the pivot) rides the torso: a cell (u, v) lands at u a + v b + shift
  const v0 = -p.pivot[1];
  const shift = { x: v0 * (down.x - b.x), y: v0 * (down.y - b.y) };
  const det = a.x * b.y - a.y * b.x;
  const w = Math.max(...p.rows.map((row) => row.length));
  const corners = [
    [-p.pivot[0] - 1, -p.pivot[1] - 1],
    [w - p.pivot[0] + 1, -p.pivot[1] - 1],
    [-p.pivot[0] - 1, p.rows.length - p.pivot[1] + 1],
    [w - p.pivot[0] + 1, p.rows.length - p.pivot[1] + 1],
  ].map(([u, v]) => [u * a.x + v * b.x + shift.x, u * a.y + v * b.y + shift.y]);
  const out: RotatedPixel[] = [];
  for (let oy = Math.floor(Math.min(...corners.map((c) => c[1]))); oy <= Math.ceil(Math.max(...corners.map((c) => c[1]))); oy++) {
    for (let ox = Math.floor(Math.min(...corners.map((c) => c[0]))); ox <= Math.ceil(Math.max(...corners.map((c) => c[0]))); ox++) {
      const qx = ox - shift.x;
      const qy = oy - shift.y;
      const u = Math.round((qx * b.y - qy * b.x) / det);
      const v = Math.round((a.x * qy - a.y * qx) / det);
      const ch = p.rows[v + p.pivot[1]]?.[u + p.pivot[0]];
      if (ch && ch !== '.') out.push({ dx: ox, dy: oy, ch });
    }
  }
  return out;
}

/** Her black line: drawn along a cut when she is laid down. */
const LINE = '#080613';

/**
 * A piece riding the pelvis and turning with the torso (the skirt, the coat's front edges). Laid down
 * it is cut as layKeep says, with her line along the cut so the cloth stays closed.
 */
function stampKept(g: DrawCtx, depth: Depth, p: PaintedPiece, color: (ch: string, hex: string) => string): void {
  const r = g.rig;
  if (!r.lay) {
    const L = g.L(depth);
    const ax = Math.floor(r.pelvis.x * RES);
    const ay = Math.floor(r.pelvis.y * RES);
    const pens: Record<string, number> = {};
    for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
    for (const q of hangPixels(p, torsoAngle(g))) L.set(ax + q.dx, ay + q.dy, pens[q.ch], 3, 'pelvis', FLAGS);
    return;
  }
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  const tmp = new Layer();
  stampTemplate(tmp, p, r.pelvis, torsoAngle(g) - p.angle, pal, 'pelvis', { flags: FLAGS });
  const keep = layKeep(g);
  const line = g.m(LINE, 'flat');
  const L = g.L(depth);
  for (let i = 0; i < GRID * GRID; i++) {
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (tmp.mat[i] < 0 || !keep(x, y)) continue;
    const cut = [i - 1, i + 1, i - GRID, i + GRID].some((q) => tmp.mat[q] >= 0 && !keep(q % GRID, (q / GRID) | 0));
    L.set(x, y, cut ? line : tmp.mat[i], tmp.shade[i], 'pelvis', FLAGS);
  }
}

// ---------------------------------------------------------------------------
// Gloves: her fists in place of ours, our other hand pictures in her glove
// ---------------------------------------------------------------------------

const prt = (base: 'forearm' | 'hand', s: Side) => `${base}${s}` as PartId;

/**
 * Takes the bare hand off, for a glove painted in its own shape that replaces it: the forearm's last
 * span is drawn again under it, so the wrist the hand was drawn over stays (as clothes.ts does for the
 * owner's other gloves).
 */
function bareHandOff(g: DrawCtx, s: Side): void {
  const L = g.L(armDepth(s, 'body'));
  const hand = partIndex(prt('hand', s));
  const fore = new Layer();
  armSpan(g, fore, s, 1.3, 2, 0, { mat: g.skin, part: prt('forearm', s), bias: s === 'F' ? -1 : 0 }, 'skin');
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== hand) continue;
    L.mat[i] = fore.mat[i];
    L.shade[i] = fore.shade[i];
    L.part[i] = fore.part[i];
    L.flags[i] = fore.flags[i];
  }
}

/**
 * Her fist on the wrist: exactly as she drew it while the hand points within 30 degrees of the way it
 * did in her picture (as our hand pictures hang unturned), turned with RotSprite past that, and
 * mirrored when our hand pictures are (the thumb on the facing side). Turned, it stays within a pixel
 * of where our own hand and forearm were (`ours`, taken before the bare hand comes off): her fist is
 * longer than ours, and in a pose like leaning with crossed arms its fingers would poke out as loose
 * bits below the arm that hides our hand.
 */
function paintedFist(g: DrawCtx, s: Side, piece: PaintedPiece, color: (ch: string, hex: string) => string, ours: Uint8Array): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  const drawn = flipX ? 180 - piece.angle : piece.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  if (Math.abs(turn) <= 30) {
    stampTemplate(g.L(armDepth(s, 'armor')), piece, j.wrist, 0, pal, prt('hand', s), { flipX, flags: FLAGS });
    return;
  }
  const tmp = new Layer();
  stampTemplate(tmp, piece, j.wrist, turn, pal, prt('hand', s), { flipX, flags: FLAGS });
  const L = g.L(armDepth(s, 'armor'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (tmp.mat[i] < 0) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = ours[(y + dy) * GRID + x + dx] === 1;
    if (near) L.set(x, y, tmp.mat[i], tmp.shade[i], prt('hand', s), FLAGS);
  }
}

/** Where our hand and forearm on side `s` are drawn (1 where they are), before the bare hand comes off. */
function handAndForearm(g: DrawCtx, s: Side): Uint8Array {
  const out = new Uint8Array(GRID * GRID);
  const parts = new Set([partIndex(prt('hand', s)), partIndex(prt('forearm', s))]);
  const L = g.L(armDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && parts.has(L.part[i])) out[i] = 1;
  return out;
}

/**
 * Her gloves' cuffs: what of our forearm still shows near the wrist past a sleeve (her far sleeve's
 * guard ends short of the wrist, and seated or reaching a gap opens under the near one) is her glove,
 * in her glove blues by the skin's shades, with one row of her leather strap where it starts, so no
 * bare wrist shows between the sleeve and the glove. Bare arms get the same cuff over the wrist.
 */
const CUFF_FROM = 0.55;
function gloveCuff(g: DrawCtx, s: Side, tones: string[]): void {
  const { elbow, wrist } = armJoints(g.rig, s);
  const fore = partIndex(prt('forearm', s));
  const body = g.L(armDepth(s, 'body'));
  const over = g.L(armDepth(s, 'armor'));
  const dx = wrist.x - elbow.x;
  const dy = wrist.y - elbow.y;
  const len2 = dx * dx + dy * dy || 1;
  const along = (i: number) => ((((i % GRID) + 0.5) / RES - elbow.x) * dx + ((((i / GRID) | 0) + 0.5) / RES - elbow.y) * dy) / len2;
  const shown: [number, number][] = [];
  let first = Infinity;
  for (let i = 0; i < GRID * GRID; i++) {
    if (body.mat[i] < 0 || body.part[i] !== fore || over.mat[i] >= 0) continue;
    const t = along(i);
    if (t < CUFF_FROM) continue;
    shown.push([i, t]);
    first = Math.min(first, t);
  }
  // the strap: the shown pixels within about a fine pixel of where the cuff starts
  const strapTo = first + 1.2 / (Math.sqrt(len2) * RES);
  const strap = g.m(ELISE_GLOVE_STRAP, 'flat');
  const mats = tones.map((t) => g.m(t, 'flat'));
  for (const [i, t] of shown) {
    const pen = t <= strapTo ? strap : mats[Math.max(0, Math.min(body.shade[i], mats.length - 1))];
    over.set(i % GRID, (i / GRID) | 0, pen, 3, prt('forearm', s), FLAGS);
  }
}

/**
 * Where our hand pictures' fingertips are, in pixels from the wrist as the picture is drawn, hanging and
 * unmirrored (the cradling hand upright): a fingerless glove leaves them bare.
 */
const FINGERTIPS: Record<'open' | 'point' | 'relaxed' | 'cradle', (x: number, y: number) => boolean> = {
  open: (x, y) => y >= 7 || (x >= 5 && y >= 3 && y <= 5),
  point: (x, y) => y >= 8 || (x <= 0 && y >= 5),
  relaxed: (x, y) => y >= 6,
  cradle: (_x, y) => y <= -6,
};

/** A colour of her skin in the character's: the hue turned and the lightness scaled as her face's is. */
function herSkin(hex: string, skin: string): string {
  if (skin.toLowerCase() === ELISE_HAND_SKIN) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(ELISE_HAND_SKIN));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(skin));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), lt);
}

/**
 * Our hand picture for the pose (open, pointing, relaxed, cradling) in her glove, the fingertips bare in
 * her fingers' skin. Both hands take the picture's own shades (the far one is not darkened as our bare
 * far hand is: her glove is shaded on both hands, and our far skin is no colour of hers), the far
 * fingertips one tone deeper than the near ones.
 */
function fingerlessHand(g: DrawCtx, s: Side, tones: string[], skin: string[]): void {
  const { kind, rot, flipX } = handPose(g, s);
  if (kind === 'grip' || kind === 'fist') return;
  const tmp = new Layer();
  handDraw(g, tmp, s, { mat: 0, part: prt('hand', s), bias: 0 });
  const j = armJoints(g.rig, s);
  const ax = Math.floor(j.wrist.x * RES);
  const ay = Math.floor(j.wrist.y * RES);
  const a = kind === 'cradle' ? 0 : (Math.round(rot) * Math.PI) / 180;
  const mirror = flipX && kind !== 'cradle';
  const tip = FINGERTIPS[kind];
  const mats = tones.map((t) => g.m(t, 'flat'));
  const skins = skin.map((t) => g.m(t, 'flat'));
  const deeper = s === 'F' ? 1 : 0;
  const L = g.L(armDepth(s, 'armor'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (tmp.mat[i] < 0) continue;
    const dx = (i % GRID) - ax;
    const dy = ((i / GRID) | 0) - ay;
    const x = Math.round(dx * Math.cos(a) + dy * Math.sin(a));
    const y = Math.round(-dx * Math.sin(a) + dy * Math.cos(a));
    const sh = tmp.shade[i];
    const pen = tip(mirror ? -x : x, y) ? skins[Math.max(0, Math.min(sh - deeper, skins.length - 1))] : mats[Math.max(0, Math.min(sh, mats.length - 1))];
    L.set(i % GRID, (i / GRID) | 0, pen, 3, prt('hand', s), FLAGS);
  }
}

// ---------------------------------------------------------------------------
// The items
// ---------------------------------------------------------------------------

const kindOf = (hex: string) => ELISE_KIND[hex];

export const NAVY_PLEATS: ItemDef = {
  id: 'skirt_navy_pleats',
  slot: 'skirt',
  name: 'Navy Pleated Skirt',
  desc: 'A short dark navy skirt in narrow pleats with a gold hem. Women only.',
  colors: [col('cloth', 'Cloth', ELISE_SKIRT_CLOTH), col('hem', 'Hem', ELISE_SKIRT_HEM)],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, hem]) => {
    // The owner's Elise (2026-10-21), her skirt at our scale: it hangs from the pelvis and turns with
    // the torso, as our skirts do, its pleats draping back toward plumb when she leans far in
    // (hangPixels). Her navy follows Cloth, her gold Hem; her black line stays.
    const tint = (_ch: string, hex: string) => {
      const k = kindOf(hex);
      return k === 'cloth' ? retintHex(hex, ELISE_SKIRT_CLOTH, cloth) : k === 'hem' ? retintHex(hex, ELISE_SKIRT_HEM, hem) : hex;
    };
    shortsLegsOff(g);
    stampKept(g, 'skirt', ELISE_SKIRT, tint);
  },
};

/** The coat's tails; capes.ts hands it its cape wind. */
export function azureCoatTails(wind: (g: DrawCtx) => TailWind): ItemDef {
  return {
    id: 'cape_azure_coattails',
    slot: 'cape',
    name: 'Azure Coat Tails',
    desc: 'The long tails of a royal-blue coat, open from the waist to the calves: gold-trimmed edges and a pale grey lining. Women only.',
    colors: [col('coat', 'Coat', ELISE_COAT_BLUE), col('trim', 'Trim', ELISE_COAT_TRIM, 'metal'), col('lining', 'Lining', ELISE_COAT_LINING)],
    bodies: ['female', 'slender'],
    draw: (g, [coat, trim, lining]) => {
      // The owner's Elise (2026-10-21), her coat from the waist down at our scale: behind the legs the
      // tails and the lining, hung from the pelvis and swaying with the pose; over the skirt her
      // coat's two front edges at the hips. Her blue follows Coat, her gold Trim, her greys Lining;
      // her black line stays.
      const tint = (_ch: string, hex: string) => {
        const k = kindOf(hex);
        if (k === 'coat') return retintHex(hex, ELISE_COAT_BLUE, coat);
        if (k === 'trim') return retintHex(hex, ELISE_COAT_TRIM, trim);
        return k === 'lining' ? retintHex(hex, ELISE_COAT_LINING, lining) : hex;
      };
      coatBack(g, wind(g), tint);
      stampKept(g, 'torso.over', ELISE_COAT_FRONT, tint);
    },
  };
}

export const AZURE_BELT: ItemDef = {
  id: 'waist_azure_belt',
  slot: 'waist',
  name: 'Slung Belts',
  desc: 'Two brown leather belts across the hips, a steel buckle on the lower one, a small leather box pouch with a steel lid at the far hip.',
  colors: [col('main', 'Leather', ELISE_BELT_LEATHER, 'leather'), col('buckle', 'Buckle', ELISE_BELT_STEEL, 'metal')],
  bodies: ['female', 'slender'],
  draw: (g, [leather, steel]) => {
    // The owner's Elise (2026-10-21), her belts at our scale, riding the pelvis. Her browns follow
    // Leather, her steel (the buckle and the pouch's lid) Buckle; her black line stays.
    const tint = (_ch: string, hex: string) => {
      const k = kindOf(hex);
      return k === 'leather' ? retintHex(hex, ELISE_BELT_LEATHER, leather) : k === 'steel' ? retintHex(hex, ELISE_BELT_STEEL, steel) : hex;
    };
    stampPiece(g, 'waist', ELISE_BELT, g.rig.pelvis, torsoAngle(g), 'pelvis', tint);
  },
};

export const AZURE_FINGERLESS: ItemDef = {
  id: 'hands_azure_fingerless',
  slot: 'hands',
  name: 'Azure Fingerless Gloves',
  desc: 'Royal-blue gloves that leave the fingers bare, a leather strap round each cuff.',
  colors: [col('main', 'Glove', ELISE_GLOVE)],
  draw: (g, [glove]) => {
    // The owner's Elise (2026-10-21), her gloves at our scale. Closed, each hand is her hand in place of
    // ours: the near fist round the grip (the same fist closes on nothing), the far hand hanging. Open,
    // pointing, relaxed or cradling (hand signs, casts, a book) it is our hand picture in her glove
    // blues, the fingertips bare. Her blues follow Glove, her fingers the character's skin; her black
    // line stays.
    const tint = (_ch: string, hex: string) => {
      const k = kindOf(hex);
      if (k === 'skin') return herSkin(hex, g.look.skin);
      return k === 'line' ? hex : retintHex(hex, ELISE_GLOVE, glove);
    };
    for (const s of SIDES) {
      const { kind } = handPose(g, s);
      if (kind === 'grip' || kind === 'fist') {
        const ours = handAndForearm(g, s);
        bareHandOff(g, s);
        paintedFist(g, s, s === 'N' ? ELISE_GLOVE_N : ELISE_GLOVE_F, tint, ours);
      } else fingerlessHand(g, s, ELISE_GLOVE_TONES.map((t) => tint('', t)), ELISE_FINGER_TONES.map((t) => tint('', t)));
      gloveCuff(g, s, ELISE_GLOVE_TONES.map((t) => tint('', t)));
    }
  },
};
