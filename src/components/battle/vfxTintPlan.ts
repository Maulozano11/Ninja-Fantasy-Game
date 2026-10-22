// Which colour a jutsu's effects take on the battle screen, and which sheets that needs: the pure
// half of the chakra-coloured jutsu (the owner, 2026-10-21: every elemental jutsu and elemental
// beast in the caster's chakra colour; "la curacion siempre se vera verde": the heals in green).
// No DOM here, so it is tested (vfxTintPlan.test.ts); vfxTintCache.ts makes and keeps the
// recoloured sheets.

import type { JutsuSpec } from '../../battle/jutsu';
import type { Unit, Wall } from '../../battle/types';
import { isTintElement, vfxTintIsNatural, vfxTintOf } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';

/** A unit's chakra colour (its look's, else its sheet's), or undefined: Natural, a creature, a ninja without one. */
export function unitTint(u: Pick<Unit, 'look' | 'character'> | undefined): string | undefined {
  return vfxTintOf(u?.look?.chakra ?? u?.character?.appearance?.chakra);
}

/**
 * The heals' green (the owner, 2026-10-21: "la curacion siempre se vera verde"): the glow the
 * heals were drawn in before they took the water aura (renderer.ts), and the healed number's. A
 * heal's element sheets (the Healing Dew's orb, the water aura of the Dew and the Mystical Palm)
 * play in it, whoever casts it and whatever their chakra colour; his black line stays.
 */
export const HEAL_TINT = '#4ade80';

/**
 * The colour a jutsu's effects take when `caster` casts it: its chakra colour for an elemental
 * jutsu (fire, water, wind, lightning, earth), the heals' green for a heal drawn in its element,
 * else undefined (his colours). Enemies without a chakra colour of their own keep his colours.
 */
