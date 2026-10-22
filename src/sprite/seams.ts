// Fills the seams painted pieces open as they move apart (the owner, 2026-10-22: "aqui tiene unos aun en la
// hebilla o medallon de la capa", then "1 arreglar igual capa 2 solen rellenar").
//
// His pieces ride different joints: Solen's cowl round the neck rides the torso while its near end and white
// stud ride the shoulders; the Shadow Half-Cloak's mantle hangs from the neck while its shoulder piece rides
// the near shoulder, its plate the far one, and the hair the head. As one moves from the other (a wider body,
// a swung arm, a bowed head) the seam between them opens and the background shows through beside the studs.
//
// A piece says what fills its seams while it draws (addSeam): cloth riding with it (Solen's cowl: what the
// owner drew beside it), or its own cloth continued (clothSeam). Once the whole figure is drawn, fillSeams
// puts a pixel of that cloth behind everything, only where nothing is drawn at all and the figure stands
// round it to its left and right and above and below. So it shows only where the background would show
// between the pieces; it never covers what is drawn, nor grows the figure's outline. Pure: layers only.

import { DEPTHS, type Depth, type DrawCtx } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer } from './raster';

const N = GRID * GRID;

interface Seam {
  /** The cloth that fills it: a layer drawn with the piece, or one made once the figure is drawn. */
  cloth: Layer | (() => Layer);
  /** How far (px) the figure may stand from an open seam on each side, along its row and its column. */
  walls: number;
  /** When it is filled: in the poses that move, at rest (idle, the frame his pictures were copied into), or both. */
  at: 'moving' | 'idle' | 'always';
  /** Filled again with what went in, until nothing more goes in (a seam wider than its walls fills from them in). */
  again: boolean;
}

/** The seams the pieces of a frame asked to fill, in the order they drew. */
const SEAMS = new WeakMap<DrawCtx, Seam[]>();

/** Asks for a seam to be filled once this frame's figure is drawn (see fillSeams). */
export function addSeam(g: DrawCtx, cloth: Layer | (() => Layer), o: { walls?: number; at?: Seam['at']; again?: boolean } = {}): void {
  const seam: Seam = { cloth, walls: o.walls ?? 7, at: o.at ?? 'moving', again: o.again ?? false };
  const list = SEAMS.get(g);
  if (list) list.push(seam);
  else SEAMS.set(g, [seam]);
}

/**
 * A piece's own cloth continued round its studs: once the figure is drawn, every pixel within `round` of a stud
 * (pixels of the `studs` materials in those layers) and within `reach` of its cloth (the `cloth` materials, the
 * top one where layers overlap) takes the nearest of that cloth, so a seam open beside a stud shows the cloth
 * going on (never its line nor its gold). Nowhere else: what opens elsewhere is left as drawn.
 */
export function clothSeam(g: DrawCtx, o: { depths: readonly Depth[]; cloth: ReadonlySet<number>; studs: ReadonlySet<number>; reach: number; round: number }): () => Layer {
  return () => {
    const out = new Layer(false);
    const from = new Int32Array(N).fill(-1);
    const dist = new Uint8Array(N);
    const src = new Layer(false);
    const zone = new Uint8Array(N);
    for (const d of DEPTHS) {
      if (!o.depths.includes(d)) continue;
      const L = g.L(d);
      for (let i = 0; i < N; i++) {
        if (L.mat[i] < 0) continue;
        // (Studs recoloured to the cloth's own colour do not show: nothing is filled round them.)
        if (o.studs.has(L.mat[i]) && !o.cloth.has(L.mat[i])) {
          const x = i % GRID;
          const y = (i / GRID) | 0;
          for (let yy = Math.max(0, y - o.round); yy <= Math.min(GRID - 1, y + o.round); yy++)
            for (let xx = Math.max(0, x - o.round); xx <= Math.min(GRID - 1, x + o.round); xx++) zone[yy * GRID + xx] = 1;
        }
        if (!o.cloth.has(L.mat[i])) continue;
        src.mat[i] = L.mat[i];
        src.shade[i] = L.shade[i];
        src.part[i] = L.part[i];
      }
    }
    // Breadth first from every pixel of the cloth (in reading order), one ring of 8 neighbours at a time.
    let ring: number[] = [];
    for (let i = 0; i < N; i++) {
      if (src.mat[i] < 0) continue;
      from[i] = i;
      ring.push(i);
    }
    for (let k = 1; k <= o.reach && ring.length; k++) {
      const next: number[] = [];
      for (const i of ring) {
        const x = i % GRID;
        const y = (i / GRID) | 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
            const j = yy * GRID + xx;
            if (from[j] >= 0) continue;
            from[j] = from[i];
            dist[j] = k;
            next.push(j);
          }
      }
      ring = next;
    }
    for (let i = 0; i < N; i++) {
      const s = from[i];
      if (s < 0 || dist[i] === 0 || !zone[i]) continue;
      out.mat[i] = src.mat[s];
      out.shade[i] = src.shade[s];
      out.part[i] = src.part[s];
      out.flags[i] = F_NO_OUTLINE | F_NO_TEXTURE;
      out.used = true;
    }
    return out;
  };
}

/**
 * Fills the seams this frame's pieces asked for (addSeam) once the whole figure is drawn: a pixel of a seam's
 * cloth goes in (behind everything) where nothing is drawn at all and the figure stands round it, to its left
 * and right and above and below, within the seam's `walls` (and, if it asks, again with what went in). Each seam
 * only in the poses it asks for (`at`): at rest (`idle`) the frame is as he drew it but where he left a seam open.
 */
export function fillSeams(g: DrawCtx, layers: ReadonlyMap<Depth, Layer>, idle: boolean): void {
  const seams = (SEAMS.get(g) ?? []).filter((s) => s.at === 'always' || s.at === (idle ? 'idle' : 'moving'));
  if (!seams.length) return;
  const back = g.L('capeBack');
  const all = [...layers.values()];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && all.some((L) => L.used && L.mat[y * GRID + x] >= 0);
  for (const s of seams) {
    const seam = typeof s.cloth === 'function' ? s.cloth() : s.cloth;
    if (!seam.used) continue;
    const walled = (x: number, y: number, dx: number, dy: number) => {
      for (let k = 1; k <= s.walls; k++) if (on(x + dx * k, y + dy * k)) return true;
      return false;
    };
    for (;;) {
      const fill: number[] = [];
      for (let i = 0; i < N; i++) {
        if (seam.mat[i] < 0) continue;
        const x = i % GRID;
        const y = (i / GRID) | 0;
        if (on(x, y) || !walled(x, y, -1, 0) || !walled(x, y, 1, 0) || !walled(x, y, 0, -1) || !walled(x, y, 0, 1)) continue;
        fill.push(i);
      }
      for (const i of fill) {
        back.mat[i] = seam.mat[i];
        back.shade[i] = seam.shade[i];
        back.part[i] = seam.part[i];
        back.flags[i] = seam.flags[i];
        back.used = true;
      }
      if (!fill.length || !s.again) break;
    }
  }
}
