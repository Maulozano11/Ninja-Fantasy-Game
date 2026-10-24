// The S-rank Devouring Tide (the owner's paint-over of our widest wave, 2026-10-22: "a la ola pasame
// el sprite donde se ven mas olas para agregarle un kanji y una bestia animada que sera el jutsu en
// version mejorada clase s"). A proposal: new art, waiting for his yes.
//
// Every pixel is his (tools/refs/tide-s-from-ref.py lifts his layers into vfx-tide-s-refdata.ts),
// each of his pixels K x K game px; pieces are moved and turned (RotSprite), nothing is drawn anew.
// Every sprite's anchor is our crest point (the middle of the wave's crest on the ground), so the
// battle draws them all at the crest, where he painted them on our frame:
//
//   vfx_tide_s/curl     his curl wave with his spray ('idle', one frame). The battle raises it out of
//                       the ground with the wave and sinks it at the break (clipped at its foot).
//   vfx_tide_s/dragon   his water dragon ('play', 12 fps, once, DRAGON_MS): it surges up out of the
//                       curl (from RISE of his px lower, turned back SURGE_TURN degrees, its jaw shut),
//                       roars (his jaw drops open, wider, shuts and opens again) with its whiskers
//                       swaying and its horns stirring, then at the break dives forward and down into
//                       the wave. Nothing of it is drawn below his line under the chin (SURFACE): it
//                       rises out of the water there and sinks back into it.
//   vfx_tide_s/kanji    his kanji 水 ('kanji') and its light aura ('glow'), one frame each: the battle
//                       fades the kanji in, pulses the glow over it as light and flashes it at the break.
//                       Never mirrored.
//
// The dragon is solid: it carries the characters' black line (solid-outline.ts, the owner's decision
// of 2026-10-22), outside his own line where it has a gap, as opaque as the dragon while it fades in
// and out; none along the water's surface it rises out of (the frame's lower edge). The curl wave,
// its spray and the kanji are energy: no line. SOLID_OUTLINE=0 leaves it off.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-tide-s.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group
// into src/assets/world/ once the owner approves it. Same input, same bytes.

import { Canvas, Color, WorldSprite, writeGroup } from './kit';
import { rotSprite } from './vfx-turn';
import { TIDE_S_REF, TidePiece } from './vfx-tide-s-refdata';
import { outlineSprite, solidOutlineOn } from './solid-outline';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const R = TIDE_S_REF;
/** Game px per his pixel. */
const K = R.k;
/** The dragon's play (ms, 12 fps): the wave's run (TIDE_S_RUN in vfxSprites.ts) plus its break. */
export const DRAGON_MS = 3100;
const FPS = 12;
/** His px the dragon rises from below its place, and how far it is turned back as it starts (degrees). */
const RISE = 30;
const SURGE_TURN = -8;
/** Its surge, its dive (ms into the wave's run). */
const SURGE = [950, 1500];
const DIVE = [2200, 2800];
/** The dive: his px forward (to the right, the way the wave runs) and down, and the turn (degrees). */
const DIVE_TO = [26, 74, 34];

const pal: Color[] = R.pal.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]);

/** A piece of his on its own canvas (piece coords) and where that canvas starts on his. */
function piece(p: TidePiece): { c: Canvas; x: number; y: number } {
  const c = new Canvas(Math.max(...p.rows.map((r) => r.length)), p.rows.length);
  p.rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && c.set(x, y, pal[ALPHABET.indexOf(ch)])));
  return { c, x: p.x, y: p.y };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => 1 - (1 - clamp01(v)) ** 3;
const easeIn = (v: number) => clamp01(v) ** 2;
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** A box on his canvas (his px) that every frame of a sprite is cut from. */
interface Box { x: number; y: number; w: number; h: number }

/** The canvas of a box, his pixels scaled K times, with the crest point as its anchor. */
function framed(c: Canvas, box: Box): { frame: Canvas; anchor: [number, number] } {
  return { frame: c.scaled(K), anchor: [Math.round((R.crest[0] - box.x) * K), Math.round((R.crest[1] - box.y) * K)] };
}

/** Pixels turned about a pivot (his px on the box), stamped with alpha `a`, only above `clipY`. */
function stamp(dst: Canvas, box: Box, px: { dx: number; dy: number; c: Color }[], at: [number, number], a: number, clipY = Infinity): void {
  for (const p of px) {
    const x = Math.round(at[0] + p.dx), y = Math.round(at[1] + p.dy);
    if (y >= clipY) continue;
    dst.plot(x - box.x, y - box.y, [p.c[0], p.c[1], p.c[2], Math.round(p.c[3] * a)]);
  }
}

function still(name: string, label: string, layers: TidePiece[], anims: string[] = ['idle']): WorldSprite {
  const pcs = layers.map(piece);
  const x0 = Math.min(...pcs.map((p) => p.x)), y0 = Math.min(...pcs.map((p) => p.y));
  const x1 = Math.max(...pcs.map((p) => p.x + p.c.w)), y1 = Math.max(...pcs.map((p) => p.y + p.c.h));
  const box: Box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const frames = anims.map((_, i) => {
    const c = new Canvas(box.w, box.h);
    const ps = anims.length > 1 ? [pcs[i]] : pcs;
    for (const p of ps) c.draw(p.c, p.x - box.x, p.y - box.y);
    return framed(c, box);
  });
  return {
    name,
    label,
    meters: [+(frames[0].frame.w / 57).toFixed(2), +(frames[0].frame.h / 57).toFixed(2)],
    anchor: frames[0].anchor,
    tags: ['vfx'],
    anims: Object.fromEntries(anims.map((a, i) => [a, { frames: [frames[i].frame], fps: 0 }])),
  };
}

