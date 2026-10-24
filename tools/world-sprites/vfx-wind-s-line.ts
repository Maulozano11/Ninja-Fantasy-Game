// The Gale Dragon Ray, Wind's second rank S (the owner's paint-over of our sample, 2026-10-24: "a ver
// copia esta ignora a aurelia o a el rayo que sale despues de la boca del dragon"). A proposal: new
// art and new motion, waiting for his yes.
//
// Every pixel is his (tools/refs/wind-s-line-from-ref.py lifts his layers into
// vfx-wind-s-line-refdata.ts), one of his pixels per game px; pieces are moved, revealed and turned
// (RotSprite), nothing is drawn anew but the air round his kanji (his request, below), in his own
// teal steps and glow. The ray is laid from the caster's hand to where the camera's
// farthest view stops it (any length): his start, his repeating stretch as many times as it takes,
// and his end with the dragon at the front. Anchors are on the ray's middle line:
//
//   vfx_wind_s_line/start   his beam from the hand to his repeating stretch ('flow', a loop): past his
//                           flare the stretch's flow runs inside his tube (seamless with the tiles),
//                           his rings, strands and flare pulse, his core shimmers. Anchor: the hand.
//   vfx_wind_s_line/tile    his repeating stretch ('flow', a loop of FLOW_N frames): inside his
//                           beam's outline (kept still) his beam flows forward a FLOW_N-th of the
//                           stretch each frame, so the rings, strands and speed streaks travel and
//                           the loop tiles to any length; his near-white core shimmers in his three
//                           brightest colours (as the fireball's core churns: "como hiciste en el
//                           centro de la bola de fuego"). Anchor: its left end, on the middle line.
//   vfx_wind_s_line/end     the rest of his beam and his dragon ('surge', once: it bursts in from
//                           behind, turned back, and settles; 'loop': it breathes). Anchor: its
//                           left end, on the middle line.
//   vfx_wind_s_line/kanji   his kanji 風 with its green flame, every pixel his, in a gale ('appear',
//                           once: it rises in with a shake and a flash of glow; 'loop': it floats,
//                           its glow pulsing, its flame licking higher, a vortex ring of air turning
//                           behind it, gust lines whipping across, wind crescents orbiting and
//                           peeling off). Anchor: the hand, where he put it.
//   vfx_wind_s_line/dust_l  his dust and stones at the caster's feet, blown back ('rise', once,
//                           from the feet out; 'loop': his cloud heaves and rolls, new clouds of his
//                           dust burst from the ground and peel off its back, swell, blow back and
//                           up, curl, break apart and thin away; his pebbles are kicked up and
//                           tumble). Anchor: the hand.
//   vfx_wind_s_line/dust_r  his dust and rocks under the dragon (the same, lighter). Anchor: the end's.
//   vfx_wind_s_line/debris  his flying rocks and leaves ('loop': they tumble in the wind). Anchor:
//                           the hand.
//
// Energy (beam, glow, kanji, dragon of wind) takes no black line (the owner, 2026-10-22); the dust is
// his as he drew it.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-wind-s-line.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group into
// src/assets/world/ once the owner approves it. Same input, same bytes.

import { Canvas, Color, WorldSprite, writeGroup } from './kit';
import { rotSprite } from './vfx-turn';
import { RayPiece, WIND_S_LINE_REF } from './vfx-wind-s-line-refdata';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const R = WIND_S_LINE_REF;
const FPS = 12;
/** The flow's frames: his stretch moves on an 8th of itself each frame. */
export const FLOW_N = 8;
/** The outline of his beam that stays still while the inside flows (rows from its top and bottom edges). */
const RIM = 2;
/** The dragon's surge: frames, how far behind it starts (px) and how far it is turned back (degrees). */
const SURGE_N = 8;
const SURGE_BACK = 46;
const SURGE_TURN = -7;

const pal: Color[] = R.pal.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), parseInt(h.slice(7, 9), 16)]);
/** His three brightest opaque colours (his opaque ones are darkest first): the core's. */
const HOT = [R.opaque - 1, R.opaque - 2, R.opaque - 3];

/** A piece of his on his whole canvas (his px), as palette indices (-1 clear). */
function onCanvas(p: RayPiece): Int16Array {
  const [W, H] = R.native;
  const out = new Int16Array(W * H).fill(-1);
  p.rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && (out[(p.y + y) * W + p.x + x] = ALPHABET.indexOf(ch))));
  return out;
}

/** A box of his canvas as a Canvas, from palette indices. */
function cut(idx: Int16Array, x0: number, y0: number, w: number, h: number): Canvas {
  const [W] = R.native;
  const c = new Canvas(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = idx[(y0 + y) * W + x0 + x];
      if (i >= 0) c.set(x, y, pal[i]);
    }
  return c;
}

/** The box (his px) a piece covers. */
const boxOf = (p: RayPiece) => ({ x: p.x, y: p.y, w: Math.max(...p.rows.map((r) => r.length)), h: p.rows.length });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - (1 - clamp01(v)) ** 3;

