// Seeded dice. Every roll comes from the mission seed plus the ids of what is being rolled
// (a road node, a decision and its option), so the same choice always gives the same roll:
// reloading can't fish for a better result, and a server can repeat any roll exactly.

/** A source of uniform numbers in [0, 1). */
export type Rng = () => number;

/** 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: small, fast and good enough for dice. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The dice stream for one thing being rolled: rngFor(seed, 'camp', nodeId, 'ambush'). */
export function rngFor(seed: number, ...keys: (string | number)[]): Rng {
  return mulberry32(hashString([seed, ...keys].join('|')));
}

/** A die from 1 to `sides`. */
export const rollDie = (rng: Rng, sides: number): number => 1 + Math.floor(rng() * sides);

/** One element picked at random. */
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

/**
 * The dice a rule may use. In the no-randomness mode (outside battle) checks count the d20 as
 * 10 and % rolls become a counter, but things like which Breakdown happens still use `rng`.
 */
export interface Dice {
  rng: Rng;
  noRandomness?: boolean;
}

/** The rng for a d20 check, or null in the no-randomness mode. */
export const checkRng = (d: Dice): Rng | null => (d.noRandomness ? null : d.rng);
