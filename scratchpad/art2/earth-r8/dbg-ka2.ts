{
  const K = key('breath'), seed = 7500, ox = K.ax, oy = K.ay;
  const [rocks0, dust0] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  const { groups } = rigidGroups(rocks0, dust0);
  const W = rocks0.w;
  for (const k of [0, 1, 17, 18, 21, 24, 26]) {
    const g = groups[k];
    const xs = g.px.map((j) => j % W), ys = g.px.map((j) => (j / W) | 0);
    console.log(k, 'n', g.n, 'px', g.px.length, 'box', Math.min(...xs) - ox, Math.min(...ys) - oy, Math.max(...xs) - ox, Math.max(...ys) - oy, 'c', g.c.map((v, i) => Math.round(v - (i ? oy : ox))), 'edge', g.edge);
  }
}
