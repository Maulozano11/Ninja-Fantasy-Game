type Stroke = { pts: [number, number][]; w: [number, number] };
type Letter = { strokes: Stroke[]; dots: [number, number][] };

const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

/**
 * Letters of an Arabic-style script, isolated forms (nun, ba, ayn, mim, qaf,
 * hha, waw), as calligraphic pen strokes in an 18 x 18 box: each stroke
 * swells or thins from its start width to its end width.
 */
const SCRIPT: Letter[] = [
  { strokes: [{ pts: arcPts(8, 7, 6, 6.5, 0, 185), w: [1, 2.6] }], dots: [[8, 1.5]] },
  { strokes: [{ pts: [[1, 6.5], ...arcPts(8.5, 6, 7.5, 4, 160, 20).slice(1)], w: [1, 2.2] }], dots: [[8.5, 13]] },
  {
    strokes: [
      { pts: arcPts(8.4, 4.4, 3, 2.6, -40, -250), w: [1, 2] },
      { pts: [[6, 6.6], [5, 8.6], ...arcPts(9, 12, 4.4, 4.6, 200, 20).slice(1)], w: [2.4, 1] },
    ],
    dots: [],
  },
  {
    strokes: [
      { pts: arcPts(10.2, 5.2, 2.6, 2.6, 0, 360), w: [1.6, 1.6] },
      { pts: [[7.8, 6.4], [6.6, 10], [6.2, 16.5]], w: [2.4, 1] },
    ],
    dots: [],
  },
  {
    strokes: [
      { pts: arcPts(11.2, 5, 2.2, 2.2, 0, 360), w: [1.6, 1.6] },
      { pts: arcPts(8, 8.6, 6, 6, -15, 190), w: [2.6, 1] },
    ],
    dots: [[9.6, 0.6], [13, 0.6]],
  },
  { strokes: [{ pts: [[2.2, 3], [11.8, 3.6], [7, 7], ...arcPts(9, 11.2, 5.4, 5, 220, 70).slice(1)], w: [1.4, 2.4] }], dots: [] },
  {
    strokes: [
      { pts: arcPts(9.6, 4.6, 2.6, 2.6, 160, 520), w: [1.6, 1.6] },
      { pts: arcPts(4.6, 6, 5.6, 9, -5, 115), w: [2.4, 1] },
    ],
    dots: [],
  },
];

/**
 * One glowing letter, `s` fine pixels per box unit, centered on `c`: bright
 * strokes (brightest where they are thick) inside a ring of glow.
 */
function scriptLetter(L: Layer, letter: Letter, c: Vec, s: number, mat: number, part: PartId): void {
  const ox = fine(c.x) - 9 * s;
  const oy = fine(c.y) - 9 * s;
  const core = new Set<number>();
  const disk = (x: number, y: number, r: number) => {
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.2) core.add(yy * GRID + xx);
      }
    }
  };
  for (const st of letter.strokes) {
    const n = st.pts.length;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = st.pts[i];
      const [x1, y1] = st.pts[i + 1];
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        const w = st.w[0] + ((st.w[1] - st.w[0]) * (i + t)) / (n - 1);
        disk(ox + (x0 + (x1 - x0) * t) * s, oy + (y0 + (y1 - y0) * t) * s, (w * s) / 2);
      }
    }
  }
  for (const [x, y] of letter.dots) disk(ox + x * s, oy + y * s, 1.1 * s);
  const inCore = (i: number) => core.has(i);
  for (const i of core) {
    for (const j of [i - 1, i + 1, i - GRID, i + GRID]) {
      if (!inCore(j)) L.set(j % GRID, (j / GRID) | 0, mat, 3, part, F_NO_OUTLINE);
    }
  }
  for (const i of core) {
    const deep = [i - 1, i + 1, i - GRID, i + GRID].every(inCore);
    L.set(i % GRID, (i / GRID) | 0, mat, deep ? 5 : 4, part, F_NO_OUTLINE);
  }
}

/**
 * Arcane Script: gigantic letters of the spell's script whirl around the
 * caster, the nearest ones in front, one behind; they change each frame.
 */
