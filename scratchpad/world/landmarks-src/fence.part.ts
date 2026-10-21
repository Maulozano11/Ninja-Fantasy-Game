/** A tube along a polyline (rings perpendicular to the path), smooth shaded; r may vary per point. */
function tube(path: V3[], r: number | number[], n = 8, o: { caps?: boolean; seed?: number; wob?: number } = {}): Tri[] {
  const rings: V3[][] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = unit(sub(b, a));
    const ref: V3 = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(t, ref)), w = unit(cross(t, u));
    const rr = typeof r === 'number' ? r : r[i];
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const ang = (j * TAU) / n;
      const wob = o.wob ? 1 + (rnd(o.seed ?? 5, j, i) - 0.5) * o.wob : 1;
      pts.push(add(path[i], add(mul(u, Math.cos(ang) * rr * wob), mul(w, Math.sin(ang) * rr * wob))));
    }
    rings.push(pts);
  }
  return loft(rings, { capStart: o.caps ?? true, capEnd: o.caps ?? true, smooth: true });
}
/** Points along a sagging span from a to b (sag px at the middle), with a little wander. */
function span(a: V3, b: V3, sag: number, n: number, seed: number): V3[] {
  const pts: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = add(a, mul(sub(b, a), t));
    pts.push([p[0], p[1] - sag * 4 * t * (1 - t) + (k > 0 && k < n ? (rnd(seed, k) - 0.5) * 0.8 : 0), p[2]]);
  }
  return pts;
}

/** Bark streaks on a round post: dark vertical fissures that follow the trunk, in clusters. */
function barkShade(cx: number, cd: number, seed: number) {
  return (px: PixelInfo, s: number): number => {
    const ang = Math.atan2(px.p[2] - cd, px.p[0] - cx);
    const v = noise(ang * 5 + 10, px.p[1] / 7, 1, seed);
    if (px.n[1] > 0.8) return s;
    if (v > 0.68) return Math.max(1, s - 1);
    if (v < 0.12 && px.light > 0.5) return Math.min(4, s + 1);
    return s;
  };
}

const FENCE_SPAN = m(1); // posts every meter; the segment is 2 m, end posts sit on the tile seam
const RAIL_H = [19, 40];

/**
 * One rustic fence post, rendered alone and outlined so it can be stamped at both ends of a
 * segment (identical pixels on the seam when segments tile 2 m apart). Rope lashings wrap it at
 * both rail heights.
 */
function fencePost(lean = 0, broken = false): { c: Canvas; ox: number; oy: number } {
  const W = 40, H = 80, ox = 20, oy = 70;
  GROUP = 1;
  const sc = new Scene();
  const postT = tube(
    [[0, 0, 0], [0.3, 18, 0], [-0.2, 36, 0], [0.2, 53, 0]].map((p) => p as V3),
    [3.8, 3.6, 3.5, 3.3],
    10,
    { seed: 151, wob: 0.12, caps: true },
  );
  const post = sc.add(lean ? rotZ(postT, lean, 0, 0) : postT, { pal: BARK, seed: 151, contrast: 1.1, shade: barkShade(0, 0, 152), ao: 3 });
  const f = render(sc, W, H, ox, oy);
  // Cut top: lighter end grain with a ring and a darker heart.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== post.id) continue;
    const n = f.normal(i);
    if (n[1] < 0.85) continue;
    const p = f.world(i);
    const top: V3 = lean ? [Math.sin(lean) * 53, 53, 0] : [0.2, 53, 0];
    const d = Math.hypot(p[0] - top[0], (p[2] - top[2]) * 1.0);
    f.pal[i] = WOOD;
    f.step[i] = d < 1 ? 2 : d < 2.2 ? 4 : d < 2.9 ? 3 : 2;
  }
  const c = f.compose();
  // Rope lashings: three wraps around the post at each rail height, following the round post.
  const lash = layer(W, H, (cv) => {
    RAIL_H.forEach((rh, k) => {
      if (broken && k === 1) return;
      for (let w = 0; w < 2; w++) {
        const hh = rh + 2 - w * 3.2;
        for (let a = 0; a <= 16; a++) {
          const th = Math.PI + (a / 16) * Math.PI; // front half of the ring
          const r = 3.7;
          let p: V3 = [Math.cos(th) * r, hh + (a / 16 - 0.5) * 1.4, Math.sin(th) * r];
          if (lean) p = [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]];
          const [x, y] = f.proj(p).map(Math.round);
          const lit = Math.cos(th) < 0.3;
          cv.set(x, y, C(ROPE, lit ? 4 : 2));
          cv.set(x, y + 1, C(ROPE, lit ? 2 : 1));
        }
      }
    });
  });
  c.draw(lash, 0, 0);
  c.outline();
  return { c, ox, oy };
}

