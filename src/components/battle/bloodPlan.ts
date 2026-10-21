// The Bleeding Cut's blood (the owner, 2026-10-21: "hay que añadir algun sprite de sangre explotando
// hacia el lado donde se hace el corte", and "las gotas de sangre manchan la pantalla cuando
// exitosamente se consigue el sangrado"): when the spray plays, the drip of a bleeding ninja, and
// where the drops land on the screen. The pure half, so it is tested (bloodPlan.test.ts);
// vfxSprites.ts draws it from vfx_blood (tools/world-sprites/vfx-blood.ts). Blood has no element:
// the chakra colour never touches it.

import type { BattleEvent, Unit } from '../../battle/types';
import type { Rect } from './renderer';

/** The sheets' group. */
export const BLOOD_GROUP = 'vfx_blood';

/**
 * When the spray bursts after the blade comes down (ms at speed 1): as the white crescent crosses
 * the target's body (its sweep is at the middle a third of the way through, vfxSprites.ts).
 */
export const SPRAY_DELAY = 150;
/** How long the spray plays (its 12 frames at 12 fps), and when its drops are all down. */
export const SPRAY_MS = 1000;
export const SPRAY_LANDED = 640;
/** How long the drip of a bleeding ninja plays (8 frames at 10 fps). */
export const DRIP_MS = 800;

/** Bleeding taking hold: the cut landed, the foe is still up and now bleeds (no miss, no fall, no effect refused). */
export const bleedingStarts = (ev: BattleEvent): boolean => ev.t === 'effect' && ev.effect === 'bleeding' && ev.on;

/**
 * Bleeding hurting at the start of the bleeding ninja's turn (turns.ts): slashing damage with no one
 * behind it, on a ninja that bleeds. A blade's blow always names its striker.
 */
export function isBleedTick(ev: BattleEvent, u: Pick<Unit, 'effects'> | undefined): boolean {
  return ev.t === 'damage' && ev.dmgType === 'Slashing' && !ev.source && !!u?.effects?.some((e) => e.id === 'bleeding');
}

// --- on the screen -----------------------------------------------------------------------------

/** How long the drops stay on the screen (ms at speed 1): they hit, hold, run down and fade. */
export const SCREEN_MS = 1700;
/** The splat frame size and anchor in the sheet (vfx_blood/screen). */
export const SPLAT = { w: 56, h: 72, anchor: [28, 24] as [number, number] };

export interface ScreenSplat {
  /** The splat's centre on the screen (device pixels). */
  x: number;
  y: number;
  /** Which of the four splats (the sheet's rows a to d). */
  variant: 'a' | 'b' | 'c' | 'd';
  /** Whole pixels per sprite pixel: it grows with the screen, never with the camera's zoom. */
  scale: number;
  /** It lands this long after the first (ms at speed 1). */
  delay: number;
}

/** A sprite pixel's size on a screen this tall: about the size of the battle's own pixels at the close zoom. */
export const splatScale = (H: number): number => Math.max(2, Math.round(H / 300));

/**
 * Where the drops land, toward the side the cut went (`side` 1 right, -1 left): near that edge of
 * the screen, clear of the HTML panels over the canvas (the HUD, the minimap, the roll), so they
 * never cover what the player reads. Three drops, a big one and two smaller, from a fixed list of
 * spots picked by `seed`; a spot under a panel is skipped.
 */
export function screenSplats(W: number, H: number, side: 1 | -1, seed: number, avoid: readonly Rect[] = []): ScreenSplat[] {
  const big = splatScale(H);
  const small = Math.max(1, big - 1);
  // Spots as fractions of the screen for a cut going right: the right edge's middle, below the
  // minimap and above the hotbar, and one reaching in from the edge at the top.
  const spots: [number, number, number][] = [
    [0.95, 0.42, big],
    [0.9, 0.64, small],
    [0.975, 0.8, small],
    [0.83, 0.3, small],
    [0.97, 0.56, small],
  ];
  const variants: ScreenSplat['variant'][] = ['a', 'b', 'c', 'd'];
  const out: ScreenSplat[] = [];
  const start = Math.abs(seed) % spots.length;
  for (let i = 0; i < spots.length && out.length < 3; i++) {
    // The big one first; the others go round the list from the seed's spot.
    const [fx, fy, scale] = i === 0 ? spots[0] : spots[1 + ((start + i - 1) % (spots.length - 1))];
    const x = Math.round((side > 0 ? fx : 1 - fx) * W);
    const y = Math.round(fy * H);
    const r: Rect = { x: x - SPLAT.anchor[0] * scale, y: y - SPLAT.anchor[1] * scale, w: SPLAT.w * scale, h: SPLAT.h * scale };
    if (avoid.some((p) => r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h)) continue;
    out.push({ x, y, variant: variants[(Math.abs(seed) + out.length) % variants.length], scale, delay: out.length * 70 });
  }
  return out;
}

/**
 * How a drop on the screen looks `ms` after it landed (at speed 1): the sheet's frame (0 the hit,
 * 1-2 held, 3-6 the run sliding down), how far it has slid (sprite pixels) and how solid it is.
 * Null before it lands and once it has gone.
 */
export function splatAt(ms: number, total = SCREEN_MS): { frame: number; slide: number; alpha: number } | null {
  if (ms < 0 || ms >= total) return null;
  const HOLD = 450, RUN = 1250, FADE = 950;
  const frame = ms < 50 ? 0 : ms < HOLD ? (ms < 250 ? 1 : 2) : Math.min(6, 3 + Math.floor(((ms - HOLD) / (RUN - HOLD)) * 4));
  const slide = ms < HOLD ? 0 : Math.min(1, (ms - HOLD) / (total - HOLD)) * 10;
  const alpha = ms < FADE ? 1 : Math.max(0, 1 - (ms - FADE) / (total - FADE));
  return { frame, slide, alpha };
}
