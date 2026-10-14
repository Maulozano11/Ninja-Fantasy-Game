// VFX sprites for ranged jutsu in the party battles, second set: earth, genjutsu, chakra, poison.
// (Fire, water, wind and lightning live in vfx-a.ts.)
//
//   npx tsx tools/world-sprites/vfx-b.ts [previewDir]
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-b.ts <previewDir>   (staging)
//   VFX_ONLY=earth,chakra   build only some elements
//   VFX_LOOK=all|bolt,hit   also write zoomed review strips to <previewDir>/vfx-b-look/
//
// Each element is a group vfx_<element> with the same roles: bolt, beast, stream (tileable
// 64 px segment), stream_head, breath (96 x 64 cone from the left middle), sphere, slash,
// multi, hit (one-shot), blast (one-shot area, anchored at the ground center), wall (rise +
// idle) and aura (loop around a standing character). Projectiles face right and keep their
// core still; the game rotates them toward the target. Every element draws its own shapes
// (see the per-element files vfx-b-<element>.ts); the shared painting helpers are in
// vfx-b-lib.ts. Look of the owner's reference: bold, saturated 16-bit FX with a 1 px outline in
// the darkest color of the effect, hard-edged bands up to a near-white core, detached
// particles and speed lines.

import { join } from 'node:path';
import { CHARACTER_FEET, Canvas, Color, WorldSprite, characterRef, hex, previewDir, writeGroup } from './kit';
import { text, textWidth } from './vfx-b-lib';
import { borderTouches } from './vfx-b-wall3d';
import { writeFileSync } from 'node:fs';
import { E, buildEarth } from './vfx-b-earth';
import { G, buildGenjutsu } from './vfx-b-genjutsu';
import { C, buildChakra } from './vfx-b-chakra';
import { P, buildPoison } from './vfx-b-poison';

const OUT = previewDir();
const ONLY = (process.env.VFX_ONLY ?? '').split(',').filter(Boolean);
const LOOK = (process.env.VFX_LOOK ?? '').split(',').filter(Boolean);

interface Element {
  el: string;
  title: string;
  build: () => WorldSprite[];
  accent: Color;
}
const ELEMENTS: Element[] = [
  { el: 'earth', title: 'EARTH', build: buildEarth, accent: E[7] },
  { el: 'genjutsu', title: 'GENJUTSU', build: buildGenjutsu, accent: G[7] },
  { el: 'chakra', title: 'CHAKRA', build: buildChakra, accent: C[6] },
  { el: 'poison', title: 'POISON', build: buildPoison, accent: P[6] },
];

const BG = hex('#14121a'), PANEL = hex('#211e2a'), PANEL2 = hex('#2a2634'), INK = hex('#d9d4e6'), DIM = hex('#8a8499');

// --- review sheets --------------------------------------------------------------------------

interface Cell {
  label: string;
  sub?: string;
  c: Canvas;
}

/** Lays cells out left to right in rows no wider than maxW, each with a label above. */
function flow(cells: Cell[], maxW: number, title: string, accent: Color): Canvas {
  const pad = 10, lab = 16;
  const rows: Cell[][] = [[]];
  let rw = pad;
  for (const cell of cells) {
    const w = Math.max(cell.c.w, textWidth(cell.label), textWidth(cell.sub ?? '')) + pad;
    if (rw + w > maxW && rows[rows.length - 1].length) {
      rows.push([]);
      rw = pad;
    }
    rows[rows.length - 1].push(cell);
    rw += w;
  }
  const W = Math.max(maxW, ...rows.map((r) => r.reduce((s, c) => s + Math.max(c.c.w, textWidth(c.label), textWidth(c.sub ?? '')) + pad, pad)));
  const H = 22 + rows.reduce((s, r) => s + Math.max(...r.map((c) => c.c.h)) + lab + pad, pad);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  text(out, title, pad, 8, accent);
  let y = 22 + pad;
  for (const r of rows) {
    const rh = Math.max(...r.map((c) => c.c.h));
    let x = pad;
    for (const cell of r) {
      text(out, cell.label, x, y, INK);
      if (cell.sub) text(out, cell.sub, x + textWidth(cell.label) + 4, y, DIM);
      out.draw(cell.c, x, y + lab);
      x += Math.max(cell.c.w, textWidth(cell.label) + (cell.sub ? textWidth(cell.sub) + 4 : 0)) + pad;
    }
    y += rh + lab + pad;
  }
  return out;
}

/** A frame on a panel showing its bounds. */
function panel(f: Canvas, bg = PANEL): Canvas {
  const c = new Canvas(f.w, f.h);
  c.fillRect(0, 0, f.w, f.h, bg);
  c.draw(f, 0, 0);
  return c;
}

