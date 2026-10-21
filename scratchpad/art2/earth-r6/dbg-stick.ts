
{
  const K = key('blast');
  console.log('blast key', K.w, K.h, K.ax, K.ay, Object.keys(EV3_REF.blast.pieces).join(','));
  for (const p of Object.keys(EV3_REF.blast.pieces)) {
    const L = K.part(p);
    const rows: string[] = [];
    for (let y = 160; y <= 176; y++) {
      let s = '';
      for (let x = 130; x <= 142; x++) {
        const v = L.get(x, y);
        const k = L.pal.kind(v);
        s += !v ? ' .' : (k === 'dust' ? 'd' + dustLevel(L.pal, v) : k === 'shade' ? 's' + (v - L.pal.shade0 + 1) : k === 'outline' ? ' O' : ' B');
      }
      rows.push(y + ' ' + s);
    }
    if (rows.some((r) => /[dsOB]/.test(r))) console.log('part', p, '\n' + rows.join('\n'));
  }
}
