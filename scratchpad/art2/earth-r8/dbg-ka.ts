{
  const rep = (name: string, groups: Group[], lead: number[]) => {
    const merged = lead.filter((l, k) => l !== k).length;
    console.log(name, 'rigid rocks', groups.length, 'moving with another', merged);
  };
  {
    const K = key('bolt'), seed = 7100;
    const [bits, dust0] = withHalo(K.part('bits'), dustOf(K));
    const { groups } = rigidGroups(bits, dust0);
    rep('bolt', groups, keepApart(bits, groups, (k, _g, t) => ellipse(t, rr(seed + 2, k, 0, TAU), 2, 1), FLY_N));
  }
  {
    const K = key('slash'), seed = 7300;
    const [bits, dust0] = withHalo(K.part('bits'), dustOf(K));
    const { groups } = rigidGroups(bits, dust0);
    rep('slash', groups, keepApart(bits, groups, (k, _g, t) => ellipse(t, rr(seed + 2, k, 0, TAU), 1.6, 0.8), FLY_N));
  }
  {
    const K = key('breath'), seed = 7500, ox = K.ax, oy = K.ay;
    const [rocks0, dust0] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
    const { groups } = rigidGroups(rocks0, dust0);
    const path = (k: number, gp: Group, t: number): [number, number] => {
      const [cx, cy] = gp.c, n = gp.n;
      const dist = Math.hypot(cx - ox, cy - oy);
      if (n > 220 || gp.edge || dist < 12) return [0, 0];
      const a = Math.atan2(cy - oy, cx - ox);
      return ellipse(t, rr(seed + 2, k, 0, TAU), n > 30 ? 1.6 : 2, 1, Math.cos(a), Math.sin(a));
    };
    const lead = keepApart(rocks0, groups, path, FLY_N);
    rep('breath', groups, lead);
    lead.forEach((l, k) => { if (l !== k) console.log('  breath rock', k, 'n', groups[k].n, 'at', groups[k].c.map(Math.round), 'moves with', l, 'n', groups[l].n, 'at', groups[l].c.map(Math.round)); });
  }
}