function frameOf(s: WorldSprite, anim: string, i: number): Canvas {
  const a = s.anims[anim] ?? Object.values(s.anims)[0];
  return a.frames[Math.min(i, a.frames.length - 1)];
}

/** The character standing with feet at (fx, fy) on canvas c. */
function drawChar(c: Canvas, fx: number, fy: number): void {
  c.draw(characterRef(), fx - CHARACTER_FEET[0], fy - CHARACTER_FEET[1]);
}

function elementSheet(e: Element, sprites: WorldSprite[]): Canvas {
  const by = (n: string) => sprites.find((s) => s.name === n)!;
  const cells: Cell[] = [];
  const hero: Record<string, [string, number]> = { hit: ['hit', 2], blast: ['blast', 3], wall: ['idle', 0], aura: ['idle', 0] };
  for (const n of ['bolt', 'sphere', 'slash', 'multi', 'beast', 'breath', 'stream_head']) {
    const s = by(n);
    cells.push({ label: n, sub: `${frameOf(s, 'fly', 0).w}x${frameOf(s, 'fly', 0).h}`, c: panel(frameOf(s, 'fly', 1)) });
  }
  // Stream tiled three times with the head attached at the end of the line.
  {
    const s = by('stream'), h = by('stream_head');
    const f = frameOf(s, 'fly', 0), hf = frameOf(h, 'fly', 0);
    const c = new Canvas(f.w * 3 + hf.w / 2 + 4, f.h);
    c.fillRect(0, 0, c.w, c.h, PANEL);
    for (let i = 0; i < 3; i++) c.fillRect(i * f.w, 0, 1, 3, PANEL2);
    for (let i = 0; i < 3; i++) c.draw(f, i * f.w, 0);
    c.draw(hf, f.w * 3 - hf.w / 2 + 4, 0);
    cells.push({ label: 'stream x3 + head', sub: 'tile 64x64', c });
  }
  for (const n of ['hit', 'blast']) {
    const s = by(n);
    const [a, i] = hero[n];
    const f = frameOf(s, a, i);
    cells.push({ label: n, sub: `${f.w}x${f.h}`, c: panel(f) });
  }
  // Scale check: aura in front of and behind the character.
  {
    const s = by('aura');
    const f = frameOf(s, 'idle', 0);
    const c = new Canvas(f.w * 2 + 8, f.h);
    c.fillRect(0, 0, f.w, f.h, PANEL);
    c.fillRect(f.w + 8, 0, f.w, f.h, PANEL);
    c.draw(f, 0, 0);
    drawChar(c, s.anchor[0], s.anchor[1]);
    drawChar(c, f.w + 8 + s.anchor[0], s.anchor[1]);
    c.draw(f, f.w + 8, 0);
    cells.push({ label: 'aura behind / in front', sub: `${f.w}x${f.h}`, c });
  }
  {
    const s = by('wall');
    const f = frameOf(s, 'idle', 0);
    const c = new Canvas(f.w + 44, f.h);
    c.fillRect(0, 0, f.w, f.h, PANEL);
    c.draw(f, 0, 0);
    drawChar(c, f.w + 22, s.anchor[1]);
    cells.push({ label: 'wall + character', sub: `${f.w}x${f.h}`, c });
  }
  return flow(cells, 900, `${e.title}  -  vfx_${e.el}  (2x)`, e.accent);
}

function animSheet(all: { e: Element; sprites: WorldSprite[] }[]): Canvas {
  const sections = all.map(({ e, sprites }) => {
    const cells: Cell[] = [];
    for (const s of sprites)
      for (const [k, a] of Object.entries(s.anims)) {
        const f0 = a.frames[0];
        const c = new Canvas(a.frames.length * (f0.w + 3) - 3, f0.h);
        a.frames.forEach((fr, i) => {
          c.fillRect(i * (f0.w + 3), 0, f0.w, f0.h, PANEL);
          c.draw(fr, i * (f0.w + 3), 0);
        });
        cells.push({ label: `${s.name} ${k}`, sub: `${a.frames.length}f ${a.fps}fps ${a.loop === false ? 'once' : 'loop'}`, c });
      }
    return flow(cells, 1400, `${e.title}  -  vfx_${e.el}  animation strips`, e.accent);
  });
  const W = Math.max(...sections.map((s) => s.w)), H = sections.reduce((t, s) => t + s.h, 0);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  let y = 0;
  for (const s of sections) {
    out.draw(s, 0, y);
    out.fillRect(0, y, W, 1, PANEL2);
    y += s.h;
  }
  return out;
}

