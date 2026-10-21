
{
  const K = key('multi_hit');
  const all = union(K.part('main'), K.part('bits'));
  const [rocks0] = splitFlecks(all);
  const [rocks] = splitDashes(solidPebbles(rocks0));
  const pcs = pieces(rocks);
  for (const pc of pcs) {
    if (pc.length < 100) continue;
    const inPc = new Set(pc);
    const sq = (i: number) => [-1, 0, 1].every((oy) => [-1, 0, 1].every((ox) => inPc.has(i + oy * rocks.w + ox)));
    const core = new Set(pc.filter((i) => [-1, 0, 1].some((oy) => [-1, 0, 1].some((ox) => sq(i + oy * rocks.w + ox)))));
    const xs = pc.map((i) => i % rocks.w), ys = pc.map((i) => (i / rocks.w) | 0);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      let s = String(y).padStart(3) + ' ';
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
        const i = y * rocks.w + x;
        s += !inPc.has(i) ? ' ' : core.has(i) ? (rocks.pal.kind(rocks.v[i]) === 'outline' ? 'O' : '#') : (rocks.pal.kind(rocks.v[i]) === 'outline' ? 't' : 'b');
      }
      console.log(s);
    }
  }
}
