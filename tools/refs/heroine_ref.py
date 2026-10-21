"""Shared helpers for lifting parts out of the owner's two heroine pictures.

  lyra   docs/reference/lyra-owner-reference.jpg   (provisional "Lyra, la Espada Dorada")
  elise  docs/reference/elise-owner-reference.jpg  (provisional "Elise, la Espada Celeste")

Both pictures (1493 x 2000) are his own pixel art on white, the same body in the same pose: a woman
in 3/4 view facing right, a sword held low in her near hand with its blade down across her legs. Her
pixel is about 7.81 picture pixels (PITCH), on the same grid in both pictures (PHASE): 191 x 256 of
her pixels. The figure is about 244 of them tall where ours is about 92, so nothing is copied 1:1:
every part is brought down to our scale and fitted to our female rig (src/sprite/rig.ts 'female' at
idle frame 0), in each picture's own colours.

Her pixels sit on an even grid that wanders by a picture pixel or so: grid() snaps each boundary of
the even grid to where her edges are, native() takes the median of each block's inside.

  native(which)      her pixels, (256, 191, 3) int
  background(a)      the white round her
  JOINTS             her joints in her pixels (shared by both pictures: the template is the same)
  OUR_JOINTS         our female rig at idle frame 0, in fine pixels of our 256 x 256 frame
  SEGMENTS           how each part of her lands on our rig (backward / forward maps)
  PALETTES[which]    each picture's colours; quantize(a, which)
  reduced(which)     the reduced reference (tools/refs/heroine-study.py): her figure at our scale on
                     our female idle, every pixel one of that picture's colours

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from
the repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, pack, save, ts_piece  # noqa: E402,F401

REFS = {
    'lyra': 'docs/reference/lyra-owner-reference.jpg',
    'elise': 'docs/reference/elise-owner-reference.jpg',
}
WHICH = ('lyra', 'elise')
# Her pixel size and where the first boundary falls, in picture pixels (x, y): the strongest period
# of her edges across each whole picture (lyra 7.8060 x 7.8115 from 5.57, 0.14; elise 7.8055 x
# 7.8120 from 5.61, 0.02). The two pictures share one grid: 2000 / 256 = 7.8125 down.
PITCH = (7.806, 7.812)
PHASE = {'lyra': (5.57, 0.14), 'elise': (5.61, 0.02)}
# How far (picture pixels) a boundary may be snapped off the even grid to the edge she drew.
SNAP = 1
GRID = 256


def _edges(L, axis):
    """Edge strength at each boundary along an axis (0: x, 1: y), summed across the picture; the
    picture's own edges count as the strongest."""
    g = np.zeros(L.shape[1 - axis] + 1)
    g[1:-1] = np.abs(np.diff(L, axis=1 - axis)).sum(axis)
    g[0] = g[-1] = g.max() * 4
    return g


def _snap(g, pitch, phase, R=SNAP, lam=400.0):
    """Her block boundaries along one axis: each within R picture pixels of the even grid (pitch,
    phase), where her edges are strongest, no block narrower than 6 or wider than 10. The JPEG's own
    8 x 8 blocks leave faint edges every 8 picture pixels, as strong as hers in the white round her:
    lam keeps a boundary on the even grid unless an edge of hers pulls it off."""
    n = len(g) - 1
    u = [phase + k * pitch for k in range(int((n - phase) / pitch) + 2)]
    u = [x for x in u if -0.5 <= x <= n + 0.5]
    best = []
    for i, x in enumerate(u):
        row = {}
        for c in range(int(np.floor(x)) - R, int(np.floor(x)) + R + 2):
            if not 0 <= c <= n:
                continue
            s = g[c] - lam * abs(c - x)
            if i == 0:
                row[c] = (s, None)
                continue
            opts = [(best[i - 1][q][0] + s, q) for q in best[i - 1] if 6 <= c - q <= 10]
            if opts:
                row[c] = max(opts)
        best.append(row)
    i = len(best) - 1
    c = max(best[i], key=lambda q: best[i][q][0])
    out = []
    while i >= 0:
        out.append(c)
        c = best[i][c][1]
        i -= 1
    return out[::-1]


_GRID_CACHE = {}


def grid(which):
    """Her block boundaries in picture pixels: (xs, ys)."""
    if which not in _GRID_CACHE:
        a = np.asarray(Image.open(REFS[which]).convert('RGB')).astype(np.float64)
        L = luma(a)
        _GRID_CACHE[which] = (_snap(_edges(L, 0), PITCH[0], PHASE[which][0]),
                              _snap(_edges(L, 1), PITCH[1], PHASE[which][1]))
    return _GRID_CACHE[which]


_NATIVE_CACHE = {}


def native(which):
    """Her pixels: the median of each block's inside (a picture pixel in from its edges), as an
    (H, W, 3) int array."""
    if which not in _NATIVE_CACHE:
        a = np.asarray(Image.open(REFS[which]).convert('RGB')).astype(np.int32)
        xs, ys = grid(which)
        out = np.zeros((len(ys) - 1, len(xs) - 1, 3))
        for j in range(len(ys) - 1):
            for i in range(len(xs) - 1):
                c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
                out[j, i] = np.median(c, axis=0)
        _NATIVE_CACHE[which] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE_CACHE[which].copy()


def background(a, light=228):
    """The white round her, reached from the picture's edge through pixels lighter than `light`."""
    H, W, _ = a.shape
    L = luma(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= light:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg
