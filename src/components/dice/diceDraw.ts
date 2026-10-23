// Draws the d20 art (src/assets/ui_dice/, made by tools/ui/dice-d20.ts) on a canvas: the quick die
// over a ninja, the big window of a critical or an important roll, the readout ("17 + 5 = 22 ✓ CA
// 14"), and a critical's impact on its target (a bloom of light, the burst, the maximum damage in
// big gold digits marked "MÁX"). Every position is in the canvas's device pixels; `s` is how many
// device pixels one art pixel takes (a whole number, so the pixels stay crisp).
//
// The "Gema" dice take the roller's chakra colour: their sheets are drawn in key colours that are
// swapped, cell by cell, for the same steps of diceGemRamp(tint) (src/sprite/diceGem.ts).

import { diceGemRamp } from '../../sprite/diceGem';
import type { Lang } from '../../i18n';
import { CLICK_MS, DICE, FROM_RIGHT, POP_MS, THROW, THROW_MS, WINDOW, IMPACT, throwFrameAt } from './diceData';
import type { DieSize } from './diceData';
import type { DiceStyle } from './diceStyle';

type Rect = [number, number, number, number];

const FILES = import.meta.glob('../../assets/ui_dice/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const urlOf = (name: string): string | undefined => FILES[`../../assets/ui_dice/${name}`];

const images = new Map<string, HTMLImageElement>();
/** A sheet by file name, loading on first use (null until it has loaded). */
function sheet(name: string): HTMLImageElement | null {
  let img = images.get(name);
  if (!img) {
    const url = urlOf(name);
    if (!url || typeof Image === 'undefined') return null;
    img = new Image();
    img.src = url;
    images.set(name, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

/** Starts loading every dice sheet (the battle and the menu call it early, so the first roll shows). */
export function preloadDice(style: DiceStyle): void {
  for (const size of ['small', 'big'] as DieSize[]) {
    sheet(`dice_${style}_${size}.png`);
    sheet(`dice_${style}_${size}_fx.png`);
    sheet(`dice_shared_${size}.png`);
  }
  sheet('crit.png');
  sheet('readout.png');
}

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const GEM_KEYS = (DICE.gem.keys as string[]).map(hexRgb);
const keyIndex = new Map<number, number>(GEM_KEYS.map((c, i) => [(c[0] << 16) | (c[1] << 8) | c[2], i]));

/** The key colour nearest (r, g, b), if every channel is within `tol`. */
function nearestKey(r: number, g: number, b: number, tol: number): number | undefined {
  let best: number | undefined, bd = Infinity;
  GEM_KEYS.forEach((c, i) => {
    const d = Math.max(Math.abs(c[0] - r), Math.abs(c[1] - g), Math.abs(c[2] - b));
    if (d <= tol && d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Recoloured gem cells, by sheet, cell and tint (each made once). */
const gemCells = new Map<string, HTMLCanvasElement>();
function gemCell(img: HTMLImageElement, name: string, r: Rect, tint: string): HTMLCanvasElement | null {
  const key = `${name}|${r.join(',')}|${tint}`;
  const hit = gemCells.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = r[2];
  c.height = r[3];
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
  const ramp = diceGemRamp(tint).map(hexRgb);
  const data = g.getImageData(0, 0, r[2], r[3]);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let k = keyIndex.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    // A see-through pixel (the halo) comes back from the canvas a little off its key colour (the
    // canvas keeps colours premultiplied by alpha): take the nearest key within that rounding.
    if (k === undefined && d[i + 3] < 255) k = nearestKey(d[i], d[i + 1], d[i + 2], Math.ceil(255 / d[i + 3]) + 1);
    if (k === undefined) continue;
    const t = ramp[k];
    d[i] = t[0];
    d[i + 1] = t[1];
    d[i + 2] = t[2];
  }
  g.putImageData(data, 0, 0);
  if (gemCells.size > 1500) gemCells.clear();
  gemCells.set(key, c);
  return c;
}

/** Draws one cell of a sheet, its top left at (x, y), `s` device pixels per art pixel. */
function blit(ctx: CanvasRenderingContext2D, name: string, r: Rect, x: number, y: number, s: number, tint?: string): void {
  const img = sheet(name);
  if (!img) return;
  const src = tint ? gemCell(img, name, r, tint) : null;
  if (src) ctx.drawImage(src, 0, 0, r[2], r[3], Math.round(x), Math.round(y), r[2] * s, r[3] * s);
  else ctx.drawImage(img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2] * s, r[3] * s);
}

const CRIT_RECTS = DICE.crit.rects as unknown as Record<string, Rect>;
const READ_RECTS = DICE.readout.rects as unknown as Record<string, Rect>;
const SHARED = DICE.shared.rects as unknown as Record<DieSize, Record<string, Rect>>;
const FX = DICE.fx.frames as unknown as Record<string, { nat20: { ms: number }[]; nat1: { ms: number; dx: number }[] }>;
const BANNERS = DICE.crit.banner as unknown as Record<string, { ms: number[]; hold: number }>;

/** The frame of a sequence at `t` ms (the last holds). */
function frameAt(ms: number[], t: number): number {
  let acc = 0;
  for (let i = 0; i < ms.length; i++) {
    acc += ms[i];
    if (t < acc) return i;
  }
  return ms.length - 1;
}

// --- one die ----------------------------------------------------------------------------------------

export interface DieDraw {
  style: DiceStyle;
  /** The roller's chakra colour (gem dice only). */
  tint?: string;
  size: DieSize;
  result: number;
  /** Ms into the throw (already scaled by the battle speed). */
  t: number;
  /** Where the die lands (its centre), device pixels. */
  x: number;
  y: number;
  s: number;
  /** Play the natural 20's flash or the natural 1's crack once it lands. */
  nat?: 20 | 1;
  /** The die advantage did not keep: dimmed once both have landed. */
  dim?: boolean;
  /** Draw its shadow and the dust at each bounce (the big die, which lands on a floor of its own). */
  ground?: boolean;
}

export function drawDie(ctx: CanvasRenderingContext2D, d: DieDraw): void {
  const z = DICE.sizes[d.size];
  const tint = d.style === 'gem' ? d.tint ?? 'blue' : undefined;
  const file = `dice_${d.style}_${d.size}.png`;
  const row = d.result - 1;
  const box = z.box;
  const cellAt = (col: number): Rect => [col * box, row * box, box, box];
  const mirror = FROM_RIGHT.has(d.result) ? -1 : 1;
  ctx.imageSmoothingEnabled = false;
  if (d.ground) {
    // The shadow tightens as the die comes down; dust where it hits.
    const i = throwFrameAt(Math.min(d.t, THROW_MS));
    const f = THROW[d.size][Math.min(i, THROW[d.size].length - 1)];
    const sr = SHARED[d.size][`shadow_${Math.round((d.t >= THROW_MS ? 1 : f.ground) * 5)}`];
    const sx = d.x + (d.t >= THROW_MS ? 0 : f.dx * mirror) * d.s;
    if (sr) blit(ctx, `dice_shared_${d.size}.png`, sr, sx - (sr[2] * d.s) / 2, d.y + z.R * 0.9 * d.s - (sr[3] * d.s) / 2, d.s);
    let acc = 0;
    for (const fr of THROW[d.size]) {
      if (fr.contact && d.t >= acc && d.t < acc + 160) {
        const r = SHARED[d.size][`dust_${fr.contact}_${Math.min(3, Math.floor((d.t - acc) / 40))}`];
        if (r) blit(ctx, `dice_shared_${d.size}.png`, r, d.x + fr.dx * mirror * d.s - (r[2] * d.s) / 2, d.y + z.R * 0.95 * d.s - r[3] * d.s, d.s);
      }
      acc += fr.ms;
    }
  }
  // After the click a natural 20 or 1 plays its own effect, and holds its last frame.
  if (d.nat && d.t >= CLICK_MS) {
    const fx = FX[`${d.style}_${d.size}`];
    const seq = d.nat === 20 ? fx.nat20 : fx.nat1;
    const i = frameAt(seq.map((f) => f.ms), d.t - CLICK_MS);
    const dx = d.nat === 1 ? (seq[i] as { dx?: number }).dx ?? 0 : 0;
    const F = z.fx;
    blit(ctx, `dice_${d.style}_${d.size}_fx.png`, [i * F, d.nat === 20 ? 0 : F, F, F], d.x - (F * d.s) / 2 + dx * d.s, d.y - (F * d.s) / 2, d.s, tint);
    return;
  }
  if (d.t < THROW_MS) {
    const i = throwFrameAt(d.t);
    const f = THROW[d.size][i];
    blit(ctx, file, cellAt(i), d.x + f.dx * mirror * d.s - (box * d.s) / 2, d.y + f.dy * d.s - (box * d.s) / 2, d.s, tint);
    return;
  }
  const after = d.t - THROW_MS;
  const ds = DICE.diceSheet;
  let col = ds.restColumn;
  if (d.dim) col = ds.dimColumn;
  else if (after < POP_MS) col = ds.popColumns[0] + frameAt(ds.popMs, after);
  if (!d.dim && after < 420) {
    // A soft halo of the style's light under the die as it lands (a gem's in the roller's chakra
    // colour: its halo is drawn in one of the gem's key colours, so it tints like the die).
    const hr = SHARED[d.size][`halo_${d.style}_${Math.min(3, Math.floor(after / 105))}`];
    if (hr) blit(ctx, `dice_shared_${d.size}.png`, hr, d.x - (hr[2] * d.s) / 2, d.y - (hr[3] * d.s) / 2, d.s, tint);
  }
  blit(ctx, file, cellAt(col), d.x - (box * d.s) / 2, d.y - (box * d.s) / 2, d.s, tint);
}

// --- the readout ------------------------------------------------------------------------------------

export interface ReadoutInfo {
  d20: number;
  mod: number;
  total: number;
  /** What it had to reach ("CA"/"CD"…) and the number; none for a contest. */
  vs?: { label: 'CA' | 'CD' | 'AC' | 'DC'; n: number };
  ok: boolean;
}

const READOUT_H = 18;

/** The readout's width in art pixels. */
function readoutParts(o: ReadoutInfo): { name: string; gap: number; dy: number }[] {
  const ink = o.d20 === 20 ? 'gold' : o.d20 === 1 ? 'dull' : 'cream';
  const parts: { name: string; gap: number; dy: number }[] = [];
  String(o.d20).split('').forEach((ch, i) => parts.push({ name: `t_${ink}_${ch}`, gap: i ? 1 : 0, dy: 3 }));
  if (o.mod !== 0) {
    parts.push({ name: `t_dim_${o.mod > 0 ? '+' : '-'}`, gap: 3, dy: 3 });
    String(Math.abs(o.mod)).split('').forEach((ch, i) => parts.push({ name: `t_cream_${ch}`, gap: i ? 1 : 3, dy: 3 }));
  }
  parts.push({ name: 't_dim_=', gap: 3, dy: 3 });
  const tot = o.d20 === 20 && o.ok ? 'gold' : o.ok ? 'good' : 'bad';
  String(Math.max(0, o.total)).split('').forEach((ch, i) => parts.push({ name: `big_${tot}_${ch}`, gap: i ? 0 : 3, dy: 0 }));
  if (o.total < 0) parts.splice(parts.length - String(Math.abs(o.total)).length, 0, { name: 't_dim_-', gap: 3, dy: 3 });
  parts.push({ name: o.ok ? 'mark_ok' : 'mark_fail', gap: 4, dy: 3 });
  if (o.vs) {
    parts.push({ name: `label_${o.vs.label}`, gap: 5, dy: 4 });
    String(o.vs.n).split('').forEach((ch, i) => parts.push({ name: `l_dim_${ch}`, gap: i ? 0 : 3, dy: 4 }));
  }
  return parts;
}
export function readoutWidth(o: ReadoutInfo): number {
  return readoutParts(o).reduce((a, p) => a + p.gap + (READ_RECTS[p.name]?.[2] ?? 0), 0) + 10;
}

/** The readout on its dark HUD plaque, centred on x, its top at y. */
export function drawReadout(ctx: CanvasRenderingContext2D, o: ReadoutInfo, x: number, y: number, s: number): void {
  const parts = readoutParts(o);
  const w = readoutWidth(o);
  const L = Math.round(x - (w * s) / 2), T = Math.round(y);
  // The plaque: the HUD's dark well with a bronze rim, a hair lighter on top.
  ctx.fillStyle = '#140c05';
  ctx.fillRect(L + s, T, (w - 2) * s, READOUT_H * s);
  ctx.fillRect(L, T + s, w * s, (READOUT_H - 2) * s);
  ctx.fillStyle = '#6e5d40';
  ctx.fillRect(L + s, T + s, (w - 2) * s, (READOUT_H - 2) * s);
  ctx.fillStyle = '#b3a383';
  ctx.fillRect(L + 2 * s, T + s, (w - 4) * s, s);
  ctx.fillStyle = 'rgba(22, 18, 12, 0.95)';
  ctx.fillRect(L + 2 * s, T + 2 * s, (w - 4) * s, (READOUT_H - 4) * s);
  let px = 5;
  for (const p of parts) {
    const r = READ_RECTS[p.name];
    if (!r) continue;
    px += p.gap;
    blit(ctx, 'readout.png', r, L + px * s, T + (1 + p.dy) * s, s);
    px += r[2];
  }
}

/** "VENTAJA ▲" / "DESVENTAJA ▼" over a pair of dice, centred on x, its bottom at y. */
export function drawAdvTag(ctx: CanvasRenderingContext2D, adv: 'advantage' | 'disadvantage', lang: Lang, x: number, y: number, s: number): void {
  const r = READ_RECTS[`${adv === 'advantage' ? 'adv' : 'dis'}_${lang}`];
  if (r) blit(ctx, 'readout.png', r, x - (r[2] * s) / 2, y - r[3] * s, s);
}

// --- the big window -------------------------------------------------------------------------------------

import type { WindowKind } from './diceData';
export type { WindowKind };

export interface WindowDraw {
  style: DiceStyle;
  tint?: string;
  result: number;
  kind: WindowKind;
  lang: Lang;
  readout: ReadoutInfo;
  /** Ms since the window opened (scaled by the battle speed). */
  t: number;
  /** The canvas size, and the middle of the free band over the fight. */
  W: number;
  H: number;
  cx: number;
  cy: number;
  s: number;
}

/** When the window has gone (ms since it opened). */
export const WINDOW_END = WINDOW.go - WINDOW.open + WINDOW.fade;

export function drawWindow(ctx: CanvasRenderingContext2D, w: WindowDraw): void {
  const fadeFrom = WINDOW.go - WINDOW.open;
  const a = w.t < 90 ? w.t / 90 : w.t > fadeFrom ? Math.max(0, 1 - (w.t - fadeFrom) / WINDOW.fade) : 1;
  if (a <= 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // The fight around it darkens (the middle less), so the window is a moment of its own.
  const g = ctx.createRadialGradient(w.cx, w.cy, 40 * w.s, w.cx, w.cy, Math.max(w.W, w.H) * 0.75);
  g.addColorStop(0, `rgba(8, 6, 4, ${0.18 * a})`);
  g.addColorStop(1, `rgba(8, 6, 4, ${0.62 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w.W, w.H);
  ctx.globalAlpha = a;
  // The big die plays its natural's effect from the start (it is already down on its face).
  const nat = w.result === 20 ? 20 : w.result === 1 ? 1 : undefined;
  drawDie(ctx, { style: w.style, tint: w.tint, size: 'big', result: w.result, t: nat ? CLICK_MS + w.t : THROW_MS + POP_MS, x: w.cx, y: w.cy, s: w.s, nat });
  // The banner under the die: opens, shines, holds; closes as the action goes on.
  const b = BANNERS[`${w.kind}_${w.lang}`] ?? BANNERS[`${w.kind}_en`];
  const bt = w.t - (WINDOW.banner - WINDOW.open);
  if (b && bt >= 0) {
    const holdEnd = b.ms.slice(0, b.hold).reduce((x, y) => x + y, 0);
    const closeAt = fadeFrom - (WINDOW.banner - WINDOW.open);
    let i = bt < holdEnd ? frameAt(b.ms, bt) : b.hold;
    if (bt >= closeAt) i = Math.min(b.ms.length - 1, b.hold + 1 + Math.floor((bt - closeAt) / 40));
    const r = CRIT_RECTS[`banner_${w.kind}_${w.lang}_${i}`] ?? CRIT_RECTS[`banner_${w.kind}_en_${i}`];
    const bs = Math.max(1, Math.round((w.s * 3) / 2));
    if (r) blit(ctx, 'crit.png', r, w.cx - (r[2] * bs) / 2, w.cy + DICE.sizes.big.R * 1.05 * w.s, bs);
  }
  // The readout under the banner.
  const rt = w.t - (WINDOW.readout - WINDOW.open);
  if (rt >= 0) {
    ctx.globalAlpha = a * Math.min(1, rt / 80);
    drawReadout(ctx, w.readout, w.cx, w.cy + DICE.sizes.big.R * 1.05 * w.s + 30 * Math.max(1, Math.round((w.s * 3) / 2)) + 4 * w.s, w.s);
  }
  ctx.restore();
}

// --- a critical's impact ---------------------------------------------------------------------------------

export interface ImpactDraw {
  /** The target's chest, device pixels. */
  x: number;
  y: number;
  /** Ms since the blow landed (scaled by the battle speed). */
  t: number;
  amount: number;
  lang: Lang;
  /** Device pixels per world pixel (the burst sits on the map at its scale). */
  world: number;
  /** Device pixels per art pixel for the HUD-sized pieces (the digits are half again bigger). */
  s: number;
}

export const IMPACT_END = IMPACT.number + IMPACT.numberLife;

export function drawImpact(ctx: CanvasRenderingContext2D, o: ImpactDraw): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // The bloom: light added on the target, white-gold, two quick beats (not a flat wash).
  if (o.t < IMPACT.bloom * 2) {
    const k = o.t < IMPACT.bloom ? 1 : 0.45;
    const R = 150 * o.world;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, R);
    g.addColorStop(0, `rgba(255, 252, 235, ${0.95 * k})`);
    g.addColorStop(0.25, `rgba(255, 228, 140, ${0.6 * k})`);
    g.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(o.x - R, o.y - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  // The burst on the target, at the map's scale.
  const bt = o.t - IMPACT.burst;
  const burstMs = DICE.crit.burstMs as number[];
  if (bt >= 0 && bt < burstMs.reduce((a, b) => a + b, 0)) {
    const r = CRIT_RECTS[`burst_${frameAt(burstMs, bt)}`];
    const ws = Math.max(1, Math.round(o.world));
    if (r) blit(ctx, 'crit.png', r, o.x - (r[2] * ws) / 2, o.y - (r[3] * ws) / 2, ws);
  }
  // The maximum damage: a white flash, then big gold digits with "MÁX", rising, fading at the end.
  const nt = o.t - IMPACT.number;
  if (nt >= 0 && nt < IMPACT.numberLife) {
    const ds = Math.max(1, Math.round(o.s * 1.5));
    const white = nt < 60;
    const digits = String(o.amount).split('');
    const dw = digits.length * 7 + 3;
    const tag = CRIT_RECTS[`max_${o.lang}`] ?? CRIT_RECTS.max_en;
    const total = dw + (tag ? tag[2] + 2 : 0);
    const rise = Math.min(1, nt / 600) * 24 * o.s;
    const x0 = o.x - (total * ds) / 2;
    const y0 = o.y - 70 * o.world - 15 * ds - rise;
    ctx.globalAlpha = nt > IMPACT.numberLife - 300 ? Math.max(0, (IMPACT.numberLife - nt) / 300) : 1;
    digits.forEach((ch, i) => {
      const r = CRIT_RECTS[`dmg_${white ? 'white' : 'gold'}_${ch}`];
      if (r) blit(ctx, 'crit.png', r, x0 + i * 7 * ds, y0, ds);
    });
    if (tag && !white) blit(ctx, 'crit.png', tag, x0 + (dw + 2) * ds, y0 + 1 * ds, Math.max(1, Math.round(ds * 0.8)));
  }
  ctx.restore();
}
