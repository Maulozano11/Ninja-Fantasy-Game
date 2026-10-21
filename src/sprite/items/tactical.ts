// The owner's tactical set (2026-10-21): his paint-over of our male in a padded vest and a long open coat
// with a red lining, lifted part by part out of docs/reference/tactical-coat-owner-reference.jpg by
// tools/refs/tactical-*-from-ref.py, each part its own creator option. Not a character: "no lo hagas
// personaje es parte de los sets". In our male idle every pixel is his (the vest in his shading, its
// colours changed as he asked: "solo cambiale los colores"); in other poses each piece follows its
// segment and the coat's panels hang and sway below the waist. His black line stays whatever the
// colours; his skin (the boots' bare toes) follows the character's skin.

import { retintHex } from '../color';
import { armJoints, Depth, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, skinTone, stampLeaning, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES } from '../raster';
import { GROUND } from '../rig';
import { stretched } from './armor';
import { capeWind } from './capes';
import {
  TACTICAL_BOOT_FOOT_F,
  TACTICAL_BOOT_FOOT_N,
  TACTICAL_BOOT_SHIN_F,
  TACTICAL_BOOT_SHIN_N,
  TACTICAL_BOOTS,
  TACTICAL_GLOVE,
  TACTICAL_GLOVE_F,
  TACTICAL_KIT_KIND,
  TACTICAL_SKIN,
} from './tacticalBootsGloveArt';
import {
  TACTICAL_COAT_BACK,
  TACTICAL_COAT_BLACK,
  TACTICAL_COAT_COLLAR,
  TACTICAL_COAT_FRONT,
  TACTICAL_COAT_KIND,
  TACTICAL_COAT_LAPEL_F,
  TACTICAL_COAT_LINING,
  TACTICAL_COAT_REST,
  TACTICAL_COAT_SLEEVE_F,
  TACTICAL_COAT_SLEEVE_N,
} from './tacticalCoatArt';
import { TACTICAL_VEST, TACTICAL_VEST_GREEN, TACTICAL_VEST_KIND, TACTICAL_VEST_TRIM } from './tacticalVestArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
/** His pieces are cut to the male figure; the female bodies keep their own clothes (the owner, 2026-10-21). */
const MEN = ['male', 'bulky'] as const;

/**
 * The vest's colour out of the box: not his jōnin-like green ("el chaleco no es de jonin parece mas
 * como tactico militar solo cambiale los colores"). His green is moved here, his shading kept.
 */
export const TACTICAL_VEST_DEFAULT = '#7a6547';

/** His colours through slots: his black line stays, each other kind moves the way its base moves. */
const tintBy = (kinds: Record<string, string>, slots: Record<string, [string, string]>) => (_ch: string, hex: string): string => {
  const s = slots[kinds[hex]];
  return s ? retintHex(hex, s[0], s[1]) : hex;
};

/**
 * His vest for the bulky body, whose torso is 8 px broader (3 on the near side, 5 in front) and a pixel
 * longer: his vest stretched by single columns and a row spread over it, as the bronze cuirass is.
 */
const VEST_BULKY = stretched(TACTICAL_VEST, 3, 5, 1);

/** How much broader the bulky torso is on each side (fine px): the coat's front and far pieces move out. */
const BULKY_OUT = { near: -3, far: 5 };

/**
 * How far above the ground line each panel's hem hangs at rest (fine pixels; the male figure, idle):
 * crouched or seated it never hangs lower, the cloth gathers up instead.
 */
const hemAbove = (p: PaintedPiece, rest: [number, number]) => GROUND * RES - (rest[1] + p.rows.length - 1);
const FRONT_HEM = hemAbove(TACTICAL_COAT_FRONT, TACTICAL_COAT_REST.TACTICAL_COAT_FRONT);
const BACK_HEM = hemAbove(TACTICAL_COAT_BACK, TACTICAL_COAT_REST.TACTICAL_COAT_BACK);

