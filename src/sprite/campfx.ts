// Props the camp poses hold: the book for 'read', drawn after the body
// and items (compose.ts).

import { retintSkinLifted } from './color';
import type { DrawCtx } from './ctx';
import { LYRA_READ } from './items/lyraReadArt';
import { READ_BOOK, READ_HAND_F, READ_HAND_N, READ_LINE, READ_SKIN_BASE, type ReadPiece } from './maleReadArt';
import { takesMaleSkin } from './maleSkin';
import { readKey, stampOwnerPiece } from './ownerFrames';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, partIndex } from './raster';
import { READ_MALE_KEYS } from './rig';

/** Draws what the camp pose holds, if anything: the male bodies read as his Trunks does, the others as his Lyra. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose !== 'read') return;
  if (takesMaleSkin(g.rig.body)) hisBook(g);
  else book(g);
}

/**
 * The male read (rig.ts READ_MALE): the owner's book and hands from his Trunks read frames (maleReadArt.ts),
 * where he drew them, the frame's key his frame (READ_KEYS). Our hands are taken off and his are drawn over
 * his book, his hand's shape in the Roman's skin: his Roman fists' tones, recoloured to the character's skin
 * as his Roman skin is (retintSkinLifted); his black line is never tinted.
 */
function hisBook(g: DrawCtx): void {
  const k = READ_MALE_KEYS[((g.rig.frame % READ_MALE_KEYS.length) + READ_MALE_KEYS.length) % READ_MALE_KEYS.length];
  const L = g.L('nearArm.over');
  stampRead(g, L, READ_BOOK[k], 'held', (hex) => hex);
  const skin = (hex: string) => (isLine(hex) ? hex : retintSkinLifted(hex, READ_SKIN_BASE, g.look.skin));
  for (const [piece, part] of [
    [READ_HAND_N[k], 'handN'],
    [READ_HAND_F[k], 'handF'],
  ] as const) {
    if (!piece) continue;
    clearHand(g, part);
    stampRead(g, L, piece, part, skin);
  }
}

/** A colour of his black line (every channel below READ_LINE). */
const isLine = (hex: string): boolean => [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) < READ_LINE);

/** One of his read pieces where he drew it: his pixels, carrying their own line (no outline, no texture). */
function stampRead(g: DrawCtx, L: Layer, p: ReadPiece, part: PartId, color: (hex: string) => string): void {
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(hex), 'flat');
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(p.at[0] + i, p.at[1] + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/** Takes our hand off (its skin and any glove on it), where his hand is drawn instead. */
function clearHand(g: DrawCtx, part: 'handN' | 'handF'): void {
  const id = partIndex(part);
  for (const d of ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === id) L.mat[i] = -1;
  }
}

/**
 * The owner's book (docs/reference/lyra-read-owner-reference.jpg, his three read frames: open and held
 * up before the chest, the far page lifted in the third), his pixels on the near wrist as his Lyra holds
 * it (items/lyraReadArt.ts; where her hands hid it, it is his book continued). Both hands are then moved
 * on top of it, so the fingers lie over the cover as he drew hers.
 */
function book(g: DrawCtx): void {
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
