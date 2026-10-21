interface Pounce {
  /** Body pitch (radians, positive dips the nose), half the chest-to-hip distance, back arch (negative humps up). */
  pitch: number;
  span: number;
  arch: number;
  /** Head centre from the chest centre (body units, before pitch), tilt (radians, positive looks down), jaw (0..1). */
  head: P2;
  ha: number;
  jaw: number;
  /** Paw targets from the anchor (body units): front near/far, hind near/far. */
  fN: P2;
  fF: P2;
  hN: P2;
  hF: P2;
  /** 0 gathered .. 1 fully stretched (claws spread, tail streams, after-images). */
  reach: number;
}
// coil, spring, launch, stretch, strike, fold, tuck, gather
const POUNCE: Pounce[] = [
  { pitch: 0.12, span: 9, arch: -8, head: [18, -5], ha: 0.3, jaw: 0.3, fN: [15, 21], fF: [11, 21], hN: [0, 21], hF: [-4, 21], reach: 0 },
  { pitch: -0.2, span: 12, arch: -3, head: [20, -9], ha: -0.05, jaw: 0.5, fN: [30, 9], fF: [26, 12], hN: [-30, 19], hF: [-26, 21], reach: 0.3 },
  { pitch: -0.1, span: 15, arch: 0, head: [21, -8], ha: -0.08, jaw: 0.75, fN: [41, 2], fF: [37, 5], hN: [-44, 11], hF: [-40, 14], reach: 0.75 },
  { pitch: -0.02, span: 16, arch: 2, head: [22, -6], ha: 0.02, jaw: 0.95, fN: [44, 5], fF: [40, 8], hN: [-48, 5], hF: [-44, 8], reach: 1 },
  { pitch: 0.1, span: 15, arch: 1, head: [22, -4], ha: 0.16, jaw: 1, fN: [41, 14], fF: [37, 16], hN: [-46, -1], hF: [-42, 2], reach: 0.9 },
  { pitch: 0.1, span: 12, arch: -4, head: [20, -5], ha: 0.22, jaw: 0.6, fN: [27, 19], fF: [23, 20], hN: [-24, 11], hF: [-28, 9], reach: 0.4 },
  { pitch: 0.06, span: 10, arch: -8, head: [19, -6], ha: 0.26, jaw: 0.4, fN: [16, 19], fF: [12, 20], hN: [-6, 17], hF: [-10, 16], reach: 0.1 },
  { pitch: 0.1, span: 9, arch: -9, head: [18, -5], ha: 0.3, jaw: 0.3, fN: [14, 21], fF: [10, 21], hN: [-2, 20], hF: [-6, 20], reach: 0 },
];

/** The point `len` from s toward t, or t itself when it is closer. */
function reachTo(s: P2, t: P2, len: number): P2 {
  const dx = t[0] - s[0], dy = t[1] - s[1], d = Math.hypot(dx, dy);
  return d <= len ? t : [s[0] + (dx / d) * len, s[1] + (dy / d) * len];
}

/** The middle joint of a two-bone limb from a to b, bent to the clockwise side of a->b when `cw`. */
function knee(a: P2, b: P2, l1: number, l2: number, cw: boolean): P2 {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const dl = Math.hypot(dx, dy) || 1;
  const d = Math.min(dl, l1 + l2 - 0.01);
  const ux = dx / dl, uy = dy / dl;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  // Screen y points down, so (-uy, ux) is a clockwise quarter turn.
  const px = cw ? -uy : uy, py = cw ? ux : -ux;
  return [a[0] + ux * along + px * h, a[1] + uy * along + py * h];
}

/** A zigzag bolt from `root` along `ang` (degrees): a tapering tube whose spine kinks left and right. */
function bolt(root: P2, ang: number, len: number, w: number, amp: number, kinks: number, seed: number, tipW = 0.35): Prim {
  const d = dirOf(ang), n: P2 = [-d[1], d[0]];
  const pts: P2[] = [root];
  for (let k = 1; k <= kinks; k++) {
    const u = (k - 0.2 + rnd(seed, k) * 0.4) / (kinks + 1);
    const off = (k % 2 ? 1 : -1) * amp * (0.75 + rnd(seed, k, 1) * 0.5);
    pts.push([root[0] + d[0] * len * u + n[0] * off, root[1] + d[1] * len * u + n[1] * off]);
  }
  pts.push([root[0] + d[0] * len, root[1] + d[1] * len]);
  return tube(pts, (u) => lerp(w, tipW, u));
}