// --- the beam ---------------------------------------------------------------------------------

const [W, H] = R.native;
const beamIdx = onCanvas(R.layers.beam);
const beamBox = boxOf(R.layers.beam);
const [tileX, tileN] = R.tile;
const hand = R.hand;
/** The rows every beam sprite spans (his beam's, with its rings and glow). */
const Y0 = beamBox.y;
const BH = beamBox.h;

/** His beam's own body (its opaque pixels between its top and bottom edge in each column), and its still rim. */
function bodyRows(x: number): [number, number] | null {
  let top = -1, bot = -1;
  for (let y = R.band[0]; y < R.band[1]; y++) {
    const i = beamIdx[y * W + x];
    // The tube: his opaque pixels nearest the middle line, the run that holds it.
    if (i >= 0 && i < R.opaque && Math.abs(y - hand[1]) < 60) {
      if (top < 0) top = y;
      bot = y;
    }
  }
  return top < 0 ? null : [top, bot];
}

/**
 * The core shimmer: his near-white pixels repainted in his three brightest colours by a wave that
 * runs forward along the beam, `period` px long (a whole number of repeats in the stretch, so the
 * loop is seamless), one period a loop.
 */
function shimmer(c: Canvas, x0: number, t: number, period: number): void {
  const hot = new Set(HOT.map((i) => pal[i].join(',')));
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (p[3] !== 255 || !hot.has(p.join(','))) continue;
      const u = ((x + x0) / period - t) * Math.PI * 2;
      const v = (y + Y0 - hand[1]) / 9;
      const k = 0.55 * Math.sin(u + v) + 0.45 * Math.sin(2 * u - 1.7 * v + 1.3);
      c.set(x, y, pal[HOT[k > 0.45 ? 2 : k > -0.2 ? 0 : 1]]);
    }
}

/** His repeating stretch at frame f: the inside moves forward f/FLOW_N of it, the rim stays. */
function tileFrame(f: number): Canvas {
  const shift = (f * tileN) / FLOW_N;
  const base = cut(beamIdx, tileX, Y0, tileN, BH);
  const out = new Canvas(tileN, BH);
  for (let x = 0; x < tileN; x++) {
    const sx = (((x - shift) % tileN) + tileN) % tileN;
    for (let y = 0; y < BH; y++) out.set(x, y, base.get(sx, y));
  }
  // His outline stays where he drew it: the top and bottom RIM rows of the body in each column.
  for (let x = 0; x < tileN; x++) {
    const rows = bodyRows(tileX + x);
    if (!rows) continue;
    for (const y of [...Array(RIM).keys()].flatMap((k) => [rows[0] + k, rows[1] - k])) out.set(x, y - Y0, base.get(x, y - Y0));
  }
  shimmer(out, tileX, f / FLOW_N, tileN / 2);
  return out;
}

/** His opaque colours by brightness: the next brighter one of his nearest a colour, for the rings' pulse. */
const brighter = (c: Color): Color => {
  let best: Color = c, bd = Infinity;
  const want = c.slice(0, 3).map((v) => Math.min(255, v * 1.28 + 18));
  for (let i = 0; i < R.opaque; i++) {
    const p = pal[i];
    if (p[0] + p[1] + p[2] <= c[0] + c[1] + c[2]) continue;
    const d = Math.hypot(p[0] - want[0], p[1] - want[1], p[2] - want[2]);
    if (d < bd) [best, bd] = [p, d];
  }
  return best;
};

/**
 * His beam from the hand to the stretch, alive like the rest of it (the owner, 2026-10-24: "la parte
 * donde se queda estatica enfrete de aurelia arreglala para que tambien este animada"):
 *   - past his flare (FLARE px from the hand, its end staggered row by row), inside his tube (the
 *     rows his tube has in the repeating stretch, within his own shape there; its RIM rows and his
 *     outline still), his repeating stretch flows
 *     forward as it does in the tiles, a FLOW_N-th each frame: the inside flows right up to the flare,
 *     and on into the first tile with no joint;
 *   - his rings and swirl strands round it, and his flare, pulse: a wave of light runs out along them
 *     from the hand, each lit pixel one of his colours a step brighter;
 *   - his near-white core shimmers as the tiles' does.
 */