/** The dragon at `t` ms of the wave: its head's move and turn, its jaw, whiskers and horns. */
export function dragonPose(t: number): { dx: number; dy: number; turn: number; alpha: number; jaw: number; whisker: [number, number]; horn: number } {
  const s = ease(span(t, SURGE[0], SURGE[1]));
  const d = easeIn(span(t, DIVE[0], DIVE[1]));
  // It breathes once it is up (his px, whole: his pixels move a whole pixel at a time).
  const bob = s >= 1 && d <= 0 ? Math.round(Math.sin(((t - SURGE[1]) / 700) * 2 * Math.PI)) : 0;
  // The jaw (his px down from his drawing: below 0 it shuts over his open mouth): shut while it
  // surges, his open roar, wider, shut, and the second roar at the break.
  const keys: [number, number][] = [[0, -5], [1350, -5], [1500, 0], [1600, 2], [1780, 2], [1860, 0], [1930, -3], [2000, -3], [2080, 2], [2400, 2]];
  let jaw = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++)
    if (t < keys[i + 1][0]) {
      const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
      jaw = Math.round(va + (vb - va) * clamp01((t - ta) / (tb - ta)));
      break;
    }
  const sway = Math.sin((t / 900) * 2 * Math.PI);
  return {
    dx: Math.round(d * DIVE_TO[0]),
    dy: Math.round((1 - s) * RISE + d * DIVE_TO[1]) + bob,
    turn: (1 - s) * SURGE_TURN + d * DIVE_TO[2],
    alpha: clamp01((t - SURGE[0]) / 200) * (1 - span(t, DIVE[1] - 150, DIVE[1])),
    jaw,
    // They sway against each other, and trail behind as it dives.
    whisker: [6 * sway - d * 14, -6 * Math.sin((t / 900) * 2 * Math.PI + 0.6) - d * 14],
    horn: 2 * Math.sin((t / 1300) * 2 * Math.PI),
  };
}

function dragon(): WorldSprite {
  const L = R.layers;
  const P = R.pivots;
  const pcs = { head: piece(L.head), jaw: piece(L.jaw), horn_l: piece(L.horn_l), horn_r: piece(L.horn_r), whisker_l: piece(L.whisker_l), whisker_r: piece(L.whisker_r) };
  // The box every frame is cut from (his px): his dragon's place with room to dive and turn, down to his line under the chin.
  const box: Box = { x: 150, y: 0, w: 156, h: R.surface };
  const n = Math.round((DRAGON_MS / 1000) * FPS);
  const frames: Canvas[] = [];
  let anchor: [number, number] = [0, 0];
  for (let i = 0; i < n; i++) {
    const t = (i * 1000) / FPS;
    const q = dragonPose(t);
    const c = new Canvas(box.w, box.h);
    if (q.alpha > 0) {
      const hp = P.head;
      const rad = (q.turn * Math.PI) / 180;
      // Where a point of his drawing goes when the head turns about its pivot and moves.
      const move = (x: number, y: number): [number, number] => [hp[0] + q.dx + (x - hp[0]) * Math.cos(rad) - (y - hp[1]) * Math.sin(rad), hp[1] + q.dy + (x - hp[0]) * Math.sin(rad) + (y - hp[1]) * Math.cos(rad)];
      const put = (k: keyof typeof pcs, pivot: number[], own: number, shift: [number, number] = [0, 0]) => {
        const p = pcs[k];
        const px = rotSprite(p.c, [pivot[0] - p.x, pivot[1] - p.y], q.turn + own);
        const at = move(pivot[0] + shift[0], pivot[1] + shift[1]);
        stamp(c, box, px, at, q.alpha, R.surface);
      };
      put('head', P.head, 0);
      put('jaw', P.jaw, 0, [0, q.jaw]);
      put('horn_l', P.horn_l, -q.horn);
      put('horn_r', P.horn_r, q.horn);
      put('whisker_l', P.whisker_l, q.whisker[0]);
      put('whisker_r', P.whisker_r, q.whisker[1]);
    }
    const f = framed(c, box);
    frames.push(f.frame);
    anchor = f.anchor;
  }
  return {
    name: 'dragon',
    label: 'His water dragon of the S-rank Tide (each of his pixels 2x2): surges up out of the curl, roars, dives into the wave at the break; anchor: our crest point',
    meters: [+(frames[0].w / 57).toFixed(2), +(frames[0].h / 57).toFixed(2)],
    anchor,
    tags: ['vfx'],
    anims: { play: { frames, fps: FPS, loop: false } },
  };
}

function main(): void {
  if (!process.env.WORLD_OUT) {
    console.error('WORLD_OUT=<staging dir> is required: this proposal never writes into src/assets.');
    process.exit(1);
  }
  const L = R.layers;
  const sprites: WorldSprite[] = [
    still('curl', 'His curl wave of the S-rank Tide with his spray (each of his pixels 2x2); anchor: our crest point', [L.curl, ...R.spray]),
    solidOutlineOn() ? outlineSprite(dragon()) : dragon(),
    still('kanji', 'His kanji 水 of the S-rank Tide (kanji) and its light aura (glow), each of his pixels 2x2; anchor: our crest point', [L.kanji, L.glow], ['kanji', 'glow']),
  ];
  writeGroup('vfx_tide_s', sprites);
  for (const s of sprites) console.log(s.name, Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}`).join(' '), `${s.anims[Object.keys(s.anims)[0]].frames[0].w}x${s.anims[Object.keys(s.anims)[0]].frames[0].h}`, 'anchor', s.anchor.join(','));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
