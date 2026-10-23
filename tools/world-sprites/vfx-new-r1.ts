// The two new effects of the owner's first round of jutsu effect answers (2026-10-21; docs/
// GAMEPLAY_DESIGN.md, "Jutsu effects, round 1"): answer 4, the Wood Dragon ("vamos a crear un nuevo
// vfx para este"), and answer 11, the Chidori ("un nuevo vfx para que sea en la mano como en el
// casting de chidori y que haga una estocada"). Proposals: new art, waiting for his yes.
//
// Every pixel is his, moved, turned, flipped, layered or timed; nothing is drawn anew:
//
//   vfx_wood/wood_dragon    his wood dragon out of his hotbar icon (tools/refs/wood-dragon-from-ref.py
//                           lifts it into vfx-wood-refdata.ts), each of his pixels 2x2. Anchor: the
//                           ground under its trunk (it rises out of the ground there).
//                           'sway'   his drawing swaying on its root (RotSprite, -3 to 3 degrees);
//                           'strike' it rears back, then its head comes down on the target;
//                           'break'  it falls apart: from the top down, pieces of 3x3 of his
//                                    pixels drop and go, each at its own (seeded) moment.
//   vfx_wood/wood_root      one of his coils as a root arching out of the ground: the near half of
//                           his left coil and its mirror image (his pixels flipped). Anchor: the
//                           ground under the middle of the arch.
//   vfx_wood/wood_leaves    his loose leaves (the 14 flying round his dragon in the icon), flung up
//                           and out in a spray from the ground point and falling ('burst').
//   vfx_hand/lightning_hand his lightning hit (vfx_lightning/hit) as a ball crackling in the hand:
//                           'gather' his first, smallest burst, 'crackle' his first two in turn,
//                           each flipped another way every frame, 'crackle_enh' his second and
//                           third (bigger), 'dash' the crackle over his bolt's trailing spark
//                           (vfx_lightning/bolt), for the run in. Anchor: the middle of the ball.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-new-r1.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged groups
// into src/assets/world/ once the owner approves them. Same input, same bytes. With VFX_NEW_CHECK=<dir>
// it also writes a sheet of every sprite at 2x to look at.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, WorldSprite, hash, writeGroup } from './kit';
import { readPng } from './creatures-assemble';
import { rotSprite } from './vfx-turn';
import { WOOD_REF } from './vfx-wood-refdata';

const ASSETS = join(import.meta.dirname, '../../src/assets/world');
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** Each of his icon pixels is this many game pixels (his dragon about 2.5 m tall). */
const K = 2;
const SEED = 4404;

const pal: Color[] = WOOD_REF.pal.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]);

function fromRows(rows: string[]): Canvas {
  const c = new Canvas(Math.max(...rows.map((r) => r.length)), rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && c.set(x, y, pal[ALPHABET.indexOf(ch)])));
  return c;
}

type Px = { dx: number; dy: number; c: Color };

/** Frames as pixels about a pivot, put on one frame size, scaled by K: the pivot's ground point is the anchor. */
function framed(frames: Px[][], ground = 1): { frames: Canvas[]; anchor: [number, number] } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames)
    for (const p of f) {
      x0 = Math.min(x0, p.dx);
      y0 = Math.min(y0, p.dy);
      x1 = Math.max(x1, p.dx);
      y1 = Math.max(y1, p.dy);
    }
  const W = x1 - x0 + 1, H = Math.max(y1, ground - 1) - y0 + 1;
  return {
    frames: frames.map((f) => {
      const c = new Canvas(W, H);
      for (const p of f) c.set(p.dx - x0, p.dy - y0, p.c);
      return c.scaled(K);
    }),
    anchor: [(-x0) * K + K / 2, (ground - y0) * K],
  };
}

const pixels = (c: Canvas, pivot: [number, number]): Px[] => {
  const out: Px[] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.alpha(x, y)) out.push({ dx: x - pivot[0], dy: y - pivot[1], c: c.get(x, y) });
  return out;
};

// --- the wood dragon -------------------------------------------------------------------------

const dragon = fromRows(WOOD_REF.dragon);
/** The ground under his trunk: the trunk's middle on his last row (the row he rises out of). */
const ROOT: [number, number] = (() => {
  const y = dragon.h - 2;
  const xs: number[] = [];
  for (let x = 0; x < dragon.w; x++) if (dragon.alpha(x, y) && x > 25 && x < 70) xs.push(x);
  return [Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y];
})();

