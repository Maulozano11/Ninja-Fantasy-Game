// Which colour a jutsu's effects take on the battle screen, and which sheets that needs: the pure
// half of the chakra-coloured jutsu (the owner, 2026-10-21: every elemental jutsu and elemental
// beast in the caster's chakra colour). No DOM here, so it is tested (vfxTintPlan.test.ts);
// vfxTintCache.ts makes and keeps the recoloured sheets.

import type { JutsuSpec } from '../../battle/jutsu';
import type { Unit, Wall } from '../../battle/types';
import { isTintElement, vfxTintIsNatural, vfxTintOf } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';

/** A unit's chakra colour (its look's, else its sheet's), or undefined: Natural, a creature, a ninja without one. */
export function unitTint(u: Pick<Unit, 'look' | 'character'> | undefined): string | undefined {
  return vfxTintOf(u?.look?.chakra ?? u?.character?.appearance?.chakra);
}

/**
 * The colour a jutsu's effects take when `caster` casts it: its chakra colour for an elemental
 * jutsu (fire, water, wind, lightning, earth), else undefined (his colours). Enemies without a
 * chakra colour of their own keep his colours.
 */
export function jutsuTint(spec: Pick<JutsuSpec, 'elemental' | 'element'> | undefined, caster: Pick<Unit, 'look' | 'character'> | undefined): string | undefined {
  if (!spec?.elemental || !isTintElement(spec.element)) return undefined;
  return unitTint(caster);
}

/** The element a jutsu wall stands in (earth and water walls); Kōton steel has none. */
export const wallElement = (kind: Wall['kind']): TintElement | undefined => (kind === 'earth' || kind === 'water' ? kind : undefined);

/** One sheet a jutsu can play: `vfx_<element>/<name>`, or its element's beast (`vfx_beasts/<element>`). */
export interface TintSheetRef {
  group: string;
  name: string;
  element: TintElement;
  beast?: boolean;
}

/** A signature's enhanced sheet (vfxSprites.ts plays it when it is in the game). */
export const enhancedSig = (sig: string): string => (sig === 'fireball' ? 'fireball_great' : `${sig}_enh`);

/**
 * Every sheet an elemental jutsu can play (as vfxSprites.ts picks them for its effects), so the
 * battle can recolour them before it is cast. A sheet that is not in the game is skipped by the
 * caller; one that turns out unneeded only costs a little work. Empty for a non-elemental jutsu.
 */
export function tintSheetsOf(spec: Pick<JutsuSpec, 'elemental' | 'element' | 'vfx' | 'sig' | 'shape' | 'special' | 'melee'>): TintSheetRef[] {
  if (!spec.elemental || !isTintElement(spec.element)) return [];
  const el = spec.element;
  const names: string[] = [];
  const add = (...n: string[]) => names.push(...n.filter((x) => !names.includes(x)));
  if (spec.special === 'earthWall' || spec.special === 'waterWall') add('wall', 'wall_diag', 'wall_depth');
  else if (spec.special) {
    // Heals, traps and the like are drawn in code; an aura of the element would play its sheets.
    if (spec.vfx === 'aura') add('aura', 'aura_back');
  } else if (spec.shape === 'cone') add(...(spec.sig ? [spec.sig, enhancedSig(spec.sig)] : ['breath']));
  else if (spec.shape === 'line') add('stream', 'stream_head');
  else if (spec.melee) add(...(spec.vfx === 'multi' ? ['multi_hit'] : []), 'hit');
  else {
    // A projectile (its own sheet when it flies, else the bolt), then a blast or a hit; a signature
    // from the sky (Kirin) plays its own sheet instead.
    if (spec.sig) add(spec.sig, enhancedSig(spec.sig));
    else if (spec.vfx !== 'beast') add(spec.vfx);
    add('bolt');
    if (spec.shape === 'circle') add('blast');
    else add(...(spec.vfx === 'multi' ? ['multi_hit'] : []), 'hit');
  }
  const out: TintSheetRef[] = names.map((name) => ({ group: `vfx_${el}`, name, element: el }));
  if (spec.vfx === 'beast' && !spec.sig && !spec.special) out.unshift({ group: 'vfx_beasts', name: el, element: el, beast: true });
  return out;
}

/** The sheets to recolour for a unit's jutsu, in its chakra colour (none when Natural or his colour already). */
export function unitTintSheets(u: Pick<Unit, 'look' | 'character' | 'jutsus'>, specOf: (id: string) => JutsuSpec | undefined): { ref: TintSheetRef; color: string }[] {
  const color = unitTint(u);
  if (!color) return [];
  const out: { ref: TintSheetRef; color: string }[] = [];
  const seen = new Set<string>();
  for (const id of u.jutsus) {
    const spec = specOf(id);
    if (!spec) continue;
    for (const ref of tintSheetsOf(spec)) {
      const key = `${ref.group}/${ref.name}`;
      if (seen.has(key) || vfxTintIsNatural(ref.element, color, { beast: ref.beast, sprite: ref.name })) continue;
      seen.add(key);
      out.push({ ref, color });
    }
  }
  return out;
}

/** A frame cut down to where it has pixels, and where that sits in the frame (null: an empty frame). */
export interface CroppedFrame {
  rgba: Uint8ClampedArray;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Cuts an RGBA frame down to the box round its visible pixels (most of a big frame is air), or null when it has none. */
export function cropFrame(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number): CroppedFrame | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (rgba[row + x * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) out.set(rgba.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + cw) * 4), y * cw * 4);
  return { rgba: out, x: x0, y: y0, w: cw, h: ch };
}
