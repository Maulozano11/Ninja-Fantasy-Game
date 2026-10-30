// Tests for the elemental jutsu effects in a chakra colour (vfxTint.ts), on the owner's own sheets: npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';
import { tintPal } from './chakra';
import { rgbToHsl } from './color';
import { isTintElement, tintVfx, TINT_ELEMENTS, vfxTintColors, vfxTintIsNatural, vfxTintOf } from './vfxTint';
import type { TintElement } from './vfxTint';

/** Decodes an 8-bit RGBA, non-interlaced PNG (what the sheet tools write). */
function readPng(path: URL): { w: number; h: number; rgba: Uint8Array } {
  const buf = readFileSync(path);
  let p = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      assert.equal(data[9], 6, `${path}: RGBA`);
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + n;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const s = w * 4;
  const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (s + 1)];
    for (let x = 0; x < s; x++) {
      const v = raw[y * (s + 1) + 1 + x];
      const a = x >= 4 ? px[y * s + x - 4] : 0;
      const b = y > 0 ? px[(y - 1) * s + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0;
      const q = a + b - c;
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0;
      px[y * s + x] = (v + pred) & 255;
    }
  }
  return { w, h, rgba: px };
}

type Img = { w: number; h: number; rgba: Uint8Array };
const sheets = new Map<string, Img>();
/** One of his sheets: `vfx_<element>/<name>.png`, or the beast's (`vfx_beasts/<element>.png`). */
function sheet(el: TintElement, name: string): Img {
  const file = name === 'beast' ? `vfx_beasts/${el}.png` : `vfx_${el}/${name}.png`;
  if (!sheets.has(file)) sheets.set(file, readPng(new URL(`../assets/world/${file}`, import.meta.url)));
  return sheets.get(file)!;
}
/** One frame of a sprite, cut from its sheet by its manifest (the big signature sheets go a frame at a time). */
function frame(el: TintElement, name: string, anim: string, f: number): Img {
  const m = JSON.parse(readFileSync(new URL(`../assets/world/vfx_${el}/manifest.json`, import.meta.url), 'utf8')).sprites[name];
  const s = sheet(el, name);
  const { frameW: w, frameH: h } = m;
  const row = m.anims[anim].row;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) rgba.set(s.rgba.subarray(((row * h + y) * s.w + f * w) * 4, ((row * h + y) * s.w + f * w + w) * 4), y * w * 4);
  return { w, h, rgba };
}
const SHEETS = ['bolt', 'hit', 'beast'];
const tint = (el: TintElement, name: string, color: string | undefined) => {
  const s = sheet(el, name);
  return tintVfx(s.rgba, el, color, { width: s.w, height: s.h, beast: name === 'beast' });
};

const CHAKRA = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'white', 'black', 'brown'];
/** His sheets' own colours: these leave them as he drew them. Brown is the Earth burst's colour. */
const NATURAL: Record<TintElement, { set: string[]; beast: string[] }> = {
  fire: { set: ['red', 'orange'], beast: ['red', 'orange'] },
  water: { set: ['blue'], beast: ['blue'] },
  wind: { set: ['green'], beast: ['green'] },
  lightning: { set: ['blue'], beast: ['yellow'] },
  earth: { set: ['brown'], beast: ['brown'] },
};
const own = (el: TintElement, name: string) => NATURAL[el][name === 'beast' ? 'beast' : 'set'];
const changing = (el: TintElement, name: string) => CHAKRA.filter((c) => !own(el, name).includes(c));
/** Some of his dark line colours (each sheet's outline, as his palettes label it). */
const LINES: Record<TintElement, { set: string[]; beast: string[] }> = {
  fire: { set: ['#3c0d0d', '#53120f', '#470807', '#24141a', '#361921'], beast: ['#2f0e13'] },
  water: { set: ['#0e263b'], beast: ['#01071a'] },
  wind: { set: ['#0c211f', '#041c17', '#000a00'], beast: ['#234a49', '#020a10'] },
  lightning: { set: ['#1c3aa8', '#262268'], beast: ['#573213'] },
  earth: { set: ['#3e2920', '#3d2920', '#442410'], beast: ['#191519'] },
};
const hex = (r: number, g: number, b: number) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
const lumaOf = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const same = (a: Uint8Array, b: Uint8Array, i: number) => a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2];
const pct = (xs: number[], q: number) => xs[Math.min(xs.length - 1, Math.floor(xs.length * q))];
// Buffers are compared by identity or by a count, never with deepEqual on a whole sheet (its diff can take gigabytes).

describe('elemental jutsu in a chakra colour', () => {
  it('Natural, the sheet\'s own colour, a hair off it and unknown colours give back his pixels, byte for byte', () => {
    for (const el of TINT_ELEMENTS)
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const copy = Buffer.from(s.rgba);
        for (const c of [undefined, '', ...own(el, name), 'not-a-colour', 'chartreuse']) {
          assert.ok(tint(el, name, c) === s.rgba, `${el}/${name} ${c}: the same buffer`);
          assert.ok(vfxTintIsNatural(el, c, { beast: name === 'beast' }), `${el}/${name} ${c}: natural`);
        }
        assert.ok(copy.equals(s.rgba), `${el}/${name}: his sheet is never written`);
      }
    const s = sheet('fire', 'bolt');
    const size = { width: s.w, height: s.h };
    // His colour's hex, in either case, and a custom colour a hair off it.
    assert.ok(tintVfx(s.rgba, 'fire', '#E8321E', size) === s.rgba);
    assert.ok(tintVfx(s.rgba, 'fire', '#e5351e', size) === s.rgba);
    const w = sheet('water', 'bolt');
    assert.ok(tintVfx(w.rgba, 'water', '#36a0f0', { width: w.w, height: w.h }) === w.rgba);
    assert.ok(tintVfx(w.rgba, 'water', '#3aa0f0', { width: w.w, height: w.h }) === w.rgba);
    // Brown is earth's own colour only: fire, water, wind and lightning take it.
    for (const el of ['fire', 'water', 'wind', 'lightning'] as const) assert.ok(!vfxTintIsNatural(el, 'brown'), `${el}: brown recolours`);
    assert.ok(vfxTintIsNatural('earth', 'brown') && vfxTintIsNatural('earth', '#9a6a36', { beast: true }));
    // Kirin is blue lightning: blue leaves it his.
    assert.ok(vfxTintIsNatural('lightning', 'blue', { sprite: 'kirin_enh' }) && !vfxTintIsNatural('lightning', 'yellow', { sprite: 'kirin' }));
    // The colour is the chakra's tint: the burst (its type) alone changes nothing.
    assert.equal(vfxTintOf({ tint: undefined }), undefined);
    assert.equal(vfxTintOf({ tint: 'green' }), 'green');
    assert.equal(vfxTintOf(undefined), undefined);
    // The battle's element type has more members than the five that take a colour.
    assert.ok(isTintElement('fire') && isTintElement('earth') && !isTintElement('genjutsu') && !isTintElement('poison'));
    assert.throws(() => tintVfx(s.rgba, 'fire', 'green', { width: s.w + 1, height: s.h }), RangeError);
  });

  it('every other colour recolours, keeps every alpha, and never touches his dark line', () => {
    for (const el of TINT_ELEMENTS) {
      let line = 0;
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const before = Buffer.from(s.rgba);
        const lines = new Set(LINES[el][name === 'beast' ? 'beast' : 'set']);
        for (const c of [...changing(el, name), '#ff00aa', '#120a08', '#000000', '#ffffff', '#c4f']) {
          const out = tint(el, name, c);
          assert.ok(out !== s.rgba, `${el}/${name} ${c}: a new buffer`);
          assert.equal(out.length, s.rgba.length);
          let moved = 0;
          for (let i = 0; i < s.rgba.length; i += 4) {
            if (out[i + 3] !== s.rgba[i + 3]) assert.fail(`${el}/${name} ${c}: alpha at ${i / 4}`);
            if (!s.rgba[i + 3]) continue;
            const [r, g, b] = [s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]];
            if (lines.has(hex(r, g, b)) || rgbToHsl(r, g, b)[2] <= 0.1) {
              line++;
              if (!same(out, s.rgba, i)) assert.fail(`${el}/${name} ${c}: line ${hex(r, g, b)} became ${hex(out[i], out[i + 1], out[i + 2])}`);
            } else if (!same(out, s.rgba, i)) moved++;
          }
          assert.ok(moved > 0, `${el}/${name} ${c}: something changed`);
        }
        assert.ok(before.equals(s.rgba), `${el}/${name}: his sheet is never written`);
      }
      assert.ok(line > 0, `${el}: his line was there to keep`);
    }
  });

  it('the element\'s middle tones turn to the chakra colour\'s hue', () => {
    const MID: Record<TintElement, number> = { fire: 0.561, water: 0.529, wind: 0.446, lightning: 0.3, earth: 0.394 };
    for (const el of TINT_ELEMENTS)
      for (const c of changing(el, 'bolt').filter((c) => c !== 'white' && c !== 'black')) {
        const s = sheet(el, 'bolt');
        const out = tint(el, 'bolt', c);
        const want = rgbToHsl(...tintPal(c)[2])[0];
        let x = 0;
        let y = 0;
        let n = 0;
        for (let i = 0; i < s.rgba.length; i += 4) {
          const [r, g, b] = [s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]];
          if (s.rgba[i + 3] < 32 || Math.abs(lumaOf(r, g, b) - MID[el]) > 0.04 || rgbToHsl(r, g, b)[1] < 0.3 || same(out, s.rgba, i)) continue;
          const [h, sat] = rgbToHsl(out[i], out[i + 1], out[i + 2]);
          x += Math.cos((h * Math.PI) / 180) * sat;
          y += Math.sin((h * Math.PI) / 180) * sat;
          n++;
        }
        assert.ok(n > 20, `${el} ${c}: ${n} middle-tone pixels`);
        const got = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        assert.ok(hueGap(got, want) < 20, `${el} ${c}: hue ${Math.round(got)}, want ${Math.round(want)}`);
      }
  });

  it('his values stay his: dark pools stay dark, the light stays where he put it, no core burns out to pure white', () => {
    for (const el of TINT_ELEMENTS)
      for (const name of [...SHEETS, 'blast', 'wall']) {
        // The blast's peak and a frame of the standing wall (their whole sheets are big).
        const big = name === 'blast' ? frame(el, name, 'blast', el === 'lightning' ? 5 : 7) : name === 'wall' ? frame(el, name, 'idle', 2) : null;
        const s = big ?? sheet(el, name);
        let hisWhite = 0;
        for (let i = 0; i < s.rgba.length; i += 4) if (s.rgba[i + 3] && s.rgba[i] === 255 && s.rgba[i + 1] === 255 && s.rgba[i + 2] === 255) hisWhite++;
        for (const c of changing(el, name).filter((c) => c !== 'white' && c !== 'black')) {
          const out = big ? tintVfx(s.rgba, el, c, { width: s.w, height: s.h }) : tint(el, name, c);
          const his: number[] = [];
          const ours: number[] = [];
          let white = 0;
          let darkOff = 0;
          let dark = 0;
          for (let i = 0; i < s.rgba.length; i += 4) {
            if (s.rgba[i + 3] < 160 || same(out, s.rgba, i)) continue;
            const a = lumaOf(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]);
            const b = lumaOf(out[i], out[i + 1], out[i + 2]);
            his.push(a);
            ours.push(b);
            if (out[i] === 255 && out[i + 1] === 255 && out[i + 2] === 255) white++;
            if (a < 0.25) {
              dark++;
              if (Math.abs(b - a) > 0.04) darkOff++;
            }
          }
          his.sort((a, b) => a - b);
          ours.sort((a, b) => a - b);
          for (const q of [0.1, 0.5, 0.9]) assert.ok(Math.abs(pct(ours, q) - pct(his, q)) < 0.12, `${el}/${name} ${c}: luma p${q * 100} ${pct(ours, q).toFixed(2)}, his ${pct(his, q).toFixed(2)}`);
          assert.ok(white <= hisWhite, `${el}/${name} ${c}: ${white} pure white pixels, his ${hisWhite}`);
          assert.ok(darkOff <= dark * 0.02, `${el}/${name} ${c}: ${darkOff} of ${dark} dark pixels lost their value`);
        }
      }
  });

  it('smoke, dust, debris, moss and the stone drake\'s eyes keep his colours', () => {
    const kept = (el: TintElement, name: string, test: (r: number, g: number, b: number, a: number) => boolean, min: number) => {
      const s = sheet(el, name);
      let n = 0;
      for (const c of ['red', 'blue', 'violet', 'white', 'black'].filter((c) => !own(el, name).includes(c))) {
        const out = tint(el, name, c);
        n = 0;
        for (let i = 0; i < s.rgba.length; i += 4) {
          if (!s.rgba[i + 3] || !test(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2], s.rgba[i + 3])) continue;
          n++;
          if (!same(out, s.rgba, i)) assert.fail(`${el}/${name} ${c}: ${hex(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2])} became ${hex(out[i], out[i + 1], out[i + 2])}`);
        }
      }
      assert.ok(n >= min, `${el}/${name}: ${n} pixels checked`);
    };
    const hsl = (r: number, g: number, b: number) => rgbToHsl(r, g, b);
    // The wind wall's taupe dust and the fireball's grey smoke (off the element's hue, or grey).
    kept('wind', 'wall', (r, g, b) => (r === 127 && g === 119 && b === 100) || (r === 99 && g === 94 && b === 76), 50);
    kept('fire', 'fireball', (r, g, b) => hsl(r, g, b)[1] < 0.2 && hsl(r, g, b)[2] < 0.6, 500);
    // Earth's see-through dust cloud, its moss, and the drake's yellow eyes.
    kept('earth', 'blast', (_r, _g, _b, a) => a < 255, 1000);
    kept('earth', 'wall', (r, g, b) => hsl(r, g, b)[0] >= 70 && hsl(r, g, b)[0] <= 140 && hsl(r, g, b)[1] >= 0.2 && hsl(r, g, b)[2] < 0.6, 1000);
    kept('earth', 'beast', (r, g, b) => (r === 231 && g === 201 && b === 95) || (r === 249 && g === 228 && b === 90) || (r === 217 && g === 214 && b === 90), 4);
    // Lightning's grey rock debris and beige sparks.
    kept('lightning', 'blast', (r, g, b) => ['#645c53', '#8c8680', '#7b6d57', '#a79b7d'].includes(hex(r, g, b)), 20);
  });

  it('black stays dark with its steps, a rim along the air, a flash in the strike and a red heart in fire', () => {
    const RIM = tintPal('black')[3];
    for (const el of TINT_ELEMENTS)
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const out = tint(el, name, 'black');
        // His body (solid, not his light) turns dark, apart from the rim along its edge.
        let body = 0;
        let dark = 0;
        let rim = 0;
        const steps = new Set<number>();
        const hisSteps = new Set<number>();
        for (let i = 0; i < s.rgba.length; i += 4) {
          if (s.rgba[i + 3] < 160 || same(out, s.rgba, i)) continue;
          const l = rgbToHsl(out[i], out[i + 1], out[i + 2])[2];
          if (out[i] === RIM[0] && out[i + 1] === RIM[1] && out[i + 2] === RIM[2]) rim++;
          const y = lumaOf(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]);
          if (y >= 0.55) continue;
          body++;
          hisSteps.add(Math.round(y * 20));
          if (l < 0.25) {
            dark++;
            steps.add(Math.round(l * 40));
          }
        }
        assert.ok(dark / body > 0.5, `${el}/${name}: ${Math.round((100 * dark) / body)}% of the body dark`);
        assert.ok(steps.size >= Math.min(4, hisSteps.size), `${el}/${name}: ${steps.size} dark steps for his ${hisSteps.size}`);
        assert.ok(rim > 20, `${el}/${name}: ${rim} violet rim pixels`);
      }
    // The strike's bright flash stays bright, and its wide faint ground glow stays dark.
    const strike = frame('lightning', 'blast', 'blast', 5);
    const out = tintVfx(strike.rgba, 'lightning', 'black', { width: strike.w, height: strike.h });
    let flash = 0;
    let lit = 0;
    let ground = 0;
    let glowing = 0;
    for (let i = 0; i < out.length; i += 4) {
      if (!strike.rgba[i + 3]) continue;
      const l = rgbToHsl(out[i], out[i + 1], out[i + 2])[2];
      if (strike.rgba[i + 3] >= 160 && lumaOf(strike.rgba[i], strike.rgba[i + 1], strike.rgba[i + 2]) > 0.75) {
        flash++;
        if (l >= 0.4) lit++;
      }
      if (strike.rgba[i + 3] === 140) {
        ground++;
        if (l >= 0.35) glowing++;
      }
    }
    assert.ok(flash > 100 && lit / flash > 0.9, `strike flash: ${lit} of ${flash} bright`);
    assert.ok(ground > 100 && glowing / ground < 0.2, `strike ground: ${glowing} of ${ground} glowing`);
    // A fireball's heart burns toward the black chakra's red accent (crimson, not violet).
    const fb = tint('fire', 'fireball', 'black');
    let hot = 0;
    for (let i = 0; i < fb.length; i += 4) {
      const [h, sat, l] = rgbToHsl(fb[i], fb[i + 1], fb[i + 2]);
      if (fb[i + 3] && hueGap(h, 345) < 25 && sat > 0.4 && l > 0.3) hot++;
    }
    assert.ok(hot > 500, `fireball heart: ${hot} crimson pixels`);
  });

  it('a black rim follows the air and his outline, not smoke or the edges of a frame; a speck glows', () => {
    // Two 6 x 6 frames side by side, filled with a mid fire colour; an empty column on the far left,
    // grey smoke along the bottom row of the left frame, and a lone 2 x 2 speck in the right frame.
    const W = 12;
    const H = 6;
    const src = new Uint8ClampedArray(W * H * 4);
    const set = (x: number, y: number, c: number[]) => src.set(c, (y * W + x) * 4);
    for (let y = 0; y < 4; y++) for (let x = 1; x < W; x++) set(x, y, [242, 115, 28, 255]);
    for (let x = 1; x < 6; x++) set(x, 4, [96, 90, 86, 255]);
    for (const [x, y] of [[8, 5], [9, 5]]) set(x, y, [242, 115, 28, 255]);
    const out = tintVfx(src, 'fire', 'black', { width: W, height: H, frameW: 6, frameH: 6 });
    const at = (x: number, y: number) => Array.from(out.subarray((y * W + x) * 4, (y * W + x) * 4 + 3)) as [number, number, number];
    const rim = Array.from(tintPal('black')[3]);
    assert.deepEqual(at(1, 1), rim, 'next to the air: the rim');
    assert.deepEqual(at(7, 3), rim, 'above the air: the rim');
    assert.notDeepEqual(at(3, 3), rim, 'on the smoke: no rim');
    assert.deepEqual(at(3, 4), [96, 90, 86], 'the smoke stays his');
    assert.notDeepEqual(at(5, 1), rim, 'on the frame seam: no rim');
    assert.notDeepEqual(at(6, 1), rim, 'on the frame seam: no rim');
    assert.notDeepEqual(at(11, 1), rim, 'on the sheet edge: no rim');
    assert.ok(rgbToHsl(...at(4, 2))[2] < 0.25, 'inside: dark');
    assert.ok(rgbToHsl(...at(8, 5))[2] >= 0.3, 'a speck glows');
  });

  it('white and very light or very dark custom colours keep their shading', () => {
    for (const el of TINT_ELEMENTS)
      for (const name of SHEETS)
        for (const c of ['white', '#ffffff', '#f8f4ff', '#000000', '#202020', '#1a0b22']) {
          const s = sheet(el, name);
          const out = tint(el, name, c);
          const lumas: number[] = [];
          const colours = new Set<number>();
          let lit = 0;
          for (let i = 0; i < s.rgba.length; i += 4) {
            if (s.rgba[i + 3] < 160 || same(out, s.rgba, i)) continue;
            const y = lumaOf(out[i], out[i + 1], out[i + 2]);
            lumas.push(y);
            colours.add((out[i] << 16) | (out[i + 1] << 8) | out[i + 2]);
            if (rgbToHsl(out[i], out[i + 1], out[i + 2])[2] >= 0.45) lit++;
          }
          lumas.sort((a, b) => a - b);
          const spread = pct(lumas, 0.9) - pct(lumas, 0.1);
          assert.ok(colours.size >= 8, `${el}/${name} ${c}: ${colours.size} colours`);
          const light = c === 'white' || c === '#ffffff' || c === '#f8f4ff';
          if (light) {
            assert.ok(pct(lumas, 0.9) > 0.7, `${el}/${name} ${c}: light ${pct(lumas, 0.9).toFixed(2)}`);
            assert.ok(spread > 0.15, `${el}/${name} ${c}: shading ${spread.toFixed(2)}`);
            assert.ok(pct(lumas, 0.5) < 0.97, `${el}/${name} ${c}: not burnt out`);
          } else {
            assert.ok(spread > 0.06, `${el}/${name} ${c}: shading ${spread.toFixed(2)}`);
            assert.ok(lit > 10, `${el}/${name} ${c}: ${lit} lit pixels (rim, core)`);
          }
        }
  });

  it('Kirin and Fire Annihilation take the colour a frame at a time; Kirin\'s storm cloud stays his', () => {
    const k = frame('lightning', 'kirin', 'impact', 0);
    const ksize = { width: k.w, height: k.h, sprite: 'kirin' };
    assert.ok(tintVfx(k.rgba, 'lightning', 'blue', ksize) === k.rgba);
    const a = frame('fire', 'annihilation', 'burn', 2);
    const asize = { width: a.w, height: a.h, sprite: 'annihilation' };
    assert.ok(tintVfx(a.rgba, 'fire', 'red', asize) === a.rgba);
    for (const c of ['green', 'violet', 'black']) {
      for (const [img, el, size] of [[k, 'lightning', ksize], [a, 'fire', asize]] as const) {
        const out = tintVfx(img.rgba, el, c, size);
        let moved = 0;
        for (let i = 0; i < out.length; i += 4) {
          if (out[i + 3] !== img.rgba[i + 3]) assert.fail(`${el} ${c}: alpha at ${i / 4}`);
          if (img.rgba[i + 3] && !same(out, img.rgba, i)) moved++;
        }
        assert.ok(moved > 5000, `${el} ${c}: ${moved} pixels changed`);
      }
      // The violet storm cloud: a cloud, off the bolt's hue, barely touched.
      const out = tintVfx(k.rgba, 'lightning', c, ksize);
      let n = 0;
      let off = 0;
      for (let i = 0; i < out.length; i += 4) {
        const [h, s, l] = rgbToHsl(k.rgba[i], k.rgba[i + 1], k.rgba[i + 2]);
        if (k.rgba[i + 3] < 160 || h < 245 || h > 265 || s < 0.3 || l > 0.45 || l <= 0.1) continue;
        n++;
        off += Math.abs(out[i] - k.rgba[i]) + Math.abs(out[i + 1] - k.rgba[i + 1]) + Math.abs(out[i + 2] - k.rgba[i + 2]);
      }
      assert.ok(n > 5000 && off / n < 30, `Kirin cloud ${c}: ${n} pixels, ${(off / n).toFixed(1)} off on average`);
    }
  });

  it('a sheet recoloured a frame at a time, in any order, is the sheet recoloured whole (the battle goes frame by frame)', () => {
    for (const [el, name] of [['water', 'hit'], ['fire', 'wall'], ['earth', 'wall_diag'], ['lightning', 'bolt']] as const) {
      const m = JSON.parse(readFileSync(new URL(`../assets/world/vfx_${el}/manifest.json`, import.meta.url), 'utf8')).sprites[name];
      const s = sheet(el, name);
      const { frameW: w, frameH: h } = m;
      const cells: [string, number][] = Object.entries(m.anims as Record<string, { frames: number }>).flatMap(([anim, a]) => Array.from({ length: a.frames }, (_, f) => [anim, f] as [string, number]));
      for (const c of ['green', 'black', 'white', '#ff00aa']) {
        const whole = tintVfx(s.rgba, el, c, { width: s.w, height: s.h, frameW: w, frameH: h, sprite: name });
        // Backwards, then the first again: what one frame met before never changes another.
        for (const [anim, f] of [...cells.slice().reverse(), cells[0]]) {
          const one = frame(el, name, anim, f);
          const out = tintVfx(one.rgba, el, c, { width: w, height: h, sprite: name });
          const row = m.anims[anim].row;
          let off = 0;
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w * 4; x++) if (out[y * w * 4 + x] !== whole[((row * h + y) * s.w + f * w) * 4 + x]) off++;
          assert.equal(off, 0, `${el}/${name} ${c} ${anim} ${f}: ${off} bytes differ`);
        }
      }
    }
  });

  it('the drawn stand-in effects take the same colour, and keep theirs when Natural', () => {
    for (const el of TINT_ELEMENTS) for (const c of [undefined, ...NATURAL[el].set]) assert.equal(vfxTintColors(el, c), undefined, `${el} ${c}`);
    const isHex = (x: string) => /^#[0-9a-f]{6}$/.test(x);
    const hsl = (x: string) => rgbToHsl(parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16));
    for (const el of TINT_ELEMENTS)
      for (const c of [...changing(el, 'bolt'), '#ff00aa']) {
        const col = vfxTintColors(el, c)!;
        assert.ok(col && col.length === 4 && col.every(isHex), `${el} ${c}: ${col}`);
        assert.ok(vfxTintColors(el, c) === col, `${el} ${c}: worked out once`);
        // Core to dark: the light comes first (black's red-hot or violet core over its dark body).
        assert.ok(hsl(col[0])[2] > hsl(col[3])[2], `${el} ${c}: ${col}`);
      }
    // Green fire is green in the middle; black stays dark at the edge; white water is a pale silver.
    assert.ok(hueGap(hsl(vfxTintColors('fire', 'green')![2])[0], 125) < 30);
    assert.ok(hsl(vfxTintColors('lightning', 'black')![3])[2] < 0.2);
    const [, s1, l1] = hsl(vfxTintColors('water', 'white')![1]);
    assert.ok(s1 < 0.3 && l1 > 0.6);
  });
});

