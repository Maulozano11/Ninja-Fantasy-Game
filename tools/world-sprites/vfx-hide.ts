// The vanish jump into a tree or a bush (stealth), PROPOSAL art waiting for the owner's approval
// (2026-10-24: "una accion para enconderte en un arbol y saldra como un salto de desvanecerse y
// unas lineas de movimiento hacia el arbol elegido y saldran unas rayas en el arbol simbolizando
// que estas ahi"; "tambien se podra a arbustos"). Group `vfx_hide`:
//   - dash_lines: the speed lines that trail the ninja along the jump, one row per flight angle
//     (-90 to 90 degrees, facing right; the game mirrors them for a jump to the left);
//   - vanish_burst: where the ninja takes off, a puff of air and dust and a few kicked-up blades;
//   - leaf_burst: where it goes into the foliage, leaves scatter (a row per kind of foliage);
//   - hidden_streaks: the few strokes that flick on the tree or the bush while someone hides in it.
// Air and light carry no black line (the energy rule); the leaves are solid and carry it.
//
// Run with a staging folder only (it is not approved art):
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-hide.ts

import { Canvas, Color, hash, hex, mix, OUTLINE, writeGroup } from './kit';
import type { WorldSprite } from './kit';
import { fan, turned } from './vfx-turn';

if (!process.env.WORLD_OUT) {
  console.error('vfx-hide.ts is proposal art: set WORLD_OUT=<staging dir>.');
  process.exit(1);
}

const INK = hex(OUTLINE);
const WHITE = hex('#fbfaf2');
const AIR = hex('#cfe3e6');
const AIR_DIM = hex('#8fb0b8');

// --- dash_lines ---------------------------------------------------------------------------

/**
 * Speed lines pointing right: the ninja's middle is the pivot at the right end, the lines trail
 * left of it. Central lines are longer and 2 px thick; every line is white at its head and thins
 * to a broken pale-blue tail. Four frames: the lines slide and change length, so they flicker.
 */
function dashFrames(): { frames: Canvas[]; pivot: [number, number] } {
  const W = 190, H = 60, px = W - 6, py = H >> 1;
  const lines = [
    { y: -22, len: 70, x0: 26, thick: 1 },
    { y: -15, len: 120, x0: 14, thick: 1 },
    { y: -8, len: 150, x0: 8, thick: 2 },
    { y: -1, len: 175, x0: 2, thick: 2 },
    { y: 6, len: 145, x0: 10, thick: 2 },
    { y: 13, len: 110, x0: 18, thick: 1 },
    { y: 20, len: 80, x0: 30, thick: 1 },
    { y: 26, len: 45, x0: 40, thick: 1 },
  ];
  const frames: Canvas[] = [];
  for (let f = 0; f < 4; f++) {
    const c = new Canvas(W, H);
    lines.forEach((l, i) => {
      const jitter = Math.floor(hash(i, f, 7) * 14) - 4;
      const len = Math.round(l.len * (0.8 + 0.25 * hash(i, f, 11)));
      const head = px - l.x0 - jitter;
      for (let k = 0; k < len; k++) {
        const t = k / len;
        // The tail breaks up: every other pixel, then every third.
        if (t > 0.6 && k % 2) continue;
        if (t > 0.85 && k % 3) continue;
        const col: Color = t < 0.25 ? WHITE : t < 0.6 ? AIR : AIR_DIM;
        const x = head - k;
        c.set(x, py + l.y, col);
        if (l.thick === 2 && t < 0.45) c.set(x, py + l.y + 1, t < 0.2 ? AIR : AIR_DIM);
      }
    });
    frames.push(c);
  }
  return { frames, pivot: [px, py] };
}

// --- vanish_burst -------------------------------------------------------------------------

const DUST = hex('#d9cfae');
const DUST_DIM = hex('#a89c7c');
const BLADE = [hex('#2f5a2a'), hex('#5c8f3a'), hex('#9cc25a')];

