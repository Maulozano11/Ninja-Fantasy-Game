// The owner's red scarf on his Saya (2026-10-21), copied 1:1 from his picture at our game's scale
// (sayaScarfArt.ts, tools/refs/saya-scarf-from-ref.py): wound thick round the neck and over the top of
// the near shoulder; its end hangs behind the shoulder, hidden at rest as in his picture, and streams
// out behind her in the wind as in his big picture.

import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, RES, sub, v } from '../raster';
import type { Wind } from './capes';
import { SAYA_SCARF_BASE, SAYA_SCARF_LINE, SAYA_SCARF_SHOULDER, SAYA_SCARF_TAIL, SAYA_SCARF_WRAP } from './sayaScarfArt';

/** The scarf's tail: her pixels, and the spine they hang along. */
export interface ScarfTail extends PaintedPiece {
  /** From the neck to the point, in the rows' cells (a cell (i, j) spans i..i+1, j..j+1). */
  spine: [number, number][];
  /** The spine point from which on the cloth hangs free (the wind bends it); before it, it lies on the body. */
  free: number;
}

type Tint = (ch: string, hex: string) => string;

/** Her scarf recoloured: her line stays, every red of hers moves the way her lit red does. */
const scarfColor = (cloth: string): Tint => (ch, hex) => (ch === SAYA_SCARF_LINE ? hex : retintHex(hex, SAYA_SCARF_BASE, cloth));

// ---------------------------------------------------------------------------------------------
// The tail along its spine
// ---------------------------------------------------------------------------------------------

/** Scale2x (as RotSprite does it): the tail is sampled at 8x so its line stays whole as it bends. */
function scale2x(src: string[][]): string[][] {
  const h = src.length;
  const w = src[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : src[y][x]);
  const out = Array.from({ length: h * 2 }, () => new Array<string>(w * 2).fill('.'));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      out[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P;
      out[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
      out[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P;
      out[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
    }
  }
  return out;
}

const UP = 8;

interface Upscaled {
  w: number;
  h: number;
  cells: string[][];
  /** For each 8x cell, the spine segment nearest to it (which piece of the cloth it is). */
  seg: Int8Array;
}

const upscaled = new Map<ScarfTail, Upscaled>();

function upscale(t: ScarfTail): Upscaled {
  let u = upscaled.get(t);
  if (u) return u;
  const w0 = Math.max(...t.rows.map((r) => r.length));
  const cells = scale2x(scale2x(scale2x(t.rows.map((r) => r.padEnd(w0, '.').split('')))));
  const h = cells.length;
  const w = cells[0].length;
  const seg = new Int8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      seg[y * w + x] = nearestSeg(t.spine, (x + 0.5) / UP, (y + 0.5) / UP).k;
    }
  }
  u = { w, h, cells, seg };
  upscaled.set(t, u);
  return u;
}

/** The segment of a polyline nearest to a point, and the distance to it. */
function nearestSeg(pts: readonly (readonly [number, number])[], x: number, y: number): { k: number; d: number } {
  let best = { k: 0, d: Infinity };
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d < best.d) best = { k, d };
  }
  return best;
}

const wrapDeg = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/**
 * How much each segment of the tail's spine turns (degrees, + = clockwise on screen): the part on the
 * body turns with the torso (`turn`); the free part is blown toward `toward` (screen degrees) by
 * `blow` (0 to 1; with `ease` > 0 the more the nearer the point, with 0 all of it alike) and sways by
 * `sway` degrees, rippling when the wind is up.
 */
