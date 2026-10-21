function hokora(): WorldSprite {
  const W = 90, H = 110, ox = 45, oy = 92;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number): MeshOpts => ({ pal: STONE, seed, tex: 0.04, texCell: 8, contrast: 1.1, ao: 2, steps: [1, 2, 3, 4, 5], bias: -0.06 });
  const lac = (p: number, seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: p, seed, contrast: 1.15, facetVar: 0.02, steps: [1, 2, 3, 4, 5], ...extra });
  // Stone plinth: a footing, a pedestal and a top slab deep enough to hold the offering.
  const foot = sc.add(slab(-17, 17, 0, 5, -14, 11, 1.2), st(81));
  const ped = sc.add(slab(-11, 11, 5, 14, -9.5, 7, 1), st(82));
  const top = sc.add(slab(-14.5, 14.5, 14, 18, -13, 9.5, 1.1), st(83));
  // Black floor, white walls, vermilion posts, sill and lintel, a black head beam.
  const B0 = 20; // floor top
  sc.add(slab(-11.5, 11.5, 18, B0, -9, 6.5, 0.6), lac(BLACK, 84));
  sc.add(box(-8.5, 8.5, B0, B0 + 17, -6.2, 4.5), lac(PAPER, 85, { contrast: 0.9 }));
  sc.add(box(-9.2, -6.6, B0, B0 + 16.6, -7.2, -4.8), lac(RED, 86));
  sc.add(box(6.6, 9.2, B0, B0 + 16.6, -7.2, -4.8), lac(RED, 87));
  sc.add(box(-9.2, 9.2, B0, B0 + 1.6, -7, -5.3), lac(RED, 88));
  sc.add(box(-9.2, 9.2, B0 + 12.6, B0 + 14.2, -7.1, -5.3), lac(RED, 89));
  sc.add(box(-11.2, 11.2, B0 + 15.6, B0 + 17.8, -7.8, -4.6), lac(BLACK, 90));
  // The roof's curve: steep at the ridge, sagging toward the eaves, flicking up at the tips.
  const X = 16.5, EAVE = B0 + 19.6, RISE = 14;
  const hOf = (x: number): number => {
    const ax = Math.abs(x);
    if (ax > X) return EAVE + (ax - X) * 0.65;
    const t = ax / X;
    return EAVE + RISE - RISE * (0.55 * t + 0.45 * (2 * t - t * t));
  };
  const APEX = EAVE + RISE;
  const d0 = -9.8, d1 = 6;
  // White gable under the bargeboards, with a red tie beam and king post.
  const gxs = [9, 6.75, 4.5, 2.25, 0, -2.25, -4.5, -6.75, -9];
  sc.add(extrudeXH([[-9, B0 + 17.8], [9, B0 + 17.8], ...gxs.map((x) => [x, hOf(x) - 2.1] as [number, number])], -8, -6.8), lac(PAPER, 91, { contrast: 0.9 }));
  sc.add(box(-7, 7, B0 + 20.6, B0 + 22, -8.6, -7.6), lac(RED, 92));
  sc.add(box(-0.85, 0.85, B0 + 22, APEX - 3.5, -8.5, -7.6), lac(RED, 93));
  const xs = [-18, -16.5, -14, -11.5, -9, -6.75, -4.5, -2.25, 0, 2.25, 4.5, 6.75, 9, 11.5, 14, 16.5, 18];
  const roof = sc.add(shell(xs, hOf, d0, d1, 2), { pal: HIWADA, seed: 94, contrast: 1.25, facetVar: 0.02, steps: [1, 2, 3, 4, 5] });
  const xsB = [-18.4, ...xs.slice(1, -1), 18.4];
  const barge = sc.add(shell(xsB, (x) => hOf(x) + 0.6, d0 - 0.8, d0 + 0.8, 2.5), lac(BLACK, 95));
  sc.add(box(-1.2, 1.2, APEX - 0.7, APEX + 1.2, d0 - 0.3, d1 - 0.5), lac(BLACK, 96));
  // Chigi: the bargeboards cross at the apex and run on past it as a V.
  const chigi = [0.66, -0.66].map((a, k) => sc.add(rotZ(box(-0.8, 0.8, APEX - 1, APEX + 6.2, d0 - 0.6, d0 + 0.6), a, 0, APEX), lac(BLACK, 97 + k)));
  const katsuo = [-2.5, 3].map((dk, k) => sc.add(pole([-3, APEX + 2, dk], [3, APEX + 2, dk], 1.1, 8), lac(BLACK, 99 + k)));
  const f = render(sc, W, H, ox, oy);
  const stone = [foot.id, ped.id, top.id];
  // Bark courses on the roof: a dark seam every 2.2 px of rise with a lit edge above it.
  for (let i = 0; i < W * H; i++) {
    if (!isBare(f, i, [roof.id]) || f.normal(i)[1] < 0.3) continue;
    const p = f.world(i);
    const r = (((APEX - p[1]) % 2.2) + 2.2) % 2.2;
    if (r < 0.65) f.step[i] = Math.max(1, f.step[i] - 1);
    else if (r > 1.7 && f.lightv[i] > 0.5) f.step[i] = Math.min(6, f.step[i] + 1);
  }
  // A lit edge along the top of the left bargeboard and gilt caps on the katsuogi and chigi tips.
  for (let i = 0; i < W * H; i++) {
    const mi = f.mesh[i];
    if (mi < 0) continue;
    const p = f.world(i);
    if (katsuo.some((k) => k.id === mi) && Math.abs(p[0]) > 2.1) {
      f.pal[i] = GOLD;
      f.step[i] = clamp(f.step[i] + 1, 2, 6);
    }
    if (mi === barge.id && f.normal(i)[1] > 0.3 && p[0] < 0) f.step[i] = Math.min(6, f.step[i] + 1);
    if (chigi.some((k) => k.id === mi) && p[1] > APEX + 4) {
      f.pal[i] = GOLD;
      f.step[i] = clamp(f.step[i] + 1, 2, 5);
    }
  }
  paintMoss(f, { meshes: [roof.id], amount: 0.26, seed: 811, cell: 6, drip: 1, minUp: 0.3, bumps: true, tufts: 0.18 });
  paintMoss(f, { meshes: [foot.id], amount: 0.4, seed: 812, cell: 6, drip: 2, tufts: 0.18 });
  paintMoss(f, { meshes: [top.id], amount: 0.22, seed: 815, cell: 5, drip: 2, tufts: 0.12 });
  paintStreaks(f, { meshes: stone, seed: 816, density: 0.22, maxLen: 6 });
  paintLichen(f, { meshes: stone, seed: 813, density: 0.16, minLight: 0.35 });
  autoChips(f, { meshes: stone, seed: 817, density: 0.08, gap: 6 });
  paintCrack(f, crackPath(ox + 6, oy - 11, 6, 818, { branch: true }), [ped.id]);
  const fr = (x: number, h: number, d: number) => f.proj([x, h, d]).map(Math.round) as [number, number];
  const c0 = f.compose();
  // Doors: two black lacquer leaves in a lit frame, gilt studs, hinges and pulls.
  const [dx0, dy0] = fr(-6.6, B0 + 12.6, -6.3);
  const [dx1, dy1] = fr(6.6, B0 + 1.6, -6.3);
  const midX = Math.floor((dx0 + dx1) / 2);
  for (let y = dy0; y < dy1; y++)
    for (let x = dx0; x < dx1; x++) {
      const u = x - dx0, v = y - dy0;
      let s: number;
      if (v === 0) s = 1; // under the lintel
      else if (u === 0 || x === midX) s = 4; // lit left edge of each leaf
      else if (x === dx1 - 1 || x === midX - 1) s = 2;
      else if (y === dy1 - 1) s = 2;
      else s = v < 3 ? 2 : 3;
      c0.set(x, y, C(BLACK, s));
    }
  for (const x of [dx0 + 2, midX + 2]) for (const y of [dy0 + 2, dy1 - 3]) c0.set(x, y, C(GOLD, x < midX ? 5 : 4));
  c0.set(midX - 2, dy0 + 6, C(GOLD, 5));
  c0.set(midX + 1, dy0 + 6, C(GOLD, 4));
  // Gegyo: a gilt boss where the bargeboards meet.
  {
    const [gx, gy] = fr(0, APEX - 3.4, d0 - 1);
    const boss: [number, number, number][] = [[-1, 0, 4], [0, 0, 6], [1, 0, 3], [0, 1, 3]];
    for (const [dx, dy, s] of boss) c0.set(gx + dx, gy + dy, C(GOLD, s));
  }
  // Shimenawa: a twisted straw rope sagging between the posts, thickest in the middle, with shide.
  const sh = new Canvas(W, H);
  const ropeH = B0 + 15.2, ropeX = 9.6, sagMax = 2;
  const ropeAt = (x: number): [number, number] => fr(x, ropeH - sagMax * (1 - (x / ropeX) ** 2), -9);
  const ropePts: [number, number][] = [];
  for (let k = 0; k <= 20; k++) ropePts.push(f.proj([-ropeX + k * (ropeX / 10), ropeH - sagMax * (1 - ((-ropeX + k * (ropeX / 10)) / ropeX) ** 2), -9]));
  drawRope(sh, ropePts, 3, ROPE_R, { period: 3, taper: true, steps: [1, 2, 3, 4, 5] });
  // Straw tassels (shime-no-ko) and two shide.
  for (const x of [-6.5, 0, 6.5]) {
    const [tx, ty] = ropeAt(x);
    for (let k = 2; k <= 3; k++) sh.set(tx, ty + k, C(ROPE, k === 3 ? 2 : 3));
  }
  for (const [x, dir] of [[-3.4, 1], [3.2, -1]] as [number, 1 | -1][]) {
    const [tx, ty] = ropeAt(x);
    drawShide(sh, tx, ty + 2, 4, PAPER_R, { dir });
  }
  c0.draw(sh, 0, 0);
  // Offering on the slab: kagami mochi with a mikan on a little hinoki stand, sakaki in two vases.
  const off = new Canvas(W, H);
  {
    const [cx, by] = fr(0, 18, -11.2);
    const MIKAN = rampOf(['#5a2408', '#a2440f', '#d9701c', '#f29a34', '#fbc25e']);
    const rows: [number, string][] = [
      [-7, '...l...'],
      [-6, '..mmm..'],
      [-5, '..wwW..'],
      [-4, '.wwwwW.'],
      [-3, 'wwwwwwW'],
      [-2, 'ttttttt'],
      [-1, '.s...s.'],
    ];
    for (const [dy, row] of rows)
      [...row].forEach((ch, k) => {
        const x = cx - 3 + k, y = by + dy;
        const lit = k < 3;
        if (ch === 'l') off.set(x, y, C(MOSS, 4));
        else if (ch === 'm') off.set(x, y, MIKAN[k === 2 ? 4 : k === 3 ? 3 : 2]);
        else if (ch === 'w') off.set(x, y, C(PAPER, dy === -3 && k > 4 ? 3 : lit ? 6 : 5));
        else if (ch === 'W') off.set(x, y, C(PAPER, 3));
        else if (ch === 't') off.set(x, y, C(WOOD, k < 2 ? 6 : k > 5 ? 4 : 5));
        else if (ch === 's') off.set(x, y, C(WOOD, 3));
      });
    for (const sx of [-12.4, 12.4]) {
      const [vx, vy] = fr(sx, 18, -11);
      // Vase.
      off.set(vx, vy - 1, C(PAPER, sx < 0 ? 5 : 4));
      off.set(vx + 1, vy - 1, C(PAPER, 3));
      off.set(vx, vy - 2, C(PAPER, sx < 0 ? 6 : 5));
      off.set(vx + 1, vy - 2, C(PAPER, 4));
      off.set(vx, vy - 3, C(PAPER, 4));
      // Sakaki: a fan of glossy dark leaves.
      const leaves: [number, number, number][] = [[0, -4, 3], [1, -4, 2], [-1, -5, 4], [0, -5, 3], [1, -5, 3], [2, -5, 2], [0, -6, 5], [-1, -6, 3], [1, -6, 4], [0, -7, 4], [2, -6, 2]];
      for (const [dx, dy, s] of leaves) off.set(vx + dx, vy + dy, C(MOSS, s - 1));
    }
  }
  outlineTinted(off);
  c0.draw(off, 0, 0);
  seal(c0, f);
  baseTufts(c0, [[ox - 15, 3], [ox + 14, 3]], 819, 4);
  return finish('hokora', 'Roadside Shrine', [0.65, 1.3], ['interactable'], { idle: { frames: [c0], fps: 0 } }, ox);
}

