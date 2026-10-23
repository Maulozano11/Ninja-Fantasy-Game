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
//   vfx_charged/ground_crack  the ground cracking under a charged ninja's step (new, ours): a heavy
//                             fracture about a metre across, deep black fissures forking out of the
//                             pit, torn soil, slabs of ground lifted at the edges, four variants
//                             (frames of 'idle', picked per cell); 'open_<variant>' splits it open
//                             in 3 frames, 'glow' is the lightning left in its depths (two flickers
//                             a variant, faded out by the screen). Anchor: its middle, on the
//                             ground. Never in a chakra colour: it is the ground.
//   vfx_charged/ground_crack_dust  the dust puff and chips of ground thrown as a crack opens
//                             ('puff', once). Anchor: the crack's middle.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-chidori.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group
// into src/assets/world/ once the owner approves it. Same input, same bytes. With VFX_CHIDORI_CHECK=<dir>
// it also writes a sheet of every sprite at 4x to look at.

import { join } from 'node:path';
import { Canvas, Color, WorldSprite, bayer4, hash, hex, writeGroup } from './kit';
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

// The ground crack (the owner, 2026-10-22: "las grietas en el piso deben ser mas contundentes
// profundas se ven muy debiles ahora"): a heavy fracture where the charged foot strikes. Wide main
// fissures (2-4 px) with a near-black bottom and walls of dark earth, a shadowed upper lip and a lit
// lower one so they read cut into the ground, forking cracks, the soil round the impact torn up,
// and broken slabs of ground lifted at the edges with rubble about them.
const C = {
  core: hex('#0a0705'),
  deep: hex('#1b120c'),
  wall: hex('#4a3524'),
  wallLo: hex('#33241a'),
  lipLit: hex('#a88c64'),
  lipShade: hex('#120b07', 190),
  soil: hex('#5e4532', 200),
  soilDk: hex('#4a3626', 220),
  line: hex('#24170f'),
  chunkDk: hex('#4f3a28'),
  chunk: hex('#7c6145'),
  chunkLit: hex('#a38461'),
  chunkHi: hex('#c4a57b'),
  cast: hex('#000000', 110),
  glowHi: hex('#f4fcff'),
  glow: hex('#8fd6ff'),
  glowLo: hex('#3f93e6', 200),
  dustHi: hex('#d4bd96'),
  dust: hex('#a98e69'),
  dustDk: hex('#7d6649'),
};
/** A crack's frame: about a metre across (a cell is half a metre), so a trail of steps runs together. */
const CW = 64, CH = 36;
const CX = 32, CY = 19;
/** The ground plane on the screen: depth is drawn a little over half as tall as width. */
const SQ = 0.55;

type Arm = { pts: [number, number][]; hw0: number; hw1: number; from: number };
type CrackPlan = { arms: Arm[]; chunks: { x: number; y: number; w: number; h: number; s: number; at: number }[]; pebbles: { x: number; y: number; s: number; at: number }[] };

