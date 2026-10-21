
{
  const K = key('breath');
  const [rocks0, dust] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  const pcs = pieces(rocks0);
  pcs.forEach((pc, k) => {
    const [cx, cy] = centre(rocks0, pc);
    if (cx > 119 && cx < 141 && cy > 51 && cy < 77) {
      const u = (t: number) => drift(t, rr(7500 + 2, k, 0, 1));
      console.log('piece', k, 'n', pc.length, 'c', cx.toFixed(1), cy.toFixed(1), 'steps', [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const uu = u(i / 8); const a = Math.atan2(cy - K.ay, cx - K.ax); const st = (pc.length > 30 ? 5 : 9) * uu; return [Math.round(Math.cos(a) * st), Math.round(Math.sin(a) * st + 1.5 * uu * uu)].join(','); }).join(' '));
    }
  });
  const rows: string[] = [];
  for (let y = 51; y <= 77; y++) {
    let s = '';
    for (let x = 119; x <= 141; x++) {
      const v = dust.get(x, y);
      s += v ? String(dustLevel(dust.pal, v)) : rocks0.get(x, y) ? 'R' : ' ';
    }
    rows.push(String(y).padStart(4) + ' ' + s);
  }
  console.log(rows.join('\n'));
}
