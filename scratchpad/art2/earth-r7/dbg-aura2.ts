{
  for (const nm of ['aura_back', 'aura']) {
    const K = key(nm);
    const rocks = union(K.part('main'), K.part('bits'));
    const dust = dustOf(K);
    const dx = K.ax - 58, dy = K.ay - 119;
    pieces(rocks).forEach((pc, k) => {
      if (pc.length > 12) return;
      const [cx, cy] = centre(rocks, pc);
      const s = new Set(pc);
      let ring = 0, dn = 0;
      const seen = new Set<number>();
      for (const i of pc) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const j = i + oy * rocks.w + ox;
        if (s.has(j) || seen.has(j)) continue;
        seen.add(j); ring++;
        if (dust.v[j]) dn++;
      }
      console.log(nm, k, 'n', pc.length, 'at', (cx - dx).toFixed(0), (cy - dy).toFixed(0), 'dust ring frac', (dn / ring).toFixed(2), cy > K.ay - 2 ? 'ground' : '');
    });
  }
}
