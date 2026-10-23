// The element on a weapon (Weapon Element Enhancement, the Bukijutsu Master's class ability;
// battle/imbue.ts), drawn on the weapon in hand in every frame that holds it.
//
// The owner (2026-10-23): "le pondra un efecto de animacion a las armas (si es rayo , electricidad
// alredor del arma , si es viento , vfx de viento alrededor del arma , si es fuego el arma prende en
// llamas , si es agua se extiende el alcance del arma con agua vfx , si es tierra se ponen obsdiana
// filosa en tu arma ...)". NEW ART, waiting for his approval (it lives on `class/weapon-element`).
//
// - Where: the weapon's own pixels in the frame (its held layers rendered alone), so the effect sits
//   on whatever weapon it is and follows its angle in every pose and frame (grip.ts swordAngle and
//   poleAngle set it; it is read back from the pixels, not guessed): the hand, the blade's axis, its
//   tip and its width along it.
// - The colours are his: each element's ramp is taken from the palettes of his effect sheets
//   (tools/world-sprites: vfx-a-fire-refdata.ts's hit and bolt, vfx-lightning-v3-refdata.ts,
//   vfx-wind-v3-refdata.ts's bolt, vfx-water-v3-refdata.ts). Energy (fire, lightning, wind, water)
//   carries his element's own darkest tone at its edge, no black line; obsidian is solid and carries
//   the characters' black line (his solid-outline rule, 2026-10-22). The energy takes the ninja's
//   chakra colour as his jutsu do (vfxTint.ts); obsidian never does.
// - Each element loops over IMBUE_LOOP ticks: fire's tongues flicker and sway, lightning re-forks
//   every tick, the wind's strands turn round the blade, water flows to the tip and past it (the
//   longer reach), and a glint runs along the obsidian teeth.
// Pure pixels, no canvas: two GRID x GRID RGBA layers, one behind the figure and one in front.

import { renderSprite } from './compose';
import type { Depth } from './ctx';
import { hexToRgb } from './color';
import { weaponInHand } from './grip';
import { GRID, RES } from './raster';
import { tintVfx } from './vfxTint';
import type { EyeSpecial, SpriteAppearance, SpritePose } from './types';

export type ImbueFx = 'fire' | 'lightning' | 'wind' | 'water' | 'earth';
export const IMBUE_FX: readonly ImbueFx[] = ['fire', 'lightning', 'wind', 'water', 'earth'];

/** Ticks in one loop of the animation, and how many a second. */
export const IMBUE_LOOP = 8;
export const IMBUE_FPS = 10;

// --- his colours --------------------------------------------------------------------------------

/** Fire, dark to white-hot (his hit and bolt sheets). */
const FIRE = ['#581921', '#951f19', '#c6311a', '#e75319', '#f17b1d', '#f9aa23', '#f8dd4a', '#fdf7ba'];
/** Lightning: his deep-blue stroke ring, the strokes, the white core, his glow. */
const BOLT = { ring: '#1c3aa8', stroke: '#3a85c4', light: '#62b2de', pale: '#90dff5', core: '#eaffff', glow: '#0f6cff' };
/** Wind (his bolt): his darkest green, the strand's tones, his glow. */
const WIND = { line: '#0f3729', back: '#307e65', mid: '#5da17b', light: '#8bd1b6', pale: '#b4f4d8', glow: '#1ef3ec' };
/** Water: his outline, the body's tones, foam. */
const WATER = { line: '#0e263b', deep: '#106692', body: '#278fb6', mid: '#43aecf', light: '#73ddf2', pale: '#a8f4fe', foam: '#ddffff' };
/** Obsidian: the characters' black line, then volcanic glass from black to a violet glint. */
const OBSIDIAN = { line: '#07060b', dark: '#15111f', body: '#262035', mid: '#3b3150', light: '#5d527a', sheen: '#a59ccc', glint: '#efeaff' };

// --- the weapon in the frame ---------------------------------------------------------------------

