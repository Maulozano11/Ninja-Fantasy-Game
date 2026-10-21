{
  const K = key('blast');
  const ox = K.ax - 122, oy = K.ay - 134;
  const [X0, X1, Y0, Y1] = process.argv.slice(2, 6).map(Number);
  const names = ['shade', 'dust', 'under', 'main', 'bits', 'rocks'];
  for (let k = 0; K.has('k' + k); k++) names.push('k' + k);
  const [, flecks] = splitFlecks(union(K.part('main'), K.part('bits')));
  const show = (n: string, L: Layer) => {
    let any = false;
    const rows: string[] = [];
    for (let y = Y0; y <= Y1; y++) {
      let s = String(y).padStart(3) + ' ';
      for (let x = X0; x <= X1; x++) {
        const v = L.get(x + ox, y + oy), k = L.pal.kind(v);
        if (v) any = true;
        s += !v ? '.' : k === 'outline' ? 'O' : k === 'body' ? 'B' : k === 'dust' ? String(dustLevel(L.pal, v)) : 's';
      }
      rows.push(s);
    }
    if (any) console.log('part', n + '\n' + rows.join('\n'));
  };
  for (const n of names) show(n, K.part(n));
  show('flecks', flecks);
}
