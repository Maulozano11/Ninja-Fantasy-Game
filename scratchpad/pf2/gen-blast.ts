/**
 * Small pieces of a layer (his drops), each as pixels relative to its centre, smallest first: the
 * shapes the spray is made of.
 */
function dropShapes(L: Layer, minPx: number, maxPx: number, fam: Fam): [number, number, number][][] {
  return pieces(L)
    .filter((pc) => pc.length >= minPx && pc.length <= maxPx && pc.filter((j) => FAM[L.v[j] - 1] === fam).length >= pc.length * 0.6)
    .map((pc) => {
      let sx = 0, sy = 0;
      for (const j of pc) {
        sx += j % L.w;
        sy += (j / L.w) | 0;
      }
      const cx = Math.round(sx / pc.length), cy = Math.round(sy / pc.length);
      return pc.map((j) => [(j % L.w) - cx, ((j / L.w) | 0) - cy, L.v[j]] as [number, number, number]);
    })
    .sort((a, b) => a.length - b.length || a[0][0] - b[0][0] || a[0][1] - b[0][1]);
}
/** A drop shape at a smaller size (nearest), its rim kept round the outside. */
function shrinkShape(s: [number, number, number][], k: number): [number, number, number][] {
  const m = new Map<string, number>();
  for (const [dx, dy, v] of s) m.set(`${dx},${dy}`, v);
  const out: [number, number, number][] = [];
  const R = Math.max(...s.map(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)))) + 1;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const v = m.get(`${Math.round(x / k)},${Math.round(y / k)}`);
    if (v && !out.some((o) => o[0] === x && o[1] === y)) out.push([x, y, v]);
  }
  // (the rim: any body pixel on the outside of the small shape takes his rim colour)
  const has = new Set(out.map(([x, y]) => `${x},${y}`));
  return out.map(([x, y, v]) => {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !has.has(`${x + a},${y + b}`));
    return [x, y, edge && isKind(v, 'body') ? RIM[FAM[v - 1]] : v] as [number, number, number];
  });
}

