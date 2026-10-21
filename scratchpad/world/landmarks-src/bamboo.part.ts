/** Dried bamboo: the rope straw tone with a touch of young-leaf green. */
const BAMBOO = pal(R.rope.map((c, i) => mix(c, R.leafLight[i], 0.18)));
/** Older, darker culms for the posts. */
const BAMBOO_DK = pal(R.rope.map((c, i) => mix(c, R.woodDark[i], 0.35)));
const BF_H = 60; // panel height (px); the posts stand a little taller

/** One thick bamboo post with nodes and a hollow cut top, rendered alone (stamped on both seams). */
function bambooPost(): { c: Canvas; ox: number; oy: number } {
  const W = 30, H = 90, ox = 15, oy = 80;
  GROUP = 1;
  const sc = new Scene();
  const nodes = [12, 28, 44, 58];
  const post = sc.add(pole([0, 0, -3], [0, BF_H + 3, -3], 3.6, 12, { caps: true }), {
    pal: BAMBOO_DK,
    seed: 181,
    contrast: 1.1,
    ao: 3,
    shade: (px, s) => {
      const d = nodes.map((nh) => px.p[1] - nh).find((v) => v > -1.6 && v < 1.6);
      if (d === undefined) return s;
      return d < -0.5 ? Math.min(4, s + 1) : d < 0.5 ? Math.max(1, s - 2) : s;
    },
  });
  const f = render(sc, W, H, ox, oy);
  // Hollow cut top: a light rim around a dark hole.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== post.id || f.normal(i)[1] < 0.85) continue;
    const p = f.world(i);
    const d = Math.hypot(p[0], p[2] + 3);
    f.pal[i] = BAMBOO;
    if (d < 2.3) f.over[i] = d < 1.4 ? C(BAMBOO_DK, 0) : C(BAMBOO_DK, 1);
    else f.step[i] = p[0] < 0.5 ? 4 : 3;
  }
  const c = f.compose();
  // Black rope tie holding the panel's top cap and middle batten.
  const ties = layer(W, H, (cv) => {
    for (const hh of [BF_H - 2, 31]) {
      const [x, y] = f.proj([0, hh, -3]).map(Math.round);
      for (let dx = -3; dx <= 3; dx++) {
        const yy = y + Math.round(Math.sqrt(Math.max(0, 1 - (dx / 3.8) ** 2)) * 2.2);
        cv.set(x + dx, yy, C(INK, dx < 0 ? 4 : 3));
        cv.set(x + dx, yy + 1, C(INK, 2));
      }
    }
  });
  c.draw(ties, 0, 0);
  c.outline();
  return { c, ox, oy };
}

