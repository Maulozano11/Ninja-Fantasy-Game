// Color utilities for the layered sprite engine.
// Every material is drawn with a 6-step ramp:
//   0 outline · 1 dark · 2 shadow · 3 base · 4 light · 5 highlight
// Shadows drift toward cool hues and highlights toward warm hues, which is
// what gives 16-bit sprites their depth instead of flat darken/lighten.

import { FEMALE_BASE_LINE } from './femaleBaseArt';
import { FEMALE_SKIN } from './femaleBodyArt';

/**
 * 'painted' is a colour of the owner's painted on a piece that is outlined where it is cut (the female
 * bodies' pieces, body.ts drawBaseBody): his colour at every shade but the line, which is his black line.
 */
export type RampKind = 'skin' | 'skinF' | 'hair' | 'cloth' | 'metal' | 'leather' | 'glow' | 'flat' | 'painted';
export type Ramp = [string, string, string, string, string, string];

export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Moves hue `h` toward `target` by up to `amount` degrees along the shortest arc. */
function shiftHue(h: number, target: number, amount: number): number {
  let diff = ((target - h + 540) % 360) - 180;
  if (Math.abs(diff) < amount) return target;
  return h + Math.sign(diff) * amount;
}

const rampCache = new Map<string, Ramp>();

export function makeRamp(hex: string, kind: RampKind = 'cloth'): Ramp {
  const key = `${hex}|${kind}`;
  const cached = rampCache.get(key);
  if (cached) return cached;

  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  let ramp: Ramp;

  if (kind === 'flat') {
    ramp = [hex, hex, hex, hex, hex, hex];
  } else if (kind === 'painted') {
    ramp = [FEMALE_BASE_LINE, hex, hex, hex, hex, hex];
  } else if (kind === 'skinF') {
    // The female bodies' skin, painted the owner's way (femaleBodyArt.ts, from his heroines at our
    // scale): his near-black line, his deep shadow and shadow moved the way the player moved the
    // base, and flat skin with no highlight above the base.
    const his = FEMALE_SKIN.base;
    const t = (c: string) => retintHex(c, his, hex);
    ramp = [t(FEMALE_SKIN.line), t(FEMALE_SKIN.deep), t(FEMALE_SKIN.shadow), hex, hex, hex];
  } else if (kind === 'glow') {
    ramp = [
      hslToHex(h, s, Math.max(0.1, l - 0.35)),
      hslToHex(h, s, Math.max(0.15, l - 0.22)),
      hslToHex(h, s, Math.max(0.2, l - 0.1)),
      hex,
      hslToHex(h, s * 0.8, Math.min(0.92, l + 0.18)),
      hslToHex(h, s * 0.4, Math.min(0.98, l + 0.32)),
    ];
  } else {
    const coolTarget = kind === 'skin' ? 345 : 245;
    const warmTarget = kind === 'skin' ? 40 : 55;
    const coolAmt = kind === 'skin' ? 10 : kind === 'metal' ? 8 : 14;
    const warmAmt = kind === 'skin' ? 6 : 8;
    // Near-black and near-white colors need a compressed ramp so the shadows
    // and highlights stay readable.
    // Black cloth stays readable like the reference's cape: its fill sits well
    // above the outline, with lit folds.
    const base = Math.min(0.9, Math.max(l, kind === 'hair' ? 0.14 : kind === 'cloth' || kind === 'leather' ? 0.16 : 0.12));
    const span = kind === 'metal' ? 1.25 : kind === 'skin' ? 0.8 : 1;
    const dl = (v: number) => v * span;
    const lights = [
      Math.max(0.04, Math.min(base * 0.32, 0.16)),
      Math.max(0.06, base - dl(base < 0.25 ? 0.07 : 0.22)),
      Math.max(0.08, base - dl(base < 0.25 ? 0.035 : 0.11)),
      base,
      Math.min(0.95, base + dl(base > 0.8 ? 0.05 : 0.11)),
      Math.min(0.98, base + dl(base > 0.8 ? 0.1 : 0.24)),
    ];
    const sat = s;
    if (base < 0.3 && (kind === 'cloth' || kind === 'leather')) {
      lights[4] = Math.min(0.95, base + 0.13);
      lights[5] = Math.min(0.98, base + 0.27);
    }
    const sats = [
      Math.min(1, sat * 0.9 + 0.12),
      Math.min(1, sat + 0.08),
      Math.min(1, sat + 0.04),
      sat,
      Math.max(0, sat - 0.04),
      Math.max(0, sat - 0.12),
    ];
    // Grey materials get a gentle cool tint in the shadows so steel and black
    // cloth don't look muddy.
    const isGrey = s < 0.08;
    const hues = [
      isGrey ? 225 : shiftHue(h, coolTarget, coolAmt * 1.4),
      isGrey ? 225 : shiftHue(h, coolTarget, coolAmt),
      isGrey ? 225 : shiftHue(h, coolTarget, coolAmt * 0.5),
      h,
      isGrey ? h : shiftHue(h, warmTarget, warmAmt * 0.6),
      isGrey ? 50 : shiftHue(h, warmTarget, warmAmt),
    ];
    if (isGrey) {
      sats[0] = Math.max(sats[0], 0.2);
      sats[1] = Math.max(sats[1], 0.12);
      sats[2] = Math.max(sats[2], 0.08);
      sats[5] = Math.min(sats[5], 0.15);
    }
    if (kind === 'hair' && base < 0.22) {
      // Dark hair reads best with a blue sheen on the highlights.
      hues[4] = isGrey ? 220 : shiftHue(h, 220, 20);
      hues[5] = isGrey ? 210 : shiftHue(h, 210, 25);
      sats[4] = Math.max(sats[4], 0.25);
      sats[5] = Math.max(sats[5], 0.3);
      lights[4] = base + 0.12;
      lights[5] = base + 0.28;
    }
    if (base > 0.6 && (kind === 'cloth' || kind === 'hair' || kind === 'leather')) {
      // Light colors (white, cream, blonde, pastel) need deep, cool shadows
      // or they read as flat blobs.
      lights[1] = Math.min(lights[1], base - 0.3);
      lights[2] = Math.min(lights[2], base - 0.15);
    }
    if (kind === 'hair') {
      // Smooth, low-contrast hair like the reference: the dark fill stays well
      // above the outline and the brightest strands stay soft.
      lights[1] = Math.max(lights[1], base * 0.48);
      lights[2] = Math.max(lights[2], base * 0.72);
      lights[5] = Math.min(lights[5], base + 0.2);
    }
    if (kind === 'skin') {
      // After the reference sprite: a wide value range, with shadows that
      // turn rose and muted instead of bright orange, and no white highlights.
      const up = Math.min(1 - base, 0.4);
      const sk = [Math.max(0.16, lights[0]), base * 0.58, base * 0.8, base, base + up * 0.22, base + up * 0.42];
      const ss = [Math.min(0.6, sats[0]), sat * 0.48, sat * 0.72, sat, sat * 0.95, sat * 0.8];
      const sh = [shiftHue(h, 345, 30), shiftHue(h, 345, 24), shiftHue(h, 345, 12), h, shiftHue(h, 40, 3), shiftHue(h, 40, 6)];
      for (let i = 0; i < 6; i++) [lights[i], sats[i], hues[i]] = [sk[i], ss[i], sh[i]];
    }
    const out = lights.map((li, i) => hslToHex(hues[i], sats[i], li)) as Ramp;
    if (Math.abs(l - base) < 0.001) out[3] = hex;
    ramp = out;
  }

  rampCache.set(key, ramp);
  return ramp;
}

