// Effects for the owner's first round of jutsu effect answers (2026-10-21; docs/GAMEPLAY_DESIGN.md,
// "Jutsu effects, round 1"), made only out of his approved pictures. Nothing is redrawn:
//
//   vfx_dragon/fire_head       the dragon head of his Great Fire Annihilation (enhanced), alone: his
//                              s_head piece exactly ('idle'), and 'fade', burnt by burnOut() with the
//                              Annihilation's own seed, noise and fade curve in the very place the
//                              head has in annihilation_enh, so it burns away the way it does there.
//                              Anchor: the mouth (fireballs and the stream leave it). Llama Dragón.
//   vfx_dragon/fire_head_half  the same at half size (Fuego del dragón).
//   vfx_dragon/fire_wall_half  his fire wall ('rise', 'idle') at half size (Fuego del dragón).
//   vfx_dragon/water_head      the head alone (no neck), in his water colours, at half size and
//                              turned with RotSprite to every flight angle from -90 to 90 degrees
//                              (rows a-90 ... a90, 10 degrees apart; a0 is his drawing, facing right).
//                              The owner: "agarrar la cabeza de dragon del fuego ... para cambiarla a
//                              agua y ponerla en la punta del chorro". Anchor: the middle of the head.
//
// Half size: each 2x2 block takes its most frequent colour (a tie: the one nearest the block's mean),
// a block is solid when 2 of its 4 pixels are, and the new silhouette edge gets his outline colour
// again, so only his colours are used. His water colours: every colour of his fire head but his dark
// line takes the colour at the same place (by brightness, counted over the pixels) among the colours
// of his water stream (vfx_water/stream and stream_head), so his shading reads the same; his line stays.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-round1.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group
// into src/assets/world/ once the owner approves it. Same input, same bytes. With VFX_R1_CHECK=<dir>
// it also writes a sheet of every sprite at 2x to look at.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, WorldSprite, writeGroup } from './kit';
import { readPng } from './creatures-assemble';
import { burnOut, refPiece } from './vfx-a-ref';
import { FIRE } from './vfx-a-fire-kit';
import { palette } from './vfx-a-lib';
import { FADE_N, S_FRAME, fadeCurve } from './vfx-a-fire-s';
import { fan, key, turned } from './vfx-turn';

const ASSETS = join(import.meta.dirname, '../../src/assets/world');
// The Annihilation's seed and its smoke (SMOKE_HIS in vfx-a-fire-s.ts, which does not export it).
const SEED = 1900;
const SMOKE_HIS = palette('#24141a', '#3a1f22', '#472625', '#553f3d', '#7c4838', '#8a5e4b', '#a07a64');

interface Spec {
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
}

/** The frames of one row of an installed, approved sheet. */
function rowFrames(group: string, name: string, anim: string): { spec: Spec; frames: Canvas[]; fps: number; loop: boolean } {
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
  return { spec, frames: out, fps: a.fps, loop: a.loop };
}

const lum = (c: number[]): number => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

/** His outline colour in a picture: the colour of most silhouette-edge pixels, when one clearly leads. */
function edgeColour(c: Canvas): Color | null {
  const count = new Map<number, number>();
  let n = 0;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (!c.alpha(x, y)) continue;
      if (c.alpha(x - 1, y) && c.alpha(x + 1, y) && c.alpha(x, y - 1) && c.alpha(x, y + 1)) continue;
      const k = key(c.get(x, y));
      count.set(k, (count.get(k) ?? 0) + 1);
      n++;
    }
  let best = 0, bestN = 0;
  for (const [k, m] of count) if (m > bestN || (m === bestN && k < best)) [best, bestN] = [k, m];
  return bestN > 0.6 * n ? [(best >>> 24) & 255, (best >>> 16) & 255, (best >>> 8) & 255, 255] : null;
}

/**
 * Half size, his colours only (see the header). `outline`: his line colour for the new edge (null: no
 * clear outline, none added). The frame's own border is not an edge (a cut neck is not outlined).
 */
