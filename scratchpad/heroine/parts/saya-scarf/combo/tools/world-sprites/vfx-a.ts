// Jutsu VFX sprites, set A: fire, water, wind and lightning. Each element has its own forms,
// materials and particles for every role (nothing is a recolor of another element):
//
//   bolt, beast, stream (+ stream_head), breath, sphere, slash, multi   'fly' loops, facing right
//   hit (6 frames) and blast (8 frames)                                one-shot
//   wall ('rise' one-shot + 'idle' loop) and aura ('idle' loop)
//
//   npx tsx tools/world-sprites/vfx-a.ts [previewDir]
//   WORLD_OUT=<dir> ...           writes the groups under <dir>/vfx_<element>/ (staging)
//   VFX_ONLY=fire,water ...       builds only some elements
//   VFX_WORK=1 ...                also writes zoomed frame strips to <previewDir>/vfx-a-work/
//
// The effects are painted as heat fields quantized into hard palette bands (vfx-a-lib.ts); the
// element files hold the designs: vfx-a-fire.ts, vfx-a-water.ts, vfx-a-wind.ts, vfx-a-lightning.ts.

import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTER_FEET, Canvas, Color, WorldSprite, characterRef, hex, previewDir, writeGroup } from './kit';
import { animInfo, clearEdgeBits, text, textWidth } from './vfx-a-lib';
import { fireSprites } from './vfx-a-fire';
import { waterSprites } from './vfx-a-water';
import { windSprites } from './vfx-a-wind';
import { lightningSprites } from './vfx-a-lightning';

const ELEMENTS: Record<string, { build: () => WorldSprite[]; accent: string }> = {
  fire: { build: fireSprites, accent: '#fba92a' },
  water: { build: waterSprites, accent: '#62d6f0' },
  wind: { build: windSprites, accent: '#92d8b4' },
  lightning: { build: lightningSprites, accent: '#93d6ff' },
};

/**
 * Writes are atomic: every file is written whole under a temp name and then renamed into place,
 * so a job reading the staging folders or review images never sees a half-written file.
 */
function saveWhole(c: Canvas, path: string): void {
  const tmp = `${path}.part`;
  c.save(tmp);
  renameSync(tmp, path);
}
/** writeGroup into a temp folder next to the previews, then move each file into the real group. */
function writeGroupWhole(group: string, sprites: WorldSprite[], root: string, tmpRoot: string): void {
  const tmpDir = join(tmpRoot, group);
  rmSync(tmpDir, { recursive: true, force: true });
  writeGroup(group, sprites, tmpRoot);
  const dest = join(root, group);
  mkdirSync(dest, { recursive: true });
  // PNGs first, the manifest last, so the manifest never names a sheet that isn't there yet.
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json'));
  for (const f of files) renameSync(join(tmpDir, f), join(dest, f));
  rmSync(tmpDir, { recursive: true, force: true });
}

const BG = hex('#15151d');
const PANEL = hex('#20212b');
const PANEL_EDGE = hex('#2c2e3a');
const INK = hex('#c9cbd6');
const INK_DIM = hex('#7d8092');

/** Which frame shows a sprite best on the overview sheet. */
function keyFrame(s: WorldSprite): { key: string; i: number } {
  if (s.anims.idle && s.anims.rise) return { key: 'idle', i: 0 };
  if (s.anims.burn) return { key: 'burn', i: 0 };
  if (s.name === 'hit') return { key: 'hit', i: 2 };
  if (s.name === 'blast') return { key: 'blast', i: 3 };
  const key = Object.keys(s.anims)[0];
  return { key, i: 0 };
}

function panel(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x - 1, y - 1, w + 2, h + 2, PANEL_EDGE);
  c.fillRect(x, y, w, h, PANEL);
}

interface Card {
  w: number;
  h: number;
  draw: (c: Canvas, x: number, y: number) => void;
}

/** Lays cards out left to right in rows no wider than maxW. */
function flow(cards: Card[], maxW: number, gap = 10): { w: number; h: number; place: { card: Card; x: number; y: number }[] } {
  const place: { card: Card; x: number; y: number }[] = [];
  let x = 0, y = 0, rowH = 0, W = 0;
  for (const card of cards) {
    if (x > 0 && x + card.w > maxW) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    place.push({ card, x, y });
    x += card.w + gap;
    W = Math.max(W, x - gap);
    rowH = Math.max(rowH, card.h);
  }
  return { w: W, h: y + rowH, place };
}

