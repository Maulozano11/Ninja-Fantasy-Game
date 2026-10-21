{
  const KH = key('stream_head');
  const hl = KH.ay + 6;
  const hm = KH.part('main'), hb = KH.part('bits');
  const rock = rockOf(union(hm, hb));
  console.log('KH', KH.w, KH.h, KH.ax, KH.ay, 'line', hl);
  // pieces of rock with top above hl-16
  for (const pc of pieces(rock)) {
    const xs = pc.map((i) => i % rock.w), ys = pc.map((i) => (i / rock.w) | 0);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (pc.length >= 20) console.log('piece', pc.length, 'x', x0, x1, 'y', y0, y1);
  }
  const sm = spikeMask(rockOf(hm), hl);
  // dump ascii of the region around the chunk x 150..185 (padded coords?) 
  const X0 = +process.argv[2], X1 = +process.argv[3], Y0 = +process.argv[4], Y1 = +process.argv[5];
  const r = rockOf(hm);
  for (let y = Y0; y <= Y1; y++) {
    let s = String(y).padStart(3) + ' ';
    for (let x = X0; x <= X1; x++) {
      const v = r.get(x, y), k = r.pal.kind(v);
      s += !v ? (hm.get(x,y) ? ',' : '.') : sm[y * r.w + x] ? (k === 'outline' ? 'O' : 'B') : (k === 'outline' ? 'o' : 'b');
    }
    console.log(s);
  }
}
