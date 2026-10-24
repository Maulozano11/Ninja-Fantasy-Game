// The thrown senbon (the owner, 2026-10-23: "mete los senbons como nueva arma arrojadiza ... los
// senbons pueden inbuirse en pocion curativa y ser lanzado hacia aliados para curar"): a thin steel
// needle in flight, in the game's style (his 1 px black line round what is solid, light from the
// upper left, 1 m = 57 px: a 20 cm needle drawn 16 px long so it reads beside a 100 px ninja).
//
//   vfx_senbon/needle  steel   the plain needle, at 16 angles (frame k points k x 22.5 degrees
//                              clockwise from the right, the screen's own angles)
//                      poison  the needle coated with weapon poison: the front half green, a drop
//                              hanging under it and two falling behind
//                      heal    the needle dipped in a healing potion: pale and lit, in a soft
//                              green-white glow (energy: no line round the glow) with sparkles
//                              trailing behind it
//                      platinum  Seal Needles' platinum senbon (2026-10-24, platinum blocks chakra in
//                              the owner's lore): a paler, warmer metal than steel, with a faint
//                              cold shimmer at the point. A placeholder until he paints it.
//   Anchor: the needle's middle, the frame's centre.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-senbon.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: the branch items/senbon
// copies the staged group into src/assets/world/vfx_senbon/ to show it in battle; it is new art,
// waiting for the owner's approval. Same input, same bytes (no randomness).

import { Canvas, OUTLINE, hex, writeGroup } from './kit';
import type { Color, WorldSprite } from './kit';

const S = 48;
const C = S / 2;
/** Half the needle's length (px). */
const HALF = 8;
export const ANGLES = 16;

/** Steel, tail to tip: dark at the tail, the light along it, a glint at the point. */
const STEEL = ['#5b6472', '#8a94a3', '#b9c2cf', '#e4e9f0', '#ffffff'].map((h) => hex(h));
/** The poison's greens (sprite/coat.ts COAT_RAMP). */
const VENOM = ['#173b12', '#2f6b1f', '#4f9a2a', '#7cc93a', '#b5ef6a', '#e6ffb0'].map((h) => hex(h));
/** The heals' green (the game's heals are always green, the owner 2026-10-21) to white. */
const HEAL = ['#2f9e5a', '#5fd38a', '#a6f2bf', '#e4ffe9', '#ffffff'].map((h) => hex(h));
/** Platinum, tail to tip: warm greys up to a near-white, paler than steel. */
const PLATINUM = ['#8f887c', '#b8b1a4', '#d9d3c7', '#efebe2', '#ffffff'].map((h) => hex(h));
const LINE = hex(OUTLINE);

type Kind = 'steel' | 'poison' | 'heal' | 'platinum';

/** The pixels of the needle's core at `deg`: each with how far along it is (0 tail .. 1 tip). */
function core(deg: number): { x: number; y: number; t: number }[] {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const seen = new Map<string, { x: number; y: number; t: number }>();
  let last: { x: number; y: number } | undefined;
  for (let s = -HALF; s <= HALF; s += 0.25) {
    const x = Math.floor(C + dx * s), y = Math.floor(C + dy * s);
    const t = (s + HALF) / (2 * HALF);
    // A diagonal step gets the corner pixel too (the upper one: the lit side), so the core is one
    // joined stroke and the line round it doesn't cut it into dots.
    if (last && last.x !== x && last.y !== y) {
      const up = y < last.y ? { x: last.x, y } : { x, y: last.y };
      if (!seen.has(`${up.x},${up.y}`)) seen.set(`${up.x},${up.y}`, { ...up, t });
    }
    if (!seen.has(`${x},${y}`)) seen.set(`${x},${y}`, { x, y, t });
    last = { x, y };
  }
  return [...seen.values()];
}