/** The overview of one element: every role's best frame, labeled, with scale references. */
function elementSheet(el: string, sprites: WorldSprite[], path: string): void {
  const accent = hex(ELEMENTS[el].accent);
  const ref = characterRef();
  const refBounds = ref.bounds()!;
  const cards: Card[] = [];
  const by = Object.fromEntries(sprites.map((s) => [s.name, s]));
  for (const s of sprites) {
    if (s.name === 'stream_head' || s.name === 'aura_back') continue;
    const { key, i } = keyFrame(s);
    const f = s.anims[key].frames[i];
    const label = s.name === 'stream' ? 'STREAM x3 + STREAM_HEAD' : s.name.toUpperCase();
    const info = `${f.w}x${f.h}  ` + Object.keys(s.anims).map((k) => animInfo(s, k)).join(', ');
    if (s.name === 'stream') {
      const head = by.stream_head?.anims.fly.frames[0];
      const w = f.w * 3 + (head ? head.w : 0);
      cards.push({
        w: Math.max(w, textWidth(info)), h: f.h + 16,
        draw: (c, x, y) => {
          text(c, x, y, label, accent);
          text(c, x, y + 7, info, INK_DIM);
          panel(c, x, y + 14, w, f.h);
          for (let k = 0; k < 3; k++) c.draw(f, x + k * f.w, y + 14);
          if (head) c.draw(head, x + 3 * f.w, y + 14);
        },
      });
      continue;
    }
    const withRef = ['aura', 'blast', ...WALLS].includes(s.name);
    const refW = withRef && s.name !== 'aura' ? refBounds[2] - refBounds[0] + 6 : 0;
    const w = f.w + refW;
    cards.push({
      w: Math.max(w, textWidth(label), textWidth(info)), h: f.h + 16,
      draw: (c, x, y) => {
        text(c, x, y, label, accent);
        text(c, x, y + 7, info, INK_DIM);
        panel(c, x, y + 14, w, f.h);
        if (s.name === 'aura') {
          // The character standing in the aura, feet on the anchor (its back layer behind him).
          const back = by.aura_back;
          if (back) c.draw(back.anims.idle.frames[0], x + s.anchor[0] - back.anchor[0], y + 14 + s.anchor[1] - back.anchor[1]);
          c.draw(ref, x + s.anchor[0] - CHARACTER_FEET[0], y + 14 + s.anchor[1] - CHARACTER_FEET[1]);
        }
        if (s.anims.burn) {
          // The caster standing at the cone's apex.
          c.draw(ref, x + s.anchor[0] - 6 - CHARACTER_FEET[0], y + 14 + s.anchor[1] - CHARACTER_FEET[1]);
        }
        if (refW) {
          // A character on the same ground line, for scale.
          const gy = y + 14 + s.anchor[1];
          c.draw(ref, x + f.w + 3 - refBounds[0], gy - CHARACTER_FEET[1]);
        }
        c.draw(f, x, y + 14);
      },
    });
  }
  const maxW = 820;
  const lay = flow(cards, maxW, 12);
  const pad = 10;
  const out = new Canvas(lay.w + pad * 2, lay.h + pad * 2 + 16);
  out.fillRect(0, 0, out.w, out.h, BG);
  text(out, pad, pad, `${el.toUpperCase()}   GROUP VFX_${el.toUpperCase()}   ${sprites.length} SPRITES   (SHOWN 2X, KEY FRAME)`, INK);
  for (const p of lay.place) p.card.draw(out, pad + p.x, pad + 16 + p.y);
  saveWhole(out.scaled(2), path);
}

/** Nearest-neighbour half-size copy of a frame. */
function halve(f: Canvas): Canvas {
  const out = new Canvas(Math.ceil(f.w / 2), Math.ceil(f.h / 2));
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, f.get(x * 2, y * 2));
  return out;
}