/** A jagged run on the ground plane (ground units: x as px, y as depth px before the squash). */
function walk(x: number, y: number, ang: number, len: number, s: number): [number, number][] {
  const pts: [number, number][] = [[x, y]];
  const step = 3;
  for (let d = 0; d < len; d += step) {
    ang += (hash(s, d, 31) - 0.5) * 0.9;
    x += Math.cos(ang) * step;
    y += Math.sin(ang) * step;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * One variant's fracture: two long fissures splitting through the impact (one run on through it),
 * one or two shorter ones across, each forking into thinner cracks; slabs lifted along the main
 * fissures by the pit, pebbles round it.
 */
function plan(seed: number): CrackPlan {
  const arms: Arm[] = [];
  const a0 = (hash(seed, 1, 3) - 0.5) * 1.8;
  const mains = [
    { ang: a0, len: 22 + hash(seed, 2, 5) * 6 },
    { ang: a0 + Math.PI + (hash(seed, 3, 5) - 0.5) * 0.7, len: 20 + hash(seed, 4, 5) * 7 },
    { ang: a0 + Math.PI / 2 + (hash(seed, 5, 5) - 0.5) * 1.1, len: 12 + hash(seed, 6, 5) * 7 },
  ];
  if (hash(seed, 7, 5) < 0.7) mains.push({ ang: a0 - Math.PI / 2 + (hash(seed, 8, 5) - 0.5) * 1.1, len: 10 + hash(seed, 9, 5) * 6 });
  mains.forEach((m, i) => {
    const pts = walk(0, 0, m.ang, m.len, seed * 97 + i * 13);
    arms.push({ pts, hw0: i < 2 ? 3.4 : 2.6, hw1: 0.6, from: 0 });
    // Forks off the main fissure, a half to a third of the way out.
    const forks = 1 + (hash(seed, i, 61) < 0.6 ? 1 : 0);
    for (let k = 0; k < forks; k++) {
      const at = Math.min(pts.length - 2, 1 + Math.floor((0.3 + hash(seed, i * 5 + k, 67) * 0.4) * (pts.length - 1)));
      const [px, py] = pts[at];
      const [qx, qy] = pts[at + 1];
      const side = hash(seed, i * 5 + k, 71) < 0.5 ? -1 : 1;
      const ang = Math.atan2(qy - py, qx - px) + side * (0.6 + hash(seed, i * 5 + k, 73) * 0.6);
      arms.push({ pts: walk(px, py, ang, 6 + hash(seed, i * 5 + k, 79) * 8, seed * 211 + i * 29 + k), hw0: 1.4, hw1: 0.45, from: at / (pts.length - 1) });
    }
  });
  const chunks: CrackPlan['chunks'] = [];
  for (let i = 0; i < 3; i++) {
    const arm = arms.filter((a) => a.from === 0)[i % 2];
    const at = Math.min(arm.pts.length - 2, 2 + Math.floor(hash(seed, i, 83) * 2));
    const [px, py] = arm.pts[at];
    const [qx, qy] = arm.pts[at + 1];
    const l = Math.hypot(qx - px, qy - py) || 1;
    const side = i === 1 ? 1 : -1;
    const off = 7 + hash(seed, i, 89) * 2;
    chunks.push({ x: px - ((qy - py) / l) * off * side, y: (py + ((qx - px) / l) * off * side) * SQ, w: 4 + Math.floor(hash(seed, i, 97) * 2), h: 2, s: seed * 31 + i, at: at / (arm.pts.length - 1) });
  }
  const pebbles: CrackPlan['pebbles'] = [];
  for (let i = 0; i < 9; i++) {
    const a = hash(seed, i, 103) * Math.PI * 2;
    const r = 7 + hash(seed, i, 107) * 14;
    pebbles.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * SQ, s: hash(seed, i, 109) < 0.35 ? 2 : 1, at: r / 21 });
  }
  return { arms, chunks, pebbles };
}

/** Where the fissures are open at `grow` (0..1 of their length): per pixel, how deep (0 edge .. 1 middle) and how wide its fissure is there. */
function openField(p: CrackPlan, grow: number, widen: number): { d: Float32Array; hw: Float32Array } {
  const d = new Float32Array(CW * CH).fill(-1);
  const hw = new Float32Array(CW * CH);
  const mark = (x: number, y: number, dd: number, w: number) => {
    if (x < 0 || y < 0 || x >= CW || y >= CH) return;
    const i = y * CW + x;
    if (dd > d[i]) {
      d[i] = dd;
      hw[i] = w;
    }
  };
  for (const a of p.arms) {
    const n = a.pts.length - 1;
    const reach = (grow - a.from) / Math.max(0.01, 1 - a.from);
    if (reach <= 0) continue;
    for (let s = 0; s < n; s++) {
      const t0 = s / n, t1 = (s + 1) / n;
      if (t0 >= reach) break;
      const cut = Math.min(1, (reach - t0) / (t1 - t0));
      const [x0, y0] = a.pts[s];
      const x1 = x0 + (a.pts[s + 1][0] - x0) * cut, y1 = y0 + (a.pts[s + 1][1] - y0) * cut;
      for (let y = 0; y < CH; y++)
        for (let x = 0; x < CW; x++) {
          // On the ground plane: depth un-squashed, so a fissure is as wide across as along.
          const gx = x + 0.5 - CX, gy = (y + 0.5 - CY) / SQ;
          const vx = x1 - x0, vy = y1 - y0;
          const l2 = vx * vx + vy * vy || 1;
          const u = Math.max(0, Math.min(1, ((gx - x0) * vx + (gy - y0) * vy) / l2));
          const dist = Math.hypot(gx - (x0 + vx * u), gy - (y0 + vy * u));
          const t = t0 + (t1 - t0) * u * cut;
          const w = (a.hw0 + (a.hw1 - a.hw0) * Math.pow(t, 0.8)) * widen;
          if (dist <= w) mark(x, y, 1 - dist / w, w);
        }
    }
  }
  // The pit where the foot struck: wider and deepest.
  const pr = 4.6 * widen;
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const gx = x + 0.5 - CX, gy = (y + 0.5 - CY) / SQ;
      const r = Math.hypot(gx, gy * 1.15) + (hash(x, y, 113) - 0.5) * 1.2;
      if (r <= pr) mark(x, y, 1 - r / pr, 3.2);
    }
  return { d, hw };
}