export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * A colour of a painted piece (the owner's pixels) moved the way the player moved its base colour:
 * the hue turned as far, the saturation scaled, the lightness shifted most of the way. With the base
 * unchanged it is his own colour.
 */
export function retintHex(hex: string, from: string, to: string): string {
  if (from.toLowerCase() === to.toLowerCase()) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const lt = Math.max(0, Math.min(1, l + (l1 - l0) * 0.7));
  // A grey base (the owner's black cloth) has no hue of its own to turn from: it takes the new one.
  if (s0 < 0.15) return hslToHex(h1, s1, lt);
  return hslToHex(h + (h1 - h0), s0 > 0.02 ? (s * s1) / s0 : s1, lt);
}

/**
 * A colour of the owner's skin (a painted head or limb) in the character's skin: the hue turned and the
 * saturation scaled from the skin he painted it in (`from`), as retintHex turns his cloth, but the
 * lightness scaled so that his skin lands exactly on the character's (the rest of the body is drawn in
 * that skin), his shadows and black line staying as far below it and his lights as far above. In his own
 * skin, his colour.
 */
export function retintSkin(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase()) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), lt);
}

/**
 * retintSkin for his skin where it is mostly in shadow (his limbs and his Roman face): on a skin darker
 * than the one he painted on, his darks are lifted (the lightness ratio taken to a power under 1, nearer
 * 1 the nearer the skin is to his) so his mid-tones and creases stay apart from each other and from the
 * black line instead of all sinking toward it; his lights rise as far above the new skin as our skin ramp's
 * lights do (makeRamp: up to 0.4). His black line is never tinted. In his own skin, his colour.
 */
export function retintSkinLifted(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase() || isLine(hex)) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const gamma = l1 < l0 ? 1 - 0.5 * (1 - l1 / l0) : 1;
  const up = (b: number) => Math.min(1 - b, 0.4);
  const lt = l <= l0 ? l1 * Math.pow(l / l0, gamma) : l1 + ((l - l0) * up(l1)) / up(l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), Math.min(0.98, lt));
}

/** His black line (as the tools/refs scripts sort his colours): it keeps its colour in every skin. */
export function isLine(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return r < 30 && g < 30 && b < 40;
}