/** The held weapon as the frame draws it (fine pixels of the frame, the figure facing right). */
export interface Blade {
  /** The hand that holds it. */
  hx: number;
  hy: number;
  /** Unit direction from the hand to the tip. */
  dx: number;
  dy: number;
  /** Where the blade starts along it (past the hilt and guard), and the tip. */
  start: number;
  tip: number;
  /** The weapon's width on each side of the axis at each whole step along it (0..tip): `pos` on the (−dy, dx) side. */
  pos: Float32Array;
  neg: Float32Array;
  /** The weapon's pixels. */
  mask: Uint8Array;
}

const HELD_DEPTHS: ReadonlySet<Depth> = new Set<Depth>(['nearArm.held', 'farArm.held']);
const blades = new Map<string, Blade | null>();
const BLADES_MAX = 400;

/** The weapon in hand in this frame, or null: no weapon, or not in the hand (stowed, thrown, dropped, hands busy). */
export function bladeOf(look: SpriteAppearance, pose: SpritePose, frame: number, eye: EyeSpecial = 'none'): Blade | null {
  const key = `${JSON.stringify(look.slots.held ?? null)}|${look.body}|${look.stowed ? 1 : 0}|${look.cast?.style ?? ''}|${JSON.stringify(look.arms ?? null)}|${look.neck ?? ''}|${pose}|${frame}`;
  if (blades.has(key)) return blades.get(key)!;
  const spr = renderSprite(look, pose, frame, eye, { skipEdits: true, depths: HELD_DEPTHS });
  const b = weaponInHand(look, spr.rig) ? bladeFrom(spr.rgba, spr.rig.handN.x * RES, spr.rig.handN.y * RES) : null;
  blades.set(key, b);
  if (blades.size > BLADES_MAX) blades.delete(blades.keys().next().value as string);
  return b;
}

/** The blade's axis from its pixels: their main direction, pointing from the hand to the far end. */
export function bladeFrom(rgba: Uint8ClampedArray, hx: number, hy: number): Blade | null {
  const mask = new Uint8Array(GRID * GRID);
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    mask[i] = 1;
    n++;
    sx += i % GRID;
    sy += (i / GRID) | 0;
  }
  if (n < 12) return null;
  const mx = sx / n;
  const my = sy / n;
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!mask[i]) continue;
    const x = (i % GRID) - mx;
    const y = ((i / GRID) | 0) - my;
    cxx += x * x;
    cyy += y * y;
    cxy += x * y;
  }
  const a = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  let dx = Math.cos(a);
  let dy = Math.sin(a);
  // From the hand toward the longer end: the blade.
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!mask[i]) continue;
    const t = ((i % GRID) + 0.5 - hx) * dx + (((i / GRID) | 0) + 0.5 - hy) * dy;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  if (-lo > hi) {
    dx = -dx;
    dy = -dy;
    hi = -lo;
  }
  const tip = Math.ceil(hi);
  const pos = new Float32Array(tip + 1);
  const neg = new Float32Array(tip + 1);
  for (let i = 0; i < GRID * GRID; i++) {
    if (!mask[i]) continue;
    const px = (i % GRID) + 0.5 - hx;
    const py = ((i / GRID) | 0) + 0.5 - hy;
    const t = Math.round(px * dx + py * dy);
    if (t < 0 || t > tip) continue;
    const s = -px * dy + py * dx;
    if (s >= 0) pos[t] = Math.max(pos[t], s);
    else neg[t] = Math.max(neg[t], -s);
  }
  return { hx, hy, dx, dy, start: Math.max(5, Math.round(tip * 0.24)), tip, pos, neg, mask };
}

// --- drawing ------------------------------------------------------------------------------------

