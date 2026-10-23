// Turns jutsu effect frames to their aim off the main thread (vfxTurn.ts sends them): RotSprite of
// the big dragon head takes tens of milliseconds a frame, which would stutter the battle. The frame
// comes and goes as raw RGBA.

import { rotSpriteRgba } from '../../sprite/rotRgba';

export interface TurnJob {
  id: number;
  rgba: ArrayBuffer;
  w: number;
  h: number;
  pivot: [number, number];
  deg: number;
  scale: 4 | 8;
}

export interface TurnReply {
  id: number;
  rgba?: ArrayBuffer;
  w?: number;
  h?: number;
  ox?: number;
  oy?: number;
  error?: string;
}

// The worker's own scope (the project's types are the page's).
const scope = self as unknown as { onmessage: ((e: MessageEvent<TurnJob>) => void) | null; postMessage(m: TurnReply, transfer?: Transferable[]): void };

scope.onmessage = (e) => {
  const { id, rgba, w, h, pivot, deg, scale } = e.data;
  try {
    const t = rotSpriteRgba({ w, h, data: new Uint8ClampedArray(rgba) }, pivot, deg, scale);
    const out = t.data.buffer as ArrayBuffer;
    scope.postMessage({ id, rgba: out, w: t.w, h: t.h, ox: t.ox, oy: t.oy }, [out]);
  } catch (err) {
    scope.postMessage({ id, error: String(err) });
  }
};
