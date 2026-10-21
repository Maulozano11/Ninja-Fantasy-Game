// Mockups of the d20 dice over the real battle screen, for the owner: frames captured from the game
// by dice-d20-capture.mjs (Akira strikes the Rogue), with the dice, the readout and the critical
// hit's beats laid over them exactly as the manifest describes (2x dice, 3x banner and damage).
//
//   node tools/ui/dice-d20-capture.mjs <capDir>
//   npx tsx tools/ui/dice-d20-mock.ts <capDir> <outDir>
//   python3 -I tools/ui/dice-d20-gif.py <outDir>        (each frame folder becomes a GIF)
//
// Writes <outDir>/<name>/NNN.png and <outDir>/<name>/frames.json (ms per frame) for
// estilo-A (gem), estilo-B (ivory), estilo-C (obsidian) and critico, plus estilos-comparacion.png.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng } from './ui-img';
import { renderText } from './ui-font';
import { GOLD20, StyleId, STYLES, gemKeys, recolour } from './dice-d20-art';
import {
  CLICK_FRAME, ROLL_FRAMES, SIZES, Size, dimDie, dustSprite, halo, nat1Frames, nat20Frames, popFrames, restDie, rollFrame, rollPath, shadowSprite,
} from './dice-d20-fx';
import { advTag, bannerFrames, burstFrames, damageNumber, maxTag, readout } from './dice-d20-crit';
import { diceGemRamp } from '../../src/sprite/diceGem';

const [capDir, outDir] = process.argv.slice(2);
if (!capDir || !outDir) throw new Error('usage: npx tsx tools/ui/dice-d20-mock.ts <capDir> <outDir>');
const meta = JSON.parse(readFileSync(join(capDir, 'meta.json'), 'utf8'));
const TINT: string = meta.actorChakra?.tint ?? meta.actorChakra?.color ?? 'orange';

// The part of the 1600x900 screen the GIFs show, and room around it for the camera shake.
const CROP = { x: 380, y: 130, w: 840, h: 560 };
const M = 10;
const TICK = 40;

// --- background frames ------------------------------------------------------------------------------

const cache = new Map<string, Img>();
function bg(seq: 'idle' | 'hit' | 'miss', i: number): Img {
  const files = readdirSync(join(capDir, seq)).filter((f) => f.endsWith('.png')).sort();
  const n = files.length;
  // Idle loops back and forth so its breathing never jumps.
  const k = seq === 'idle' ? (Math.floor(i / n) % 2 === 0 ? i % n : n - 1 - (i % n)) : Math.min(n - 1, i);
  const key = `${seq}/${k}`;
  let img = cache.get(key);
  if (!img) {
    img = loadPng(join(capDir, seq, files[k])).crop(CROP.x - M, CROP.y - M, CROP.w + 2 * M, CROP.h + 2 * M);
    cache.set(key, img);
  }
  return img;
}

// --- drawing helpers (screen pixels of the crop) ---------------------------------------------------------

/** Draws `src` scaled k times (nearest), its top-left at (x, y), with an opacity. */
function blit(dst: Img, src: Img, x: number, y: number, k = 1, alpha = 1): void {
  x = Math.round(x);
  y = Math.round(y);
  for (let sy = 0; sy < src.h; sy++)
    for (let sx = 0; sx < src.w; sx++) {
      const c = src.get(sx, sy);
      if (!c[3]) continue;
      const cc: RGBA = alpha >= 1 ? c : [c[0], c[1], c[2], Math.round(c[3] * alpha)];
      for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) dst.plot(x + sx * k + xx, y + sy * k + yy, cc);
    }
}
/** Draws `src` scaled k times with its centre at (cx, cy). */
const centred = (dst: Img, src: Img, cx: number, cy: number, k = 1, alpha = 1) => blit(dst, src, cx - (src.w * k) / 2, cy - (src.h * k) / 2, k, alpha);
function wash(dst: Img, col: RGBA, a: number): void {
  for (let i = 0; i < dst.px.length; i += 4) {
    dst.px[i] = Math.round(dst.px[i] + (col[0] - dst.px[i]) * a);
    dst.px[i + 1] = Math.round(dst.px[i + 1] + (col[1] - dst.px[i + 1]) * a);
    dst.px[i + 2] = Math.round(dst.px[i + 2] + (col[2] - dst.px[i + 2]) * a);
  }
}
const toCrop = (p: { x: number; y: number }) => ({ x: p.x - CROP.x, y: p.y - CROP.y });

