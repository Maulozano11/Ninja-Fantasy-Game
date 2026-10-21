// The critical hit's extra art (a natural 20 on an attack: automatic critical, maximum damage) and
// the roll's readout next to the die.
//
//   banner   "¡CRÍTICO!" / "CRITICAL!" on a HUD plaque (dark panel, gold band, red gems): it
//            slams open from the middle with a white flash, a shine runs over the letters, it holds,
//            then closes. Art pixels; the screen shows it at 3x.
//   burst    the impact on the target: a white-gold core, rays, a slash, a ring and sparks (world
//            pixels, 1 m = 57 px, so it sits on the target at the map's own scale).
//   damage   big gold digits for the maximum damage, a white flash version, and the "MÁX"/"MAX" tag.
//   readout  "17 + 5 = 22", the success or failure mark, "CA 14"/"CD 15" (and AC/DC), the
//            advantage tags: the pieces the screen lays out beside the die.

import { Img, RGBA, hex, mixc } from './ui-img';
import { renderText, textWidth } from './ui-font';
import { GEM, GOLD, METAL, PANEL, band, gem, sdCircle } from './ui-draw';
import { GOLD20, WHITE, lcg } from './dice-d20-art';
import { rays, star } from './dice-d20-fx';

const g = (s: string): string[] => s.split(' ');

// --- the banner's letters (cap 11, 2-pixel strokes; 3 rows above for accents) -------------------------

const BANNER: Record<string, string[]> = {
  C: g('..###### .######## ###...... ##....... ##....... ##....... ##....... ##....... ###...... .######## ..######'),
  R: g('#######. ######## ##...### ##....## ##...### #######. ######.. ##..###. ##...### ##....## ##....##'),
  I: g('###### ###### ..##.. ..##.. ..##.. ..##.. ..##.. ..##.. ..##.. ###### ######'),
  T: g('######## ######## ...##... ...##... ...##... ...##... ...##... ...##... ...##... ...##... ...##...'),
  O: g('..####.. .######. ###..### ##....## ##....## ##....## ##....## ##....## ###..### .######. ..####..'),
  A: g('..####.. .######. ###..### ##....## ##....## ######## ######## ##....## ##....## ##....## ##....##'),
  L: g('##...... ##...... ##...... ##...... ##...... ##...... ##...... ##...... ##...... ######## ########'),
  M: g('##......## ###....### ####..#### ##.####.## ##..##..## ##......## ##......## ##......## ##......## ##......## ##......##'),
  X: g('##....## ##....## .##..##. .##..##. ..####.. ...##... ..####.. .##..##. .##..##. ##....## ##....##'),
  F: g('######## ######## ##...... ##...... ##...... ######.. ######.. ##...... ##...... ##...... ##......'),
  N: g('##....## ###...## ####..## ##.##.## ##.##.## ##..#### ##..#### ##...### ##....## ##....## ##....##'),
  U: g('##....## ##....## ##....## ##....## ##....## ##....## ##....## ##....## ###..### .######. ..####..'),
  '2': g('.######. ######## ##....## ......## .....### ...####. .####... ###..... ##...... ######## ########'),
  '0': g('..####.. .######. ###..### ##...### ##..#### ##.##.## ####..## ###...## ###..### .######. ..####..'),
  ' ': g('..... ..... ..... ..... ..... ..... ..... ..... ..... ..... .....'),
  '!': g('## ## ## ## ## ## ## ## .. ## ##'),
  '¡': g('## ## .. ## ## ## ## ## ## ## ##'),
};
const ACUTE = g('....##. ...##.. ..##...');

function bannerGlyph(ch: string): string[] {
  const acc = ch === 'Í' || ch === 'Á';
  const base = BANNER[acc ? (ch === 'Í' ? 'I' : 'A') : ch];
  if (!base) throw new Error(`banner font: no '${ch}'`);
  const w = base[0].length;
  const top = acc
    ? ACUTE.map((r) => {
        // Centre the 7-wide accent over the letter.
        const pad = Math.floor((w - 7) / 2) + 1;
        const row = ('.'.repeat(Math.max(0, pad)) + r).slice(0, w);
        return row.padEnd(w, '.');
      })
    : ['.'.repeat(w), '.'.repeat(w), '.'.repeat(w)];
  return [...top, ...base];
}

