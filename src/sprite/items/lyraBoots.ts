// Lyra's thigh-high boots (the owner's picture of her at our game's scale, 2026-10-21): his pixels, cut
// by tools/refs/lyra-boots-from-ref.py (lyraBootsArt.ts), riding the rig on a leg of his proportions.

import { retintHex } from '../color';
import { DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_EDGE, GRID, len, partIndex, RES, scale, sub, v, Vec } from '../raster';
import {
  LYRA_BOOT_BUCKLE,
  LYRA_BOOT_FOOT_F,
  LYRA_BOOT_FOOT_N,
  LYRA_BOOT_GOLD,
  LYRA_BOOT_KIND,
  LYRA_BOOT_LEATHER,
  LYRA_BOOT_LEGS,
  LYRA_BOOT_SHIN_F,
  LYRA_BOOT_SHIN_N,
  LYRA_BOOT_SKIN,
  LYRA_BOOT_THIGH_F,
  LYRA_BOOT_THIGH_N,
} from './lyraBootsArt';

const at = (p: readonly [number, number]): Vec => v(p[0] / RES, p[1] / RES);
const angleOf = (a: Vec): number => Math.atan2(a.y, a.x);

/**
 * His leg against ours at our female idle frame 0: his thigh (our hip to his knee) and shin lengths,
 * where his ankle stands from ours, and which way his knee bends.
 */
function hisLeg(s: Side) {
  const L = LYRA_BOOT_LEGS[s];
  const hip = at(L.hip);
  const knee = at(L.hisKnee);
  const ankle = at(L.hisAnkle);
  const his = sub(ankle, hip);
  const thigh = sub(knee, hip);
  return {
    thigh: len(thigh),
    shin: len(sub(ankle, knee)),
    off: sub(ankle, at(L.ankle)),
    bend: Math.sign(his.x * thigh.y - his.y * thigh.x),
  };
}
const HIS_LEG = { N: hisLeg('N'), F: hisLeg('F') };

/**
 * Where his knee and ankle are now: his ankle stands off ours as at idle (on the screen, as the feet
 * stay flat), so his sole keeps to our foot's and stands on the ground wherever ours does, and his knee
 * bends forward between it and our hip with his thigh's and shin's lengths (a leg his lengths cannot
 * reach out to is drawn straight, the ankle short of it). At idle frame 0 they are his knee and ankle.
 */
function legNow(hip: Vec, ankle: Vec, s: Side): { knee: Vec; ankle: Vec } {
  const H = HIS_LEG[s];
  const want = add(sub(ankle, hip), H.off);
  const d = Math.max(Math.abs(H.thigh - H.shin) + 1e-6, Math.min(H.thigh + H.shin - 1e-9, len(want)));
  const u = angleOf(want);
  const a = Math.acos(Math.max(-1, Math.min(1, (H.thigh * H.thigh + d * d - H.shin * H.shin) / (2 * H.thigh * d))));
  const k = u + H.bend * a;
  return { knee: add(hip, v(Math.cos(k) * H.thigh, Math.sin(k) * H.thigh)), ankle: add(hip, v(Math.cos(u) * d, Math.sin(u) * d)) };
}

/**
 * Where a piece stamped about `p` along `deg` starts: the top edge of its first row and the piece's own
 * down, turned as stampPiece turns it (to the whole degree, as RotSprite does).
 */
function pieceTop(piece: PaintedPiece, p: Vec, deg: number): { at: Vec; down: Vec } {
  const r = (Math.round(deg - piece.angle) * Math.PI) / 180;
  const down = v(-Math.sin(r), Math.cos(r));
  const pivot = v((Math.floor(p.x * RES) + 0.5) / RES, (Math.floor(p.y * RES) + 0.5) / RES);
  return { at: add(pivot, scale(down, -(piece.pivot[1] + 0.5) / RES)), down };
}

/** How far down our own thigh (of its length from the hip) it may stay under the boots. */
const THIGH_KEPT = 0.7;

