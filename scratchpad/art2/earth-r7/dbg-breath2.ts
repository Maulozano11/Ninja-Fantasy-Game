{
  const K = key('breath');
  const dx = K.ax - 4, dy = K.ay - 55;
  const [rocks0, dust] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  const pal = dust.pal;
  const lum = (v: number) => { const c = pal.cols[v - 1]; return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
  const rocks = rocks0.clone();
  pieces(rocks0).forEach((pc) => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const j of pc) {
      x0 = Math.min(x0, j % rocks0.w); x1 = Math.max(x1, j % rocks0.w);
      y0 = Math.min(y0, (j / rocks0.w) | 0); y1 = Math.max(y1, (j / rocks0.w) | 0);
    }
    const sub = new Layer(rocks0.pal, x1 - x0 + 11, y1 - y0 + 11);
    for (const j of pc) sub.set((j % rocks0.w) - x0 + 5, ((j / rocks0.w) | 0) - y0 + 5, 1);
    const inside = silhouette(sub, 3);
    for (let y = 0; y < sub.h; y++) for (let x = 0; x < sub.w; x++) {
      const X = x + x0 - 5, Y = y + y0 - 5;
      if (inside[y * sub.w + x] && !sub.get(x, y) && !rocks0.get(X, Y) && dust.get(X, Y)) rocks.set(X, Y, dust.get(X, Y));
    }
  });
  console.log('dust median-dark threshold check');
  for (let y = 48 + dy; y <= 70 + dy; y++) {
    let s = String(y - dy).padStart(3) + ' ';
    for (let x = 14 + dx; x <= 52 + dx; x++) {
      const r = rocks.get(x, y), r0 = rocks0.get(x, y), d = dust.get(x, y);
      s += r0 ? (pal.kind(r0) === 'dust' ? 'h' : pal.kind(r0) === 'outline' ? 'O' : 'B') : r ? 'e' : d ? (lum(d) < 90 ? 'k' : lum(d) < 120 ? ':' : '.') : ' ';
    }
    console.log(s);
  }
}