/**
 * One frame of a crack: `grow` how far its fissures have run, `lift` how high its slabs are thrown
 * (they settle to 0), `torn` how much of the soil round the pit is torn up, `shown` which slabs and
 * pebbles are out yet.
 */
function crackFrame(p: CrackPlan, grow: number, widen: number, lift: number, torn: number, shown: number): Canvas {
  const c = new Canvas(CW, CH);
  const { d, hw } = openField(p, grow, widen);
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < CW && y < CH && d[y * CW + x] >= 0;
  // Torn soil round the pit, thinning outward in a dither.
  if (torn > 0)
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < CW; x++) {
        const gx = x + 0.5 - CX, gy = (y + 0.5 - CY) / SQ;
        const r = Math.hypot(gx, gy) / (15 * torn) + (hash(x, y, 127) - 0.5) * 0.35;
        if (r < 1 && (r < 0.6 || bayer4(x, y) < (1 - r) * 2)) c.set(x, y, r < 0.35 ? C.soilDk : C.soil);
      }
  // Lips, as an engraving under light from the upper left: the upper lip throws its shadow into the
  // fissure, the lower lip (the top of the wall that faces the light) catches it. Tried the other way
  // round (lit upper lip), the fissures read as sticks lying on the ground, not cut into it.
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      if (open(x, y)) continue;
      if (open(x, y + 1)) c.set(x, y, C.lipShade);
      else if (open(x, y - 1)) c.set(x, y, C.lipLit);
    }
  // Inside: near black, the lit wall showing as a row of dark earth at the bottom of the wide parts.
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const i = y * CW + x;
      if (d[i] < 0) continue;
      const w = hw[i];
      const low = !open(x, y + 1) && w > 1.6;
      c.set(x, y, low ? (w > 2.6 ? C.wall : C.wallLo) : d[i] > 0.12 || w < 0.9 ? C.core : C.deep);
    }
  // Pebbles thrown out round it.
  for (const pb of p.pebbles) {
    if (pb.at > shown) continue;
    const x = Math.round(CX + pb.x), y = Math.round(CY + pb.y);
    if (open(x, y) || open(x, y + 1)) continue;
    c.set(x, y, C.chunkLit);
    if (pb.s === 2) {
      c.set(x + 1, y, C.chunk);
      c.set(x, y + 1, C.chunkDk);
      c.set(x + 1, y + 1, C.line);
    } else c.set(x, y + 1, C.line);
  }
  // Slabs of ground broken loose and lifted at the fissure's edges: a lit top, a dark front face,
  // the outline, and their shadow left on the ground under them.
  // Where the fissures end up open: a slab lies on the ground beside them, never over them.
  const full = openField(p, 1, 1).d;
  for (const k of p.chunks) {
    if (k.at > shown) continue;
    const x0 = Math.round(CX + k.x - k.w / 2);
    let y0 = Math.round(CY + k.y - k.h / 2);
    const away = k.y < 0 ? -1 : 1;
    const clear = (yy: number) => {
      for (let y = -1; y <= k.h + 2; y++) for (let x = -1; x <= k.w + k.h + 1; x++) if (full[(yy + y) * CW + x0 + x] >= 0) return false;
      return true;
    };
    for (let n = 0; n < 8 && !clear(y0); n++) y0 += away;
    // The plate's top is a parallelogram (tipped toward one side), its broken front edge below it.
    const skew = hash(k.s, 3, 131) < 0.5 ? -1 : 1;
    const face = 1 + (lift > 0 ? 1 : 0);
    const rows = k.h + face;
    const span = (y: number): [number, number] => {
      const sh = y < k.h ? (skew > 0 ? k.h - 1 - y : y) : skew > 0 ? 0 : k.h - 1;
      const a = sh + (y === 0 && hash(k.s, 1, 131) < 0.6 ? 1 : 0);
      const b = sh + k.w - 1 - (y === rows - 1 && hash(k.s, 2, 131) < 0.6 ? 1 : 0);
      return [a, b];
    };
    const inside = (x: number, y: number) => {
      if (y < 0 || y >= rows) return false;
      const [a, b] = span(y);
      return x >= a && x <= b;
    };
    // Its shadow on the ground, where it lay.
    for (let y = 0; y < rows; y++) {
      const [a, b] = span(y);
      for (let x = a; x <= b + 1; x++) c.set(x0 + x + 1, y0 + y + 1, C.cast);
    }
    const top = y0 - lift;
    for (let y = 0; y < rows; y++) {
      const [a, b] = span(y);
      for (let x = a; x <= b; x++) {
        const col = y >= k.h ? C.chunkDk : y === 0 && x <= a + 1 ? C.chunkHi : y === 0 || x === a ? C.chunkLit : C.chunk;
        c.set(x0 + x, top + y, col);
      }
    }
    for (let y = -1; y <= rows; y++)
      for (let x = -1; x <= k.w + k.h + 1; x++) {
        if (inside(x, y)) continue;
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) c.set(x0 + x, top + y, C.line);
      }
  }
  return c;
}