/** The start begins right at the hand: what he drew behind it lies behind the caster. */
const START_X = hand[0] - 2;
export const START_END = tileX;
const FLARE = 56;
/** His tube's rows in the repeating stretch (the widest of its columns'). */
const TUBE = (() => {
  let top = Infinity, bot = -Infinity;
  for (let x = tileX; x < tileX + tileN; x++) {
    const r = bodyRows(x);
    if (r) [top, bot] = [Math.min(top, r[0]), Math.max(bot, r[1])];
  }
  return [top, bot];
})();
function startFrame(f: number): Canvas {
  const sw = START_END - START_X;
  const c = cut(beamIdx, START_X, Y0, sw, BH);
  const his = c.clone();
  const flow = tileFrame(f);
  const t = f / FLOW_N;
  const hot = new Set(HOT.map((i) => pal[i].join(',')));
  for (let x = 0; x < sw; x++) {
    const X = START_X + x;
    for (let y = 0; y < BH; y++) {
      const Y = Y0 + y;
      // Inside his tube, and inside his own shape there: his outline (RIM px of it) stays.
      const inTube = Y >= TUBE[0] + RIM && Y <= TUBE[1] - RIM && [-RIM, 0, RIM].every((dy) => his.alpha(x, y + dy) === 255);
      if (inTube && X >= hand[0] + FLARE + Math.round(4 * Math.sin(Y / 2.7))) {
        const p = flow.get((((X - tileX) % tileN) + tileN) % tileN, y);
        if (p[3] === 255) c.set(x, y, p);
        continue;
      }
      const p = c.get(x, y);
      if (p[3] !== 255 || hot.has(p.join(','))) continue;
      const d = Math.hypot(X - hand[0], (Y - hand[1]) * 0.6);
      if (Math.sin(2 * Math.PI * (t - d / 44)) > 0.62) c.set(x, y, brighter(p));
    }
  }
  shimmer(c, START_X, t, tileN / 2);
  return c;
}

// --- the end and the dragon ---------------------------------------------------------------------

const endX = tileX + tileN;
const dragonIdx = onCanvas(R.layers.dragon);
const dragonBox = boxOf(R.layers.dragon);
/** The end's box: from the stretch's end to his dragon's snout, his beam's rows and the dragon's. */
const EY0 = Math.min(Y0, dragonBox.y);
const EY1 = Math.max(Y0 + BH, dragonBox.y + dragonBox.h);
const EW = dragonBox.x + dragonBox.w - endX;
const EH = EY1 - EY0;

/** The dragon alone, on the end's box. */
const dragonAlone = cut(dragonIdx, endX, EY0, EW, EH);
/** Where the dragon turns about: the middle of its head (the right third of it, on the middle line). */
const PIVOT: [number, number] = [Math.round(EW * 0.72), hand[1] - EY0];

function endFrame(dx: number, dy: number, deg: number, f: number, a = 1): Canvas {
  const out = cut(beamIdx, endX, EY0, EW, EH);
  shimmer(out, endX, f / FLOW_N, tileN / 2);
  const px = rotSprite(dragonAlone, PIVOT, deg);
  for (const p of px) out.plot(PIVOT[0] + p.dx + dx, PIVOT[1] + p.dy + dy, [p.c[0], p.c[1], p.c[2], Math.round(p.c[3] * a)]);
  return out;
}

// --- the kanji, the dust, the debris ------------------------------------------------------------

function pieceCanvas(p: RayPiece): Canvas {
  const b = boxOf(p);
  return cut(onCanvas(p), b.x, b.y, b.w, b.h);
}

const fade = (c: Canvas, a: number): Canvas => {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p[3]) out.set(x, y, [p[0], p[1], p[2], Math.round(p[3] * a)]);
  }
  return out;
};

const moved = (c: Canvas, dx: number, dy: number, pad: number): Canvas => {
  const out = new Canvas(c.w, c.h + pad);
  out.draw(c, dx, dy + pad);
  return out;
};

/**
 * His dust churning while the ray lasts: inside his dust's outline (its edge kept his), each pixel
 * takes his dust a little way off, the offset turning round a small circle over the loop (seamless),
 * so his billows roll in place.
 */
function churn(c: Canvas, f: number, n: number, ax = 2.2, ay = 1.6): Canvas {
  const out = c.clone();
  const th = (f / n) * Math.PI * 2;
  const solid = (x: number, y: number) => c.alpha(x, y) === 255;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (!solid(x, y) || !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) continue;
      const sx = x + Math.round(ax * Math.cos(th + y / 6)), sy = y + Math.round(ay * Math.sin(th + x / 8));
      if (solid(sx, sy)) out.set(x, y, c.get(sx, sy));
    }
  return out;
}

/** Revealed from a point outward: only what lies within `r` px of it. */
function revealed(c: Canvas, cx: number, cy: number, r: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (Math.hypot(x - cx, (y - cy) * 1.6) <= r) out.set(x, y, c.get(x, y));
  return out;
}

// --- the storm: his dust blown back, his kanji in a gale (the owner, 2026-10-24: "tienes que hacer
// que las nubes de polvo alrededor de aurelia se muevan y ponlo mas dramatico y el kanji tambien
// ponle efectos vfx de aire para que se vea mas dramatico") ------------------------------------

/** The storm's loops: frames (at FPS), and how far its effects reach past their piece (px). */
export const STORM_N = 16;
/** A fixed hash in [0, 1): the same input gives the same bytes (no Math.random). */
function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.round(v * 977) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const TAU = Math.PI * 2;

