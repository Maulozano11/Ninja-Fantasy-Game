// Varied flight paths for jutsu projectiles (the owner, 2026-10-21: the water dragon and the rock
// bullets fly "como los otros proyectiles que sigue una trayectoria aleatoria" before they hit, like
// the rank D and C volleys, not on a straight line). Pure and seeded: the same cast flies the same
// way, and nothing here draws (vfxSprites.ts does). Points are screen pixels of the map.

export interface XY {
  x: number;
  y: number;
}

/**
 * How one leg of a path bows away from the straight line between its ends, in pixels square to
 * it: `a` one wide swing (half a sine), `b` an S on top of it (a whole sine). Both are 0 at the
 * ends, so the path always meets its points.
 */
export interface Bend {
  a: number;
  b: number;
}

/** A number for a cast, from its text (FNV-1a): the seed its paths are drawn from. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32): numbers in [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bends for the `legs` legs of a path, drawn from `seed`: each leg swings to one side by between
 * `min` and `max` px (the side at random, the next leg leaning the other way more often than not),
 * with an S of up to `s` of that.
 */
export function bendsOf(seed: number, legs: number, min: number, max: number, s = 0.35): Bend[] {
  const r = rng(seed);
  const out: Bend[] = [];
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < legs; i++) {
    const a = side * (min + (max - min) * r());
    out.push({ a, b: (r() * 2 - 1) * s * Math.abs(a) });
    side = r() < 0.7 ? -side : side;
  }
  return out;
}

/** The lengths of a path's legs (straight, or `pace`: the lengths to pace them by), and their sum. */
function legsOf(pts: readonly XY[], pace?: readonly number[]): { len: number[]; total: number } {
  const len: number[] = [];
  for (let i = 1; i < pts.length; i++) len.push(Math.max(1e-6, pace?.[i - 1] ?? Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)));
  return { len, total: len.reduce((s, l) => s + l, 0) };
}

/**
 * Where a projectile is at time t (0..1) on a path through `pts` (at an even pace by the straight
 * length of its legs, or by `pace`, the legs' lengths on the ground, so the screen and the battle's
 * timings agree), each leg bowed by its bend (missing bends: straight).
 */
export function wanderPoint(pts: readonly XY[], bends: readonly Bend[], t: number, pace?: readonly number[]): XY {
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  const { len, total } = legsOf(pts, pace);
  let d = Math.max(0, Math.min(1, t)) * total;
  let i = 0;
  while (i < len.length - 1 && d > len[i]) d -= len[i++];
  const s = Math.min(1, d / len[i]);
  const p = pts[i];
  const q = pts[i + 1];
  // Square to the leg on the screen (its length there, whatever it is paced by).
  const span = Math.max(1e-6, Math.hypot(q.x - p.x, q.y - p.y));
  const dx = (q.x - p.x) / span;
  const dy = (q.y - p.y) / span;
  const bend = bends[i] ?? { a: 0, b: 0 };
  const off = bend.a * Math.sin(Math.PI * s) + bend.b * Math.sin(2 * Math.PI * s);
  return { x: p.x + (q.x - p.x) * s - dy * off, y: p.y + (q.y - p.y) * s + dx * off };
}

/** The fraction of the way (0..1) at which a path reaches its point `k` (paced as wanderPoint). */
export function reachOf(pts: readonly XY[], k: number, pace?: readonly number[]): number {
  const { len, total } = legsOf(pts, pace);
  return len.slice(0, k).reduce((s, l) => s + l, 0) / total;
}

/** The direction a path points at time t (for turning what flies on it), as a step along it. */
export function wanderHeading(pts: readonly XY[], bends: readonly Bend[], t: number, pace?: readonly number[], dt = 0.02): XY {
  const a = wanderPoint(pts, bends, Math.max(0, t - dt), pace);
  const b = wanderPoint(pts, bends, Math.min(1, t + dt), pace);
  return { x: b.x - a.x, y: b.y - a.y };
}

/**
 * The bends of a path kept above the ground: `floor` is the screen y of the ground under each of
 * its points, and no point of a leg may come lower than `margin` px over the ground line between
 * its ends (the water dragon's body is drawn about 22 px below its middle, and a swing down could
 * push it into the dirt). A leg that dips swings to the other side instead; if that dips too, it is
 * flattened until it clears. Legs that already clear keep their bend.
 */
export function keepAbove(pts: readonly XY[], floor: readonly number[], bends: readonly Bend[], margin: number): Bend[] {
  const N = 24;
  const clears = (i: number, b: Bend): boolean => {
    const leg = [pts[i], pts[i + 1]];
    for (let k = 1; k < N; k++) {
      const s = k / N;
      const y = wanderPoint(leg, [b], s).y;
      if (y > floor[i] + (floor[i + 1] - floor[i]) * s - margin) return false;
    }
    return true;
  };
  return bends.map((b, i) => {
    if (i >= pts.length - 1 || clears(i, b)) return b;
    const flip = { a: -b.a, b: -b.b };
    if (clears(i, flip)) return flip;
    for (let k = 0.85; k > 0.01; k *= 0.85) {
      const less = { a: flip.a * k, b: flip.b * k };
      if (clears(i, less)) return less;
    }
    return { a: 0, b: 0 };
  });
}
