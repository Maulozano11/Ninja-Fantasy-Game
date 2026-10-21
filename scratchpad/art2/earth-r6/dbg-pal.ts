
for (const nm of ['hit', 'multi_hit', 'blast']) {
  const p = key(nm).pal;
  const S = p.dustSteps;
  console.log(nm, 'S', S, 'fam0', Array.from({ length: S }, (_, a) => p.cols[p.dust0 - 1 + a][3]).join(','), 'fam5', Array.from({ length: S }, (_, a) => p.cols[p.dust0 - 1 + 5 * S + a][3]).join(','),
    'shade', p.shade0 ? Array.from({ length: p.shadeSteps }, (_, a) => p.cols[p.shade0 - 1 + a].join('/')).join(',') : '-');
}
