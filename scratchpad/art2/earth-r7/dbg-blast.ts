{
  const K = key('blast');
  const dx = K.ax - 122, dy = K.ay - 134;
  console.log('K', K.w, K.h, K.ax, K.ay, 'off', dx, dy);
  const loose0 = union(K.part('main'), K.part('bits'));
  const [rocks0, flecks] = splitFlecks(loose0);
  const dust = union(K.part('under'), K.part('dust'));
  for (const [nm, L] of [['fleck', flecks], ['rock', rocks0], ['footrock', K.part('rocks')]] as [string, Layer][]) {
    pieces(L).forEach((pc, k) => {
      const xs = pc.map((i) => i % L.w), ys = pc.map((i) => (i / L.w) | 0);
      const onDust = pc.filter((i) => dust.v[i] || [i - 1, i + 1, i - L.w, i + L.w].some((u) => dust.v[u])).length;
      if (pc.length >= 8) console.log(nm, k, 'n', pc.length, 'x', Math.min(...xs) - dx, Math.max(...xs) - dx, 'y', Math.min(...ys) - dy, Math.max(...ys) - dy, 'onDust', onDust);
    });
  }
}
