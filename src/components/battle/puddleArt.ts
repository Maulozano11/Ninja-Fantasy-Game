// Liquid Body on the screen (battle/puddle.ts): the ninja melting into a puddle, the still puddle, and
// rising out of it. The art is the owner's repaint of our water puddle sample, copied pixel for pixel
// (tools/refs/water-puddle-from-ref.py), as water-only layers in our 256 sprite frame (feet at FEET):
// the frames where he kept the ninja are drawn over the unit's own sprite, so any ninja melts in his
// water. It is read from src/assets/world/vfx_puddle/ when the art is there (staged, waiting for his
// approval); without it a plain puddle is drawn instead, so the jutsu still shows in battle.

import type { Unit } from '../../battle/types';
import { isFemaleBody } from '../../sprite/types';
import { getAppearance } from '../../sprite/legacy';

const URLS = import.meta.glob('../../assets/world/vfx_puddle/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const BY_NAME = new Map(Object.entries(URLS).map(([k, url]) => [k.slice(k.lastIndexOf('/') + 1, -4), url]));
const images = new Map<string, HTMLImageElement>();

export type PuddleMode = 'in' | 'idle' | 'out';

/** Each part: its frames' base name, how many, its pace, and the frames that show the ninja itself. */
export const PUDDLE_SEQ: Record<PuddleMode, { name: string; n: number; fps: number; ninja: number[]; body: boolean }> = {
  in: { name: 'agua-transformarse', n: 6, fps: 9, ninja: [0], body: true },
  idle: { name: 'agua-charco-quieto', n: 6, fps: 6, ninja: [], body: false },
  out: { name: 'agua-salir', n: 5, fps: 9, ninja: [3, 4], body: true },
};

/** How long melting and rising take on the screen (ms, at 1x). */
export const PUDDLE_MS: Record<'in' | 'out', number> = {
  in: Math.round((PUDDLE_SEQ.in.n * 1000) / PUDDLE_SEQ.in.fps),
  out: Math.round((PUDDLE_SEQ.out.n * 1000) / PUDDLE_SEQ.out.fps),
};

export const hasPuddleArt = (): boolean => BY_NAME.size > 0;

/** His frames were painted on our default male and on Lyra: a female body takes hers. */
function bodyOf(u: Unit): 'hombre' | 'lyra' {
  const look = u.look ?? (u.character ? getAppearance(u.character) : undefined);
  return look && isFemaleBody(look.body) ? 'lyra' : 'hombre';
}

/** One frame of a part (null while it loads, or when the art isn't there). */
export function puddleFrame(u: Unit, mode: PuddleMode, i: number): HTMLImageElement | null {
  const seq = PUDDLE_SEQ[mode];
  const name = `${seq.name}${seq.body ? `-${bodyOf(u)}` : ''}-${i + 1}`;
  const url = BY_NAME.get(name);
  if (!url) return null;
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(name, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
