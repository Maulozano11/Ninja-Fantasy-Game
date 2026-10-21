{
  const K = key('bolt'), seed = 7100;
  const [bits, dust] = withHalo(K.part('bits'), dustOf(K));
  const main = K.part('main');
  const pcs = pieces(bits);
  console.log('bolt bits pieces', pcs.length, 'K', K.w, K.h);
  for (let i = 0; i < FLY_N; i++) {
    const t = i / FLY_N;
    const own = new Int32Array(bits.v.length).fill(-1);
    let over = 0; const pairs = new Set<string>();
    pcs.forEach((pc, k) => {
      const [dx, dy] = ellipse(t, rr(seed + 2, k, 0, TAU), 2, 1).map(Math.round);
      for (const j of pc) {
        const x = (j % bits.w) + dx, y = ((j / bits.w) | 0) + dy, J = y * bits.w + x;
        if (own[J] >= 0 && own[J] !== k) { over++; pairs.add(own[J] + '-' + k); }
        own[J] = k;
      }
    });
    console.log('frame', i, 'overlapping px', over, [...pairs].slice(0, 8).join(' '));
  }
}
