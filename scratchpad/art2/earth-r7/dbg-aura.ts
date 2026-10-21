{
  const K = key('aura_back');
  console.log('K', K.w, K.h, K.ax, K.ay);
  const rocks = union(K.part('main'), K.part('bits'));
  const dx = K.ax - 58, dy = K.ay - 119;
  pieces(rocks).forEach((pc, k) => {
    const [cx, cy] = centre(rocks, pc);
    const xs = pc.map((i) => i % rocks.w), ys = pc.map((i) => (i / rocks.w) | 0);
    const body = pc.filter((i) => rocks.pal.kind(rocks.v[i]) === 'body').length;
    console.log(k, 'n', pc.length, 'body', body, 'trim x', Math.min(...xs) - dx, Math.max(...xs) - dx, 'y', Math.min(...ys) - dy, Math.max(...ys) - dy, 'cy', (cy - dy).toFixed(1));
  });
}
