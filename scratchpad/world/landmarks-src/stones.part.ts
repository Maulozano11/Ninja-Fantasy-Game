/**
 * A faceted stone: jittered rings stacked by `profile` ([height fraction, radius fraction]),
 * leaning toward `lean` px at the top, closed by a low pyramid so the top breaks into facets.
 */
function rockMesh(o: { cx: number; cd: number; rx: number; rd: number; h: number; n?: number; seed: number; lean?: number; leanD?: number; profile?: [number, number][]; rot?: number; jit?: number; hJit?: number; h0?: number; apexUp?: number }): Tri[] {
  const prof = o.profile ?? [[0, 0.9], [0.32, 1], [0.72, 0.82], [0.94, 0.45]];
  const n = o.n ?? 8;
  const h0 = o.h0 ?? 0;
  const rings = prof.map(([hf, rf], k) =>
    ring(o.cx + (o.lean ?? 0) * hf, h0 + hf * o.h, o.cd + (o.leanD ?? 0) * hf, o.rx * rf, o.rd * rf, n, {
      rot: (o.rot ?? 0.3) + (k % 2) * (Math.PI / n) * 0.35,
      jit: o.jit ?? 0.12,
      hJit: k > 0 ? o.h * (o.hJit ?? 0.05) : 0,
      seed: o.seed + k * 7,
    }),
  );
  const apex: V3 = [o.cx + (o.lean ?? 0) * 1.05 + (rnd(o.seed, 9) - 0.5) * o.rx * 0.3, h0 + o.h * (1 + (o.apexUp ?? 0.03)), o.cd + (o.leanD ?? 0) + (rnd(o.seed, 10) - 0.5) * o.rd * 0.3];
  return loft(rings, { capEnd: apex });
}

function boulder(): WorldSprite {
  const W = 130, H = 110, ox = 62, oy = 90;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.035, texCell: 10, contrast: 1.2, facetVar: 0.07, ao: 3, form: 0.35, ...extra });
  const main = sc.add(rockMesh({ cx: -3, cd: 0, rx: 39, rd: 22, h: 52, n: 8, seed: 21, lean: -7, leanD: 2, profile: [[0, 0.86], [0.22, 1], [0.6, 0.9], [0.88, 0.55]], rot: 0.25, jit: 0.12, hJit: 0.07 }), st(21));
  const lump = sc.add(rockMesh({ cx: 25, cd: -7, rx: 18, rd: 13, h: 24, n: 7, seed: 22, lean: -2, profile: [[0, 0.95], [0.4, 1], [0.8, 0.7]], rot: 0.6, jit: 0.15 }), st(22));
  const feet: Mesh[] = [];
  const foot = (cx: number, cd: number, rx: number, h: number, seed: number, warm = false) =>
    feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.02 }));
  foot(40, -16, 5.5, 5, 31);
  foot(48, -10, 3.5, 3.5, 32, true);
  foot(-38, -16, 4.5, 4, 33, true);
  foot(-30, -21, 3, 2.5, 34);
  foot(33, -21, 2.5, 2.5, 35);
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [main.id], amount: 0.5, seed: 401, cell: 10, drip: 3, minUp: 0.4, bumps: true });
  paintMoss(f, { meshes: [lump.id], amount: 0.3, seed: 402, cell: 7, drip: 2, minUp: 0.4 });
  paintLichen(f, { meshes: [main.id, lump.id], seed: 410, density: 0.28, minLight: 0.35 });
  paintCrack(f, [[ox - 9, oy - 30], [ox - 7, oy - 26], [ox - 8, oy - 22], [ox - 5, oy - 17], [ox - 5, oy - 13]], [main.id]);
  paintCrack(f, [[ox + 15, oy - 40], [ox + 17, oy - 36], [ox + 16, oy - 33]], [main.id]);
  paintCrack(f, [[ox - 26, oy - 13], [ox - 24, oy - 10], [ox - 25, oy - 7]], [main.id]);
  const c = f.compose();
  c.outline();
  return finish('boulder', 'Mossy Boulder', [1.6, 1.3], ['cover-3q', 'climbable'], { idle: { frames: [c], fps: 0 } }, ox);
}

function rock(): WorldSprite {
  const W = 80, H = 60, ox = 38, oy = 46;
  GROUP = 1;
  const sc = new Scene();
  const main = sc.add(rockMesh({ cx: 0, cd: 0, rx: 23, rd: 13, h: 21, n: 8, seed: 51, lean: -4, profile: [[0, 0.92], [0.35, 1], [0.75, 0.8], [0.95, 0.45]], rot: 0.5, jit: 0.12 }), { pal: STONE, seed: 51, tex: 0.035, texCell: 9, contrast: 1.2, facetVar: 0.07, ao: 2, form: 0.35 });
  const side = sc.add(rockMesh({ cx: 17, cd: -6, rx: 7, rd: 5, h: 6, n: 6, seed: 52, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.15 }), { pal: STONE_W, seed: 52, bias: -0.02 });
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [main.id], amount: 0.3, seed: 451, cell: 6, drip: 2, minUp: 0.45 });
  paintLichen(f, { meshes: [main.id], seed: 452, density: 0.3, minLight: 0.35 });
  paintCrack(f, [[ox + 4, oy - 17], [ox + 6, oy - 13], [ox + 5, oy - 9]], [main.id]);
  void side;
  const c = f.compose();
  c.outline();
  return finish('rock', 'Rock', [0.9, 0.6], ['cover-half'], { idle: { frames: [c], fps: 0 } }, ox);
}

function pebbles(): WorldSprite {
  const W = 50, H = 30, ox = 24, oy = 22;
  GROUP = 1;
  const sc = new Scene();
  const list: [number, number, number, number, number, boolean][] = [
    // cx, cd, rx, h, seed, warm
    [-6, 2, 7, 6, 61, false],
    [5, -1, 6, 5, 62, true],
    [-13, -4, 4, 3.5, 63, true],
    [12, -6, 4, 3, 64, false],
    [0, -8, 3.5, 3, 65, false],
    [-2, 9, 4.5, 4, 66, true],
    [13, 5, 3, 2.5, 67, false],
  ];
  for (const [cx, cd, rx, h, seed, warm] of list)
    sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 7, seed, profile: [[0, 0.9], [0.45, 1], [0.85, 0.65]], jit: 0.12, apexUp: 0.05 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.04 });
  const f = render(sc, W, H, ox, oy);
  const c = f.compose();
  c.outline();
  return finish('rocks_small', 'Pebbles', [0.6, 0.25], ['ambient'], { idle: { frames: [c], fps: 0 } }, ox);
}
