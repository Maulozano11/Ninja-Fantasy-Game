
{
  const K = key('multi_hit');
  const all = union(K.part('main'), K.part('bits'));
  const [rocks0, flecks0] = splitFlecks(all);
  const [rocks, dashes] = splitDashes(solidPebbles(rocks0));
  const pcs = pieces(rocks);
  const chunkPx = new Set<number>();
  pcs.forEach((pc) => { if (pc.length >= 100) for (const j of pc) chunkPx.add(j); });
  pcs.forEach((pc, k) => {
    const [cx, cy] = centre(rocks, pc);
    let dmin = 99;
    for (const j of pc) {
      const x = j % rocks.w, y = (j / rocks.w) | 0;
      for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) if (chunkPx.has((y + oy) * rocks.w + x + ox)) dmin = Math.min(dmin, Math.max(Math.abs(ox), Math.abs(oy)));
    }
    const outl = pc.filter((j) => rocks.pal.kind(rocks.v[j]) === 'outline').length;
    console.log(k, 'n', pc.length, 'c', cx.toFixed(0), cy.toFixed(0), 'outline', outl, 'dChunk', pc.length >= 100 ? 'CHUNK' : dmin);
  });
  console.log('fleck pieces', pieces(flecks0).length, 'anchor', K.ax, K.ay);
}