/** The banner's text: gold from light (top) to deep (bottom), a dark rim, a one-pixel shadow. */
export function bannerText(s: string, mode: 'gold' | 'white' = 'gold', spacing = 2): Img {
  const gl = [...s].map(bannerGlyph);
  const w = gl.reduce((a, b) => a + b[0].length, 0) + spacing * (gl.length - 1) + 4, h = 14 + 4;
  const ink = new Uint8Array(w * h);
  let x = 2;
  for (const gg of gl) {
    gg.forEach((row, y) => [...row].forEach((c, i) => c === '#' && (ink[(y + 1) * w + x + i] = 1)));
    x += gg[0].length + spacing;
  }
  const at = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && ink[yy * w + xx] === 1;
  const img = new Img(w, h);
  const rim = hex('#2a0d06'), shadow = hex('#0b0503');
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      if (at(xx, yy)) continue;
      let n = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(xx + dx, yy + dy)) n = true;
      if (n) img.set(xx, yy, rim);
      else if (at(xx, yy - 2) || at(xx - 1, yy - 2)) img.set(xx, yy, shadow);
    }
  // Rows of the letters (accent rows count from the cap's top, row 4 here).
  const ramp = [GOLD20[7], GOLD20[7], GOLD20[6], GOLD20[6], GOLD20[6], GOLD20[5], GOLD20[5], GOLD20[5], GOLD20[4], GOLD20[4], GOLD20[3]];
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      if (!at(xx, yy)) continue;
      const r = yy - 4;
      let c = r < 0 ? GOLD20[6] : ramp[Math.min(ramp.length - 1, r)];
      // A bright lip on each stroke's top edge.
      if (!at(xx, yy - 1) && r >= 0 && r < 8) c = GOLD20[7];
      img.set(xx, yy, mode === 'white' ? (r >= 8 ? GOLD20[6] : WHITE) : c);
    }
  return img;
}

// --- the banner plaque -----------------------------------------------------------------------------

/** A long plaque with pointed ends: dark inside, a gold band, a red gem at each point. */
function plaque(w: number, h: number, flash: number): Img {
  const img = new Img(w, h);
  const cx = w / 2, cy = h / 2, hw = w / 2 - 2, hh = h / 2 - 2;
  // Distance to an elongated hexagon (points left and right).
  const sd = (x: number, y: number) => Math.max(Math.abs(y - cy) - hh, Math.abs(x - cx) + Math.abs(y - cy) * 0.9 - hw);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = sd(x + 0.5, y + 0.5);
      if (d > 0.6) continue;
      if (d > -0.4) img.set(x, y, METAL[0]);
      else {
        // The panel darkens to the edges like the HUD's wells; a faint warm line along the middle.
        const v = Math.abs(y + 0.5 - cy) / hh;
        img.set(x, y, v < 0.25 ? PANEL[3] : v < 0.6 ? PANEL[2] : PANEL[1]);
      }
    }
  band(img, sd, { from: 0.4, width: 2.2, ramp: GOLD, lo: 2, hi: 7 });
  // An inner hairline in bronze, as on the target bar.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = sd(x + 0.5, y + 0.5);
      if (d <= -3 && d > -4) img.set(x, y, METAL[2]);
    }
  if (w > 24) {
    gem(img, 4.5, cy, 2.4, GEM.red);
    gem(img, w - 4.5, cy, 2.4, GEM.red);
  }
  if (flash > 0)
    for (let i = 0; i < img.px.length; i += 4)
      if (img.px[i + 3]) {
        const c = mixc([img.px[i], img.px[i + 1], img.px[i + 2], 255], WHITE, flash);
        img.px[i] = c[0];
        img.px[i + 1] = c[1];
        img.px[i + 2] = c[2];
      }
  return img;
}

export interface BannerFrame {
  img: Img;
  ms: number;
}

/**
 * The banner for one language: opens from the middle (flash, overshoot, settle), a shine runs over
 * the letters, it holds, then closes. The last frame before closing is the hold; the screen may
 * keep it as long as it likes.
 */
