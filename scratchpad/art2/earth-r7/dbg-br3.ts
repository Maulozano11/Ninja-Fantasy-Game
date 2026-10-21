{
  const K = key('breath'), seed = 7500;
  const ox = K.ax, oy = K.ay;  // the cone's tip (the caster's mouth or hands): the anchor
  const [rocks0, dust] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  // A tumbling rock is one thing: his light dust inside its outline (the pixels its rim encloses,
  // gaps of up to about 6 px closed) travels with it, whole pixels at a time, so its outline stays closed and
  // its light face never churns with the cloud behind it. Each rock keeps its own size and centre
  // for its motion.
  // (a rock is a group: his rims break at our size, so the bits of one rock (pieces of rock 2 px
  // apart or less) are one rock, with one beat, never drifting apart into slivers)
  const W0 = rocks0.w;
  const grpOf = new Int32Array(rocks0.v.length).fill(-1);
  {
    const near = grow(rocks0.v.map((v) => (v ? 1 : 0)), W0, rocks0.h, 1);
    const g = rocks0.empty();
    for (let j = 0; j < near.length; j++) g.v[j] = near[j];
    pieces(g).forEach((pc, k) => {
      for (const j of pc) if (rocks0.v[j]) grpOf[j] = k;
    });
  }
  const groups0 = new Map<number, number[]>();
  for (let j = 0; j < rocks0.v.length; j++) if (grpOf[j] >= 0) {
    const a = groups0.get(grpOf[j]) ?? [];
    a.push(j);
    groups0.set(grpOf[j], a);
  }
  const rocks = rocks0.clone();
  const groups = [...groups0.values()].map((pc) => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const j of pc) {
      x0 = Math.min(x0, j % W0); x1 = Math.max(x1, j % W0);
      y0 = Math.min(y0, (j / W0) | 0); y1 = Math.max(y1, (j / W0) | 0);
    }
    const sub = new Layer(rocks0.pal, x1 - x0 + 11, y1 - y0 + 11);
    for (const j of pc) sub.set((j % W0) - x0 + 5, ((j / W0) | 0) - y0 + 5, 1);
    // (the face a rock encloses: what each of its pieces of 10 px or more encloses with gaps of up
    // to about 6 px closed, and what the group encloses with gaps of 2 px closed; a few loose
    // specks near one another enclose no more, or they would carry off a bite of the cloud)
    const inside = silhouette(sub, 1);
    const sub1 = sub.empty();
    for (const q of pieces(sub)) {
      if (q.length < 10) continue;
      sub1.v.fill(0);
      for (const j of q) sub1.v[j] = 1;
      const si = silhouette(sub1, 3);
      for (let j = 0; j < si.length; j++) if (si[j]) inside[j] = 1;
    }
    const px = [...pc];
    for (let y = 0; y < sub.h; y++) for (let x = 0; x < sub.w; x++) {
      const X = x + x0 - 5, Y = y + y0 - 5;
      if (inside[y * sub.w + x] && !sub.get(x, y) && !rocks0.get(X, Y) && !rocks.get(X, Y) && dust.get(X, Y)) {
        rocks.set(X, Y, dust.get(X, Y));
        px.push(Y * W0 + X);
      }
    }
    // (a few specks on the cloud's own edge are its rim, not flying rocks: they stay with it)
    const edge = pc.length < 8 && pc.some((j) => [j - 1, j + 1, j - W0, j + W0].some((u) => !rocks0.v[u] && !dust.v[u]));
    return { px, n: pc.length, c: centre(rocks0, pc), edge };
  });
  
  groups.forEach((g, k) => { const [cx, cy] = g.c; if (Math.hypot(cx - ox, cy - oy) < 14) console.log("group", k, "n", g.n, "edge", g.edge, "c", (cx - ox).toFixed(1), (cy - oy).toFixed(1), g.px.map((j) => [(j % W0) - ox, ((j / W0) | 0) - oy].join(",")).join(" ")); });
}