/** A piece scaled about its middle, nearest neighbour (his pixels, a step bigger or smaller). */
function scaled(c: Canvas, s: number): Canvas {
  const w = Math.max(1, Math.round(c.w * s)), h = Math.max(1, Math.round(c.h * s));
  const out = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(x, y, c.get(Math.min(c.w - 1, Math.floor(x / s)), Math.min(c.h - 1, Math.floor(y / s))));
  return out;
}

/**
 * His puffs: round pieces of his own dust, cut where it is fullest (spread out over it), with a
 * ragged edge, to blow away as new clouds.
 */
function puffsOf(c: Canvas, r: number, n: number): Canvas[] {
  const cands: [number, number, number][] = [];
  for (let y = r; y < c.h - r; y += 2)
    for (let x = r; x < c.w - r; x += 2) {
      let k = 0, t = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) {
        t++;
        if (c.alpha(x + dx, y + dy) === 255) k++;
      }
      if (k / t > 0.9) cands.push([x, y, k / t]);
    }
  cands.sort((a, b) => b[2] - a[2] || a[1] - b[1] || a[0] - b[0]);
  const picked: [number, number][] = [];
  for (const [x, y] of cands) {
    if (picked.every(([px, py]) => Math.hypot(px - x, py - y) > r * 1.5)) picked.push([x, y]);
    if (picked.length >= n) break;
  }
  return picked.map(([cx, cy], i) => {
    const out = new Canvas(2 * r + 1, 2 * r + 1);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      // A cloud's scalloped edge: lobes round it, a little ragged.
      const edge = r * (0.68 + 0.3 * Math.abs(Math.sin(Math.atan2(dy, dx) * 2.5 + i))) + 1.2 * hash(i, dx, dy);
      if (Math.hypot(dx, dy) <= edge && c.alpha(cx + dx, cy + dy) === 255) out.set(dx + r, dy + r, c.get(cx + dx, cy + dy));
    }
    return out;
  });
}

/**
 * One puff at (cx, cy): `s` its size, `deg` its turn; `broken` (0..1) splits it into chunks that fly
 * apart, `gone` (0..1) is how much of it has thinned away (whole pixels drop out, his colours stay).
 */
function drawPuff(out: Canvas, puff: Canvas, cx: number, cy: number, s: number, deg: number, broken: number, gone: number, seed: number): void {
  const sc = scaled(puff, s);
  const r = sc.w / 2;
  const turn = TAU * hash(seed, 5);
  for (const p of rotSprite(sc, [sc.w >> 1, sc.h >> 1], deg)) {
    // It thins from its edge in, raggedly.
    if (gone > 0 && Math.hypot(p.dx, p.dy) / r > 1 - gone * (0.7 + 0.6 * hash(seed, p.dx, p.dy, 7))) continue;
    // It breaks into three lobes that drift apart.
    const lobe = Math.floor((((Math.atan2(p.dy, p.dx) + turn) % TAU) + TAU) % TAU / (TAU / 3));
    const la = turn + (lobe + 0.5) * (TAU / 3);
    const ox = broken * (7 * Math.cos(la) - 3), oy = broken * (6 * Math.sin(la) - 4);
    out.plot(Math.round(cx + p.dx + ox), Math.round(cy + p.dy + oy), p.c);
  }
}

/**
 * His dust heaving as a whole (its edge too), a slow wave rolling back through it, seamless over n;
 * his canvas's cut edge on the left (where his picture ended) frays out.
 */
function billow(c: Canvas, f: number, n: number): Canvas {
  const out = new Canvas(c.w, c.h);
  const th = (f / n) * TAU;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const sx = x + Math.round(3 * Math.sin(th + y / 9 + x / 17)), sy = y + Math.round(2 * Math.sin(th + x / 11));
      const p = c.get(sx, sy);
      if (!p[3]) continue;
      if (sx < 10 && hash(sx, sy, 3) > sx / 10) continue;
      out.set(x, y, p);
    }
  return out;
}

/** Where his dust meets the air on its back and top (its left or upper neighbour clear), behind `maxX`. */
function backEdge(c: Canvas, maxX: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < c.h; y += 2)
    for (let x = 16; x < Math.min(maxX, c.w); x += 2)
      if (c.alpha(x, y) === 255 && (!c.alpha(x - 2, y) || !c.alpha(x, y - 2))) out.push([x, y]);
  return out;
}

/** Where a storm blows from, how much and how hard. */
interface Storm {
  /** Where its clouds burst from the ground (the piece's px). */
  at: [number, number];
  /** How far along the ground they burst (px each way). */
  spread: number;
  puffs: Canvas[];
  /** Clouds at once, and the way they blow (px over a cloud's life: back and up). */
  count: number;
  drift: [number, number];
  /** How much a cloud grows over its life (it bursts at half size). */
  grow: number;
  /** Where his cloud's back and top meet the air: clouds peel off there too. */
  edge: [number, number][];
  pebbles: Canvas[];
  /** Pebbles kicked up at once. */
  kicks: number;
}
const PAD = { l: 64, t: 54, r: 10, b: 6 };

