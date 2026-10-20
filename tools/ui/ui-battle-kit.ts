// The battle UI kit: the owner's new battle interface (docs/reference/ui-battle-owner-reference.jpg)
// rebuilt as clean pixel-art pieces for the HTML HUD.
//
//   UI_OUT=<stagingDir> npx tsx tools/ui/ui-battle-kit.ts
//
// writes <stagingDir>/<piece>.png (screen scale for a 1600x900 window: every art pixel is 2x2)
// and <stagingDir>/manifest.json (file, size, 9-slice insets, window, intended use). It refuses to
// run without UI_OUT. Every file is written under a temporary name and renamed into place, and
// the same sources always give the same bytes.
//
// Optional, for the review sheets (each one is skipped when its inputs are missing):
//   UI_SHEETS=<dir>     writes ui-battle-kit.png (every piece at 2x, labelled) and, with the
//                       crops of tools/refs/ui-from-ref.py in <stagingDir>/ref/, ui-battle-compare.png
//   UI_CAPTURE=<dir>    frame.png (a clean 1600x900 battle frame, canvas only), hud.png (the same
//                       moment with the current HUD) and minimap.png (the game's minimap canvas),
//                       as written by tools/ui/ui-battle-capture.mjs, for ui-battle-mockup.png;
//                       the mockup also writes <stagingDir>/layout.json (where each piece went)
//   UI_SHOTS=<dir>      the current game screenshots (1-turno.png, Akira acting) for the portraits

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img, hex, loadPng, savePng, writeAtomic } from './ui-img';
import { screenText } from './ui-font';
import { Piece, allPieces } from './ui-battle-pieces';
import { buildMockup } from './ui-battle-mockup';

if (!process.env.UI_OUT) {
  console.error('ui-battle-kit: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
  process.exit(2);
}
const OUT: string = process.env.UI_OUT;
const K = 2; // screen pixels per art pixel
const x2 = (v: number) => Math.round(v * K);

const pieces = allPieces();
const names = new Set<string>();
for (const p of pieces) {
  if (names.has(p.name)) throw new Error(`duplicate piece ${p.name}`);
  names.add(p.name);
}

/**
 * Every sliced piece must stretch cleanly: its centre (between the insets) has to repeat with a
 * period of 1 or 2 art pixels (2 or 4 screen pixels) that divides the centre's size, so a box of
 * any even size shows no seam. The kit refuses to build otherwise.
 */
function slicePeriod(img: Img, a0: number, a1: number, vertical: boolean): number | null {
  const same = (a: number, b: number): boolean => {
    const n = vertical ? img.w : img.h;
    for (let k = 0; k < n; k++) {
      const p = vertical ? img.get(k, a) : img.get(a, k), q = vertical ? img.get(k, b) : img.get(b, k);
      if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2] || p[3] !== q[3]) return false;
    }
    return true;
  };
  for (const per of [1, 2]) {
    if ((a1 - a0) % per !== 0) continue;
    let ok = true;
    for (let a = a0; a + per < a1 && ok; a++) ok = same(a, a + per);
    if (ok) return per;
  }
  return null;
}
for (const p of pieces) {
  if (!p.slice) continue;
  const [t, r, b, l] = p.slice;
  const cols = slicePeriod(p.img, l, p.img.w - r, false);
  const rows = t || b ? slicePeriod(p.img, t, p.img.h - b, true) : 1;
  if (!cols || !rows) throw new Error(`${p.name}: the centre between the slices does not repeat every 1 or 2 art pixels (${cols ? 'rows' : 'columns'})`);
}

// --- kit sheet ---------------------------------------------------------------------------------------------

function kitSheet(ps: Piece[]): Img {
  const Z = 2; // the sheet shows each screen-scale piece at 2x
  const pad = 24, gap = 28, maxW = 2200;
  const BG = hex('#33463a'), BG2 = hex('#2b3c31'), HEAD = hex('#e9dfc4'), SUB = hex('#a9b5a6');
  // Lay out by group, in rows.
  const groups: string[] = [];
  for (const p of ps) if (!groups.includes(p.group)) groups.push(p.group);
  type Cell = { p: Piece; img: Img; label: Img; sub: Img; w: number; h: number };
  const rows: { title: Img | null; cells: Cell[]; h: number }[] = [];
  for (const gname of groups) {
    rows.push({ title: screenText(gname.toUpperCase(), 'title', HEAD), cells: [], h: 0 });
    let row = rows[rows.length - 1];
    let x = pad;
    for (const p of ps.filter((q) => q.group === gname)) {
      const img = p.img.scaled(K * Z);
      const label = screenText(p.name, 'label', HEAD);
      const subTxt = `${p.img.w * K}x${p.img.h * K}` + (p.slice ? `  slice ${p.slice.map(x2).join(' ')}` : '');
      const sub = screenText(subTxt, 'label', SUB);
      const w = Math.max(img.w, label.w, sub.w), h = img.h + label.h + sub.h + 10;
      if (x + w > maxW - pad && row.cells.length) {
        rows.push({ title: null, cells: [], h: 0 });
        row = rows[rows.length - 1];
        x = pad;
      }
      row.cells.push({ p, img, label, sub, w, h });
      row.h = Math.max(row.h, h);
      x += w + gap;
    }
  }
  const W = maxW;
  const H = rows.reduce((t, r) => t + r.h + gap + (r.title ? r.title.h + 12 : 0), pad * 2 + 40);
  const out = new Img(W, H);
  out.fill(BG);
  const title = screenText('BATTLE UI KIT  -  pieces at 2x (each screen pixel shown 2x2, one art pixel = 4x4 here)', 'title', HEAD);
  out.draw(title, pad, pad);
  let y = pad + title.h + 16;
  for (const r of rows) {
    if (r.title) {
      out.rect(0, y, W, 2, BG2);
      out.draw(r.title, pad, y + 8);
      y += r.title.h + 12;
    }
    let x = pad;
    for (const c of r.cells) {
      // A darker tile behind each piece so its transparent margin shows.
      out.rect(x - 4, y - 4, c.img.w + 8, c.img.h + 8, BG2);
      out.draw(c.img, x, y);
      out.draw(c.label, x, y + c.img.h + 6);
      out.draw(c.sub, x, y + c.img.h + 6 + c.label.h);
      x += c.w + gap;
    }
    y += r.h + gap;
  }
  return out;
}

