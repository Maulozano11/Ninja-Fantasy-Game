// Recolours jutsu effect frames off the main thread (vfxTintCache.ts sends them): a big signature
// frame in black takes a few hundred milliseconds, which would stutter the battle. When the browser
// has OffscreenCanvas the frame comes as an image and goes back as one, so the screen's thread
// never reads or writes the pixels; otherwise they come and go as raw RGBA.

import { tintVfx } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';
import { cropFrame } from './vfxTintPlan';
import type { CroppedFrame } from './vfxTintPlan';

export interface TintJob {
  id: number;
  /** The frame as an image (cut from his sheet), or its pixels. */
  bitmap?: ImageBitmap;
  rgba?: ArrayBuffer;
  w: number;
  h: number;
  element: TintElement;
  color: string;
  beast: boolean;
  sprite: string;
}

export interface TintReply {
  id: number;
  /** The recoloured frame cut to its pixels as an image, and where its corner sits in the frame. */
  bitmap?: ImageBitmap;
  x?: number;
  y?: number;
  /** The same as pixels (no OffscreenCanvas), or null: an empty frame. */
  frame?: CroppedFrame | null;
  error?: string;
}

// The worker's own scope (the project's types are the page's).
const scope = self as unknown as { onmessage: ((e: MessageEvent<TintJob>) => void) | null; postMessage(m: TintReply, transfer?: Transferable[]): void };

function pixelsOf(bitmap: ImageBitmap, w: number, h: number): Uint8ClampedArray {
  const c = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })!;
  c.drawImage(bitmap, 0, 0);
  bitmap.close();
  return c.getImageData(0, 0, w, h).data;
}

scope.onmessage = (e) => {
  const { id, bitmap, rgba, w, h, element, color, beast, sprite } = e.data;
  try {
    const px = bitmap ? pixelsOf(bitmap, w, h) : new Uint8ClampedArray(rgba!);
    const out = tintVfx(px, element, color, { width: w, height: h, beast, sprite });
    const frame = cropFrame(out, w, h);
    if (!bitmap || !frame) {
      scope.postMessage({ id, frame }, frame ? [frame.rgba.buffer as ArrayBuffer] : []);
      return;
    }
    const c = new OffscreenCanvas(frame.w, frame.h);
    c.getContext('2d')!.putImageData(new ImageData(frame.rgba as Uint8ClampedArray<ArrayBuffer>, frame.w, frame.h), 0, 0);
    const img = c.transferToImageBitmap();
    scope.postMessage({ id, bitmap: img, x: frame.x, y: frame.y }, [img]);
  } catch (err) {
    scope.postMessage({ id, error: String(err) });
  }
};
