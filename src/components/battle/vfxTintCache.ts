// The elemental jutsu sheets in their caster's chakra colour, for the battle (the owner,
// 2026-10-21). Each frame is recoloured once per sheet and colour (sprite/vfxTint.ts) and kept as
// a small image cut to its pixels. The sheets a battle's ninjas can play are prepared in the
// background (in workers, which also read and write the pixels, so the screen's thread only cuts
// the frame out of his sheet, decoded once from its file). A frame that is still being made when
// it should play is never made on the screen's thread: the effect holds its last ready frame a
// moment, or plays its drawn stand-in in the colour until its first frames are ready; the frames
// of the sheets a cast is about to play jump the queue. With Natural or the sheet's own colour
// nothing is made: the effect plays his sheet itself. The frames kept are capped (TINT_BUDGET):
// sheets unused for a while go, and the workers stop with the battle.
// Without workers (a browser that blocks them) the small sheets are made here between the
// screen's frames, and the big signatures play in his colours rather than stutter.

import { tintVfx, vfxTintIsNatural } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';
import { worldSprite } from '../world/WorldSpriteView';
import { TINT_BUDGET, cropFrame, evictions, heldFrame, isBigSheet, preparable, tintBytesOf } from './vfxTintPlan';
import type { CroppedFrame, TintSheetRef } from './vfxTintPlan';
import type { TintJob, TintReply } from './vfxTint.worker';

type Src = NonNullable<ReturnType<typeof worldSprite>>;

/** A frame in the colour: an image cut to its pixels, and where its corner sits in the frame. */
export interface TintedFrame {
  img: HTMLCanvasElement | ImageBitmap;
  x: number;
  y: number;
}

/** A frame's key: row * ROW + column. */
const ROW = 1024;

/** No frame of the animation is ready yet. */
export const WAIT = 'wait';

export class TintedSheet {
  /** The frames made, by key: null is an empty frame. */
  readonly frames = new Map<number, TintedFrame | null>();
  /** The sheet as vfxSprites.ts draws it: his image and spec, and this. */
  readonly view: Src & { tinted: TintedSheet };
  /** Its pixels could not be read or recoloured: it plays as he drew it. */
  broken = false;
  /** Let go (over the budget, or the battle ended): its late frames are dropped. */
  gone = false;
  /** A big signature's frames (isBigSheet). */
  readonly big: boolean;
  /** Bytes of the frames made, and when it was last drawn (or made, before it is drawn). */
  bytes = 0;
  lastUse = performance.now();
  /** The last frame it asked to hurry for, so a held frame does not re-sort the queue every screen frame. */
  private hurried = -1;

  constructor(
    readonly src: Src,
    readonly element: TintElement,
    readonly color: string,
    readonly beast: boolean,
    readonly name: string,
    readonly key: string,
  ) {
    this.view = { ...src, tinted: this };
    this.big = isBigSheet(src.spec.frameW, src.spec.frameH);
  }

  private order?: number[];
  /** Every frame its animations play, in their order (a long effect's phases are rows, one after another). */
  keys(): number[] {
    if (this.order) return this.order;
    const out = new Set<number>();
    for (const a of Object.values(this.src.spec.anims)) for (let c = 0; c < a.frames; c++) out.add(a.row * ROW + c);
    return (this.order = [...out]);
  }

  /**
   * A frame in the colour; null: an empty frame; undefined: draw his; WAIT: none of its animation
   * is ready yet (the effect's drawn stand-in plays in the colour meanwhile). One still being made
   * holds the nearest earlier ready frame, of its row or of the rows played before it (a surge
   * split over rows, Kirin's phases).
   */
  frame(row: number, col: number): TintedFrame | null | undefined | typeof WAIT {
    // Without workers a big signature plays in his colours (making it here would stutter).
    if (this.broken || (this.big && pool === null)) return undefined;
    this.lastUse = performance.now();
    const k = row * ROW + col;
    const have = this.frames.get(k);
    if (have !== undefined) return have;
    if (pool === null) {
      // No workers: a small frame is made here, as the background would.
      try {
        const t0 = performance.now();
        const f = made(tintHere(this, row, col));
        this.add(k, f);
        tintStats.onTheSpot++;
        tintStats.onTheSpotMs += performance.now() - t0;
        return f;
      } catch {
        // A sheet whose pixels can't be read (a tainted canvas) keeps his colours rather than vanish.
        this.broken = true;
        return undefined;
      }
    }
    if (this.hurried !== k) {
      this.hurried = k;
      hurrySheet(this, k);
    }
    tintStats.held++;
    const order = this.keys();
    return heldFrame((i) => this.frames.get(order[i]), order.indexOf(k)) ?? WAIT;
  }