/** A caption plaque (pixel font, 2x) at the top left of the GIF. */
function caption(dst: Img, lines: string[]): void {
  const imgs = lines.map((s, i) => renderText(s, i === 0 ? 'title' : 'label', { color: i === 0 ? hex('#f2c46d') : hex('#efe6cf'), outline: hex('#0b0805') }));
  const w = Math.max(...imgs.map((t) => t.w)) + 8, h = imgs.reduce((a, t) => a + t.h, 0) + 4;
  const p = new Img(w, h);
  p.fill([13, 10, 6, 215]);
  for (let x = 0; x < w; x++) {
    p.set(x, 0, hex('#8a6a3a'));
    p.set(x, h - 1, hex('#8a6a3a'));
  }
  for (let y = 0; y < h; y++) {
    p.set(0, y, hex('#8a6a3a'));
    p.set(w - 1, y, hex('#8a6a3a'));
  }
  let y = 2;
  for (const t of imgs) {
    p.draw(t, 4, y);
    y += t.h;
  }
  blit(dst, p, 12, 12, 2);
}

// --- dice per style ---------------------------------------------------------------------------------------

function tinted(style: StyleId, img: Img): Img {
  return style === 'gem' ? recolour(img, gemKeys(), diceGemRamp(TINT)) : img;
}

interface Die {
  result: number;
  /** Rest centre on the crop (screen px). */
  x: number;
  y: number;
  /** When it was thrown (ms on the scene clock). */
  t0: number;
  kept?: boolean;
  dropped?: boolean;
  /** Natural 20 / 1 effect plays after it lands. */
  fx?: boolean;
}

const K = 2; // the dice's screen scale
const throwMs = (size: Size) => rollPath(1, size).map((f) => f.ms);
const memo = new Map<string, Img>();
function cached(key: string, make: () => Img): Img {
  let v = memo.get(key);
  if (!v) memo.set(key, (v = make()));
  return v;
}

