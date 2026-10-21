interface PhaseSpec {
  /** What the edit is, for the manifest. */
  what: string;
  /** Polygons (his pixels, continuous) holding his ninjas; no pixel outside them is his ninja. */
  areas: [number, number][][];
  /** His ninjas' own pixels: his dark greys (OKLab lightness below maxL, chroma below maxC). */
  maxL: number;
  maxC: number;
  /** His see-through after-image (Swap's left ninja): lighter greys (lightness below smearL, chroma below smearC). */
  smearL?: number;
  smearC?: number;
  /** His skin round the eyes and on the fists: hue within skinHue (degrees), chroma at least 0.03, lightness at least 0.3. */
  skinHue: [number, number];
  /** His eyes (his pixels): they glow. */
  eyes: [number, number][];
  /** Pieces of his ninja's colours smaller than this are his ground, not his ninja. */
  minPiece: number;
  /** Gaps in his ninja up to this size (pixels; after closing the figure by one pixel) are his ninja too. */
  maxHole: number;
  /** His fold lines: his pixels darker than lineL, or darker than his ninja round them (5x5) by lineDrop, in runs of at least lineMin. */
  lineL: number;
  lineDrop: number;
  lineMin: number;
  /** His greys from fillLo to fillHi (lightness, smoothed over 3x3 of his ninja) go on the ramp's deep blues, steps 2 to 6. */
  fillLo: number;
  fillHi: number;
  /** How much of the phase colour covers his ground (the rest shows through): the body, his after-image. */
  alpha: number;
  smearAlpha: number;
}

const PH_NONE = 0, PH_BODY = 1, PH_SMEAR = 2, PH_SKIN = 3, PH_EYE = 4, PH_GAP = 5;
/** The ninja mask of each icon (his pixels, PH_*), as its phase edit found it: for the drawing at each size. */
const PHASE_MASK = new Map<string, Uint8Array>();

/**
 * His ninjas in his window (PH_* per pixel), by his colours inside the areas: his dark greys (body),
 * his skin, his eyes, his see-through after-image; then the figure closed by one pixel (his wind
 * streaks across a ninja, a pixel or two of his ground between two of his lines) and its small
 * holes filled: those pixels are PH_GAP (inside the figure, his own colour).
 */
function phaseMask(W: F, s: PhaseSpec): Uint8Array {
  const { w, h } = W, n = w * h;
  const m = new Uint8Array(n);
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    if (!s.areas.some((p) => inPoly(p, x + 0.5, y + 0.5))) continue;
    inside[i] = 1;
    const c = W.lab(i), C = Math.hypot(c[1], c[2]), hd = hueDeg(c);
    if (c[0] < s.maxL && C < s.maxC) m[i] = PH_BODY;
    else if (C >= 0.03 && c[0] >= 0.3 && hd >= s.skinHue[0] && hd <= s.skinHue[1]) m[i] = PH_SKIN;
    else if (s.smearL !== undefined && c[0] < s.smearL && C < (s.smearC ?? 0)) m[i] = PH_SMEAR;
  }
  // Pieces too small to be his ninja go back to his ground.
  const any = new Uint8Array(n);
  for (let i = 0; i < n; i++) any[i] = m[i] ? 1 : 0;
  for (const g of groups(any, w, h)) if (g.length < s.minPiece) for (const i of g) m[i] = PH_NONE;
  for (const [x, y] of s.eyes) m[y * w + x] = PH_EYE;
  // The figure (body, skin, eyes) closed by one pixel (3x3), inside his areas.
  const fig = new Uint8Array(n);
  for (let i = 0; i < n; i++) fig[i] = m[i] === PH_BODY || m[i] === PH_SKIN || m[i] === PH_EYE ? 1 : 0;
  const grow = (a: Uint8Array, on: boolean): Uint8Array => {
    const o = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const x = i % w, y = (i - x) / w;
      let v = on ? 0 : 1;
      for (let dy = -1; dy <= 1 && v !== (on ? 1 : 0); dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.max(0, Math.min(w - 1, x + dx)), yy = Math.max(0, Math.min(h - 1, y + dy));
          if (on ? a[yy * w + xx] : !a[yy * w + xx]) {
            v = on ? 1 : 0;
            break;
          }
        }
      o[i] = v;
    }
    return o;
  };
  const closed = grow(grow(fig, true), false);
  for (let i = 0; i < n; i++) if (closed[i] && inside[i] && m[i] === PH_NONE) m[i] = PH_GAP;
  // Small holes left inside him are his too.
  const hole = new Uint8Array(n);
  for (let i = 0; i < n; i++) hole[i] = m[i] === PH_NONE || m[i] === PH_SMEAR ? 1 : 0;
  for (const g of groups(hole, w, h)) {
    if (g.length > s.maxHole) continue;
    if (g.some((i) => i % w === 0 || i % w === w - 1 || i < w || i >= n - w)) continue;
    for (const i of g) m[i] = PH_GAP;
  }
  return m;
}

