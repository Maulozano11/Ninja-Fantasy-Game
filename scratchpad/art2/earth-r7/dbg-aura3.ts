{
  for (const nm of ['aura_back', 'aura']) {
    const K = key(nm);
    const rocks = union(K.part('main'), K.part('bits'));
    const dx = K.ax - 58, dy = K.ay - 119;
    pieces(rocks).forEach((pc, k) => {
      if (pc.length > 12) return;
      const [cx, cy] = centre(rocks, pc);
      const lum = pc.map((i) => { const c = rocks.pal.cols[rocks.v[i] - 1]; return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; });
      const ol = pc.filter((i) => rocks.pal.kind(rocks.v[i]) === 'outline').length;
      console.log(nm, k, 'n', pc.length, 'at', (cx - dx).toFixed(0), (cy - dy).toFixed(0), 'outline', ol, 'lum max', Math.max(...lum).toFixed(0), 'mean', (lum.reduce((a, b) => a + b, 0) / lum.length).toFixed(0));
    });
  }
}