  /** Keeps a frame made for it. */
  add(k: number, f: TintedFrame | null): void {
    this.frames.set(k, f);
    if (f) this.bytes += f.img.width * f.img.height * 4;
    trim(this);
  }

  /** Lets its frames go. */
  release(): void {
    this.gone = true;
    for (const f of this.frames.values()) if (f && 'close' in f.img) f.img.close();
    this.frames.clear();
    this.bytes = 0;
  }
}

const sheets = new Map<string, TintedSheet>();
const keyOf = (src: Src, color: string) => `${src.img.src}|${color.toLowerCase()}`;

/** Frames made so far: by the workers, here in the background, here on the spot (and the ms that took), held while one is made, and sheets let go; for the automated checks. */
export const tintStats = { worker: 0, background: 0, onTheSpot: 0, onTheSpotMs: 0, held: 0, evicted: 0, mb: 0 };

/** Over the budget: the sheets unused longest go (never `keep`, nor one playing). */
function trim(keep: TintedSheet): void {
  const list = [...sheets.values()];
  for (const i of evictions(list.map((s) => (s === keep ? { bytes: s.bytes, lastUse: Infinity } : s)), TINT_BUDGET, performance.now())) {
    list[i].release();
    sheets.delete(list[i].key);
    tintStats.evicted++;
  }
  tintStats.mb = Math.round(list.reduce((n, s) => n + s.bytes, 0) / 1e6);
}

/**
 * His sheet in a chakra colour (a chakra colour id or '#rrggbb'), made frame by frame and kept; its
 * frames start being made in the background. Undefined when the colour leaves the sheet as he drew
 * it (Natural, its own colour): draw his sheet itself.
 */
export function tintedSheet(src: Src, element: TintElement, color: string, beast: boolean, name: string): TintedSheet | undefined {
  const key = keyOf(src, color);
  let t = sheets.get(key);
  if (t) return t;
  if (vfxTintIsNatural(element, color, { beast, sprite: name })) return undefined;
  workers();
  t = new TintedSheet(src, element, color, beast, name, key);
  sheets.set(key, t);
  for (const k of t.keys()) jobs.push({ sheet: t, key: k });
  kick();
  return t;
}

/**
 * Starts recolouring these sheets in the background (the sheets a battle's ninjas can play, from
 * unitTintSheets): the small ones first, as most casts use them and they are ready in a moment, as
 * many as the budget holds (the rest are made when cast). Sheets already prepared are kept.
 */
export function prepareVfxTints(list: { ref: TintSheetRef; color: string }[]): void {
  const found: { src: Src; ref: TintSheetRef; color: string; bytes: number }[] = [];
  for (const { ref, color } of list) {
    const src = worldSprite(ref.group, ref.name);
    if (!src || sheets.has(keyOf(src, color))) continue;
    const frames = Object.values(src.spec.anims).reduce((n, a) => n + a.frames, 0);
    found.push({ src, ref, color, bytes: tintBytesOf(frames, src.spec.frameW, src.spec.frameH) });
  }
  const room = TINT_BUDGET - [...sheets.values()].reduce((n, s) => n + s.bytes, 0);
  for (const f of preparable(found, room)) tintedSheet(f.src, f.ref.element, f.color, !!f.ref.beast, f.ref.name);
}

/**
 * An effect is about to play these sheets (his sheet, its element, the colour, a beast's, its
 * name), the first first: their frames go to the front of the queue, in the order they play.
 */
export function hurryVfxSheets(list: { src: Src; element: TintElement; color: string; beast: boolean; name: string }[]): void {
  for (const x of [...list].reverse()) {
    const t = tintedSheet(x.src, x.element, x.color, x.beast, x.name);
    if (t) hurrySheet(t, 0);
  }
}

/** A frame of this sheet is wanted now: it goes first, then the frames after it, then the sheet's others. */
function hurrySheet(t: TintedSheet, from: number): void {
  toFront((j) => j.sheet === t, (a, b) => (a.key >= from ? 0 : 1) - (b.key >= from ? 0 : 1) || a.key - b.key);
}