function half(c: Canvas, outline: Color | null): Canvas {
  const W = Math.ceil(c.w / 2), H = Math.ceil(c.h / 2);
  const out = new Canvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const px: Color[] = [];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const p = c.get(2 * x + dx, 2 * y + dy);
        if (p[3]) px.push(p);
      }
      if (px.length < 2) continue;
      const count = new Map<number, number>();
      for (const p of px) count.set(key(p), (count.get(key(p)) ?? 0) + 1);
      const most = Math.max(...count.values());
      const tied = px.filter((p, i) => count.get(key(p)) === most && px.findIndex((q) => key(q) === key(p)) === i);
      const mean = [0, 1, 2].map((i) => px.reduce((s, p) => s + p[i], 0) / px.length);
      const d = (p: Color) => (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2;
      // A tie goes to the colour nearest the block's mean (then the first in the block).
      out.set(x, y, tied.reduce((a, b) => (d(b) < d(a) ? b : a)));
    }
  if (!outline) return out;
  const res = out.clone();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!out.alpha(x, y)) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => out.inside(x + dx, y + dy) && !out.alpha(x + dx, y + dy));
      if (open) {
        const a = out.get(x, y)[3];
        res.set(x, y, [outline[0], outline[1], outline[2], a]);
      }
    }
  return res;
}

const halfAll = (frames: Canvas[]): Canvas[] => {
  const o = edgeColour(frames[0]);
  return frames.map((f) => half(f, o));
};

// --- the fire head ---------------------------------------------------------------------------

const head = refPiece('s_head');
/** Where the head's mouth is in his piece (the right end of the flame in the open jaw). */
const MOUTH: [number, number] = [284, 170];

/** His head, and its fade: burnt exactly as dragonLayers() burns it in annihilation_enh (without the sink). */
function fireHeadFrames(): { idle: Canvas[]; fade: Canvas[] } {
  const { W, H, GY } = S_FRAME;
  const keys = fadeCurve(1, [0.85, 0.62, 0.4, 0.2, 0.06, 0]);
  const fade: Canvas[] = [];
  for (let i = 0; i < FADE_N; i++) {
    const c = new Canvas(W, H);
    c.draw(head.c, head.x, head.y);
    const b = burnOut(c, 1 - keys[i], SMOKE_HIS, FIRE[0], SEED + 118, GY - 520, 420, 30);
    const crop = new Canvas(head.c.w, head.c.h);
    for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) crop.set(x, y, b.get(head.x + x, head.y + y));
    fade.push(crop);
  }
  return { idle: [head.c.clone()], fade };
}

function fireHeads(): WorldSprite[] {
  const { idle, fade } = fireHeadFrames();
  const full: WorldSprite = {
    name: 'fire_head',
    label: 'Fire dragon head: the head of his enhanced Great Fire Annihilation alone; fade burns it as there (anchor: the mouth)',
    meters: [+(head.c.w / 57).toFixed(2), +(head.c.h / 57).toFixed(2)],
    anchor: MOUTH,
    tags: ['vfx'],
    anims: { idle: { frames: idle, fps: 0 }, fade: { frames: fade, fps: 12, loop: false } },
  };
  const o = edgeColour(head.c);
  const h = (f: Canvas) => half(f, o);
  const halfHead: WorldSprite = {
    name: 'fire_head_half',
    label: 'Fire dragon head at half size (his colours, his outline; anchor: the mouth)',
    meters: [+(Math.ceil(head.c.w / 2) / 57).toFixed(2), +(Math.ceil(head.c.h / 2) / 57).toFixed(2)],
    anchor: [MOUTH[0] / 2, MOUTH[1] / 2],
    tags: ['vfx'],
    anims: { idle: { frames: idle.map(h), fps: 0 }, fade: { frames: fade.map(h), fps: 12, loop: false } },
  };
  return [full, halfHead];
}

function fireWallHalf(): WorldSprite {
  const rise = rowFrames('vfx_fire', 'wall', 'rise');
  const idle = rowFrames('vfx_fire', 'wall', 'idle');
  const o = edgeColour(idle.frames[0]);
  return {
    name: 'fire_wall_half',
    label: 'Fire wall at half size (his rise and idle, his colours, his outline)',
    meters: [+(Math.ceil(rise.spec.frameW / 2) / 57).toFixed(2), +(Math.ceil(rise.spec.frameH / 2) / 57).toFixed(2)],
    anchor: [Math.round(rise.spec.anchor[0] / 2), Math.round(rise.spec.anchor[1] / 2)],
    tags: ['vfx'],
    anims: { rise: { frames: rise.frames.map((f) => half(f, o)), fps: rise.fps, loop: false }, idle: { frames: idle.frames.map((f) => half(f, o)), fps: idle.fps } },
  };
}

// --- the water head --------------------------------------------------------------------------

/**
 * The head without its neck (piece pixels): the box it is cut from, less the neck under the jaw. The
 * cut gets his outline (the head is cut with a clear margin round it, so half() outlines it).
 */
const HEAD_ONLY = { x: 56, y: 14, w: 263, h: 226 };
const inHead = (x: number, y: number): boolean => !(y > 186 && x < 200) && !(y > 150 && x < 110);