/** Every animation of every element as labeled frame strips. */
function animSheet(all: [string, WorldSprite[]][], path: string): void {
  const sections: { title: string; accent: Color; lay: ReturnType<typeof flow> }[] = [];
  for (const [el, sprites] of all) {
    const cards: Card[] = [];
    for (const s of sprites)
      for (const [key, a] of Object.entries(s.anims)) {
        // The huge signature sheets are shown at half size (they have their own compare images).
        const half = a.frames[0].w > 300;
        const fr = half ? a.frames.map(halve) : a.frames;
        const fw = fr[0].w, fh = fr[0].h;
        const perRow = Math.max(1, Math.min(fr.length, Math.floor((1640 + 3) / (fw + 3))));
        const rowsN = Math.ceil(fr.length / perRow);
        const w = perRow * (fw + 3) - 3;
        const label = `${s.name.toUpperCase()} - ${animInfo(s, key).toUpperCase()} - ${a.frames[0].w}x${a.frames[0].h}${half ? ' (SHOWN AT HALF SIZE)' : ''}`;
        cards.push({
          w: Math.max(w, textWidth(label)), h: rowsN * (fh + 3) + 6,
          draw: (c, x, y) => {
            text(c, x, y, label, INK_DIM);
            fr.forEach((f, i) => {
              const fx = x + (i % perRow) * (fw + 3), fy = y + 8 + Math.floor(i / perRow) * (fh + 3);
              panel(c, fx, fy, fw, fh);
              c.draw(f, fx, fy);
            });
          },
        });
      }
    sections.push({ title: `${el.toUpperCase()}  (VFX_${el.toUpperCase()})`, accent: hex(ELEMENTS[el].accent), lay: flow(cards, 1640, 10) });
  }
  const pad = 10;
  const W = Math.max(...sections.map((s) => s.lay.w)) + pad * 2;
  const H = sections.reduce((t, s) => t + s.lay.h + 22, pad * 2);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  let y = pad;
  for (const s of sections) {
    out.fillRect(pad, y + 2, W - pad * 2, 1, s.accent);
    text(out, pad, y + 5, s.title, s.accent);
    y += 14;
    for (const p of s.lay.place) p.card.draw(out, pad + p.x, y + p.y);
    y += s.lay.h + 8;
  }
  saveWhole(out.scaled(2), path);
}

const WALLS = ['wall', 'wall_diag', 'wall_depth'];
const WALL_TITLES: Record<string, string> = { wall: 'HORIZONTAL (WALL)', wall_diag: '3/4 (WALL_DIAG, MIRROR IT FOR THE OTHER DIAGONAL)', wall_depth: 'END-ON (WALL_DEPTH)' };

/**
 * The walls in their three orientations, element by element (idle frame), each with a character
 * standing on the same ground line beside it for scale; the anchor (the wall's centre on the
 * ground) is marked with a small cross.
 */
function wallsSheet(all: [string, WorldSprite[]][], path: string): void {
  const ref = characterRef();
  const rb = ref.bounds()!;
  const refW = rb[2] - rb[0] + 8;
  const pad = 10, gap = 14;
  const rows = all.map(([el, ss]) => ({ el, walls: WALLS.map((n) => ss.find((s) => s.name === n)).filter((s): s is WorldSprite => !!s) })).filter((r) => r.walls.length);
  const labels = (el: string, s: WorldSprite) => {
    const f = s.anims.idle.frames[0];
    return [`${el.toUpperCase()} - ${WALL_TITLES[s.name]}`, `${f.w}x${f.h}  ANCHOR ${s.anchor[0]},${s.anchor[1]}`, `${animInfo(s, 'rise')}, ${animInfo(s, 'idle')}`];
  };
  const cellW = (s: WorldSprite) => s.anims.idle.frames[0].w + refW;
  const colOf = (el: string, s: WorldSprite) => Math.max(cellW(s), ...labels(el, s).map((l) => textWidth(l)));
  const colW = WALLS.map((_, k) => Math.max(...rows.map((r) => (r.walls[k] ? colOf(r.el, r.walls[k]) : 0))));
  const rowH = rows.map((r) => Math.max(...r.walls.map((s) => s.anims.idle.frames[0].h)) + 30);
  const W = pad * 2 + colW.reduce((a, b) => a + b + gap, -gap);
  const H = pad * 2 + 14 + rowH.reduce((a, b) => a + b + gap, 0);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  text(out, pad, pad, 'WALLS IN THREE ORIENTATIONS - IDLE FRAME, 2X, CHARACTER FOR SCALE, + = ANCHOR (WALL CENTRE ON THE GROUND)', INK);
  let y = pad + 14;
  rows.forEach((r, ri) => {
    const accent = hex(ELEMENTS[r.el].accent);
    let x = pad;
    r.walls.forEach((s, k) => {
      const f = s.anims.idle.frames[0];
      const [l0, l1, l2] = labels(r.el, s);
      text(out, x, y, l0, accent);
      text(out, x, y + 7, l1, INK_DIM);
      text(out, x, y + 14, l2, INK_DIM);
      const top = y + 22;
      panel(out, x, top, cellW(s), rowH[ri] - 30);
      const gy = top + s.anchor[1];
      out.fillRect(x, gy, cellW(s), 1, PANEL_EDGE);
      out.draw(f, x, top);
      out.draw(ref, x + f.w + 4 - rb[0], gy - CHARACTER_FEET[1]);
      const ax = x + s.anchor[0];
      for (let d = -2; d <= 2; d++) {
        out.set(ax + d, gy, INK);
        out.set(ax, gy + d, INK);
      }
      x += colW[k] + gap;
    });
    y += rowH[ri] + gap;
  });
  saveWhole(out.scaled(2), path);
}