function fence(): WorldSprite {
  const W = 170, H = 90, ox = 85, oy = 74;
  const build = (broken: boolean): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const lean = broken ? 0.18 : 0; // the middle post leans right when broken
    const tilt = (p: V3): V3 => (lean ? [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]] : p);
    const railD = 4.6;
    const rail = (a: V3, b: V3, r0: number, seed: number, sag = 1.2, capped = true) =>
      sc.add(tube(span(a, b, sag, 6, seed), r0, 8, { seed, wob: 0.15, caps: capped }), { pal: WOOD_OLD, seed, contrast: 1.1, facetVar: 0.02, shade: (px, s) => (noise(px.p[0] / 5, px.p[1] * 1.5 + px.p[2], 1.2, seed) > 0.74 ? Math.max(1, s - 1) : s) });
    const L = -FENCE_SPAN, M = 0, Rr = FENCE_SPAN;
    const mid = (h: number): V3 => {
      const p = tilt([0, h, 0]);
      return [p[0], p[1], railD];
    };
    // Left span: both rails run from the left post to the middle post.
    rail([L - 1, RAIL_H[0], railD], mid(RAIL_H[0]), 2.5, 161);
    rail([L - 1, RAIL_H[1], railD], mid(RAIL_H[1]), 2.3, 162);
    // Right span.
    rail(mid(RAIL_H[0]), [Rr + 1, RAIL_H[0], railD], 2.5, 163);
    if (!broken) rail(mid(RAIL_H[1]), [Rr + 1, RAIL_H[1], railD], 2.3, 164);
    else {
      // The upper rail snapped: one piece hangs from the middle post, the other from the right post.
      const m1 = mid(RAIL_H[1]);
      rail(m1, [27, 28, railD - 2], 2.3, 165, 0.3, true);
      rail([Rr + 1, RAIL_H[1], railD], [33, 21, railD - 3], 2.3, 166, 0.3, true);
    }
    // The middle post is part of this scene (it can lean); end posts are stamped after.
    const midPost = sc.add(
      rotZ(tube([[0, 0, 0], [-0.3, 18, 0], [0.2, 36, 0], [-0.1, 51, 0]].map((p) => p as V3), [3.7, 3.5, 3.4, 3.2], 10, { seed: 171, wob: 0.12 }), lean, 0, 0),
      { pal: BARK, seed: 171, contrast: 1.1, shade: barkShade(0, 0, 172), ao: 3 },
    );
    const f = render(sc, W, H, ox, oy);
    for (let i = 0; i < W * H; i++) {
      if (f.mesh[i] !== midPost.id || f.normal(i)[1] < 0.85) continue;
      const p = f.world(i);
      const top = tilt([-0.1, 51, 0]);
      const d = Math.hypot(p[0] - top[0], p[2] - top[2]);
      f.pal[i] = WOOD;
      f.step[i] = d < 1 ? 2 : d < 2.2 ? 4 : d < 2.9 ? 3 : 2;
    }
    const c = f.compose();
    if (broken) {
      // Splintered ends: pale fresh wood spikes at the break.
      const spl = layer(W, H, (cv) => {
        for (const [bx, bh, bd, dir] of [
          [27, 28, railD - 2, 1],
          [33, 21, railD - 3, -1],
        ] as [number, number, number, number][]) {
          const [x, y] = f.proj([bx, bh, bd]).map(Math.round);
          const spikes: [number, number, number][] = [[0, -1, 5], [1, -2, 4], [0, 0, 4], [1, 1, 3], [2, 0, 4], [0, 1, 3]];
          for (const [dx, dy, s] of spikes) cv.set(x + dx * dir, y + dy, C(WOOD, s));
        }
      });
      c.draw(spl, 0, 0);
    }
    // Lashings on the middle post.
    const lash = layer(W, H, (cv) => {
      RAIL_H.forEach((rh, k) => {
        for (let w = 0; w < 2; w++) {
          if (broken && k === 1 && w === 1) continue;
          const hh = rh + 2 - w * 3.2;
          for (let a = 0; a <= 16; a++) {
            const th = Math.PI + (a / 16) * Math.PI;
            const p = tilt([Math.cos(th) * 3.6, hh + (a / 16 - 0.5) * 1.4, Math.sin(th) * 3.6]);
            const [x, y] = f.proj(p).map(Math.round);
            const lit = Math.cos(th) < 0.3;
            cv.set(x, y, C(ROPE, lit ? 4 : 2));
            cv.set(x, y + 1, C(ROPE, lit ? 2 : 1));
          }
        }
      });
      if (broken) {
        // A loose rope end dangling from the leaning post.
        const [x, y] = f.proj(tilt([3.5, RAIL_H[1] - 2, -3])).map(Math.round);
        for (let k = 0; k < 7; k++) cv.set(x + (k > 3 ? 1 : 0) + (k > 5 ? 1 : 0), y + k, C(ROPE, k % 2 ? 2 : 3));
      }
    });
    c.draw(lash, 0, 0);
    c.outline();
    // End posts: one pre-rendered post stamped on both tile seams.
    const ep = fencePost(0, false);
    for (const px of [L, Rr]) c.draw(ep.c, ox + px - ep.ox, oy - ep.oy);
    return c;
  };
  const idle = build(false);
  const broken = build(true);
  return finish('fence', 'Wooden Fence', [2, 1], ['cover-half', 'destructible'], { idle: { frames: [idle], fps: 0 }, broken: { frames: [broken], fps: 0 } }, ox);
}
