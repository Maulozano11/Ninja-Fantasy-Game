// Recolours jutsu effect frames off the main thread (vfxTintCache.ts sends them): a big signature
// frame in black takes a few hundred milliseconds, which would stutter the battle.

import { tintVfx } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';
import { cropFrame } from './vfxTintPlan';

export interface TintJob {
  id: number;
  rgba: ArrayBuffer;
  w: number;
  h: number;
  element: TintElement;
  color: string;
  beast: boolean;
  sprite: string;
}

// The worker's own scope (the project's types are the page's).
const scope = self as unknown as { onmessage: ((e: MessageEvent<TintJob>) => void) | null; postMessage(m: unknown, transfer?: Transferable[]): void };

scope.onmessage = (e) => {
  const { id, rgba, w, h, element, color, beast, sprite } = e.data;
  try {
    const out = tintVfx(new Uint8ClampedArray(rgba), element, color, { width: w, height: h, beast, sprite });
    const frame = cropFrame(out, w, h);
    scope.postMessage({ id, frame }, frame ? [frame.rgba.buffer as ArrayBuffer] : []);
  } catch (err) {
    scope.postMessage({ id, error: String(err) });
  }
};
