
for (const nm of ['hit', 'multi_hit']) {
  const K = key(nm);
  const all = union(K.part('main'), K.part('bits'));
  const [rocks0, flecks0] = splitFlecks(all);
  const soft = union(K.part('under'), K.part('dust'));
  let n = 0, bare = 0, bareIn = 0;
  const sil = silhouette(soft, 2);
  for (let i = 0; i < flecks0.v.length; i++) if (flecks0.v[i]) {
    n++;
    if (!soft.v[i]) { bare++; if (sil[i]) bareIn++; }
  }
  let rn = 0, rb = 0;
  for (let i = 0; i < rocks0.v.length; i++) if (rocks0.v[i]) { rn++; if (!soft.v[i] && sil[i]) rb++; }
  console.log(nm, 'fleck px', n, 'with no dust under', bare, 'of them inside the cloud', bareIn, '| rock px', rn, 'inside cloud w/o dust', rb);
}