/**
 * His dust in the ray's gale, frame f of STORM_N: inside his dust's outline his billows roll (as
 * churn, harder); new clouds of his dust burst from the ground, swell, blow back and up, curl, break
 * apart and thin away, one after another all through the loop; his pebbles are kicked up and tumble
 * away. On a canvas PAD bigger than his piece.
 */
function stormFrame(base: Canvas, st: Storm, f: number): Canvas {
  const out = new Canvas(base.w + PAD.l + PAD.r, base.h + PAD.t + PAD.b);
  out.draw(churn(billow(base, f, STORM_N), f, STORM_N, 3, 2), PAD.l, PAD.t);
  const t = f / STORM_N;
  for (let i = 0; i < st.count; i++) {
    const age = (t + i / st.count + 0.07 * hash(i, 9)) % 1;
    const e = easeOut(age);
    // Every other cloud bursts from the ground where the force hits; the rest peel off his cloud's back and top.
    const from = i % 2 === 0 || !st.edge.length ? [st.at[0] + (hash(i, 2) - 0.5) * 2 * st.spread, st.at[1] - 3 * hash(i, 3)] : st.edge[Math.floor(hash(i, 2) * st.edge.length)];
    const x = from[0] + st.drift[0] * e * (0.65 + 0.7 * hash(i, 4)) + 5 * Math.sin(age * TAU * 1.5 + i);
    const y = from[1] + st.drift[1] * e * (0.65 + 0.7 * hash(i, 5)) + 3 * Math.cos(age * TAU + i);
    const s = 0.6 + st.grow * e;
    const deg = (hash(i, 6) < 0.5 ? -1 : 1) * 90 * age;
    drawPuff(out, st.puffs[i % st.puffs.length], PAD.l + x, PAD.t + y, s, deg, clamp01((age - 0.6) / 0.4), clamp01((age - 0.45) / 0.55), i);
  }
  for (let j = 0; j < st.kicks && st.pebbles.length; j++) {
    const age = (t * 2 + j / st.kicks + 0.11 * hash(j, 8)) % 1;
    if (age > 0.85) continue;
    const vx = 30 + 40 * hash(j, 1), vy = 34 + 30 * hash(j, 2);
    const x = st.at[0] + (hash(j, 3) - 0.5) * st.spread - vx * age, y = st.at[1] - vy * age + 52 * age * age;
    const pc = st.pebbles[j % st.pebbles.length];
    for (const p of rotSprite(pc, [pc.w >> 1, pc.h >> 1], (j % 2 ? 1 : -1) * 540 * age)) out.plot(Math.round(PAD.l + x + p.dx), Math.round(PAD.t + y + p.dy), p.c);
  }
  return out;
}

// His wind colours for the kanji's gale: his teal steps (darkest to lightest) and his teal glow at
// the wind set's alpha steps. The chakra tint turns them as it turns his beam (yellow for Aurelia).
const TEAL: Color[] = pal.slice(0, R.opaque).filter((p) => p[1] - p[0] > 60);
const GLOW_GROUP = [0, 1, 2].reduce((b, g) => (pal[R.opaque + g * 6][1] - pal[R.opaque + g * 6][0] > pal[R.opaque + b * 6][1] - pal[R.opaque + b * 6][0] ? g : b), 0);
const glowAt = (a: number): Color => pal[R.opaque + GLOW_GROUP * 6 + Math.max(0, Math.min(5, Math.round(a)))];
const teal = (k: number): Color => TEAL[Math.max(0, Math.min(TEAL.length - 1, Math.round(k * (TEAL.length - 1))))];
/** A colour along a streak: its tail (0) a faint glow, its head (1) his lightest teal. */
const streakColor = (u: number): Color => (u < 0.35 ? glowAt((u / 0.35) * 5) : teal(0.45 + 0.55 * ((u - 0.35) / 0.65)));
const KP = 38;

/** How far the kanji's glow can reach (px), and each pixel's distance to his solid kanji (0: on it). */
const GLOW_MAX = 18;
const dists = new Map<Canvas, Float32Array>();
function distOut(k: Canvas): Float32Array {
  let d = dists.get(k);
  if (d) return d;
  const w = k.w + 2 * GLOW_MAX, h = k.h + 2 * GLOW_MAX;
  d = new Float32Array(w * h).fill(Infinity);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const X = x - GLOW_MAX, Y = y - GLOW_MAX;
      if (k.alpha(X, Y)) { d[y * w + x] = 0; continue; }
      let best = Infinity;
      for (let dy = -GLOW_MAX; dy <= GLOW_MAX; dy++) for (let dx = -GLOW_MAX; dx <= GLOW_MAX; dx++) if (k.alpha(X + dx, Y + dy) === 255) best = Math.min(best, Math.hypot(dx, dy));
      d[y * w + x] = best;
    }
  dists.set(k, d);
  return d;
}

