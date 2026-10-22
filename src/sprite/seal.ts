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

/** The head's layers: what opens between the hair, the face and a collar is the head's own (his white gaps there). */
const HEAD: Depth[] = ['hairBack', 'head.body', 'head.face', 'head.mask', 'hairFront', 'head.gear', 'neck'];
/** The held item's layers and a blade stowed on the back: the blade crosses gaps he left open (between the legs, beside a boot). */
const HELD: Depth[] = ['farArm.held', 'nearArm.held', 'backGear'];
/** The largest pocket (pixels) walled in by the figure that counts as a dead pixel. */
const POCKET = 4;
/** How many times closing a cell may let the next one along a crack close. */
const ROUNDS = 6;
/** How much lighter (luma, 0..255) than the piece round it what shows through a crack in it must be to be closed. */
const THROUGH = 70;

/**
 * Closes the dead pixels a piece leaves against the rest of the figure, once every item is drawn (an
 * item's `finish`): an empty pixel beside these layers' pixels that is a 1 px crack between them and the
 * figure (the figure on both sides of it, across or down) or a pocket of a few pixels the figure walls
 * in. Pieces that ride different joints (a cape hanging from the shoulder and a leg stepping beside it,
 * a boot's turned shaft and its flat foot) part by a pixel in some frames, and the background shows
 * there as a white dot or line (the owner, 2026-10-22, on Trunks' cape and boots). The cell takes the
 * darkest of these layers' pixels beside it, in that pixel's own layer (his black line, where his piece
 * has its edge), so the piece reaches what is beside it. So does something behind these layers showing
 * through a 1 px crack in them, much lighter than they are. Left as drawn: a notch of one piece's outline
 * (three sides, all its line), a gap beside the head (his white between the hair, the face and the hood)
 * or beside what is held (a blade crosses gaps he left open; a book), and anything wider.
 */
export function sealAgainstFigure(g: DrawCtx, depths: Depth[]): void {
  const own = new Set(depths);
  const all = DEPTHS.map((d) => [d, g.L(d)] as [Depth, Layer]).filter(([, L]) => L.used);
  if (!all.some(([d]) => own.has(d))) return;
  const head = new Set(HEAD);
  const held = new Set(HELD);
  // the front-most layer at each pixel (-1: none)
  const top = new Int16Array(N).fill(-1);
  all.forEach(([, L], k) => {
    for (let i = 0; i < N; i++) if (L.mat[i] >= 0) top[i] = k;
  });
  /** Max + min of the RGB channels of a material's shade (102 or less reads as line, as holes.ts has it). */
  const lum = (m: number, s: number) => {
    const n = parseInt(g.mats.ramps[m][s].slice(1), 16);
    const r = (n >> 16) & 255;
    const gg = (n >> 8) & 255;
    const b = n & 255;
    return Math.max(r, gg, b) + Math.min(r, gg, b);
  };
  const at = (i: number) => all[top[i]][1];
  /** The held item, a blade stowed on the back or a book in the hand. */
  const isHeld = (i: number) => held.has(all[top[i]][0]) || PARTS[at(i).part[i]] === 'held';
  /** Whether the front-most pixel at i reads as line (his black, or our outline-to-be on a drawn edge). */
  const line = (i: number) => {
    const L = at(i);
    if (lum(L.mat[i], L.shade[i]) <= 102) return true;
    if (!L.outline || L.flags[i] & F_NO_OUTLINE) return false;
    return sides(i).some((j) => L.mat[j] < 0);
  };
  for (let round = 0; round < ROUNDS; round++) {
    // the air: the empty pixels reached from the frame's edge; the other empty pixels are pockets
    const air = new Uint8Array(N);
    const stack: number[] = [];
    const reach = (i: number) => {
      if (top[i] >= 0 || air[i]) return;
      air[i] = 1;
      stack.push(i);
    };
    for (let k = 0; k < GRID; k++) [k, N - GRID + k, k * GRID, k * GRID + GRID - 1].forEach(reach);
    while (stack.length) sides(stack.pop()!).forEach(reach);
    const pocket = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (top[s] >= 0 || air[s] || pocket[s]) continue;
      const comp = [s];
      pocket[s] = -1;
      for (let k = 0; k < comp.length; k++)
        for (const j of sides(comp[k]))
          if (top[j] < 0 && !pocket[j]) {
            pocket[j] = -1;
            comp.push(j);
          }
      for (const i of comp) pocket[i] = comp.length;
    }
    const fills: [number, number][] = [];
    for (let i = GRID; i < N - GRID; i++) {
      const x = i % GRID;
      if (x < 1 || x > GRID - 2) continue;
      if (top[i] >= 0) {
        // Something behind these layers showing through a 1 px crack in them (across or down), much lighter.
        const o = (j: number) => top[j] > top[i] && own.has(all[top[j]][0]);
        const across = o(i - 1) && (o(i + 1) || (x < GRID - 2 && o(i + 2)));
        const down = o(i - GRID) && (o(i + GRID) || (i < N - 2 * GRID && o(i + 2 * GRID)));
        if (isHeld(i) || head.has(all[top[i]][0]) || !(across || down)) continue;
        const mine = sides(i).filter(o);
        const light = (j: number) => {
          const n = parseInt(g.mats.ramps[at(j).mat[j]][at(j).shade[j]].slice(1), 16);
          return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
        };
        if (light(i) - mine.reduce((s, j) => s + light(j), 0) / mine.length <= THROUGH) continue;
        fills.push([i, mine.reduce((b, j) => (lum(at(j).mat[j], at(j).shade[j]) < lum(at(b).mat[b], at(b).shade[b]) ? j : b))]);
        continue;
      }
      const nb = sides(i).filter((j) => top[j] >= 0);
      const mine = nb.filter((j) => own.has(all[top[j]][0]));
      if (!mine.length || nb.some((j) => head.has(all[top[j]][0]) || isHeld(j))) continue;
      const crack = (top[i - 1] >= 0 && top[i + 1] >= 0) || (top[i - GRID] >= 0 && top[i + GRID] >= 0);
      if (!crack && !(pocket[i] > 0 && pocket[i] <= POCKET)) continue;
      // a notch of one piece's outline is his drawing (between two pieces it is where they part)
      if (air[i] && nb.length === 3 && nb.every(line) && nb.every((j) => top[j] === top[nb[0]])) continue;
      // the darkest of these layers' pixels beside it
      const dark = (j: number) => lum(at(j).mat[j], at(j).shade[j]);
      fills.push([i, mine.reduce((b, j) => (dark(j) < dark(b) ? j : b))]);
    }
    if (!fills.length) break;
    for (const [i, j] of fills) {
      const L = at(j);
      L.set(i % GRID, (i / GRID) | 0, L.mat[j], L.shade[j], PARTS[L.part[j]], L.flags[j]);
    }
    for (const [i, j] of fills) top[i] = top[j];
  }
}

/** The 4 neighbours of a pixel inside the frame. */
function sides(i: number): number[] {
  const x = i % GRID;
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < GRID - 1) out.push(i + 1);
  if (i >= GRID) out.push(i - GRID);
  if (i < N - GRID) out.push(i + GRID);
  return out;
}