/** Zoomed strips for reviewing one sprite. */
function look(e: Element, s: WorldSprite): void {
  for (const [k, a] of Object.entries(s.anims)) {
    const f0 = a.frames[0];
    const z = f0.w > 150 ? 2 : f0.w > 70 ? 3 : 4;
    const perRow = f0.w > 150 ? 2 : a.frames.length;
    const rows = Math.ceil(a.frames.length / perRow);
    const c = new Canvas(perRow * (f0.w + 2) + 2, rows * (f0.h + 2) + 2);
    c.fillRect(0, 0, c.w, c.h, hex('#0d0c12'));
    a.frames.forEach((fr, i) => {
      const x = 2 + (i % perRow) * (f0.w + 2), y = 2 + Math.floor(i / perRow) * (f0.h + 2);
      c.fillRect(x, y, f0.w, f0.h, hex('#3a3646'));
      c.draw(fr, x, y);
    });
    c.scaled(z).save(join(OUT, 'vfx-b-look', `${e.el}-${s.name}-${k}.png`));
  }
}

/** The beast's fly loop at 4x, frames in two rows of three, for the owner's review. */
function beastStrip(e: Element, s: WorldSprite): void {
  const a = s.anims.fly;
  const f0 = a.frames[0];
  const cols = 3, rows = Math.ceil(a.frames.length / cols), gap = 3;
  const c = new Canvas(cols * (f0.w + gap) + gap, rows * (f0.h + gap) + gap + 10);
  c.fillRect(0, 0, c.w, c.h, BG);
  text(c, `${e.title} BEAST  ${f0.w}x${f0.h}  ${a.frames.length}f ${a.fps}fps loop  (4x)`, gap, 3, e.accent);
  a.frames.forEach((fr, i) => {
    const x = gap + (i % cols) * (f0.w + gap), y = 10 + gap + Math.floor(i / cols) * (f0.h + gap);
    c.fillRect(x, y, f0.w, f0.h, PANEL);
    c.draw(fr, x, y);
  });
  c.scaled(4).save(join(OUT, `vfx-b-beast-${e.el}-4x.png`));
}

/** Frames whose opaque pixels touch the frame border (stream tiles are exempt: they tile). */
function borderReport(e: Element, sprites: WorldSprite[]): string[] {
  const out: string[] = [];
  for (const s of sprites) {
    if (s.name === 'stream') continue;
    for (const [k, a] of Object.entries(s.anims)) {
      // The stream head joins the last tile at its left edge, so that side is the joint.
      const bad = borderTouches(a.frames, s.name === 'stream_head' ? 'L' : '');
      if (bad.length) out.push(`vfx_${e.el}/${s.name}/${k} frames ${bad.join(',')}`);
    }
  }
  return out;
}

const built: { e: Element; sprites: WorldSprite[] }[] = [];
const border: string[] = [];
for (const e of ELEMENTS) {
  if (ONLY.length && !ONLY.includes(e.el)) continue;
  const sprites = e.build();
  writeGroup(`vfx_${e.el}`, sprites);
  elementSheet(e, sprites).scaled(2).save(join(OUT, `vfx-${e.el}.png`));
  beastStrip(e, sprites.find((s) => s.name === 'beast')!);
  border.push(...borderReport(e, sprites));
  for (const s of sprites) {
    if (LOOK.includes('all') || LOOK.includes(s.name)) look(e, s);
    const f0 = Object.values(s.anims)[0].frames[0];
    const bb = f0.bounds();
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '' : 'L'}`).join(' ');
    console.log(`${e.el.padEnd(9)} ${s.name.padEnd(12)} frame ${f0.w}x${f0.h} anchor ${s.anchor} opaque ${bb ? `${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}` : 'none'} ${anims}`);
  }
  built.push({ e, sprites });
}
if (built.length) animSheet(built).scaled(2).save(join(OUT, 'vfx-vfx-b-anims.png'));
{
  const checked = built.map(({ e, sprites }) => `${e.el}: ${sprites.filter((s) => s.name !== 'stream').reduce((n, s) => n + Object.values(s.anims).reduce((m, a) => m + a.frames.length, 0), 0)} frames`).join(', ');
  const report = [`Border check (opaque pixels on the frame border; stream tiles exempt): ${checked}`, ...(border.length ? border : ['no frame touches its border'])].join('\n') + '\n';
  console.log(report);
  if (!ONLY.length) writeFileSync(join(OUT, 'vfx-b-border-check.txt'), report);
}