function raiju(): WorldSprite {
  const W = 220, H = 160, cx = 110, cy = 80;
  const Z = 1.2; // the pose table is in body units; the beast is drawn 1.2x
  const frames: Canvas[] = [];
  POUNCE.forEach((g, fi) => {
    const t = fi / POUNCE.length;
    const f = new Frame(W, H);
    const style = { outline: RAI.outline, line: RAI.line, solid: 150 };
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch), pd = g.pitch / D2R;
    /** Body space (pitched about the anchor) to the canvas, and unpitched targets to the canvas. */
    const B = (x: number, y: number): P2 => [cx + (x * cp - y * sp) * Z, cy + (x * sp + y * cp) * Z];
    const A = (p: P2): P2 => [cx + p[0] * Z, cy + p[1] * Z];
    const C = B(g.span, 0), Hp = B(-g.span, 0);
    // Fur: light bands end in clumps that lean back (a ramp that rises along the fur and drops sharply).
    const comb = (x: number, y: number, seed: number): number => fract((x + y * 0.5) / 4 + noise(x, y, 6, seed) * 1.2) - 0.5;
    /** Lit electric flesh: light planes on top, amber shadow underneath, a white-hot core, fur clumps. */
    const flesh = (seed: number, dk = 0, bias = 0) => (h: Hit): Color => {
      const v = 0.7 * lit(h, 0.3) + 0.3 * Math.pow(h.nz, 1.5) - 0.02 + bias + comb(h.x, h.y, seed) * 0.16;
      return RAI.ramp[clamp(stepOf(v, h.x, h.y, [0.3, 0.46, 0.63, 0.8], 0.035, seed, 2.4) - dk, 0, 5)];
    };
    /** Fur tufts: darker at the root (under the tuft above), lit toward the tip. */
    const tuft = (seed: number, dk = 0, bias = 0) => (h: Hit): Color => {
      const v = 0.72 * lit(h, 0.3) + 0.22 * h.u + bias + (noise(h.x, h.y, 2, seed) - 0.5) * 0.12;
      return RAI.ramp[clamp(stepOf(v, h.x, h.y, [0.3, 0.46, 0.62, 0.8], 0.04, seed) - dk, 0, 5)];
    };
    const tufts = (defs: [P2, number, number, number][], seed: number): Prim[] =>
      defs.map(([r, a, l, w], j) => {
        const d = dirOf(a + pd + Math.sin(TAU * t + j * 1.7) * 4);
        return lens(r, [r[0] + d[0] * l * Z, r[1] + d[1] * l * Z], w * Z, { tip: 1.6, peak: 0.3, base: 0.6, bend: (j % 2 ? 0.7 : -0.7) * Z });
      });
    /** Bolts (mane, tail): a white-hot spine, pale yellow, gold edges. */
    const boltShade = (dk = 0) => (h: Hit): Color => RAI.ramp[clamp(stepOf(0.36 + (1 - Math.abs(h.v)) * 0.5 + lit(h, 0.3) * 0.2, h.x, h.y, [0.3, 0.5, 0.66, 0.82], 0.04, 61) - dk, 2, 5)];
    // --- legs: long and jointed, a paw and three claws ---------------------------------------
    const frontLeg = (target: P2, far: boolean) => {
      const S = B(g.span + (far ? 1 : 3), 5);
      const P = reachTo(S, A(target), 24.5 * Z);
      const E = knee(S, P, 12.5 * Z, 12.5 * Z, true);
      const ang = Math.atan2(P[1] - E[1], P[0] - E[0]);
      const pa = ang * 0.55;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.2 * Z, P[1] + Math.sin(pa) * 1.2 * Z];
      return { prims: [lens(S, E, (far ? 4.2 : 4.8) * Z, { peak: 0.25, tip: 0.5, base: 1 }), tube([E, P], (u) => lerp(2.6, 2, u) * Z), blob(pc[0], pc[1], 3 * Z, 2.1 * Z, pa)], P: pc, E, pa };
    };
    const hindLeg = (target: P2, far: boolean) => {
      const Hj = B(-g.span - 1, 4);
      const P = reachTo(Hj, A(target), 31 * Z);
      const toHip = Math.atan2(Hj[1] - P[1], Hj[0] - P[0]) - 0.55;
      const K: P2 = [P[0] + Math.cos(toHip) * 9 * Z, P[1] + Math.sin(toHip) * 9 * Z];
      const N = knee(Hj, K, 12 * Z, 12 * Z, false);
      const ang = Math.atan2(P[1] - K[1], P[0] - K[0]);
      const pa = ang * 0.8;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.2 * Z, P[1] + Math.sin(pa) * 1.2 * Z];
      return { prims: [lens(Hj, N, (far ? 6 : 7) * Z, { peak: 0.3, tip: 0.5, base: 1 }), tube([N, K], (u) => lerp(3, 2.2, u) * Z), tube([K, P], () => 1.9 * Z), blob(pc[0], pc[1], 2.9 * Z, 2 * Z, pa)], P: pc, E: N, pa };
    };
    const claws = (P: P2, pa: number): Prim[] => {
      const spread = 0.3 + g.reach * 0.25;
      return [-1, 0, 1].map((k) => {
        const r: P2 = [P[0] + Math.cos(pa) * 2.2 * Z, P[1] + Math.sin(pa) * 2.2 * Z];
        const a = pa + 0.55 + k * spread;
        const l = (2.4 + g.reach * 1.2) * Z;
        return lens(r, [r[0] + Math.cos(a) * l, r[1] + Math.sin(a) * l], 0.8 * Z, { tip: 1.2, peak: 0.2, base: 1, bend: 0.5 * Z });
      });
    };
    const clawShade = (h: Hit): Color => RAI.ramp[h.u > 0.45 ? 5 : 4];
    // --- tail: a lightning bolt, zig-zag-zig, forked at the end ------------------------------
    const tRoot = B(-g.span - 8, -5);
    const tAng = lerp(-148, -172, g.reach) + pd + Math.sin(TAU * t) * 5;
    const td = dirOf(tAng), tn: P2 = [-td[1], td[0]];
    const TL = (a: number, c: number): P2 => [tRoot[0] + (td[0] * a + tn[0] * c) * Z, tRoot[1] + (td[1] * a + tn[1] * c) * Z];
    const tPts = [TL(0, 0), TL(10, -3.5), TL(8.5, 3), TL(19, 0), TL(17.5, 5), TL(25, 2.5)];
    const tTip = tPts[tPts.length - 1];
    const tailPrims: Prim[] = [tube(tPts, (u) => lerp(3, 1.7, u) * Z)];
    for (const [da, len] of [[-30, 9], [26, 7]] as P2[]) tailPrims.push(bolt(tTip, tAng + da, len * Z, 1.5 * Z, 1.4 * Z, 1, 930 + fi * 3 + da));
    f.part_(tailPrims, boltShade(), style);
    // Far mane (behind the neck), then the far legs: a step darker.
    const maneRoot = (u: number): P2 => {
      const a = B(g.span + g.head[0] - 5, g.head[1] - 4), b = B(g.span - 2, -10);
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 2 * Z];
    };
    f.part_([0.2, 0.55, 0.85].map((u, j) => bolt(maneRoot(u), -128 - u * 50 + pd + Math.sin(TAU * t + j * 2) * 5, (13 - u * 3) * Z, 1.6 * Z, 1.5 * Z, 2, 950 + fi * 5 + j)), boltShade(1), style);
    const hF = hindLeg(g.hF, true), fF = frontLeg(g.fF, true);
    f.part_(hF.prims, flesh(11, 1, -0.04), style);
    f.part_(claws(hF.P, hF.pa), clawShade, style);
    f.part_(fF.prims, flesh(13, 1, -0.04), style);
    f.part_(claws(fF.P, fF.pa), clawShade, style);
    // --- body: deep chest, tucked waist, haunch, and the neck ---------------------------------
    const Hd = B(g.span + g.head[0], g.head[1]);
    const hA = g.ha + g.pitch, HS = 1.0 * Z;
    const ca = Math.cos(hA), sa = Math.sin(hA);
    const HZ = (x: number, y: number): P2 => [Hd[0] + (x * ca - y * sa) * HS, Hd[1] + (x * sa + y * ca) * HS];
    const bodyId = f.part_([
      blob(C[0], C[1], 12 * Z, 11 * Z, g.pitch - 0.2),
      tube([C, B(0, g.arch * 0.5), Hp], (u) => lerp(9, 7, Math.sin(u * Math.PI)) * Z),
      blob(Hp[0], Hp[1], 10.5 * Z, 10 * Z, g.pitch + 0.1),
      tube([B(g.span + 5, -5), HZ(-4, 1)], (u) => lerp(7.5, 6.2, u) * Z),
    ], flesh(23), style);
    // --- layered fur: belly fringe, haunch, shoulder, two rows on the back, chest ruff ---------
    const back = (u: number): P2 => B(lerp(g.span + 3, -g.span - 6, u), lerp(-10, -9, u) + g.arch * Math.sin(u * Math.PI) * 0.6);
    f.part_(tufts([0.2, 0.45, 0.7].map((u, j) => [B(lerp(g.span, -g.span, u), 8 + Math.sin(u * Math.PI) * 1.2 + g.arch * 0.3), 152 + j * 6, 6.5, 2.2] as [P2, number, number, number]), 39), tuft(39, 1), style);
    f.part_(tufts([[B(-g.span - 7, -3), 182, 7, 2.6], [B(-g.span - 8, 2), 172, 7.5, 2.6], [B(-g.span - 5, 7), 160, 6, 2.2]], 37), tuft(37, 0, -0.04), style);
    f.part_(tufts([0.15, 0.38, 0.62, 0.86].map((u, j) => [B(...back(u).map((v, i) => (v - (i ? cy : cx)) / Z) as P2), -172 + j * 2, 6.5, 2.3] as [P2, number, number, number]), 33), tuft(33, 0, -0.03), style);
    f.part_(tufts([[B(g.span + 2, -3), 165, 7, 2.6], [B(g.span, 2), 158, 7, 2.6], [B(g.span + 3, 6), 146, 5.5, 2.2]], 35), tuft(35), style);
    f.part_(tufts([0.05, 0.27, 0.5, 0.73, 0.95].map((u, j) => [B(...back(u).map((v, i) => (v - (i ? cy : cx)) / Z) as P2), -166 + j * 3, 7.5 - j * 0.4, 2.5] as [P2, number, number, number]).map(([r, a, l, w]) => [[r[0], r[1] - 2.5 * Z] as P2, a, l, w] as [P2, number, number, number]), 31), tuft(31, 0, 0.04), style);
    f.part_(tufts([[B(g.span + 10, 2), 112, 7, 2.5], [B(g.span + 8, 6), 122, 7, 2.4], [B(g.span + 5, 9), 134, 5.5, 2]], 41), tuft(41, 0, -0.02), style);
    // --- mane: zig-zag bolts fanning back off the neck ------------------------------------------
    f.part_([0, 0.2, 0.4, 0.6, 0.8, 1].map((u, j) => bolt(maneRoot(u), -118 - u * 70 + pd + Math.sin(TAU * t + j * 1.3) * 6, (16 - u * 5 + rnd(960 + fi, j) * 2) * Z, 1.7 * Z, 1.6 * Z, 2, 970 + fi * 7 + j)), boltShade(), style);
    // --- head: a wolf's long muzzle, snarling ----------------------------------------------------
    f.part_([lens(HZ(-1, -5), HZ(-12, -11), 2.6 * HS, { peak: 0.3, tip: 1.4, bend: -1 })], flesh(43, 1), style);
    const jawEnd = HZ(15, 3.5 + 6.5 * g.jaw);
    f.part_([lens(HZ(0, 3.5), jawEnd, 2.4 * HS, { peak: 0.25, tip: 0.8, base: 1 })], flesh(45, 0, -0.08), style);
    f.part_([poly([HZ(2, 1), HZ(16.5, 1.5), HZ(14.5, 3.4 + 6.5 * g.jaw), HZ(3, 4.5)])], (h) => RAI.mouth[h.v < -0.1 ? 1 : 0], { outline: null, line: null });
    const lj = (x: number): P2 => {
      const a = HZ(0, 3.5), u = x / 15;
      return [lerp(a[0], jawEnd[0], u), lerp(a[1], jawEnd[1], u) - 1.6 * HS];
    };
    const up = (x: number, w: number, l: number): Prim => poly([HZ(x - w / 2, 1.5), HZ(x + w / 2, 1.5), HZ(x + 0.2, 1.5 + l)]);
    const dn = (x: number, w: number, l: number): Prim => {
      const p = lj(x);
      const dx = -sa * HS, dy = ca * HS; // head "down" in canvas space
      return poly([[p[0] - (ca * w) / 2 * HS, p[1] - (sa * w) / 2 * HS], [p[0] + (ca * w) / 2 * HS, p[1] + (sa * w) / 2 * HS], [p[0] - dx * l, p[1] - dy * l]]);
    };
    f.part_([up(13.4, 1.9, 5.2), up(10, 1.3, 2.8), up(7, 1.2, 2.4), dn(12, 1.7, 3.6), dn(8.6, 1.2, 2.2)], (h) => RAI.ramp[h.v < 0 ? 5 : 4], { outline: RAI.outline, line: null });
    f.part_([blob(Hd[0], Hd[1], 7.2 * HS, 6.4 * HS, hA), lens(HZ(2, -1.5), HZ(17.5, 0.8), 3.8 * HS, { peak: 0.2, tip: 0.6, base: 1 })], flesh(47, 0, 0.02), style);
    f.part_([blob(...HZ(4.5, -4), 4.6 * HS, 1.9 * HS, hA + 0.3)], flesh(49, 0, 0.06), style);
    f.part_([lens(HZ(-1.5, -5.5), HZ(-13, -12.5), 2.9 * HS, { peak: 0.3, tip: 1.4, bend: -1.2 })], flesh(51), style);
    f.part_([lens(HZ(-2.5, -6.2), HZ(-11, -11.4), 1.3 * HS, { peak: 0.35, tip: 1.3, bend: -0.8 })], (h) => RAI.ramp[h.v < 0 ? 2 : 1], { outline: null, line: null });
    f.part_([lens(HZ(-2, 2.5), HZ(-12, 4.5), 2.3 * HS, { tip: 1.8, peak: 0.25, bend: 0.8 }), lens(HZ(-1, 5), HZ(-10, 10), 2.1 * HS, { tip: 1.8, peak: 0.25, bend: -0.8 }), lens(HZ(1, 6.5), HZ(-5, 12.5), 1.8 * HS, { tip: 1.8, peak: 0.25 })], tuft(53, 0, 0.02), style);
    // --- near legs in front ------------------------------------------------------------------
    const hN = hindLeg(g.hN, false), fN = frontLeg(g.fN, false);
    f.part_(hN.prims, flesh(37, 0, 0.05), style);
    f.part_(claws(hN.P, hN.pa), clawShade, style);
    f.part_(tufts([[hN.E, -170, 6, 2.2]], 55), tuft(55, 0, 0.02), style);
    f.part_(fN.prims, flesh(41, 0, 0.05), style);
    f.part_(claws(fN.P, fN.pa), clawShade, style);
    f.part_(tufts([[fN.E, 168, 5.5, 2]], 57), tuft(57, 0, 0.02), style);
    const fc = f.finish();
    // Snarl wrinkles on the muzzle, the nose, and a glowing eye under the brow.
    for (const [x, y] of [[9, -2.4], [10, -2.6], [11.5, -2], [12.5, -2.2], [10.5, -0.8]] as P2[]) {
      const [X, Y] = HZ(x, y).map(Math.round);
      if (fc.alpha(X, Y) > 200) fc.set(X, Y, RAI.line);
    }
    const [nX, nY] = HZ(17.4, -0.8).map(Math.round);
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) fc.set(nX + dx, nY + dy, RAI.outline);
    fc.set(nX - 1, nY, RAI.line);
    const [ex, ey] = HZ(5.5, -1.6).map(Math.round);
    for (const [dx, dy, col] of [[-1, -1, RAI.outline], [0, -1, RAI.outline], [1, -1, RAI.outline], [2, -1, RAI.outline], [3, -1, RAI.line], [-1, 0, RAI.ramp[4]], [0, 0, RAI.arc], [1, 0, RAI.arc], [2, 0, RAI.arc], [3, 0, RAI.ramp[4]], [0, 1, RAI.glow], [1, 1, RAI.glow], [2, 1, RAI.ramp[3]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, col);
    // Current running inside the torso.
    const inBody = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && f.part[y * W + x] === bodyId;
    lightningLine(fc, B(g.span + 6, 1), B(-g.span - 4, 1), (rnd(1100 + fi, 0) - 0.5) * 8, 0.8, 1200 + fi * 10, RAI.ramp[5], RAI.ramp[4], (x, y) => !inBody(x, y));
    // After-images in the stretch: the silhouette echoed behind it.
    if (g.reach > 0.5) {
      const snap = fc.clone();
      for (const [dx, al] of [[-7, 120], [-14, 60]] as [number, number][])
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            if (snap.alpha(x, y) < 220 || fc.alpha(x + dx, y)) continue;
            fc.plot(x + dx, y, wa(RAI.ramp[4], al * (g.reach - 0.3) / 0.7));
          }
    }
    // Arcs: three short bolts jumping off the silhouette and landing back on it.
    const solidAt = (x: number, y: number): boolean => fc.alpha(x, y) >= 220;
    const rim: P2[] = [];
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        if (!solidAt(x, y)) continue;
        if (!solidAt(x + 1, y) || !solidAt(x - 1, y) || !solidAt(x, y + 1) || !solidAt(x, y - 1)) rim.push([x, y]);
      }
    for (let a = 0; a < 3; a++) {
      const p0 = rim[Math.floor(rnd(500 + fi, a) * rim.length)];
      const want = 9 + rnd(600 + fi, a) * 7;
      let p1 = p0;
      for (let q = 0; q < 60; q++) {
        const c2 = rim[Math.floor(rnd(650 + fi, a, q) * rim.length)];
        if (Math.abs(Math.hypot(c2[0] - p0[0], c2[1] - p0[1]) - want) < 3) {
          p1 = c2;
          break;
        }
      }
      if (p1 === p0) continue;
      const mx = (p0[0] + p1[0]) / 2 - cx, my = (p0[1] + p1[1]) / 2 - cy;
      const side = Math.sign(-(p1[1] - p0[1]) * mx + (p1[0] - p0[0]) * my) || 1;
      lightningLine(fc, p0, p1, side * (3 + rnd(700 + fi, a) * 3), 0.9, 800 + fi * 10 + a, RAI.arc, RAI.glow, solidAt);
    }
    // Sparks: gold and white, drifting back; a couple of cool ones.
    for (let k = 0; k < 16; k++) {
      const p = fract(k / 16 + t);
      const ang = rnd(911, k) * TAU, rr = 0.55 + rnd(912, k) * 0.45;
      const X = Math.round(cx + Math.cos(ang) * 52 * rr - p * 18), Y = Math.round(cy + Math.sin(ang) * 30 * rr);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, k % 8 === 3 ? RAI.cool : p < 0.5 ? RAI.arc : RAI.glow);
      if (p < 0.3) fc.plot(X + 1, Y, wa(RAI.glow, 170));
    }
    frames.push(fc);
  });
  return flySprite('lightning', 'Raiju (lightning)', [2.6, 1.8], frames, cx, cy);
}