/** Draws one small die at scene time t (ms). */
function drawDie(dst: Img, style: StyleId, d: Die, t: number): { landed: boolean; restAt: number } {
  const path = rollPath(d.result, 'small');
  const ms = throwMs('small');
  const z = SIZES.small;
  const restAt = d.t0 + ms.slice(0, ROLL_FRAMES - 1).reduce((a, b) => a + b, 0);
  const el = t - d.t0;
  if (el < 0) return { landed: false, restAt };
  // Which throw frame is showing.
  let i = 0, acc = 0;
  while (i < ROLL_FRAMES - 1 && acc + ms[i] <= el) acc += ms[i++];
  const floorY = d.y + 15 * K;
  const fr = path[i];
  // Shadow, dust.
  const sh = cached(`sh${Math.round(fr.ground * 5)}`, () => shadowSprite(Math.round(z.R * 1.7 * [0.55, 0.65, 0.75, 0.85, 0.95, 1][Math.round(fr.ground * 5)])));
  centred(dst, sh, d.x + fr.dx * K, floorY + 2, K, 0.9);
  path.forEach((p, j) => {
    if (!p.contact) return;
    const at = d.t0 + ms.slice(0, j).reduce((a, b) => a + b, 0);
    const f = Math.floor((t - at) / 40);
    if (f >= 0 && f < 4) {
      const du = cached(`dust${p.contact}${f}`, () => dustSprite('small', p.contact!, f));
      blit(dst, du, d.x + p.dx * K - (du.w * K) / 2, floorY + 4 - du.h * K, K);
    }
  });
  const landed = i >= ROLL_FRAMES - 1;
  const sinceRest = t - restAt;
  // Halo under a landed die (kept dice and results).
  if (landed && !d.dropped) {
    const hk = Math.floor(sinceRest / 60);
    const gold = d.result === 20 && d.fx;
    if (hk < 4 || d.kept) {
      const hc = gold ? GOLD20[6] : style === 'gem' ? hex(diceGemRamp(TINT)[6]) : STYLES[style].halo;
      const h = cached(`halo${style}${gold}${Math.min(3, hk)}${d.kept}`, () => halo(Math.round(z.R * 3.2), z.R * 1.2, hc, d.kept && hk >= 3 ? 0.35 : [1, 0.7, 0.45, 0.2][Math.min(3, hk)]));
      centred(dst, h, d.x, d.y, K);
    }
  }
  if (!landed) {
    if (fr.trail && i > 0) {
      const pr = cached(`r${style}${d.result}${i - 1}`, () => tinted(style, rollFrame(d.result, i - 1, { style, size: 'small' }).img));
      centred(dst, pr, d.x + path[i - 1].dx * K, d.y + path[i - 1].dy * K, K, 0.35);
    }
    const im = cached(`r${style}${d.result}${i}`, () => tinted(style, rollFrame(d.result, i, { style, size: 'small' }).img));
    centred(dst, im, d.x + fr.dx * K, d.y + fr.dy * K, K);
    return { landed, restAt };
  }
  // Landed: natural 20/1 effect, or the pop, or rest (dimmed if advantage dropped it).
  if (d.fx && (d.result === 20 || d.result === 1)) {
    const fx = cached(`fx${style}${d.result}`, () => new Img(1, 1));
    void fx;
    const frames = d.result === 20 ? nat20Frames(style, 'small') : nat1Frames(style, 'small');
    let j = 0, a2 = 0;
    while (j < frames.length - 1 && a2 + frames[j].ms <= sinceRest) a2 += frames[j++].ms;
    const im = cached(`n${style}${d.result}${j}`, () => tinted(style, frames[j].img));
    centred(dst, im, d.x + (frames[j].dx ?? 0) * K, d.y, K);
    return { landed, restAt };
  }
  if (d.dropped && sinceRest > 120) {
    const im = cached(`dim${style}${d.result}`, () => tinted(style, dimDie(d.result, style, 'small')));
    centred(dst, im, d.x, d.y + 2, K);
    return { landed, restAt };
  }
  const pops = popFrames(d.result, style, 'small');
  let j = 0, a3 = 0;
  while (j < pops.length && a3 + pops[j].ms <= sinceRest) a3 += pops[j++].ms;
  const im = j < pops.length
    ? cached(`p${style}${d.result}${j}`, () => tinted(style, pops[j].img))
    : cached(`rest${style}${d.result}`, () => tinted(style, restDie(d.result, { style, size: 'small' }).img));
  centred(dst, im, d.x, d.y + (j < pops.length ? (pops[j].dy ?? 0) * K : 0), K);
  return { landed, restAt };
}

// --- scenes -------------------------------------------------------------------------------------------------

interface Frame {
  img: Img;
  ms: number;
}

const A = toCrop(meta.pos.actor), T = toCrop(meta.pos.target);
/** Where the small die rests: over the actor's head. */
const DIE = { x: A.x + 6, y: A.y - 144 };

interface SceneOpts {
  style: StyleId;
  title: string[];
  kind: 'normal' | 'nat20' | 'nat1' | 'adv';
}