/** A small deterministic hash in 0..1 (no Math.random: the same frame always looks the same). */
function hash(...k: number[]): number {
  let h = 2166136261;
  for (const v of k) {
    h ^= Math.round(v * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}

const rgbCache = new Map<string, readonly [number, number, number]>();
const rgbOf = (hex: string) => {
  let c = rgbCache.get(hex);
  if (!c) rgbCache.set(hex, (c = hexToRgb(hex)));
  return c;
};

class Paint {
  rgba = new Uint8ClampedArray(GRID * GRID * 4);
  /** Source-over: `a` 0..255. */
  put(x: number, y: number, hex: string, a = 255): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID || a <= 0) return;
    const o = (y * GRID + x) * 4;
    const [r, g, b] = rgbOf(hex);
    const sa = a / 255;
    const da = this.rgba[o + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    this.rgba[o] = (r * sa + this.rgba[o] * da * (1 - sa)) / oa;
    this.rgba[o + 1] = (g * sa + this.rgba[o + 1] * da * (1 - sa)) / oa;
    this.rgba[o + 2] = (b * sa + this.rgba[o + 2] * da * (1 - sa)) / oa;
    this.rgba[o + 3] = oa * 255;
  }
  alpha(x: number, y: number): number {
    x = Math.floor(x);
    y = Math.floor(y);
    return x < 0 || y < 0 || x >= GRID || y >= GRID ? 0 : this.rgba[(y * GRID + x) * 4 + 3];
  }
  /** A 1 px line (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, hex: string, a = 255): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.put(x0, y0, hex, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

/** A point `t` along the blade and `s` across it (on the (−dy, dx) side). */
const at = (b: Blade, t: number, s: number): [number, number] => [b.hx + b.dx * t - b.dy * s, b.hy + b.dy * t + b.dx * s];
const width = (prof: Float32Array, t: number): number => prof[Math.max(0, Math.min(prof.length - 1, Math.round(t)))] ?? 0;

/** The pixels a few around the blade, for the effects that fill an area. */
function around(b: Blade, padT: number, padS: number, up = 0): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [at(b, b.start - padT, -padS), at(b, b.start - padT, padS), at(b, b.tip + padT, -padS), at(b, b.tip + padT, padS)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.max(0, Math.floor(Math.min(...xs))), y0: Math.max(0, Math.floor(Math.min(...ys) - up)), x1: Math.min(GRID - 1, Math.ceil(Math.max(...xs))), y1: Math.min(GRID - 1, Math.ceil(Math.max(...ys))) };
}

/** Fire: the blade bursts into flames. Tongues rise off its upper edge and sway; embers fly up. */
function drawFire(b: Blade, k: number, front: Paint): void {
  const len = b.tip - b.start;
  const n = Math.max(3, Math.round(len / 5));
  // The side of the blade that faces up (the (−dy, dx) side points down when the blade points right):
  // the tongues stand on that edge.
  const nUp = b.dx >= 0 ? -1 : 1;
  const prof = nUp < 0 ? b.neg : b.pos;
  const tongues: { x: number; y: number; L: number; W: number; ph: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = b.start + ((i + 0.5) / n) * len + (hash(i, 1) - 0.5) * 2;
    const [x, y] = at(b, t, nUp * width(prof, t));
    const ph = (k / IMBUE_LOOP) * Math.PI * 2 + i * 1.9;
    const L = (8 + 6 * hash(i, 2)) * (0.8 + 0.25 * Math.sin(ph * 2 + i));
    tongues.push({ x, y, L, W: 2 + 1.4 * hash(i, 3), ph });
  }
  const box = around(b, 4, 6, 16);
  const heat = new Float32Array(GRID * GRID);
  const coat = new Uint8Array(GRID * GRID);
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      let h = 0;
      for (const tg of tongues) {
        const u = tg.y - (y + 0.5);
        if (u < -2 || u > tg.L) continue;
        const sway = 1.6 * Math.sin(tg.ph + u * 0.5) * (u / tg.L);
        const lat = Math.abs(x + 0.5 - tg.x - sway);
        const w = u >= 0 ? tg.W * Math.pow(1 - u / tg.L, 0.85) + 0.3 : tg.W * (1 + u / 2.2);
        if (w <= 0 || lat > w) continue;
        h = Math.max(h, (1 - lat / w) * (1 - 0.55 * Math.max(0, u) / tg.L) * (0.9 + 0.1 * Math.sin(tg.ph * 3)));
      }
      // The blade itself glows under the flames, here and there.
      const i = y * GRID + x;
      if (b.mask[i]) {
        const t = (x + 0.5 - b.hx) * b.dx + (y + 0.5 - b.hy) * b.dy;
        const c = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.7 - k * 1.6));
        if (t > b.start && c > h) {
          h = c;
          coat[i] = 1;
        }
      }
      heat[i] = h;
    }
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      const h = heat[y * GRID + x];
      if (h <= 0.02) continue;
      const idx = Math.min(FIRE.length - 1, Math.floor(h * FIRE.length * 1.05));
      // Over the blade the glow lets the steel show through.
      front.put(x, y, FIRE[coat[y * GRID + x] ? idx + 2 : idx], coat[y * GRID + x] ? 140 : h < 0.1 ? 170 : 255);
    }
  // Embers flying up off the blade.
  for (let e = 0; e < 4; e++) {
    const t = b.start + hash(e, 7, Math.floor((k + e * 2) / IMBUE_LOOP)) * len;
    const life = ((k + e * 2) % IMBUE_LOOP) / IMBUE_LOOP;
    const [x, y] = at(b, t, 0);
    front.put(x + Math.sin(life * 6 + e) * 2, y - 6 - life * 14, life < 0.5 ? FIRE[6] : FIRE[4], 255 * (1 - life * 0.6));
  }
}

