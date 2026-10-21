// The owner's Elise's lower clothes as creator items: her pleated skirt (skirt_navy_pleats), her coat's
// tails (cape_azure_coattails), her belts (waist_azure_belt) and her fingerless gloves
// (hands_azure_fingerless). Her pixels brought down to our scale (eliseLowerArt.ts,
// tools/refs/elise-lower-from-ref.py) ride the rig as painted pieces: at rest every pixel is hers.

import { hexToRgb, hslToHex, retintHex, rgbToHsl } from '../color';
import { armDepth, armJoints, armSpan, DrawCtx, handDraw, handPose, ItemDef, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, partIndex, RES } from '../raster';
import { GROUND } from '../rig';
import { rotateTemplate, stampTemplate, TemplatePalette } from '../rotsprite';
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
  ELISE_GLOVE,
  ELISE_GLOVE_F,
  ELISE_GLOVE_N,
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
 * The tails behind the legs (backGear): her pixels turned with the torso, pushed back by the wind
 * further down (they hang from the waist, so the wind moves them half as far as a cape's), the hem
 * never lower than at rest (crouched or seated the cloth gathers up behind: the lower rows ride up
 * over the ones above, so her hem stays whole). Knocked out (drawn upright, then laid face down) only
 * the cloth along the legs is kept: the flared tail would stand up in the air.
 */
function coatBack(g: DrawCtx, wind: TailWind, color: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const p = ELISE_COAT_BACK;
  const L = g.L('backGear');
  const ax = Math.floor(r.pelvis.x * RES);
  const ay = Math.floor(r.pelvis.y * RES);
  const px = rotateTemplate(p, torsoAngle(g) - p.angle);
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
  // Laid down: the legs' columns in the upright drawing (the cloth within a step of them stays).
  const legs = new Map<number, [number, number]>();
  if (r.lay) {
    for (const d of ['nearLeg.body', 'farLeg.body'] as const) {
      const B = g.L(d);
      for (let i = 0; i < GRID * GRID; i++) {
        if (B.mat[i] < 0) continue;
        const y = (i / GRID) | 0;
        const x = i % GRID;
        const [lo, hi] = legs.get(y) ?? [GRID, -1];
        legs.set(y, [Math.min(lo, x), Math.max(hi, x)]);
      }
    }
  }
  const keep = (x: number, y: number) => {
    if (!r.lay) return true;
    const s = legs.get(y);
    return !!s && x >= s[0] - 2 && x <= s[1] + 2;
  };
  // Top rows first, so the rows below (the hem) are drawn over them where the cloth gathers.
  const order = [...px].sort((a, b) => a.dy - b.dy);
  for (const q of order) {
    const k = (q.dy - top) / span;
    const x = ax + q.dx + Math.round((wind.dx + wind.wave) * 0.5 * RES * k ** 1.3);
    const y = ay + q.dy - Math.round((lift + over) * k * k);
    if (keep(x, y)) L.set(x, y, pens[q.ch], 3, 'back', FLAGS);
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
 * mirrored when our hand pictures are (the thumb on the facing side).
 */
function paintedFist(g: DrawCtx, s: Side, piece: PaintedPiece, color: (ch: string, hex: string) => string): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  const drawn = flipX ? 180 - piece.angle : piece.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(armDepth(s, 'armor')), piece, j.wrist, Math.abs(turn) <= 30 ? 0 : turn, pal, prt('hand', s), { flipX, flags: FLAGS });
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

/** Our hand picture for the pose (open, pointing, relaxed, cradling) in her glove, the fingertips bare. */
function fingerlessHand(g: DrawCtx, s: Side, tones: string[]): void {
  const { kind, rot, flipX } = handPose(g, s);
  if (kind === 'grip' || kind === 'fist') return;
  const tmp = new Layer();
  handDraw(g, tmp, s, { mat: 0, part: prt('hand', s), bias: s === 'F' ? -1 : 0 });
  const j = armJoints(g.rig, s);
  const ax = Math.floor(j.wrist.x * RES);
  const ay = Math.floor(j.wrist.y * RES);
  const a = kind === 'cradle' ? 0 : (Math.round(rot) * Math.PI) / 180;
  const mirror = flipX && kind !== 'cradle';
  const tip = FINGERTIPS[kind];
  const mats = tones.map((t) => g.m(t, 'flat'));
  const L = g.L(armDepth(s, 'armor'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (tmp.mat[i] < 0) continue;
    const dx = (i % GRID) - ax;
    const dy = ((i / GRID) | 0) - ay;
    const x = Math.round(dx * Math.cos(a) + dy * Math.sin(a));
    const y = Math.round(-dx * Math.sin(a) + dy * Math.cos(a));
    if (tip(mirror ? -x : x, y)) continue;
    L.set(i % GRID, (i / GRID) | 0, mats[Math.max(0, Math.min(tmp.shade[i], mats.length - 1))], 3, prt('hand', s), FLAGS);
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
    // the torso, as our skirts do. Her navy follows Cloth, her gold Hem; her black line stays.
    const tint = (_ch: string, hex: string) => {
      const k = kindOf(hex);
      return k === 'cloth' ? retintHex(hex, ELISE_SKIRT_CLOTH, cloth) : k === 'hem' ? retintHex(hex, ELISE_SKIRT_HEM, hem) : hex;
    };
    shortsLegsOff(g);
    stampPiece(g, 'skirt', ELISE_SKIRT, g.rig.pelvis, torsoAngle(g), 'pelvis', tint);
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
      stampPiece(g, 'torso.over', ELISE_COAT_FRONT, g.rig.pelvis, torsoAngle(g), 'pelvis', tint);
    },
  };
}

export const AZURE_BELT: ItemDef = {
  id: 'waist_azure_belt',
  slot: 'waist',
  name: 'Slung Belts',
  desc: 'Two brown leather belts slung across the hips, a steel buckle on the lower one, a small pouch with a gold flap at the far hip.',
  colors: [col('main', 'Leather', ELISE_BELT_LEATHER, 'leather'), col('buckle', 'Buckle', ELISE_BELT_STEEL, 'metal')],
  bodies: ['female', 'slender'],
  draw: (g, [leather, steel]) => {
    // The owner's Elise (2026-10-21), her belts at our scale, riding the pelvis. Her browns follow
    // Leather, her steel Buckle; her black line and the pouch's gold stay.
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
  desc: 'Royal-blue gloves that leave the fingers bare.',
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
        bareHandOff(g, s);
        paintedFist(g, s, s === 'N' ? ELISE_GLOVE_N : ELISE_GLOVE_F, tint);
      } else fingerlessHand(g, s, ELISE_GLOVE_TONES.map((t) => tint('', t)));
    }
  },
};