/** Zoomed strips for reviewing one sprite: every animation on a dark and a mid background. */
function workStrips(el: string, s: WorldSprite, dir: string): void {
  const rows = Object.entries(s.anims);
  const fw = Math.max(...rows.flatMap(([, a]) => a.frames.map((f) => f.w)));
  const fh = Math.max(...rows.flatMap(([, a]) => a.frames.map((f) => f.h)));
  const k = fw > 150 ? 2 : fw > 100 || fh > 100 ? 3 : fw > 64 ? 3 : 4;
  const perRow = Math.max(1, Math.min(8, Math.floor(1400 / (k * (fw + 2)))));
  const lines: { a: Canvas[]; bg: number }[] = [];
  for (const [, a] of rows)
    for (let i = 0; i < a.frames.length; i += perRow) for (let b = 0; b < 2; b++) lines.push({ a: a.frames.slice(i, i + perRow), bg: b });
  const bgs = [hex('#14151c'), hex('#6f7d63')];
  const out = new Canvas((fw + 2) * perRow + 2, (fh + 2) * lines.length + 2);
  out.fillRect(0, 0, out.w, out.h, hex('#000000'));
  lines.forEach((l, r) => {
    const y = 2 + r * (fh + 2);
    l.a.forEach((f, i) => {
      out.fillRect(2 + i * (fw + 2), y, fw, fh, bgs[l.bg]);
      out.draw(f, 2 + i * (fw + 2), y);
    });
  });
  saveWhole(out.scaled(k), join(dir, `vfx-${el}-${s.name}.png`));
}

/** One animation as a zoomed strip on the sheet background (for sending a single sprite). */
function zoomStrip(s: WorldSprite, key: string, path: string, k: number): void {
  const a = s.anims[key];
  const fw = a.frames[0].w, fh = a.frames[0].h;
  const label = `${s.name.toUpperCase()} - ${animInfo(s, key).toUpperCase()} - ${fw}x${fh}`;
  const out = new Canvas(a.frames.length * (fw + 4) + 4, fh + 16);
  out.fillRect(0, 0, out.w, out.h, BG);
  text(out, 4, 3, label, INK_DIM);
  a.frames.forEach((f, i) => {
    panel(out, 4 + i * (fw + 4), 12, fw, fh);
    out.draw(f, 4 + i * (fw + 4), 12);
  });
  saveWhole(out.scaled(k), path);
}

interface CompareItem {
  label: string;
  f: Canvas;
  /** Where the character's feet go, in the frame's pixels (may lie outside it). */
  feet: [number, number];
}
/** Side-by-side panels of frames with a character standing in each for scale. */
function compareSheet(title: string, rows: CompareItem[][], path: string, k: number): void {
  const ref = characterRef();
  const rb = ref.bounds()!;
  const pad = 12;
  const panels = rows.map((row) =>
    row.map((it) => {
      const fx0 = Math.min(0, it.feet[0] - (CHARACTER_FEET[0] - rb[0])), fx1 = Math.max(it.f.w, it.feet[0] + (rb[2] - CHARACTER_FEET[0]) + 1);
      const fy0 = Math.min(0, it.feet[1] - (CHARACTER_FEET[1] - rb[1])), fy1 = Math.max(it.f.h, it.feet[1] + 2);
      return { it, ox: -fx0, oy: -fy0, w: fx1 - fx0, h: fy1 - fy0 };
    }),
  );
  const W = Math.max(...panels.map((r) => r.reduce((t, p) => t + p.w + pad, pad)));
  const H = panels.reduce((t, r) => t + Math.max(...r.map((p) => p.h)) + 14 + pad, 16 + pad);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  text(out, pad, 6, title, INK);
  let y = 16 + pad;
  for (const r of panels) {
    let x = pad;
    const rh = Math.max(...r.map((p) => p.h));
    for (const p of r) {
      text(out, x, y, p.it.label, INK_DIM);
      panel(out, x, y + 10, p.w, rh);
      const gy = y + 10 + p.oy + p.it.feet[1];
      out.fillRect(x, gy, p.w, 1, PANEL_EDGE);
      out.draw(ref, x + p.ox + p.it.feet[0] - CHARACTER_FEET[0], gy - CHARACTER_FEET[1]);
      out.draw(p.it.f, x + p.ox, y + 10 + p.oy);
      x += p.w + pad;
    }
    y += rh + 14 + pad;
  }
  saveWhole(out.scaled(k), path);
}

