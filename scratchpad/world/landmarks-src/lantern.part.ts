/** A ring on a hexagon of circumradius r (flat face to the viewer), 24 points; corners lift and reach out. */
function kasaRing(h: number, r: number, lift: number, out = 0): V3[] {
  const pts: V3[] = [];
  const N = 24, seg = Math.PI / 3;
  for (let j = 0; j < N; j++) {
    const a = Math.PI / 3 + (j * TAU) / N;
    const rel = (((a - Math.PI / 3) % seg) + seg) % seg;
    const dc = Math.min(rel, seg - rel);
    const polyR = (r * Math.cos(Math.PI / 6)) / Math.cos(Math.PI / 6 - dc);
    const cf = Math.max(0, 1 - dc / (seg * 0.4)) ** 1.5;
    pts.push([Math.cos(a) * (polyR + out * cf), h + lift * cf, Math.sin(a) * (polyR + out * cf)]);
  }
  return pts;
}

/** Flame bitmaps, bottom row last: r tip, o orange, y yellow, w white-hot core. */
const LANTERN_FLAMES = [
  ['.r.', '.o.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['..r', '.ro', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.o.', '.oy', 'oyo', 'oyy', 'ywy', 'ywy', 'oyo'],
  ['r..', 'or.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.r.', '.o.', 'oyo', 'yyo', 'ywy', 'oyo'],
];
const FLAME_COL: Record<string, Color> = { r: hex('#ef4444'), o: R.fire[3], y: R.fire[4], w: hex('#fde68a') };

