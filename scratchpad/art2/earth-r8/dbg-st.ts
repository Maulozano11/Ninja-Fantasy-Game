{
  const K = key('blast');
  const ox = K.ax - 122, oy = K.ay - 134;
  const [rocks0] = splitFlecks(union(K.part('main'), K.part('bits')));
  const L = solidPebbles(rocks0);
  pieces(L).forEach((pc, k) => {
    if (pc.length < 8) return;
    const [cx, cy] = centre(L, pc);
    let sxx = 0, syy = 0, sxy = 0;
    for (const i of pc) { const dx = (i % L.w) - cx, dy = ((i / L.w) | 0) - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= pc.length; syy /= pc.length; sxy /= pc.length;
    const m = (sxx + syy) / 2, r = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
    const l1 = m + r, l2 = Math.max(0.05, m - r);
    const len = Math.sqrt(12 * l1);
    console.log(k, 'n', pc.length, 'at', Math.round(cx - ox), Math.round(cy - oy), 'elong', Math.sqrt(l1 / l2).toFixed(2), 'width', (pc.length / len).toFixed(2), 'len', len.toFixed(1));
  });
}
