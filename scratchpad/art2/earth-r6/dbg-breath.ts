
{
  const K = key('breath');
  const dx = K.ax - 4, dy = K.ay - 55;
  console.log('breath key', K.w, K.h, K.ax, K.ay, 'offset', dx, dy, Object.keys(EV3_REF.breath.pieces).join(','));
  const [rocks, dust] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  const rows: string[] = [];
  for (let y = 22 + dy; y <= 48 + dy; y++) {
    let s = '';
    for (let x = 92 + dx; x <= 114 + dx; x++) {
      const v = rocks.get(x, y), k = rocks.pal.kind(v);
      s += !v ? (dust.get(x, y) ? '.' : ' ') : k === 'outline' ? 'O' : k === 'body' ? 'B' : k === 'dust' ? 'h' : 's';
    }
    rows.push(String(y).padStart(4) + ' ' + s);
  }
  console.log(rows.join('\n'));
  const pcs = pieces(rocks);
  for (const pc of pcs) {
    const [cx, cy] = centre(rocks, pc);
    if (cx > 92 + dx && cx < 114 + dx && cy > 22 + dy && cy < 48 + dy) console.log('piece n', pc.length, 'c', cx.toFixed(1), cy.toFixed(1));
  }
}
