// Proof sheets for the hydra rig (creatures.ts). Everything here reads the written sheets, the
// group manifest and creatures/hydra.json back from disk and assembles the boss exactly as the
// battle engine will: body at its anchor, each neck at body anchor + attach, back necks behind the
// body and front necks in front, the stump at the attach point of a severed head. If the rig data
// were wrong, these pictures would show it.
//
//   hydra-assembled.png  the whole hydra at 2x on a painted forest green, the character beside it
//   hydra-anims.png      strips of every animation (body, stump, venom, splash, two full necks)
//   hydra-anims-neckN.png every animation of each neck
//   hydra-sever.png      a head bitten off: sever, the stump raw and burnt, then a regrow
//   hydra-states.png     all heads, all stumps raw / burnt, and the death with burnt stumps riding along
//   hydra-zoom-*.png     4x crops of the heads, the body and the effects

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { CHARACTER_FEET, Canvas, Color, characterRef, fbm, hash, hex, mix, noise } from './kit';

// --- PNG ------------------------------------------------------------------------------------

/** Decodes an 8-bit RGBA or RGB, non-interlaced PNG (what the kit writes). */
export function readPng(path: string): Canvas {
  const buf = readFileSync(path);
  let p = 8;
  let w = 0, h = 0, ct = 6;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + n;
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = x;
      if (ft === 1) v = x + a;
      else if (ft === 2) v = x + b;
      else if (ft === 3) v = x + ((a + b) >> 1);
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      out[o] = cur[x * bpp];
      out[o + 1] = cur[x * bpp + 1];
      out[o + 2] = cur[x * bpp + 2];
      out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev.set(cur);
  }
  return new Canvas(w, h, out);
}

// --- sheets and rig -------------------------------------------------------------------------

interface SpriteSpec {
  label: string;
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  meters: [number, number];
  tags: string[];
  anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
}
interface Rig {
  body: string;
  stump: string;
  venom?: string;
  splash?: string;
  heads: { sprite: string; attach: [number, number]; layer: 'back' | 'front'; head: [number, number]; mouth: [number, number] }[];
  follow?: Record<string, [number, number][]>;
}

class Sheets {
  readonly specs: Record<string, SpriteSpec>;
  readonly rig: Rig;
  private cache = new Map<string, Canvas>();
  constructor(readonly dir: string) {
    this.specs = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).sprites;
    this.rig = JSON.parse(readFileSync(join(dir, 'hydra.json'), 'utf8'));
  }
  sheet(name: string): Canvas {
    let c = this.cache.get(name);
    if (!c) {
      c = readPng(join(this.dir, this.specs[name].file));
      this.cache.set(name, c);
    }
    return c;
  }
  frame(name: string, anim: string, k: number): Canvas {
    const s = this.specs[name];
    const a = s.anims[anim];
    const sh = this.sheet(name);
    const out = new Canvas(s.frameW, s.frameH);
    const kk = Math.min(k, a.frames - 1);
    for (let y = 0; y < s.frameH; y++)
      for (let x = 0; x < s.frameW; x++) out.set(x, y, sh.get(kk * s.frameW + x, a.row * s.frameH + y));
    return out;
  }
}

/** Draws a sprite frame with its anchor at (x, y). */
function put(dst: Canvas, S: Sheets, name: string, anim: string, k: number, x: number, y: number): void {
  const s = S.specs[name];
  dst.draw(S.frame(name, anim, k), x - s.anchor[0], y - s.anchor[1]);
}

interface HydraState {
  /** Body animation and frame. */
  body?: [string, number];
  /** Per head (rig order): [anim, frame], or 'stump-raw'/'stump-burnt' with a frame, plus an optional regrowing neck over a stump. */
  heads?: ({ anim: string; k: number; stump?: [string, number] } | null)[];
}

