"""Shared helpers for lifting parts out of the owner's Scarlet picture (docs/reference/scarlet-owner-reference.jpg).

His picture (784x1168) is his own pixel art, not a paint-over of ours: a young man in a long black
coat with gold trim, a white shirt and red cravat, pinstripe trousers, tall boots and a dark sword
with a red core, in his own pixels of about 5.33 picture pixels each (147 x 219 of them; the figure
is about 168 of them tall where ours is about 94 fine pixels). So nothing is copied 1:1: every part
is brought down to our scale and fitted to our rig, segment by segment (SEGMENTS), in his colours
(PALETTE). His cape is left out (the owner did not want it).

His pixels do not sit on an exact grid: the generator drew them about PITCH apart from PHASE, but a
boundary wanders up to a picture pixel or two either way. grid() snaps each boundary of the even
grid to where his edges are, and native() takes the median of each block's inside.

  JOINTS     his joints, in his pixels (near = screen-left, as ours)
  OUR_JOINTS our male rig at idle frame 0, in fine pixels of our 256 x 256 frame
  SEGMENTS   how each part of him maps onto us: scale and his -> our anchor
  reduced()  the reduced reference (tools/refs/scarlet-study.py): his figure at our scale on our male
             idle, without the cape, the sword turned to our weapons' way; every pixel one of his
             colours. The art target every part copies.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from
the repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, pack, save, ts_piece  # noqa: E402,F401

REF = 'docs/reference/scarlet-owner-reference.jpg'
# His pixel size and where the first boundary falls, in picture pixels (x, y): the strongest period
# of his edges across the whole picture.
PITCH = (5.3285, 5.313)
PHASE = (0.45, 1.07)
# How far (picture pixels) a boundary may be snapped off the even grid to the edge he drew.
SNAP = 2

# His colours: his pixels (native) clustered, darkest first, plus the dark purples of his coat's
# lining clustered apart (they sit within a few steps of his greys). Rebuild with
# `python3 -I tools/refs/scarlet-study.py --palette`.
PALETTE = [
    '#040405', '#0f0407', '#26060d', '#111014', '#17101a', '#1a191e', '#211a24', '#3a0f1e',
    '#252328', '#5d0e1a', '#4e172a', '#332a1e', '#2e2d33', '#372d39', '#512619', '#601f35',
    '#84141f', '#39383c', '#7c1e2c', '#4e3c2b', '#70273e', '#a11a24', '#5e4a33', '#6f442a',
    '#87324c', '#504e52', '#a9292f', '#9e3b41', '#c72b32', '#70583c', '#9a3e58', '#646267',
    '#9c5e1a', '#846542', '#d83c44', '#ac5068', '#9e654b', '#767276', '#947650', '#e85056',
    '#b27758', '#86868a', '#a8865d', '#c88038', '#be8867', '#9c9496', '#f47278', '#ca9c75',
    '#aca7a6', '#e2af8c', '#beb9b8', '#ffa7a7', '#eabb9d', '#cfc9c8', '#f2c8aa', '#dcd6d4',
    '#f8d4b8', '#ebe6e4',
]
# One character per colour of his, in PALETTE order (for the reduced reference's rows and patches).
CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^'

# His joints, in his pixels (x, y; a pixel (i, j) spans i..i+1, j..j+1), found by looking at him:
# the head is the middle of his skull (his eye line 4 below it), the neck his chin, the shoulders
# the tops of his sleeves, the hands the middle of each glove, the hips at his wrists' height, the
# knees just above his boot tops, the ankles where his boots are narrowest.
JOINTS = {
    'head': (78.8, 41.2),
    'neck': (80.5, 56.3),
    'shoulderN': (59.0, 67.0),
    'shoulderF': (95.0, 66.0),
    'elbowN': (54.0, 87.0),
    'elbowF': (101.0, 89.0),
    'wristN': (54.0, 108.0),
    'wristF': (104.0, 112.0),
    'handN': (54.0, 116.0),
    'handF': (105.0, 119.0),
    'pelvis': (80.0, 112.0),
    'hipN': (71.0, 112.0),
    'hipF': (89.0, 111.0),
    'kneeN': (66.0, 151.0),
    'kneeF': (90.0, 149.0),
    'ankleN': (62.0, 177.0),
    'ankleF': (92.0, 173.0),
}
# Our male rig at idle frame 0 (src/sprite/compose.ts renderSprite(...).rig, design units x RES),
# in fine pixels of our 256 x 256 frame. A held sword does not change it.
OUR_JOINTS = {
    'head': (126.0, 138.0),
    'neck': (127.18, 147.65),
    'shoulderN': (114.01, 152.51),
    'shoulderF': (134.27, 151.81),
    'elbowN': (110.13, 164.50),
    'elbowF': (137.09, 164.08),
    'wristN': (107.62, 175.21),
    'wristF': (142.52, 173.65),
    'handN': (106.80, 178.72),
    'handF': (144.30, 176.78),
    'pelvis': (127.0, 176.87),
    'hipN': (121.58, 176.46),
    'hipF': (131.51, 173.12),
    'kneeN': (122.17, 192.65),
    'kneeF': (138.23, 187.86),
    'ankleN': (118.42, 207.59),
    'ankleF': (135.94, 203.08),
}

# His figure is 168 of his pixels tall (hair top 23 to near sole 190); ours about 94 (Aiden's hair top
# 125 to the near sole 218): one of ours is about 1.79 of his.
SCALE = 0.56


def turned(p, k=1, width=147):
    """A point of his picture after k quarter turns counterclockwise of his pixels (147 wide)."""
    x, y = p
    for _ in range(k):
        x, y = y, width - x
    return (x, y)


# His sword's line, in his pixels: the pommel's end, the middle of the cross-guard where the blade
# leaves it, the point, and the grip under his glove.
SWORD_LINE = {'pommel': (63.5, 101.5), 'guard': (48.0, 123.0), 'tip': (9.0, 179.5), 'grip': (53.6, 114.6)}


def _on_hand(p):
    """A point of his sword, turned, on our rig: the grip on our near hand, at SCALE."""
    g, q = turned(SWORD_LINE['grip']), turned(p)
    return tuple(round(OUR_JOINTS['handN'][i] + (q[i] - g[i]) * SCALE, 2) for i in (0, 1))


# Each part of him on our rig. Our proportions are not his: our head is bigger for the body, our
# shoulders square and broad, our legs shorter, our hands and feet bigger. So:
#   'sim'    scale s about his point `his`, which lands on our point `our`
#   'torso'  x scaled by sx about his middle line (x0: his x -> our x); y in straight runs between
#            knots (his y -> our y), so the coat's skirt is squeezed to end at our knees
#   'chain'  his line (points `his`) laid on ours (`our`), each run lengthwise by the ratio of the two
#            runs and across by `width`; before the first point the first run goes on, past the last
#            point `end` takes over (a 'sim', unturned)
SEGMENTS = {
    # hair and face: his skull on ours; his eye line lands on our eye row (y 140.5), his chin on ours
    'head': {'kind': 'sim', 's': 0.66, 'his': JOINTS['head'], 'our': OUR_JOINTS['head']},
    # coat body and collar, shirt, cravat, belt, the trousers in the coat's opening, his lining and the
    # coat's skirt down to its hem at our knees: 0.57 across, 0.61 down to the belt, 0.35 below it
    'torso': {'kind': 'torso', 'sx': 0.57, 'x0': (80.0, 127.0),
              'knots': [(56.3, 147.65), (99.0, 173.5), (151.0, 191.5)]},
    # the coat's shoulder, the sleeve and its cuff along our arm (about 0.6 along, 0.68 across so it
    # covers our arm); his fingerless glove about the wrist
    'armN': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')],
             'our': [OUR_JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')], 'width': 0.68,
             'end': {'s': 0.66, 'his': JOINTS['wristN'], 'our': OUR_JOINTS['wristN']}},
    # his far sleeve shows as a narrow strip beside his coat; ours hangs clear of the body, so it is
    # widened (0.38 across) to cover our far arm
    'armF': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderF', 'elbowF', 'wristF')],
             'our': [OUR_JOINTS[j] for j in ('shoulderF', 'elbowF', 'wristF')], 'width': 0.38,
             'end': {'s': 0.66, 'his': JOINTS['wristF'], 'our': OUR_JOINTS['wristF']}},
    # the boots (and his trousers between the coat's hem and the boot tops), big enough for our feet:
    # his near sole under our near foot, his far heel on our far heel
    'legN': {'kind': 'sim', 's': 0.8, 'his': (61.5, 190.0), 'our': (119.5, 218.0)},
    'legF': {'kind': 'sim', 's': 0.8, 'his': (86.0, 186.0), 'our': (133.5, 212.5)},
    # the sword turned a quarter turn counterclockwise, pixel for pixel ('his' points are in the turned
    # picture), which lays his blade from down-left at 56 degrees to down-right at 34, the way our swords
    # hang at rest (our flame longsword's angle is 35); as long as the whole figure scales, a little
    # wider so his black line, steel edge and red core all stay; the grip under his glove on our hand
    'sword': {'kind': 'chain', 'quarter_turns': 1,
              'his': [turned(SWORD_LINE[k]) for k in ('pommel', 'guard', 'tip')],
              'our': [_on_hand(SWORD_LINE[k]) for k in ('pommel', 'guard', 'tip')], 'width': 0.66},
}

REDUCED = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'scarlet-reduced.npy')
GRID = 256


def _edges(L, axis):
    """Edge strength at each boundary along an axis (0: x, 1: y), summed across the picture."""
    g = np.zeros(L.shape[1 - axis] + 1)
    g[1:-1] = np.abs(np.diff(L, axis=1 - axis)).sum(axis)
    return g


def _snap(g, pitch, phase, R=SNAP, lam=40.0):
    """His block boundaries along one axis: each within R picture pixels of the even grid (pitch,
    phase), where his edges are strongest, no block narrower than 4 or wider than 7."""
    n = len(g) - 1
    u = [phase + k * pitch for k in range(int((n - phase) / pitch) + 1)]
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
            opts = [(best[i - 1][q][0] + s, q) for q in best[i - 1] if 4 <= c - q <= 7]
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


def grid(path=REF):
    """His block boundaries in picture pixels: (xs, ys), 148 and 220 of them."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    L = luma(a)
    return _snap(_edges(L, 0), PITCH[0], PHASE[0]), _snap(_edges(L, 1), PITCH[1], PHASE[1])


