type StarKey = 'ridge' | 'pale' | 'light' | 'bright' | 'dark' | 'centre' | 'ink';
/**
 * A compass rose of the four cardinal points, drawn as his Submission star is: four long points
 * (north, east, south, west: length `L`, the north one `Ln`, `w` to each side of the axis where they
 * meet) and four short thin ones between them (`l`, `wl`), each point split along its axis into two
 * facets lit from his upper left. Pixel centres at any size: a pixel is the star's when at least half
 * of a 4x4 grid of samples in it is; its facet is the one most of them fall in. `ridge` is the axis of
 * the two long points turned to his light (north and west), from next to the centre to 1.5 short of
 * the tip: his star's thin pale stroke. `ink` is the dark outline round it (4-neighbours), so the
 * crimson rose stands on the bright red iris as his sharingan's dark lines did.
 */
function compassPixels(cx: number, cy: number, L: number, w: number, l: number, wl: number, centre: number, Ln = L): { x: number; y: number; k: StarKey }[] {
  const light: [number, number] = [-Math.SQRT1_2, -Math.SQRT1_2];
  const arms: { u: [number, number]; len: number; hw: number; long: boolean }[] = [];
  for (const [ux, uy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][]) arms.push({ u: [ux, uy], len: uy < 0 ? Ln : L, hw: w, long: true });
  for (const [ux, uy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]] as [number, number][]) arms.push({ u: [ux * Math.SQRT1_2, uy * Math.SQRT1_2], len: l, hw: wl, long: false });
  const level = (b: number): StarKey => (b >= 0.5 ? 'pale' : b >= 0 ? 'light' : b >= -0.5 ? 'bright' : 'dark');
  const sample = (px: number, py: number): StarKey | null => {
    const dx = px - cx, dy = py - cy;
    if (Math.hypot(dx, dy) <= centre) return 'centre';
    let best: StarKey | null = null, bs = -Infinity;
    for (const a of arms) {
      const v: [number, number] = [-a.u[1], a.u[0]];
      const s = dx * a.u[0] + dy * a.u[1], t = dx * v[0] + dy * v[1];
      if (s < -1e-9 || s > a.len || Math.abs(t) > a.hw * (1 - s / a.len)) continue;
      // The arm the point lies along most (where arms overlap near the centre).
      const along = s / a.len;
      if (along <= bs) continue;
      bs = along;
      const side: [number, number] = t >= 0 ? v : [-v[0], -v[1]];
      const b = 0.6 * (side[0] * light[0] + side[1] * light[1]) + 0.4 * (a.u[0] * light[0] + a.u[1] * light[1]);
      best = level(b);
    }
    return best;
  };
  const out = new Map<string, { x: number; y: number; k: StarKey }>();
  const R = Math.ceil(Math.max(L, Ln, l) + 1);
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const n = new Map<StarKey, number>();
      let inside = 0;
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const k = sample(x + (i + 0.5) / 4, y + (j + 0.5) / 4);
          if (!k) continue;
          inside++;
          n.set(k, (n.get(k) ?? 0) + 1);
        }
      if (inside < 8) continue;
      let k: StarKey = 'bright', kn = -1;
      for (const key of ['centre', 'pale', 'light', 'bright', 'dark'] as StarKey[]) if ((n.get(key) ?? 0) > kn) (kn = n.get(key) ?? 0), (k = key);
      out.set(`${x},${y}`, { x, y, k });
    }
  for (const a of arms) {
    if (!a.long || a.u[0] * light[0] + a.u[1] * light[1] <= 0) continue;
    for (let s = 1; s <= a.len - 1.5; s++) {
      const p = out.get(`${Math.floor(cx + a.u[0] * s)},${Math.floor(cy + a.u[1] * s)}`);
      if (p && p.k !== 'centre') p.k = 'ridge';
    }
  }
  for (const p of [...out.values()])
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${p.x + dx},${p.y + dy}`;
      if (!out.has(key)) out.set(key, { x: p.x + dx, y: p.y + dy, k: 'ink' });
    }
  return [...out.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

// His Command eye (his window as cropped, 127x127; continuous coordinates, a pixel's centre at +0.5):
// the iris is a circle about (60, 59), its dark rim at radius 17 to 19; his upper lid covers it above
// y 45 and shades it down to y 52. His sharingan inside: a dark ring at radius 10.5 with three tomoe
// on it (their tips reach radius 15) and a round pupil (radius 4). Round them his iris is his bright
// red (#fe1020 and the like, OKLab L 0.6 to 0.63) from the pupil out to radius 14, darker from 15 to
// his dark rim.
const CMD = { cx: 60, cy: 59, inner: 16.5, pattern: 15.5, bright: 14.5, shade: 52 };
// The compass rose, at 88 (his scale x 127/88 for the comparison sheet): long points of 8.5 pixels
// (the north one ends under his lid's dark line, as the iris does), short ones 4.5. Colours: his
// Submission star's own: his lit crimson (#e80c28) on the facets toward his light, his shaded crimson
// (#a0001e) and his deep red (#6a0418) on the others, his pale pink (#ffb4bc) only as the thin stroke
// along the north and west points, his palest (#ffc5c8) at the heart, his dark maroon (#4c031e) as
// the outline that sets it off his bright iris.
const CMD_STAR = { L: 8.5, Ln: 8.5, w: 2.6, l: 4.5, wl: 1.4, centre: 0.7 };
const STAR_INK: Record<StarKey, string> = { centre: '#ffc5c8', ridge: '#ffb4bc', pale: '#e80c28', light: '#e80c28', bright: '#a0001e', dark: '#6a0418', ink: '#4c031e' };

/**
 * His Command eye without the sharingan, a plain radiant red iris: every pixel of his pattern (his
 * dark ring, tomoe and pupil with their dark red edges: inside radius 14.5 everything darker than his
 * bright iris, out to 15.5 his tomoe tips) takes his iris's own colour at that distance from the
 * centre: the median of his iris pixels there that are not the pattern, his bright ones only inside
 * radius 14.5 (the pupil takes his bright red next to it), and under his lid's shade (above y 52)
 * his shaded iris colour of that row. The compass rose is drawn at each size (commandArt).
 */
function commandEdit(W: F): string {
  const { cx, cy, inner, pattern, bright, shade } = CMD;
  const L = (x: number, y: number) => W.lab(y * W.w + x)[0];
  const r = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const isPattern = (x: number, y: number): boolean => {
    const d = r(x, y);
    if (d >= pattern || y + 0.5 < cy - pattern) return false;
    // Under his lid's shade his iris is dark itself: only his pattern's darkest there.
    if (y < shade) return L(x, y) < (d < 12.5 ? 0.43 : 0.33);
    return L(x, y) < (d < bright ? 0.56 : 0.36);
  };
  const bins = new Map<number, number[][]>(), rowsShade = new Map<number, number[][]>();
  for (let y = 0; y < W.h; y++)
    for (let x = 0; x < W.w; x++) {
      const d = r(x, y);
      if (d >= inner || isPattern(x, y) || L(x, y) < 0.2) continue;
      const c = [0, 1, 2].map((k) => W.d[(y * W.w + x) * 3 + k]);
      if (y >= shade) {
        const b = Math.floor(d);
        bins.set(b, [...(bins.get(b) ?? []), c]);
      } else rowsShade.set(y, [...(rowsShade.get(y) ?? []), c]);
    }
  const median = (cs: number[][]): number[] => [0, 1, 2].map((k) => {
    const v = cs.map((c) => c[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  // The nearest bin with his iris there, out first (the pupil takes the bright ring round it).
  const binAt = (d: number): number[][] | undefined => {
    const b0 = Math.floor(d);
    for (let k = 0; k < inner + 2; k++) for (const b of [b0 + k, b0 - k]) if (bins.has(b)) return bins.get(b);
    return undefined;
  };
  let n = 0;
  for (let y = 0; y < W.h; y++)
    for (let x = 0; x < W.w; x++) {
      if (!isPattern(x, y)) continue;
      const cs = y < shade ? rowsShade.get(y) : binAt(r(x, y));
      if (!cs) continue;
      const m = median(cs);
      for (let k = 0; k < 3; k++) W.d[(y * W.w + x) * 3 + k] = m[k];
      n++;
    }
  return `his sharingan (${n} of his pixels: the dark ring, three tomoe with their tips, the pupil and their dark red edges) painted out with his own iris colour at each distance from the centre (his bright red out to radius ${bright}, under his lid's shade his shaded iris colour of that row): a plain radiant red iris for the compass rose`;
}