/** Lightning: bolts fork along the blade and crackle off it, a new fork every tick. */
function drawLightning(b: Blade, k: number, front: Paint): void {
  const core = new Paint();
  const bolts = 2;
  for (let j = 0; j < bolts; j++) {
    const pts: [number, number][] = [];
    const t0 = b.start - 1 + hash(j, k, 1) * 3;
    const t1 = b.tip + 2 + hash(j, k, 2) * 5;
    let side = hash(j, k, 3) < 0.5 ? -1 : 1;
    for (let t = t0; t <= t1; t += 4 + hash(t, j, k) * 3) {
      const w = (side > 0 ? width(b.pos, t) : width(b.neg, t)) + 2 + hash(t, j, k, 4) * 4;
      pts.push(at(b, t, side * w));
      side = hash(t, j, k, 5) < 0.7 ? -side : side;
    }
    for (let p = 1; p < pts.length; p++) core.line(pts[p - 1][0], pts[p - 1][1], pts[p][0], pts[p][1], BOLT.core);
    // A spur crackling off, now and then.
    if (pts.length > 2 && hash(j, k, 6) < 0.8) {
      const q = pts[1 + Math.floor(hash(j, k, 7) * (pts.length - 2))];
      const a = hash(j, k, 8) * Math.PI * 2;
      const L = 3 + hash(j, k, 9) * 4;
      const m: [number, number] = [q[0] + Math.cos(a) * L * 0.5 + 1, q[1] + Math.sin(a) * L * 0.5];
      core.line(q[0], q[1], m[0], m[1], BOLT.core);
      core.line(m[0], m[1], q[0] + Math.cos(a + 0.6) * L, q[1] + Math.sin(a + 0.6) * L, BOLT.pale);
    }
  }
  // Ring the strokes as his are: pale and light round the white core, his deep blue round that, a glow round all.
  const box = around(b, 12, 14, 4);
  const near = (x: number, y: number, r: number) => {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if ((xx || yy) && Math.abs(xx) + Math.abs(yy) <= r + (r > 1 ? 1 : 0) && core.alpha(x + xx, y + yy) > 0) return true;
    return false;
  };
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      if (core.alpha(x, y) > 0) continue;
      if (near(x, y, 1)) front.put(x, y, hash(x, y, k) < 0.6 ? BOLT.light : BOLT.stroke, 210);
      else if (near(x, y, 2)) {
        if (hash(x, y, k, 1) < 0.35) front.put(x, y, BOLT.ring, 140);
        else front.put(x, y, BOLT.glow, 45);
      }
    }
  for (let i = 0; i < GRID * GRID; i++) {
    const o = i * 4;
    if (!core.rgba[o + 3]) continue;
    front.put(i % GRID, (i / GRID) | 0, core.rgba[o + 2] > 240 && core.rgba[o] > 200 ? BOLT.core : BOLT.pale, 255);
  }
}

