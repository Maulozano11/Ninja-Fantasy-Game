
{
  const K = key('hit');
  const all = union(K.part('main'), K.part('bits'));
  const [rocks0, flecks] = splitFlecks(all);
  const dust = K.part('dust'), under = K.part('under');
  const pal = K.pal;
  console.log('dustSteps', pal.dustSteps, 'dust0', pal.dust0, 'ranks', pal.dustByRank.join(','), 'ax', K.ax, K.ay);
  for (let y = 84; y < 98; y++) {
    let s = String(y).padStart(3) + ' ';
    for (let x = 82; x < 100; x++) {
      const f = flecks.get(x, y), r = rocks0.get(x, y), d = dust.get(x, y), u = under.get(x, y);
      let c = '';
      if (f) c = 'F' + pal.kind(f)![0];
      else if (r) c = 'R' + pal.kind(r)![0];
      else if (d) c = 'd' + pal.dustRank[Math.floor((d - pal.dust0) / pal.dustSteps)] + '' ;
      else if (u) c = 'u' + pal.dustRank[Math.floor((u - pal.dust0) / pal.dustSteps)];
      else c = '..';
      s += c.padEnd(3);
    }
    console.log(s);
  }
}