/** His window with the compass drawn at his scale (for the comparison sheets: the edit as a whole, in his pixels). */
function commandPreview(W: F): void {
  const s = CMD_STAR, k = W.w / 88;
  for (const p of compassPixels(CMD.cx, CMD.cy, s.L * k, s.w * k, s.l * k, s.wl * k, s.centre * k, s.Ln * k)) setW(W, p.x, p.y, STAR_INK[p.k]);
}

// The compass at 44, drawn by hand on his iris (11 by 10 pixels under his lid there): one pixel of his
// palest pink at the heart, four points narrowing to one pixel (north 3 long, ending under his lid's
// dark line; east, south, west 4), each his lit crimson on the side toward his light and his shaded
// crimson on the other, the north and west ones with his pale pink stroke along them; a pixel of his
// deep red for each short point; his dark maroon only beside the shaded sides and the tips. Origin:
// four pixels left of and three above the heart.
const CMD_STAR44 = [
  '....o....',
  '...opa...',
  '..daplad.',
  'oppplbbbo',
  '..apxadd.',
  '...lab...',
  '..d.ab.d.',
  '....ao...',
  '.........',
];

/** The compass at 88 (the shape above with its dark outline) and at 44 (by hand), on his radiant iris; at 44 also his lower-left sparkle's white core. */
function commandArt(pt: Paint, ctx: Ctx): void {
  const [mx, my] = ctx.map(CMD.cx, CMD.cy);
  if (pt.N === 44) {
    const ax = Math.floor(mx), ay = Math.floor(my);
    pt.ascii(ax - 4, ay - 3, CMD_STAR44, { x: STAR_INK.centre, p: STAR_INK.ridge, l: STAR_INK.light, a: STAR_INK.light, b: STAR_INK.bright, d: STAR_INK.dark, o: STAR_INK.ink });
    // His lower-left sparkle (his pixels 17-26, 89-100): at 44 his box keeps its white core at (7, 33)
    // and his pinks round it, where the palette's nearest was a flat pink square.
    pt.ascii(6, 32, ['.r.', 'rwp', '.p.'], { w: '#ffced2', p: '#f8848e', r: '#f43d4e' });
    return;
  }
  const k = pt.N / 88, s = CMD_STAR;
  const cx = Math.floor(mx) + 0.5, cy = Math.floor(my) + 0.5;
  for (const p of compassPixels(cx, cy, s.L * k, s.w * k, s.l * k, s.wl * k, Math.max(0.5, s.centre * k), s.Ln * k)) pt.px(p.x, p.y, STAR_INK[p.k]);
}