/**
 * Takes our leg (skin and trousers) off below the boot's top: the thigh below the line through
 * `cut.at` across `cut.down` or past THIGH_KEPT of the way from `hip` to `knee` (where our thigh goes
 * another way than his, as in a crouch), the shin and the foot whole. The leg is not outlined along
 * the cut, where his thigh goes on.
 */
function legOffBelow(g: DrawCtx, s: Side, cut: { at: Vec; down: Vec }, hip: Vec, knee: Vec): void {
  const axis = sub(knee, hip);
  const reach = THIGH_KEPT * len(axis) * len(axis);
  const thigh = partIndex(`thigh${s}`);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      const p = L.part[i];
      if (L.mat[i] < 0 || (p !== thigh && p !== shin && p !== foot)) continue;
      if (p === thigh) {
        const dx = ((i % GRID) + 0.5) / RES - cut.at.x;
        const dy = (Math.floor(i / GRID) + 0.5) / RES - cut.at.y;
        const ax = ((i % GRID) + 0.5) / RES - hip.x;
        const ay = (Math.floor(i / GRID) + 0.5) / RES - hip.y;
        if (dx * cut.down.x + dy * cut.down.y <= 0 && ax * axis.x + ay * axis.y <= reach) continue;
      }
      L.mat[i] = -1;
      L.flags[i] |= F_NO_EDGE;
    }
  }
}

export const LYRA_BOOTS: ItemDef = {
  id: 'feet_gilded_thigh_boots',
  slot: 'feet',
  name: 'Gilded Thigh Boots',
  desc: 'Thigh-high dark leather boots with gold cuffs, small round knee guards and studded ankle straps, the thigh bare above them.',
  colors: [
    { key: 'leather', label: 'Leather', default: LYRA_BOOT_LEATHER, kind: 'leather' },
    { key: 'gold', label: 'Gold', default: LYRA_BOOT_GOLD, kind: 'metal' },
    { key: 'buckle', label: 'Buckle', default: LYRA_BOOT_BUCKLE, kind: 'metal' },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [leather, gold, buckle]) => {
    // His boots and the bare thigh above them, on a leg of his: from our hip his thigh to his knee and
    // his shin to his ankle, the ankle standing off ours as at idle and the knee bending forward (legNow). The
    // thigh piece turns with that thigh about the knee, the shin piece (shaft and ankle strap) with
    // that shin about the ankle, and the foot stays flat under the ankle like our feet. Our leg is
    // taken off below the thigh piece's top, so his boot is the leg. His leather, gold and studs follow
    // the colour slots, her skin the body's; his black line stays.
    const tint = (ch: string, hex: string) => {
      const k = LYRA_BOOT_KIND[ch];
      if (k === 'leather') return retintHex(hex, LYRA_BOOT_LEATHER, leather);
      if (k === 'gold') return retintHex(hex, LYRA_BOOT_GOLD, gold);
      if (k === 'buckle') return retintHex(hex, LYRA_BOOT_BUCKLE, buckle);
      if (k === 'skin') return retintHex(hex, LYRA_BOOT_SKIN, g.look.skin);
      return hex;
    };
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const now = legNow(hip, ankle, s);
      const thighA = segAngle(hip, now.knee);
      const shinA = segAngle(now.knee, now.ankle);
      const [thigh, shin, foot] = s === 'N' ? [LYRA_BOOT_THIGH_N, LYRA_BOOT_SHIN_N, LYRA_BOOT_FOOT_N] : [LYRA_BOOT_THIGH_F, LYRA_BOOT_SHIN_F, LYRA_BOOT_FOOT_F];
      legOffBelow(g, s, pieceTop(thigh, now.knee, thighA), hip, knee);
      const d = legDepth(s, 'feet');
      stampPiece(g, d, foot, now.ankle, foot.angle, `foot${s}`, tint);
      stampPiece(g, d, shin, now.ankle, shinA, `shin${s}`, tint);
      stampPiece(g, d, thigh, now.knee, thighA, `thigh${s}`, tint);
    }
  },
};
