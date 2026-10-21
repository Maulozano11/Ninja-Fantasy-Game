// The owner's broad man's clothes, his pixels (docs/reference/bulky-owner-reference.jpg, 2026-10-21: "copia
// todo como aiden"): the black shirt with silver seams, the jeans to colour ("seria ese el jeans para
// colear"), the belt on its own ("aisla el cinturon") with its pouch and knife, the steel gauntlet and the
// wrapped bracer, and the low leather boots. Every piece is his, lifted out by tools/refs/*-from-ref.py
// and riding our rig like his Aiden's: at rest on the bulky body every pixel is where he drew it; in
// other poses each piece follows its bone. His black line is never recoloured; with each colour slot at
// its default every pixel is his colour.
//
// He drew them on the bulky body; "haz una version para el tipo de personaje masculino con complexion
// normal": on the male body each piece is fitted to its narrower limbs and torso by leaving out whole
// columns and rows of his, or repeating them, never redrawn (fit.ts).

import { retintHex } from '../color';
import { capPlace, ownerSkin } from '../bulkyBody';
import { armDepth, armJoints, Depth, DrawCtx, handDraw, handPose, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { centered, refit, uprightPiece } from '../fit';
import { BOOTS_PART } from './bootsPart';
import { clothPen, limb } from './clothes';
import { segAngle, type PaintedPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, Vec } from '../raster';
import { BODY_PARAMS, type BodyParams } from '../rig';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { BELT_KIND, BELT_KNIFE, BELT_LEATHER, BELT_METAL, BELT_POUCH, BELT_STRAPS, BELT_TAN } from './brawlerBeltArt';
import { BOOT_F, BOOT_KIND, BOOT_LEATHER, BOOT_N } from './brawlerBootsArt';
import { BRACER_BAND, BRACER_KIND, BRACER_SKIN, BRACER_STEEL, BRACER_WRAP, STEEL_BRACER_N, STEEL_FIST_N, WRAP_BRACER_F, WRAP_FIST_F } from './brawlerBracersArt';
import { JEANS_DENIM, JEANS_HIPS, JEANS_KIND, JEANS_SHIN_F, JEANS_SHIN_N, JEANS_THIGH_F, JEANS_THIGH_N } from './jeansArt';
import { SHIRT_CAP_F, SHIRT_CAP_N, SHIRT_CLOTH, SHIRT_KIND, SHIRT_SEAM, SHIRT_SLEEVE_F, SHIRT_SLEEVE_N, SHIRT_TORSO } from './seamShirtArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;
type Tint = (ch: string, hex: string) => string;

/** The bodies his clothes are made for: his broad man's (bulky) and, fitted, the normal male's. */
const MALE_BODIES: ItemDef['bodies'] = ['male', 'bulky'];

// ---------------------------------------------------------------------------
// Stamping his pieces
// ---------------------------------------------------------------------------

function pens(g: DrawCtx, p: PaintedPiece, tint: Tint): TemplatePalette {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(tint(ch, hex), 'flat'), 3];
  return pal;
}