/** The phase edit on his window: his ninjas become figures of blue light (see PHASE_RAMP); returns what it did. */
function phaseEdit(id: string, s: PhaseSpec): (W: F) => string {
  return (W: F): string => {
    const { w, h } = W, n = w * h;
    const m = phaseMask(W, s);
    PHASE_MASK.set(id, m);
    const R = PHASE_RAMP.map((c) => hex(c));
    const his = new Float32Array(W.d);
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = W.lab(i)[0];
    const fig = (i: number) => m[i] === PH_BODY || m[i] === PH_SKIN || m[i] === PH_EYE || m[i] === PH_GAP;
    // Steps in from the figure's silhouette (4-neighbours; outside 0, the rim 1). His after-image
    // counts as outside: the rim is the figure's. The window's edge is not his silhouette.
    const dOut = new Int32Array(n).fill(-1);
    let ring: number[] = [];
    for (let i = 0; i < n; i++) if (!fig(i)) (dOut[i] = 0), ring.push(i);
    for (let d = 1; ring.length; d++) {
      const next: number[] = [];
      for (const i of ring) {
        const x = i % w, y = (i - x) / w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (dOut[j] < 0) (dOut[j] = d), next.push(j);
        }
      }
      ring = next;
    }
    // His ground behind his ninja, as it would show through: filled in ring by ring from his pixels
    // round the figure (each pixel the mean of its 8-neighbours one ring further out).
    const bg = new Float32Array(his);
    let maxD = 0;
    for (let i = 0; i < n; i++) maxD = Math.max(maxD, dOut[i]);
    for (let d = 1; d <= maxD; d++)
      for (let i = 0; i < n; i++) {
        if (dOut[i] !== d) continue;
        const x = i % w, y = (i - x) / w;
        const acc = [0, 0, 0];
        let k = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (dOut[j] < 0 || dOut[j] >= d) continue;
            for (let c = 0; c < 3; c++) acc[c] += bg[j * 3 + c];
            k++;
          }
        if (k) for (let c = 0; c < 3; c++) bg[i * 3 + c] = acc[c] / k;
      }
    // His ninja's lightness round each pixel (his body pixels only): r 1 for the fill, r 2 for his lines.
    const meanBody = (i: number, r: number): number => {
      const x = i % w, y = (i - x) / w;
      let t = 0, k = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (m[j] !== PH_BODY) continue;
          t += L[j];
          k++;
        }
      return k ? t / k : NaN;
    };
    // His fold lines: his darkest, or darker than his ninja round them, in runs of lineMin or more.
    const lineM = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (m[i] === PH_BODY && dOut[i] > 1 && (L[i] < s.lineL || L[i] < meanBody(i, 2) - s.lineDrop)) lineM[i] = 1;
    for (const g of groups(lineM, w, h)) if (g.length < s.lineMin) for (const i of g) lineM[i] = 0;
    const fillStep = (i: number): number => {
      const v = meanBody(i, 1);
      const t = Math.max(0, Math.min(1, ((Number.isNaN(v) ? s.fillLo : v) - s.fillLo) / (s.fillHi - s.fillLo)));
      return Math.min(7, 2 + Math.round(4 * t) + (dOut[i] === 2 ? 1 : 0));
    };
    const mixTo = (i: number, base: Float32Array, col: RGBA, a: number) => {
      for (let c = 0; c < 3; c++) W.d[i * 3 + c] = base[i * 3 + c] * (1 - a) + col[c] * a;
    };
    const count = { rim: 0, line: 0, fill: 0, gap: 0, skin: 0, eye: 0, smear: 0, glow: 0 };
    for (let i = 0; i < n; i++) {
      if (m[i] === PH_NONE) continue;
      const x = i % w, y = (i - x) / w;
      if (m[i] === PH_SMEAR) (mixTo(i, his, R[6], s.smearAlpha), count.smear++);
      else if (m[i] === PH_EYE) (mixTo(i, his, R[10], 1), count.eye++);
      else if (dOut[i] === 1) {
        // The rim: his reference's whitest where it faces his light (up, left), the next step elsewhere.
        const lit = (y > 0 && !fig(i - w)) || (x > 0 && !fig(i - 1));
        mixTo(i, his, R[lit ? 10 : 9], 1);
        count.rim++;
      } else if (m[i] === PH_SKIN) (mixTo(i, his, R[8], 1), count.skin++);
      else if (lineM[i]) (mixTo(i, his, R[8], 1), count.line++);
      else if (m[i] === PH_GAP) (mixTo(i, his, R[fillStep(i)], s.alpha), count.gap++);
      else (mixTo(i, bg, R[fillStep(i)], s.alpha), count.fill++);
    }
    // The glow round him: his ground outside the figure blends toward the ramp's blue, less with distance.
    const near = (x: number, y: number): number => {
      let best = Infinity;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (fig(yy * w + xx)) best = Math.min(best, Math.hypot(dx, dy));
        }
      return best;
    };
    for (let i = 0; i < n; i++) {
      if (fig(i)) continue;
      const x = i % w, y = (i - x) / w;
      const d = near(x, y);
      if (d > 3) continue;
      const a = d <= 1 ? 0.5 : d <= 1.5 ? 0.4 : d <= 2 ? 0.25 : d <= 2.9 ? 0.12 : 0.06;
      for (let c = 0; c < 3; c++) W.d[i * 3 + c] = W.d[i * 3 + c] * (1 - a) + R[5][c] * a;
      count.glow++;
    }
    return (
      `${s.what}: his ninja${s.areas.length > 1 ? 's' : ''} (${count.rim + count.line + count.fill + count.gap + count.skin + count.eye} of his pixels${count.smear ? `, and ${count.smear} of his see-through after-image` : ''}) redrawn as figures of blue light in his reference's blues (${PHASE_RAMP.join(' ')}): ` +
      `the silhouette as the near-white rim (${count.rim} pixels; his reference's whitest where it faces up or left), ` +
      `his fold lines (darker than ${s.lineL}, or ${s.lineDrop} darker than his ninja round them) as light blue lines (${count.line}), ` +
      `his greys on the deep blues (his lightness ${s.fillLo} to ${s.fillHi}, smoothed over 3x3, on steps 2 to 6, a step lighter just inside the rim) at ${Math.round(s.alpha * 100)}% over his ground filled in from round the figure, so a little of it shows through (${count.fill}; his wind across the figure the same over his own pixels, ${count.gap}), ` +
      `his skin a bright blue (${count.skin}), his eyes his reference's whitest (${count.eye})` +
      (count.smear ? `, his after-image his reference's blue (${PHASE_RAMP[6]}) over his pixels at ${Math.round(s.smearAlpha * 100)}% (${count.smear})` : '') +
      `; a soft glow of his blue (${PHASE_RAMP[5]}) round the figure, half at the edge, gone at three pixels (${count.glow}). Everything else stays his.`
    );
  };
}