/** The fireball and annihilation comparisons the owner asked for (normal vs enhanced). */
function signatureCompares(sprites: WorldSprite[], dir: string): void {
  const by = Object.fromEntries(sprites.map((s) => [s.name, s]));
  if (by.fireball && by.fireball_great) {
    const a = by.fireball, b = by.fireball_great;
    compareSheet('GREAT FIREBALL - NORMAL (R 1.5 M) VS ENHANCED (R 2.25 M), 2X, CHARACTER FOR SCALE', [
      [
        { label: 'FIREBALL FLY', f: a.anims.fly.frames[0], feet: [a.anchor[0] + 70, a.anchor[1] + 50] },
        { label: 'FIREBALL_GREAT FLY', f: b.anims.fly.frames[0], feet: [b.anchor[0] + 110, b.anchor[1] + 50] },
      ],
      [
        { label: 'FIREBALL BURST (FRAME 4)', f: a.anims.burst.frames[3], feet: [a.anchor[0] + 104, a.anchor[1]] },
        { label: 'FIREBALL_GREAT BURST (FRAME 5)', f: b.anims.burst.frames[4], feet: [b.anchor[0] + 150, b.anchor[1]] },
      ],
    ], join(dir, 'vfx-fire-fireball-compare.png'), 2);
  }
  if (by.annihilation && by.annihilation_enh) {
    const a = by.annihilation, b = by.annihilation_enh;
    compareSheet('GREAT FIRE ANNIHILATION - NORMAL (12 M CONE) VS ENHANCED (15 M), 2X, CASTER AT THE APEX', [
      [{ label: 'ANNIHILATION BURN (LOOP FRAME 1)', f: a.anims.burn.frames[0], feet: [a.anchor[0] - 14, a.anchor[1]] }],
      [{ label: 'ANNIHILATION_ENH BURN (LOOP FRAME 1)', f: b.anims.burn.frames[0], feet: [b.anchor[0] - 14, b.anchor[1]] }],
    ], join(dir, 'vfx-fire-annihilation-compare.png'), 2);
  }
}

/**
 * No particle may be cut by the frame: loose bits touching the border are dropped. The beasts
 * are left exactly as they are (another artist owns them now), the stream tile wraps by design
 * and the stream head joins the tile on its left.
 */
function edgeClean(s: WorldSprite): WorldSprite {
  if (s.name === 'beast' || s.name === 'stream') return s;
  const sides = s.name === 'stream_head' ? 'trb' : 'ltrb';
  const anims = Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => clearEdgeBits(f, 64, sides)) }]));
  return { ...s, anims };
}

const only = process.env.VFX_ONLY ? process.env.VFX_ONLY.split(',') : null;
const outDir = previewDir();
// Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
const worldOut = process.env.WORLD_OUT;
if (!worldOut) throw new Error('vfx-a: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
const tmpRoot = join(outDir, 'vfx-a-tmp');
const built: [string, WorldSprite[]][] = [];
for (const el of Object.keys(ELEMENTS)) {
  if (only && !only.includes(el)) continue;
  const sprites = ELEMENTS[el].build().map(edgeClean);
  writeGroupWhole(`vfx_${el}`, sprites, worldOut, tmpRoot);
  elementSheet(el, sprites, join(outDir, `vfx-${el}.png`));
  if (process.env.VFX_WORK) for (const s of sprites) workStrips(el, s, join(outDir, 'vfx-a-work'));
  built.push([el, sprites]);
  if (el === 'fire') {
    zoomStrip(sprites.find((s) => s.name === 'beast')!, 'fly', join(outDir, 'vfx-fire-phoenix-4x.png'), 4);
    signatureCompares(sprites, outDir);
  }
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`vfx_${el.padEnd(9)} ${s.name.padEnd(12)} ${f0.w}x${f0.h} anchor ${s.anchor} ${anims}`);
  }
}
if (!only) animSheet(built, join(outDir, 'vfx-vfx-a-anims.png'));
wallsSheet(built, join(outDir, 'vfx-a-walls.png'));
animSheet(built.map(([el, ss]) => [el, ss.filter((s) => WALLS.includes(s.name))] as [string, WorldSprite[]]), join(outDir, 'vfx-a-walls-anims.png'));
rmSync(tmpRoot, { recursive: true, force: true });
