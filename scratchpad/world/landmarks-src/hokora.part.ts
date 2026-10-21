const ROOF = pal(ramp(MATERIALS.barkCedar));

/** Extrudes a convex polygon given in the X-H plane along depth from d0 to d1 (closed both ends). */
function extrudeXH(poly: [number, number][], d0: number, d1: number): Tri[] {
  const r0: V3[] = poly.map(([x, h]) => [x, h, d0]);
  const r1: V3[] = poly.map(([x, h]) => [x, h, d1]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** Extrudes a convex polygon given in the D-H plane along X from x0 to x1 (closed both ends). */
function extrudeDH(poly: [number, number][], x0: number, x1: number): Tri[] {
  const r0: V3[] = poly.map(([d, h]) => [x0, h, d]);
  const r1: V3[] = poly.map(([d, h]) => [x1, h, d]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** A box with a chamfered top edge. */
function slab(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number, ch = 1): Tri[] {
  const rect = (h: number, i: number): V3[] => [[x0 + i, h, d0 + i], [x1 - i, h, d0 + i], [x1 - i, h, d1 - i], [x0 + i, h, d1 - i]];
  return loft([rect(h0, 0), rect(h1 - ch, 0), rect(h1, ch)], { capEnd: true });
}

/**
 * A ring around a rectangle (x0..x1, d0..d1) at height h with `per` points per side; points near the
 * corners lift by `lift` and reach out by `out` (upturned eaves).
 */
function rectRing(x0: number, x1: number, d0: number, d1: number, h: number, per: number, lift = 0, out = 0): V3[] {
  const pts: V3[] = [];
  const corners: [number, number][] = [[x0, d0], [x1, d0], [x1, d1], [x0, d1]];
  const cx = (x0 + x1) / 2, cd = (d0 + d1) / 2;
  for (let s = 0; s < 4; s++) {
    const [ax, ad] = corners[s], [bx, bd] = corners[(s + 1) % 4];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const x = ax + (bx - ax) * t, d = ad + (bd - ad) * t;
      const cf = (1 - 2 * Math.min(t, 1 - t)) ** 2; // 1 at the corners, 0 mid-side: a curved eave
      const ux = x - cx, ud = d - cd, ul = Math.hypot(ux, ud) || 1;
      pts.push([x + (ux / ul) * out * cf, h + lift * cf, d + (ud / ul) * out * cf]);
    }
  }
  return pts;
}

function hokora(): WorldSprite {
  const W = 90, H = 100, ox = 45, oy = 80;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number): MeshOpts => ({ pal: STONE, seed, tex: 0.04, texCell: 8, contrast: 1.1, ao: 2 });
  // Stone base: a footing slab, a pedestal block and a top slab.
  const foot = sc.add(slab(-18, 18, 0, 7.5, -14, 14, 1.5), st(81));
  const ped = sc.add(slab(-11.5, 11.5, 7.5, 21.5, -9, 9, 1), st(82));
  const top = sc.add(slab(-15, 15, 21.5, 26, -12, 12, 1.2), st(83));
  // Wooden shrine body on a darker sill, with corner posts.
  const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_OLD, seed, contrast: 1.05, facetVar: 0.02, ...extra });
  const body = sc.add(slab(-10, 10, 27.5, 50, -7.5, 7.5, 0), wood(84));
  const sill = sc.add(slab(-12, 12, 26, 28, -9.5, 9.5, 0.6), wood(85, { pal: WOOD_DK }));
  const posts = [-10, 10].map((x, k) => sc.add(slab(x - 1.4, x + 1.4, 27.5, 50, -8.3, -5.5, 0), wood(90 + k, { pal: WOOD_DK })));
  // Hipped cedar-bark roof with upturned corners, a ridge beam and two katsuogi logs.
  const per = 8;
  const roof = sc.add(
    loft(
      [
        rectRing(-15, 15, -12, 9, 44, per, 3.6, 1.6),
        rectRing(-15, 15, -12, 9, 46.4, per, 3.6, 1.6),
        rectRing(-10.5, 10.5, -7.5, 5, 51.5, per, 0.8, 0),
        rectRing(-5.5, 5.5, -1.2, 0.4, 57, per, 0, 0),
      ],
      { capStart: true, capEnd: true },
    ),
    { pal: ROOF, seed: 86, contrast: 1.15, facetVar: 0.03 },
  );
  const ridge = sc.add(pole([-7.5, 57.4, -0.4], [7.5, 57.4, -0.4], 1.8, 8), { pal: WOOD_DK, seed: 88 });
  const ends = [-1, 1].map((sd) => sc.add(loft([ring(sd * 7.6, 56.2, -0.4, 1.5, 1.5, 8), ring(sd * 8.3, 58.6, -0.4, 2.2, 2.0, 8), ring(sd * 9.2, 60, -0.4, 1.4, 1.4, 8)], { capEnd: true, smooth: true }), { pal: WOOD_DK, seed: 92 + sd }));
  const katsuo: Mesh[] = [];
  // A small front gable (chidori-hafu) on the front slope: a dark triangle under light bargeboards.
  const gable = sc.add(extrudeXH([[-7.5, 45.2], [7.5, 45.2], [0, 53.2]], -12.6, -3), { pal: WOOD_DK, seed: 93, facetVar: 0, contrast: 1.1 });
  const barge = [
    sc.add(extrudeXH([[-9.4, 44.6], [-7.9, 44.2], [0.8, 53.5], [0, 55]], -13.4, -3), { pal: ROOF, seed: 94, facetVar: 0, contrast: 1.15 }),
    sc.add(extrudeXH([[9.4, 44.6], [0, 55], [-0.8, 53.5], [7.9, 44.2]], -13.4, -3), { pal: ROOF, seed: 95, facetVar: 0, contrast: 1.15 }),
  ];
  void barge;
  void ends;
  void ridge;
  void katsuo;
  void posts;
  void sill;
  const f = render(sc, W, H, ox, oy);
  // Cedar-bark courses on the roof: seams at constant height (parallel to the eaves) on every
  // plane; the thick eave edge shows layered strata.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== roof.id) continue;
    const p = f.world(i), n = f.normal(i);
    const x = i % W, y = Math.floor(i / W);
    if (n[1] > 0.3) {
      const hh = p[1] - 46.8;
      if (hh > 1 && hh % 2.6 < 0.9) f.step[i] = Math.max(1, f.step[i] - 1);
    } else {
      f.step[i] = clamp(y % 2 === 0 ? f.step[i] + 1 : f.step[i], 1, 4);
    }
    void x;
  }
  // The gable's triangle: vertical boards and a round ornament (gegyo) under the apex.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== gable.id) continue;
    const p = f.world(i), n = f.normal(i);
    if (n[2] > -0.9) continue;
    if (Math.abs(p[0]) % 3 < 0.8) f.step[i] = Math.max(1, f.step[i] - 1);
    if (Math.hypot(p[0], p[1] - 49.6) < 1.3) f.step[i] = 4;
  }
  paintMoss(f, { meshes: [roof.id], amount: 0.2, seed: 811, cell: 6, drip: 1, minUp: 0.3, bumps: true });
  paintMoss(f, { meshes: [foot.id], amount: 0.3, seed: 812, cell: 6, drip: 2 });
  paintLichen(f, { meshes: [foot.id, ped.id, top.id], seed: 813, density: 0.3, minLight: 0.35 });
  // Vertical plank seams on the front wall either side of the doors.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== body.id) continue;
    const p = f.world(i), n = f.normal(i);
    if (n[2] < -0.9 && Math.abs(Math.abs(p[0]) - 8.6) < 0.5) f.step[i] = Math.max(1, f.step[i] - 1);
  }
  const fr = (x: number, h: number, d: number) => f.proj([x, h, d]).map(Math.round) as [number, number];
  const c0 = f.compose();
  // Doors: a dark frame, two leaves with a fox lattice over the dark inside.
  const [dx0, dy1] = fr(-7, 29, -7.5);
  const [dx1, dy0] = fr(7, 43, -7.5);
  const midX = Math.floor((dx0 + dx1) / 2);
  for (let y = dy0; y < dy1; y++)
    for (let x = dx0; x < dx1; x++) {
      const u = x - dx0, v = y - dy0;
      const edge = u === 0 || x === dx1 - 1 || v === 0 || y === dy1 - 1;
      let col: Color;
      if (edge) col = C(WOOD_DK, v === 0 ? 1 : u === 0 ? 3 : 2);
      else if (x === midX - 1) col = C(WOOD_DK, 3);
      else if (x === midX) col = C(WOOD_DK, 1);
      else if ((x - dx0) % 3 === 0 || v % 3 === 0) col = C(WOOD_OLD, v < 3 ? 2 : (x - dx0) % 3 === 0 && v % 3 === 0 ? 4 : 3);
      else col = v < 4 ? C(WOOD_DK, 0) : mix(C(WOOD_DK, 0), C(WOOD_DK, 1), 0.6);
      c0.set(x, y, col);
    }
  // Little offering cups on the top slab, left and right of the doors.
  for (const cx of [-13, 12]) {
    const [x, y] = fr(cx, 26, -10);
    c0.set(x, y - 1, C(PAPER, 4));
    c0.set(x + 1, y - 1, C(PAPER, 3));
    c0.set(x, y, C(PAPER, 2));
    c0.set(x + 1, y, C(PAPER, 2));
  }
  // Red cloth draped over the top slab's front edge, with broad folds and a scalloped hem.
  const cloth = layer(W, H, (c) => {
    const [cx0, cyTop] = fr(-9, 26, -10);
    const [cx1] = fr(9, 26, -10);
    const [, cyEdge] = fr(0, 26, -12);
    // Folds of uneven width: a lit first column, two mid, a shadowed last one.
    const widths = [5, 4, 5, 4, 5];
    let fx = cx0, fi = 0;
    while (fx <= cx1) {
      const wdt = widths[fi % widths.length];
      for (let u = 0; u < wdt && fx + u <= cx1; u++) {
        const x = fx + u;
        const fold = u === 0 ? 4 : u === wdt - 1 ? 2 : 3;
        const hem = cyEdge + 9 + (u === 1 || u === 2 ? 1 : 0) - (x === cx0 || x === cx1 ? 1 : 0);
        for (let y = cyTop; y <= hem; y++) {
          const onTop = y < cyEdge;
          let st = onTop ? (x - cx0 < 4 ? 4 : 3) : fold;
          if (y === cyEdge) st = Math.min(5, st + 1); // the cloth rolls over the edge
          if (!onTop && y > cyEdge + 6) st = Math.max(1, st - 1);
          if (y === hem) st = Math.max(1, st - 1);
          c.set(x, y, C(RED, st));
        }
      }
      fx += wdt;
      fi++;
    }
  });
  c0.draw(cloth, 0, 0);
  // Shimenawa: a twisted straw rope sagging across the front over the doors, with paper shide.
  const [rx0, ry0] = fr(-11.5, 45, -9);
  const [rx1] = fr(11.5, 45, -9);
  const ropeY = (x: number) => ry0 + Math.round(2.4 * (1 - (2 * ((x - rx0) / (rx1 - rx0)) - 1) ** 2));
  const rope = layer(W, H, (c) => {
    for (let x = rx0; x <= rx1; x++) {
      const u = (x - rx0) / (rx1 - rx0);
      const yc = ropeY(x);
      const thick = u < 0.1 || u > 0.9 ? 2 : 3;
      for (let k = 0; k < thick; k++) {
        const tw = (x + k) % 3 === 0;
        c.set(x, yc + k - 1, C(ROPE, k === 0 ? (tw ? 3 : 4) : tw ? 2 : k === thick - 1 ? 2 : 3));
      }
    }
  });
  c0.draw(rope, 0, 0);
  // Shide: zigzag paper streamers (each its own outlined layer so they read as folded paper).
  for (const sx of [-5.5, 5.5]) {
    const [x] = fr(sx, 45, -9);
    const y = ropeY(x) + 2;
    const sh = layer(W, H, (c) => {
      const zig: [number, number, number][] = [[0, 0, 4], [1, 0, 5], [1, 1, 4], [2, 1, 3], [0, 2, 4], [1, 2, 4], [1, 3, 4], [2, 3, 3], [0, 4, 4], [1, 4, 3], [1, 5, 3], [2, 5, 2]];
      for (const [zx, zy, s] of zig) c.set(x - 1 + zx, y + zy, C(PAPER, s));
    });
    c0.draw(sh, 0, 0);
  }
  c0.outline();
  return finish('hokora', 'Roadside Shrine', [0.65, 1.3], ['interactable'], { idle: { frames: [c0], fps: 0 } }, ox);
}
