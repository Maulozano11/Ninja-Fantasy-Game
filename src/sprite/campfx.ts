// Props the camp poses hold: the book for 'read', drawn after the body
// and items (compose.ts).

import { retintSkinLifted } from './color';
import { DEPTHS, type DrawCtx } from './ctx';
import { LYRA_READ } from './items/lyraReadArt';
import { READ_BOOK, READ_HAND_F, READ_HAND_N, READ_LINE, READ_SKIN_BASE, type ReadPiece } from './maleReadArt';
import { takesMaleSkin } from './maleSkin';
import { readKey, stampOwnerPiece, wearsHisFigure } from './ownerFrames';
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
  // (on a body built bigger than his male, moved with its hands: rig.ts BodyParams.readShift)
  const [dx, dy] = g.bp.readShift ?? [0, 0];
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(p.at[0] + dx + i, p.at[1] + dy + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
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
  // (his own figure's frame is his, pixel for pixel; on any other fitted body the book meets her own hands and clothes)
  if (g.bp.fit && !wearsHisFigure(g.look)) {
    liftStrays(g, g.L('nearArm.over'));
    closeBookGaps(g, g.L('nearArm.over'));
  }
}

/**
 * His hands lifted over the book can leave a pixel or two of the forearm's end on the arm's layer, cut
 * off from the arm where the wrist went with the hand: they go over the book with the hand they touch,
 * so each arm stays one piece with its hand.
 */
function liftStrays(g: DrawCtx, dest: Layer): void {
  for (const d of ['nearArm.body', 'farArm.body'] as const) {
    const L = g.L(d);
    const seen = new Uint8Array(GRID * GRID);
    for (let s = 0; s < GRID * GRID; s++) {
      if (L.mat[s] < 0 || seen[s]) continue;
      const reg = [s];
      seen[s] = 1;
      for (let k = 0; k < reg.length; k++) {
        const x = reg[k] % GRID;
        const y = (reg[k] / GRID) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx;
            const Y = y + dy;
            if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
            const j = Y * GRID + X;
            if (L.mat[j] >= 0 && !seen[j]) {
              seen[j] = 1;
              reg.push(j);
            }
          }
        }
      }
      if (reg.length > 3) continue;
      for (const i of reg) {
        dest.mat[i] = L.mat[i];
        dest.shade[i] = L.shade[i];
        dest.part[i] = L.part[i];
        dest.flags[i] = L.flags[i];
        dest.used = true;
        L.mat[i] = -1;
      }
    }
  }
}

/**
 * On a fitted body other than his own figure the book and his hands lie on her own arms and clothes,
 * not his, and where their edges meet a patch of one to three pixels can stay open, shut in by the
 * figure: beside the book, it is closed with his line (the book's black).
 */
function closeBookGaps(g: DrawCtx, B: Layer): void {
  const layers = DEPTHS.map((d) => g.L(d)).filter((L) => L.used);
  const full = (x: number, y: number) => x < 0 || y < 0 || x >= GRID || y >= GRID || layers.some((L) => L.mat[y * GRID + x] >= 0);
  const line = g.m('#000000', 'flat');
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (full(x, y)) continue;
      const patch: [number, number][] = [[x, y]];
      const has = (X: number, Y: number) => patch.some(([a, b]) => a === X && b === Y);
      for (let k = 0; k < patch.length && patch.length <= 3; k++) {
        const [px, py] = patch[k];
        for (const [X, Y] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) if (!full(X, Y) && !has(X, Y)) patch.push([X, Y]);
      }
      if (patch.length > 3) continue;
      // only beside the book or a hand on it
      const near = patch.some(([X, Y]) => [[X - 1, Y], [X + 1, Y], [X, Y - 1], [X, Y + 1]].some(([a, b]) => B.mat[b * GRID + a] >= 0));
      if (!near) continue;
      for (const [X, Y] of patch) B.set(X, Y, line, 0, 'held', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
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
