"""Cuts the owner's paint-over of the wind sheet (REF-wind-set-owner.jpg) into game-scale key frames
for the wind set, v3 (tools/world-sprites/vfx-wind-v3.ts).

    python3 -I tools/refs/wind-from-ref.py <REF-wind-set-owner.jpg> tools/world-sprites/vfx-wind-v3-refdata.ts [previewDir]

The owner asked for his reference to be copied as exactly as possible, so every key frame is HIS
pixels:
  * Scale. His sheet is our 2x review sheet (vfx-wind.png) redrawn at 0.544 of its size, so each of
    his panels is our sprite frame at S = 1.0875 of his pixels per game pixel (bolt 74x70 for our
    68x64, aura 87x141 for 80x128...), and his character is our 96 px character at the same factor
    (104-105 px). The inside top-left of each of his panels is our frame's (0, 0), so his art maps
    onto our anchors directly. Everything is area-averaged (box filter) down to game scale.
  * Clean-up. His panel fill (#20202a), the sheet background, the panel border lines, his
    character and labels are removed. The JPEG is smoothed (gaussian 0.6 px) before any decision.
  * Opacity. Each of his pixels is split into what he painted and the background under it:
      solid   - his strokes, leaves and dust, with their shading and the dark teal / green / brown
                outline round them: opaque;
      veil    - soft see-through wind (the breath cone, faint wisps, glows) lighter than his fill:
                colour-to-alpha (the least alpha that composites back to his pixel over his fill);
      dark    - dark teal fill between strokes away from any stroke: a dark veil at fixed alpha.
    Composited over his panel fill, every sprite gives back his picture.
  * Palette. One palette for the set, median-cut from his own pixels: opaque colours, plus veil
    colours at a few alpha steps. Silhouette edges that are dark become a 1 px outline tinted by
    what it surrounds (deep teal round wind, deep green round leaves, dark brown round dust).
  * Pieces. Each sprite's key frame is split into the parts the generator animates (the swirl, the
    rings, the funnel, the trail...), and loose leaves are cut out one by one so they can drift.
The result is written as indexed run-length data that the generator decodes, so the build needs no
image files. Deterministic.
"""
import base64, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

REF, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
IM = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
S = 1.0875                                  # his pixels per game pixel
FILL = np.array([32.0, 32.0, 42.0])         # his panel fill
SHEET = np.array([21.0, 21.0, 29.0])        # his sheet background
BORDER = np.array([40.0, 40.0, 50.0])       # his panel border line

# --- small image tools ------------------------------------------------------------------------------

def gauss(a, s):
    """Separable gaussian blur of an HxW or HxWxC float array (edges clamped)."""
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out

def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]

def hue(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-9)

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))

def shift(m, dy, dx):
    out = np.zeros_like(m); H, W = m.shape[:2]
    ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
    xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
    out[ys, xs] = m[yd, xd]
    return out

def dilate(m, n=1, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb: o |= shift(m, dy, dx)
        m = o
    return m

def components(m, nb=N8):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in nb:
                        u, v = a + dy, b + dx
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n; st.append((u, v))
    return lab, n

def poly_mask(h, w, x0, y0, polys, scale=1.0):
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * scale, (y - y0) * scale) for x, y in p], fill=255)
    return np.asarray(m) > 0

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def ellipse(cx, cy, rx, ry, n=48, a0=0.0, a1=2 * math.pi):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

GB = gauss(IM, 0.6)

