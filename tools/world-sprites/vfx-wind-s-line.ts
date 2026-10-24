// The Gale Dragon Ray, Wind's second rank S (the owner's paint-over of our sample, 2026-10-24: "a ver
// copia esta ignora a aurelia o a el rayo que sale despues de la boca del dragon"). A proposal: new
// art and new motion, waiting for his yes.
//
// Every pixel is his (tools/refs/wind-s-line-from-ref.py lifts his layers into
// vfx-wind-s-line-refdata.ts), one of his pixels per game px; pieces are moved, revealed and turned
// (RotSprite), nothing is drawn anew. The ray is laid from the caster's hand to where the camera's
// farthest view stops it (any length): his start, his repeating stretch as many times as it takes,
// and his end with the dragon at the front. Anchors are on the ray's middle line:
//
//   vfx_wind_s_line/start   his beam from the hand to his repeating stretch ('flow', a loop). Anchor:
//                           the hand.
//   vfx_wind_s_line/tile    his repeating stretch ('flow', a loop of FLOW_N frames): inside his
//                           beam's outline (kept still) his beam flows forward a FLOW_N-th of the
//                           stretch each frame, so the rings, strands and speed streaks travel and
//                           the loop tiles to any length; his near-white core shimmers in his three
//                           brightest colours (as the fireball's core churns: "como hiciste en el
//                           centro de la bola de fuego"). Anchor: its left end, on the middle line.
//   vfx_wind_s_line/end     the rest of his beam and his dragon ('surge', once: it bursts in from
//                           behind, turned back, and settles; 'loop': it breathes). Anchor: its
//                           left end, on the middle line.
//   vfx_wind_s_line/kanji   his kanji 風 with its green flame ('appear', once: it rises in and
//                           brightens; 'loop': it floats). Anchor: the hand, where he put it.
//   vfx_wind_s_line/dust_l  his dust and stones at the caster's feet ('rise', once, from the feet
//                           out; 'loop'). Anchor: the hand.
//   vfx_wind_s_line/dust_r  his dust and rocks under the dragon ('rise'; 'loop'). Anchor: the end's.
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

function startFrame(f: number): Canvas {
  const c = cut(beamIdx, beamBox.x, Y0, tileX - beamBox.x, BH);
  shimmer(c, beamBox.x, f / FLOW_N, tileN / 2);
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

/** Revealed from a point outward: only what lies within `r` px of it. */
function revealed(c: Canvas, cx: number, cy: number, r: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (Math.hypot(x - cx, (y - cy) * 1.6) <= r) out.set(x, y, c.get(x, y));
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
  const kanjiAppear = [...Array(8).keys()].map((f) => moved(fade(kanji, clamp01((f + 1) / 6)), 0, Math.round(RISE * (1 - easeOut((f + 1) / 8))), RISE));
  const kanjiLoop = [...Array(FLOW_N).keys()].map((f) => moved(kanji, 0, Math.round(-1.5 * Math.sin((f / FLOW_N) * Math.PI * 2)) , RISE));

  const dl = pieceCanvas(R.layers.dust_l), dlb = boxOf(R.layers.dust_l);
  const dr = pieceCanvas(R.layers.dust_r), drb = boxOf(R.layers.dust_r);
  const feet: [number, number] = [hand[0] - 40 - dlb.x, R.ground - dlb.y];
  const under: [number, number] = [Math.round(dragonBox.x + dragonBox.w * 0.55) - drb.x, R.ground - drb.y];
  const rise = (c: Canvas, at: [number, number]) => [...Array(6).keys()].map((f) => revealed(c, at[0], at[1], Math.max(c.w, c.h) * easeOut((f + 1) / 6)));

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
    { name: 'start', label: 'Gale Dragon Ray: his beam from the hand to its repeating stretch (anchor: the hand)', meters: [m(tileX - beamBox.x), m(BH)], anchor: [hand[0] - beamBox.x, hand[1] - Y0], tags: ['vfx'], anims: { flow: flow(startFrame) } },
    { name: 'tile', label: 'Gale Dragon Ray: his repeating stretch, flowing (anchor: its left end on the middle line)', meters: [m(tileN), m(BH)], anchor: anchorOnLine(0, Y0), tags: ['vfx'], anims: { flow: flow(tileFrame) } },
    { name: 'end', label: 'Gale Dragon Ray: the end of his beam and his wind dragon (anchor: its left end on the middle line)', meters: [m(EW), m(EH)], anchor: anchorOnLine(0, EY0), tags: ['vfx'], anims: { surge: { frames: surge, fps: FPS, loop: false }, loop: { frames: breathe, fps: FPS } } },
    { name: 'kanji', label: 'Gale Dragon Ray: his kanji 風 and its green flame (anchor: the hand)', meters: [m(kanji.w), m(kanji.h + RISE)], anchor: [hand[0] - kb.x, hand[1] - kb.y + RISE], tags: ['vfx'], anims: { appear: { frames: kanjiAppear, fps: FPS, loop: false }, loop: { frames: kanjiLoop, fps: FPS / 2 } } },
    { name: 'dust_l', label: 'Gale Dragon Ray: his dust and stones at the caster\'s feet (anchor: the hand)', meters: [m(dl.w), m(dl.h)], anchor: [hand[0] - dlb.x, hand[1] - dlb.y], tags: ['vfx'], anims: { rise: { frames: rise(dl, feet), fps: FPS, loop: false }, loop: { frames: [dl], fps: 0 } } },
    { name: 'dust_r', label: 'Gale Dragon Ray: his dust and rocks under the dragon (anchor: the end\'s)', meters: [m(dr.w), m(dr.h)], anchor: [endX - drb.x, hand[1] - drb.y], tags: ['vfx'], anims: { rise: { frames: rise(dr, under), fps: FPS, loop: false }, loop: { frames: [dr], fps: 0 } } },
    { name: 'debris', label: 'Gale Dragon Ray: his flying rocks and leaves (anchor: the hand)', meters: [m(dw), m(dh)], anchor: [hand[0] - dx0, hand[1] - dy0], tags: ['vfx'], anims: { loop: { frames: debrisLoop, fps: FPS } } },
  ];
  writeGroup('vfx_wind_s_line', sprites);
  console.log(`vfx_wind_s_line: start ${tileX - beamBox.x}, tile ${tileN} (${FLOW_N} frames), end ${EW}x${EH}, kanji ${kanji.w}x${kanji.h}, ${R.debris.length} loose pieces`);
}

main();