export function jutsuTint(spec: Pick<JutsuSpec, 'elemental' | 'element' | 'special'> | undefined, caster: Pick<Unit, 'look' | 'character'> | undefined): string | undefined {
  if (!spec?.elemental || !isTintElement(spec.element)) return undefined;
  if (spec.special === 'heal') return HEAL_TINT;
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
export function tintSheetsOf(spec: Pick<JutsuSpec, 'elemental' | 'element' | 'vfx' | 'sig' | 'shape' | 'special' | 'melee' | 'seq'>): TintSheetRef[] {
  if (!spec.elemental || !isTintElement(spec.element)) return [];
  const el = spec.element;
  if (spec.seq?.stage) return stageSheets(spec.seq.stage, el);
  // The rank D and C set's own sheets (vfx_dc): a volley's projectiles cut apart, the joined fan.
  const own: TintSheetRef[] = [];
  const names: string[] = [];
  const add = (...n: string[]) => names.push(...n.filter((x) => !names.includes(x)));
  if (spec.seq?.volley && spec.shape === 'single') {
    // Three Embers, Jolt, Pebble Shot: each projectile on its own, then its impact (earth's rock
    // bullets have their own, the others the element's hit).
    spec.seq.volley.paths.forEach((_, i) => own.push({ group: 'vfx_dc', name: `${el}_multi_${i}`, element: el }));
    add(...(el === 'earth' && spec.vfx === 'multi' ? ['multi_hit'] : []), 'hit');
  } else if (spec.seq?.connected && spec.shape === 'cone') {
    // The Spark Fan: his forked lightning, joined, and a spark on each one it reaches.
    own.push({ group: 'vfx_dc', name: `${el}_fan`, element: el });
    add('hit');
  } else if (spec.seq?.wave) {
    // The Devouring Tide: the water aura while it casts, the wave's columns and its wall (the body
    // and the face), its spray, a splash on each one reached, and the spouts as it breaks.
    add('aura', 'aura_back', 'wall_depth', 'wall', 'breath', 'hit', 'blast');
    // The S-rank Tide: his curl, his water dragon and his kanji riding the crest.
    if (spec.seq.wave.dragon) for (const name of ['curl', 'dragon', 'kanji']) own.push({ group: 'vfx_tide_s', name, element: el });
  } else if (spec.seq?.tower) {
    // The Whirlwind Tower: the warning burst, the tornado column, the small whirlwinds round it.
    add('hit', 'wall_depth', 'multi');
  } else if (spec.special === 'galeZone') {
    // The Gale Curtain: the wind gathering round the caster, the gale on the ground, and the swirl
    // round a fire that goes through it.
    add('aura', 'aura_back', 'wall', 'bolt');
  } else if (spec.special === 'earthWall' || spec.special === 'waterWall') add('wall', 'wall_diag', 'wall_depth');
  else if (spec.special) {
    // Heals, traps and the like are drawn in code; an aura of the element would play its sheets. A
    // heal in the element's aura (the Healing Dew, the Mystical Palm) flies its orb first, if it has
    // one; a heal plays them in the heals' green (jutsuTint).
    if (spec.special === 'heal' && spec.seq?.healAura && spec.vfx !== 'aura') add(spec.vfx);
    if (spec.vfx === 'aura' || spec.seq?.healAura) add('aura', 'aura_back');
  } else if (spec.shape === 'cone') add(...(spec.sig ? [spec.sig, enhancedSig(spec.sig)] : spec.seq?.breathMs ? ['aura', 'aura_back', 'breath', 'hit'] : ['breath']));
  else if (spec.shape === 'line') add('stream', 'stream_head', ...(spec.seq?.hitEach ? ['hit'] : []));
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
  // Lightning that runs across wet ground bursts in his spark (hit) along it (ground.ts).
  if (el === 'lightning') add('hit');
  const out: TintSheetRef[] = [...own, ...names.map((name) => ({ group: `vfx_${el}`, name, element: el }))];
  if (spec.vfx === 'beast' && !spec.sig && !spec.special) out.unshift({ group: 'vfx_beasts', name: el, element: el, beast: true });
  return out;
}

/**
 * The sheets a jutsu staged with the owner's first round of effect pieces plays (playback.ts
 * round1), in the order they play: his flame wall and dragon head (vfx_dragon) and the fireballs,
 * the half wall and head and the stream, the water dragon's head and its body of water, the rock
 * bullets cut apart (vfx_dc) and their bursts, the wood dragon's roots, leaves and dragon (vfx_wood)
 * and the rock bursts, the lightning in the hand (vfx_hand) and its hit. The others are not elemental.
 */
function stageSheets(stage: NonNullable<NonNullable<JutsuSpec['seq']>['stage']>, el: TintElement): TintSheetRef[] {
  const own = (name: string) => ({ group: `vfx_${el}`, name, element: el });
  const dragon = (name: string) => ({ group: 'vfx_dragon', name, element: el });
  switch (stage) {
    case 'dragonHead':
      return [own('wall'), dragon('fire_head'), own('bolt'), own('hit')];
    case 'dragonStream':
      return [dragon('fire_wall_half'), dragon('fire_head_half'), own('stream'), own('stream_head'), own('hit')];
    case 'waterDragon':
      return [dragon('water_head'), own('stream'), own('hit')];
    case 'rockVolleys':
      return [0, 1, 2].map((i) => ({ group: 'vfx_dc', name: `${el}_multi_${i}`, element: el })).concat([own('hit'), own('multi_hit')]);
    case 'woodDragon':
      return ['wood_root', 'wood_leaves', 'wood_dragon'].map((name) => ({ group: 'vfx_wood', name, element: el })).concat([own('multi_hit'), own('hit')]);
    case 'handLightning':
      return [{ group: 'vfx_hand', name: 'lightning_hand', element: el }, own('hit')];
    default:
      return [];
  }
}

/**
 * The sheets to recolour for a unit's jutsu, each in the colour it plays in (jutsuTint): its chakra
 * colour (none when Natural or his colour already), and its heals' green whatever its colour, so a
 * heal is ready in green before it is cast.
 */
export function unitTintSheets(u: Pick<Unit, 'look' | 'character' | 'jutsus'>, specOf: (id: string) => JutsuSpec | undefined): { ref: TintSheetRef; color: string }[] {
  const out: { ref: TintSheetRef; color: string }[] = [];
  const seen = new Set<string>();
  for (const id of u.jutsus) {
    const spec = specOf(id);
    const color = jutsuTint(spec, u);
    if (!spec || !color) continue;
    for (const ref of tintSheetsOf(spec)) {
      // One sheet can play in two colours (the water aura: a heal's green, a water mantle's chakra colour).
      const key = `${ref.group}/${ref.name}/${color}`;
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

// --- how the battle keeps the recoloured frames (vfxTintCache.ts) ------------------------------

/**
 * A frame bigger than this (pixels) is a big signature's (the Annihilation, Kirin): one takes a
 * tenth of a second or more to recolour, too long for the screen's own thread.
 */
export const BIG_FRAME_PX = 160_000;
export const isBigSheet = (frameW: number, frameH: number): boolean => frameW * frameH > BIG_FRAME_PX;

/**
 * The recoloured frames a battle keeps at most (bytes of pixels): the enhanced Annihilation alone
 * is about 95 MB in a colour. Past it the sheets that have not played for a while go, and are made
 * again if they play again.
 */
export const TINT_BUDGET = 200_000_000;
/** A sheet drawn within this long (ms) is playing and is never let go. */
export const TINT_IDLE_MS = 3000;

/**
 * The frame to draw while frame number `col` (in the order the sheet plays) is still being made in
 * a worker: the nearest earlier one that is ready, so the effect holds a moment instead of the
 * screen freezing to make it; null when none is. `have(c)` is frame c's state: the frame, null for
 * an empty one, undefined when not made yet.
 */
export function heldFrame<T>(have: (c: number) => T | null | undefined, col: number): T | null {
  for (let c = col - 1; c >= 0; c--) {
    const f = have(c);
    if (f) return f;
  }
  return null;
}

/** About how many bytes a sheet's frames take once recoloured and cut to their pixels (about 3/4 of the frames' area). */
export const tintBytesOf = (frames: number, frameW: number, frameH: number): number => Math.ceil(frames * frameW * frameH * 4 * 0.75);

/**
 * Which sheets go when the frames kept pass `budget` (indexes into `sheets`): the longest unused
 * first, never one drawn in the last `idleMs` (it may be playing), until the rest fit.
 */
export function evictions(sheets: readonly { bytes: number; lastUse: number }[], budget: number, now: number, idleMs = TINT_IDLE_MS): number[] {
  let total = sheets.reduce((n, s) => n + s.bytes, 0);
  if (total <= budget) return [];
  const order = sheets.map((s, i) => i).filter((i) => now - sheets[i].lastUse >= idleMs).sort((a, b) => sheets[a].lastUse - sheets[b].lastUse);
  const out: number[] = [];
  for (const i of order) {
    if (total <= budget) break;
    out.push(i);
    total -= sheets[i].bytes;
  }
  return out;
}

/**
 * The sheets to prepare when a battle opens, smallest first, as many as fit in `budget` (by their
 * estimated bytes, `tintBytesOf`): the rest are made when they are cast.
 */
export function preparable<T extends { bytes: number }>(list: readonly T[], budget: number): T[] {
  const out: T[] = [];
  let total = 0;
  for (const s of [...list].sort((a, b) => a.bytes - b.bytes)) {
    if (total + s.bytes > budget) break;
    total += s.bytes;
    out.push(s);
  }
  return out;
}