/** Wind: two strands of wind turn round the blade, a helix seen from the side, flowing to the tip. */
function drawWind(b: Blade, k: number, back: Paint, front: Paint): void {
  const lambda = 24;
  const end = b.tip + 6;
  for (let j = 0; j < 2; j++) {
    const phi = j * Math.PI;
    let prev: { x: number; y: number; f: boolean } | null = null;
    for (let t = b.start - 2; t <= end; t += 0.5) {
      // Dashes running toward the tip: gusts, not a closed coil.
      const dash = (((t - k * 2.5 + j * 7) % 16) + 16) % 16;
      if (dash > 11.5) {
        prev = null;
        continue;
      }
      const a = ((t / lambda) * 2 - k / IMBUE_LOOP * 2) * Math.PI + phi;
      const amp = Math.max(width(b.pos, t), width(b.neg, t)) + 4 + 3 * Math.min(1, (t - b.start) / Math.max(1, b.tip - b.start));
      const taper = t > b.tip ? 1 - (t - b.tip) / 7 : 1;
      const [x, y] = at(b, t, Math.sin(a) * amp * taper);
      const f = Math.cos(a) > 0;
      const p = f ? front : back;
      const tone = f ? (dash < 2 || dash > 9.5 ? WIND.mid : WIND.pale) : WIND.back;
      if (prev && prev.f === f) {
        p.line(prev.x, prev.y, x, y, tone, f ? 255 : 220);
        // Two pixels thick where it crosses in front.
        if (f) p.line(prev.x, prev.y - 1, x, y - 1, dash < 2 || dash > 9.5 ? WIND.light : WIND.pale, 230);
      } else p.put(x, y, tone, f ? 255 : 220);
      // The strand's dark edge below it, as his wind's, and a little glow.
      if (f) {
        p.put(x, y + 1, WIND.line, 140);
        p.put(x - 1, y - 2, WIND.glow, 50);
      }
      prev = { x, y, f };
    }
  }
  // Small crescents flicked off the tip.
  for (let c = 0; c < 2; c++) {
    const life = ((k + c * 4) % IMBUE_LOOP) / IMBUE_LOOP;
    const [x, y] = at(b, b.tip + 3 + life * 10, (c ? 1 : -1) * (2 + life * 5));
    for (let i = -2; i <= 2; i++) front.put(x + i * 0.4, y + i + (Math.abs(i) === 2 ? 0 : 0), Math.abs(i) < 2 ? WIND.pale : WIND.mid, 255 * (1 - life));
    front.put(x + 1, y, WIND.light, 255 * (1 - life));
  }
}

/** How far past the tip the water reaches (fine pixels): about two thirds of the blade again (the owner: the reach grows). */
export const waterReachPx = (b: Pick<Blade, 'start' | 'tip'>): number => Math.round(Math.max(16, Math.min(34, (b.tip - b.start) * 0.7 + 6)));

