// A small RGBA image with the drawing calls the battle UI kit needs, plus a PNG reader (any
// 8-bit RGB/RGBA/grey/palette PNG, all row filters) and an atomic PNG writer (temp name, then
// rename). Kept apart from tools/world-sprites/kit.ts so the UI generator loads nothing from src/.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

export type RGBA = [number, number, number, number];
export const NONE: RGBA = [0, 0, 0, 0];

export function hex(h: string, a = 255): RGBA {
  const s = h.replace('#', '');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}
export function toHex(c: RGBA): string {
  return '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function mixc(a: RGBA, b: RGBA, t: number): RGBA {
  return [0, 1, 2, 3].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)) as RGBA;
}
export function alpha(c: RGBA, a: number): RGBA {
  return [c[0], c[1], c[2], Math.round(a)];
}

export class Img {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number, px?: Uint8Array) {
    this.px = px ?? new Uint8Array(w * h * 4);
  }
  clone(): Img {
    return new Img(this.w, this.h, new Uint8Array(this.px));
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): RGBA {
    if (!this.in(x, y)) return NONE;
    const i = (y * this.w + x) * 4;
    return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]];
  }
  a(x: number, y: number): number {
    return this.in(x, y) ? this.px[(y * this.w + x) * 4 + 3] : 0;
  }
  set(x: number, y: number, c: RGBA): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.in(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = c[3];
  }
  /** Source-over blend of one pixel. */
  plot(x: number, y: number, c: RGBA): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.in(x, y) || c[3] === 0) return;
    if (c[3] === 255) return this.set(x, y, c);
    const d = this.get(x, y);
    const sa = c[3] / 255, da = d[3] / 255;
    const oa = sa + da * (1 - sa);
    const ch = (k: number) => (oa ? (c[k] * sa + d[k] * da * (1 - sa)) / oa : 0);
    this.set(x, y, [ch(0), ch(1), ch(2), oa * 255].map(Math.round) as RGBA);
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.plot(xx, yy, c);
  }
  fill(c: RGBA): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c);
  }
  /** Draws `src` with its top-left at (dx, dy) (source-over), optionally mirrored. */
  draw(src: Img, dx: number, dy: number, flipX = false, flipY = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, flipY ? src.h - 1 - y : y);
        if (c[3]) this.plot(dx + x, dy + y, c);
      }
  }
  crop(x: number, y: number, w: number, h: number): Img {
    const o = new Img(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) o.set(xx, yy, this.get(x + xx, y + yy));
    return o;
  }
  /** Nearest-neighbour integer upscale. */
  scaled(k: number): Img {
    const o = new Img(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const i = (Math.floor(y / k) * this.w + Math.floor(x / k)) * 4, j = (y * o.w + x) * 4;
        o.px[j] = this.px[i];
        o.px[j + 1] = this.px[i + 1];
        o.px[j + 2] = this.px[i + 2];
        o.px[j + 3] = this.px[i + 3];
      }
    return o;
  }
  /** Nearest-neighbour resize to any size (used only to show references side by side). */
  resized(w: number, h: number): Img {
    const o = new Img(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) o.set(x, y, this.get(Math.min(this.w - 1, Math.floor(((x + 0.5) * this.w) / w)), Math.min(this.h - 1, Math.floor(((y + 0.5) * this.h) / h))));
    return o;
  }
  flipped(): Img {
    const o = new Img(this.w, this.h);
    o.draw(this, 0, 0, true);
    return o;
  }
  /** Bounding box of pixels with alpha >= 1: [x0, y0, x1, y1] inclusive, or null. */
  bounds(): [number, number, number, number] | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.a(x, y)) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
    return x1 < 0 ? null : [x0, y0, x1, y1];
  }
}

// --- PNG -------------------------------------------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** PNG bytes (8-bit RGBA, filter 0 on every row, zlib level 9): the same pixels give the same bytes. */
export function encodePng(img: Img): Buffer {
  const { w, h, px } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, px.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())]);
}

/** Writes a file through a temporary name in the same folder, then renames it into place. */
export function writeAtomic(path: string, data: Buffer | string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}
export function savePng(path: string, img: Img): void {
  writeAtomic(path, encodePng(img));
}

/** Reads any 8-bit non-interlaced PNG (grey, grey+alpha, RGB, RGBA or palette) into RGBA. */
export function loadPng(path: string): Img {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: not a PNG`);
  let w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  const idat: Buffer[] = [];
  let plte: Buffer | null = null, trns: Buffer | null = null;
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`${path}: only 8-bit non-interlaced PNGs are supported`);
  const ch = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[ctype];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride);
  const out = new Img(w, h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = row[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const i = x * ch;
      let c: RGBA;
      if (ctype === 0) c = [cur[i], cur[i], cur[i], 255];
      else if (ctype === 4) c = [cur[i], cur[i], cur[i], cur[i + 1]];
      else if (ctype === 2) c = [cur[i], cur[i + 1], cur[i + 2], 255];
      else if (ctype === 6) c = [cur[i], cur[i + 1], cur[i + 2], cur[i + 3]];
      else {
        const k = cur[i];
        c = [plte![k * 3], plte![k * 3 + 1], plte![k * 3 + 2], trns && k < trns.length ? trns[k] : 255];
      }
      out.set(x, y, c);
    }
    prev.set(cur);
  }
  return out;
}