/** It falls apart from the top down: 3x3 pieces of his pixels drop and go, each at its own moment. */
function crumble(src: Px[], n: number): Px[][] {
  const P = 3;
  const top = Math.min(...src.map((p) => p.dy));
  const bottom = Math.max(...src.map((p) => p.dy));
  const out: Px[][] = [];
  for (let k = 0; k < n; k++) {
    const f: Px[] = [];
    for (const p of src) {
      const bx = Math.floor((p.dx + 1000) / P), by = Math.floor((p.dy + 1000) / P);
      // The higher the piece, the sooner it goes (plus its own seeded share).
      const high = 1 - (p.dy - top) / Math.max(1, bottom - top);
      const start = (1 - high) * (n - 1.5) + hash(bx, by, SEED) * 1.2;
      const t = k + 1 - start;
      if (t <= 0) f.push(p);
      else if (t < 2.2) f.push({ dx: p.dx + Math.round((hash(bx, by, SEED + 1) - 0.5) * 3 * t), dy: p.dy + Math.round(4 * t * t), c: p.c });
    }
    out.push(f);
  }
  return out;
}

function woodDragon(): WorldSprite {
  const sway = [0, -3, 0, 3].map((a) => rotSprite(dragon, ROOT, a));
  // Rears back, then the head comes down toward where it faces (his dragon faces left).
  const strikeAngles = [6, -12, -24, -30];
  const strike = strikeAngles.map((a) => rotSprite(dragon, ROOT, a));
  const brk = crumble(strike[strike.length - 1], 5);
  const all = framed([...sway, ...strike, ...brk]);
  const fr = all.frames;
  return {
    name: 'wood_dragon',
    label: 'Wood dragon: his dragon out of his Wood Dragon icon (each of his pixels 2x2): sway, strike (his head comes down to the left), break (it falls apart); anchor: the ground under its trunk',
    meters: [+(fr[0].w / 57).toFixed(2), +(fr[0].h / 57).toFixed(2)],
    anchor: all.anchor,
    tags: ['vfx'],
    anims: {
      sway: { frames: fr.slice(0, 4), fps: 6 },
      strike: { frames: fr.slice(4, 8), fps: 14, loop: false },
      break: { frames: fr.slice(8), fps: 12, loop: false },
    },
  };
}

/** His left coil's near half (up to the top of its arch) and its mirror: a root arching out of the ground. */
function woodRoot(): WorldSprite {
  const y0 = 54;
  const y1 = dragon.h - 2;
  // The top of the arch: the column where his coil's top edge is highest, left of his trunk.
  let topX = 0, topY = Infinity;
  for (let x = 1; x < 30; x++)
    for (let y = y0; y <= y1; y++)
      if (dragon.alpha(x, y)) {
        if (y < topY) [topX, topY] = [x, y];
        break;
      }
  const half = new Canvas(topX + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) for (let x = 0; x <= topX; x++) half.set(x, y - y0, dragon.get(x, y));
  const arch = new Canvas(2 * half.w, half.h);
  arch.draw(half, 0, 0);
  arch.draw(half, half.w, 0, true);
  const f = framed([pixels(arch, [half.w, arch.h - 1])]);
  return {
    name: 'wood_root',
    label: 'Wood root: the near half of his left coil and its mirror, a root arching out of the ground (anchor: the ground under the arch)',
    meters: [+(f.frames[0].w / 57).toFixed(2), +(f.frames[0].h / 57).toFixed(2)],
    anchor: f.anchor,
    tags: ['vfx'],
    anims: { idle: { frames: f.frames, fps: 0 } },
  };
}

/** His loose leaves flung up and out of the ground point, turning over, then falling. */
function woodLeaves(): WorldSprite {
  const leaves = WOOD_REF.leaves.map((l) => fromRows(l.rows));
  const N = 10;
  const frames: Px[][] = [];
  for (let k = 0; k < N; k++) {
    const t = (k + 1) / N;
    const f: Px[] = [];
    leaves.forEach((leaf, i) => {
      // Each leaf its own way out (seeded): an angle up and out, a speed, and every other frame flipped.
      const ang = (-90 + (hash(i, 1, SEED) - 0.5) * 150) * (Math.PI / 180);
      const v = 26 + hash(i, 2, SEED) * 22;
      const x = Math.round(Math.cos(ang) * v * t);
      const y = Math.round(Math.sin(ang) * v * t + 34 * t * t);
      const flip = (k + i) % 4 >= 2;
      if (t > 0.85 && hash(i, 3, SEED) < 0.5) return;
      for (let yy = 0; yy < leaf.h; yy++)
        for (let xx = 0; xx < leaf.w; xx++) {
          const c = leaf.get(flip ? leaf.w - 1 - xx : xx, yy);
          if (c[3]) f.push({ dx: x + xx - (leaf.w >> 1), dy: y + yy - leaf.h, c });
        }
    });
    frames.push(f);
  }
  const all = framed(frames);
  return {
    name: 'wood_leaves',
    label: 'Wood leaves: his loose leaves from the icon flung up and out of the ground point and falling (anchor: the ground point)',
    meters: [+(all.frames[0].w / 57).toFixed(2), +(all.frames[0].h / 57).toFixed(2)],
    anchor: all.anchor,
    tags: ['vfx'],
    anims: { burst: { frames: all.frames, fps: 14, loop: false } },
  };
}