/** Water: a sheath of water runs along the blade and past its tip, a longer blade of water: the longer reach. */
function drawWater(b: Blade, k: number, front: Paint): void {
  const ext = waterReachPx(b);
  const end = b.tip + ext;
  const box = around(b, ext + 4, 8, 2);
  const wTip = Math.max(width(b.pos, b.tip - 2), width(b.neg, b.tip - 2), 1.5) + 1.5;
  const body = new Uint8Array(GRID * GRID);
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      const px = x + 0.5 - b.hx;
      const py = y + 0.5 - b.hy;
      const t = px * b.dx + py * b.dy;
      const s = -px * b.dy + py * b.dx;
      if (t < b.start || t > end) continue;
      // Along the blade: its own width and a pixel and a half more; past the tip: tapering to a point, waving.
      const wave = Math.sin(t * 0.45 - k * (Math.PI / 2)) * 0.8;
      let lo: number;
      let hi: number;
      if (t <= b.tip) {
        lo = -width(b.neg, t) - 1.6;
        hi = width(b.pos, t) + 1.6;
      } else {
        const f = (t - b.tip) / ext;
        const w = wTip * Math.pow(1 - f, 1.25);
        lo = -w + wave * f;
        hi = w + wave * f;
      }
      if (s < lo || s > hi) continue;
      body[y * GRID + x] = t <= b.tip ? 1 : 2;
      const across = (s - lo) / Math.max(0.5, hi - lo);
      // Bands of light flow toward the tip.
      const band = (((t - k * 3) % 9) + 9) % 9;
      let tone = across < 0.3 ? WATER.deep : across > 0.72 ? WATER.light : WATER.mid;
      if (band < 1.6 && across > 0.35) tone = t > b.tip ? WATER.foam : WATER.pale;
      if (t > end - 3) tone = WATER.pale;
      front.put(x, y, tone, t <= b.tip ? 150 : 235);
    }
  // His water line round the water past the tip (along the blade the steel shows through).
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      if (body[y * GRID + x]) continue;
      const nb = [body[y * GRID + x + 1], body[y * GRID + x - 1], body[(y + 1) * GRID + x], body[(y - 1) * GRID + x]];
      if (nb.includes(2)) front.put(x, y, WATER.line, 230);
      else if (nb.includes(1)) front.put(x, y, WATER.body, 110);
    }
  // Drops falling off the water blade.
  for (let d = 0; d < 3; d++) {
    const life = ((k + d * 3) % IMBUE_LOOP) / IMBUE_LOOP;
    const [x, y] = at(b, b.tip + ext * (0.35 + 0.25 * d), 0);
    front.put(x + d - 1, y + 2 + life * 9, life < 0.5 ? WATER.pale : WATER.light, 255 * (1 - life * 0.7));
  }
}

/** Earth: teeth of sharp obsidian set along both edges of the blade and a point past its tip; a glint runs along them. */
function drawEarth(b: Blade, k: number, front: Paint): void {
  const glass = new Paint();
  const shards: { t: number; side: number; L: number }[] = [];
  for (let t = b.start + 2, i = 0; t < b.tip - 1; t += 3.2, i++) shards.push({ t, side: i % 2 ? 1 : -1, L: 3 + hash(i, 11) * 2.5 });
  const lit = (side: number) => (b.dx >= 0 ? side < 0 : side > 0);
  shards.forEach((sh, i) => {
    const w = sh.side > 0 ? width(b.pos, sh.t) : width(b.neg, sh.t);
    const base0 = at(b, sh.t - 1.6, sh.side * (w - 0.6));
    const base1 = at(b, sh.t + 1.6, sh.side * (w - 0.6));
    const apex = at(b, sh.t + 1.4, sh.side * (w + sh.L));
    fillTri(glass, base0, base1, apex, lit(sh.side) ? OBSIDIAN.light : OBSIDIAN.mid);
    // A facet: glass catches the light on its edge, so the teeth read over dark clothes too.
    glass.line(base1[0], base1[1], apex[0], apex[1], lit(sh.side) ? OBSIDIAN.sheen : OBSIDIAN.light);
    if (i % 3 === 0) glass.put((base0[0] + apex[0]) / 2, (base0[1] + apex[1]) / 2, OBSIDIAN.dark);
  });
  // An obsidian point past the tip.
  const wT = Math.max(width(b.pos, b.tip - 2), width(b.neg, b.tip - 2), 1);
  fillTri(glass, at(b, b.tip - 2, -wT - 0.5), at(b, b.tip - 2, wT + 0.5), at(b, b.tip + 4, 0), OBSIDIAN.body);
  glass.line(...at(b, b.tip - 1, 0), ...at(b, b.tip + 3, 0), OBSIDIAN.light);
  // The glint: one tooth at a time catches the light, running toward the tip.
  const g = shards[Math.floor((k / IMBUE_LOOP) * shards.length * 1.5) % Math.max(1, Math.round(shards.length * 1.5))];
  if (g) {
    const w = g.side > 0 ? width(b.pos, g.t) : width(b.neg, g.t);
    const [x, y] = at(b, g.t + 1, g.side * (w + g.L * 0.45));
    glass.put(x, y, OBSIDIAN.glint);
    glass.put(x + 1, y, OBSIDIAN.sheen);
    glass.put(x, y - 1, OBSIDIAN.sheen);
  }
  // The black line round the glass where it meets the air (not over the blade: the weapon has its own).
  const box = around(b, 8, 10, 2);
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      if (glass.alpha(x, y)) continue;
      if (glass.alpha(x + 1, y) || glass.alpha(x - 1, y) || glass.alpha(x, y + 1) || glass.alpha(x, y - 1)) {
        if (!b.mask[y * GRID + x]) front.put(x, y, OBSIDIAN.line);
      }
    }
  for (let i = 0; i < GRID * GRID; i++) {
    const o = i * 4;
    if (!glass.rgba[o + 3]) continue;
    front.rgba.set(glass.rgba.subarray(o, o + 4), o);
  }
}

