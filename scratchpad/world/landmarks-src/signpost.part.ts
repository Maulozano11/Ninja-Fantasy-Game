const IRON = pal(R.iron);

/** Abstract brush marks (no real script): 4x6 cells, '#' full ink, '+' dry brush. */
const GLYPHS = [
  ['..#.', '+##.', '..#.', '.##+', '#.#.', '..#.'],
  ['.+..', '###.', '.#.#', '.#..', '##+.', '.#..'],
  ['#...', '.##+', '..#.', '+##.', '..#.', '.#..'],
  ['..#.', '.#+.', '###.', '..#.', '.#.#', '#...'],
  ['.#..', '.##+', '#.#.', '.#..', '.##.', '...#'],
];

/** Vertical grain on wood: dark streaks that follow the board, in 2-3 px clusters. */
function grain(u: number, v: number, seed: number, amount = 0.72): boolean {
  return noise(u * 1.3, v / 6, 1.2, seed) * 0.7 + noise(u, v / 2.5, 1.5, seed + 1) * 0.3 > amount;
}

function signpost(): WorldSprite {
  const W = 100, H = 130, ox = 50, oy = 116;
  const POST_A = -0.4; // the post turns its broad face to the light and shows a shaded right side
  const A_ANG = -0.18, B_ANG = 0.22;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_OLD, seed, contrast: 1.15, facetVar: 0.02, ...extra });
    const post = sc.add(rotY(box(-3.6, 3.6, 0, 92, -3.6, 3.6), POST_A), wood(101, { ao: 3 }));
    // Tiny hipped cap with a knob on top.
    const capF = sc.add(rotY(loft([rectRing(-7, 7, -7, 7, 93, 3, 0.8, 0.5), rectRing(-7, 7, -7, 7, 94.8, 3, 0.8, 0.5), rectRing(-1.2, 1.2, -1.2, 1.2, 100, 3)], { capStart: true, capEnd: true }), POST_A), { pal: ROOF, seed: 102, contrast: 1.15, facetVar: 0.02 });
    const capB = sc.add(loft([ring(0, 99.5, 0, 1.6, 1.6, 8), ring(0, 101.3, 0, 1.9, 1.9, 8), ring(0, 102.6, 0, 1, 1, 8)], { capEnd: true, smooth: true }), { pal: WOOD_DK, seed: 103 });
    const capBlock = sc.add(rotY(box(-4.4, 4.4, 90.5, 93.2, -4.4, 4.4), POST_A), wood(104, { pal: WOOD_DK }));
    // Arrow boards: the upper one in front pointing right, the lower one behind pointing left.
    const boardA = sc.add(rotY(extrudeXH([[-6.5, 76], [21, 76], [27.5, 80.5], [21, 85], [-6.5, 85]], -6.4, -4.6), A_ANG), wood(105));
    const boardB = sc.add(rotY(extrudeXH([[6.5, 61], [6.5, 69.5], [-20, 69.5], [-26.5, 65.2], [-20, 61]], 4.6, 6.4), B_ANG), wood(106));
    // Stones at the foot.
    const feet: Mesh[] = [];
    const foot = (cx: number, cd: number, rx: number, h: number, seed: number, warm: boolean) =>
      feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.02 }));
    foot(-6.5, -5, 3.6, 3.5, 111, false);
    foot(5.5, -6.5, 4.2, 4, 112, true);
    foot(9.5, -1, 2.6, 2.5, 113, false);
    return { sc, post, capF, capB, capBlock, boardA, boardB };
  };
  // Local (unrotated) coordinates of a world point.
  const unrot = (p: V3, a: number): V3 => {
    const c = Math.cos(-a), s = Math.sin(-a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };
  const rotP = (p: V3, a: number): V3 => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };

  const frame = (t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    // Grain on the post and boards, ink on the board faces.
    for (let i = 0; i < W * H; i++) {
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const p = f.world(i), n = f.normal(i);
      if (mi === parts.post.id) {
        const q = unrot(p, POST_A), nq = unrot(n, POST_A);
        const u = Math.abs(nq[0]) > 0.7 ? q[2] : q[0];
        if (nq[1] < 0.5 && grain(u + (nq[0] < -0.7 ? 20 : 0), q[1], 120)) f.step[i] = Math.max(1, f.step[i] - 1);
        if (nq[1] > 0.5) f.step[i] = 3;
      }
      for (const [mesh, ang, seed, glyphX] of [
        [parts.boardA, A_ANG, 130, [-3, 4.5, 12]],
        [parts.boardB, B_ANG, 140, [-21, -14, -7]],
      ] as [Mesh, number, number, number[]][]) {
        if (mi !== mesh.id) continue;
        const q = unrot(p, ang), nq = unrot(n, ang);
        if (nq[2] > -0.9) continue;
        const bottom = mesh === parts.boardA ? 76 : 61;
        // A plank seam along the board and fine grain.
        if (Math.abs(q[1] - (bottom + 4.5)) < 0.5 && hash(Math.floor(q[0] / 5), 1, seed) > 0.4) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (grain(q[1] * 3, q[0] * 0.5, seed, 0.78)) f.step[i] = Math.max(1, f.step[i] - 1);
        // Ink glyphs.
        glyphX.forEach((gx, k) => {
          const g = GLYPHS[(k + (mesh === parts.boardA ? 0 : 2)) % GLYPHS.length];
          const lx = Math.floor(q[0] - gx), ly = Math.floor(bottom + 7.5 - q[1]);
          if (lx < 0 || lx > 3 || ly < 0 || ly > 5) return;
          const ch = g[ly][lx];
          if (ch === '#') f.over[i] = C(INK, 2);
          else if (ch === '+') f.over[i] = mix(C(INK, 3), C(WOOD_OLD, 2), 0.4);
        });
      }
    }
    // Nails where the boards meet the post.
    for (const [lp, ang] of [
      [[-1.5, 80.5, -6.4], A_ANG],
      [[1.5, 80.5, -6.4], A_ANG],
    ] as [V3, number][]) {
      const [x, y] = f.proj(rotP(lp, ang)).map(Math.round);
      const i = f.idx(x, y);
      if (i >= 0) f.over[i] = C(IRON, 4);
      const j = f.idx(x, y + 1);
      if (j >= 0) f.over[j] = C(IRON, 1);
    }
    const c = f.compose();
    // Rope: two wraps around the post (lit left face, front face), a knot and the ofuda.
    const ropeH = [56, 53.5];
    const corners: V3[] = [[-3.6, 0, -3.6], [3.6, 0, -3.6], [3.6, 0, 3.6]].map((p) => rotP(p as V3, POST_A));
    const rope = layer(W, H, (cv) => {
      for (const hh of ropeH)
        for (let k = 0; k < 2; k++) {
          const a = corners[k], b = corners[k + 1];
          for (let s = 0; s <= 24; s++) {
            const tt = s / 24;
            const pt: V3 = [a[0] + (b[0] - a[0]) * tt + (k === 1 ? 0.6 : 0), hh, a[2] + (b[2] - a[2]) * tt - 0.6];
            const [x, y] = f.proj(pt).map(Math.round);
            cv.set(x, y, C(ROPE, k === 0 ? 4 : 3));
            cv.set(x, y + 1, C(ROPE, k === 0 ? 3 : 2));
          }
        }
    });
    c.draw(rope, 0, 0);
    // The knot sits on the front face near its right edge.
    const [kx, ky] = f.proj(rotP([1.6, 54.5, -4.2], POST_A)).map(Math.round);
    const sway = [0, 1, 2, 2, 1, 0][t % 6];
    const flutter = layer(W, H, (cv) => {
      const knot: [number, number, number][] = [[0, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 4], [1, 1, 2], [0, 2, 2]];
      for (const [dx, dy, s] of knot) cv.set(kx + dx, ky + dy, C(ROPE, s));
      // Two rope tails trailing in the wind.
      const tails = [
        [[1, 3], [1 + (sway > 1 ? 1 : 0), 4], [2 + (sway > 0 ? 1 : 0), 5]],
        [[-1, 3], [-1, 4], [-1 + (sway > 1 ? 1 : 0), 5], [-1 + sway, 6]],
      ];
      for (const tail of tails) tail.forEach(([dx, dy], k) => cv.set(kx + dx, ky + dy, C(ROPE, k === tail.length - 1 ? 2 : 3)));
    });
    // The paper charm hangs from a short cord and swings from its top.
    const paper = layer(W, H, (cv) => {
      const top = ky + 4, len = 15;
      const swing = [0, 1, 2, 3, 2, 1][t % 6];
      const turn = [5, 5, 4, 4, 5, 5][t % 6]; // width: the strip twists edge-on a little at full swing
      cv.set(kx + 1, ky + 3, C(ROPE, 2));
      for (let k = 0; k < len; k++) {
        const tt = k / (len - 1);
        const off = Math.round(swing * tt * tt + (k > 6 ? Math.sin((k + t * 2) * 0.9) * 0.6 : 0));
        const x0 = kx + off;
        for (let u = 0; u < turn; u++) {
          let s = u === 0 ? 4 : u === turn - 1 ? 2 : 3;
          if (k === 0) s = Math.min(5, s + 1);
          if (k === len - 1) s = Math.max(1, s - 1);
          cv.set(x0 + u, top + k, C(PAPER, s));
        }
        // Ink: a vertical line of brush marks and a red seal stamp.
        if (k >= 2 && k <= 11 && k !== 7) cv.set(x0 + Math.floor(turn / 2), top + k, k % 3 === 0 ? mix(C(INK, 3), C(PAPER, 2), 0.3) : C(INK, 2));
        if (k === 4 || k === 9) cv.set(x0 + Math.floor(turn / 2) - 1, top + k, C(INK, 3));
        if (k >= 12 && k <= 13) for (let u = 1; u < turn - 1; u++) cv.set(x0 + u, top + k, C(RED, k === 12 ? 3 : 2));
      }
    });
    c.draw(paper, 0, 0);
    c.draw(flutter, 0, 0);
    c.outline();
    return c;
  };
  const frames = [0, 1, 2, 3, 4, 5].map(frame);
  return finish('signpost', 'Signpost', [0.95, 1.9], ['interactable'], { idle: { frames, fps: 8 } }, ox);
}