/** Assembles the hydra with its body anchor at (bx, by), like the battle engine. */
function assemble(dst: Canvas, S: Sheets, bx: number, by: number, st: HydraState = {}): void {
  const rig = S.rig;
  const [banim, bk] = st.body ?? ['idle', 0];
  const fo = rig.follow?.[banim]?.[bk] ?? [0, 0];
  const drawHead = (i: number) => {
    const h = rig.heads[i];
    const ax = bx + h.attach[0] + fo[0], ay = by + h.attach[1] + fo[1];
    const s = st.heads?.[i] ?? { anim: 'idle', k: 0 };
    if (!s) return;
    if (s.stump) put(dst, S, rig.stump, s.stump[0], s.stump[1], ax, ay);
    if (s.anim) put(dst, S, h.sprite, s.anim, s.k, ax, ay);
  };
  rig.heads.forEach((h, i) => h.layer === 'back' && drawHead(i));
  put(dst, S, rig.body, banim, bk, bx, by);
  rig.heads.forEach((h, i) => h.layer === 'front' && drawHead(i));
}

// --- painted backdrop -----------------------------------------------------------------------

/**
 * A misty painted forest green (like the battle stage behind the sprites): far trunks fading into
 * mist, dark canopy masses above, a hazy band of undergrowth at the tree line and a grass floor in
 * broad painted strokes. `gy` is the ground line the sprites stand on.
 */
function paintForest(w: number, h: number, gy: number): Canvas {
  const c = new Canvas(w, h);
  const horizon = gy - 150;
  const fog = hex('#7f9c80');
  const far = ['#3d5a43', '#46664b', '#527353'].map((x) => hex(x));
  const canopy = ['#1d3024', '#25402d', '#2e4d35', '#3a5d40'].map((x) => hex(x));
  const grass = ['#3e6132', '#476e39', '#517b41', '#5c8749', '#689251'].map((x) => hex(x));
  // Back layer: misty air with far trunks.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = Math.min(1, y / (horizon + 40));
      let col = mix(far[Math.min(2, Math.floor(fbm(x, y * 0.6, 30, 2, 3) * 3))], fog, 0.15 + 0.45 * t);
      // Far trunks: soft vertical bands, lighter on their left.
      const tw = 9 + Math.floor(hash(Math.floor(x / 53), 0, 17) * 8);
      const tx = (x % 53) - 20;
      if (hash(Math.floor(x / 53), 1, 17) > 0.35 && tx >= 0 && tx < tw && y < horizon + 40) col = mix(col, hex(tx < 2 ? '#4d6b50' : '#2a4231'), 0.55 * (1 - 0.6 * t));
      c.set(x, y, col);
    }
  // Canopy: dark leaf masses hanging from the top, in dabs.
  for (let y = 0; y < horizon; y++)
    for (let x = 0; x < w; x++) {
      const edge = 0.35 + 0.65 * (y / horizon) ** 1.4;
      const v = fbm(x * 0.8, y, 22, 3, 7);
      if (v < edge) continue;
      const lit = fbm(x + 4, y + 4, 9, 2, 8);
      c.set(x, y, canopy[Math.min(3, Math.floor((v - edge) * 6 + lit * 1.6))]);
    }
  // Undergrowth at the tree line, then the grass floor.
  for (let y = horizon - 30; y < h; y++)
    for (let x = 0; x < w; x++) {
      const bush = horizon + 18 - fbm(x, 0, 14, 3, 12) * 46;
      if (y < bush) continue;
      let col: Color;
      if (y < horizon + 30) col = mix(canopy[1 + Math.floor(fbm(x, y, 7, 2, 14) * 2.5)], fog, 0.25);
      else {
        const t = (y - horizon) / (h - horizon);
        const v = fbm(x * 0.35, y * 1.6, 18, 3, 11) * 0.8 + (1 - t) * 0.25 + noise(x, y, 3, 13) * 0.1;
        col = grass[Math.max(0, Math.min(4, Math.floor(v * 4.2)))];
      }
      c.set(x, y, col);
    }
  // Mist band at the tree line.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const md = Math.abs(y - (horizon + 22)) / 60;
      if (md >= 1) continue;
      c.set(x, y, mix(c.get(x, y), hex('#a3bd9f'), 0.42 * (1 - md) * (0.6 + 0.4 * fbm(x, y, 28, 2, 21))));
    }
  return c;
}

