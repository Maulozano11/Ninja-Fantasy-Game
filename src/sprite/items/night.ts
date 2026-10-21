// The owner's Ren (2026-10-21, "el nuevo estandar"): his paint-over of our Ren, lifted part by part out of
// docs/reference/ren-owner-reference.jpg by tools/refs/ren-*-from-ref.py, each part its own creator
// option: the jacket with his bare forearms, the belt, the studded skirt, the trousers and the boots. (His
// hair is in hair.ts, his head and eyes in body.ts, his gloves are the Fingerless Gloves in clothes.ts and
// his katana the Katana v2 in accessories.ts.) In our male idle every pixel is his; in other poses each
// piece follows its segment. His black line stays whatever the colours; his skin follows the
// character's skin; the rest follows the colour slots, his own colours when they are kept.

import { retintHex } from '../color';
import { armDepth, armJoints, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, skinTone, stampLeaning, stampPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, v, Vec } from '../raster';
import { NIGHT_SKIN } from '../nightHeadArt';
import { NIGHT_BELT, NIGHT_BELT_BASE, NIGHT_BELT_KIND } from './nightBeltArt';
import { NIGHT_BOOT_FOOT_F, NIGHT_BOOT_FOOT_N, NIGHT_BOOT_GOLD, NIGHT_BOOT_SHIN_F, NIGHT_BOOT_SHIN_N, NIGHT_BOOT_SILVER, NIGHT_BOOTS, NIGHT_KIT_KIND } from './nightBootsGlovesArt';
import { NIGHT_ARM_F, NIGHT_ARM_N, NIGHT_BUTTONS, NIGHT_JACKET, NIGHT_JACKET_BODY, NIGHT_JACKET_KIND, NIGHT_SLEEVE_F, NIGHT_SLEEVE_N } from './nightJacketArt';
import { NIGHT_SKIRT, NIGHT_SKIRT_BASE, NIGHT_SKIRT_KIND, NIGHT_SKIRT_REST, NIGHT_STUDS } from './nightSkirtArt';
import { GROUND } from '../rig';
import { NIGHT_LEG_SHIFT, NIGHT_SHIN_F, NIGHT_SHIN_N, NIGHT_THIGH_F, NIGHT_THIGH_N, NIGHT_TROUSERS, NIGHT_TROUSERS_KIND } from './nightTrousersArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
/** His pieces are cut to the male figure; the female bodies keep their own clothes (the owner, 2026-10-21). */
const MEN = ['male', 'bulky'] as const;

/**
 * His colours through the item's slots: his black line stays, his skin follows the character's skin, his
 * silver and gold follow theirs, the rest (his black cloth) follows the main colour.
 */
function nightColor(g: DrawCtx, kinds: Record<string, string>, main: [string, string], metal: Record<string, [string, string]> = {}) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line') return hex;
    if (k === 'skin') return skinTone(hex, NIGHT_SKIN, g.look.skin);
    const m = metal[k];
    if (m) return retintHex(hex, m[0], m[1]);
    return retintHex(hex, main[0], main[1]);
  };
}

/**
 * Takes our arm away above the hand: his sleeve and his bare forearm take its place (his are his own
 * shape and shading), so none of ours shows round them.
 */
function armOff(g: DrawCtx, s: Side): void {
  const parts = [partIndex(`forearm${s}` as PartId), partIndex(`upperArm${s}` as PartId)];
  const L = g.L(armDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && parts.includes(L.part[i])) L.mat[i] = -1;
}

/**
 * Takes our torso away below the neck: his jacket is the torso (as his cuirass is on our Roman), so our
 * skin never shows past it, and the far sleeve he drew past the chest is not hidden behind ours.
 */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under'] as const) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

/** Takes our bare foot away (his boot's foot takes its place); the shin stays. */
function footOff(g: DrawCtx, s: Side): void {
  const foot = partIndex(`foot${s}` as PartId);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === foot) L.mat[i] = -1;
  }
}