export function bannerFrames(text: string): { frames: BannerFrame[]; hold: number } {
  const txt = bannerText(text), white = bannerText(text, 'white');
  const W = txt.w + 40, H = 26;
  // It opens from half its width (a sliver read as a white diamond), and closes with its letters:
  // no frame shows the plaque empty.
  const steps: { open: number; flash: number; text: 'none' | 'white' | 'gold'; shine: number | null; ms: number }[] = [
    { open: 0.5, flash: 0.45, text: 'white', shine: null, ms: 40 },
    { open: 0.85, flash: 0.25, text: 'white', shine: null, ms: 40 },
    { open: 1.06, flash: 0.1, text: 'white', shine: null, ms: 40 },
    { open: 1, flash: 0, text: 'gold', shine: 0, ms: 50 },
    { open: 1, flash: 0, text: 'gold', shine: 0.3, ms: 50 },
    { open: 1, flash: 0, text: 'gold', shine: 0.6, ms: 50 },
    { open: 1, flash: 0, text: 'gold', shine: 0.9, ms: 50 },
    { open: 1, flash: 0, text: 'gold', shine: null, ms: 420 },
    { open: 0.75, flash: 0, text: 'gold', shine: null, ms: 40 },
  ];
  const FW = Math.round(W * 1.1) + 2;
  const frames = steps.map((s) => {
    const img = new Img(FW, H);
    const pw = Math.max(12, Math.round(W * s.open));
    const p = plaque(pw, H, s.flash);
    const px = Math.round((FW - pw) / 2);
    img.draw(p, px, 0);
    if (s.text !== 'none') {
      const t = s.text === 'white' ? white : txt;
      const tx = Math.round((FW - t.w) / 2), ty = Math.round((H - t.h) / 2) + 1;
      // Letters only inside the open plaque (the plaque's inner part).
      for (let y = 0; y < t.h; y++)
        for (let x = 0; x < t.w; x++) {
          const c = t.get(x, y);
          if (!c[3]) continue;
          const X = tx + x;
          if (X < px + 8 || X >= px + pw - 8) continue;
          img.set(X, ty + y, c);
        }
      if (s.shine !== null) {
        // A slanted white band over the letters.
        const at = -10 + s.shine * (t.w + 20);
        for (let y = 0; y < t.h; y++)
          for (let x = 0; x < t.w; x++) {
            const c = t.get(x, y);
            if (!c[3] || c[0] < 120) continue;
            const d = x + y * 0.6 - at;
            if (d >= 0 && d < 5) img.set(tx + x, ty + y, d < 2.5 ? WHITE : GOLD20[7]);
          }
      }
    }
    return { img, ms: s.ms };
  });
  return { frames, hold: 7 };
}

// --- the impact on the target --------------------------------------------------------------------------