function scene(o: SceneOpts): Frame[] {
  const frames: Frame[] = [];
  const st = o.style;
  const dice: Die[] =
    o.kind === 'adv'
      ? [
          { result: 8, x: DIE.x - 36, y: DIE.y, t0: 200, dropped: true },
          { result: 16, x: DIE.x + 36, y: DIE.y, t0: 240, kept: true },
        ]
      : [{ result: o.kind === 'nat20' ? 20 : o.kind === 'nat1' ? 1 : 14, x: DIE.x, y: DIE.y, t0: 200, fx: o.kind !== 'normal' }];
  const keptDie = dice.find((d) => !d.dropped)!;
  const restAt = keptDie.t0 + throwMs('small').slice(0, ROLL_FRAMES - 1).reduce((a, b) => a + b, 0);
  const mod = 5, ac = 14;
  const total = keptDie.result + mod;
  const ok = o.kind === 'nat20' ? true : o.kind === 'nat1' ? false : total >= ac;
  const ro = readout({ d20: keptDie.result, mod, total, vsLabel: 'CA', vs: ac, ok, nat: o.kind === 'nat20' ? 20 : o.kind === 'nat1' ? 1 : undefined });
  const crit = o.kind === 'nat20';
  // The beats (scene ms).
  const fxLen = crit ? 620 : o.kind === 'nat1' ? 520 : 0;
  const winAt = restAt + 120;
  const swingAt = crit ? winAt + 640 : restAt + Math.max(700, fxLen + 300);
  const IMPACT = 8; // the hit sequence's frame where the blade is in the target
  const impactAt = swingAt + IMPACT * TICK;
  const HITSTOP = 120;
  const end = impactAt + (crit ? 1300 : 900);
  const bigN20 = crit ? nat20Frames(st, 'big') : [];
  const banner = crit ? bannerFrames('¡CRÍTICO!') : null;
  const burst = crit ? burstFrames() : [];
  const seq: 'hit' | 'miss' = o.kind === 'nat1' ? 'miss' : 'hit';
  for (let t = 0; t <= end; t += TICK) {
    // The background: idle until the swing, then the strike (held still during the hit-stop).
    let src: Img;
    if (t < swingAt) src = bg('idle', Math.floor(t / TICK));
    else {
      let k = Math.floor((t - swingAt) / TICK);
      if (crit && t >= impactAt) k = t < impactAt + HITSTOP ? IMPACT : IMPACT + Math.floor((t - impactAt - HITSTOP) / TICK);
      src = bg(seq, k);
    }
    // The camera kick and shake after a critical's impact.
    let sx = 0, sy = 0;
    if (crit && t >= impactAt + 40 && t < impactAt + 300) {
      const k = Math.floor((t - impactAt - 40) / TICK);
      const kick = [6, 5, -4, 3, -2, 1, 0][k] ?? 0;
      sx = kick;
      sy = [-2, 3, -2, 1, -1, 0, 0][k] ?? 0;
    }
    const img = src.crop(M - sx, M - sy, CROP.w, CROP.h);
    // The big window's dimming.
    if (crit && t >= winAt && t < swingAt + 120) {
      const a = t < winAt + 80 ? 0.18 : t > swingAt - 40 ? 0.12 : 0.32;
      wash(img, [8, 6, 4, 255], a);
    }
    // Dice over the actor, then the readout, until the swing has played.
    const diceGone = t > swingAt + (crit ? 120 : 360);
    const fade = diceGone ? 0 : 1;
    if (fade > 0) {
      for (const d of dice) drawDie(img, st, d, t);
      if (o.kind === 'adv' && t >= dice[0].t0) {
        const tag = cached('advtag', () => advTag('VENTAJA', true));
        centred(img, tag, DIE.x, DIE.y - 48, K);
      }
      if (t >= restAt + 100) {
        const pop = t < restAt + 140 ? -2 : 0;
        blit(img, ro, DIE.x + (o.kind === 'adv' ? 74 : 38), DIE.y - 18 + pop, K);
      }
    }
    // The big window: the gold d20 and the banner (natural 20).
    if (crit && t >= winAt && t < swingAt + 80) {
      const el = t - winAt;
      let j = 0, acc = 0;
      while (j < bigN20.length - 1 && acc + bigN20[j].ms <= el) acc += bigN20[j++].ms;
      const fade = t > swingAt - 40 ? 0.4 : 1;
      const im = cached(`big${st}${j}`, () => tinted(st, bigN20[j].img));
      centred(img, im, CROP.w / 2, 150, K, fade);
    }
    if (crit && banner && t >= winAt + 80) {
      const el = t - winAt - 80;
      const closeAt = impactAt + 520 - winAt - 80;
      let j = 0;
      if (el < closeAt) {
        let acc = 0;
        while (j < banner.hold && acc + banner.frames[j].ms <= el) acc += banner.frames[j++].ms;
      } else j = el - closeAt < 40 ? banner.hold + 1 : el - closeAt < 80 ? banner.hold + 2 : -1;
      if (j >= 0 && j < banner.frames.length) centred(img, banner.frames[j].img, CROP.w / 2 - sx, 262 - sy, 3);
    }
    // Impact: the burst on the target, the flash, the maximum damage.
    if (crit && t >= impactAt) {
      const el = t - impactAt;
      const bj = Math.floor((el - 40) / 50);
      if (el >= 40 && bj < burst.length) centred(img, burst[bj].img, T.x + 4 + sx, T.y - 48 + sy, 1);
      if (el < 40) wash(img, hex('#fff6d6'), 0.55);
      else if (el < 80) wash(img, hex('#fff6d6'), 0.25);
      if (el >= 150) {
        const n = 27;
        const rise = Math.min(24, ((el - 150) / 900) * 24);
        const alpha = el > 1050 ? Math.max(0, 1 - (el - 1050) / 250) : 1;
        const white = el < 210;
        const num = cached(`dmg${white}`, () => damageNumber(n, white ? 'white' : 'gold'));
        const k = white ? 4 : 3;
        const nx = T.x + 6, ny = T.y - 132 - rise;
        centred(img, num, nx, ny, k, alpha);
        if (!white) {
          const tag = cached('max', () => maxTag('MÁX'));
          blit(img, tag, nx + (num.w * k) / 2 + 2, ny - 10, 2, alpha);
        }
      }
    }
    caption(img, o.title);
    frames.push({ img, ms: TICK });
  }
  return frames;
}