function fenceBamboo(): WorldSprite {
  const W = 170, H = 100, ox = 85, oy = 84;
  GROUP = 1;
  const sc = new Scene();
  // Top cap (tamabuchi): a bundle of thin bamboo laid along the top, slightly in front of the panel.
  const cap = sc.add(tube([[-FENCE_SPAN, BF_H - 2.5, -1.2], [FENCE_SPAN, BF_H - 2.5, -1.2]], 3, 10, { caps: true }), { pal: BAMBOO, seed: 191, contrast: 1.1 });
  const f = render(sc, W, H, ox, oy);
  // Panel: vertical split-bamboo slats (4 px + 1 px seam), staggered nodes, three battens.
  const x0 = ox - FENCE_SPAN + 3, x1 = ox + FENCE_SPAN - 3;
  const yTop = oy - (BF_H - 4), yBot = oy;
  const battens = [10, 30, 48]; // heights of the batten tops
  const battenRows = new Map<number, number>(); // screen y -> row in batten (0 top .. 3 bottom)
  for (const bh of battens) for (let k = 0; k < 4; k++) battenRows.set(oy - bh + k, k);
  const panel = new Canvas(W, H);
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) % 5, slat = Math.floor((x - x0) / 5);
    const nodeOff = slat % 2 ? 7 : 16;
    const tone = hash(slat, 3, 197) < 0.25 ? -1 : 0;
    for (let y = yTop; y <= yBot; y++) {
      const hh = oy - y;
      let s: number;
      if (u === 4) s = 1; // seam
      else s = [3, 3, 3, 2][u] + (u === 1 || u === 2 ? tone : 0);
      // A lit edge in clusters on the left of each slat.
      if (u === 0 && noise(slat, hh / 3, 1, 198) > 0.55) s = 4;
      // Staggered nodes: a dark groove with a light ridge above.
      const nd = (hh - nodeOff + 40) % 20;
      if (u < 4 && nd === 0) s = Math.max(1, s - 1);
      if (u < 2 && nd === 1) s = Math.min(4, s + 1);
      // The cap's shadow along the top and the ground contact.
      if (y < yTop + 2 && u < 4) s = Math.max(1, s - 1);
      if (hh < 2 && u < 4) s = Math.max(1, s - 1);
      panel.set(x, y, C(BAMBOO, s));
    }
  }
  // Battens: split bamboo laid across the slats, each casting a short shadow below-right.
  for (const bh of battens) {
    const yb = oy - bh;
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const nodeAt = (x - x0 + 6) % 23 === 0;
      for (let k = 0; k < 4; k++) {
        let s = [4, 3, 3, 2][k];
        if (k === 0 && noise(x / 3, bh, 1, 199) < 0.35) s = 3;
        if (nodeAt) s = k === 0 ? 3 : 1;
        panel.set(x, yb + k, C(BAMBOO, s));
      }
      for (let k = 4; k < 6; k++) {
        const c = panel.get(x + 1, yb + k);
        if (c[3]) panel.set(x + 1, yb + k, k === 4 ? C(BAMBOO, 1) : mix(c, C(BAMBOO, 1), 0.5));
      }
    }
  }
  // The left post's shadow falls on the slats to its right.
  for (let y = yTop; y <= yBot; y++)
    for (let x = x0; x < x0 + 3; x++) {
      const c = panel.get(x, y);
      if (c[3] && !battenRows.has(y)) panel.set(x, y, mix(c, C(BAMBOO, 1), 0.55));
    }
  panel.outline();
  const c = f.compose();
  const comp = new Canvas(W, H);
  comp.draw(panel, 0, 0);
  // Black rope knots on the battens (every two slats) and around the cap.
  const knots = new Canvas(W, H);
  for (const bh of battens) {
    const yb = oy - bh;
    for (let x = x0 + 7; x < x1 - 3; x += 10) {
      // A vertical wrap over the batten, a nub and two short tails.
      const kn: [number, number, number][] = [[0, -1, 1], [1, -1, 1], [0, 0, 4], [1, 0, 2], [0, 1, 3], [1, 1, 1], [0, 2, 3], [1, 2, 1], [0, 3, 2], [1, 3, 1], [0, 4, 1], [1, 4, 0], [-1, 5, 1], [2, 5, 1]];
      for (const [dx, dy, st] of kn) knots.set(x + dx, yb + dy, C(INK, st));
    }
  }
  comp.draw(knots, 0, 0);
  comp.draw(c, 0, 0);
  const capTies = layer(W, H, (cv) => {
    for (let x = x0 + 7; x < x1 - 3; x += 20) {
      const [, y] = f.proj([0, BF_H - 2.5, -1.2]).map(Math.round);
      for (let dy = -3; dy <= 3; dy++) {
        cv.set(x, y + dy, C(INK, dy < 0 ? 4 : 2));
        cv.set(x + 1, y + dy, C(INK, dy < 0 ? 3 : 1));
      }
    }
  });
  comp.draw(capTies, 0, 0);
  comp.outline();
  void cap;
  const bp = bambooPost();
  for (const px of [-FENCE_SPAN, FENCE_SPAN]) comp.draw(bp.c, ox + px - bp.ox, oy - bp.oy);
  return finish('fence_bamboo', 'Bamboo Fence', [2, 1.2], ['cover-half', 'blocks-sight', 'destructible'], { idle: { frames: [comp], fps: 0 } }, ox);
}