function stoneLantern(): WorldSprite {
  const W = 90, H = 130, ox = 45, oy = 112;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const st = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.07, texCell: 6, ...extra });
    // Base: a wide hexagonal slab and a chamfered second tier.
    const base = sc.add(loft([hexRing(0, 0, 0, 16), hexRing(0, 4.5, 0, 16), hexRing(0, 6.5, 0, 14.5)], { capEnd: true }), st(11));
    const base2 = sc.add(loft([hexRing(0, 6.5, 0, 11.5), hexRing(0, 9, 0, 11.5), hexRing(0, 10.5, 0, 8.5)], { capEnd: true }), st(12));
    // Pillar (sao) with a raised band (fushi) a little below the middle.
    const pillarRings: V3[][] = [];
    const prof: [number, number][] = [[10.5, 5.4], [20, 5.2], [20, 6.3], [22.5, 6.3], [22.5, 5.1], [36, 4.8]];
    for (const [hh, r] of prof) pillarRings.push(ring(0, hh, 0, r, r, 14));
    const pillar = sc.add(loft(pillarRings, { smooth: true }), st(13, { steps: [1, 2, 3, 3, 4], bias: -0.04 }));
    // Middle platform (chudai): lotus flare then a hexagonal slab.
    const chudai = sc.add(loft([hexRing(0, 35.5, 0, 6.5), hexRing(0, 38.5, 0, 10.8), hexRing(0, 39.5, 0, 12), hexRing(0, 43, 0, 12)], { capEnd: true }), st(14));
    // Firebox (hibukuro).
    const fire = sc.add(loft([hexRing(0, 43, 0, 9.5), hexRing(0, 62, 0, 9.5)], { capEnd: true }), st(15, { bias: -0.06 }));
    // Roof (kasa): eave fascia, a concave sloped top with upturned corners, the finial seat.
    const roof = sc.add(
      loft([kasaRing(61.5, 17, 1, 0), kasaRing(61.5, 18.5, 3.5, 1.5), kasaRing(64, 18.5, 4.2, 1.5), kasaRing(66.5, 15, 1.4, 0.4), kasaRing(70, 10.5, 0.4), kasaRing(74, 6.2, 0), kasaRing(75.5, 4.2, 0)], { capStart: true, capEnd: true }),
      st(16, { bias: -0.08 }),
    );
    // Finial: lotus cup and the jewel (hoju).
    const cup = sc.add(loft([ring(0, 75.5, 0, 2.6, 2.6, 8), ring(0, 77.2, 0, 3.8, 3.8, 8), ring(0, 78, 0, 3, 3, 8)], { capEnd: true, smooth: true }), st(17, { steps: [1, 2, 3, 4] }));
    const jewelR: V3[][] = [];
    for (const [hh, r] of [[78, 2.2], [79, 3.3], [81, 3.7], [83, 3], [84.5, 1.6]] as [number, number][]) jewelR.push(ring(0, hh, 0, r, r, 10));
    const jewel = sc.add(loft(jewelR, { capStart: true, capEnd: [0, 86.5, 0], smooth: true }), st(18, { steps: [1, 2, 3, 4, 5], bias: -0.05 }));
    return { sc, base, base2, pillar, chudai, fire, roof, cup, jewel };
  };

  const frame = (lit: boolean, t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    const id = (mm: Mesh) => mm.id;
    // Moss in the roof's hollow and on the ledges; lichen on the faces.
    paintMoss(f, { meshes: [id(parts.roof)], amount: 0.3, seed: 301, cell: 7, drip: 2, bumps: true });
    paintMoss(f, { meshes: [id(parts.chudai), id(parts.base2)], amount: 0.26, seed: 302, cell: 6, drip: 2 });
    paintMoss(f, { meshes: [id(parts.base)], amount: 0.34, seed: 303, cell: 7, drip: 2, bumps: true });
    paintLichen(f, { meshes: [id(parts.base), id(parts.fire), id(parts.chudai), id(parts.pillar), id(parts.roof)], seed: 310, density: 0.2, minLight: 0.4 });
    // Chips knocked out of edges, a crack in the base and the pillar.
    const [ex, ey] = f.proj([9.3, 63, -16]);
    chip(f, Math.round(ex), Math.round(ey), [[0, 1], [1, 1], [1, 0]], [[0, 0], [-1, 1]]);
    const [bx, by] = f.proj([-8, 4.5, -13.9]);
    chip(f, Math.round(bx), Math.round(by), [[0, 0], [1, 0], [0, 1]], [[1, 1], [2, 0]]);
    paintCrack(f, [[ox - 12, oy - 3], [ox - 11, oy - 1], [ox - 11, oy + 1], [ox - 12, oy + 3]], [id(parts.base)]);
    paintCrack(f, [[ox + 3, oy - 31], [ox + 2, oy - 28], [ox + 3, oy - 26]], [id(parts.pillar)]);
    // Firebox windows: the front opening, a sun on the left face and a moon on the right.
    const frontD = -9.5 * Math.cos(Math.PI / 6);
    const [wx0, wy1] = f.proj([-3, 45.5, frontD]).map(Math.round);
    const [wx1, wy0] = f.proj([3, 56, frontD]).map(Math.round);
    const flick = [0, 1, 1, 0, -1, -1][t % 6];
    const warmSet = (x: number, y: number, v: number) => {
      const i = f.idx(x, y);
      if (i >= 0) f.warm[i] = Math.max(f.warm[i], v);
    };
    for (let y = wy0; y < wy1; y++)
      for (let x = wx0; x < wx1; x++) {
        const i = f.idx(x, y);
        const fromBottom = wy1 - 1 - y;
        if (fromBottom < 2) {
          // The sill: the bottom inside face, seen from above.
          f.set(x, y, STONE, fromBottom === 0 ? 2 : 3);
          if (lit) warmSet(x, y, fromBottom === 1 ? 0.9 : 0.7);
          continue;
        }
        if (!lit) {
          f.over[i] = y === wy0 || x === wx0 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.45);
          continue;
        }
        // Lit inside: the back wall glows, brightest low and around the flame.
        const dx = Math.abs(x + 0.5 - (wx0 + wx1) / 2), up = fromBottom - 2;
        const v = 1 - up / 9 - dx / 5;
        f.over[i] = y === wy0 ? mix(R.fire[0], R.fire[1], 0.4) : v > 0.55 ? R.fire[2] : v > 0.25 ? mix(R.fire[1], R.fire[2], 0.5) : R.fire[1];
      }
    // Side windows (left: round sun, right: crescent moon).
    const sideHole = (cxW: number, cdW: number, moon: boolean) => {
      const [sx, sy] = f.proj([cxW, 51.5, cdW]).map(Math.round);
      const pts: [number, number][] = moon ? [[1, -1], [0, 0], [0, 1], [1, 2]] : [[0, -1], [1, -1], [0, 0], [1, 0], [0, 1], [1, 1]];
      for (const [dx, dy] of pts) {
        const i = f.idx(sx + dx, sy + dy);
        if (i < 0) continue;
        f.over[i] = lit ? (dy >= 1 ? R.fire[4] : R.fire[3]) : dy === -1 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.5);
        if (lit) for (const [ax, ay] of [[-1, 0], [2, 0], [0, 2], [1, 2], [-1, 1]]) warmSet(sx + dx + ax, sy + dy + ay, 0.3);
      }
    };
    sideHole(-7.2, -2.6, false);
    sideHole(6.8, -2.6, true);
    if (lit) {
      // Light spill: the platform in front of the window and a rim of the stone around the opening.
      const cx = (wx0 + wx1) / 2, cy = wy1 - 1;
      const rad = 8.5 + flick * 0.8;
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const i = f.idx(x, y);
          if (f.pal[i] < 0 || f.over[i]) continue;
          const n = f.normal(i);
          const mi = f.mesh[i];
          if (mi !== id(parts.fire) && mi !== id(parts.chudai)) continue;
          const isTop = n[1] > 0.5;
          const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / (isTop ? rad * 0.45 : rad * 0.75);
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          // Tops in front of the window catch the light; the box face only near the opening edge.
          const v = isTop ? (1 - d) * 1.1 : y >= wy0 - 1 && y < wy1 ? (1 - d) * 0.7 : (1 - d) * 0.35;
          warmSet(x, y, v * (1 + flick * 0.08));
        }
    }
    const c = f.compose();
    if (lit) {
      const bm = LANTERN_FLAMES[t % 6];
      const fx = Math.round((wx0 + wx1) / 2) - 2, fb = wy1 - 2;
      bm.forEach((row, k) => {
        for (let dx = 0; dx < row.length; dx++) {
          const ch = row[dx];
          if (ch !== '.') c.set(fx + dx, fb - (bm.length - k), FLAME_COL[ch]);
        }
      });
      // The wick sits in a little oil dish on the sill.
      c.set(fx + 1, fb, R.charred[3]);
      c.set(fx, fb, mix(R.fire[1], R.charred[3], 0.5));
      c.set(fx + 2, fb, mix(R.fire[1], R.charred[3], 0.5));
    } else {
      // An unlit candle stub on the sill.
      const fx = Math.round((wx0 + wx1) / 2) - 1, fb = wy1 - 2;
      c.set(fx, fb - 1, C(PAPER, 2));
      c.set(fx, fb - 2, C(PAPER, 3));
      c.set(fx, fb - 3, R.charred[2]);
    }
    c.outline();
    return c;
  };

  const litFrames = [0, 1, 2, 3, 4, 5].map((t) => frame(true, t));
  const unlit = frame(false, 0);
  return finish('stone_lantern', 'Stone Lantern', [0.7, 1.7], ['light-source', 'cover-half', 'interactable'], { lit: { frames: litFrames, fps: 8 }, unlit: { frames: [unlit], fps: 0 } }, ox);
}