describe("the owner's fire hit (his repaint, 2026-10-24)", () => {
  const m = JSON.parse(readFileSync(new URL('../assets/world/vfx_fire/manifest.json', import.meta.url), 'utf8')).sprites.hit;
  const s = sheet('fire', 'hit');
  it('plays his 12 frames at 12 fps once, in a frame grown round his smoke and flames', () => {
    assert.deepEqual(m.anims, { hit: { row: 0, frames: 12, fps: 12, loop: false } });
    assert.equal(s.w, m.frameW * 12);
    assert.equal(s.h, m.frameH);
    // Taller than the old 96x80 starburst: his smoke rises well over it.
    assert.ok(m.frameW > 96 && m.frameH > 80);
    // Nothing of his touches the frame's edge, so nothing is cut off.
    for (let f = 0; f < 12; f++)
      for (let y = 0; y < m.frameH; y++)
        for (let x = 0; x < m.frameW; x++)
          if (x === 0 || y === 0 || x === m.frameW - 1 || y === m.frameH - 1) assert.equal(s.rgba[(y * s.w + f * m.frameW + x) * 4 + 3], 0, `frame ${f} at ${x},${y}`);
  });
  it('his smoke is see-through where he painted it so, and stays his brown in any chakra colour', () => {
    let see = 0;
    for (let i = 3; i < s.rgba.length; i += 4) if (s.rgba[i] > 0 && s.rgba[i] < 255) see++;
    assert.ok(see > 1000, `${see} see-through pixels`);
    const blue = tintVfx(Uint8Array.from(s.rgba), 'fire', 'blue', { width: s.w, height: s.h, frameW: m.frameW, frameH: m.frameH, sprite: 'hit' });
    let smoke = 0;
    for (let i = 0; i < s.rgba.length; i += 4) {
      assert.equal(blue[i + 3], s.rgba[i + 3], 'every pixel keeps its alpha');
      if (!s.rgba[i + 3] || rgbToHsl(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2])[1] >= 0.15) continue;
      smoke++;
      assert.ok(same(blue, s.rgba, i), 'his smoke is not recoloured');
    }
    assert.ok(smoke > 1000, `${smoke} smoke pixels`);
  });
});
