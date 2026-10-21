{
  const KB = key('aura_back');
  const ox = KB.ax - 58, oy = KB.ay - 119;
  console.log('KB', KB.w, KB.h, KB.ax, KB.ay, 'offset', ox, oy);
  const [X0, X1, Y0, Y1] = process.argv.slice(2, 6).map(Number);
  for (const n of ['main', 'bits', 'dust', 'under']) {
    const L = KB.part(n);
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
  const rocks = union(KB.part('main'), KB.part('bits'));
  for (const pc of pieces(rocks)) {
    const xs = pc.map((i) => i % rocks.w - ox), ys = pc.map((i) => ((i / rocks.w) | 0) - oy);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    if (x0 > X1 || Math.max(...xs) < X0 || y0 > Y1 || Math.max(...ys) < Y0) continue;
    console.log('piece', pc.length, 'x', x0, Math.max(...xs), 'y', y0, Math.max(...ys), 'outline', pc.some((j) => rocks.pal.kind(rocks.v[j]) === 'outline'));
  }
}