/** The burst on the target, 8 frames of 128x128 world pixels, centred on the hit. */
export function burstFrames(): BannerFrame[] {
  const W = 128, c = W / 2;
  const r = lcg(707);
  const sparks = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + r() * 0.3, v: 0.7 + r() * 0.6, s: r() < 0.4 ? 2 : 1 }));
  const out: BannerFrame[] = [];
  for (let f = 0; f < 8; f++) {
    const img = new Img(W, W);
    // A warm light fills the ring as it opens, so the target's dark clothes inside it never read as
    // a black hole.
    if (f >= 1 && f <= 3) {
      const rr = [0, 18, 26, 33][f] - 1, a = [0, 150, 95, 45][f];
      for (let y = 0; y < W; y++)
        for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - c, y + 0.5 - c) < rr) img.set(x, y, [GOLD20[7][0], GOLD20[7][1], GOLD20[7][2], a]);
    }
    // Core flash.
    if (f <= 1) {
      const cr = f === 0 ? 11 : 15;
      for (let y = 0; y < W; y++)
        for (let x = 0; x < W; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (f === 0 ? d <= cr : d <= cr && d > cr - 4) img.set(x, y, d < cr - 3 ? WHITE : GOLD20[7]);
          else if (f === 0 && d <= cr + 2) img.set(x, y, GOLD20[6]);
        }
    }
    // Rays: long and bright at first, then thin and gone.
    if (f <= 3) rays(img, c, c, 8, f === 0 ? 8 : 12 + f * 4, [56, 60, 58, 50][f], [3.2, 2.2, 1.2, 0.6][f], 0.39, f < 2 ? GOLD20[6] : GOLD20[5], f < 2 ? WHITE : GOLD20[7]);
    // The slash: a white crescent across the target, upper left to lower right.
    if (f <= 2) {
      const L = [44, 50, 52][f], thick = [4, 3, 1.5][f];
      for (let t = -L; t <= L; t += 0.4) {
        const bend = (1 - (t / L) ** 2) * 7;
        const w = thick * (1 - Math.abs(t / L));
        for (let s = -w; s <= w; s += 0.4) {
          const x = c + t * 0.74 + (bend + s) * 0.67, y = c + t * 0.67 - (bend + s) * 0.74;
          img.set(Math.floor(x), Math.floor(y), Math.abs(s) < w * 0.5 ? WHITE : f === 2 ? GOLD20[6] : GOLD20[7]);
        }
      }
    }
    // The ring.
    if (f >= 1 && f <= 5) {
      const rr = [0, 18, 26, 33, 39, 44][f], th = [0, 3, 2, 2, 1, 1][f];
      for (let y = 0; y < W; y++)
        for (let x = 0; x < W; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (d > rr || d <= rr - th) continue;
          // Late rings break up.
          const a = Math.atan2(y - c, x - c);
          if (f >= 4 && Math.sin(a * 9 + f) < -0.2) continue;
          img.set(x, y, f <= 2 ? GOLD20[7] : f <= 3 ? GOLD20[6] : GOLD20[5]);
        }
    }
    // Sparks flying out and falling a little.
    if (f >= 1)
      for (const p of sparks) {
        const t = f / 7;
        const d = 14 + 46 * p.v * Math.sqrt(t);
        const x = c + Math.cos(p.a) * d, y = c + Math.sin(p.a) * d + 10 * t * t;
        const sz = f >= 6 ? 0 : p.s;
        const col = f <= 3 ? WHITE : f <= 5 ? GOLD20[7] : GOLD20[5];
        if (f === 7 && p.v < 1) continue;
        if (sz >= 2 && f <= 3) star(img, x, y, 2, GOLD20[6], col);
        else img.set(Math.floor(x), Math.floor(y), col);
      }
    out.push({ img, ms: [50, 50, 50, 60, 60, 70, 80, 90][f] });
  }
  return out;
}

// --- maximum damage ------------------------------------------------------------------------------------

const BIGD = g;
/** Big damage digits (2-pixel strokes, 10 rows), as in the HUD's round number. */
const DMG: Record<string, string[]> = {
  '0': BIGD('.####. ##..## ##..## ##..## ##..## ##..## ##..## ##..## ##..## .####.'),
  '1': BIGD('..##.. .###.. ####.. ..##.. ..##.. ..##.. ..##.. ..##.. ..##.. ######'),
  '2': BIGD('.####. ##..## ....## ....## ...##. ..##.. .##... ##.... ##.... ######'),
  '3': BIGD('.####. ##..## ....## ....## ..###. ....## ....## ....## ##..## .####.'),
  '4': BIGD('...##. ..###. .####. ##.##. ##.##. ###### ...##. ...##. ...##. ...##.'),
  '5': BIGD('###### ##.... ##.... #####. ....## ....## ....## ....## ##..## .####.'),
  '6': BIGD('.####. ##..## ##.... ##.... #####. ##..## ##..## ##..## ##..## .####.'),
  '7': BIGD('###### ....## ....## ...##. ...##. ..##.. ..##.. ..##.. ..##.. ..##..'),
  '8': BIGD('.####. ##..## ##..## ##..## .####. ##..## ##..## ##..## ##..## .####.'),
  '9': BIGD('.####. ##..## ##..## ##..## .##### ....## ....## ....## ##..## .####.'),
};

