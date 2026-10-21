
{
  for (const nm of ['hit', 'multi_hit']) {
    const K = key(nm);
    const all = union(K.part('main'), K.part('bits'));
    const [rocks0, flecks] = splitFlecks(all);
    console.log(nm, 'key', K.w, K.h, K.ax, K.ay);
    const pcs = pieces(flecks);
    pcs.forEach((pc, k) => {
      const [cx, cy] = centre(flecks, pc);
      if (Math.hypot(cx - K.ax, cy - K.ay) < 14) console.log(' fleck', k, 'n', pc.length, 'c', cx.toFixed(1), cy.toFixed(1));
    });
    const rows: string[] = [];
    for (let y = K.ay - 10; y <= K.ay + 10; y++) {
      let s = '';
      for (let x = K.ax - 14; x <= K.ax + 14; x++) s += flecks.get(x, y) ? 'F' : rocks0.get(x, y) ? 'R' : K.part('dust').get(x, y) ? '.' : ' ';
      rows.push(String(y).padStart(4) + ' ' + s);
    }
    console.log(rows.join('\n'));
  }
}
