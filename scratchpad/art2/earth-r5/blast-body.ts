  // (in the settle the dust fades through its alpha, rim first, in soft bands (fadeSoft); only the
  // last frame also parts it into wisps)
  // How far up a crystal's foot is ragged into the dust while it rises or sinks.
  const FOOT = 4;
  // Up per crystal: rising, the middle ones lead; sinking, all together.
  const upOf = (i: number, u: number, off: number) => (i < BLAST_KEY ? clamp(u * 1.3 - off * 0.3, 0, 1) : u);
  const heart = (x: number, y: number) => 1 - Math.min(1, Math.hypot((x - K.ax) / 110, (y - K.ay) / 70));
  const field = fadeField(heart, seed + 9, 12);
  // His outer crystals (far left and right) and the rocks at the crystals' feet stand at the edge of
  // his cloud, half outside it, and his dust stops hard against them. Behind them (never seen in his
  // picture) his dust carries on a few px and thins out, so the cloud they leave has a soft edge,
  // not their outline cut into it.
  const behind = new Uint8Array(K.w * K.h);
  crystals.forEach((c, k) => {
    if (k < NK && info[k].off < 0.6) return;
    for (let i = 0; i < c.v.length; i++) if (c.v[i]) behind[i] = 1;
  });
  const cloud0 = union(feather(union(under, dust), behind, seed + 13), under, dust);
  // Each crystal's foot in his cloud: how many of its foot columns stand in the cloud in his
  // picture (a crystal at the cloud's edge stands half outside it there too).
  const footIn = (cloud: Uint8Array, k: number, tx: number, ty: number) => {
    const by = info[k].base + ty;
    return info[k].feet.filter((x) => cloud[by * K.w + x + tx] || cloud[(by - 2) * K.w + x + tx]).length;
  };
  const cloudKey = silhouette(cloud0, 3);
  const inKey = info.map((_, k) => footIn(cloudKey, k, 0, 0));
  const fr = plan.map((p, i) => {
    if (i === BLAST_KEY) return union(shade, under, dust, ...crystals, loose0);
    const sh = fadeSoft(scaled(shade, p.sh, p.sh, K.ax, K.ay), 0, p.shDim, field);
    // His cloud and its continuation behind the crystals (the extractor reads where his cloud goes
    // on behind each crystal from the cloud round it, so it has his outline, never a crystal's).
    let d = scaled(cloud0, p.ds, p.ds, K.ax, K.ay);
    // (the cloud's own outline at this size, before it churns and thins: a crystal stands in it)
    const cloud = silhouette(d, 3);
    if (p.t > 0) d = churn(d, p.t, { amp: 1.6, cell: 7, seed, flow: (x) => [Math.sign(x - K.ax) * 1.4, -1] });
    // The settle fades the cloud from its rim inward: the field weighs how deep in the cloud's own
    // outline a pixel lies (its rim band goes first) and how near the ground centre (the heart goes
    // last), with only broad, low lumps; and no fade may open a pocket in the cloud deeper than the
    // cloud already had (so it never dissolves into round dark spots from the inside).
    const depth = depthIn(cloud, K.w, K.h);
    const rimHeart = (x: number, y: number) => 0.6 * Math.min(1, depth[y * K.w + x] / 16) + 0.4 * heart(x, y);
    const cooled = fadeSoft(d, p.cool, 0, () => 0);
    const faded = fadeSoft(d, p.cool, p.dim, (x, y) => 1.45 - 0.9 * rimHeart(x, y) + 0.2 * (pnoise(x, y, 22, 0, 0, seed + 9) - 0.5));
    d = thinWisps(guardPockets(cooled, faded), p.thin, seed + 1, heart);
    const ks = crystals.map((c, k) => {
      let u = upOf(i, p.up, info[k].off);
      // Each crystal stands where it stands in his cloud, wherever the cloud is: while the cloud
      // is smaller (bursting out) or bigger (billowing), the crystal is moved with it, so its foot
      // stays in the dust instead of hanging in the sky beside a small cloud.
      const tx = Math.round((info[k].cx - K.ax) * (p.ds - 1)), ty = Math.round((info[k].base - K.ay) * (p.ds - 1));
      const foot = k >= NK;
      // (the rocks at the feet do not sink in the settle: they wear away like the loose rocks, on
      // beats of their own over frames 8-14, a quarter of each at most a frame)
      if (foot && i > BLAST_KEY) {
        return moveCrumble(c, () => [tx, ty], () => (i - 8 - rr(seed + 12, k, 0, 2.5)) / 4, seed + 14 + k, 0.25);
      }
      // (a crystal shows only once the cloud under it covers about as much of its foot as his
      // cloud does in his picture: measured against his own picture, so a crystal at the cloud's
      // edge is not held back; one nearly up is never held back)
      if (!foot && u < 1 && p.up < 0.9 && footIn(cloud, k, tx, ty) < 0.75 * inKey[k]) u = 0;
      if (u <= 0.02) return null;
      const placed = tx || ty ? moved(c, tx, ty) : c;
      if (u >= 1) return placed;
      // The crystal thrusts up out of the cloud (or sinks back into it): moved down and cut at its
      // foot with no line drawn along the cut, the cut wavy, and below the cut's ragged top (each
      // column ending a pixel or few above it, a column at a time, never a dither) his dust takes
      // over, so it grows out of the dust instead of standing on a straight dark shelf (where the
      // dust has thinned away, the crystal ends there too, no sliver left hanging). A crystal
      // nearly sunk is ragged over less of its height, so its last tip stays a tip, and a remnant
      // of fewer than 6 px goes.
      const sink = Math.round(info[k].h * (1 - u));
      const footY = (x: number) => info[k].base + ty - 1 + Math.round(2.5 * (pnoise(x, k, 3, 0, 0, seed + 5) - 0.5) * 2);
      const fh = Math.max(1, Math.min(FOOT, Math.round(info[k].h * u * 0.3)));
      const top = (x: number) => footY(x) - Math.floor(fh * rr(seed + 11, x * 31 + k, 0, 1.0));
      const cr = cut(moved(placed, 0, sink), (x, y) => y <= footY(x), 5, false);
      const ragged = cr.map((v, x, y) => {
        if (y <= top(x)) return v;
        const dv = d.get(x, y);
        return dv && d.pal.kind(dv) === 'dust' ? dv : 0;
      });
      for (const pc of pieces(rockOf(ragged))) if (pc.length < 6) for (const j of pc) ragged.v[j] = d.get(j % K.w, (j / K.w) | 0);
      return ragged;
    });
    // His flecks ride on the cloud (moved as it grows) and go one by one as it fades.
    const fl = moveBits(flecks, (k, cx, cy) => {
      // (and all are gone by the second-last frame, with the cloud's heart)
      if (i !== BLAST_KEY && rr(seed + 10, k, 0, 1) < (i < BLAST_KEY ? 0.6 - p.bits * 0.6 : (i - 7) / 7)) return null;
      return [(cx - K.ax) * (p.ds - 1), (cy - K.ay) * (p.ds - 1)];
    });
    // Rising, the rocks fly out from the centre; settling, they fly on and fall, and each wears
    // away from its outline inward over about four frames, on its own beat between frames 8 and
    // 15, shedding a chip or two (no rock pops out, no speckled dissolve).
    const rs = moveCrumble(loose, (k, cx, cy, n) => {
      if (p.bits < 1 && p.bits < 0.35 + rr(seed + 6, k, 0, 0.3)) return null;
      const s = p.bits - 1;
      // (bursting out, a rock is at `bits` of his distance from the centre: it flies out with the cloud)
      if (s < 0) return [(cx - K.ax) * s, (cy - K.ay) * s];
      return [(cx - K.ax) * s * 0.25, (cy - K.ay) * s * 0.2 + (s > 0 ? 6 * s * s : 0) * (n > 12 ? 1 : 0.7)];
    }, (k) => (i > BLAST_KEY ? (i - 8 - rr(seed + 7, k, 0, 4)) / 4 : 0), seed + 8, 0.25);
    return union(sh, d, fl, ...ks, rs);
  });
