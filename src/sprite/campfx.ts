// Props the camp poses hold: the open book for 'read', drawn after the body
// and items (compose.ts).

import type { DrawCtx } from './ctx';
import { LYRA_READ } from './items/lyraReadArt';
import { ownsBody, ownerFrame, readKey, stampOwnerPiece } from './ownerFrames';
import { GRID, Layer, partIndex } from './raster';

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose === 'read') book(g);
}

/**
 * The owner's book (docs/reference/lyra-read-owner-reference.jpg, his three read frames: open and held
 * up before the chest, the far page lifted in the third), his pixels on the near wrist as his Lyra holds
 * it (items/lyraReadArt.ts; where her hands hid it, it is his book continued). Both hands are then moved
 * on top of it, so the fingers lie over the cover as he drew hers.
 */
function book(g: DrawCtx): void {
  // His Trunks reading holds his own book (items/trunksReadArt.ts), with his hands where he drew them.
  if (ownsBody(g)) {
    for (const p of ownerFrame(g)!) if (p.owner === 'book') stampOwnerPiece(g, p);
    return;
  }
  for (const p of LYRA_READ[readKey(g.rig.frame)]) if (p.owner === 'book') stampOwnerPiece(g, p);
  liftHands(g, g.L('nearArm.over'));
}

/** Moves both hands (skin and any glove on them) onto `dest`, over what was drawn there. */
function liftHands(g: DrawCtx, dest: Layer): void {
  const hands = [partIndex('handN'), partIndex('handF')];
  for (const d of ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || !hands.includes(L.part[i])) continue;
      dest.mat[i] = L.mat[i];
      dest.shade[i] = L.shade[i];
      dest.part[i] = L.part[i];
      dest.flags[i] = L.flags[i];
      dest.used = true;
      L.mat[i] = -1;
    }
  }
}
