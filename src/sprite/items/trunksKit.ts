// Helpers for the clothes, boots and hair lifted out of the owner's two Trunks paint-overs
// (docs/reference/trunks2-owner-reference.jpg and trunks3-owner-reference.jpg, tools/refs/trunks_ref.py).
// Every piece is pinned to our rig's joint where it lies in his picture: at rest every pixel is his,
// where he drew it; in other poses it turns about our joint as our limb turns.

import { retintHex } from '../color';
import type { Depth, DrawCtx } from '../ctx';
import type { PaintedPiece } from '../painted';
import { GRID, partIndex, RES, type PartId } from '../raster';

/** The skin he painted over (Solen's, which our renders for him wore): in it, his skin pixels are his. */
export const PAINTED_SKIN = '#f3c39c';

/**
 * His pixels recoloured by the colour slots: each of his colours follows its slot (`slotOf`), moved the
 * way the slot's colour (`to`) moved from his (`bases`); his black line ('line') stays. 'skin' follows
 * the character's skin.
 */
export function slotTint(
  g: DrawCtx,
  slotOf: Record<string, string>,
  bases: Record<string, string>,
  to: Record<string, string>,
): (ch: string, hex: string) => string {
  return (_ch, hex) => {
    const s = slotOf[hex];
    if (!s || s === 'line') return hex;
    if (s === 'skin') return retintHex(hex, PAINTED_SKIN, g.look.skin);
    return bases[s] ? retintHex(hex, bases[s], to[s] ?? bases[s]) : hex;
  };
}

/**
 * The colour a slot was saved with, read as his: the creator saved every character with the item's
 * colours, so the old defaults (from before his art) now mean his colour.
 */
export const savedAsHis = (hex: string, old: string, his: string): string => (hex.toLowerCase() === old ? his : hex);

/** Takes these parts of our body away from these layers (his piece takes their place). */
export function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes our torso and undergarment away below the pelvis, and the undergarment's legs: his trousers are
 * all there is from the waist down (our crotch would show under his seat, between his thighs).
 */
export function belowPelvisOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const thighs = new Set([partIndex('thighN'), partIndex('thighF')]);
  for (const d of ['torso.body', 'torso.under'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (d === 'torso.under' || x * r.up.x + y * r.up.y < 0) L.mat[i] = -1;
    }
  }
  for (const d of ['nearLeg.cloth', 'farLeg.cloth'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && thighs.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes our torso away below the neck: his garment is the torso there. Our torso is broader than his at
 * the shoulders, and showed (with its outline) as a strip of skin beside his sleeve when the arm swings.
 */
export function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('torso.body');
  const torso = partIndex('torso');
  const b = g.bp;
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== torso) continue;
    const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
    const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
    const up = x * r.up.x + y * r.up.y;
    const across = x * r.right.x + y * r.right.y;
    // The neck stays, down into the collar's opening (it shows there, as in his pictures).
    const neck = up >= b.torsoLen - 4 && Math.abs(across - 0.6) <= b.neckW + 1;
    if (up < b.torsoLen - 1.5 && !neck) L.mat[i] = -1;
  }
}

/**
 * His piece made broader and longer for a bigger body: single columns doubled, spread over each side of
 * the pivot (`left`, `right` of them), and `down` rows doubled, spread over its height. His pixels stay
 * his, only a few repeated.
 */
export function stretchedPiece(p: PaintedPiece, left: number, right: number, down: number): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const px0 = Math.max(0, Math.min(w - 1, p.pivot[0]));
  const cols = new Set([...spread(1, px0 - 1, left), ...spread(px0 + 1, w - 2, right)]);
  const rows = spread(1, p.rows.length - 2, down);
  const out: string[] = [];
  p.rows.forEach((r, j) => {
    const row = r.padEnd(w, '.').split('').map((ch, i) => (cols.has(i) ? ch + ch : ch)).join('');
    out.push(row);
    if (rows.has(j)) out.push(row);
  });
  let px = p.pivot[0];
  for (const c of cols) if (c < p.pivot[0]) px++;
  let py = p.pivot[1];
  for (const j of rows) if (j < p.pivot[1]) py++;
  return { ...p, rows: out, pivot: [px, py] };
}