/**
 * The gale round his kanji, frame f of n (behind it: his kanji is laid over it untouched):
 *   - a glow round it in his glow steps, pulsing (`flash`: a burst of it as it appears);
 *   - his flame's tongues licking higher, fast: each column's top run of his flame stretched up and
 *     down again, twice a loop;
 *   - a vortex ring of air turning behind it, three arcs of his teal;
 *   - gust lines whipping across behind it, his teal heads with glow tails;
 *   - small wind crescents orbiting it, every other one peeling off and thinning away, and specks.
 * `show` (0..1) thins it all as it first appears; `drawn` is his kanji as laid over it (fading in).
 */
function kanjiGale(kanji: Canvas, f: number, n: number, yoff: number, flash: number, show: number, drawn = kanji): Canvas {
  const W = kanji.w + 2 * KP, H = kanji.h + 2 * KP;
  const out = new Canvas(W, H);
  const t = f / n;
  const kx = KP, ky = KP + yoff;
  const cx = kx + kanji.w / 2, cy = ky + kanji.h / 2;
  const keep = (...k: number[]) => show >= 1 || hash(...k, 99) < show;
  const put = (x: number, y: number, c: Color, ...k: number[]) => keep(x, y, ...k) && out.plot(Math.round(x), Math.round(y), c);

  // Two vortex rings, tilted a little, turning opposite ways (the big one once a loop, the small one
  // twice): three arcs of his teal each, a bright head and a glow tail, with a glow round them.
  const ring = (rx: number, ry: number, dy: number, turns: number, arc: number, thick: number, seed: number) => {
    for (let k = 0; k < 3; k++)
      for (let a = 0; a < arc; a += 0.4 / rx) {
        const th = -TAU * t * turns - (k * TAU) / 3 + a * Math.sign(turns);
        const u = a / arc;
        const x = cx + rx * Math.cos(th), y = cy + dy + ry * Math.sin(th) + 0.16 * rx * Math.cos(th);
        const w = Math.round(thick * Math.sin(Math.PI * Math.min(1, u * 1.15)));
        for (let j = -1; j <= w; j++) put(x, y + j, j < 0 || j === w ? glowAt(1 + 3 * u) : streakColor(0.25 + 0.75 * u), seed, k, j);
      }
  };
  ring(kanji.w / 2 + 34, 17, 20, 1, 2.2, 3, 1);
  ring(kanji.w / 2 + 14, 10, -6, -2, 1.6, 2, 2);

  // The glow round it, pulsing twice a loop (a burst of it as it appears).
  const rad = 6 + 5 * (0.5 + 0.5 * Math.sin(TAU * 2 * t)) + flash * 12;
  const dist = distOut(kanji);
  for (let y = -GLOW_MAX; y < kanji.h + GLOW_MAX; y++)
    for (let x = -GLOW_MAX; x < kanji.w + GLOW_MAX; x++) {
      const d = dist[(y + GLOW_MAX) * (kanji.w + 2 * GLOW_MAX) + x + GLOW_MAX];
      if (d > 0 && d <= rad) out.plot(kx + x, ky + y, glowAt(5 * (1 - d / rad) * (0.75 + 0.25 * flash) + flash));
      // As it appears, a flash of light where it forms.
      else if (d === 0 && flash > 0) out.plot(kx + x, ky + y, glowAt(5 * flash));
    }

  // His flame licking higher, fast: each column's top run of his solid flame stretched up by a
  // flickering height, twice a loop.
  for (let x = 0; x < kanji.w; x++) {
    let top = -1;
    for (let y = 0; y < kanji.h; y++) if (kanji.alpha(x, y) === 255) { top = y; break; }
    if (top < 0) continue;
    const L = 12;
    const h = Math.round(Math.max(0, 13 * Math.sin(TAU * 2 * t + x * 0.47 + 6 * hash(x, 4)) * (0.5 + 0.5 * Math.sin(x * 0.19 + 1.3))));
    for (let k = 0; k < L + h; k++) {
      const p = kanji.get(x, top + Math.floor((k * L) / (L + h)));
      if (p[3] === 255) put(kx + x, ky + top - h + k, p, x, 5);
    }
  }

  // Gust lines whipping across behind it, twice a loop each: 2 px, his lightest teal at the head.
  for (let i = 0; i < 10; i++) {
    const len = 40 + Math.round(44 * hash(i, 1));
    const y0 = cy + (hash(i, 2) - 0.5) * kanji.h * 1.3;
    const head = -len + ((t * 2 + hash(i, 3)) % 1) * (W + 2 * len);
    const amp = 3 + 6 * hash(i, 4), ph = TAU * hash(i, 5);
    for (let x = Math.ceil(head - len); x <= head; x++) {
      const u = (x - (head - len)) / len;
      const y = y0 + amp * Math.sin(x / 13 + ph + TAU * t * 2) * (0.4 + 0.6 * u);
      put(x, y, streakColor(u), i, 6);
      if (u > 0.5) put(x, y + 1, streakColor(u * 0.85), i, 7);
    }
  }

  // Wind crescents round it: the even ones orbit, the odd ones peel off outward and up and thin away.
  for (let i = 0; i < 8; i++) {
    const peel = i % 2 === 1;
    const age = (t + i / 8) % 1;
    const a = TAU * t + (i * TAU) / 8;
    const grow = peel ? 1 + 0.8 * age : 1;
    const px = cx + (kanji.w / 2 + 14) * grow * Math.cos(a), py = cy + (kanji.h / 2 + 10) * grow * Math.sin(a) - (peel ? 22 * age : 0);
    if (peel && age > 0.55 && hash(i, Math.floor(age * 12)) < (age - 0.55) / 0.45) continue;
    const dir = a + Math.PI / 2;
    const r0 = 8;
    for (let b = -1.3; b <= 1.3; b += 0.1) {
      const x = px + r0 * Math.cos(dir + b) - r0 * Math.cos(dir), y = py + r0 * Math.sin(dir + b) - r0 * Math.sin(dir);
      const w = Math.round(2.5 * Math.cos(b * 1.1));
      for (let j = 0; j <= w; j++) put(x - j * Math.cos(dir), y - j * Math.sin(dir), teal(j === 0 ? 1 : j === 1 ? 0.75 : 0.5), i, 8, j);
    }
  }
  // Specks thrown off, twice a loop.
  for (let i = 0; i < 22; i++) {
    const age = (t * 2 + hash(i, 1)) % 1;
    if (age > 0.85) continue;
    const a = TAU * hash(i, 2) + 1.6 * age;
    const r = kanji.w / 2 + 4 + 34 * age;
    const x = cx + r * Math.cos(a), y = cy + 0.8 * r * Math.sin(a) - 18 * age;
    put(x, y, teal(age < 0.5 ? 1 : 0.6), i, 9);
    if (i % 3 === 0) put(x + 1, y, teal(0.7), i, 10);
  }

  // His kanji over it all, every pixel his.
  out.draw(drawn, kx, ky);
  return out;
}

