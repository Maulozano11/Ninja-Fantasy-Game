// The elemental jutsu sheets in their caster's chakra colour, for the battle (the owner,
// 2026-10-21). Each frame is recoloured once per sheet and colour (sprite/vfxTint.ts) and kept as
// a small canvas cut to its pixels. The sheets a battle's ninjas can play are prepared in the
// background when it starts (in a worker when the browser gives one, else a frame at a time
// between the screen's frames); a frame needed before it is ready is made on the spot. With
// Natural or the sheet's own colour nothing is made: the effect plays his sheet itself.

import { tintVfx, vfxTintIsNatural } from '../../sprite/vfxTint';
import type { TintElement } from '../../sprite/vfxTint';
import { worldSprite } from '../world/WorldSpriteView';
import { cropFrame } from './vfxTintPlan';
import type { CroppedFrame, TintSheetRef } from './vfxTintPlan';
import type { TintJob } from './vfxTint.worker';

type Src = NonNullable<ReturnType<typeof worldSprite>>;

/** A frame in the colour: the canvas cut to its pixels, and where its corner sits in the frame. */
export interface TintedFrame {
  img: HTMLCanvasElement;
  x: number;
  y: number;
}

/** A frame's key: row * ROW + column. */
const ROW = 1024;

export class TintedSheet {
  /** The frames made, by key: null is an empty frame. */
  readonly frames = new Map<number, TintedFrame | null>();
  /** The sheet as vfxSprites.ts draws it: his image and spec, and this. */
  readonly view: Src & { tinted: TintedSheet };
  /** Its pixels could not be read: it plays as he drew it. */
  broken = false;

  constructor(
    readonly src: Src,
    readonly element: TintElement,
    readonly color: string,
    readonly beast: boolean,
    readonly name: string,
  ) {
    this.view = { ...src, tinted: this };
  }

  /** Every frame its animations play, in their order. */
  keys(): number[] {
    const out = new Set<number>();
    for (const a of Object.values(this.src.spec.anims)) for (let c = 0; c < a.frames; c++) out.add(a.row * ROW + c);
    return [...out];
  }

  /** A frame in the colour, made now if the background has not got to it; null: an empty frame; undefined: draw his. */
  frame(row: number, col: number): TintedFrame | null | undefined {
    if (this.broken) return undefined;
    const k = row * ROW + col;
    const have = this.frames.get(k);
    if (have !== undefined) return have;
    try {
      const t0 = performance.now();
      const f = made(tintHere(this, row, col));
      this.frames.set(k, f);
      tintStats.onTheSpot++;
      tintStats.onTheSpotMs += performance.now() - t0;
      return f;
    } catch {
      // A sheet whose pixels can't be read (a tainted canvas) keeps his colours rather than vanish.
      this.broken = true;
      return undefined;
    }
  }
}

const sheets = new Map<string, TintedSheet>();

/** Frames made so far: by the worker, here in the background, here on the spot (and the ms that took), for the automated checks. */
export const tintStats = { worker: 0, background: 0, onTheSpot: 0, onTheSpotMs: 0 };

/**
 * His sheet in a chakra colour (a chakra colour id or '#rrggbb'), made frame by frame and kept; its
 * frames start being made in the background. Undefined when the colour leaves the sheet as he drew
 * it (Natural, its own colour): draw his sheet itself.
 */
export function tintedSheet(src: Src, element: TintElement, color: string, beast: boolean, name: string): TintedSheet | undefined {
  const key = `${src.img.src}|${color.toLowerCase()}`;
  let t = sheets.get(key);
  if (t) return t;
  if (vfxTintIsNatural(element, color, { beast, sprite: name })) return undefined;
  t = new TintedSheet(src, element, color, beast, name);
  sheets.set(key, t);
  for (const k of t.keys()) jobs.push({ sheet: t, key: k });
  kick();
  return t;
}

/**
 * Starts recolouring these sheets in the background (the sheets a battle's ninjas can play, from
 * unitTintSheets): the small ones first, as most casts use them and they are ready in a moment.
 */
