// Saya's pleated skirt (skirt_shade_pleats) and her belts with the pouch and the scabbard
// (waist_shade_belts), the owner's pixels 1:1 from his Saya drawn at our scale (2026-10-21: his heroines
// set the standard for women; tools/refs/saya-lower-from-ref.py and the pieces it writes,
// sayaLowerArt.ts). Her scabbard comes from her big picture at our scale: the one in his small picture
// belongs to the weapons he called bugged.

import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { segAngle, stampPiece } from '../painted';
import { GRID, partIndex, RES } from '../raster';
import { GROUND } from '../rig';
import { SHADE_BASE, SHADE_BELTS, SHADE_KIND, SHADE_SCABBARD, SHADE_SKIRT } from './sayaLowerArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/** Her colours recoloured: each shade as far from the slot's colour as hers was from her base; her black line stays. */
const tinter = (slots: Partial<Record<keyof typeof SHADE_BASE, string>>) => (_ch: string, hex: string): string => {
  const k = SHADE_KIND[hex];
  const to = k && slots[k];
  return to ? retintHex(hex, SHADE_BASE[k], to) : hex;
};

/** The torso's angle (pelvis to neck): the skirt, the belts and the scabbard turn with it. */
const torsoAngle = (g: DrawCtx): number => segAngle(g.rig.pelvis, g.rig.neck);

/** The undershorts' colour (body.ts): under her short skirt the thighs are bare. */
const SHORTS = '#3b3a46';

/** Takes the undershorts' legs off the thighs (the seat stays under the skirt); trousers drawn over them stay. */
function shortsLegsOff(g: DrawCtx): void {
  const m = g.m(SHORTS, 'cloth');
  const thighs = new Set([partIndex('thighN'), partIndex('thighF')]);
  for (const d of ['nearLeg.cloth', 'farLeg.cloth'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] === m && thighs.has(L.part[i])) L.mat[i] = -1;
  }
}

/** Her scabbard's tip from the pelvis cell at her angle, fine pixels (the piece's last cloth row). */
const TIP = (() => {
  const p = SHADE_SCABBARD;
  const j = p.rows.length - 2;
  const i = p.rows[j].search(/[^.]/);
  return { x: i - p.pivot[0], y: j - p.pivot[1] };
})();

/**
 * The scabbard's angle: down and back from the near hip at her angle, turned with the torso. Sitting
 * or crouched it swings back toward level so its tip stays above the ground; knocked out (drawn upright,
 * then laid face down: compose.ts transposes the frame) it hangs straight down behind the legs, so it
 * lies along them instead of standing up off her back.
 */
function scabbardAngle(g: DrawCtx): number {
  const r = g.rig;
  const base = torsoAngle(g);
  if (r.lay) return base - 45;
  // Leaning on a tree the near leg is raised, the foot against the trunk: the scabbard hangs behind
  // the standing far leg instead (drawn behind the body), its tip toward the far ankle, not below the
  // raised leg with its tip under the shoe.
  if (r.pose === 'lean') {
    const tip = (Math.atan2(TIP.y, TIP.x) * 180) / Math.PI;
    return SHADE_SCABBARD.angle + segAngle(r.pelvis, r.ankleF) - tip;
  }
  const floor = GROUND * RES - 1 - Math.floor(r.pelvis.y * RES);
  for (let turn = 0; turn <= 80; turn += 5) {
    const a = ((base - SHADE_SCABBARD.angle + turn) * Math.PI) / 180;
    if (TIP.x * Math.sin(a) + TIP.y * Math.cos(a) <= floor) return base + turn;
  }
  return base + 80;
}

export const SHADE_PLEATS: ItemDef = {
  id: 'skirt_shade_pleats',
  slot: 'skirt',
  name: 'Shade Pleated Skirt',
  desc: 'A short navy skirt in pleats striped in red, with a red hem. Women only.',
  colors: [col('cloth', 'Cloth', SHADE_BASE.cloth), col('stripe', 'Stripe', SHADE_BASE.stripe)],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, stripe]) => {
    // The owner's Saya (2026-10-21), his pixels: it hangs from the pelvis and turns with the torso, as
    // our skirts do. Her navy follows Cloth, her reds Stripe; her black line stays.
    shortsLegsOff(g);
    stampPiece(g, 'skirt', SHADE_SKIRT, g.rig.pelvis, torsoAngle(g), 'pelvis', tinter({ cloth, stripe }));
  },
};

export const SHADE_BELTS_ITEM: ItemDef = {
  id: 'waist_shade_belts',
  slot: 'waist',
  name: 'Shade Belts and Scabbard',
  desc: 'Two brown leather belts slung across the hips with steel buckles, a pouch on the hip, and a black scabbard with gold fittings hanging behind the leg. Women only.',
  colors: [
    col('leather', 'Leather', SHADE_BASE.leather, 'leather'),
    col('steel', 'Steel', SHADE_BASE.steel, 'metal'),
    col('scabbard', 'Scabbard', SHADE_BASE.scabbard, 'leather'),
    col('gold', 'Gold', SHADE_BASE.gold, 'metal'),
  ],
  bodies: ['female', 'slender'],
  draw: (g, [leather, steel, scabbard, gold]) => {
    // The owner's Saya (2026-10-21), his pixels for the belts and the pouch, riding the pelvis; her
    // scabbard from her big picture, behind the near leg (in front of the far one). Her browns follow
    // Leather, her steels Steel, the scabbard's black-navy Scabbard and its fittings Gold.
    const tint = tinter({ leather, steel, scabbard, gold });
    stampPiece(g, g.rig.pose === 'lean' ? 'backGear' : 'farLeg.armor', SHADE_SCABBARD, g.rig.pelvis, scabbardAngle(g), 'pelvis', tint);
    stampPiece(g, 'waist', SHADE_BELTS, g.rig.pelvis, torsoAngle(g), 'pelvis', tint);
  },
};