/**
 * A panel of his coat hung from the neck. Down to the waist it rides the torso (each row moved across
 * as the torso leans, as stampLeaning does); below the waist it hangs straight down from there, pushed
 * by the pose's wind as the capes are (the hem trails and lifts, the waist stays put), and its hem never
 * hangs lower than at rest (`hem`: crouched or seated the lower rows ride up over the ones above, so
 * his hem stays whole). Knocked out (drawn upright, then laid down) only the cloth over the body (and a
 * few pixels behind its back) is kept.
 */
function hangPanel(g: DrawCtx, depth: Depth, p: PaintedPiece, color: (ch: string, hex: string) => string, hem: number, dx0 = 0): void {
  const r = g.rig;
  const L = g.L(depth);
  const w = capeWind(g);
  const lean = segAngle(r.pelvis, r.neck) - p.angle;
  const s = Math.sin((lean * Math.PI) / 180);
  const ax = Math.floor(r.neck.x * RES) - p.pivot[0] + dx0;
  const ay = Math.floor(r.neck.y * RES) - p.pivot[1];
  const n = p.rows.length;
  // the waist: the row of the pelvis below the neck
  const waist = Math.min(n - 2, p.pivot[1] + Math.round(Math.hypot(r.pelvis.x - r.neck.x, r.pelvis.y - r.neck.y) * RES));
  const lift = r.lay ? 0 : w.lift * 1.4 * RES;
  const over = r.lay ? 0 : Math.max(0, ay + n - 1 - Math.round(lift) - (GROUND * RES - hem));
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  // Laid down: the body's back and front row by row (the coat is drawn before most clothes, over the
  // bare body); the cloth is kept from a few pixels behind the back to the front, so none of it hangs
  // into the ground or stands up in the air once the figure is laid down.
  const back = new Map<number, number>();
  const front = new Map<number, number>();
  if (r.lay) {
    for (const d of ['torso.body', 'torso.under', 'nearLeg.body', 'farLeg.body'] as const) {
      const B = g.L(d);
      for (let i = 0; i < GRID * GRID; i++) {
        if (B.mat[i] < 0) continue;
        const y = (i / GRID) | 0;
        back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
        front.set(y, Math.max(front.get(y) ?? 0, i % GRID));
      }
    }
  }
  const keep = (x: number, y: number) => !r.lay || (back.has(y) && x >= back.get(y)! - 3 && x <= front.get(y)! + 1);
  p.rows.forEach((row, j) => {
    const k = j <= waist ? 0 : (j - waist) / Math.max(1, n - 1 - waist);
    const dx = -Math.round((Math.min(j, waist) - p.pivot[1]) * s) + (r.lay ? 0 : Math.round((w.dx + w.wave) * RES * k ** 1.3));
    const dy = -Math.round((lift + over) * k * k);
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const x = ax + i + dx;
      const y = ay + j + dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID || !keep(x, y)) continue;
      L.set(x, y, pens[ch], 3, j <= waist ? 'torso' : 'back', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
}

/** Takes our bare foot away (his boot's foot takes its place); the shin stays. */
function footOff(g: DrawCtx, s: Side): void {
  const foot = partIndex(`foot${s}` as PartId);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === foot) L.mat[i] = -1;
  }
}