const arm = (s: Side, n: PaintedPiece, f: PaintedPiece) => (s === 'N' ? n : f);
/** How much of the torso's lean the skirt follows (it hangs from the waist). */
const SKIRT_LEAN = 0.5;
/** How far above the ground line his skirt's hem hangs at rest (fine pixels; the male figure, idle). */
const SKIRT_HEM_ABOVE_GROUND = GROUND * RES - (NIGHT_SKIRT_REST.NIGHT_SKIRT[1] + NIGHT_SKIRT.rows.length - 1);

/**
 * His skirt's hem never hangs lower than at rest: crouched or seated, the cloth that would reach the
 * ground lies folded over the legs, so it ends there on his black line (his panels above stay as he
 * drew them). Knocked out (drawn upright, then laid down) it is left whole.
 */
function hemSkirt(g: DrawCtx, depth: 'skirt' | 'torso.over'): void {
  if (g.rig.lay) return;
  const L = g.L(depth);
  const hemY = GROUND * RES - SKIRT_HEM_ABOVE_GROUND;
  const pelvis = partIndex('pelvis');
  const line = g.m(NIGHT_SKIRT.colors[Object.keys(NIGHT_SKIRT.colors).find((ch) => NIGHT_SKIRT_KIND[NIGHT_SKIRT.colors[ch]] === 'line')!], 'flat');
  for (let x = 0; x < GRID; x++) {
    let cut = false;
    for (let y = hemY + 1; y < GRID; y++) {
      const i = y * GRID + x;
      if (L.mat[i] >= 0 && L.part[i] === pelvis) {
        L.mat[i] = -1;
        cut = true;
      }
    }
    const h = hemY * GRID + x;
    if (cut && L.mat[h] >= 0 && L.part[h] === pelvis) L.set(x, hemY, line, 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

/**
 * His legs stand a little apart from our rig's (his near leg 5 px further back, his far one 5 px lower:
 * NIGHT_LEG_SHIFT). Worn together, his trousers and boots are his legs: each leg hangs from our hip, knee
 * and ankle moved that far (the whole leg, so every pose keeps it whole), and at rest they are where he
 * drew them. Worn with other trousers or footwear, each sits on our leg, so it meets them.
 */
function legShift(g: DrawCtx, s: Side): Vec {
  if (!g.has('bottom', 'bottom_night_trousers') || !g.has('feet', 'feet_night_boots')) return v(0, 0);
  const [dx, dy] = NIGHT_LEG_SHIFT[s];
  return v(dx / RES, dy / RES);
}

/** Takes our leg away (his trousers and boots are the leg, standing where he drew it). */
function legOff(g: DrawCtx, s: Side): void {
  const parts = [`thigh${s}`, `shin${s}`, `foot${s}`].map((p) => partIndex(p as PartId));
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && parts.includes(L.part[i])) L.mat[i] = -1;
  }
}

export const NIGHT_ITEMS: ItemDef[] = [
  {
    id: 'top_night_jacket',
    slot: 'top',
    name: 'Night Jacket',
    desc: 'A black jacket with a high collar and short sleeves, closed beside a seam with silver buttons; the forearms bare.',
    colors: [col('main', 'Jacket', NIGHT_JACKET), col('buttons', 'Buttons', NIGHT_BUTTONS, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, buttons]) => {
      // His jacket: the body rides the torso about the neck, each sleeve its upper arm about the
      // shoulder, each bare forearm (his skin shading) its forearm about the elbow, in place of ours.
      const r = g.rig;
      const tint = nightColor(g, NIGHT_JACKET_KIND, [NIGHT_JACKET, main], { silver: [NIGHT_BUTTONS, buttons] });
      torsoOff(g);
      for (const s of SIDES) {
        const j = armJoints(r, s);
        armOff(g, s);
        stampPiece(g, armDepth(s, 'body'), arm(s, NIGHT_ARM_N, NIGHT_ARM_F), j.elbow, segAngle(j.elbow, j.wrist), `forearm${s}` as PartId, tint);
        stampPiece(g, armDepth(s, 'cloth'), arm(s, NIGHT_SLEEVE_N, NIGHT_SLEEVE_F), j.shoulder, segAngle(j.shoulder, j.elbow), `upperArm${s}` as PartId, tint);
      }
      stampLeaning(g, 'torso.top', NIGHT_JACKET_BODY, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
    },
  },
  {
    id: 'waist_night_belt',
    slot: 'waist',
    name: 'Night Belt',
    desc: 'A broad black belt round the waist.',
    colors: [col('main', 'Belt', NIGHT_BELT_BASE, 'leather')],
    bodies: [...MEN],
    draw: (g, [main]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', NIGHT_BELT, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', nightColor(g, NIGHT_BELT_KIND, [NIGHT_BELT_BASE, main]));
    },
  },
  {
    id: 'skirt_night_studded',
    slot: 'skirt',
    name: 'Studded Night Skirt',
    desc: 'A long skirt of black panels from the belt to below the knees, silver studs down the panels, slits between them.',
    colors: [col('main', 'Skirt', NIGHT_SKIRT_BASE), col('studs', 'Studs', NIGHT_STUDS, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, studs]) => {
      // His skirt hangs from the pelvis, over a coat's tails when one is worn. Cloth hangs: it leans
      // half as far as the torso does.
      const r = g.rig;
      const tint = nightColor(g, NIGHT_SKIRT_KIND, [NIGHT_SKIRT_BASE, main], { silver: [NIGHT_STUDS, studs] });
      const lean = NIGHT_SKIRT.angle + SKIRT_LEAN * (segAngle(r.pelvis, r.neck) - NIGHT_SKIRT.angle);
      const depth = g.L('torso.over').used ? 'torso.over' : 'skirt';
      stampLeaning(g, depth, NIGHT_SKIRT, r.pelvis, lean, 'pelvis', tint);
      hemSkirt(g, depth);
    },
  },
  {
    id: 'bottom_night_trousers',
    slot: 'bottom',
    name: 'Night Trousers',
    desc: 'Baggy blue-black trousers tucked into the boots.',
    colors: [col('main', 'Trousers', NIGHT_TROUSERS)],
    bodies: [...MEN],
    draw: (g, [main]) => {
      // His trousers on each leg: the thigh turns about the hip, the shin about the knee.
      const tint = nightColor(g, NIGHT_TROUSERS_KIND, [NIGHT_TROUSERS, main]);
      for (const s of SIDES) {
        const d = legShift(g, s);
        if (d.x || d.y) legOff(g, s);
        const j = legJoints(g.rig, s);
        const [hip, knee, ankle] = [j.hip, j.knee, j.ankle].map((p) => add(p, d));
        const L = legDepth(s, 'cloth');
        stampPiece(g, L, s === 'N' ? NIGHT_THIGH_N : NIGHT_THIGH_F, hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, s === 'N' ? NIGHT_SHIN_N : NIGHT_SHIN_F, knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'feet_night_boots',
    slot: 'feet',
    name: 'Night Boots',
    desc: 'Black boots with a band of silver and gold at the top and a gold-buckled strap over the foot.',
    colors: [col('main', 'Leather', NIGHT_BOOTS, 'leather'), col('gold', 'Gold', NIGHT_BOOT_GOLD, 'metal'), col('silver', 'Silver', NIGHT_BOOT_SILVER, 'metal')],
    draw: (g, [main, gold, silver]) => {
      // His boots: on each leg the shaft turns with the shin about the ankle and the foot stays flat on
      // the ground like our feet, our bare foot under it taken away.
      const tint = nightColor(g, NIGHT_KIT_KIND, [NIGHT_BOOTS, main], { gold: [NIGHT_BOOT_GOLD, gold], silver: [NIGHT_BOOT_SILVER, silver] });
      for (const s of SIDES) {
        const d = legShift(g, s);
        const j = legJoints(g.rig, s);
        const [knee, ankle] = [j.knee, j.ankle].map((p) => add(p, d));
        footOff(g, s);
        const shin = s === 'N' ? NIGHT_BOOT_SHIN_N : NIGHT_BOOT_SHIN_F;
        const foot = s === 'N' ? NIGHT_BOOT_FOOT_N : NIGHT_BOOT_FOOT_F;
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, tint);
      }
    },
  },
];
