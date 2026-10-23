// Jutsu frames turned to where they are aimed (aimPlan.ts), made with RotSprite (sprite/rotRgba.ts)
// and kept by angle bucket, so a turned effect costs one drawImage like an unturned one. RotSprite
// takes from a few to tens of milliseconds a frame (the big dragon head), so it runs in a worker
// (vfxTurn.worker.ts): until a frame comes back, the caller draws a stand-in (the canvas's own
// nearest-neighbour turn of the same pixels: crisp, a little more jagged), for a frame or two.

import type { TurnJob, TurnReply } from './vfxTurn.worker';

export interface TurnedFrame {
  img: HTMLCanvasElement;
  /** Where the pivot lies in img. */
  ox: number;
  oy: number;
}

/** Each source image gets a number for the cache key (sheets and recoloured frames alike). */
const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: object): number => {
  let id = ids.get(o);
  if (id === undefined) ids.set(o, (id = nextId++));
  return id;
};

/** The frames made, most recently used last; at most CAP of them. */
const made = new Map<string, TurnedFrame>();
const CAP = 480;
/** Frames sent to the worker (by key), and the job ids they went as. */
const pending = new Set<string>();
const jobs = new Map<number, string>();
let nextJob = 1;
/** The worker (null: none could be started; the stand-in is drawn for good). */
let worker: Worker | null | undefined;

let scratch: HTMLCanvasElement | null = null;

/** How much it is upscaled before turning: 8x for small frames, 4x for big ones (the dragon head). */
const scaleFor = (w: number, h: number): 4 | 8 => (w * h <= 170 * 170 ? 8 : 4);

function turner(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./vfxTurn.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<TurnReply>) => {
      const { id, rgba, w, h, ox, oy } = e.data;
      const k = jobs.get(id);
      jobs.delete(id);
      if (k === undefined) return;
      pending.delete(k);
      if (!rgba || !w || !h || ox === undefined || oy === undefined) return;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
      made.set(k, { img: c, ox, oy });
      if (made.size > CAP) made.delete(made.keys().next().value as string);
    };
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * `paint` (which draws one frame, w x h, at 0, 0) turned `deg` degrees round `pivot` (pixel corner
 * coordinates in the frame), or null until the worker has made it; `key` and `sub` name the frame
 * (its image and which part of it).
 */
export function turnedFrame(key: object, sub: string, w: number, h: number, pivot: readonly [number, number], deg: number, paint: (g: CanvasRenderingContext2D) => void): TurnedFrame | null {
  const k = `${idOf(key)}|${sub}|${w}x${h}|${pivot[0]},${pivot[1]}|${deg}`;
  const hit = made.get(k);
  if (hit) {
    made.delete(k);
    made.set(k, hit);
    return hit;
  }
  if (pending.has(k) || typeof document === 'undefined') return null;
  const wk = turner();
  if (!wk) return null;
  scratch ??= document.createElement('canvas');
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w;
    scratch.height = h;
  }
  const g = scratch.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h);
  paint(g);
  let rgba: ArrayBuffer;
  try {
    rgba = g.getImageData(0, 0, w, h).data.buffer as ArrayBuffer;
  } catch {
    return null;
  }
  const id = nextJob++;
  pending.add(k);
  jobs.set(id, k);
  const job: TurnJob = { id, rgba, w, h, pivot: [pivot[0], pivot[1]], deg, scale: scaleFor(w, h) };
  wk.postMessage(job, [rgba]);
  return null;
}