function bends(t: ScarfTail, turn: number, toward: number, blow: number, ease: number, sway: number, ripple: number, phase: number): number[] {
  const sp = t.spine;
  const lens = sp.slice(1).map((p, k) => Math.hypot(p[0] - sp[k][0], p[1] - sp[k][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const s0 = lens.slice(0, t.free).reduce((a, b) => a + b, 0);
  let s = 0;
  return lens.map((l, k) => {
    const mid = s + l / 2;
    s += l;
    if (k < t.free) return turn;
    const u = (mid - s0) / (total - s0);
    const a = segAngle({ x: sp[k][0], y: sp[k][1] }, { x: sp[k + 1][0], y: sp[k + 1][1] });
    const wind = blow * Math.pow(u, ease) * wrapDeg(toward - (a + turn));
    const wave = sway * u + ripple * u * Math.sin(mid / 2.4 - phase);
    return turn + wind + wave;
  });
}

/**
 * Stamps the tail with its pivot on the fine pixel (ax, ay), each segment of its spine turned by
 * `deg`: the spine is laid out again from the pivot and every pixel round each segment is carried
 * with it, sampled at 8x as RotSprite does (her colours only, her line kept whole). Unturned, every
 * pixel is hers. A pixel takes the segment its sample belongs to; where a bend opens a gap between
 * two segments, the nearer one fills it. `keep` drops pixels (x, y in the frame); a kept pixel beside
 * a dropped one takes her line, so the cut is outlined as her edges are.
 */
function stampTail(L: Layer, t: ScarfTail, ax: number, ay: number, deg: number[], pens: Record<string, number>, keep?: (x: number, y: number) => boolean): void {
  const px: { x: number; y: number; ch: string }[] = [];
  const [pvx, pvy] = t.pivot;
  if (deg.every((d) => Math.abs(d) < 0.5)) {
    t.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') px.push({ x: ax + i - pvx, y: ay + j - pvy, ch: row[i] });
    });
  } else {
    const up = upscale(t);
    const sp = t.spine;
    const cx = pvx + 0.5;
    const cy = pvy + 0.5;
    const rad = (d: number) => (d * Math.PI) / 180;
    const cos = deg.map((d) => Math.cos(rad(d)));
    const sin = deg.map((d) => Math.sin(rad(d)));
    // the spine laid out again: its first point turned about the pivot with the first segment
    const nsp: [number, number][] = [[cx + (sp[0][0] - cx) * cos[0] - (sp[0][1] - cy) * sin[0], cy + (sp[0][0] - cx) * sin[0] + (sp[0][1] - cy) * cos[0]]];
    for (let k = 0; k < sp.length - 1; k++) {
      const dx = sp[k + 1][0] - sp[k][0];
      const dy = sp[k + 1][1] - sp[k][1];
      nsp.push([nsp[k][0] + dx * cos[k] - dy * sin[k], nsp[k][1] + dx * sin[k] + dy * cos[k]]);
    }
    // the box the cloth can reach: the new spine and as far round it as the cloth is from the old one
    let reach = 0;
    for (let j = 0; j < up.h; j += 4) {
      for (let i = 0; i < up.w; i += 4) if (up.cells[j][i] !== '.') reach = Math.max(reach, nearestSeg(sp, (i + 0.5) / UP, (j + 0.5) / UP).d);
    }
    reach += 1;
    const xs = nsp.map((p) => p[0]);
    const ys = nsp.map((p) => p[1]);
    const sample = (k: number, qx: number, qy: number): { ch: string; own: boolean } => {
      // back through segment k's turn into her rows, at 8x
      const vx = qx - nsp[k][0];
      const vy = qy - nsp[k][1];
      const sx = Math.floor((sp[k][0] + vx * cos[k] + vy * sin[k]) * UP);
      const sy = Math.floor((sp[k][1] - vx * sin[k] + vy * cos[k]) * UP);
      if (sx < 0 || sy < 0 || sx >= up.w || sy >= up.h) return { ch: '.', own: false };
      return { ch: up.cells[sy][sx], own: up.seg[sy * up.w + sx] === k };
    };
    for (let qy = Math.floor(Math.min(...ys) - reach); qy <= Math.ceil(Math.max(...ys) + reach); qy++) {
      for (let qx = Math.floor(Math.min(...xs) - reach); qx <= Math.ceil(Math.max(...xs) + reach); qx++) {
        const x = qx + 0.5;
        const y = qy + 0.5;
        let ch = '.';
        for (let k = sp.length - 2; k >= 0 && ch === '.'; k--) {
          const r = sample(k, x, y);
          if (r.own) ch = r.ch;
        }
        if (ch === '.') ch = sample(nearestSeg(nsp, x, y).k, x, y).ch;
        if (ch !== '.') px.push({ x: ax + qx - pvx, y: ay + qy - pvy, ch });
      }
    }
  }
  const flags = F_NO_TEXTURE | F_NO_OUTLINE;
  const all = new Set(px.map((p) => p.y * GRID + p.x));
  const cut = new Set(keep ? px.filter((p) => !keep(p.x, p.y)).map((p) => p.y * GRID + p.x) : []);
  for (const p of px) {
    const i = p.y * GRID + p.x;
    if (cut.has(i) || pens[p.ch] === undefined) continue;
    const onCut = cut.size > 0 && [i - 1, i + 1, i - GRID, i + GRID].some((q) => all.has(q) && cut.has(q));
    L.set(p.x, p.y, pens[onCut ? SAYA_SCARF_LINE : p.ch], 3, 'torso', flags);
  }
}

/**
 * Knocked out, the figure is drawn upright and then laid down on its front: cloth hanging out behind
 * the back would stand up in the air. Only the scarf within a few pixels of the body's back (its
 * head, torso and legs) is kept then, so it lies on her.
 */
function onTheBack(g: DrawCtx): (x: number, y: number) => boolean {
  const back = new Map<number, number>();
  for (const d of ['head.body', 'torso.body', 'torso.under', 'nearLeg.body', 'farLeg.body'] as const) {
    const B = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (B.mat[i] < 0) continue;
      const y = (i / GRID) | 0;
      back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
    }
  }
  return (x, y) => back.has(y) && x >= back.get(y)! - 3;
}