// --- tiny pixel font for labels ---------------------------------------------------------------

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '010101101101010', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100110101010', '7': '111001010010010', '8': '010101010101010', '9': '010101011001110',
  ' ': '000000000000000', _: '000000000000111', '-': '000000111000000', '.': '000000000000010', '/': '001001010100100', ':': '000010000010000',
  '(': '010100100100010', ')': '010001001001010', ',': '000000000010100',
};
function label(c: Canvas, x: number, y: number, text: string, col: Color = hex('#e8f0d8')): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] ?? FONT[' '];
    for (let k = 0; k < 15; k++) if (g[k] === '1') c.set(cx + (k % 3), y + Math.floor(k / 3), col);
    cx += 4;
  }
}

// --- strips ---------------------------------------------------------------------------------

/** Union of the opaque bounds of an animation's frames (so a strip is cropped tight). */
function animBounds(S: Sheets, name: string, anim: string): [number, number, number, number] {
  const a = S.specs[name].anims[anim];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < a.frames; k++) {
    const b = S.frame(name, anim, k).bounds();
    if (!b) continue;
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3]);
  }
  return isFinite(x0) ? [x0 - 1, y0 - 1, x1 + 1, y1 + 1] : [0, 0, 1, 1];
}

/** Strips of animations, wrapped at maxW, each frame on a flat stage tile with its anchor marked. */
function strips(S: Sheets, rows: [string, string][], maxW = 1500): Canvas {
  const pad = 6, gap = 3, lab = 9;
  type Line = { name: string; anim: string; b: [number, number, number, number]; ks: number[]; title: boolean };
  const lines: Line[] = [];
  for (const [name, anim] of rows) {
    const b = animBounds(S, name, anim);
    const fw = b[2] - b[0] + 1;
    const per = Math.max(1, Math.floor((maxW - pad * 2) / (fw + gap)));
    const n = S.specs[name].anims[anim].frames;
    for (let k0 = 0; k0 < n; k0 += per) lines.push({ name, anim, b, ks: Array.from({ length: Math.min(per, n - k0) }, (_, j) => k0 + j), title: k0 === 0 });
  }
  const H = lines.reduce((t, l) => t + (l.title ? lab : 0) + (l.b[3] - l.b[1] + 1) + pad, pad);
  const W = Math.max(...lines.map((l) => pad * 2 + l.ks.length * (l.b[2] - l.b[0] + 1 + gap)));
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#33402f'));
  let y = pad;
  for (const l of lines) {
    const s = S.specs[l.name], a = s.anims[l.anim];
    if (l.title) {
      label(out, pad, y, `${l.name} ${l.anim}  ${a.frames}F ${a.fps}FPS ${a.loop ? 'LOOP' : 'ONCE'}`);
      y += lab;
    }
    const fw = l.b[2] - l.b[0] + 1, fh = l.b[3] - l.b[1] + 1;
    l.ks.forEach((k, j) => {
      const x = pad + j * (fw + gap);
      out.fillRect(x, y, fw, fh, hex('#4f6b47'));
      // Ground line through the anchor.
      const gyy = y + s.anchor[1] - l.b[1];
      if (gyy >= y && gyy < y + fh) out.fillRect(x, gyy, fw, 1, hex('#5d7a52'));
      const fr = S.frame(l.name, l.anim, k);
      const tile = new Canvas(fw, fh);
      tile.draw(fr, -l.b[0], -l.b[1]);
      out.draw(tile, x, y);
      // Anchor mark.
      const axx = x + s.anchor[0] - l.b[0];
      if (axx >= x && axx < x + fw && gyy >= y && gyy < y + fh) out.set(axx, gyy, hex('#ff4fd8'));
    });
    y += fh + pad;
  }
  return out;
}

// --- deliverables ---------------------------------------------------------------------------

