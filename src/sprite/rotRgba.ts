// RotSprite for RGBA frames (the jutsu effects' sheets turned to where they are aimed): the same
// method as rotsprite.ts uses for the templates, on pixels with colour and alpha. Upscale with
// Scale2x (two or three times: it keeps diagonals and outlines clean), turn with nearest-neighbour
// sampling, sample back down. No pixel is blended or invented: every output pixel is one of the
// frame's own. Pure: buffers in, buffers out.

export interface Rgba {
  w: number;
  h: number;
  /** RGBA, row by row, 4 bytes a pixel. */
  data: Uint8Array | Uint8ClampedArray;
}

/** A turned frame and where the pivot it was turned round lies in it (pixel corner coordinates). */
export interface TurnedRgba extends Rgba {
  ox: number;
  oy: number;
}

/** One Scale2x pass over 32-bit pixels (equal colours compare equal; fully clear is always 0). */
function scale2x(src: Uint32Array, w: number, h: number): Uint32Array {
  const out = new Uint32Array(w * h * 4);
  const W = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = src[y * w + x];
      const A = y > 0 ? src[(y - 1) * w + x] : 0;
      const B = x < w - 1 ? src[y * w + x + 1] : 0;
      const C = x > 0 ? src[y * w + x - 1] : 0;
      const D = y < h - 1 ? src[(y + 1) * w + x] : 0;
      const o = y * 2 * W + x * 2;
      out[o] = C === A && C !== D && A !== B ? A : P;
      out[o + 1] = A === B && A !== C && B !== D ? B : P;
      out[o + W] = D === C && D !== B && C !== A ? C : P;
      out[o + W + 1] = B === D && B !== A && D !== C ? D : P;
    }
  }
  return out;
}

/**
 * Turns `src` by `deg` (screen degrees, + = clockwise, as y points down) round the point `pivot`
 * (pixel corner coordinates, like a sheet's anchor). `scale` is the upscale before turning (8 = three
 * Scale2x passes, 4 = two: for big frames, a quarter of the work). At 0 degrees the frame comes back
 * unchanged, pixel for pixel. The result's (ox, oy) is where the pivot lies in it: drawn at
 * (x - ox, y - oy) the pivot sits on (x, y), as the unturned frame drawn at (x - pivot) does.
 */
export function rotSpriteRgba(src: Rgba, pivot: readonly [number, number], deg: number, scale: 4 | 8 = 8): TurnedRgba {
  const { w, h } = src;
  const [px, py] = pivot;
  if (Math.round(deg * 1000) % 360000 === 0) return { w, h, data: Uint8ClampedArray.from(src.data), ox: px, oy: py };
  // 32-bit pixels; a fully clear pixel is 0 whatever colour it carried, so clear compares equal.
  // (Native 32-bit words both ways: only equality matters, so the byte order does not.)
  const copy = Uint8Array.from(src.data.subarray(0, w * h * 4));
  let g: Uint32Array = new Uint32Array(copy.buffer);
  for (let i = 0; i < w * h; i++) if (copy[i * 4 + 3] === 0) g[i] = 0;
  let gw = w;
  let gh = h;
  for (let s = 1; s < scale; s *= 2) {
    g = scale2x(g, gw, gh);
    gw *= 2;
    gh *= 2;
  }
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
    // Rounded off at 1e-6 px, so a quarter turn (cos 90 is not quite 0) gets no stray empty column.
  ].map(([x, y]) => [(x - px) * cos - (y - py) * sin, (x - px) * sin + (y - py) * cos].map((v) => Math.round(v * 1e6) / 1e6));
  const minX = Math.floor(Math.min(...corners.map((c) => c[0])));
  const maxX = Math.ceil(Math.max(...corners.map((c) => c[0])));
  const minY = Math.floor(Math.min(...corners.map((c) => c[1])));
  const maxY = Math.ceil(Math.max(...corners.map((c) => c[1])));
  const W = maxX - minX;
  const H = maxY - minY;
  const out = new Uint32Array(W * H);
  for (let j = 0; j < H; j++) {
    const ry = minY + j + 0.5;
    for (let i = 0; i < W; i++) {
      const rx = minX + i + 0.5;
      // The output pixel's centre, turned back into the frame, picks one pixel of the upscaled frame.
      const sx = Math.floor((px + rx * cos + ry * sin) * scale);
      const sy = Math.floor((py - rx * sin + ry * cos) * scale);
      if (sx < 0 || sy < 0 || sx >= gw || sy >= gh) continue;
      out[j * W + i] = g[sy * gw + sx];
    }
  }
  // (+ 0: a pivot on the corner gives 0, never -0.)
  return { w: W, h: H, data: new Uint8ClampedArray(out.buffer), ox: -minX + 0, oy: -minY + 0 };
}
