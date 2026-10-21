{
  const KH = key('stream_head');
  const hl = KH.ay + 6;
  const ox = KH.ax - 32, oy = KH.ay - 63;
  console.log('KH', KH.w, KH.h, KH.ax, KH.ay, 'line', hl, 'offset out->padded', ox, oy);
  const parts = ['main', 'bits', 'dust', 'under'].map((n) => [n, KH.part(n)] as [string, Layer]);
  const [X0, X1, Y0, Y1] = process.argv.slice(2, 6).map(Number);
  for (const [n, L] of parts) {
    console.log('part', n);
    for (let y = Y0; y <= Y1; y++) {
      let s = String(y).padStart(3) + ' ';
      for (let x = X0; x <= X1; x++) {
        const v = L.get(x + ox, y + oy), k = L.pal.kind(v);
        s += !v ? '.' : k === 'outline' ? 'O' : k === 'body' ? 'B' : k === 'dust' ? String(dustLevel(L.pal, v)) : 's';
      }
      console.log(s);
    }
  }
  const hb = KH.part('bits');
  for (const pc of pieces(hb)) {
    const [cx, cy] = centre(hb, pc);
    const xs = pc.map((i) => i % hb.w), ys = pc.map((i) => (i / hb.w) | 0);
    console.log('bit', pc.length, 'out x', Math.min(...xs) - ox, Math.max(...xs) - ox, 'y', Math.min(...ys) - oy, Math.max(...ys) - oy, cx < KH.ax ? 'over' : 'own', cy < hl - 4 ? 'up' : 'low');
  }
}