/** A damage number: gold (light top, deep bottom) or the white flash, dark rim and shadow. */
export function damageNumber(n: number, mode: 'gold' | 'white' = 'gold'): Img {
  const gl = String(n).split('').map((d) => DMG[d]);
  const w = gl.length * 7 - 1 + 4, h = 10 + 5;
  const ink = new Uint8Array(w * h);
  gl.forEach((gg, i) => gg.forEach((row, y) => [...row].forEach((c, x) => c === '#' && (ink[(y + 2) * w + 2 + i * 7 + x] = 1))));
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && ink[y * w + x] === 1;
  const img = new Img(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (at(x, y)) continue;
      let n1 = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) n1 = true;
      if (n1) img.set(x, y, hex('#2a0d06'));
      else if (at(x, y - 2) || at(x - 1, y - 2)) img.set(x, y, hex('#0b0503'));
    }
  const ramp = [GOLD20[8], GOLD20[7], GOLD20[7], GOLD20[6], GOLD20[6], GOLD20[5], hex('#ffd23c'), hex('#ffd23c'), hex('#e8a91e'), hex('#c4801a')];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (at(x, y)) img.set(x, y, mode === 'white' ? (y - 2 >= 8 ? GOLD20[7] : WHITE) : ramp[Math.min(9, y - 2)]);
  return img;
}

/** The "MÁX" / "MAX" tag: a small dark HUD plaque with a gold rim and gold letters (red read as a warning). */
export function maxTag(text: string): Img {
  // The label font has no capital accents: the acute is laid over the A by hand.
  const accentAt = text.indexOf('Á');
  const t = renderText(text.replace('Á', 'A'), 'label', { color: hex('#ffd23c'), top: GOLD20[7], outline: undefined });
  const w = t.w + 8, h = 14;
  const img = new Img(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      if (edge) img.set(x, y, hex('#2a0d06'));
      else if (x === 1 || y === 1 || x === w - 2 || y === h - 2) img.set(x, y, y <= 2 || x <= 1 ? GOLD20[6] : GOLD20[4]);
      else img.set(x, y, y < h / 2 ? PANEL[3] : PANEL[1]);
    }
  // Caps from row 4; the accent sits in the two rows above the A.
  img.draw(t, 4, 3);
  if (accentAt >= 0) {
    const ax = 4 + 1 + textWidth(text.slice(0, accentAt), 'label') + (accentAt > 0 ? 1 : 0);
    img.set(ax + 2, 2, GOLD20[7]);
    img.set(ax + 1, 3, GOLD20[7]);
  }
  return img;
}

// --- the readout ---------------------------------------------------------------------------------------

export const INKS = {
  cream: hex('#efe6cf'),
  dim: hex('#b8ad94'),
  gold: hex('#ffd23c'),
  good: GEM.green[4],
  bad: GEM.red[4],
};
const DARK: RGBA = hex('#0b0805');

/** A green check or a red cross gem, 9x9. */
export function markIcon(ok: boolean): Img {
  const img = new Img(9, 9);
  const ramp = ok ? GEM.green : GEM.red;
  const pts = ok ? [[1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2]] : [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [7, 1], [6, 2], [5, 3], [3, 5], [2, 6], [1, 7]];
  const on = new Set(pts.flatMap(([x, y]) => [`${x},${y}`, `${x},${y + 1}`]));
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      if (on.has(`${x},${y}`)) {
        img.set(x, y, on.has(`${x},${y - 1}`) ? ramp[3] : ramp[4]);
        continue;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
        if (on.has(`${x + dx},${y + dy}`)) {
          img.set(x, y, ramp[0]);
          break;
        }
    }
  return img;
}

export interface ReadoutSpec {
  d20: number;
  mod: number;
  total: number;
  /** "CA" / "CD" / "AC" / "DC" and the number to beat. */
  vsLabel: string;
  vs: number;
  ok: boolean;
  /** Natural 20 or 1: the die's number in gold or dull red. */
  nat?: 20 | 1;
}

/**
 * The readout beside the die, on a dark HUD plaque: the die's number, the bonus, the total (green
 * when it beats the target, red when not), the mark, and what it had to beat.
 */