function main(): void {
  if (!process.env.WORLD_OUT) {
    console.error('Set WORLD_OUT=<staging dir>: this art waits for the owner\'s approval and is never written into src/assets.');
    process.exit(1);
  }
  const anchorOnLine = (x0: number, y0: number): [number, number] => [x0, hand[1] - y0];
  const flow = (fn: (f: number) => Canvas) => ({ frames: [...Array(FLOW_N).keys()].map(fn), fps: FPS });

  // The dragon bursts in from behind, turned back, and settles; then it breathes (a px up and down).
  const surge = [...Array(SURGE_N).keys()].map((f) => {
    const e = easeOut((f + 1) / SURGE_N);
    return endFrame(Math.round(-SURGE_BACK * (1 - e)), 0, SURGE_TURN * (1 - e), f, clamp01(0.35 + e));
  });
  const breathe = [...Array(FLOW_N).keys()].map((f) => endFrame(0, Math.round(Math.sin((f / FLOW_N) * Math.PI * 2)), 0.8 * Math.sin((f / FLOW_N) * Math.PI * 2), f));

  const kanji = pieceCanvas(R.layers.kanji);
  const kb = boxOf(R.layers.kanji);
  const RISE = 10;
  // It rises in with a shake and a burst of glow, its gale gathering; then it floats in it.
  const kanjiAppear = [...Array(8).keys()].map((f) => {
    const shake = Math.round(2.5 * Math.sin(f * 2.3) * (1 - f / 8));
    const g = kanjiGale(kanji, f, STORM_N, RISE + Math.round(RISE * (1 - easeOut((f + 1) / 8))), clamp01(1 - f / 6), clamp01((f + 1) / 7), fade(kanji, clamp01((f + 1) / 6)));
    return shake ? moved(g, shake, 0, 0) : g;
  });
  const kanjiLoop = [...Array(STORM_N).keys()].map((f) => kanjiGale(kanji, f, STORM_N, RISE + Math.round(-1.5 * Math.sin((f / STORM_N) * TAU)), 0, 1));

  const dl = pieceCanvas(R.layers.dust_l), dlb = boxOf(R.layers.dust_l);
  const dr = pieceCanvas(R.layers.dust_r), drb = boxOf(R.layers.dust_r);
  const feet: [number, number] = [hand[0] - 40 - dlb.x, R.ground - dlb.y];
  const under: [number, number] = [Math.round(dragonBox.x + dragonBox.w * 0.55) - drb.x, R.ground - drb.y];
  // His pebbles for the kicks: his smallest loose rocks.
  const pebbles = R.debris.filter((p) => boxOf(p).w * boxOf(p).h <= 40).map(pieceCanvas);
  const stormL: Storm = { at: feet, spread: 26, puffs: puffsOf(dl, 10, 8), count: 16, drift: [-62, -44], grow: 1.1, edge: backEdge(dl, feet[0] + 10), pebbles, kicks: 6 };
  const stormR: Storm = { at: under, spread: 40, puffs: puffsOf(dr, 6, 6), count: 9, drift: [-46, -26], grow: 0.8, edge: backEdge(dr, under[0]), pebbles, kicks: 3 };
  const dustLoop = (c: Canvas, st: Storm) => [...Array(STORM_N).keys()].map((f) => stormFrame(c, st, f));
  // It rises from the feet out, the first clouds already bursting.
  const rise = (c: Canvas, st: Storm) => [...Array(6).keys()].map((f) => { const fr = stormFrame(c, st, f); return revealed(fr, PAD.l + st.at[0], PAD.t + st.at[1], Math.max(fr.w, fr.h) * easeOut((f + 1) / 6)); });

  // His loose rocks and leaves tumble where he put them: each a little loop of its own.
  const debrisBox = R.debris.map(boxOf);
  const dx0 = Math.min(...debrisBox.map((b) => b.x)) - 4, dy0 = Math.min(...debrisBox.map((b) => b.y)) - 4;
  const dw = Math.max(...debrisBox.map((b) => b.x + b.w)) + 4 - dx0, dh = Math.max(...debrisBox.map((b) => b.y + b.h)) + 4 - dy0;
  const debrisLoop = [...Array(FLOW_N).keys()].map((f) => {
    const c = new Canvas(dw, dh);
    R.debris.forEach((p, i) => {
      const b = debrisBox[i];
      const ph = (f / FLOW_N) * Math.PI * 2 + i * 1.7;
      const pc = pieceCanvas(p);
      const turned = b.w * b.h <= 30 ? rotSprite(pc, [b.w >> 1, b.h >> 1], ((i % 2 ? 1 : -1) * f * 360) / FLOW_N) : rotSprite(pc, [b.w >> 1, b.h >> 1], 0);
      for (const q of turned) c.plot(b.x - dx0 + (b.w >> 1) + q.dx + Math.round(2 * Math.sin(ph)), b.y - dy0 + (b.h >> 1) + q.dy + Math.round(1.5 * Math.cos(ph)), q.c);
    });
    return c;
  });

  const m = (px: number) => Math.round((px / 57) * 100) / 100;
  const sprites: WorldSprite[] = [
    { name: 'start', label: 'Gale Dragon Ray: his beam from the hand to its repeating stretch (anchor: the hand)', meters: [m(START_END - START_X), m(BH)], anchor: [hand[0] - START_X, hand[1] - Y0], tags: ['vfx'], anims: { flow: flow(startFrame) } },
    { name: 'tile', label: 'Gale Dragon Ray: his repeating stretch, flowing (anchor: its left end on the middle line)', meters: [m(tileN), m(BH)], anchor: anchorOnLine(0, Y0), tags: ['vfx'], anims: { flow: flow(tileFrame) } },
    { name: 'end', label: 'Gale Dragon Ray: the end of his beam and his wind dragon (anchor: its left end on the middle line)', meters: [m(EW), m(EH)], anchor: anchorOnLine(0, EY0), tags: ['vfx'], anims: { surge: { frames: surge, fps: FPS, loop: false }, loop: { frames: breathe, fps: FPS } } },
    { name: 'kanji', label: 'Gale Dragon Ray: his kanji 風 and its green flame in a gale (anchor: the hand)', meters: [m(kanji.w + 2 * KP), m(kanji.h + 2 * KP)], anchor: [hand[0] - kb.x + KP, hand[1] - kb.y + RISE + KP], tags: ['vfx'], anims: { appear: { frames: kanjiAppear, fps: FPS, loop: false }, loop: { frames: kanjiLoop, fps: FPS } } },
    { name: 'dust_l', label: 'Gale Dragon Ray: his dust and stones at the caster\'s feet, blown back (anchor: the hand)', meters: [m(dl.w + PAD.l + PAD.r), m(dl.h + PAD.t + PAD.b)], anchor: [hand[0] - dlb.x + PAD.l, hand[1] - dlb.y + PAD.t], tags: ['vfx'], anims: { rise: { frames: rise(dl, stormL), fps: FPS, loop: false }, loop: { frames: dustLoop(dl, stormL), fps: FPS } } },
    { name: 'dust_r', label: 'Gale Dragon Ray: his dust and rocks under the dragon, blown back (anchor: the end\'s)', meters: [m(dr.w + PAD.l + PAD.r), m(dr.h + PAD.t + PAD.b)], anchor: [endX - drb.x + PAD.l, hand[1] - drb.y + PAD.t], tags: ['vfx'], anims: { rise: { frames: rise(dr, stormR), fps: FPS, loop: false }, loop: { frames: dustLoop(dr, stormR), fps: FPS } } },
    { name: 'debris', label: 'Gale Dragon Ray: his flying rocks and leaves (anchor: the hand)', meters: [m(dw), m(dh)], anchor: [hand[0] - dx0, hand[1] - dy0], tags: ['vfx'], anims: { loop: { frames: debrisLoop, fps: FPS } } },
  ];
  writeGroup('vfx_wind_s_line', sprites);
  console.log(`vfx_wind_s_line: start ${START_END - START_X}, tile ${tileN} (${FLOW_N} frames), end ${EW}x${EH}, kanji ${kanji.w}x${kanji.h}, ${R.debris.length} loose pieces`);
}

main();
