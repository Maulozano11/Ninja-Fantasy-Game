import { FACES, EDGES, VERTS, lcg } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_65856863-7c3-2/tools/ui/dice-d20-art';

for (const w of [0.6, 2, 5, 20]) {
  const pairs: [number, number][] = [];
  FACES.forEach((f, i) => {
    if (i < f.opp) pairs.push([i, f.opp]);
  });
  const vf: number[][] = VERTS.map((_, vi) => FACES.flatMap((f, fi) => (f.v.includes(vi) ? [fi] : [])));
  const build = (val: number[], flip: boolean[]) => {
    const n = new Array(20).fill(0);
    pairs.forEach(([a, b], k) => {
      n[flip[k] ? b : a] = val[k];
      n[flip[k] ? a : b] = 21 - val[k];
    });
    return n;
  };
  const vcost = (n: number[]) => vf.reduce((c, fs) => c + (fs.reduce((s, f) => s + n[f], 0) - 52.5) ** 2, 0);
  const spread = (n: number[]) => EDGES.reduce((s, e) => s + Math.abs(n[e.f[0]] - n[e.f[1]]), 0);
  const cost = (n: number[]) => vcost(n) - w * spread(n);
  const rnd = lcg(20);
  let best: number[] | null = null, bestC = Infinity;
  for (let restart = 0; restart < 24; restart++) {
    const val = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 9; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [val[i], val[j]] = [val[j], val[i]];
    }
    const flip = val.map(() => rnd() < 0.5);
    let cur = cost(build(val, flip));
    for (let it = 0; it < 4000; it++) {
      const a = Math.floor(rnd() * 10), b = Math.floor(rnd() * 10), doFlip = rnd() < 0.5;
      if (doFlip) flip[a] = !flip[a];
      else [val[a], val[b]] = [val[b], val[a]];
      const c = cost(build(val, flip));
      if (c <= cur) cur = c;
      else if (doFlip) flip[a] = !flip[a];
      else [val[a], val[b]] = [val[b], val[a]];
    }
    if (cur < bestC) {
      bestC = cur;
      best = build(val, flip);
    }
  }
  const n = best!;
  const sums = vf.map((fs) => fs.reduce((s, f) => s + n[f], 0));
  const adj = (k: number) => FACES[n.indexOf(k)].adj.map((a) => n[a]).sort((a, b) => a - b);
  console.log('w', w, 'vsums', sums.join(' '), 'spread', spread(n), '20:', adj(20), '1:', adj(1), '19:', adj(19), '2:', adj(2));
}
