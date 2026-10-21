/**
 * Several primitives fused into one smooth volume: the height toward the viewer is a smooth max of
 * theirs (blended over `k` px), so chest, waist, haunch and neck flow into each other without
 * creases, and the normal is the slope of that height field.
 */
function fused(prims: Prim[], k = 3): Prim {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of prims) {
    x0 = Math.min(x0, p.box[0]);
    y0 = Math.min(y0, p.box[1]);
    x1 = Math.max(x1, p.box[2]);
    y1 = Math.max(y1, p.box[3]);
  }
  const height = (px: number, py: number): [number, Hit | null] => {
    let h = 0, top: Hit | null = null;
    for (const p of prims) {
      if (px < p.box[0] || px > p.box[2] + 1 || py < p.box[1] || py > p.box[3] + 1) continue;
      const hh = p.at(px, py);
      if (!hh) continue;
      const z = Math.max(0, hh.z);
      if (!top) h = z;
      else {
        const d = Math.max(k - Math.abs(h - z), 0) / k;
        h = Math.max(h, z) + d * d * k * 0.25;
      }
      if (!top || hh.z > top.z) top = hh;
    }
    return [h, top];
  };
  return {
    box: [x0, y0, x1, y1],
    at(px, py) {
      const [h, top] = height(px, py);
      if (!top) return null;
      const e = 0.75;
      const gx = (height(px + e, py)[0] - height(px - e, py)[0]) / (2 * e);
      const gy = (height(px, py + e)[0] - height(px, py - e)[0]) / (2 * e);
      const l = Math.hypot(gx, gy, 1);
      return { ...top, x: px, y: py, nx: -gx / l, ny: -gy / l, nz: 1 / l, z: h };
    },
  };
}