export const TACTICAL_ITEMS: ItemDef[] = [
  {
    id: 'armor_tactical_vest',
    slot: 'armor',
    name: 'Tactical Vest',
    desc: 'A padded military vest in quilted rows over the chest, black binding at the collar and two dark bands at the hem (+2 AC).',
    colors: [col('main', 'Vest', TACTICAL_VEST_DEFAULT), col('trim', 'Trim', TACTICAL_VEST_TRIM)],
    statsArmor: 'Leaf Chunin Flak',
    bodies: [...MEN],
    draw: (g, [main, trim]) => {
      // His vest rides the torso about the neck, over the shirt; his pads follow Vest, his bindings Trim.
      const r = g.rig;
      const tint = tintBy(TACTICAL_VEST_KIND, { green: [TACTICAL_VEST_GREEN, main], dark: [TACTICAL_VEST_TRIM, trim] });
      stampLeaning(g, 'torso.armor', r.body === 'bulky' ? VEST_BULKY : TACTICAL_VEST, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
    },
  },
  {
    id: 'cape_tactical_coat',
    slot: 'cape',
    name: 'Long Field Coat',
    desc: 'A long black coat worn open over the vest: a standing collar, short sleeves, and panels to the shins lined in red.',
    colors: [col('main', 'Coat', TACTICAL_COAT_BLACK), col('lining', 'Lining', TACTICAL_COAT_LINING)],
    bodies: [...MEN],
    draw: (g, [main, lining]) => {
      // His coat: the back (the far panel and the lining between the legs) behind the body, the front
      // panel in front of the near leg and behind the near arm, the far lapel over the vest, the collar
      // under the chin, each sleeve on its upper arm (in the arm's armour layer: the cape is drawn
      // before the shirt, whose sleeves would cover it).
      const r = g.rig;
      const tint = tintBy(TACTICAL_COAT_KIND, { dark: [TACTICAL_COAT_BLACK, main], red: [TACTICAL_COAT_LINING, lining] });
      const bulky = r.body === 'bulky';
      const torso = segAngle(r.pelvis, r.neck);
      hangPanel(g, 'capeBack', TACTICAL_COAT_BACK, tint, BACK_HEM, bulky ? BULKY_OUT.far : 0);
      hangPanel(g, 'capeFront', TACTICAL_COAT_FRONT, tint, FRONT_HEM, bulky ? BULKY_OUT.near : 0);
      hangPanel(g, 'torso.over', TACTICAL_COAT_LAPEL_F, tint, 0, bulky ? BULKY_OUT.far : 0);
      stampLeaning(g, 'torso.acc', TACTICAL_COAT_COLLAR, r.neck, torso, 'torso', tint);
      for (const s of SIDES) {
        const j = armJoints(r, s);
        const piece = s === 'N' ? TACTICAL_COAT_SLEEVE_N : TACTICAL_COAT_SLEEVE_F;
        stampPiece(g, s === 'N' ? 'nearArm.armor' : 'farArm.armor', piece, j.shoulder, segAngle(j.shoulder, j.elbow), `upperArm${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'feet_tactical_boots',
    slot: 'feet',
    name: 'Open-Toe Shin Boots',
    desc: 'Black shin boots open at the toes and the heel, banded over the instep, on a thin sole.',
    colors: [col('main', 'Boot', TACTICAL_BOOTS, 'leather')],
    bodies: [...MEN],
    draw: (g, [main]) => {
      // His boots: on each leg the shaft turns with the shin about the ankle and the foot stays flat on
      // the ground like our feet, our bare foot under it taken away; his bare toes take the skin.
      const tint = (ch: string, hex: string): string => {
        const k = TACTICAL_KIT_KIND[hex];
        if (k === 'skin') return skinTone(hex, TACTICAL_SKIN, g.look.skin);
        return tintBy(TACTICAL_KIT_KIND, { dark: [TACTICAL_BOOTS, main] })(ch, hex);
      };
      for (const s of SIDES) {
        const { knee, ankle } = legJoints(g.rig, s);
        footOff(g, s);
        const shin = s === 'N' ? TACTICAL_BOOT_SHIN_N : TACTICAL_BOOT_SHIN_F;
        const foot = s === 'N' ? TACTICAL_BOOT_FOOT_N : TACTICAL_BOOT_FOOT_F;
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'hands_tactical_glove',
    slot: 'hands',
    name: 'Short Field Glove',
    desc: 'A short dark glove on the off hand, a cuff round the wrist; the knuckles and fingers bare.',
    colors: [col('main', 'Glove', TACTICAL_GLOVE, 'leather')],
    bodies: [...MEN],
    draw: (g, [main]) => {
      // His glove is on the far wrist only, as he drew it; it turns with the forearm, and moves in front
      // of the body with the far hand (it is the hand's: compose.ts farHandToFront).
      const j = armJoints(g.rig, 'F');
      stampPiece(g, 'farArm.armor', TACTICAL_GLOVE_F, j.wrist, segAngle(j.elbow, j.wrist), 'handF', tintBy(TACTICAL_KIT_KIND, { dark: [TACTICAL_GLOVE, main] }));
    },
  },
];