export function deliverables(root: string, outDir: string): void {
  const S = new Sheets(join(root, 'creatures'));
  const rig = S.rig;
  const body = S.specs[rig.body];

  // Extent of the assembled hydra around its body anchor (idle frame 0 of everything).
  let x0 = -body.anchor[0], y0 = -body.anchor[1], x1 = body.frameW - body.anchor[0], y1 = body.frameH - body.anchor[1];
  for (const h of rig.heads) {
    const s = S.specs[h.sprite];
    const b = S.frame(h.sprite, 'idle', 0).bounds()!;
    x0 = Math.min(x0, h.attach[0] - s.anchor[0] + b[0]);
    y0 = Math.min(y0, h.attach[1] - s.anchor[1] + b[1]);
    x1 = Math.max(x1, h.attach[0] - s.anchor[0] + b[2]);
    y1 = Math.max(y1, h.attach[1] - s.anchor[1] + b[3]);
  }

  // 1. The assembled hydra with the character beside it, 2x.
  {
    const ref = characterRef();
    const margin = 36;
    const W = x1 - x0 + margin * 3 + 80, H = y1 - y0 + margin * 2 + 20;
    const bx = margin - x0, by = margin - y0;
    // Measure the real silhouette (opaque pixels) from the ground row under the body anchor.
    const solo = new Canvas(W, H);
    assemble(solo, S, bx, by);
    const sb = solo.bounds(200)!;
    const c = paintForest(W, H, by);
    c.draw(solo, 0, 0);
    c.draw(ref, sb[2] + 28 - CHARACTER_FEET[0] + 40, by - CHARACTER_FEET[1] + 6);
    const tall = (by - sb[1] + 1) / 57, wide = (sb[2] - sb[0] + 1) / 57;
    label(c, 6, H - 10, `HYDRA ${tall.toFixed(2)} M TALL (TOP HEAD), ${wide.toFixed(2)} M WIDE. CHARACTER 1.75 M`);
    console.log(`assembled hydra: ${tall.toFixed(2)} m tall from the ground row, ${wide.toFixed(2)} m wide (${by - sb[1] + 1} x ${sb[2] - sb[0] + 1} px)`);
    c.scaled(2).save(join(outDir, 'hydra-assembled.png'));
    // Zoomed crops (4x) for judging pixels: the top heads and the body on the ground.
    const crop = (x: number, y: number, w: number, h: number): Canvas => {
      const z = new Canvas(w, h);
      z.draw(c, -x, -y);
      return z.scaled(4);
    };
    crop(bx - 120, sb[1] - 4, 250, 130).save(join(outDir, 'hydra-zoom-heads.png'));
    crop(sb[0] - 4, by - 120, 340, 130).save(join(outDir, 'hydra-zoom-body.png'));
  }

  // Zoomed effects (4x): stump raw and burnt, the venom gob, the splash.
  {
    const rows: [string, string][] = [];
    for (const name of [rig.stump, rig.venom, rig.splash]) if (name) for (const a of Object.keys(S.specs[name].anims)) rows.push([name, a]);
    strips(S, rows, 700).scaled(4).save(join(outDir, 'hydra-zoom-fx.png'));
  }

  // 2. Strips of every animation (2x): body, stump, venom, splash and two full necks; one file per neck.
  {
    const rows: [string, string][] = [];
    for (const name of [rig.body, rig.stump, rig.venom, rig.splash]) if (name) for (const a of Object.keys(S.specs[name].anims)) rows.push([name, a]);
    const showcase = [rig.heads[0].sprite, rig.heads[rig.heads.length - 1].sprite];
    for (const name of showcase) for (const a of Object.keys(S.specs[name].anims)) rows.push([name, a]);
    strips(S, rows, 1700).scaled(2).save(join(outDir, 'hydra-anims.png'));
    rig.heads.forEach((h, i) => {
      const r: [string, string][] = Object.keys(S.specs[h.sprite].anims).map((a) => [h.sprite, a]);
      strips(S, r, 1700).scaled(2).save(join(outDir, `hydra-anims-neck${i + 1}.png`));
    });
  }

  // 3. A head bitten off: sever (the stump shows from the first frame), the stump raw and burnt,
  // then a regrow out of the raw stump. Panels crop the assembled hydra around that neck.
  {
    const hi = rig.heads.length - 1; // the low front head on the right
    const h = rig.heads[hi];
    const ns = S.specs[h.sprite];
    const sever = animBounds(S, h.sprite, 'sever');
    const pw = sever[2] - sever[0] + 1 + 30, ph = sever[3] - sever[1] + 1 + 30;
    type Panel = { title: string; heads: HydraState['heads'] };
    const others = (st: { anim: string; k: number; stump?: [string, number] } | null) => rig.heads.map((_, i) => (i === hi ? st : { anim: 'idle', k: 0 }));
    const panels: Panel[] = [];
    for (let k = 0; k < ns.anims.sever.frames; k++) panels.push({ title: `SEVER ${k}`, heads: others({ anim: 'sever', k, stump: ['raw', k % 4] }) });
    for (let k = 0; k < 4; k++) panels.push({ title: `STUMP RAW ${k}`, heads: others({ anim: '', k: 0, stump: ['raw', k] }) });
    for (let k = 0; k < 4; k++) panels.push({ title: `STUMP BURNT ${k}`, heads: others({ anim: '', k: 0, stump: ['burnt', k] }) });
    for (let k = 0; k < ns.anims.regrow.frames; k++) panels.push({ title: `REGROW ${k}`, heads: others({ anim: 'regrow', k, stump: ['raw', k % 4] }) });
    const cols = 8, gap = 4;
    const W = cols * (pw + gap) + gap, H = Math.ceil(panels.length / cols) * (ph + gap + 9) + gap;
    const out = new Canvas(W, H);
    out.fillRect(0, 0, W, H, hex('#2b3527'));
    // The panel window: the sever frame box around the neck anchor, in assembled coordinates.
    const bigW = x1 - x0 + 400, bigH = y1 - y0 + 400;
    const bx = 200 - x0, by = 200 - y0;
    const backdrop = paintForest(bigW, bigH, by);
    const nax = bx + h.attach[0], nay = by + h.attach[1];
    const wx = nax - ns.anchor[0] + sever[0] - 15, wy = nay - ns.anchor[1] + sever[1] - 15;
    panels.forEach((p, i) => {
      const big = backdrop.clone();
      assemble(big, S, bx, by, { heads: p.heads });
      const px = gap + (i % cols) * (pw + gap), py = gap + Math.floor(i / cols) * (ph + gap + 9);
      label(out, px, py, p.title);
      const tile = new Canvas(pw, ph);
      tile.draw(big, -wx, -wy);
      out.draw(tile, px, py + 8);
    });
    out.scaled(2).save(join(outDir, 'hydra-sever.png'));
  }

  // 4. Whole-boss states: every head, every stump raw or burnt, the death with the stumps following
  // the body (rig.follow) so nothing floats when the chest collapses.
  {
    const margin = 24;
    const pw = x1 - x0 + margin * 2, ph = y1 - y0 + margin * 2 + 30;
    const bx = margin - x0, by = margin - y0;
    const all = (st: { anim: string; k: number; stump?: [string, number] }) => rig.heads.map(() => st);
    const deathN = S.specs[rig.body].anims.death.frames;
    const panels: { title: string; st: HydraState }[] = [
      { title: 'ALL HEADS (IDLE 0)', st: {} },
      { title: 'ALL STUMPS RAW', st: { heads: all({ anim: '', k: 0, stump: ['raw', 0] }) } },
      { title: 'ALL STUMPS BURNT', st: { heads: all({ anim: '', k: 0, stump: ['burnt', 0] }) } },
      ...[0, Math.floor(deathN / 2), deathN - 1].map((k) => ({ title: `DEATH ${k} + BURNT STUMPS`, st: { body: ['death', k] as [string, number], heads: all({ anim: '', k: 0, stump: ['burnt', k % 4] }) } })),
    ];
    const cols = 3, gap = 4;
    const out = new Canvas(cols * (pw + gap) + gap, Math.ceil(panels.length / cols) * (ph + gap + 9) + gap);
    out.fillRect(0, 0, out.w, out.h, hex('#2b3527'));
    const backdrop = paintForest(pw, ph, by);
    panels.forEach((p, i) => {
      const tile = backdrop.clone();
      assemble(tile, S, bx, by, p.st);
      const px = gap + (i % cols) * (pw + gap), py = gap + Math.floor(i / cols) * (ph + gap + 9);
      label(out, px, py, p.title);
      out.draw(tile, px, py + 8);
    });
    out.scaled(2).save(join(outDir, 'hydra-states.png'));
  }
}
