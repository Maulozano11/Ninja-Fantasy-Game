// Tests for the elemental jutsu effects in a chakra colour (vfxTint.ts), on the owner's own sheets: npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';
import { tintPal } from './chakra';
import { rgbToHsl } from './color';
import { tintVfx, VFX_ELEMENTS, vfxTintIsNatural, vfxTintOf } from './vfxTint';
import type { VfxElement } from './vfxTint';

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

const sheets = new Map<string, { w: number; h: number; rgba: Uint8Array }>();
/** One of his sheets: `vfx_<element>/<name>.png`, or the beast's (`vfx_beasts/<element>.png`). */
function sheet(el: VfxElement, name: string) {
  const file = name === 'beast' ? `vfx_beasts/${el}.png` : `vfx_${el}/${name}.png`;
  if (!sheets.has(file)) sheets.set(file, readPng(new URL(`../assets/world/${file}`, import.meta.url)));
  return sheets.get(file)!;
}
const SHEETS = ['bolt', 'hit', 'beast'];
const tint = (el: VfxElement, name: string, color: string | undefined) => {
  const s = sheet(el, name);
  return tintVfx(s.rgba, el, color, { width: s.w, height: s.h, beast: name === 'beast' });
};

const CHAKRA = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'white', 'black'];
/** His sheets' own colours: these leave them as he drew them. */
const NATURAL: Record<VfxElement, { set: string[]; beast: string[] }> = {
  fire: { set: ['red', 'orange'], beast: ['red', 'orange'] },
  water: { set: ['blue'], beast: ['blue'] },
  wind: { set: ['green'], beast: ['green'] },
  lightning: { set: ['blue'], beast: ['yellow'] },
  earth: { set: [], beast: [] },
};
const changing = (el: VfxElement, name: string) => CHAKRA.filter((c) => !NATURAL[el][name === 'beast' ? 'beast' : 'set'].includes(c));
/** Some of his dark line colours (each sheet's outline, as his palettes label it). */
const LINES: Record<VfxElement, { set: string[]; beast: string[] }> = {
  fire: { set: ['#3c0d0d', '#53120f', '#470807', '#24141a', '#361921'], beast: ['#2f0e13'] },
  water: { set: ['#0e263b'], beast: ['#01071a'] },
  wind: { set: ['#0c211f', '#041c17', '#000a00'], beast: ['#234a49', '#020a10'] },
  lightning: { set: [], beast: ['#573213'] },
  earth: { set: ['#3e2920', '#3d2920', '#442410'], beast: ['#191519'] },
};
const hex = (r: number, g: number, b: number) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
const lumaOf = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('elemental jutsu in a chakra colour', () => {
  it('Natural, the sheet\'s own colour and unknown colours give back his pixels, byte for byte', () => {
    for (const el of VFX_ELEMENTS)
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const copy = s.rgba.slice();
        const own = NATURAL[el][name === 'beast' ? 'beast' : 'set'];
        for (const c of [undefined, ...own, 'brown', 'not-a-colour']) {
          const out = tint(el, name, c);
          assert.equal(out, s.rgba, `${el}/${name} ${c}: the same buffer`);
          assert.ok(vfxTintIsNatural(el, c, name === 'beast'));
        }
        assert.deepEqual(s.rgba, copy, `${el}/${name}: his sheet is never written`);
      }
    // A custom colour that is his colour's hex keeps his pixels too.
    const s = sheet('fire', 'bolt');
    assert.equal(tintVfx(s.rgba, 'fire', '#E8321E', { width: s.w, height: s.h }), s.rgba);
    assert.equal(tintVfx(s.rgba, 'water', '#36a0f0', { width: s.w, height: s.h }), s.rgba);
    // The colour is the chakra's tint: the burst (its type) alone changes nothing.
    assert.equal(vfxTintOf({ tint: undefined }), undefined);
    assert.equal(vfxTintOf({ tint: 'green' }), 'green');
    assert.equal(vfxTintOf(undefined), undefined);
  });

  it('every other colour recolours, keeps every alpha, and never touches his dark line', () => {
    for (const el of VFX_ELEMENTS) {
      let line = 0;
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const before = s.rgba.slice();
        const lines = new Set(LINES[el][name === 'beast' ? 'beast' : 'set']);
        for (const c of [...changing(el, name), '#ff00aa', '#120a08']) {
          const out = tint(el, name, c);
          assert.notEqual(out, s.rgba, `${el}/${name} ${c}: a new buffer`);
          assert.equal(out.length, s.rgba.length);
          let moved = 0;
          for (let i = 0; i < s.rgba.length; i += 4) {
            assert.equal(out[i + 3], s.rgba[i + 3], `${el}/${name} ${c}: alpha at ${i / 4}`);
            if (!s.rgba[i + 3]) continue;
            const [r, g, b] = [s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]];
            const same = out[i] === r && out[i + 1] === g && out[i + 2] === b;
            if (lines.has(hex(r, g, b)) || rgbToHsl(r, g, b)[2] <= 0.1) {
              line++;
              assert.ok(same, `${el}/${name} ${c}: line ${hex(r, g, b)} became ${hex(out[i], out[i + 1], out[i + 2])}`);
            } else if (!same) moved++;
          }
          assert.ok(moved > 0, `${el}/${name} ${c}: something changed`);
        }
        assert.deepEqual(s.rgba, before, `${el}/${name}: his sheet is never written`);
      }
      assert.ok(line > 0, `${el}: his line was there to keep`);
    }
  });

  it('the element\'s middle tones turn to the chakra colour\'s hue', () => {
    const MID: Record<VfxElement, number> = { fire: 0.561, water: 0.529, wind: 0.446, lightning: 0.3, earth: 0.394 };
    for (const el of VFX_ELEMENTS)
      for (const c of changing(el, 'bolt').filter((c) => c !== 'white' && c !== 'black')) {
        const s = sheet(el, 'bolt');
        const out = tint(el, 'bolt', c);
        const want = rgbToHsl(...tintPal(c)[2])[0];
        let x = 0;
        let y = 0;
        let n = 0;
        for (let i = 0; i < s.rgba.length; i += 4) {
          const [r, g, b] = [s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]];
          if (s.rgba[i + 3] < 32 || Math.abs(lumaOf(r, g, b) - MID[el]) > 0.04 || rgbToHsl(r, g, b)[1] < 0.3) continue;
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

  it('black stays readable: a near-black body with a bright violet rim and a red-hot core', () => {
    const RIM = tintPal('black')[3];
    for (const el of VFX_ELEMENTS)
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const out = tint(el, name, 'black');
        // Solid pixels (the body) are mostly near-black; the rim and the glow (faint pixels) are bright.
        let seen = 0;
        let solid = 0;
        let dark = 0;
        let rim = 0;
        let bright = 0;
        for (let i = 0; i < s.rgba.length; i += 4) {
          if (!s.rgba[i + 3] || (out[i] === s.rgba[i] && out[i + 1] === s.rgba[i + 1] && out[i + 2] === s.rgba[i + 2])) continue;
          seen++;
          const l = rgbToHsl(out[i], out[i + 1], out[i + 2])[2];
          if (l >= 0.45) bright++;
          if (out[i] === RIM[0] && out[i + 1] === RIM[1] && out[i + 2] === RIM[2]) rim++;
          if (s.rgba[i + 3] < 160) continue;
          solid++;
          if (l < 0.25) dark++;
        }
        assert.ok(dark / solid > 0.5, `${el}/${name}: ${Math.round((100 * dark) / solid)}% near-black`);
        assert.ok(rim > 20, `${el}/${name}: ${rim} violet rim pixels`);
        assert.ok(bright / seen > 0.05, `${el}/${name}: ${Math.round((100 * bright) / seen)}% bright`);
      }
    // A fireball's heart burns toward the aura's red accent (crimson, not violet).
    const out = tint('fire', 'fireball', 'black');
    let hot = 0;
    for (let i = 0; i < out.length; i += 4) {
      const [h, sat, l] = rgbToHsl(out[i], out[i + 1], out[i + 2]);
      if (out[i + 3] && hueGap(h, 340) < 25 && sat > 0.4 && l > 0.3) hot++;
    }
    assert.ok(hot > 500, `fireball heart: ${hot} crimson pixels`);
  });

  it('white keeps its shading: gold-grey shadows under a white light, not a flat blob', () => {
    for (const el of VFX_ELEMENTS)
      for (const name of SHEETS) {
        const s = sheet(el, name);
        const out = tint(el, name, 'white');
        const lumas: number[] = [];
        const colours = new Set<number>();
        for (let i = 0; i < s.rgba.length; i += 4) {
          if (s.rgba[i + 3] < 160 || (out[i] === s.rgba[i] && out[i + 1] === s.rgba[i + 1] && out[i + 2] === s.rgba[i + 2])) continue;
          lumas.push(lumaOf(out[i], out[i + 1], out[i + 2]));
          colours.add((out[i] << 16) | (out[i + 1] << 8) | out[i + 2]);
        }
        lumas.sort((a, b) => a - b);
        const p10 = lumas[Math.floor(lumas.length * 0.1)];
        const p90 = lumas[Math.floor(lumas.length * 0.9)];
        assert.ok(p90 > 0.8, `${el}/${name}: light ${p90.toFixed(2)}`);
        assert.ok(p90 - p10 > 0.2, `${el}/${name}: shading ${p10.toFixed(2)}..${p90.toFixed(2)}`);
        assert.ok(colours.size >= 8, `${el}/${name}: ${colours.size} colours`);
      }
  });

  it('a black rim follows the air and his outline, not the edges of a frame', () => {
    // Two 4 x 4 frames side by side, filled with a mid fire colour, with an empty column on the far left.
    const W = 8;
    const H = 4;
    const src = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) src.set([242, 115, 28, 255], (y * W + x) * 4);
    const out = tintVfx(src, 'fire', 'black', { width: W, height: H, frameW: 4, frameH: 4 });
    const at = (x: number, y: number) => Array.from(out.subarray((y * W + x) * 4, (y * W + x) * 4 + 3));
    const rim = Array.from(tintPal('black')[3]);
    assert.deepEqual(at(1, 1), rim, 'next to the air: the rim');
    assert.notDeepEqual(at(3, 1), rim, 'on the frame seam: no rim');
    assert.notDeepEqual(at(4, 1), rim, 'on the frame seam: no rim');
    assert.notDeepEqual(at(7, 1), rim, 'on the sheet edge: no rim');
    assert.ok(rgbToHsl(...(at(5, 1) as [number, number, number]))[2] < 0.3, 'inside: dark');
  });
});