// --- compare sheet ------------------------------------------------------------------------------------------

/** Which of his crops each piece is compared with, and how our piece is shown for it. */
const PAIRS: { ref: string; piece: string; note?: string }[] = [
  { ref: 'target_bar', piece: 'target_bar' },
  { ref: 'target_end', piece: 'target_bar' },
  { ref: 'chain_left', piece: 'chain_left' },
  { ref: 'chain_sag', piece: 'chain_sag' },
  { ref: 'round_medallion', piece: 'round_medallion' },
  { ref: 'init_active', piece: 'init_active' },
  { ref: 'init_ally', piece: 'init_ally' },
  { ref: 'init_enemy', piece: 'init_enemy' },
  { ref: 'init_end', piece: 'init_end' },
  { ref: 'minimap', piece: 'minimap_ring' },
  { ref: 'bar_left', piece: 'bar_frame' },
  { ref: 'medallion_active', piece: 'medallion_active' },
  { ref: 'scroll_left', piece: 'crest_strip' },
  { ref: 'hp_strip', piece: 'crest_strip' },
  { ref: 'scroll_right', piece: 'crest_strip' },
  { ref: 'chakra_gems', piece: 'chakra_red' },
  { ref: 'skill_slot', piece: 'skill_slot' },
  { ref: 'skill_tag', piece: 'skill_tag' },
  { ref: 'item_slot', piece: 'item_slot' },
  { ref: 'item_badge', piece: 'item_badge' },
  { ref: 'pips', piece: 'pip_action' },
  { ref: 'move_bar', piece: 'move_trough' },
  { ref: 'lower_end', piece: 'lower_plaque' },
  { ref: 'party_frame', piece: 'party_frame' },
  { ref: 'small_button', piece: 'button_small' },
  { ref: 'gem_corner_red', piece: 'gem_red' },
  { ref: 'gem_corner_green', piece: 'gem_green' },
  { ref: 'bar_end_gem', piece: 'end_turn_gem' },
];

