/** Wet stone: a little darker and cooler than dry stone, with a cool glint at the top step. */
const STONE_WET = pal([STONE_RAMP[0], mix(STONE_RAMP[1], R.water[1], 0.25), mix(STONE_RAMP[2], R.water[2], 0.2), mix(STONE_RAMP[3], R.water[2], 0.14), mix(STONE_RAMP[4], R.water[4], 0.15), mix(R.paper[4], R.water[5], 0.3)]);
/** Stone seen through the water. */
const STONE_SUB = pal([R.water[0], R.water[1], mix(R.water[1], STONE_RAMP[2], 0.35), mix(R.water[2], STONE_RAMP[3], 0.35), mix(R.water[3], STONE_RAMP[4], 0.3), R.water[4]]);

/** Pixels of a 1 px ellipse ring (no doubled corners), as [x, y, angle] with angle 0 at the right, PI/2 at the front. */
function ellipseRing(cx: number, cy: number, rx: number, ry: number): [number, number, number][] {
  const seen = new Map<string, [number, number, number]>();
  const n = Math.ceil((rx + ry) * 8);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const x = Math.floor(cx + Math.cos(a) * rx), y = Math.floor(cy + Math.sin(a) * ry);
    const key = `${x},${y}`;
    if (!seen.has(key)) seen.set(key, [x, y, a]);
  }
  const pts = [...seen.values()];
  // Pixel-perfect: drop the corner pixel of every L so the ring stays 1 px thin.
  const out: [number, number, number][] = [];
  for (let k = 0; k < pts.length; k++) {
    const prev = out[out.length - 1], next = pts[(k + 1) % pts.length], c = pts[k];
    if (prev && Math.abs(prev[0] - next[0]) === 1 && Math.abs(prev[1] - next[1]) === 1 && Math.abs(prev[0] - c[0]) + Math.abs(prev[1] - c[1]) === 1 && Math.abs(next[0] - c[0]) + Math.abs(next[1] - c[1]) === 1) continue;
    out.push(c);
  }
  return out;
}

