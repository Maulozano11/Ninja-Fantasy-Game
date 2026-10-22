// Closes the one- and two-pixel cracks that open in hanging cloth (capes, skirts, coat tails) where
// separately drawn pieces part: the seam between two panels, a polygon's edge biting into itself, the
// gap between two painted pieces placed on different joints. Through such a crack the background (or
// the skin under the cloth) showed as a light dead pixel (the owner: "checa tambien las otras faldas
// y capas").

import { DEPTHS, type Depth, type DrawCtx } from './ctx';
import { F_NO_OUTLINE, GRID, type Layer, PARTS } from './raster';

const N = GRID * GRID;
/** The most pixels a loose crumb of cloth has. */
const CRUMB = 3;
/** The bare body's layers (body.ts). */
const BODY: Depth[] = ['farArm.body', 'farLeg.body', 'nearLeg.body', 'torso.body', 'torso.under', 'nearArm.body', 'head.body'];

/**
 * Fills every open cell of the cloth drawn so far in these layers (taken together) that has cloth
 * across it and down it, or along one of them with three of its four diagonals: the test
 * clothPixels.test.ts uses for a hole. A cell takes the line colour of the darkest cloth beside it (in
 * that pixel's own layer), so a crack between two panels reads as a 1 px dark seam between them (the
 * cell beside one already closed takes that cloth's own colour, so the seam stays 1 px) and a bite in
 * the silhouette is outlined like the rest of it. Never over the head, where a collar is tucked under
 * the chin on purpose. With `bodyGaps` (the owner's painted capes and skirt), never where the bare body
 * shows between his painted pixels only either: at rest his cloth shows our body in its gaps where his
 * picture shows his figure, and his pixels at rest stay as he drew them.
 */
export function sealCloth(g: DrawCtx, depths: Depth[], bodyGaps = false): void {
  const Ls = depths.map((d) => g.L(d)).filter((L) => L.used);
  if (!Ls.length) return;
  const head = g.L('head.body');
  // where the bare body is the front-most thing drawn so far
  const bare = new Uint8Array(N);
  if (bodyGaps) {
    const own = new Set(depths);
    for (const d of DEPTHS) {
      if (own.has(d)) continue;
      const L = g.L(d);
      if (!L.used) continue;
      const b = BODY.includes(d) ? 1 : 0;
      for (let i = 0; i < N; i++) if (L.mat[i] >= 0) bare[i] = b;
    }
  }
  const luma = (m: number, s: number) => {
    const n = parseInt(g.mats.ramps[m][s].slice(1), 16);
    return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
  };
  // the front-most of the layers at each cell (-1: none)
  const at = new Int8Array(N).fill(-1);
  Ls.forEach((L, k) => {
    for (let i = 0; i < N; i++) if (L.mat[i] >= 0) at[i] = k;
  });
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && at[y * GRID + x] >= 0;
  /** Whether the open cell i is a crack to close. */
  const crack = (i: number) => {
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (at[i] >= 0 || head.mat[i] >= 0) return false;
    if (bare[i] && [i - GRID, i - 1, i + 1, i + GRID].every((j) => j < 0 || j >= N || at[j] < 0 || Ls[at[j]].flags[j] & F_NO_OUTLINE)) return false;
    const across = on(x - 1, y) && (on(x + 1, y) || on(x + 2, y));
    const down = on(x, y - 1) && (on(x, y + 1) || on(x, y + 2));
    if (!across && !down) return false;
    if (!(across && down) && [on(x - 1, y - 1), on(x + 1, y - 1), on(x - 1, y + 1), on(x + 1, y + 1)].filter(Boolean).length < 3) return false;
    return true;
  };
  // Closing a cell can make the next one along a crack closable: repeat around the cells just closed
  // until none is left (a long crack is closed down its whole length).
  let todo: number[] = [];
  for (let i = 0; i < N; i++) if (at[i] < 0) todo.push(i);
  /** The cells closed with the line colour. */
  const seam = new Uint8Array(N);
  while (todo.length) {
    const fills = todo.filter(crack);
    if (!fills.length) break;
    const src = fills.map((i) => {
      let best = -1;
      let bestL = Infinity;
      // the darkest cloth beside it, a seam cell only if there is nothing else
      for (const j of [i - GRID, i - 1, i + 1, i + GRID]) {
        if (j < 0 || j >= N || at[j] < 0) continue;
        const L = Ls[at[j]];
        const l = luma(L.mat[j], L.shade[j]) + (seam[j] ? 1000 : 0);
        if (l < bestL) {
          bestL = l;
          best = j;
        }
      }
      return best;
    });
    const next = new Set<number>();
    fills.forEach((i, k) => {
      const j = src[k];
      const L = Ls[at[j]];
      const line = ![i - GRID, i - 1, i + 1, i + GRID].some((q) => q >= 0 && q < N && seam[q]);
      L.set(i % GRID, (i / GRID) | 0, L.mat[j], line ? 0 : L.shade[j], PARTS[L.part[j]], L.flags[j]);
      seam[i] = line ? 1 : 0;
      at[i] = at[j];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const q = i + dy * GRID + dx;
        if (q >= 0 && q < N && at[q] < 0) next.add(q);
      }
    });
    todo = [...next];
  }
  // Crumbs: a few pixels of cloth left on their own (a collar's tip past the chin it was tucked under,
  // the point of a hem cut off from it) are taken away.
  const seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (seen[s] || at[s] < 0) continue;
    const comp = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const x = comp[k] % GRID;
      const y = (comp[k] / GRID) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!on(x + dx, y + dy)) continue;
          const j = (y + dy) * GRID + x + dx;
          if (seen[j]) continue;
          seen[j] = 1;
          comp.push(j);
        }
    }
    if (comp.length > CRUMB) continue;
    for (const i of comp) for (const L of Ls) L.clear(i % GRID, (i / GRID) | 0);
  }
}