function compareSheet(ps: Piece[], refDir: string, mock: Img | null): Img {
  const Z = 3;
  const crops = JSON.parse(readFileSync(join(refDir, 'crops.json'), 'utf8')).crops as Record<string, { what: string; ours: [number, number]; oursAt: [number, number] }>;
  const byName = new Map(ps.map((p) => [p.name, p]));
  const pad = 24, gap = 36, maxW = 2400;
  const BG = hex('#33463a'), BG2 = hex('#26352b'), HEAD = hex('#e9dfc4');
  type Cell = { a: Img; b: Img; label: Img; w: number; h: number };
  const cells: Cell[] = [];
  for (const pr of PAIRS) {
    const p = byName.get(pr.piece);
    const f = join(refDir, `${pr.ref}@ours.png`);
    if (!p || !existsSync(f)) continue;
    const a = loadPng(f).scaled(Z);
    const b = p.img.scaled(K * Z);
    const label = screenText(`${pr.ref}  (his, scaled to our size)  |  ${pr.piece} (ours)  -  both at 3x`, 'label', HEAD);
    cells.push({ a, b, label, w: Math.max(a.w + 16 + b.w, label.w), h: Math.max(a.h, b.h) + label.h + 8 });
  }
  // As placed: his region beside the same region of our mockup, at 2x (one per row).
  const placed: Cell[] = [];
  if (mock)
    for (const name of ['top_centre', 'minimap', 'crest', 'bar', 'party_frames']) {
      const f = join(refDir, `${name}@ours.png`);
      const c = crops[name];
      if (!c || !existsSync(f)) continue;
      const a = loadPng(f).scaled(2);
      const b = mock.crop(c.oursAt[0], c.oursAt[1], c.ours[0], c.ours[1]).scaled(2);
      const label = screenText(`${name}  -  his picture (left) and our mockup (right), same region, at 2x`, 'label', HEAD);
      placed.push({ a, b, label, w: Math.max(a.w + 16 + b.w, label.w), h: Math.max(a.h, b.h) + label.h + 8 });
    }
  // Rows.
  const rows: Cell[][] = [[]];
  let x = pad;
  for (const c of cells) {
    if (x + c.w > maxW - pad && rows[rows.length - 1].length) {
      rows.push([]);
      x = pad;
    }
    rows[rows.length - 1].push(c);
    x += c.w + gap;
  }
  for (const c of placed) {
    if (c.w > maxW - 2 * pad) {
      // Too wide side by side: stack his above ours.
      c.w = Math.max(c.a.w, c.b.w, c.label.w);
      c.h = c.a.h + 12 + c.b.h + c.label.h + 8;
      (c as Cell & { stacked?: boolean }).stacked = true;
    }
    rows.push([c]);
  }
  const title = screenText('BATTLE UI KIT  -  his crops (left) beside our pieces (right), at 3x', 'title', HEAD);
  const H = rows.reduce((t, r) => t + Math.max(...r.map((c) => c.h)) + gap, pad * 2 + title.h + 16);
  const out = new Img(maxW, H);
  out.fill(BG);
  out.draw(title, pad, pad);
  let y = pad + title.h + 16;
  for (const r of rows) {
    let xx = pad;
    const rh = Math.max(...r.map((c) => c.h));
    for (const c of r) {
      if ((c as Cell & { stacked?: boolean }).stacked) {
        out.draw(c.a, xx, y);
        out.draw(c.b, xx, y + c.a.h + 12);
        out.draw(c.label, xx, y + c.a.h + 12 + c.b.h + 8);
      } else {
        out.rect(xx - 4, y - 4, c.a.w + 8, c.a.h + 8, BG2);
        out.draw(c.a, xx, y);
        out.rect(xx + c.a.w + 12, y - 4, c.b.w + 8, c.b.h + 8, BG2);
        out.draw(c.b, xx + c.a.w + 16, y);
        out.draw(c.label, xx, y + Math.max(c.a.h, c.b.h) + 8);
      }
      xx += c.w + gap;
    }
    y += rh + gap;
  }
  return out;
}

// --- build ------------------------------------------------------------------------------------------------

function main(): void {

    const manifest: Record<string, unknown> = {};
  for (const p of pieces) {
    const img = p.img.scaled(K);
    savePng(join(OUT, `${p.name}.png`), img);
    manifest[p.name] = {
      file: `${p.name}.png`,
      group: p.group,
      size: [img.w, img.h],
      ...(p.slice ? { slice: p.slice.map(x2) } : {}),
      ...(p.outset ? { outset: p.outset.map(x2) } : {}),
      ...(p.window ? { window: { x: x2(p.window.x), y: x2(p.window.y), w: x2(p.window.w), h: x2(p.window.h), shape: p.window.shape } } : {}),
      use: p.use,
    };
  }
  writeAtomic(
    join(OUT, 'manifest.json'),
    JSON.stringify(
      {
        kit: 'ui_battle',
        reference: 'docs/reference/ui-battle-owner-reference.jpg',
        screen: [1600, 900],
        pixel: 'every art pixel is 2x2 screen pixels; draw with image-rendering: pixelated',
        sliceOrder: 'top, right, bottom, left (screen pixels)',
        pieces: manifest,
      },
      null,
      1,
    ) + '\n',
  );
  console.log(`ui-battle-kit: ${pieces.length} pieces -> ${OUT}`);

  // --- review sheets ---------------------------------------------------------------------------------------

  const SHEETS = process.env.UI_SHEETS;
  if (SHEETS) {
    savePng(join(SHEETS, 'ui-battle-kit.png'), kitSheet(pieces));
    const cap = process.env.UI_CAPTURE, shots = process.env.UI_SHOTS;
    let mock: Img | null = null;
    if (cap && shots && existsSync(join(cap, 'frame.png')) && existsSync(join(cap, 'hud.png')) && existsSync(join(shots, '1-turno.png'))) {
      const m = buildMockup(pieces, cap, shots);
      mock = m.img;
      savePng(join(SHEETS, 'ui-battle-mockup.png'), m.img);
      writeAtomic(join(OUT, 'layout.json'), JSON.stringify({ screen: [1600, 900], note: 'where the mockup put each piece: [x, y, w, h] in screen pixels', pieces: m.layout }, null, 1) + '\n');
    } else console.log('ui-battle-kit: UI_CAPTURE / UI_SHOTS missing, mockup skipped');
    const refDir = join(OUT, 'ref');
    if (existsSync(join(refDir, 'crops.json'))) savePng(join(SHEETS, 'ui-battle-compare.png'), compareSheet(pieces, refDir, mock));
    else console.log('ui-battle-kit: no ref/crops.json (run tools/refs/ui-from-ref.py), compare sheet skipped');
  }
}

main();