/** The lightning left in the deepest part of the fissures, two flickers of it (drawn over the crack, fading). */
function glowFrame(p: CrackPlan, flick: number): Canvas {
  const c = new Canvas(CW, CH);
  const { d, hw } = openField(p, 1, 1);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const i = y * CW + x;
      if (d[i] < 0.3 || hw[i] < 1.2) continue;
      const r = Math.hypot(x + 0.5 - CX, (y + 0.5 - CY) / SQ);
      const keep = hash(x, y, 137 + flick) < 1 - r / 24;
      if (!keep) continue;
      if (d[i] > 0.6) c.set(x, y, hash(x, y, 139 + flick) < 0.45 || r < 4 ? C.glowHi : C.glow);
      else if (d[i] > 0.45) c.set(x, y, C.glow);
      else c.set(x, y, C.glowLo);
    }
  // A few sparks jumping off the lips.
  for (let i = 0; i < 5; i++) {
    const a = hash(flick, i, 149) * Math.PI * 2;
    const r = 4 + hash(flick, i, 151) * 12;
    const x = Math.round(CX + Math.cos(a) * r), y = Math.round(CY + Math.sin(a) * r * SQ) - 1 - Math.floor(hash(flick, i, 157) * 3);
    if (c.alpha(x, y + 1) === 0 && c.alpha(x, y) === 0) {
      c.set(x, y, C.glowHi);
      c.set(x + (i % 2 ? 1 : -1), y - 1, C.glow);
    }
  }
  return c;
}

