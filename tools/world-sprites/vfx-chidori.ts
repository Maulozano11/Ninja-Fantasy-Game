// The activated Chidori's own art (the owner, 2026-10-21; docs/GAMEPLAY_DESIGN.md, "The Chidori
// becomes an activated state"). Proposals: new art, waiting for his yes.
//
//   vfx_charged/chidori_hand  his lightning in the near hand, every pixel his: the lightning out of
//                             his two silver-haired paint-overs (tools/refs/chidori-hand-from-ref.py
//                             lifts it into vfx-chidori-refdata.ts), one of his pixels each, unturned
//                             and unflipped. 'charged' flickers between his two drawings: the vest's
//                             (the pale ring round the fist and thin bolts) and the coat's (the bigger
//                             burst of sparks), in an uneven beat so it crackles rather than blinks.
//                             Anchor: his fist (the rig's near hand). Played in the caster's chakra
//                             colour by the battle screen, his own colours at the default lightning.
//   vfx_charged/ground_crack  the ground cracking under a charged ninja's step (new, ours): a small
//                             star of dark cracks in the soil with a lit lip and a few chips, four
//                             variants (frames of 'idle', picked per cell). Anchor: its middle, on
//                             the ground. Never in a chakra colour: it is the ground.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-chidori.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group
// into src/assets/world/ once the owner approves it. Same input, same bytes. With VFX_CHIDORI_CHECK=<dir>
// it also writes a sheet of every sprite at 4x to look at.

import { join } from 'node:path';
import { Canvas, Color, WorldSprite, hash, hex, writeGroup } from './kit';
import { CHIDORI_REF } from './vfx-chidori-refdata';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const pal: Color[] = CHIDORI_REF.pal.map((h) => hex(h));

type Px = { dx: number; dy: number; c: Color };

/** One of his frames as pixels about his fist (rounded down to the cell it falls in). */
function framePx(i: number): Px[] {
  const f = CHIDORI_REF.frames[i];
  const ax = Math.floor(f.anchor[0]);
  const ay = Math.floor(f.anchor[1]);
  const out: Px[] = [];
  f.rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && out.push({ dx: x - ax, dy: y - ay, c: pal[ALPHABET.indexOf(ch)] })));
  return out;
}

/** Frames of pixels about one anchor, on one frame size. */
function onFrames(frames: Px[][]): { frames: Canvas[]; anchor: [number, number]; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames)
    for (const p of f) {
      x0 = Math.min(x0, p.dx);
      y0 = Math.min(y0, p.dy);
      x1 = Math.max(x1, p.dx);
      y1 = Math.max(y1, p.dy);
    }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  return {
    frames: frames.map((f) => {
      const c = new Canvas(w, h);
      for (const p of f) c.set(p.dx - x0, p.dy - y0, p.c);
      return c;
    }),
    anchor: [-x0, -y0],
    w,
    h,
  };
}

function chidoriHand(): WorldSprite {
  const vest = framePx(0);
  const coat = framePx(1);
  // An uneven beat of his two drawings: the ring, the burst, the burst again, the ring held, the burst.
  const beat = [vest, coat, coat, vest, vest, coat];
  const f = onFrames(beat);
  return {
    name: 'chidori_hand',
    label: "The activated Chidori's lightning in the near hand: his two paint-overs' lightning (the vest's ring and bolts, the coat's burst) flickering ('charged'); anchor: his fist",
    meters: [+(f.w / 57).toFixed(2), +(f.h / 57).toFixed(2)],
    anchor: f.anchor,
    tags: ['vfx'],
    anims: { charged: { frames: f.frames, fps: 12 } },
  };
}

const CORE = hex('#1a130e');
const WALL = hex('#3b2c20');
const LIP = hex('#8c7656');
const CHIP = hex('#6a5640');
const CHIP_LIT = hex('#a48d69');
/** A crack's frame: about half a metre across, a step's worth (cells are 0.5 m). */
const CW = 30, CH = 16;

/**
 * One crack star: from the middle, 5 to 7 jagged cracks run out on the ground (squashed to the ground
 * plane: half as tall as wide), each a dark core with its wall below it and a lit lip above it (the
 * light comes from the upper left), forking once; chips of soil lie by the middle.
 */
function crack(seed: number): Canvas {
  const c = new Canvas(CW, CH);
  const cx = CW / 2, cy = CH / 2;
  const core: [number, number][] = [];
  const arms = 5 + Math.floor(hash(seed, 1, 77) * 3);
  const run = (x: number, y: number, ang: number, len: number, s: number) => {
    for (let k = 0; k < len; k++) {
      ang += (hash(s, k, 31) - 0.5) * 0.7;
      // One pixel a step on the ground plane (half as tall as wide).
      const dx = Math.cos(ang), dy = Math.sin(ang) * 0.55;
      const l = Math.max(Math.abs(dx), Math.abs(dy));
      x += dx / l;
      y += dy / l;
      const px = Math.round(x), py = Math.round(y);
      if (px < 1 || py < 1 || px >= CW - 1 || py >= CH - 1) return;
      core.push([px, py]);
      if (k === Math.floor(len / 2) && hash(s, 99, 5) < 0.6) run(x, y, ang + (hash(s, 7, 9) < 0.5 ? -0.9 : 0.9), Math.max(2, Math.floor(len * 0.5)), s * 7 + 3);
    }
  };
  for (let a = 0; a < arms; a++) {
    const ang = (a / arms) * Math.PI * 2 + hash(seed, a, 11) * 0.7;
    run(cx, cy, ang, 5 + Math.floor(hash(seed, a, 13) * 6), seed * 131 + a * 17);
  }
  // The middle, where the foot struck: a small pit.
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1]]) core.push([Math.round(cx) + dx, Math.round(cy) + dy]);
  const has = new Set(core.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of core) {
    if (!has.has(`${x},${y + 1}`)) c.set(x, y + 1, WALL);
    if (!has.has(`${x},${y - 1}`) && c.alpha(x, y - 1) === 0) c.set(x, y - 1, LIP);
  }
  for (const [x, y] of core) c.set(x, y, CORE);
  for (let i = 0; i < 4; i++) {
    const x = Math.round(cx + (hash(seed, i, 41) - 0.5) * 16);
    const y = Math.round(cy + (hash(seed, i, 43) - 0.5) * 7);
    if (c.alpha(x, y)) continue;
    c.set(x, y, CHIP);
    if (c.alpha(x, y - 1) === 0) c.set(x, y - 1, CHIP_LIT);
  }
  return c;
}

function groundCrack(): WorldSprite {
  const frames = [1, 2, 3, 4].map(crack);
  return {
    name: 'ground_crack',
    label: "Ground cracked under a charged ninja's step (difficult terrain while it shows): four variants in 'idle', one per cell; anchor: its middle on the ground",
    meters: [+(CW / 57).toFixed(2), +(CH / 57).toFixed(2)],
    anchor: [CW / 2, CH / 2],
    tags: ['vfx'],
    anims: { idle: { frames, fps: 0 } },
  };
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-chidori: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
const sprites = [chidoriHand(), groundCrack()];
writeGroup('vfx_charged', sprites, root);
if (process.env.VFX_CHIDORI_CHECK) {
  for (const s of sprites) {
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
    sheet.scaled(4).save(join(process.env.VFX_CHIDORI_CHECK, `${s.name}.png`));
  }
}
console.log(`vfx-chidori: wrote vfx_charged under ${root}`);