// --- the lightning in the hand ---------------------------------------------------------------

interface Spec {
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  anims: Record<string, { row: number; frames: number }>;
}

/** The frames of one row of an installed, approved sheet, and its anchor. */
function rowFrames(group: string, name: string, anim: string): { frames: Canvas[]; anchor: [number, number] } {
  const manifest = JSON.parse(readFileSync(join(ASSETS, group, 'manifest.json'), 'utf8')) as { sprites: Record<string, Spec> };
  const spec = manifest.sprites[name];
  const sheet = readPng(join(ASSETS, group, spec.file));
  const a = spec.anims[anim];
  const out: Canvas[] = [];
  for (let f = 0; f < a.frames; f++) {
    const c = new Canvas(spec.frameW, spec.frameH);
    for (let y = 0; y < spec.frameH; y++) for (let x = 0; x < spec.frameW; x++) c.set(x, y, sheet.get(f * spec.frameW + x, a.row * spec.frameH + y));
    out.push(c);
  }
  return { frames: out, anchor: spec.anchor };
}

/** His frame flipped across (x), down (y) or both, about its anchor. */
function flipped(c: Canvas, anchor: [number, number], fx: boolean, fy: boolean): Px[] {
  const out: Px[] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      const dx = x - anchor[0], dy = y - anchor[1];
      out.push({ dx: fx ? -dx : dx, dy: fy ? -dy : dy, c: p });
    }
  return out;
}

function lightningHand(): WorldSprite {
  const hit = rowFrames('vfx_lightning', 'hit', 'hit');
  const bolt = rowFrames('vfx_lightning', 'bolt', 'fly');
  const h = (i: number, fx = false, fy = false) => flipped(hit.frames[i], hit.anchor, fx, fy);
  // Kept to his two smallest bursts (a ball about a third of the ninja's height); enhanced, the next two.
  const gather = [h(0), h(0, true), h(0, false, true), h(0, true, true)];
  const crackle = [h(1), h(0, true), h(1, true, true), h(0, false, true), h(1, true), h(0)];
  const crackleEnh = [h(2), h(1, true), h(2, true, true), h(1, false, true), h(2, true), h(1)];
  // The run in: his bolt (its spark ball and the spark trailing behind it) under the crackle.
  const dash = crackle.map((c, i) => [...flipped(bolt.frames[i % bolt.frames.length], bolt.anchor, false, false), ...c]);
  const rows = [gather, crackle, crackleEnh, dash];
  // Unscaled: these are his effect pixels already at the game's size.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rows)
    for (const f of r)
      for (const p of f) {
        x0 = Math.min(x0, p.dx);
        y0 = Math.min(y0, p.dy);
        x1 = Math.max(x1, p.dx);
        y1 = Math.max(y1, p.dy);
      }
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const make = (f: Px[]) => {
    const c = new Canvas(W, H);
    for (const p of f) c.plot(p.dx - x0, p.dy - y0, p.c);
    return c;
  };
  return {
    name: 'lightning_hand',
    label: 'Lightning in the hand: his lightning hit crackling as a ball (gather, crackle, crackle_enh) and over his bolt\'s trailing spark (dash); anchor: the middle of the ball',
    meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)],
    anchor: [-x0, -y0],
    tags: ['vfx'],
    anims: {
      gather: { frames: gather.map(make), fps: 12, loop: false },
      crackle: { frames: crackle.map(make), fps: 12 },
      crackle_enh: { frames: crackleEnh.map(make), fps: 12 },
      dash: { frames: dash.map(make), fps: 12 },
    },
  };
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-new-r1: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
const wood = [woodDragon(), woodRoot(), woodLeaves()];
const hand = [lightningHand()];
writeGroup('vfx_wood', wood, root);
writeGroup('vfx_hand', hand, root);
if (process.env.VFX_NEW_CHECK) {
  // Every sprite's frames side by side at 2x over a dark green ground, the anchor marked.
  for (const s of [...wood, ...hand]) {
    const rows = Object.values(s.anims);
    const fw = Math.max(...rows.flatMap((a) => a.frames.map((f) => f.w)));
    const fh = Math.max(...rows.flatMap((a) => a.frames.map((f) => f.h)));
    const cols = Math.max(...rows.map((a) => a.frames.length));
    const sheet = new Canvas(fw * cols, fh * rows.length);
    for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) sheet.set(x, y, [30, 52, 40, 255]);
    rows.forEach((a, r) =>
      a.frames.forEach((f, i) => {
        sheet.draw(f, i * fw, r * fh);
        sheet.set(i * fw + s.anchor[0], r * fh + s.anchor[1], [255, 0, 255, 255]);
      }),
    );
    sheet.scaled(2).save(join(process.env.VFX_NEW_CHECK, `${s.name}.png`));
  }
}
console.log(`vfx-new-r1: wrote vfx_wood and vfx_hand under ${root}`);