function needle(deg: number, kind: Kind): Canvas {
  const c = new Canvas(S, S);
  const px = core(deg);
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  if (kind === 'heal') {
    // The glow first, under everything: brightest along the needle, gone 6 px out.
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = Math.max(-HALF, Math.min(HALF, (x + 0.5 - C) * dx + (y + 0.5 - C) * dy));
        const d = Math.hypot(x + 0.5 - (C + dx * u), y + 0.5 - (C + dy * u));
        if (d > 6) continue;
        const k = (1 - d / 6) ** 1.3;
        const col = d < 2 ? HEAL[3] : d < 3.5 ? HEAL[2] : HEAL[1];
        c.plot(x, y, [col[0], col[1], col[2], Math.round(235 * k)]);
      }
    // Sparkles trailing behind the tail: a small cross, then smaller, fading.
    [6, 11, 16].forEach((back, i) => {
      const sx = Math.floor(C - dx * (HALF + back) + (i % 2 ? dy : -dy) * 1.5);
      const sy = Math.floor(C - dy * (HALF + back) + (i % 2 ? -dx : dx) * 1.5);
      const al = 230 - i * 60;
      const w = i === 0 ? HEAL[4] : HEAL[3];
      c.plot(sx, sy, [w[0], w[1], w[2], al]);
      if (i < 2) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(sx + ox, sy + oy, [HEAL[2][0], HEAL[2][1], HEAL[2][2], al - 70]);
    });
  }
  // The line round the needle (solid): every empty 4-neighbour of the core.
  const on = new Set(px.map((p) => `${p.x},${p.y}`));
  for (const p of px)
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${p.x + ox},${p.y + oy}`;
      if (!on.has(k)) c.set(p.x + ox, p.y + oy, LINE);
    }
  // The core: lit toward the tip (and the light from the upper left brightens a needle pointing up-left).
  const lit = -dx * 0.55 - dy * 0.7 > 0 ? 1 : 0;
  for (const p of px) {
    let col: Color;
    if (kind === 'heal') col = p.t > 0.85 ? HEAL[4] : HEAL[Math.min(4, 2 + Math.round(p.t * 2))];
    else if (kind === 'poison' && p.t > 0.4) col = p.t > 0.9 ? VENOM[5] : VENOM[3 + (p.t > 0.65 ? 1 : 0)];
    else if (kind === 'platinum') col = PLATINUM[Math.min(4, Math.round(p.t * 3) + lit)];
    else col = STEEL[Math.min(4, Math.round(p.t * 3) + lit)];
    c.set(p.x, p.y, col);
  }
  if (kind === 'platinum') {
    // A faint cold shimmer just past the point.
    const tip = px.reduce((m, p) => (p.t > m.t ? p : m), px[0]);
    for (const [ox, oy, al] of [[1, 0, 120], [-1, 0, 120], [0, 1, 120], [0, -1, 120], [2, 0, 60], [0, -2, 60]] as const) {
      const x = Math.floor(tip.x + dx * 2) + ox, y = Math.floor(tip.y + dy * 2) + oy;
      if (c.alpha(x, y) === 0) c.plot(x, y, [210, 230, 255, al]);
    }
  }
  if (kind === 'poison') {
    // A drop hanging under the coated half, and two falling behind it (the screen's down, at any angle).
    const hang = px.filter((p) => p.t > 0.5 && p.t < 0.7).sort((m, n) => n.y - m.y)[0];
    if (hang) drop(c, hang.x, hang.y + 2, 2);
    drop(c, Math.floor(C - dx * (HALF + 3)), Math.floor(C - dy * (HALF + 3)) + 3, 2);
    drop(c, Math.floor(C - dx * (HALF + 8)), Math.floor(C - dy * (HALF + 8)) + 5, 1);
  }
  return c;
}

/** A drop of poison, `h` px tall, its top at (x, y), with the line round it where nothing is drawn. */
function drop(c: Canvas, x: number, y: number, h: number): void {
  for (let yy = y - 1; yy <= y + h; yy++)
    for (let xx = x - 1; xx <= x + 1; xx++) {
      if (xx === x && yy >= y && yy < y + h) continue;
      if ((yy === y - 1 || yy === y + h) && xx !== x) continue;
      if (c.alpha(xx, yy) === 0) c.set(xx, yy, LINE);
    }
  for (let yy = y; yy < y + h; yy++) c.set(x, yy, yy === y ? VENOM[5] : VENOM[3]);
}

export function senbonSprites(): WorldSprite[] {
  const row = (kind: Kind) => ({ fps: 0, frames: Array.from({ length: ANGLES }, (_, k) => needle(k * (360 / ANGLES), kind)) });
  return [
    {
      name: 'needle',
      label: 'A thrown senbon at 16 angles (frame k: k x 22.5 degrees clockwise from the right): plain steel, coated with poison, dipped in a healing potion, platinum (Seal Needles)',
      meters: [+(S / 57).toFixed(2), +(S / 57).toFixed(2)],
      anchor: [C, C],
      tags: ['vfx'],
      anims: { steel: row('steel'), poison: row('poison'), heal: row('heal'), platinum: row('platinum') },
    },
  ];
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-senbon: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
writeGroup('vfx_senbon', senbonSprites(), root);
console.log(`vfx-senbon: wrote vfx_senbon under ${root}`);