function riverStones(): WorldSprite {
  const W = 110, H = 64, ox = 54, oy = 38;
  const stones = [
    { cx: -25, cd: -9, rx: 13.5, rd: 9.5, h: 5, seed: 71 },
    { cx: 2, cd: 2, rx: 12, rd: 8.5, h: 6, seed: 72 },
    { cx: 27, cd: 13, rx: 10.5, rd: 7.5, h: 4.5, seed: 73 },
  ];
  GROUP = 1;
  const sc = new Scene();
  const meshes = stones.map((s) =>
    sc.add(rockMesh({ cx: s.cx, cd: s.cd, rx: s.rx, rd: s.rd, h: s.h + 3, h0: -3, n: 8, seed: s.seed, profile: [[0, 1.03], [0.4, 1], [0.74, 0.88], [1, 0.56]], apexUp: 0.09, jit: 0.11, hJit: 0.04 }), {
      pal: STONE_WET,
      seed: s.seed,
      contrast: 1.15,
      facetVar: 0.05,
      tex: 0.03,
      texCell: 8,
      form: 0.25,
      steps: [1, 2, 3, 3, 4],
    }),
  );
  const f = render(sc, W, H, ox, oy);
  const sub = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] < 0) continue;
    const p = f.world(i);
    if (p[1] < -0.3) {
      f.pal[i] = STONE_SUB;
      f.over[i] = null;
      sub[i] = 1;
    } else if (p[1] < 1.6) {
      // The wet band just above the water.
      f.step[i] = Math.max(1, f.step[i] - 1);
    }
  }
  // Glints on the wet tops (upper-left part of each top) and a moss tuft on the big stone.
  stones.forEach((s, k) => {
    const [gx, gy] = f.proj([s.cx - s.rx * 0.35, s.h + 0.5, s.cd - s.rd * 0.1]).map(Math.round);
    const streak: [number, number, number][] = k === 1 ? [[0, 0, 5], [1, 0, 5], [2, 0, 4], [-1, 1, 4], [4, 2, 4]] : [[0, 0, 5], [1, 0, 4], [-1, 1, 4], [3, -1, 4]];
    for (const [dx, dy, st] of streak) {
      const i = f.idx(gx + dx, gy + dy);
      if (i >= 0 && f.mesh[i] === meshes[k].id && !sub[i] && f.normal(i)[1] > 0.6) f.step[i] = Math.max(f.step[i], st);
    }
    void meshes;
  });
  const base = f.compose();
  base.outline({ toward: toHex(R.water[0]), amount: 0.55 });
  // Soften the outline under water: outline pixels touching submerged stone take a water tone.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (f.pal[i] >= 0 || f.over[i] || base.alpha(x, y) === 0) continue;
      const nearSub = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const j = f.idx(x + dx, y + dy);
        return j >= 0 && sub[j] === 1;
      });
      if (nearSub) base.set(x, y, R.water[1]);
    }
  // Waterline: a light lip where each stone meets the water (front half), broken on the shadow side.
  stones.forEach((s, k) => {
    const [cx, cy] = f.proj([s.cx, 0, s.cd]);
    for (const [x, y, a] of ellipseRing(cx, cy, s.rx * 1.0 + 0.6, (s.rd * 1.0 + 0.6) * K)) {
      if (a <= 0.15 || a >= Math.PI - 0.15) continue;
      const i = f.idx(x, y);
      if (i < 0 || f.mesh[i] !== meshes[k].id) continue;
      const lit = Math.cos(a) < 0.35;
      if (!lit && hash(x, y, 77) < 0.5) continue;
      base.set(x, y, lit ? mix(R.water[5], R.paper[4], 0.35) : R.water[4]);
    }
  });

  const frames: Canvas[] = [];
  for (let t = 0; t < 6; t++) {
    const c = base.clone();
    const canDraw = (x: number, y: number) => {
      const i = f.idx(x, y);
      return i >= 0 && (c.alpha(x, y) === 0 || sub[i] === 1 || (f.pal[i] < 0 && !f.over[i]));
    };
    stones.forEach((s, k) => {
      const [cx, cy] = f.proj([s.cx, 0, s.cd]);
      for (let r = 0; r < 2; r++) {
        const age = ((t + 3 * r + k * 2) % 6) / 6; // 0 new .. 5/6 old
        const d = 1.5 + age * 7;
        const col = age < 0.3 ? R.water[5] : age < 0.6 ? R.water[4] : R.water[3];
        for (const [x, y, a] of ellipseRing(cx, cy, s.rx + d, (s.rd + d) * K)) {
          // Three arcs per ring that shorten as the ring spreads and fades.
          if (Math.cos(a * 3 + k * 1.7 + r * 2.1) < -0.75 + age * 1.3) continue;
          if (!canDraw(x, y)) continue;
          c.set(x, y, col);
        }
      }
    });
    // Little sun glints on the water that come and go.
    const glints: [number, number, number][] = [
      [-40, -2, 0],
      [-8, 6, 2],
      [14, -12, 4],
      [38, 2, 1],
      [-30, 9, 3],
    ];
    for (const [gx, gy, ph] of glints) {
      const on = (t + ph) % 6;
      if (on > 2) continue;
      const x = ox + gx, y = oy + gy;
      const len2 = on === 1 ? 3 : 2;
      for (let k = 0; k < len2; k++) if (canDraw(x + k, y)) c.set(x + k, y, on === 1 ? mix(R.water[5], R.paper[4], 0.5) : R.water[5]);
    }
    frames.push(c);
  }
  const front = stones[0];
  const [, gy] = f.proj([front.cx, 0, front.cd - front.rd]);
  return finish('river_stones', 'Stepping Stones', [1.4, 0.15], ['water', 'climbable'], { idle: { frames, fps: 5 } }, ox, Math.round(gy) + 1);
}