/** Every colour of his water stream (and its head) but its line, with how many pixels have it, darkest first. */
function waterColours(): { c: Color; n: number }[] {
  const count = new Map<number, number>();
  for (const name of ['stream', 'stream_head']) {
    for (const f of rowFrames('vfx_water', name, 'fly').frames)
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const p = f.get(x, y);
          if (p[3] && lum(p) > 0.12) count.set(key(p), (count.get(key(p)) ?? 0) + 1);
        }
  }
  return [...count]
    .map(([k, n]) => ({ c: [(k >>> 24) & 255, (k >>> 16) & 255, (k >>> 8) & 255, k & 255] as Color, n }))
    .sort((a, b) => lum(a.c) - lum(b.c) || key(a.c) - key(b.c));
}

/**
 * His fire head in his water colours: each colour but the line (the darkest, his outline) is placed
 * by brightness among the head's pixels (the middle of its share) and takes the water colour at the
 * same place among the water's pixels.
 */
function inWater(c: Canvas): Canvas {
  const line = edgeColour(c);
  const lineKey = line ? key(line) : -1;
  const own = new Map<number, number>();
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (p[3] && key(p) !== lineKey) own.set(key(p), (own.get(key(p)) ?? 0) + 1);
    }
  const mine = [...own].map(([k, n]) => ({ k, n, l: lum([(k >>> 24) & 255, (k >>> 16) & 255, (k >>> 8) & 255]) })).sort((a, b) => a.l - b.l || a.k - b.k);
  const total = mine.reduce((s, m) => s + m.n, 0);
  const water = waterColours();
  const wTotal = water.reduce((s, w) => s + w.n, 0);
  const at = (q: number): Color => {
    let acc = 0;
    for (const w of water) {
      acc += w.n;
      if (acc >= q * wTotal) return w.c;
    }
    return water[water.length - 1].c;
  };
  const map = new Map<number, Color>();
  let acc = 0;
  for (const m of mine) {
    map.set(m.k, at((acc + m.n / 2) / total));
    acc += m.n;
  }
  const out = c.clone();
  out.map((p) => {
    const w = map.get(key(p));
    return w ? [w[0], w[1], w[2], p[3]] : null;
  });
  return out;
}

function waterHead(): WorldSprite {
  const M = 2;
  const cut = new Canvas(HEAD_ONLY.w + 2 * M, HEAD_ONLY.h + 2 * M);
  for (let y = 0; y < HEAD_ONLY.h; y++)
    for (let x = 0; x < HEAD_ONLY.w; x++) if (inHead(HEAD_ONLY.x + x, HEAD_ONLY.y + y)) cut.set(M + x, M + y, head.c.get(HEAD_ONLY.x + x, HEAD_ONLY.y + y));
  const small = half(inWater(cut), edgeColour(head.c));
  // Turned about the middle of the head (between the eye and the jaw).
  const pivot: [number, number] = [Math.round((MOUTH[0] - HEAD_ONLY.x + M) / 2) - 40, Math.round((MOUTH[1] - HEAD_ONLY.y + M) / 2) - 8];
  return turned('water_head', 'Water dragon head: his fire dragon head (no neck) in his water colours at half size, turned to every flight angle (a0 is his; anchor: the middle of the head)', [small], pivot, 0, fan(10), 0);
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-round1: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
const sprites = [...fireHeads(), fireWallHalf(), waterHead()];
writeGroup('vfx_dragon', sprites, root);
if (process.env.VFX_R1_CHECK) {
  // Every sprite's frames side by side at 2x over a dark green ground.
  for (const s of sprites) {
    const rows = Object.values(s.anims);
    const fw = Math.max(...rows.flatMap((a) => a.frames.map((f) => f.w)));
    const fh = Math.max(...rows.flatMap((a) => a.frames.map((f) => f.h)));
    const cols = Math.min(10, Math.max(...rows.map((a) => a.frames.length)));
    const all = rows.flatMap((a) => a.frames);
    const sheet = new Canvas(fw * cols, fh * Math.ceil(all.length / cols));
    sheet.map(() => null);
    for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) sheet.set(x, y, [30, 60, 40, 255]);
    all.forEach((f, i) => sheet.draw(f, (i % cols) * fw, Math.floor(i / cols) * fh));
    sheet.scaled(2).save(join(process.env.VFX_R1_CHECK, `${s.name}.png`));
  }
}
console.log(`vfx-round1: wrote vfx_dragon under ${root}`);
