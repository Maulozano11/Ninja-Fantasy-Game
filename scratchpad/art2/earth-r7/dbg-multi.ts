{
  for (const nm of ['multi', 'bolt']) {
    const K = key(nm);
    const ax = nm === 'multi' ? 66 : 100, ay = nm === 'multi' ? 41 : 38;
    const dx = K.ax - ax, dy = K.ay - ay;
    console.log(nm, 'K', K.w, K.h, K.ax, K.ay, 'off', dx, dy, 'parts', Object.keys(EV3_REF[nm].pieces).join(','));
    const all = union(K.part('under'), K.part('dust'), K.part('main'), K.part('bits'), ...['b0', 'b1', 'b2', 'boulder'].filter((p) => K.has(p)).map((p) => K.part(p)));
    const pal = all.pal;
    pal.cols.forEach((c, i) => {
      const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
      console.log(' pal', i + 1, pal.kinds[i], c.join(','), 'lum', l.toFixed(0));
    });
    const X0 = +process.argv[2] + dx, X1 = +process.argv[3] + dx, Y0 = +process.argv[4] + dy, Y1 = +process.argv[5] + dy;
    if (nm !== 'multi') continue;
    for (let y = Y0; y <= Y1; y++) {
      let s = String(y - dy).padStart(3) + ' ';
      for (let x = X0; x <= X1; x++) {
        const v = all.get(x, y);
        s += !v ? '  .' : String(v).padStart(3);
      }
      console.log(s);
    }
  }
}
