{
  const K = key('breath');
  const dx = K.ax - 4, dy = K.ay - 55;
  console.log('K', K.w, K.h, K.ax, K.ay, 'off', dx, dy);
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  const rocks = union(main, bits);
  pieces(rocks).forEach((pc, k) => {
    const xs = pc.map((i) => i % rocks.w), ys = pc.map((i) => (i / rocks.w) | 0);
    console.log('piece', k, 'n', pc.length, 'x', Math.min(...xs) - dx, Math.max(...xs) - dx, 'y', Math.min(...ys) - dy, Math.max(...ys) - dy);
  });
  const pal = dust.pal;
  const lum = (v: number) => { const c = pal.cols[v - 1]; return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
  for (let y = 48 + dy; y <= 76 + dy; y++) {
    let s = String(y - dy).padStart(3) + ' ';
    for (let x = 14 + dx; x <= 52 + dx; x++) {
      const r = rocks.get(x, y), d = dust.get(x, y);
      s += r ? (pal.kind(r) === 'outline' ? 'O' : lum(r) < 80 ? 'b' : 'B') : d ? (lum(d) < 90 ? 'k' : lum(d) < 130 ? ':' : '.') : ' ';
    }
    console.log(s);
  }
}