function fillTri(p: Paint, a: [number, number], b: [number, number], c: [number, number], hex: string): void {
  const x0 = Math.floor(Math.min(a[0], b[0], c[0]));
  const x1 = Math.ceil(Math.max(a[0], b[0], c[0]));
  const y0 = Math.floor(Math.min(a[1], b[1], c[1]));
  const y1 = Math.ceil(Math.max(a[1], b[1], c[1]));
  const e = (p0: [number, number], p1: [number, number], x: number, y: number) => (p1[0] - p0[0]) * (y - p0[1]) - (p1[1] - p0[1]) * (x - p0[0]);
  const area = e(a, b, c[0], c[1]);
  if (Math.abs(area) < 0.01) return;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = e(b, c, px, py) / area;
      const w1 = e(c, a, px, py) / area;
      const w2 = e(a, b, px, py) / area;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) p.put(x, y, hex);
    }
}

/**
 * The element on the weapon in one tick of its loop, as two layers (behind the figure, in front of
 * it), for a frame's blade (bladeOf). `tint`: the ninja's chakra colour (vfxTintOf); obsidian keeps
 * its own.
 */
export function renderImbue(fx: ImbueFx, tick: number, b: Blade, tint?: string): { back: Uint8ClampedArray; front: Uint8ClampedArray } {
  const k = ((tick % IMBUE_LOOP) + IMBUE_LOOP) % IMBUE_LOOP;
  const back = new Paint();
  const front = new Paint();
  if (fx === 'fire') drawFire(b, k, front);
  else if (fx === 'lightning') drawLightning(b, k, front);
  else if (fx === 'wind') drawWind(b, k, back, front);
  else if (fx === 'water') drawWater(b, k, front);
  else drawEarth(b, k, front);
  if (fx === 'earth' || !tint) return { back: back.rgba, front: front.rgba };
  const sheet = { width: GRID, height: GRID };
  return { back: tintVfx(back.rgba, fx, tint, sheet), front: tintVfx(front.rgba, fx, tint, sheet) };
}

/** The element on this frame's weapon in hand, or null when the frame holds none. */
export function imbueLayers(look: SpriteAppearance, pose: SpritePose, frame: number, fx: ImbueFx, tick: number, tint?: string, eye: EyeSpecial = 'none'): { back: Uint8ClampedArray; front: Uint8ClampedArray } | null {
  const b = bladeOf(look, pose, frame, eye);
  return b ? renderImbue(fx, tick, b, tint) : null;
}