function raiju(): WorldSprite {
  const W = 280, H = 190, cx = 140, cy = 95;
  const Z = 1.5; // the pose table is in body units; the beast is drawn 1.5x
  const frames: Canvas[] = [];
  POUNCE.forEach((g, fi) => {
    const t = fi / POUNCE.length;
    const f = new Frame(W, H);
    const style = { outline: RAI.outline, line: RAI.line, solid: 150 };
    const soft = { outline: RAI.outline, line: RAI.soft, solid: 150 };
    const bare = { outline: RAI.outline, line: null, solid: 150 };
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch), pd = g.pitch / D2R;
    /** Body space (pitched about the anchor) to the canvas, and unpitched targets to the canvas. */
    const B = (x: number, y: number): P2 => [cx + (x * cp - y * sp) * Z, cy + (x * sp + y * cp) * Z];
    const A = (p: P2): P2 => [cx + p[0] * Z, cy + p[1] * Z];
    const C = B(g.span, 0), Hp = B(-g.span, 0);
    /** Soft golden fur: cream on top, warm gold, amber, brown-orange underneath; band edges notched like fur. */
    const fur = (seed: number, dk = 0, bias = 0, lo = 1) => (h: Hit): Color => {
      const L = 0.1 + 0.9 * lit(h, 0.35);
      const comb = fract((h.x + h.y * 0.45) / 3.4 + noise(h.x, h.y, 5, seed) * 1.4) - 0.5;
      const v = L + bias + comb * 0.06 + (noise(h.x, h.y, 2.4, seed + 1) - 0.5) * 0.04;
      let s = 0;
      for (const c of [0.14, 0.25, 0.36, 0.48, 0.6, 0.73, 0.87]) if (v >= c) s++;
      return RAI.ramp[clamp(s - dk, lo, 7)];
    };
    /** A fur tuft: shaded like the coat it grows from, a little brighter toward the tip. */
    const tuft = (seed: number, dk = 0, bias = 0) => (h: Hit): Color => fur(seed, dk, bias + (h.u - 0.4) * 0.16)(h);
    const tufts = (defs: [P2, number, number, number][], tip = 2): Prim[] =>
      defs.map(([r, a, l, w], j) => {
        const d = dirOf(a + pd + Math.sin(TAU * t + j * 1.7) * 4);
        return lens(r, [r[0] + d[0] * l * Z, r[1] + d[1] * l * Z], w * Z, { tip, peak: 0.25, base: 0.5, bend: (j % 2 ? 0.5 : -0.5) * Z });
      });
    type Tuft = [P2, number, number, number];
    /** Bolt (the tail): a white-hot spine, pale yellow, gold edges. */
    const boltShade = (h: Hit): Color => RAI.ramp[clamp(Math.round(4 + (1 - Math.abs(h.v)) * 3.4 + (lit(h, 0.3) - 0.5) * 1.2 - 0.2), 4, 7)];
    // --- legs: slim and long, a small paw and three claws -----------------------------------
    const frontLeg = (target: P2, far: boolean) => {
      const S = B(g.span + (far ? 1 : 3), 5);
      const P = reachTo(S, A(target), 24.5 * Z);
      const E = knee(S, P, 12.5 * Z, 12.5 * Z, true);
      const ang = Math.atan2(P[1] - E[1], P[0] - E[0]);
      const pa = ang * 0.55;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.1 * Z, P[1] + Math.sin(pa) * 1.1 * Z];
      return { prim: fused([lens(S, E, (far ? 3.4 : 3.8) * Z, { peak: 0.25, tip: 0.55, base: 1 }), tube([E, P], (u) => lerp(2, 1.55, u) * Z), blob(pc[0], pc[1], 2.5 * Z, 1.7 * Z, pa)], 1.5 * Z), P: pc, E, pa };
    };
    const hindLeg = (target: P2, far: boolean) => {
      const Hj = B(-g.span - 1, 4);
      const P = reachTo(Hj, A(target), 31 * Z);
      const toHip = Math.atan2(Hj[1] - P[1], Hj[0] - P[0]) - 0.55;
      const K: P2 = [P[0] + Math.cos(toHip) * 9 * Z, P[1] + Math.sin(toHip) * 9 * Z];
      const N = knee(Hj, K, 12 * Z, 12 * Z, false);
      const ang = Math.atan2(P[1] - K[1], P[0] - K[0]);
      const pa = ang * 0.8;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.1 * Z, P[1] + Math.sin(pa) * 1.1 * Z];
      return { prim: fused([lens(Hj, N, (far ? 5 : 5.6) * Z, { peak: 0.3, tip: 0.5, base: 1 }), tube([N, K], (u) => lerp(2.4, 1.7, u) * Z), tube([K, P], () => 1.5 * Z), blob(pc[0], pc[1], 2.4 * Z, 1.7 * Z, pa)], 1.5 * Z), P: pc, E: N, pa };
    };
    const claws = (P: P2, pa: number): Prim[] => {
      const spread = 0.3 + g.reach * 0.25;
      return [-1, 0, 1].map((k) => {
        const r: P2 = [P[0] + Math.cos(pa) * 2 * Z, P[1] + Math.sin(pa) * 2 * Z];
        const a = pa + 0.55 + k * spread;
        const l = (1.8 + g.reach * 1) * Z;
        return lens(r, [r[0] + Math.cos(a) * l, r[1] + Math.sin(a) * l], 0.6 * Z, { tip: 1.2, peak: 0.2, base: 1, bend: 0.4 * Z });
      });
    };
    const clawShade = (h: Hit): Color => (h.u > 0.4 ? RAI.tooth[0] : RAI.tooth[1]);
    // --- tail: a lightning bolt, zig-zag-zig, forked at the end ------------------------------
    const tRoot = B(-g.span - 7, -4);
    const tAng = lerp(-148, -172, g.reach) + pd + Math.sin(TAU * t) * 5;
    const td = dirOf(tAng), tn: P2 = [-td[1], td[0]];
    const TL = (a: number, c: number): P2 => [tRoot[0] + (td[0] * a + tn[0] * c) * Z, tRoot[1] + (td[1] * a + tn[1] * c) * Z];
    const tPts = [TL(0, 0), TL(10, -3.5), TL(8.5, 3), TL(19, 0), TL(17.5, 5), TL(25, 2.5)];
    const tTip = tPts[tPts.length - 1];
    const tailPrims: Prim[] = [zig(tPts, (u) => lerp(2.6, 1.4, u) * Z)];
    for (const [da, len] of [[-30, 9], [26, 7]] as P2[]) tailPrims.push(bolt(tTip, tAng + da, len * Z, 1.3 * Z, 1.4 * Z, 1, 930 + fi * 3 + da));
    f.part_(tailPrims, boltShade, style);
    f.part_(tufts([[B(-g.span - 6, -5), 196, 6, 2], [B(-g.span - 7, -3), 172, 6.5, 2]]), tuft(29, 0, -0.04), bare);
    // --- far legs, a step darker behind --------------------------------------------------------
    const hF = hindLeg(g.hF, true), fF = frontLeg(g.fF, true);
    f.part_([hF.prim], fur(11, 2, -0.02, 0), style);
    f.part_(claws(hF.P, hF.pa), clawShade, style);
    f.part_([fF.prim], fur(13, 2, -0.02, 0), style);
    f.part_(claws(fF.P, fF.pa), clawShade, style);
    // --- body: deep chest, tucked waist, haunch and neck in one smooth volume ------------------
    const Hd = B(g.span + g.head[0], g.head[1]);
    const hA = g.ha + g.pitch, HS = 1.0 * Z;
    const ca = Math.cos(hA), sa = Math.sin(hA);
    const HZ = (x: number, y: number): P2 => [Hd[0] + (x * ca - y * sa) * HS, Hd[1] + (x * sa + y * ca) * HS];
    const bodyId = f.part_([fused([
      blob(C[0] + 0.5 * Z, C[1] + 1 * Z, 11 * Z, 12 * Z, g.pitch - 0.25),
      tube([B(g.span - 2, -2.5), B(0, g.arch * 0.5 - 3.5), B(-g.span + 2, -2)], (u) => lerp(7.5, 5.6, Math.sin(u * Math.PI)) * Z),
      blob(Hp[0], Hp[1] - 0.5 * Z, 9.5 * Z, 9 * Z, g.pitch + 0.1),
      tube([B(g.span + 4, -5), HZ(-3, 1.5)], (u) => lerp(6.5, 4.8, u) * Z),
    ], 4 * Z)], fur(23), style);
    // Fur fringes: the back, the belly, the back of the haunch (no inner lines: they are the coat).
    const backAt = (u: number, dy = 0): P2 => B(lerp(g.span - 1, -g.span - 6, u), lerp(-10.5, -9, u) + g.arch * Math.sin(u * Math.PI) * 0.6 + dy);
    f.part_(tufts([0.3, 0.45, 0.6, 0.75, 0.9].map((u, j): Tuft => [backAt(u, 1.2), -174 + j, 5.5 + (j % 2), 1.4])), tuft(31, 0, 0.02), bare);
    f.part_(tufts([0.15, 0.32, 0.5, 0.68].map((u, j): Tuft => [B(lerp(g.span + 2, -g.span + 4, u), lerp(10, 2.5, u) + g.arch * 0.25 * Math.sin(u * Math.PI)), 158 + j * 4, 5.5 + (j % 2), 1.4])), tuft(33, 0, -0.04), bare);
    f.part_(tufts([[B(-g.span - 8, 2), 176, 5.5, 1.6], [B(-g.span - 6, 6), 160, 5, 1.4]]), tuft(35, 0, -0.04), bare);
    // --- ruff: pointed fur tufts over the neck and shoulders, in two layers ---------------------
    const neckTop = (u: number): P2 => {
      const a = HZ(-6, -3.5), b = B(g.span - 4, -9.5);
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 1.5 * Z];
    };
    const neckSide = (u: number): P2 => {
      const a = HZ(-5, 1), b = B(g.span + 1, -3);
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    };
    f.part_(tufts([0, 0.22, 0.44, 0.66, 0.88, 1.05].map((u, j): Tuft => [neckTop(u), -148 - u * 26, 11 - u * 2.5 + (j % 2) * 1.5, 2.6])), tuft(41, 1, 0.04), soft);
    f.part_(tufts([0.1, 0.35, 0.6, 0.85].map((u, j): Tuft => [neckSide(u), -170 + u * 8, 10 - u * 2 + (j % 2), 2.6])), tuft(43, 0, 0.02), soft);
    f.part_(tufts([[B(g.span + 7, 1), 150, 8.5, 2.4], [B(g.span + 6, 5), 138, 8, 2.3], [B(g.span + 4, 9), 126, 6.5, 2]]), tuft(45, 0, -0.02), soft);
    // --- head: a wolf in profile, ears up, snarling ---------------------------------------------
    f.part_([fused([lens(HZ(0.5, -4.5), HZ(-1.5, -15), 2.8 * HS, { peak: 0.3, tip: 1.5, bend: -0.8 })])], fur(47, 2), style);
    const jawEnd = HZ(14.5, 3.5 + 7 * g.jaw);
    f.part_([lens(HZ(0, 3.5), jawEnd, 2.2 * HS, { peak: 0.25, tip: 0.8, base: 1 })], fur(49, 0, -0.1), style);
    const jy = (x: number): P2 => {
      const a = HZ(0, 3.5), u = x / 14.5;
      return [lerp(a[0], jawEnd[0], u), lerp(a[1], jawEnd[1], u) - 1.6 * HS];
    };
    f.part_([poly([HZ(1.5, 1.5), HZ(16, 2), jy(14.5), jy(6), HZ(2, 4.5)])], (h) => (h.v > 0.45 ? RAI.mouth[2] : h.v > -0.2 ? RAI.mouth[0] : RAI.mouth[1]), { outline: null, line: null });
    const up = (x: number, w: number, l: number): Prim => poly([HZ(x - w / 2, 2), HZ(x + w / 2, 2), HZ(x + 0.15, 2 + l)]);
    const dn = (x: number, w: number, l: number): Prim => {
      const p = jy(x);
      return poly([[p[0] - ((ca * w) / 2) * HS, p[1] - ((sa * w) / 2) * HS], [p[0] + ((ca * w) / 2) * HS, p[1] + ((sa * w) / 2) * HS], [p[0] + sa * l * HS, p[1] - ca * l * HS]]);
    };
    f.part_([up(13, 1.6, 4.6), up(15, 0.9, 2), up(10, 1.1, 2.4), up(7.5, 1, 2), dn(11.5, 1.5, 3.4), dn(13.6, 0.9, 1.6), dn(8, 1, 1.8)], (h) => RAI.tooth[h.v > 0.3 ? 1 : 0], { outline: RAI.outline, line: null });
    f.part_([fused([
      blob(Hd[0], Hd[1], 7.2 * HS, 6.2 * HS, hA),
      tube([HZ(2, -1.2), HZ(16.3, 0.6)], (u) => lerp(4.2, 2.5, u) * HS),
      blob(...HZ(1.5, 2.8), 5.2 * HS, 3.6 * HS, hA + 0.15),
      blob(...HZ(4, -3.4), 4.6 * HS, 2.1 * HS, hA + 0.3),
    ], 2.5 * Z)], fur(51, 0, 0.02), style);
    f.part_([fused([lens(HZ(-2.5, -4.6), HZ(-5, -15.5), 3.2 * HS, { peak: 0.3, tip: 1.5, bend: -1 })])], fur(53, 0, 0.04), style);
    f.part_([lens(HZ(-2.9, -6.4), HZ(-4.8, -13.5), 1.4 * HS, { peak: 0.35, tip: 1.3, bend: -0.6 })], (h) => RAI.ramp[h.v < 0 ? 2 : 1], { outline: null, line: null });
    f.part_(tufts([[HZ(-3, 3), 172 + (hA / D2R) * 0.5, 8, 2], [HZ(-2, 5.5), 150, 7.5, 1.9], [HZ(0, 7.2), 128, 6, 1.6]]), tuft(55, 0, -0.02), soft);
    // --- near legs in front ------------------------------------------------------------------
    const hN = hindLeg(g.hN, false), fN = frontLeg(g.fN, false);
    f.part_([hN.prim], fur(37, 0, 0.03), soft);
    f.part_(claws(hN.P, hN.pa), clawShade, style);
    f.part_([fN.prim], fur(39, 0, 0.03), soft);
    f.part_(claws(fN.P, fN.pa), clawShade, style);
    const fc = f.finish();
    // Snarl wrinkles on the muzzle, the nose, and a glowing white eye in a dark rim.
    for (const x of [8.2, 10.2, 12.2]) {
      for (const [ox, oy] of [[0, -3], [0.6, -2.1]] as P2[]) {
        const [X, Y] = HZ(x + ox, oy).map(Math.round);
        if (fc.alpha(X, Y) > 200) fc.set(X, Y, RAI.line);
      }
    }
    const [nX, nY] = HZ(16.6, -0.4).map(Math.round);
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1], [1, 0], [1, 1]]) fc.set(nX + dx, nY + dy, RAI.outline);
    fc.set(nX - 1, nY, RAI.mouth[1]);
    const [ex, ey] = HZ(4.6, -1.5).map(Math.round);
    // Rows from the brow down; slanted down toward the nose. 0 skip, 1 rim, 2 pale glow, 3 white.
    const EYE = ['0111110', '1233321', '0123332', '0011111'];
    const eyeCol: Record<string, Color> = { '1': RAI.outline, '2': RAI.glow, '3': RAI.arc };
    EYE.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '0' && fc.alpha(ex - 3 + dx, ey - 2 + dy) > 200) fc.set(ex - 3 + dx, ey - 2 + dy, eyeCol[ch]);
    }));
    // Lightning veins: thin white-hot cracks over the coat, anchored to the body, re-struck every frame.
    const coat = new Set(RAI.ramp.slice(1).map((c) => toHex(c)));
    const onCoat = (x: number, y: number): boolean => fc.alpha(x, y) >= 250 && coat.has(toHex(fc.get(x, y)));
    const VEINS: P2[] = [[g.span + 2, -3], [g.span + 5, 5], [3, -3], [-4, 1], [-g.span - 1, -4], [-g.span + 1, 4], [g.span + 9, -5]];
    const core: P2[] = [];
    const walk = (p: P2, ang: number, steps: number, seed: number, depth: number): void => {
      let [x, y] = p;
      for (let s = 0; s < steps; s++) {
        ang += (rnd(seed, s) - 0.5) * 1.6;
        const len = (2.2 + rnd(seed, s, 1) * 1.6) * Z;
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        const n = Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y)));
        for (let q = 1; q <= n; q++) core.push([Math.round(x + ((nx - x) * q) / n), Math.round(y + ((ny - y) * q) / n)]);
        x = nx;
        y = ny;
        if (depth === 0 && s === 1 && rnd(seed, 99) < 0.7) walk([x, y], ang + (rnd(seed, 98) < 0.5 ? 0.9 : -0.9), 2, seed + 17, 1);
      }
    };
    VEINS.forEach(([vx, vy], k) => {
      const seed = 2100 + fi * 37 + k * 5;
      const p = B(vx + (rnd(seed, 1) - 0.5) * 3, vy + (rnd(seed, 2) - 0.5) * 3);
      walk(p, (rnd(seed, 3) - 0.5) * 2.4 + (rnd(seed, 4) < 0.5 ? 0 : Math.PI), 3 + Math.floor(rnd(seed, 5) * 2), seed, 0);
    });
    const coreSet = new Set(core.filter(([x, y]) => onCoat(x, y)).map(([x, y]) => y * W + x));
    for (const key of coreSet) {
      const x = key % W, y = Math.floor(key / W);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + ox, Y = y + oy;
        if (coreSet.has(Y * W + X) || !onCoat(X, Y)) continue;
        const idx = RAI.ramp.findIndex((c) => toHex(c) === toHex(fc.get(X, Y)));
        if (idx < 6) fc.set(X, Y, RAI.ramp[6]);
      }
    }
    for (const key of coreSet) fc.set(key % W, Math.floor(key / W), RAI.arc);
    // Pale speed streaks trailing behind in the stretch.
    if (g.reach > 0.5) {
      const snap = fc.clone();
      const k = (g.reach - 0.4) / 0.6;
      for (let y = 0; y < H; y++) {
        if (noise(3, y, 2.2, 1500 + fi) < 0.45) continue;
        for (let x = 1; x < W; x++) {
          if (snap.alpha(x, y) < 220 || snap.alpha(x - 1, y) >= 120) continue;
          const len = Math.round((6 + rnd(1600 + fi, y, x) * 16) * k);
          for (let q = 1; q <= len; q++) {
            if (snap.alpha(x - q, y) >= 120) break;
            fc.plot(x - q, y, wa(RAI.ramp[7], 150 * (1 - q / (len + 1))));
          }
        }
      }
    }
    // Small arcs jumping above the back.
    const solidAt = (x: number, y: number): boolean => fc.alpha(x, y) >= 220;
    const top: P2[] = [];
    for (let x = Math.round(Hp[0] - 6 * Z); x <= Math.round(C[0] + 4 * Z); x++)
      for (let y = 1; y < H - 1; y++)
        if (solidAt(x, y)) {
          top.push([x, y]);
          break;
        }
    for (let a = 0; a < 2 && top.length > 12; a++) {
      const i0 = Math.floor(rnd(500 + fi, a) * (top.length - 12));
      const i1 = Math.min(top.length - 1, i0 + 8 + Math.floor(rnd(510 + fi, a) * 8));
      lightningLine(fc, top[i0], top[i1], -(3 + rnd(520 + fi, a) * 3), 0.9, 800 + fi * 10 + a, RAI.arc, RAI.glow, solidAt, 170);
    }
    // Sparks spitting around the feet, a few drifting off the body; one or two cool ones.
    const paws = [fN.P, hN.P, fF.P, hF.P];
    for (let k = 0; k < 14; k++) {
      const src = paws[k % 4];
      const ang = rnd(1900 + fi, k) * TAU, r = (2.5 + rnd(1910 + fi, k) * 5) * Z * 0.8;
      const X = Math.round(src[0] + Math.cos(ang) * r - 2), Y = Math.round(src[1] + Math.sin(ang) * r * 0.7);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, k === 5 && fi % 2 === 0 ? RAI.cool : k % 3 ? RAI.arc : RAI.glow);
      if (k % 4 === 0 && !fc.alpha(X - 1, Y)) fc.plot(X - 1, Y, wa(RAI.glow, 160));
    }
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      const ang = rnd(911, k) * TAU, rr = 0.6 + rnd(912, k) * 0.4;
      const X = Math.round(cx + Math.cos(ang) * 62 * rr - p * 20), Y = Math.round(cy + Math.sin(ang) * 34 * rr);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, p < 0.5 ? RAI.arc : RAI.glow);
    }
    frames.push(fc);
  });
  return flySprite('lightning', 'Raiju (lightning)', [3, 1.6], frames, cx, cy);
}
