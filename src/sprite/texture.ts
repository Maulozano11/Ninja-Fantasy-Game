// Hand-drawn feel: cluster texture on shading and jagged hair silhouettes.
// Both are deterministic and keyed to body-part space, so the texture moves
// with the limb instead of swimming across it between frames.

import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, MaterialTable, RES, Vec } from './raster';
import type { RampKind } from './color';

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value noise in [0, 1). */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

const lightCache = new Map<string, number>();
function lightness(hex: string): number {
  let l = lightCache.get(hex);
  if (l === undefined) {
    const n = parseInt(hex.slice(1), 16) || 0;
    l = (Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255) + Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255)) / 510;
    lightCache.set(hex, l);
  }
  return l;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** How strongly each material kind gets clustered texture (0 = clean). */
const AMP: Record<RampKind, number> = {
  hair: 0.2,
  cloth: 0.13,
  leather: 0.15,
  metal: 0.05,
  skin: 0,
  skinF: 0,
  glow: 0,
  flat: 0,
  painted: 0,
};

export interface PartFrameLite {
  o: Vec;
  u: Vec;
  w: Vec;
}

/**
 * Breaks smooth shading bands into irregular 2-4px clusters, like a pixel
 * artist placing tones by hand. Runs after outlining; never touches outline
 * pixels, highlights or detail pixels.
 */
export function applyTexture(L: Layer, mats: MaterialTable, frames: PartFrameLite[]): void {
  const seeds = new Map<number, number>();
  for (let i = 0; i < GRID * GRID; i++) {
    const m = L.mat[i];
    if (m < 0 || L.flags[i] & (F_NO_OUTLINE | F_NO_TEXTURE)) continue;
    const s = L.shade[i];
    if (s < 2 || s > 4) continue;
    const kind = mats.kinds[m];
    let amp = AMP[kind] ?? 0;
    if (!amp) continue;
    let seed = seeds.get(m);
    if (seed === undefined) {
      seed = hashString(mats.ramps[m][3]) & 0xffff;
      seeds.set(m, seed);
    }
    // Light materials show texture as dirt, so keep them cleaner.
    if (lightness(mats.ramps[m][3]) > 0.62) amp *= 0.45;
    const f = frames[L.part[i]] || frames[0];
    const px = ((i % GRID) + 0.5) / RES - f.o.x;
    const py = (((i / GRID) | 0) + 0.5) / RES - f.o.y;
    const a = (px * f.u.x + py * f.u.y) * RES;
    const b = (px * f.w.x + py * f.w.y) * RES;
    const n = kind === 'hair' ? valueNoise(a / 1.4, b / 4.2, seed) : valueNoise(a / 2.4, b / 2.4, seed) * 0.75 + valueNoise(a / 1.1, b / 1.1, seed + 7) * 0.25;
    if (n > 1 - amp) L.shade[i] = Math.min(4, s + 1);
    else if (n < amp) L.shade[i] = Math.max(1, s - 1);
  }
}

/**
 * Roughens a hair layer's silhouette with 1-2px tufts and small notches so it
 * reads as messy strands. Skips the face area so bangs don't grow over eyes.
 * `head` is the head center in design units, `k` the head scale.
 */
export function frayHair(L: Layer, head: Vec, k: number, seed: number): void {
  if (!L.used) return;
  const hx = head.x * RES;
  const hy = head.y * RES;
  const inFace = (x: number, y: number) =>
    x > hx - 2.5 * RES * k && x < hx + 7 * RES * k && y > hy - 1.6 * RES * k && y < hy + 8 * RES * k;
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && L.mat[y * GRID + x] >= 0;
  const adds: number[] = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (has(x, y) || inFace(x, y)) continue;
      const n4 = +has(x - 1, y) + +has(x + 1, y) + +has(x, y - 1) + +has(x, y + 1);
      if (n4 < 1 || n4 > 2) continue;
      const h = hash2(Math.round(x - hx), Math.round(y - hy), seed);
      if (h < 0.78) continue;
      // copy material from a neighbour
      const src = has(x - 1, y) ? y * GRID + x - 1 : has(x + 1, y) ? y * GRID + x + 1 : has(x, y - 1) ? (y - 1) * GRID + x : (y + 1) * GRID + x;
      adds.push(y * GRID + x, src);
      // sometimes grow the tuft one more pixel outward from the head
      if (h > 0.88) {
        const dx = Math.sign(Math.round(x - hx)) || 0;
        const dy = y < hy ? -1 : 0;
        const nx = x + (Math.abs(x - hx) > Math.abs(y - hy) ? dx : 0);
        const ny = y + (Math.abs(x - hx) > Math.abs(y - hy) ? 0 : dy || 1);
        if (!has(nx, ny) && !inFace(nx, ny)) adds.push(ny * GRID + nx, src);
      }
    }
  }
  const notches: number[] = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (!has(x, y) || inFace(x, y)) continue;
      const open = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
      if (!open) continue;
      if (hash2(Math.round(x - hx), Math.round(y - hy), seed + 31) < 0.1) notches.push(y * GRID + x);
    }
  }
  for (let k2 = 0; k2 < adds.length; k2 += 2) {
    const i = adds[k2];
    const s = adds[k2 + 1];
    L.mat[i] = L.mat[s];
    L.shade[i] = 2;
    L.part[i] = L.part[s];
    L.flags[i] = 0;
  }
  for (const i of notches) L.mat[i] = -1;
}