function toFront(mine: (j: Job) => boolean, order?: (a: Job, b: Job) => number): void {
  const first = jobs.filter(mine);
  if (!first.length) return;
  if (order) first.sort(order);
  const rest = jobs.filter((j) => !mine(j));
  jobs.splice(0, jobs.length, ...first, ...rest);
  kick();
}

/** The battle is over: the recoloured sheets go and the workers stop (the next battle starts its own). */
export function releaseVfxTints(): void {
  for (const s of sheets.values()) s.release();
  sheets.clear();
  jobs.length = 0;
  inFlight.clear();
  dropDecoded(true);
  for (const w of pool ?? []) w.terminate();
  pool = undefined;
  tintStats.mb = 0;
}

// --- making the frames ---------------------------------------------------------------------------

interface Job {
  sheet: TintedSheet;
  key: number;
}
const jobs: Job[] = [];
/** Jobs sent to a worker (or being cut out for one), by id. */
const inFlight = new Map<number, { job: Job; worker: Worker }>();
let nextId = 1;
/** The workers: undefined until first tried, null when there are none (the frames are made here). */
let pool: Worker[] | null | undefined;
/** Frames each worker holds at once: one being made, one waiting. */
const PER_WORKER = 2;
let scheduled = false;
/** The frames go to the workers as images (OffscreenCanvas there), else as pixels. */
const asImages = typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';

const loaded = (s: Src) => s.img.complete && s.img.naturalWidth > 0;
const live = (t: TintedSheet) => !t.gone && sheets.get(t.key) === t;

let reader: CanvasRenderingContext2D | null = null;
/** One frame of his sheet, as pixels. */
function pixels(src: Src, row: number, col: number): ImageData {
  const { frameW: w, frameH: h } = src.spec;
  if (!reader) reader = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const c = reader.canvas;
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  reader.clearRect(0, 0, w, h);
  reader.drawImage(src.img, col * w, row * h, w, h, 0, 0, w, h);
  return reader.getImageData(0, 0, w, h);
}

function tintHere(t: TintedSheet, row: number, col: number): CroppedFrame | null {
  const { frameW: w, frameH: h } = t.src.spec;
  const out = tintVfx(pixels(t.src, row, col).data, t.element, t.color, { width: w, height: h, beast: t.beast, sprite: t.name });
  return cropFrame(out, w, h);
}

function made(c: CroppedFrame | null): TintedFrame | null {
  if (!c) return null;
  const img = document.createElement('canvas');
  img.width = c.w;
  img.height = c.h;
  img.getContext('2d')!.putImageData(new ImageData(c.rgba as Uint8ClampedArray<ArrayBuffer>, c.w, c.h), 0, 0);
  return { img, x: c.x, y: c.y };
}

/** No workers after all: the frames are made here between the screen's frames. */
function noWorkers(): void {
  for (const x of pool ?? []) x.terminate();
  pool = null;
  jobs.unshift(...[...inFlight.values()].map((f) => f.job));
  inFlight.clear();
  kick();
}

function spawn(): Worker {
  const w = new Worker(new URL('./vfxTint.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<TintReply>) => {
    const { id, bitmap, x, y, frame, error } = e.data;
    const job = inFlight.get(id)?.job;
    inFlight.delete(id);
    if (job && live(job.sheet) && !job.sheet.frames.has(job.key)) {
      if (error) job.sheet.broken = true;
      else {
        job.sheet.add(job.key, bitmap ? { img: bitmap, x: x ?? 0, y: y ?? 0 } : made(frame ?? null));
        tintStats.worker++;
      }
    } else bitmap?.close();
    kick();
  };
  w.onerror = (e) => {
    // No workers here (blocked or unsupported).
    e.preventDefault();
    noWorkers();
  };
  return w;
}

/** A few workers (the big signatures in black take a while), leaving a core to the screen. */
function workers(): Worker[] | null {
  if (pool !== undefined) return pool;
  try {
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
    pool = Array.from({ length: n }, spawn);
  } catch {
    for (const x of pool ?? []) x.terminate();
    pool = null;
  }
  return pool;
}

/** A worker with room for another frame, if any. */
function freeWorker(ws: Worker[]): Worker | undefined {
  const load = new Map<Worker, number>(ws.map((w) => [w, 0]));
  for (const f of inFlight.values()) load.set(f.worker, (load.get(f.worker) ?? 0) + 1);
  let best: Worker | undefined;
  for (const w of ws) if ((load.get(w) ?? 0) < PER_WORKER && (!best || (load.get(w) ?? 0) < (load.get(best) ?? 0))) best = w;
  return best;
}

function kick(): void {
  if (scheduled || !jobs.length) return;
  scheduled = true;
  setTimeout(pump, 0);
}

/** The next job whose sheet has loaded and whose frame is still to make (done ones are dropped). */
function nextJob(): Job | undefined {
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    // Without workers the big signatures play in his colours: their frames are not made.
    if (j.sheet.frames.has(j.key) || j.sheet.broken || !live(j.sheet) || (pool === null && j.sheet.big)) {
      jobs.splice(i--, 1);
      continue;
    }
    if (!loaded(j.sheet.src)) continue;
    jobs.splice(i, 1);
    return j;
  }
  return undefined;
}