export function prepareVfxTints(list: { ref: TintSheetRef; color: string }[]): void {
  const found: { src: Src; ref: TintSheetRef; color: string; size: number }[] = [];
  for (const { ref, color } of list) {
    const src = worldSprite(ref.group, ref.name);
    if (!src) continue;
    const frames = Object.values(src.spec.anims).reduce((n, a) => n + a.frames, 0);
    found.push({ src, ref, color, size: frames * src.spec.frameW * src.spec.frameH });
  }
  found.sort((a, b) => a.size - b.size);
  for (const f of found) tintedSheet(f.src, f.ref.element, f.color, !!f.ref.beast, f.ref.name);
}

/** An effect in this colour is about to play: its sheets' frames go first. */
export function hurryVfxTints(color: string): void {
  const c = color.toLowerCase();
  const first = jobs.filter((j) => j.sheet.color.toLowerCase() === c);
  if (!first.length || first.length === jobs.length) return;
  const rest = jobs.filter((j) => j.sheet.color.toLowerCase() !== c);
  jobs.splice(0, jobs.length, ...first, ...rest);
}

/** The battle is over: the recoloured sheets go (the next battle prepares its own). */
export function releaseVfxTints(): void {
  sheets.clear();
  jobs.length = 0;
  inFlight.clear();
}

// --- making the frames ---------------------------------------------------------------------------

interface Job {
  sheet: TintedSheet;
  key: number;
}
const jobs: Job[] = [];
const inFlight = new Map<number, Job>();
let nextId = 1;
/** The worker: undefined until first tried, null when there is none (the frames are made here). */
let worker: Worker | null | undefined;
let scheduled = false;

const loaded = (s: Src) => s.img.complete && s.img.naturalWidth > 0;

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

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./vfxTint.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; frame?: CroppedFrame | null; error?: string }>) => {
      const job = inFlight.get(e.data.id);
      inFlight.delete(e.data.id);
      // Gone with its battle, made on the spot meanwhile, or failed there (it will be made on the spot).
      if (job && sheets.get(`${job.sheet.src.img.src}|${job.sheet.color.toLowerCase()}`) === job.sheet && !job.sheet.frames.has(job.key) && !e.data.error) {
        job.sheet.frames.set(job.key, made(e.data.frame ?? null));
        tintStats.worker++;
      }
      kick();
    };
    worker.onerror = (e) => {
      // No worker here (blocked or unsupported): the frames are made between the screen's frames.
      e.preventDefault();
      worker?.terminate();
      worker = null;
      jobs.unshift(...inFlight.values());
      inFlight.clear();
      kick();
    };
  } catch {
    worker = null;
  }
  return worker;
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
    if (j.sheet.frames.has(j.key) || j.sheet.broken) {
      jobs.splice(i--, 1);
      continue;
    }
    if (!loaded(j.sheet.src)) continue;
    jobs.splice(i, 1);
    return j;
  }
  return undefined;
}

function pump(): void {
  scheduled = false;
  const w = getWorker();
  const t0 = performance.now();
  for (;;) {
    if (w ? inFlight.size >= 2 : performance.now() - t0 > 6) break;
    const j = nextJob();
    if (!j) break;
    const row = Math.floor(j.key / ROW);
    const col = j.key % ROW;
    try {
      if (w) {
        const { frameW, frameH } = j.sheet.src.spec;
        const px = pixels(j.sheet.src, row, col).data;
        const id = nextId++;
        inFlight.set(id, j);
        const msg: TintJob = { id, rgba: px.buffer as ArrayBuffer, w: frameW, h: frameH, element: j.sheet.element, color: j.sheet.color, beast: j.sheet.beast, sprite: j.sheet.name };
        w.postMessage(msg, [msg.rgba]);
      } else {
        j.sheet.frames.set(j.key, made(tintHere(j.sheet, row, col)));
        tintStats.background++;
      }
    } catch {
      j.sheet.broken = true;
    }
  }
  if (!w || inFlight.size < 2) {
    // More to make here, or sheets still loading: come back shortly.
    if (jobs.some((j) => loaded(j.sheet.src))) kick();
    else if (jobs.length) setTimeout(kick, 200);
  }
}