def native(path=REF):
    """His pixels: the median of each block's inside (a picture pixel in from its edges), as an
    (H, W, 3) int array, 219 x 147."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    xs, ys = grid(path)
    out = np.zeros((len(ys) - 1, len(xs) - 1, 3))
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def background(a, light=210):
    """The white around him, reached from the picture's edge through pixels lighter than `light`
    (his shirt is as light, but walled in by his coat)."""
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


def rgb(hexes=PALETTE):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hexes], np.int32)


def colour_distance(a, b):
    """A redmean-weighted RGB distance (a and b broadcast over their last axis)."""
    a = np.asarray(a, np.float64)
    b = np.asarray(b, np.float64)
    d = a - b
    rm = (a[..., 0] + b[..., 0]) / 2
    return np.sqrt((2 + rm / 256) * d[..., 0] ** 2 + 4 * d[..., 1] ** 2 + (2 + (255 - rm) / 256) * d[..., 2] ** 2) / 3


def quantize(a):
    """Each pixel's nearest colour of his: an (H, W) array of PALETTE indices."""
    P = rgb()
    d = np.stack([colour_distance(a, p) for p in P], -1)
    return d.argmin(-1)


def reduced():
    """The reduced reference in our 256 x 256 frame: (GRID, GRID, 4) uint8 RGBA, transparent where
    he is not. Every opaque pixel is one of PALETTE."""
    d = np.load(REDUCED, allow_pickle=False)
    idx, (x0, y0) = d[:-1], d[-1, :2]
    out = np.zeros((GRID, GRID, 4), np.uint8)
    P = rgb()
    h, w = idx.shape
    sub = out[y0:y0 + h, x0:x0 + w]
    m = idx < len(PALETTE)
    sub[m, :3] = P[idx[m]]
    sub[m, 3] = 255
    return out


def reduced_index():
    """The reduced reference as PALETTE indices in our frame (255 where he is not)."""
    d = np.load(REDUCED, allow_pickle=False)
    idx, (x0, y0) = d[:-1], d[-1, :2]
    out = np.full((GRID, GRID), 255, np.uint8)
    out[y0:y0 + idx.shape[0], x0:x0 + idx.shape[1]] = idx
    return out