/**
 * His sheet decoded once, off the screen's thread (from its file), while its frames are being made:
 * cutting a frame straight from the page's image decodes the whole sheet again each time (a third
 * of a second for a big signature's), on the screen's thread. Null: it could not be (cut from the
 * page's image then). Let go when no frame of it is left to make (`dropDecoded`).
 */
const decoded = new Map<string, Promise<ImageBitmap | null>>();
function decodedSheet(src: Src): Promise<ImageBitmap | null> {
  let p = decoded.get(src.img.src);
  if (!p) {
    p = fetch(src.img.src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => createImageBitmap(b))
      .catch(() => null);
    decoded.set(src.img.src, p);
  }
  return p;
}

/** Lets go of the decoded sheets no frame left to make needs (or all of them). */
function dropDecoded(all = false): void {
  const need = new Set<string>();
  if (!all) for (const j of [...jobs, ...[...inFlight.values()].map((f) => f.job)]) if (live(j.sheet) && !j.sheet.broken) need.add(j.sheet.src.img.src);
  for (const [url, p] of decoded) {
    if (need.has(url)) continue;
    decoded.delete(url);
    void p.then((b) => b?.close());
  }
}

/** Sends a frame to a worker: cut out of his decoded sheet as an image (no pixels read here), or as pixels. */
function send(w: Worker, j: Job, row: number, col: number): void {
  const { frameW, frameH } = j.sheet.src.spec;
  const id = nextId++;
  inFlight.set(id, { job: j, worker: w });
  const base = { id, w: frameW, h: frameH, element: j.sheet.element, color: j.sheet.color, beast: j.sheet.beast, sprite: j.sheet.name };
  const asPixels = () => {
    const rgba = pixels(j.sheet.src, row, col).data.buffer as ArrayBuffer;
    w.postMessage({ ...base, rgba } satisfies TintJob, [rgba]);
  };
  if (!asImages) return asPixels();
  decodedSheet(j.sheet.src)
    .then((sheet) => {
      // Gone with its battle meanwhile: nothing to cut.
      if (inFlight.get(id)?.worker !== w) return Promise.reject(new Error('gone'));
      return createImageBitmap(sheet ?? j.sheet.src.img, col * frameW, row * frameH, frameW, frameH);
    })
    .then(
      (bitmap) => {
        // Gone with its battle, or the workers with it, meanwhile.
        if (inFlight.get(id)?.worker !== w || !pool?.includes(w)) return bitmap.close();
        w.postMessage({ ...base, bitmap } satisfies TintJob, [bitmap]);
      },
      () => {
        if (inFlight.get(id)?.worker !== w) return;
        try {
          asPixels();
        } catch {
          inFlight.delete(id);
          j.sheet.broken = true;
        }
      },
    );
}

function pump(): void {
  scheduled = false;
  const ws = workers();
  const t0 = performance.now();
  let full = false;
  for (;;) {
    const w = ws ? freeWorker(ws) : undefined;
    if (ws ? !w : performance.now() - t0 > 6) {
      full = !!ws;
      break;
    }
    const j = nextJob();
    if (!j) break;
    const row = Math.floor(j.key / ROW);
    const col = j.key % ROW;
    try {
      if (w) send(w, j, row, col);
      else {
        j.sheet.add(j.key, made(tintHere(j.sheet, row, col)));
        tintStats.background++;
      }
    } catch {
      j.sheet.broken = true;
    }
  }
  dropDecoded();
  // The workers are full: each frame they give back calls again. Otherwise more to make here, or
  // sheets still loading: come back shortly.
  if (full) return;
  if (jobs.some((j) => loaded(j.sheet.src))) kick();
  else if (jobs.length) setTimeout(kick, 200);
}