/** His piece with its pivot on `at`, its limb pointing along `deg` (at his angle, every pixel his). */
function onLimb(g: DrawCtx, L: Layer, p: PaintedPiece, at: Vec, deg: number, part: PartId, tint: Tint): void {
  stampTemplate(L, p, at, deg - p.angle, pens(g, p, tint), part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** Past this lean (degrees from his picture) a piece riding the torso is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * His piece riding the torso, leaning `deg` about its pivot: a small lean shears it, each row moved across
 * whole (his pixels only stepped), as far as a turn would; a large one turns it with RotSprite.
 */
function onTorso(g: DrawCtx, L: Layer, p: PaintedPiece, at: Vec, deg: number, part: PartId, tint: Tint): void {
  const d = deg - p.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    onLimb(g, L, p, at, deg, part, tint);
    return;
  }
  const pal = pens(g, p, tint);
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  p.rows.forEach((row, j) => {
    const dx = -Math.round((j - p.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pal[row[i]][0], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/**
 * His fist on the wrist: as he drew it while the hand points within 30 degrees of the way it did in his
 * picture, turned with RotSprite past that, and mirrored when our hand pictures are (thumb on the facing
 * side), like the owner's gauntlets (clothes.ts paintedFist).
 */
function onWrist(g: DrawCtx, L: Layer, s: Side, p: PaintedPiece, tint: Tint): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  const drawn = flipX ? 180 - p.angle : p.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  stampTemplate(L, p, j.wrist, Math.abs(turn) <= 30 ? 0 : turn, pens(g, p, tint), prt('hand', s), { flipX, flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/**
 * Takes away the pixels of these parts from these depths (what his piece replaces); with `oursOnly`,
 * only our drawn shapes, not painted pixels (his skin on the bulky body, our hand pictures).
 */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[], oursOnly = false): void {
  const idx = new Set(parts.map(partIndex));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && idx.has(L.part[i]) && !(oursOnly && L.flags[i] & F_NO_TEXTURE)) L.mat[i] = -1;
  }
}

/**
 * Our torso's skin and undergarment taken away between two heights (torso-local design units, 0 at the
 * hips): what his shirt or his jeans cover there is his, and where they do not his figure ends.
 */
function torsoOff(g: DrawCtx, from: number, to: number): void {
  const r = g.rig;
  const torso = partIndex('torso');
  for (const d of ['torso.body', 'torso.under'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      const up = x * r.up.x + y * r.up.y;
      if (up >= from && up <= to) L.mat[i] = -1;
    }
  }
}

/** Our bare forearm past the round of the elbow taken away (painted pixels stay). */
function forearmOff(g: DrawCtx, s: Side): void {
  const j = armJoints(g.rig, s);
  const L = g.L(armDepth(s, 'body'));
  const fore = partIndex(prt('forearm', s));
  const len = Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) || 1;
  const ux = (j.wrist.x - j.elbow.x) / len;
  const uy = (j.wrist.y - j.elbow.y) / len;
  const keep = g.rig.body === 'bulky' ? 0 : g.bp.armR[1];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== fore || L.flags[i] & F_NO_TEXTURE) continue;
    const t = ((i % GRID) + 0.5) / RES - j.elbow.x;
    const u = (Math.floor(i / GRID) + 0.5) / RES - j.elbow.y;
    if (t * ux + u * uy > keep) L.mat[i] = -1;
  }
}

/** His colours by what they are: his black line stays, each other kind follows its slot from his default. */
const byKind = (kinds: Record<string, string>, slots: Record<string, [string, string]>, skin?: string): Tint => (_ch, hex) => {
  const k = kinds[hex];
  if (!k || k === 'line') return hex;
  if (k === 'skin') return skin ? ownerSkin(hex, BRACER_SKIN, skin) : hex;
  const s = slots[k];
  return s ? retintHex(hex, s[0], s[1]) : hex;
};

// ---------------------------------------------------------------------------
// Fitting to the normal male body
// ---------------------------------------------------------------------------

const BULKY = BODY_PARAMS.bulky;
const ratio = (b: BodyParams, f: (p: BodyParams) => number) => f(b) / f(BULKY);

/** A limb piece on this body: as wide as its limb, as long as its bone. */
function limbFit(g: DrawCtx, p: PaintedPiece, key: string, width: (b: BodyParams) => number, length: (b: BodyParams) => number): PaintedPiece {
  if (g.rig.body === 'bulky') return p;
  const w = ratio(g.bp, width);
  // Turned upright first, so its columns run across the limb whatever angle he drew it at, then centred
  // on our limb's line (his limb's middle is a pixel or two off our bulky rig's joints).
  return centered(refit(uprightPiece(p), { left: w, right: w, down: ratio(g.bp, length) }, `${key}@${g.rig.body}`));
}

/** A piece riding the torso on this body: narrower on each side of its pivot, shorter below it. */
function torsoFit(g: DrawCtx, p: PaintedPiece, key: string, f: { left: (b: BodyParams) => number; right: (b: BodyParams) => number; down?: (b: BodyParams) => number }): PaintedPiece {
  if (g.rig.body === 'bulky') return p;
  return refit(p, { left: ratio(g.bp, f.left), right: ratio(g.bp, f.right), down: f.down ? ratio(g.bp, f.down) : 1 }, `${key}@${g.rig.body}`);
}

const torsoAngle = (g: DrawCtx) => segAngle(g.rig.pelvis, g.rig.neck);

/** Where his shirt's hem meets his jeans' waistband, above the hips (torso-local design units). */
const SHIRT_HEM = 2.8;

// ---------------------------------------------------------------------------
// The items
// ---------------------------------------------------------------------------

export const BRAWLER_TOPS: ItemDef[] = [
  {
    id: 'top_seam_shirt',
    slot: 'top',
    name: 'Seamed Shirt',
    desc: 'A tight short-sleeved shirt with a high collar, silver seams and the muscles showing through.',
    colors: [col('main', 'Shirt', SHIRT_CLOTH), col('seam', 'Seams', SHIRT_SEAM)],
    bodies: MALE_BODIES,
    draw: (g, [cloth, seam]) => {
      const r = g.rig;
      const tint = byKind(SHIRT_KIND, { cloth: [SHIRT_CLOTH, cloth], seam: [SHIRT_SEAM, seam] });
      // Under his shirt our torso goes, up to the neck: the shirt is his figure there.
      torsoOff(g, SHIRT_HEM, g.bp.torsoLen);
      const torso = torsoFit(g, SHIRT_TORSO, 'SHIRT_TORSO', { left: (b) => b.shoulderHalf, right: (b) => b.chestHalf, down: (b) => b.torsoLen });
      onTorso(g, g.L('torso.top'), torso, r.neck, torsoAngle(g), 'torso', tint);
      for (const s of SIDES) {
        const j = armJoints(r, s);
        const L = g.L(armDepth(s, 'cloth'));
        const p = limbFit(g, s === 'N' ? SHIRT_SLEEVE_N : SHIRT_SLEEVE_F, `SHIRT_SLEEVE_${s}`, (b) => b.armR[0], (b) => b.upperArm);
        onLimb(g, L, p, j.shoulder, segAngle(j.shoulder, j.elbow), prt('upperArm', s), tint);
        // Over the shoulder the sleeve rides the shoulder, following the arm part of the way.
        const cap = limbFit(g, s === 'N' ? SHIRT_CAP_N : SHIRT_CAP_F, `SHIRT_CAP_${s}`, (b) => b.armR[0], () => 1);
        const { at, deg } = capPlace(r, s, cap);
        onLimb(g, L, cap, at, deg, prt('upperArm', s), tint);
      }
    },
  },
];

export const BRAWLER_BOTTOMS: ItemDef[] = [
  {
    id: 'bottom_jeans',
    slot: 'bottom',
    name: 'Jeans',
    desc: 'Loose jeans in any colour, lit down the front of each leg and creased at the knees.',
    colors: [col('main', 'Jeans', JEANS_DENIM)],
    parts: [BOOTS_PART('tucked')],
    bodies: MALE_BODIES,
    draw: (g, [denim]) => {
      const r = g.rig;
      const tint = byKind(JEANS_KIND, { denim: [JEANS_DENIM, denim] });
      // Under his jeans our hips, legs and undergarment go: the jeans are his figure there.
      torsoOff(g, -99, SHIRT_HEM);
      partsOff(g, [legDepth('N', 'body'), legDepth('N', 'cloth'), legDepth('F', 'body'), legDepth('F', 'cloth')], ['thighN', 'shinN', 'thighF', 'shinF']);
      // Under his pieces, plain trouser legs in the jeans' colour, a little inside his: where a bent knee
      // or hip opens a gap between his pieces, they show instead of the background.
      for (const s of SIDES) limb(g, g.L(legDepth(s, 'cloth')), 'leg', s, 0.3, 1.9, [-0.7, -0.7], clothPen(g, denim, prt('thigh', s), s === 'F' ? -1 : 0), { round0: true });
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const { hip, knee, ankle } = legJoints(r, s);
        const shin = limbFit(g, s === 'N' ? JEANS_SHIN_N : JEANS_SHIN_F, `JEANS_SHIN_${s}`, (b) => b.legR[2], (b) => b.shin);
        const thigh = limbFit(g, s === 'N' ? JEANS_THIGH_N : JEANS_THIGH_F, `JEANS_THIGH_${s}`, (b) => b.legR[0], (b) => b.thigh);
        onLimb(g, L, shin, knee, segAngle(knee, ankle), prt('shin', s), tint);
        onLimb(g, L, thigh, hip, segAngle(hip, knee), prt('thigh', s), tint);
      }
      const hips = torsoFit(g, JEANS_HIPS, 'JEANS_HIPS', { left: (b) => b.hipHalf, right: (b) => b.hipHalf });
      onTorso(g, g.L('torso.bottom'), hips, r.pelvis, torsoAngle(g), 'pelvis', tint);
    },
  },
];

/** How far out from the pelvis the near thigh's outer edge is (where the pouch hangs), in fine pixels. */
const nearHipOut = (b: BodyParams) => (b.hipHalf * 0.5 + b.legR[0] * 0.96) * RES;

export const BRAWLER_WAIST: ItemDef[] = [
  {
    id: 'waist_brawler_belt',
    slot: 'waist',
    name: 'Brawler Belt',
    desc: 'A brown leather belt with a round silver buckle and a second strap slanting to the hip, a tan pouch on the hip and a sheathed knife hanging between the legs.',
    colors: [col('main', 'Leather', BELT_LEATHER, 'leather'), col('metal', 'Buckle', BELT_METAL, 'metal'), col('pouch', 'Pouch', BELT_TAN, 'leather')],
    parts: [
      { key: 'pouch', label: 'Pouch', options: [{ id: 'on', label: 'Pouch', desc: 'The tan pouch hangs on the near hip.' }, { id: 'off', label: 'None', desc: 'No pouch.' }] },
      { key: 'knife', label: 'Knife', options: [{ id: 'on', label: 'Knife', desc: 'A sheathed knife hangs between the legs.' }, { id: 'off', label: 'None', desc: 'No knife.' }] },
    ],
    bodies: MALE_BODIES,
    draw: (g, [leather, metal, tan], parts) => {
      const r = g.rig;
      const tint = byKind(BELT_KIND, { leather: [BELT_LEATHER, leather], metal: [BELT_METAL, metal], tan: [BELT_TAN, tan] });
      const L = g.L('waist');
      const lean = torsoAngle(g);
      if (parts.knife === 'on') onTorso(g, L, BELT_KNIFE, r.pelvis, lean, 'pelvis', tint);
      if (parts.pouch === 'on') {
        // On a narrower body the pouch moves in with the hip: his pixels, shifted, not squeezed.
        const dx = r.body === 'bulky' ? 0 : -Math.round(nearHipOut(BULKY) - nearHipOut(g.bp));
        const pouch = dx ? refit(BELT_POUCH, { shift: [dx, 0] }, `BELT_POUCH@${r.body}`) : BELT_POUCH;
        onTorso(g, L, pouch, r.pelvis, lean, 'pelvis', tint);
      }
      const straps = torsoFit(g, BELT_STRAPS, 'BELT_STRAPS', { left: (b) => b.hipHalf, right: (b) => b.hipHalf });
      onTorso(g, L, straps, r.pelvis, lean, 'pelvis', tint);
    },
  },
];

type BracerStyle = 'steel' | 'wrap' | 'none';

export const BRAWLER_HANDS: ItemDef[] = [
  {
    id: 'hands_brawler_bracers',
    slot: 'hands',
    name: 'Gauntlet and Wraps',
    desc: 'A steel gauntlet with a dark band over the near forearm and fist, white wrappings round the far forearm and fist; either on either arm.',
    colors: [col('main', 'Steel', BRACER_STEEL, 'metal'), col('band', 'Band', BRACER_BAND, 'leather'), col('wrap', 'Wraps', BRACER_WRAP)],
    parts: [
      {
        key: 'near',
        label: 'Near arm',
        options: [
          { id: 'steel', label: 'Gauntlet', desc: 'The steel gauntlet over the forearm and fist.' },
          { id: 'wrap', label: 'Wraps', desc: 'White wrappings round the forearm and fist.' },
          { id: 'none', label: 'None', desc: 'The arm bare.' },
        ],
      },
      {
        key: 'far',
        label: 'Far arm',
        options: [
          { id: 'wrap', label: 'Wraps', desc: 'White wrappings round the forearm and fist.' },
          { id: 'steel', label: 'Gauntlet', desc: 'The steel gauntlet over the forearm and fist.' },
          { id: 'none', label: 'None', desc: 'The arm bare.' },
        ],
      },
    ],
    bodies: MALE_BODIES,
    draw: (g, [steel, band, wrap], parts) => {
      // His gauntlet is the near arm's and his wrappings the far arm's; on the other arm each is his
      // same pixels, turned to that forearm.
      const tint = byKind(BRACER_KIND, { steel: [BRACER_STEEL, steel], band: [BRACER_BAND, band], wrap: [BRACER_WRAP, wrap] }, g.look.skin);
      for (const s of SIDES) {
        const style = (s === 'N' ? parts.near : parts.far) as BracerStyle;
        if (style === 'none') continue;
        const j = armJoints(g.rig, s);
        const L = g.L(armDepth(s, 'armor'));
        // The forearm is his bracer's: our bare forearm under it goes (it would show past his edge), but
        // not the round of the elbow, which closes the upper arm; his own skin at the elbow stays.
        forearmOff(g, s);
        const bracer = limbFit(g, style === 'steel' ? STEEL_BRACER_N : WRAP_BRACER_F, `${style}_BRACER`, (b) => b.armR[2], (b) => b.forearm);
        onLimb(g, L, bracer, j.elbow, segAngle(j.elbow, j.wrist), prt('forearm', s), tint);
        const { kind } = handPose(g, s);
        // His fist closed (his near hand rests closed on the hip as he drew it); open, pointing or
        // cradling hands are our hand pictures.
        if (kind === 'grip' || kind === 'fist' || kind === 'relaxed') {
          partsOff(g, [armDepth(s, 'body')], [prt('hand', s)]);
          const fist = limbFit(g, style === 'steel' ? STEEL_FIST_N : WRAP_FIST_F, `${style}_FIST`, (b) => b.handR, (b) => b.handR);
          onWrist(g, L, s, fist, tint);
        } else if (style === 'steel') {
          // An open, pointing or relaxed hand: our hand picture in his steel.
          handDraw(g, L, s, { mat: g.m(steel, 'metal'), part: prt('hand', s), bias: s === 'F' ? -1 : 0 });
        }
      }
    },
  },
];

export const BRAWLER_FEET: ItemDef[] = [
  {
    id: 'feet_brawler_boots',
    slot: 'feet',
    name: 'Brawler Boots',
    desc: 'Low brown leather boots with a lit toe cap and a dark sole.',
    colors: [col('main', 'Leather', BOOT_LEATHER, 'leather')],
    bodies: MALE_BODIES,
    draw: (g, [leather]) => {
      // Each boot stands on our ankle, flat on the ground like our feet; our bare foot under it goes.
      // On a body whose ankle stands higher above its sole (the male's), his boot is that many rows
      // taller: his rows between the ankle and the sole repeated.
      const tint = byKind(BOOT_KIND, { leather: [BOOT_LEATHER, leather] });
      for (const s of SIDES) {
        partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [prt('foot', s)]);
        const p = s === 'N' ? BOOT_N : BOOT_F;
        let boot = p;
        if (g.rig.body !== 'bulky') {
          const below = p.rows.length - 1 - p.pivot[1];
          const extra = ((BULKY.ankleLift ?? 0) - (g.bp.ankleLift ?? 0)) * (s === 'N' ? 1 : 0.5) * RES;
          const w = g.bp.footLen / BULKY.footLen;
          boot = refit(p, { left: w, right: w, down: (below + extra) / below }, `BOOT_${s}@${g.rig.body}`);
        }
        onLimb(g, g.L(legDepth(s, 'feet')), boot, legJoints(g.rig, s).ankle, boot.angle, prt('foot', s), tint);
      }
    },
  },
];

/** Every item from his broad man, by slot. */
export const BRAWLER_ITEMS: ItemDef[] = [...BRAWLER_TOPS, ...BRAWLER_BOTTOMS, ...BRAWLER_WAIST, ...BRAWLER_HANDS, ...BRAWLER_FEET];