/**
 * blast: his gushing pillar of slime over its bubbling pool, 16 frames.
 *  - The pillar and the pool are cut apart along the line where his pillar's flared foot meets the
 *    bubbles (traced on his picture), so the pillar can move inside the pool: the pool is drawn in
 *    front of it, its surface re-rimmed along that line.
 *  - Anticipation 0-3: the pool opens out of the ground and his pillar gushes up out of it: the
 *    whole pillar is pushed up through the pool's surface (translated, never wiped or stretched),
 *    thin at first and filling out, his top rows on its front shaped into a round, lobed slime head
 *    that swells a little wider than the shaft, with spray (his own drop shapes) thrown up round it
 *    and his drops riding beside it; his venom mist comes up beside the head (never above it); the
 *    splash drops fly out from the pool's edge to where he drew them; his light spreads with the pool.
 *  - Frame 4 is his picture, held to frame 6 (the slime churns, the mist sways).
 *  - Settle 7-15: the pillar sinks back down through the pool's surface, slumping wider, with the
 *    same round lobed head on its falling top (no straight cut anywhere); drops break off the head
 *    and fall in arcs back into the pool; his drops rain down, the mist rises and thins, his light
 *    dims, the pool breaks up, cools in patches and fades.
 * His pillar ran off the top of his panel, so the top rows fade out along a ragged line.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 7800;
  const col = K.part('main'), pool = K.part('pool'), mist = K.part('mist'), drops = K.part('drops'), glow = K.part('glow');
  const light = Light.of('blast');
  const glowG = glow.empty(), glowP = glow.empty();
  for (let i = 0; i < glow.v.length; i++) if (glow.v[i]) (FAM[glow.v[i] - 1] === 'purple' ? glowP : glowG).v[i] = glow.v[i];
  const colTop = tops(col);
  const top = Math.min(...colTop);
  // The shaft's centre line and half width, measured on its upper part.
  let sx0 = K.w, sx1 = -1;
  for (let x = 0; x < K.w; x++) if (colTop[x] <= top + 8) {
    sx0 = Math.min(sx0, x);
    sx1 = Math.max(sx1, x);
  }
  const scx = (sx0 + sx1 + 1) / 2, shw = (sx1 - sx0 + 1) / 2;
  const colH = K.ay - top;
  // Where his pillar's flared foot meets the pool's bubbles (traced on his picture, frame px): an
  // arch from y 96 at x 72 and x 134 down to y 112 under the shaft's middle. Above it (between those
  // columns) his pixels are the pillar, below it and to the sides they are the pool.
  const FX0 = 72, FX1 = 134, fcx = (FX0 + FX1 + 1) / 2, fhw = (FX1 - FX0 + 1) / 2;
  // (scalloped like the row of bubbles in front of the pillar's foot, so it never reads as a bowl)
  const surf = (x: number) => {
    if (x < FX0 || x > FX1) return -1;
    const ph = fract((x - FX0 + 3) / 10);
    return Math.round(97 + 12 * (1 - ((x + 0.5 - fcx) / fhw) ** 2) - 3.2 * Math.sqrt(Math.max(0, 1 - (2 * ph - 1) ** 2)) + 1.5 * (2 * pnoise(x, 0, 6, 0, 0, seed + 60) - 1));
  };
  const inShaft = (x: number, y: number) => y < surf(x);
  const shaftL = col.clone();
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) if (inShaft(x, y) && pool.get(x, y)) shaftL.set(x, y, pool.get(x, y));
  const poolOnly = cut(pool, (x, y) => !inShaft(x, y), 2, true);
  /** The pool's surface line in a frame whose pool is scaled by ps about the anchor (the pillar is clipped there). */
  const clipY = (x: number, ps: number) => {
    const xk = K.ax + (x + 0.5 - K.ax) / ps - 0.5;
    const s = surf(Math.round(xk));
    return K.ay + ((s < 0 ? 96 : s) - K.ay) * ps;
  };
  /** The round, lobed slime head on the pillar's moving top: its top line at column x. */
  const headTop = (x: number, y0: number, hw: number, i: number) => {
    const u = clamp((x + 0.5 - scx) / Math.max(4, hw), -1, 1);
    const dome = 0.7 * hw * (1 - Math.sqrt(1 - u * u));
    const lobes = 2.6 * Math.cos(u * Math.PI * 1.6 + i * 1.9) * (1 - 0.5 * Math.abs(u));
    return y0 + 3 + dome + lobes + 1.4 * (2 * pnoise(x, i * 5, 9, 0, 0, seed + 30) - 1);
  };
  /** The pillar pushed up (or sunk) d px under the pool's surface, scaled across by sxs, swelling under its head. */
  const pillar = (L: Layer, d: number, sxs: number, swell: number, ps: number, i: number): Layer => {
    const y0 = top + d;
    const bulge = (y: number) => 1 + swell * Math.sin(Math.PI * clamp((y - y0) / 26, 0, 1)) ** 0.7;
    const sh = remap(L, (x, y) => {
      if (y > clipY(x, ps) + 1) return null;
      return [scx + (x + 0.5 - scx) / (sxs * bulge(y)) - 0.5, y - d];
    });
    return d < 1 ? sh : cut(sh, (x, y) => y >= headTop(x, y0, shw * sxs * (1 + 0.5 * swell), i), 4, true);
  };
  // The spray: his own small drop shapes.
  const big = dropShapes(drops, 20, 60, 'green');
  const shapes = [...big.map((s) => shrinkShape(s, 0.55)), ...big.map((s) => shrinkShape(s, 0.75)), ...big];
  const stamp = (L: Layer, s: [number, number, number][], x: number, y: number) => {
    for (const [dx, dy, v] of s) if (!L.get(Math.round(x) + dx, Math.round(y) + dy)) L.set(Math.round(x) + dx, Math.round(y) + dy, v);
  };
  const PEAK = 4, HOLD = 6, N = 16;
  // pool: its spread; rise: the pillar's height (share of his); mist: how far his mist has come up;
  // light: his light's strength; poolCut: how much of the pool has broken up; a: opacity.
  const plan = [
    { pool: 0.6, rise: 0.22, mist: 0, light: 0.4, poolCut: 0, a: 1 },
    { pool: 0.74, rise: 0.45, mist: 0.3, light: 0.6, poolCut: 0, a: 1 },
    { pool: 0.86, rise: 0.67, mist: 0.58, light: 0.78, poolCut: 0, a: 1 },
    { pool: 0.95, rise: 0.86, mist: 0.82, light: 0.91, poolCut: 0, a: 1 },
    { pool: 1, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.01, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.02, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.03, rise: 0.92, mist: 1, light: 0.93, poolCut: 0.03, a: 1 },
    { pool: 1.04, rise: 0.8, mist: 1, light: 0.85, poolCut: 0.08, a: 1 },
    { pool: 1.05, rise: 0.67, mist: 1, light: 0.76, poolCut: 0.14, a: 0.97 },
    { pool: 1.06, rise: 0.54, mist: 1, light: 0.66, poolCut: 0.2, a: 0.93 },
    { pool: 1.07, rise: 0.42, mist: 1, light: 0.55, poolCut: 0.27, a: 0.87 },
    { pool: 1.08, rise: 0.31, mist: 1, light: 0.44, poolCut: 0.35, a: 0.79 },
    { pool: 1.09, rise: 0.21, mist: 1, light: 0.33, poolCut: 0.44, a: 0.68 },
    { pool: 1.1, rise: 0.12, mist: 1, light: 0.21, poolCut: 0.54, a: 0.54 },
    { pool: 1.11, rise: 0.05, mist: 1, light: 0.1, poolCut: 0.65, a: 0.38 },
  ];
  /** The settle's slump: the pillar widens as it sinks. */
  const slump = (r: number) => 1 + 0.16 * (1 - r);
  const fr = plan.map((p, i) => {
    const t = (i - PEAK) / 12;
    const ps = Math.min(1, p.pool);
    const d = (1 - p.rise) * colH;
    const moving = i < PEAK || i > HOLD;
    // The pool: spreads over the ground from the centre, bubbles churn, breaks up at the end. While
    // the pillar moves, it is the pool without the pillar's foot, in front of the pillar.
    let pl = scaled(moving ? poolOnly : pool, p.pool, p.pool, K.ax, K.ay);
    if (i > PEAK) pl = churn(pl, t, { amp: 1.2, ampY: 0.6, cell: 6, seed });
    pl = cool(pl, (i - HOLD - 2) / 3, seed + 9);
    if (p.poolCut) pl = cut(pl, (x, y) => pnoise(x, y * 2, 7, 0, 0, seed + 1) * 0.65 + Math.hypot((x - K.ax) / 95, (y - K.ay) / 30) * 0.35 > p.poolCut, 4);
    // The pillar.
    let c: Layer = col;
    const spray = col.empty();
    let headY = 0;
    if (i < PEAK) {
      // Gushing up: thin at first, filling out, its head swelling; spray thrown up round the head.
      const sxs = 0.74 + 0.26 * p.rise;
      c = pillar(shaftL, d, sxs, 0.3, ps, i);
      headY = top + d;
      const hw = shw * sxs * 1.15;
      for (let k = 0; k < 7; k++) {
        const ux = rr(seed + 40, k + 11 * i, -1, 1);
        const s = shapes[Math.floor(rnd(seed + 41, k + 11 * i) * shapes.length)];
        stamp(spray, s, scx + ux * hw * 1.05, headTop(scx + ux * hw, headY, hw, i) - rr(seed + 42, k + 11 * i, 2, 9) - 3 * (1 - Math.abs(ux)));
      }
    } else if (i > HOLD) {
      // Sinking back: churning and cooling, slumping wider, the same round head on its falling top.
      let sh = churn(shaftL, t, { amp: 1.3, ampY: 2.2, cell: 7, seed: seed + 2, flow: [0, -1.4] });
      sh = cool(sh, (i - HOLD - 3) / 3, seed + 10);
      c = pillar(sh, d, slump(p.rise), 0.3, ps, i);
      headY = top + d;
      // Drops break off the head (three a frame over frames 7-12) and fall in arcs into the pool.
      for (let k = 0; k < 18; k++) {
        const fk = HOLD + 1 + Math.floor(k / 3), dt = i - fk;
        if (dt < 0 || dt > 4) continue;
        const rk = plan[fk].rise, hk = shw * slump(rk) * 1.15;
        const ux = rr(seed + 50, k, -1, 1);
        const x0 = scx + ux * hk * 0.9, y0 = headTop(scx + ux * hk * 0.9, top + (1 - rk) * colH, hk, fk) + 1;
        const vx = (ux < 0 ? -1 : 1) * rr(seed + 51, k, 1.2, 3.4), vy = -rr(seed + 52, k, 1.5, 4.5);
        const x = x0 + vx * dt * 2, y = y0 + vy * dt + 2.4 * dt * dt;
        if (y > clipY(Math.round(x), ps) - 3) continue;
        stamp(spray, shapes[Math.floor(rnd(seed + 53, k) * shapes.length)], x, y);
      }
    } else if (i > PEAK) {
      c = churn(col, t, { amp: 1.3, ampY: 2.2, cell: 7, seed: seed + 2, flow: [0, -1.4] });
    }
    // His venom mist: comes up beside the gushing head (never above it), sways, then rises and thins away.
    let ms: Layer | null = null;
    if (p.mist > 0) {
      ms = i < PEAK
        ? cut(moved(mist, 0, d * 0.85), (x, y) => y >= headY + 5 && grain(x, y, seed + 4) < p.mist + 0.15, 2, false)
        : wobble(churn(mist, t, { amp: 1.4, cell: 6, seed: seed + 5 }), t, 1.3, 9, seed + 6);
      if (i > HOLD + 1) ms = cut(moved(ms, 0, -(i - HOLD - 1) * 1.5), (x, y) => grain(x, y, seed + 7) > (i - HOLD - 1) * 0.1, 2, false);
    }
    // His drops: beside the gushing head they ride with the pillar; the splash drops fly out from the
    // pool's edge to his places by frame 4 (none on frame 0); after the peak they are thrown out and
    // rain down.
    const sc = [0.55, 0.7, 0.84, 0.95][i] ?? 1;
    const sxsR = 0.74 + 0.26 * p.rise;
    const dr = moveDrops(drops, (k, cx, cy) => {
      if (i < PEAK) {
        if (cy < K.ay - 55 && Math.abs(cx - scx) < shw + 26) {
          const nx = scx + (cx + 0.5 - scx) * sxsR - 0.5, ny = cy + d;
          return ny > K.ay - 22 || ny < headY + 6 ? null : [nx - cx, ny - cy];
        }
        if (i === 0) return null;
        const nx = K.ax + (cx - K.ax) * sc, ny = K.ay + (cy - K.ay) * sc - 9 * Math.sin(Math.PI * sc) * (1 - sc) * 2;
        return [nx - cx, ny - cy];
      }
      if (i > HOLD + 6 && rnd(seed + 8, k) < (i - HOLD - 6) * 0.25) return null;
      const dir = Math.sign(cx - K.ax) || 1;
      const u = Math.max(0, i - PEAK) / 3;
      return [dir * 1.2 * u, -1.5 * u + 0.9 * u * u];
    });
    // His light: spreads out with the pool from the pillar's foot as it comes up, then dims.
    const lt = light.mul(p.light).scaled(ps, K.ax, K.ay).render();
    const gl = scaled(glowMul(glowG, p.light), ps, ps, K.ax, K.ay);
    // (the soft edges of his mist go with the mist)
    let gm: Layer = glowP;
    if (i < PEAK) gm = p.mist > 0 ? cut(moved(glowP, 0, d * 0.85), (x, y) => y >= headY + 5 && grain(x, y, seed + 4) < p.mist + 0.15, 0, false) : glowP.empty();
    else if (i > HOLD + 1) gm = glowMul(moved(glowP, 0, -(i - HOLD - 1) * 1.5), Math.max(0, 1 - (i - HOLD - 1) * 0.12));
    const out = fadeTop(stackC(K.w, K.h, lt, gl, gm, c, pl, i > HOLD ? cool(spray, (i - HOLD - 3) / 3, seed + 12) : spray, ms, dr), 5, 16, seed + 20);
    return p.a < 1 ? fade(out, p.a) : out;
  });
  return vfxSprite('blast', 'Poison blast: gushing pillar of slime into a bubbling pool', [K.ax, K.ay], { blast: { frames: fr, fps: 12, loop: false } });
}