/** Where the ninja takes off: a ring of dust on the ground, air rushing up, blades kicked out. */
function vanishBurst(): WorldSprite {
  const W = 128, H = 96, ax = 64, ay = 86;
  const frames: Canvas[] = [];
  const N = 8;
  for (let f = 0; f < N; f++) {
    const c = new Canvas(W, H);
    const t = f / (N - 1);
    // The ring on the ground, wider and thinner as it goes (dithered away near the end).
    const rx = 12 + 44 * Math.sqrt(t), ry = 3 + 9 * Math.sqrt(t);
    for (let a = 0; a < 360; a += 2) {
      const r = (a * Math.PI) / 180;
      const x = Math.round(ax + Math.cos(r) * rx), y = Math.round(ay + Math.sin(r) * ry);
      if (t > 0.5 && (x + y) % 2) continue;
      if (t > 0.8 && (x + y) % 3) continue;
      c.set(x, y, Math.sin(r) < 0 ? DUST_DIM : DUST);
    }
    // Small puffs of air at the feet in the first frames: they swell, then shrink away.
    if (f < 4) {
      for (let i = 0; i < 4; i++) {
        const px = ax - 15 + i * 10, py = ay - 4 - (i % 2) * 3 - f * 2;
        const r = [3, 5, 6, 4][f] - (i % 2);
        c.fillEllipse(px, py, r + 1, r * 0.75 + 1, AIR);
        c.fillEllipse(px - 0.5, py - 0.5, r, r * 0.75, WHITE);
      }
    }
    // Air rushing up where the body went: vertical streaks, rising and thinning.
    for (let i = 0; i < 7; i++) {
      const sx = ax - 18 + i * 6 + Math.round((hash(i, 3, 5) - 0.5) * 4);
      const top = ay - 20 - Math.round(t * 70) - Math.round(hash(i, 9, 5) * 16);
      const len = Math.round((1 - t) * (26 + hash(i, 1, 5) * 22));
      for (let k = 0; k < len; k++) {
        if (k > len * 0.6 && k % 2) continue;
        c.set(sx, top + k, k < len * 0.3 ? WHITE : AIR);
      }
    }
    // Blades of grass kicked out sideways, falling back.
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 ? 1 : -1;
      const vx = dir * (14 + hash(i, 2, 9) * 22), vy = -(18 + hash(i, 4, 9) * 16);
      const x = Math.round(ax + vx * t * 1.4), y = Math.round(ay - 6 + vy * t * 1.4 + 40 * t * t);
      if (t > 0.9) continue;
      const col = BLADE[i % 3];
      c.set(x - 1, y, INK);
      c.set(x, y - 1, INK);
      c.set(x, y, col);
      c.set(x + dir, y, col);
      c.set(x + 2 * dir, y + 1, INK);
      c.set(x, y + 1, INK);
      c.set(x + dir, y + 1, INK);
    }
    frames.push(c);
  }
  return { name: 'vanish_burst', label: 'Vanish jump take-off', meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)], anchor: [ax, ay], tags: ['vfx'], anims: { burst: { frames, fps: 20, loop: false } } };
}

// --- leaf_burst ---------------------------------------------------------------------------

/**
 * Each kind of foliage's leaves, dark to light: the light end of its world sprite's ramp (and one
 * step past it), so the flying leaves read against the crown they come out of.
 */
const LEAVES: Record<string, string[]> = {
  oak: ['#4e6911', '#91a53a', '#e0d880', '#f6f0c0'],
  maple: ['#a8321f', '#c95424', '#f2b45a', '#f8d898'],
  pine: ['#295b42', '#4d854b', '#7fae63', '#b4d690'],
  bush: ['#326747', '#4d854b', '#60954f', '#a6d084'],
};

/** One leaf, about 5 x 3 px, in its outline; `turn` picks one of four shapes as it spins. */
function leaf(c: Canvas, x: number, y: number, pal: Color[], turn: number): void {
  const shapes = [
    ['.LLL.', 'LLLMD', '.MDD.'],
    ['.L.', 'LLM', 'LMD', '.D.'],
    ['LLMMD'],
    ['.LL', 'LMD', 'DD.'],
  ];
  const s = shapes[turn % 4];
  const col = (ch: string): Color | null => (ch === 'L' ? pal[2] : ch === 'M' ? pal[1] : ch === 'D' ? pal[0] : null);
  // The outline first, one pixel round the shape (no corners), then the leaf.
  for (let j = 0; j < s.length; j++)
    for (let i = 0; i < s[j].length; i++) {
      if (!col(s[j][i])) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ch = s[j + dy]?.[i + dx];
        if (!ch || !col(ch)) c.set(x + i + dx, y + j + dy, INK);
      }
    }
  for (let j = 0; j < s.length; j++)
    for (let i = 0; i < s[j].length; i++) {
      const k = col(s[j][i]);
      if (k) c.set(x + i, y + j, k);
    }
}