function groundCrack(): WorldSprite {
  const plans = [1, 2, 3, 4].map(plan);
  const anims: WorldSprite['anims'] = {
    // The crack as it holds, one variant per cell.
    idle: { frames: plans.map((p) => crackFrame(p, 1, 1, 0, 1, 1)), fps: 0 },
  };
  // Splitting open: the pit punched in with the first runs, the fissures tearing out with the slabs
  // thrown up, then all of it open with the slabs falling back (then 'idle').
  plans.forEach((p, v) => {
    anims[`open_${v}`] = { frames: [crackFrame(p, 0.3, 0.75, 0, 0.55, 0), crackFrame(p, 0.75, 1, 3, 0.9, 0.7), crackFrame(p, 1, 1, 1, 1, 1)], fps: 20, loop: false };
  });
  anims.glow = { frames: plans.flatMap((p) => [glowFrame(p, 0), glowFrame(p, 1)]), fps: 0 };
  return {
    name: 'ground_crack',
    label: "Ground cracked under a charged ninja's step (difficult terrain while it shows): four variants in 'idle', one per cell; 'open_<variant>' splits it open; 'glow' is the lightning left in its depths (two flickers per variant, drawn over it, fading); anchor: its middle on the ground",
    meters: [+(CW / 57).toFixed(2), +(CH / 57).toFixed(2)],
    anchor: [CX, CY],
    tags: ['vfx'],
    anims,
  };
}

/** The dust kicked up and the bits of ground thrown when a crack opens: a low puff spreading and thinning, chips arcing out and falling. */
const DW = 84, DH = 50, DX = 42, DY = 36;
function crackDust(): WorldSprite {
  const n = 7;
  const frames: Canvas[] = [];
  for (let k = 0; k < n; k++) {
    const c = new Canvas(DW, DH);
    const t = k / (n - 1);
    const blobs: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 11; i++) {
      // Round the impact, mostly up and out to both sides, a little in front.
      const a = Math.PI * 0.85 + (i / 10) * Math.PI * 1.3 + (hash(i, 1, 163) - 0.5) * 0.3;
      const R = 5 + 24 * Math.pow(t, 0.7) * (0.75 + hash(i, 2, 167) * 0.5);
      blobs.push({ x: DX + Math.cos(a) * R, y: DY + Math.sin(a) * R * 0.42 - (2 + 9 * t) * (0.6 + hash(i, 3, 173) * 0.8), r: (3.2 + 5 * t) * (0.75 + hash(i, 4, 179) * 0.5) });
    }
    const keep = 1.05 - Math.pow(t, 1.25);
    for (let y = 0; y < DH; y++)
      for (let x = 0; x < DW; x++) {
        let v = 0, lx = 0, ly = 0;
        for (const b of blobs) {
          const q = 1 - Math.hypot(x - b.x, (y - b.y) * 1.3) / b.r;
          if (q > v) {
            v = q;
            lx = (x - b.x) / b.r;
            ly = (y - b.y) / b.r;
          }
        }
        if (v <= 0 || bayer4(x, y) > keep * Math.min(1, v * 2.2)) continue;
        // Lit on the upper left of each puff, darker low on the right.
        const shade = lx + ly;
        c.set(x, y, shade < -0.45 ? C.dustHi : shade > 0.35 ? C.dustDk : C.dust);
      }
    // Chips of ground thrown out: up and out, then down to the ground, gone by the last frame.
    for (let i = 0; i < 10; i++) {
      if (k === n - 1) break;
      const vx = (hash(i, 5, 181) - 0.5) * 9;
      const vy = -(3 + hash(i, 6, 191) * 3.5);
      const f = k + 0.6;
      const x = Math.round(DX + vx * f);
      const y = Math.min(DY + 2 + Math.round(hash(i, 7, 193) * 4), Math.round(DY - 2 + vy * f + 0.9 * f * f));
      const big = hash(i, 8, 197) < 0.7;
      c.set(x, y, C.chunkLit);
      c.set(x + 1, y + 1, C.line);
      if (big) {
        c.set(x + 1, y, C.chunk);
        c.set(x, y + 1, C.chunkDk);
        c.set(x + 2, y + 1, C.line);
        c.set(x + 1, y + 2, C.line);
      }
    }
    frames.push(c);
  }
  return {
    name: 'ground_crack_dust',
    label: "The dust and chips of ground thrown up as a crack opens under a charged ninja's step ('puff', once); anchor: the crack's middle on the ground",
    meters: [+(DW / 57).toFixed(2), +(DH / 57).toFixed(2)],
    anchor: [DX, DY],
    tags: ['vfx'],
    anims: { puff: { frames, fps: 16, loop: false } },
  };
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-chidori: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
const sprites = [chidoriHand(), groundCrack(), crackDust()];
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