// ---------------------------------------------------------------------------------------------
// The item
// ---------------------------------------------------------------------------------------------

/** How far (degrees) the scarf's end turns with the torso at most. */
const TAIL_TURN = 22;

/** Clears the scarf where the head is, so it sits under the chin (the head is drawn under this layer). */
function underHead(g: DrawCtx, L: Layer): void {
  const H = g.L('head.body');
  for (let i = 0; i < GRID * GRID; i++) if (H.mat[i] >= 0 && L.mat[i] >= 0) L.mat[i] = -1;
}

/**
 * The scarf, given the capes' wind (capes.ts capeWind: passed in, as capes.ts lists this item).
 * The wrap is drawn in the head's mask layer: over the neck, any collar and the top of the chest, under
 * the chin and under the side locks (hairFront), as he has it; its stretch on top of the near shoulder
 * over the near arm. The end hangs
 * behind everything (capeBack): behind the long hair and the body at rest, out behind her in the wind.
 */
export const sayaScarf = (wind: (g: DrawCtx) => Wind): ItemDef => ({
  id: 'cape_crimson_scarf',
  slot: 'cape',
  name: 'Crimson Shade Scarf',
  desc: 'A long red scarf wound thick round the neck in two rolls and over the near shoulder, its end hanging behind the shoulder and streaming out behind in the wind.',
  colors: [{ key: 'main', label: 'Scarf', default: SAYA_SCARF_BASE, kind: 'cloth' }],
  draw: (g, [c]) => {
    const r = g.rig;
    const tint = scarfColor(c);
    const L = g.L('capeBack');
    const turn = segAngle(r.neck, r.pelvis);
    const pens: Record<string, number> = {};
    for (const [ch, hex] of Object.entries(SAYA_SCARF_TAIL.colors)) pens[ch] = g.m(tint(ch, hex), 'flat');
    const w = wind(g);
    // the wind's strength: how far the free part is blown back toward the horizontal
    const blow = Math.max(0, Math.min(1, (0.6 * -w.dx) / 9 + (0.4 * w.lift) / 7));
    const ax = Math.floor(r.neck.x * RES);
    const ay = Math.floor(r.neck.y * RES);
    const t = SAYA_SCARF_TAIL;
    // The end turns with the torso only so far (as her long hair does, sayaHair.ts): when the body
    // pitches far over (the throw's release, the lunge) it hangs from behind the shoulder and streams
    // back from there, instead of running up along the raised arm like a sleeve.
    const twist = Math.max(-TAIL_TURN, Math.min(TAIL_TURN, turn - t.angle));
    if (r.lay) {
      // Knocked out (drawn upright, then laid down): the free part falls down her back toward the
      // hips, so it lies along her.
      const f = t.spine[t.free];
      const from = { x: (ax + f[0] - t.pivot[0] - 0.5) / RES, y: (ay + f[1] - t.pivot[1] - 0.5) / RES };
      stampTail(L, t, ax, ay, bends(t, twist, segAngle(from, r.hipN), 1, 0, 0, 0, 0), pens, onTheBack(g));
    } else {
      stampTail(L, t, ax, ay, bends(t, twist, 182 + 8 * blow, blow, 0.6, w.wave * 5, blow * 10, r.frame * 1.9), pens);
    }
    // The wrap round the neck and its stretch on top of the near shoulder (over the arm's shoulder,
    // as he has it) turn no further than the end. The wrap stays under the chin: when a pose moves the
    // head off the neck (the throw's release puts it far forward), it moves with it, instead of
    // staying on the shoulder and running up the raised arm like a sleeve. At rest it is on the neck:
    // the head stands where it does at rest over the neck (on a fitted body his head over his neck,
    // which leans back from it; on the others just above it).
    const fit = g.bp.fit;
    const rest = fit ? sub(fit.head, fit.neck) : v(-0.4, -5.9 * g.bp.headScale);
    const off = sub(r.head, add(r.neck, rest));
    stampPiece(g, 'head.mask', SAYA_SCARF_WRAP, add(r.neck, v(Math.round(off.x), Math.round(off.y))), t.angle + twist, 'torso', tint);
    // The stretch over the shoulder joins the wrap to the end on the shoulder; with the head (and the
    // wrap) moved well off the neck it would be left lying alone on the raised arm, so it is left out.
    if (Math.hypot(off.x, off.y) < 2) stampPiece(g, 'nearArm.over', SAYA_SCARF_SHOULDER, r.neck, t.angle + twist, 'torso', tint);
    underHead(g, g.L('head.mask'));
  },
});