export function readout(o: ReadoutSpec): Img {
  const st = (c: RGBA) => ({ color: c, outline: DARK });
  const parts: { img: Img; gap: number; dy: number }[] = [];
  const dieCol = o.nat === 20 ? INKS.gold : o.nat === 1 ? hex('#c27a68') : INKS.cream;
  parts.push({ img: renderText(String(o.d20), 'title', st(dieCol)), gap: 0, dy: 3 });
  if (o.mod !== 0) {
    parts.push({ img: renderText(o.mod > 0 ? '+' : '-', 'title', st(INKS.dim)), gap: 2, dy: 3 });
    parts.push({ img: renderText(String(Math.abs(o.mod)), 'title', st(INKS.cream)), gap: 2, dy: 3 });
  }
  parts.push({ img: renderText('=', 'title', st(INKS.dim)), gap: 3, dy: 3 });
  parts.push({ img: damageLikeTotal(o.total, o.ok ? INKS.good : INKS.bad), gap: 3, dy: 0 });
  parts.push({ img: markIcon(o.ok), gap: 4, dy: 3 });
  parts.push({ img: renderText(`${o.vsLabel} ${o.vs}`, 'label', st(INKS.dim)), gap: 5, dy: 4 });
  const w = parts.reduce((a, p) => a + p.img.w + p.gap, 0) + 10, h = 18;
  const img = new Img(w, h);
  // The plaque: the HUD's dark well with a bronze rim (a hair lighter at the top).
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const rim = x === 1 || y === 1 || x === w - 2 || y === h - 2;
      img.set(x, y, edge ? METAL[0] : rim ? (y === 1 ? METAL[5] : METAL[3]) : [PANEL[1][0], PANEL[1][1], PANEL[1][2], 235]);
    }
  let x = 5;
  for (const p of parts) {
    x += p.gap;
    img.draw(p.img, x, 1 + p.dy);
    x += p.img.w;
  }
  return img;
}

/** The total in the HUD's big digits, coloured, with a dark rim. */
function damageLikeTotal(n: number, col: RGBA): Img {
  return renderText(String(n), 'big', { color: col, outline: DARK, top: mixc(col, WHITE, 0.5) });
}

/** "VENTAJA ▲" / "DESVENTAJA ▼" (and English) tags over two dice. */
export function advTag(text: string, up: boolean): Img {
  const col = up ? GEM.green[4] : GEM.red[4];
  const t = renderText(text, 'label', { color: col, outline: DARK });
  const w = t.w + 9, h = t.h;
  const img = new Img(w, h);
  img.draw(t, 0, 0);
  // The arrow.
  const ax = t.w + 2, ay = up ? 3 : 2;
  for (let r = 0; r < 4; r++)
    for (let k = -r; k <= r; k++) {
      const y = up ? ay + r : ay + 3 - r;
      img.set(ax + 3 + k, y, col);
    }
  for (let y = 0; y < h; y++)
    for (let xx = t.w + 1; xx < w; xx++) {
      if (img.a(xx, y)) continue;
      if (img.a(xx - 1, y) || img.a(xx + 1, y) || img.a(xx, y - 1) || img.a(xx, y + 1)) {
        const c = img.get(xx - 1, y)[3] ? img.get(xx - 1, y) : img.get(xx + 1, y)[3] ? img.get(xx + 1, y) : img.get(xx, y - 1)[3] ? img.get(xx, y - 1) : img.get(xx, y + 1);
        if (c[0] !== DARK[0] || c[1] !== DARK[1]) img.set(xx, y, DARK);
      }
    }
  return img;
}

/** A soft round glow (alpha bands) for the big window's backdrop and the screen flash's centre. */
export function glowDisc(r: number, col: RGBA, strength = 1): Img {
  const w = Math.ceil(r * 2.4);
  const img = new Img(w, w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2) / r;
      const a = d < 0.5 ? 0.5 : d < 0.8 ? 0.34 : d < 1 ? 0.2 : d < 1.15 ? 0.1 : 0;
      if (a) img.set(x, y, [col[0], col[1], col[2], Math.round(a * 255 * strength)]);
    }
  return img;
}

export { sdCircle };