/** A short fade to black between scenes. */
function fadeOut(last: Img): Frame[] {
  return [0.35, 0.7, 1].map((a) => {
    const f = last.clone();
    wash(f, [6, 5, 4, 255], a);
    return { img: f, ms: TICK };
  });
}

function writeFrames(name: string, frames: Frame[]): void {
  const dir = join(outDir, name);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.png')) writeFileSync(join(dir, f), '');
  frames.forEach((f, i) => savePng(join(dir, String(i).padStart(3, '0') + '.png'), f.img));
  writeFileSync(join(dir, 'frames.json'), JSON.stringify({ ms: frames.map((f) => f.ms) }));
  console.log(`${name}: ${frames.length} frames`);
}

const STYLE_TITLE: Record<StyleId, string> = { gem: 'Estilo A - Gema (color del chakra)', ivory: 'Estilo B - Marfil y oro', obsidian: 'Estilo C - Obsidiana rúnica' };
const LETTER: Record<StyleId, string> = { gem: 'A', ivory: 'B', obsidian: 'C' };

const only = process.env.ONLY;
for (const st of ['gem', 'ivory', 'obsidian'] as StyleId[]) {
  if (only && only !== st && only !== 'styles') continue;
  const all: Frame[] = [];
  const parts: [SceneOpts['kind'], string][] = [
    ['normal', 'Tirada normal: 14 + 5 = 19 contra CA 14, acierta'],
    ['nat20', '20 natural: crítico automático y daño máximo'],
    ['nat1', '1 natural: el dado se raja, falla'],
    ['adv', 'Ventaja: dos dados, se queda el mayor'],
  ];
  for (const [kind, line] of parts) {
    const fr = scene({ style: st, kind, title: [STYLE_TITLE[st], line] });
    all.push(...fr, ...fadeOut(fr[fr.length - 1].img));
  }
  writeFrames(`estilo-${LETTER[st]}`, all);
}
if (!only || only === 'crit') {
  const fr = scene({ style: 'ivory', kind: 'nat20', title: ['Golpe crítico: 20 natural', 'Daño máximo: 2d8+3 se vuelve 4 x 8 + 3 = 35... aquí 27'] });
  writeFrames('critico', fr);
}
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