/** Where the ninja goes into the foliage: leaves fly out and drift down, a short swish of air. */
function leafBurst(): WorldSprite {
  const W = 140, H = 130, ax = 70, ay = 56;
  const N = 10;
  const anims: WorldSprite['anims'] = {};
  for (const [kind, hexes] of Object.entries(LEAVES)) {
    const pal = hexes.map((h) => hex(h));
    const count = kind === 'bush' ? 10 : 18;
    const frames: Canvas[] = [];
    for (let f = 0; f < N; f++) {
      const c = new Canvas(W, H);
      const t = f / (N - 1);
      // The swish: short radial strokes that spring out in the first frames.
      if (f < 4) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + 0.3;
          const r0 = 10 + f * 9, r1 = r0 + 8 - f * 2;
          for (let r = r0; r < r1; r++) c.set(Math.round(ax + Math.cos(a) * r), Math.round(ay + Math.sin(a) * r * 0.8), r < r0 + 3 ? WHITE : AIR);
        }
      }
      for (let i = 0; i < count; i++) {
        // Out in every direction but mostly up and sideways, then they drift down, swaying.
        const seed = kind.length * 13;
        const a = (i / count) * Math.PI * 2 + (hash(i, 1, seed) - 0.5) * 0.9;
        const speed = kind === 'bush' ? 20 + hash(i, 2, seed) * 26 : 30 + hash(i, 2, seed) * 40;
        const r0 = 4 + hash(i, 3, seed) * 8;
        const x = ax + Math.cos(a) * (r0 + speed * Math.sqrt(t) * 1.2) + Math.sin(t * 7 + i * 1.7) * 4 * t;
        const y = ay + Math.sin(a) * (r0 + speed * Math.sqrt(t)) * 0.7 - 10 * Math.sqrt(t) + 58 * t * t;
        // Leaves go one by one near the end.
        if (t > 0.55 && hash(i, 5, seed) < (t - 0.55) * 2.3) continue;
        leaf(c, Math.round(x) - 2, Math.round(y) - 1, i % 3 === 0 ? [pal[1], pal[2], pal[3]] : pal, i + Math.floor(f / 2));
      }
      frames.push(c);
    }
    anims[kind] = { frames, fps: 18, loop: false };
  }
  return { name: 'leaf_burst', label: 'Leaves burst out of the foliage', meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)], anchor: [ax, ay], tags: ['vfx'], anims };
}

// --- hidden_streaks -----------------------------------------------------------------------

const STREAK = hex('#f6f2dc');
const STREAK_MID = mix(STREAK, INK, 0.35);

/**
 * The strokes that say "someone is in there": short slants that draw in, hold and draw out, one
 * after another, in a loop. They go the way the jump's lines went (up and to the right), pale with
 * a dark line so they read on bright and dark leaves alike. Few and small on purpose: a hint.
 */
function streakFrames(strokes: { x: number; y: number; len: number; start: number }[], W: number, H: number): Canvas[] {
  const N = 18;
  const frames: Canvas[] = [];
  for (let f = 0; f < N; f++) {
    const c = new Canvas(W, H);
    const lit: [number, number][] = [];
    for (const s of strokes) {
      const k = (f - s.start + N) % N;
      // 3 frames drawing in, 5 held, 3 drawing out (from the tail), then gone.
      let from = 0, to = 0;
      if (k < 3) to = Math.round((s.len * (k + 1)) / 3);
      else if (k < 8) to = s.len;
      else if (k < 11) {
        from = Math.round((s.len * (k - 7)) / 3);
        to = s.len;
      }
      for (let i = from; i < to; i++) {
        // About 2 px across: a slant of 2 up for 1 across... drawn as a 2 px wide line at ~60 degrees.
        const x = s.x + Math.round(i * 0.5), y = s.y - i;
        lit.push([x, y], [x + 1, y]);
      }
    }
    const on = new Set(lit.map(([x, y]) => y * W + x));
    for (const [x, y] of lit)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!on.has((y + dy) * W + x + dx)) c.set(x + dx, y + dy, INK);
    for (const [x, y] of lit) c.set(x, y, on.has(y * W + x - 1) ? STREAK_MID : STREAK);
    frames.push(c);
  }
  return frames;
}

function hiddenStreaks(): WorldSprite {
  const W = 84, H = 64;
  // Tree: three strokes round the middle of the crown. Bush: two smaller ones, lower.
  const tree = streakFrames(
    [
      { x: 18, y: 50, len: 20, start: 0 },
      { x: 36, y: 44, len: 26, start: 3 },
      { x: 56, y: 54, len: 18, start: 6 },
    ],
    W,
    H,
  );
  const bush = streakFrames(
    [
      { x: 30, y: 54, len: 14, start: 0 },
      { x: 46, y: 56, len: 17, start: 4 },
    ],
    W,
    H,
  );
  return { name: 'hidden_streaks', label: 'Someone hides in here', meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)], anchor: [W >> 1, H >> 1], tags: ['vfx'], anims: { tree: { frames: tree, fps: 10 }, bush: { frames: bush, fps: 10 } } };
}

// --- write --------------------------------------------------------------------------------

const dash = dashFrames();
writeGroup('vfx_hide', [turned('dash_lines', 'Vanish jump speed lines', dash.frames, dash.pivot, 0, fan(15), 20), vanishBurst(), leafBurst(), hiddenStreaks()]);
console.log(`vfx_hide written to ${process.env.WORLD_OUT}/vfx_hide`);
