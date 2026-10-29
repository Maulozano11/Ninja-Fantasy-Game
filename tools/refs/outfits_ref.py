"""Shared helpers for lifting the owner's three new male outfits (docs/reference/three-outfits-owner-reference.jpg).

His picture (2000x1116, on grey) is three figures he drew with one head (spiky blue-black hair, blue eyes,
tan skin) in three outfits: left the armoured one (plate, mail, a blue sword), in the middle the leather
rogue, right the tactical one. It is a grid of his pixels, PITCH picture pixels each (a 240 x 133 grid
from GRID_PHASE), and each figure stands about 128 of his pixels tall, from the hair's tips to the soles,
where ours is 96: his figures are a third bigger than our sprite. The owner's rule for new sets drawn
bigger than ours (2026-10-24, "Reducir y limpiar yo"):

  - the body is shrunk evenly at the scale that fits our male rig: each figure's chin to its near sole on
    our male's chin to sole (Figure.scale, about 1.33 of his pixels to one fine pixel);
  - the head (hair, face and eyes) is shrunk evenly at the scale that makes it our Roman head's size:
    HEAD_SCALE (his lash row to chin, and his hair's height, against the Roman head's);
  - then what is left blurry or muddy is cleaned with his palette only (clean()): his 1 px outline round
    the figure, his mail and mesh a clean checker of his two colours there (mail()), no stray speck;
    every pixel one of his pixels, nothing new.

The right-hand figure stands turned the other way (facing left, his near leg on the right): it is
mirrored, so it faces right as our sprites do (Figure.mirror); every pixel is still his.

How it is shrunk: the body is read pixel by pixel (read()): each fine pixel one of his colours under it,
his line where it covers half of it, his gold, white, blue and skin where they cover a quarter, else the
one nearest their mean, so his lit plates, folds and darks keep their share of the area (keeping whole
rows of his, as the samurai's plates were shrunk, kept every line of his and buried his plates in them).
The head and the sword are shrunk by whole rows and columns of his (shrink(), keep()): fine row k shows
one of his rows, each within about one of where the scale puts it, those left out the ones most like a
neighbour, so his eyes keep their two rows, his hair its tips and the blade its edges. Every pixel of
the result is one of his pixels, his colour snapped to his palette (palette(): colours within
PALETTE_TOL of a commoner colour of his are that colour, JPEG noise).

The three share his head: it is lifted once, from the armoured figure (the most turned of the three, as
ours is), and stands on each figure's neck where it lands (CHIN_AT).

game(name) is his figure at our scale in our 256 x 256 frame, on our male at idle frame 0: the picture
every part is cut from, and the one the idle tests check pixel for pixel. Figure.his are his joints there
(read off his picture), OUR_JOINTS our male's.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from roman_ref import CHARS, hexc, inside, near4, near8, write  # noqa: E402,F401

REF = 'docs/reference/three-outfits-owner-reference.jpg'
# His pixel: picture pixels across and down (fitted on the edges of his blocks over the whole picture), and
# the picture corner of his first whole block.
PITCH = 2000 / 240
GRID_PHASE = (0.0, 4.1)
CELLS = (240, 133)
# His colours within this many levels (each channel) of a commoner one are that one (JPEG noise).
PALETTE_TOL = 8
# His grey background: within this of BG_GREY in each channel, and as grey.
BG_GREY = 136
BG_TOL = 4
GRID = 256
# Our sole's last row (the male at idle frame 0) and where his chin's line lands in our frame: his head
# stands there on every figure, its eye row one fine pixel above our default face's (HEAD_UP).
SOLE_ROW = 218
CHIN_AT = (127.0, 148.0)
# His head: the armoured figure's, shrunk HEAD_SCALE of his pixels to one fine pixel about his chin.
HEAD_SCALE = 1.5
HEAD_FIG = 'armored'
# Whose head each figure wears: the rogue the armoured figure's (his two heads are one, pixel for pixel but
# the JPEG's noise), the tactical one his own (the owner: "usa la cabeza y cara y pelo que tiene mi
# referencia": its spikes stand up and back, its bangs, face, jaw and eyes are its own).
HEAD_OF = {'armored': 'armored', 'rogue': 'armored', 'tactical': 'tactical'}

# Our rigs at idle frame 0 (src/sprite/rig.ts drawRig, fine pixels of our frame).
OUR_JOINTS = {
    'male': {
        'head': (126.0, 138.0), 'neck': (127.18, 147.65), 'pelvis': (127.0, 176.87),
        'shoulderN': (114.01, 152.51), 'shoulderF': (134.27, 151.81), 'elbowN': (110.13, 164.50), 'elbowF': (137.09, 164.08),
        'wristN': (107.62, 175.21), 'wristF': (142.52, 173.65), 'handN': (106.80, 178.72), 'handF': (144.30, 176.78),
        'hipN': (121.58, 176.46), 'hipF': (131.51, 173.12), 'kneeN': (122.17, 192.65), 'kneeF': (138.23, 187.86),
        'ankleN': (118.42, 207.59), 'ankleF': (135.94, 203.08),
    },
}


class Figure:
    """One of his three figures: where it stands in his picture (columns x0..x1, mirrored or not), his chin
    and near sole (his pixels, in the figure's own columns: 0 is its first column, after the mirror), and
    so the scale and origin that put his chin on CHIN_AT and his near sole on our sole's row."""

    def __init__(self, name, x0, x1, mirror, chin, sole):
        self.name = name
        self.x0, self.x1 = x0, x1
        self.mirror = mirror
        self.chin = chin
        self.sole = sole
        # his row y lands on our row (y - oy) / scale: his chin's middle on CHIN_AT's, the bottom edge of
        # his near sole's last row on the bottom edge of ours
        self.scale = (sole + 1 - chin[1]) / (SOLE_ROW + 1 - CHIN_AT[1])
        self.origin = (chin[0] - CHIN_AT[0] * self.scale, chin[1] - CHIN_AT[1] * self.scale)
        self.regions = {}
        self.groups = {}
        self.order = ()
        self.his = {}

    def ours(self, X, Y):
        """His point (the figure's own pixels) in our frame."""
        return ((X - self.origin[0]) / self.scale, (Y - self.origin[1]) / self.scale)


FIGURES = {
    'armored': Figure('armored', 0, 88, False, chin=(47.0, 37.5), sole=132),
    'rogue': Figure('rogue', 88, 160, False, chin=(35.0, 36.5), sole=131),
    'tactical': Figure('tactical', 160, 240, True, chin=(43.0, 37.5), sole=131),
}
# Each figure's head (his pixel corners, the figure's own columns): his hair and face above the collar,
# down to his jaw's line (the armoured figure's with the shadow under his jaw, the neck he shows); below it
# the rogue's and the tactical one's necks are their bodies'.
FIGURES['armored'].head_poly = [(20, 0), (70, 0), (70, 35), (53, 35), (53, 37), (51, 37), (51, 40), (44, 40), (44, 37), (38, 37), (38, 35), (20, 35)]
FIGURES['rogue'].head_poly = [(0, 0), (72, 0), (72, 34), (44, 34), (44, 37), (29, 37), (29, 34), (0, 34)]
FIGURES['tactical'].head_poly = [(0, 0), (80, 0), (80, 35), (49, 35), (49, 38), (38, 38), (38, 35), (0, 35)]


def luma(a):
    a = np.asarray(a)
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


_NATIVE = {}


def native(path=REF):
    """His pixels: the median of each block's middle, as a (133, 240, 3) int array."""
    if path in _NATIVE:
        return _NATIVE[path].copy()
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx, ny = CELLS
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            x0 = GRID_PHASE[0] + i * PITCH
            y0 = GRID_PHASE[1] + j * PITCH
            xa, xb = max(0, int(np.ceil(x0 + 2))), min(W, int(x0 + PITCH - 2))
            ya, yb = max(0, int(np.ceil(y0 + 2))), min(H, int(y0 + PITCH - 2))
            out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), axis=0) if xb > xa and yb > ya else BG_GREY
    _NATIVE[path] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE[path].copy()


def palette(a):
    """His picture with every colour snapped to his palette: commonest colours first, a colour within
    PALETTE_TOL of one already taken (and of the same kind) is that one (ties: the lower colour)."""
    cols, counts = np.unique(a.reshape(-1, 3), axis=0, return_counts=True)
    order = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))
    pal = []
    to = {}
    for i in order:
        c = cols[i]
        k = kind(c)
        for p, pk in pal:
            if pk == k and np.abs(c - p).max() <= PALETTE_TOL:
                to[tuple(c)] = p
                break
        else:
            pal.append((c, k))
            to[tuple(c)] = c
    H, W, _ = a.shape
    return np.array([[to[tuple(a[y, x])] for x in range(W)] for y in range(H)])


def is_grey_bg(a):
    a = np.asarray(a)
    return (np.abs(a - BG_GREY).max(axis=-1) <= BG_TOL) & (a.max(axis=-1) - a.min(axis=-1) <= 3)


def background(a):
    """His grey round the figures, reached from the picture's edge, and the grey he left between an arm
    and the body or between the legs (a real gap: two or more grey pixels together). A lone grey pixel
    inside a figure is his figure's."""
    H, W, _ = a.shape
    g = is_grey_bg(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not g[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    for c in components(g & ~bg, False):
        if len(c) >= 2:
            for y, x in c:
                bg[y, x] = True
    return bg


def kind(c):
    """What a colour of his is: 'line' (his navy black), 'white' (glints: the eyes', the blade's), 'skin',
    'blue' (his eyes' iris, the sword's blade and grip), 'gold' (the sword's guard), 'brown' (leather:
    belts, the rogue's jacket and boots), 'hair' (his blue-blacks and blue-greys), 'steel' (the plates' and
    the mail's greys) or 'dark' (his black cloth)."""
    import colorsys
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 9:
        return 'line'
    h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if L > 200 and s_ < 0.25:
        return 'white'
    if b > r + 40 and b > 90 and s_ > 0.35:
        return 'blue'
    if 0.07 <= h <= 0.17 and s_ > 0.45 and L > 70:
        return 'gold'
    if (h < 0.09 or h > 0.93) and s_ > 0.3 and L > 75 and r > 120:
        return 'skin'
    if (h < 0.12 or h > 0.9) and r > b + 6 and s_ > 0.1:
        return 'brown'
    if b > r + 10 and s_ > 0.2:
        return 'hair'
    if L > 45 and s_ < 0.25:
        return 'steel'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def components(mask, conn8):
    """The connected parts of a mask (8- or 4-neighbours), each a list of (y, x)."""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    out = []
    steps = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (conn8 or not (dy and dx))]
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        st = [(y, x)]
        seen[y, x] = True
        c = []
        while st:
            q, p = st.pop()
            c.append((q, p))
            for dy, dx in steps:
                a, b = q + dy, p + dx
                if 0 <= a < H and 0 <= b < W and mask[a, b] and not seen[a, b]:
                    seen[a, b] = True
                    st.append((a, b))
        out.append(c)
    return out


_PICTURE = {}


def picture():
    """His whole picture snapped to his palette, and its background mask."""
    if 'p' not in _PICTURE:
        a = palette(native())
        _PICTURE['p'] = (a, background(a))
    a, bg = _PICTURE['p']
    return a.copy(), bg.copy()


def figure_pixels(f):
    """A figure's own columns of his picture (mirrored if it faces left): (rgb, figure mask)."""
    a, bg = picture()
    a = a[:, f.x0:f.x1]
    bg = bg[:, f.x0:f.x1]
    if f.mirror:
        a = a[:, ::-1]
        bg = bg[:, ::-1]
    return a.copy(), ~bg


def his_line(a):
    """His black line: the commonest of his line colours."""
    K = kinds(a)
    cols, counts = np.unique(a[K == 'line'].reshape(-1, 3), axis=0, return_counts=True)
    i = max(range(len(cols)), key=lambda i: (counts[i], -int(cols[i].sum())))
    return cols[i]


def plain(name):
    """His figure shrunk evenly at the two scales with nothing chosen: each fine pixel his pixel under its
    middle (for the owner's "sin limpiar / limpio" comparison). (rgb, mask) in our frame. The head is his
    armoured figure's at HEAD_SCALE (where the figure's own head was, nothing of it is kept)."""
    f = FIGURES[name]
    a, fig = figure_pixels(f)
    H, W, _ = a.shape
    rgb = np.full((GRID, GRID, 3), 255, np.int32)
    mask = np.zeros((GRID, GRID), bool)
    R = regions(f)
    body = fig & ~R['head']
    for y in range(GRID):
        for x in range(GRID):
            sy = int(np.floor(f.origin[1] + (y + 0.5) * f.scale))
            sx = int(np.floor(f.origin[0] + (x + 0.5) * f.scale))
            if 0 <= sy < H and 0 <= sx < W and body[sy, sx]:
                rgb[y, x] = a[sy, sx]
                mask[y, x] = True
    hf = FIGURES[HEAD_OF[name]]
    ha, hfig = figure_pixels(hf)
    head = regions(hf)['head']
    for y in range(GRID):
        for x in range(GRID):
            sy = int(np.floor(hf.chin[1] + (y + 0.5 - CHIN_AT[1]) * HEAD_SCALE))
            sx = int(np.floor(hf.chin[0] + (x + 0.5 - CHIN_AT[0]) * HEAD_SCALE))
            if 0 <= sy < H and 0 <= sx < ha.shape[1] and head[sy, sx]:
                rgb[y, x] = ha[sy, sx]
                mask[y, x] = True
    return rgb, mask


# Regions of a figure reduced on their own (his pixel corners, the figure's own columns): each keeps its own
# choice of his rows and columns, so a thing drawn across the body at a slant (the sword) keeps its edges.
# Everything else of the body is one region, so his lines run on from one part to the next.
OWN_REGIONS = {
    'armored': {
        # his sword (the pommel, grip and guard, and the blade from the guard to the tip)
        'sword': [(3, 62), (12, 62), (17, 70), (22, 74), (29, 74), (37, 80), (79, 114), (85, 127), (73, 127), (30, 93), (22, 92), (21, 84), (13, 77), (3, 71)],
    },
}


def head_mask(f, a, fig):
    """His head in a figure: f.head_poly, less the plain steel greys of the armour beside it (the gorget's
    edge below his jaw's line, the shoulder plate's top beside his hair: his hair is blue-grey, his face's
    glints are inside his face's columns, FACE_COLS)."""
    H, W, _ = a.shape
    head = fig & inside(f.head_poly, H, W)
    yy = np.arange(H)[:, None] + np.zeros((1, W), int)
    xx = np.arange(W)[None, :] + np.zeros((H, 1), int)
    x0, x1 = f.chin[0] - FACE_COLS, f.chin[0] + FACE_COLS
    return head & ~((kinds(a) == 'steel') & (yy >= int(f.chin[1]) - COLLAR_UP) & ((yy >= int(f.chin[1])) | (xx < x0) | (xx > x1)))


# How far either side of his chin (his pixels) his face's glints can lie, and how far above his jaw's
# line the armour beside the head reaches.
FACE_COLS = 10
COLLAR_UP = 6


def regions(f):
    """{region: mask of the figure's pixels}: 'head' (his hair, face and jaw above the collar), the
    regions reduced on their own (OWN_REGIONS) and 'body', the rest."""
    a, fig = figure_pixels(f)
    H, W, _ = a.shape
    head = head_mask(f, a, fig)
    out = {'head': head}
    owned = head.copy()
    for n, pts in OWN_REGIONS.get(f.name, {}).items():
        m = fig & inside(pts, H, W) & ~owned
        out[n] = m
        owned |= m
    out['body'] = fig & ~owned
    return out


def shrink(a, K, m, scale, origin, rgb, label, parts):
    """Region `m` of his picture shrunk by `scale` (his pixel (X, Y) lands on our ((X, Y) - origin) / scale)
    into our frame: whole rows and columns of his kept (keep()); every pixel one of his, labelled with the
    part (`parts`, his pixel's) it came from."""
    ys, xs = np.nonzero(m)
    j0 = int(np.floor((ys.min() - origin[1]) / scale))
    j1 = int(np.ceil((ys.max() + 1 - origin[1]) / scale))
    i0 = int(np.floor((xs.min() - origin[0]) / scale))
    i1 = int(np.ceil((xs.max() + 1 - origin[0]) / scale))
    rows = keep(m.shape[0], j1 - j0, scale, origin[1] + j0 * scale, unlikeness(a, K, m, 0))
    cols = keep(m.shape[1], i1 - i0, scale, origin[0] + i0 * scale, unlikeness(a, K, m, 1))
    for jj, r in enumerate(rows):
        for ii, c in enumerate(cols):
            if m[r, c]:
                rgb[j0 + jj, i0 + ii] = a[r, c]
                label[j0 + jj, i0 + ii] = parts[r, c]


# How much of a fine pixel's footprint (of his pixels' area) his line, gold, a glint or his skin must cover
# for the fine pixel to show it (read()).
LINE_COVER = 0.5
DETAIL_COVER = 0.25
# The figures whose lit plate edges are kept as he drew them (the owner on the tactical one, 2026-10-24:
# "tactico refinar armadura": its vest, pads and guards read as raised plates, lit on top), and how.
LIT_FIGS = ('tactical',)
LIT_STEP = 22
LIT_COVER = 0.3
# (and his line round each plate and panel where it covers a third of a fine pixel)
LIT_LINE_COVER = 0.34


def read(a, K, m, scale, origin, rgb, label, parts, dots=None, lit=False):
    """Region `m` of his picture shrunk by `scale` into our frame pixel by pixel: each fine pixel one of his
    colours under its footprint (none where less than half of it is his figure): his line where it covers
    LINE_COVER of it, else his gold, white, blue or skin where they cover DETAIL_COVER, else of the colours
    under it the one nearest their mean (so his lit plates, folds and darks keep their share of the area).
    A dot of `dots` (his laces) whose middle is in a fine pixel is that pixel, unless his line covers it.
    With `lit` (the tactical figure's plates, LIT_FIGS) his lit edges where they cover LIT_COVER of it: his
    pixels LIT_STEP levels lighter than the footprint's mean."""
    ys, xs = np.nonzero(m)
    j0 = int(np.floor((ys.min() - origin[1]) / scale))
    j1 = int(np.ceil((ys.max() + 1 - origin[1]) / scale))
    i0 = int(np.floor((xs.min() - origin[0]) / scale))
    i1 = int(np.ceil((xs.max() + 1 - origin[0]) / scale))
    H, W = m.shape
    for j in range(j0, j1):
        for i in range(i0, i1):
            Y0, Y1 = origin[1] + j * scale, origin[1] + (j + 1) * scale
            X0, X1 = origin[0] + i * scale, origin[0] + (i + 1) * scale
            cells = []
            for y in range(max(0, int(np.floor(Y0))), min(H, int(np.ceil(Y1)))):
                for x in range(max(0, int(np.floor(X0))), min(W, int(np.ceil(X1)))):
                    w = (min(Y1, y + 1) - max(Y0, y)) * (min(X1, x + 1) - max(X0, x))
                    if w > 1e-9 and m[y, x]:
                        cells.append((w, y, x))
            fw = sum(c[0] for c in cells)
            if fw < 0.5 * scale * scale:
                continue
            cover = lambda k: sum(w for w, y, x in cells if K[y, x] == k) / fw
            dot = [c for c in cells if dots is not None and dots[c[1], c[2]] and Y0 <= c[1] + 0.5 < Y1 and X0 <= c[2] + 0.5 < X1]
            if cover('line') >= (LIT_LINE_COVER if lit else LINE_COVER):
                pick = [c for c in cells if K[c[1], c[2]] == 'line']
            elif dot:
                pick = dot
            elif lit and sum(w for w, y, x in cells if K[y, x] != 'line' and luma(a[y, x]) >= luma(sum(cw * a[cy, cx] for cw, cy, cx in cells) / fw) + LIT_STEP) / fw >= LIT_COVER:
                mean0 = luma(sum(cw * a[cy, cx] for cw, cy, cx in cells) / fw)
                pick = [c for c in cells if K[c[1], c[2]] != 'line' and luma(a[c[1], c[2]]) >= mean0 + LIT_STEP]
            else:
                pick = [c for c in cells if K[c[1], c[2]] != 'line']
                for k in ('white', 'gold', 'blue', 'skin'):
                    if cover(k) >= DETAIL_COVER:
                        pick = [c for c in pick if K[c[1], c[2]] == k]
                        break
            mean = sum(w * a[y, x] for w, y, x in pick) / sum(w for w, y, x in pick)
            w, y, x = min(pick, key=lambda c: (int(np.abs(a[c[1], c[2]] - mean).sum()), -c[0], c[1], c[2]))
            rgb[j, i] = a[y, x]
            # the part of the pixel of his it shows (so a pixel of the blade is the sword's, wherever it lies)
            label[j, i] = parts[y, x]


# His laces: the light dots he drew up the rogue's boots (a pixel lighter than its four neighbours by
# LACE_STEP), kept as dots through the shrink and the cleaning.
LACED = {'rogue': ('boot_n', 'boot_f')}
LACE_STEP = 25


def laces(name, a, P):
    """His lace dots on the parts of LACED (his pixels)."""
    H, W, _ = a.shape
    out = np.zeros((H, W), bool)
    L = luma(a).astype(float)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if P[y, x] in LACED.get(name, ()) and all(L[y, x] > L[q] + LACE_STEP for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))):
                out[y, x] = True
    return out


def part_map(f):
    """Which part each of his pixels is (part_regions), '' off the figure."""
    R = part_regions(f)
    a, fig = figure_pixels(f)
    out = np.full(fig.shape, '', dtype='<U12')
    for n, m in R.items():
        out[m] = n
    return out


def reduce(name):
    """His figure at our scale before cleaning (game() cleans it): (rgb, which part each pixel came from,
    '' for none), in our frame. The body and each region of OWN_REGIONS shrunk at the figure's scale, his
    armoured figure's head at HEAD_SCALE about his chin, on CHIN_AT, over them."""
    f = FIGURES[name]
    a, fig = figure_pixels(f)
    K = kinds(a)
    R = regions(f)
    P = part_map(f)
    rgb = np.full((GRID, GRID, 3), 255, np.int32)
    label = np.full((GRID, GRID), '', dtype='<U12')
    read(a, K, R['body'], f.scale, f.origin, rgb, label, P, laces(name, a, P), name in LIT_FIGS)
    for n in OWN_REGIONS.get(name, {}):
        shrink(a, K, R[n], f.scale, f.origin, rgb, label, P)
    hf = FIGURES[HEAD_OF[name]]
    ha, _ = figure_pixels(hf)
    hm = regions(hf)['head']
    origin = (hf.chin[0] - CHIN_AT[0] * HEAD_SCALE, hf.chin[1] - CHIN_AT[1] * HEAD_SCALE)
    shrink(ha, kinds(ha), hm, HEAD_SCALE, origin, rgb, label, np.full(hm.shape, 'head', dtype='<U12'))
    return rgb, label


# How much the region's edge between two rows or columns counts (unlikeness()): most, so his hair's spiky
# tips and the blade's edges stay where they can.
EDGE_WEIGHT = 20.0


def unlikeness(a, K, m, axis):
    """How unlike two of his rows (axis 0) or columns (axis 1) are inside region `m`: U(i, j). His line,
    skin, gold, white and blue against anything else and the region's edge count most; a step of more than
    10 levels counts as a band he drew."""
    if axis == 1:
        a, K, m = a.transpose(1, 0, 2), K.T, m.T
    n = a.shape[0]
    memo = {}
    strong = ('line', 'gold', 'white', 'skin', 'blue')

    def U(i, j):
        if j < 0 or j >= n or i < 0 or i >= n:
            return 1e9
        key = (min(i, j), max(i, j))
        if key in memo:
            return memo[key]
        both = m[i] | m[j]
        d = np.abs(a[i] - a[j]).max(axis=1)
        k = np.where(d > 10, 4.0, np.where(d > 6, 0.5, 0.0))
        k = np.where(K[i] != K[j], 3.0, k)
        k = np.where((K[i] != K[j]) & (np.isin(K[i], strong) | np.isin(K[j], strong)), 6.0, k)
        k = np.where(m[i] != m[j], EDGE_WEIGHT, k)
        memo[key] = float((k * both).sum())
        return memo[key]

    return U


def keep(n_src, count, scale, origin, U):
    """Which of his rows (or columns) fine rows 0..count-1 show: fine row k about his row
    origin + (k + 0.5) * scale - 0.5, within two or three rows of it, one after another or with up to three
    rows left out between. Leaving rows out between two kept ones costs how unlike each is to the nearer of
    those two (unlikeness()): so his line and his bands are kept and rows like their neighbours go. Rows
    past his picture's edge are its edge row (nothing of the region is there)."""
    ideal = [origin + (k + 0.5) * scale - 0.5 for k in range(count)]
    near = lambda t: [c for c in range(int(np.floor(t)) - 2, int(np.floor(t)) + 4) if 0 <= c < n_src] or [min(max(int(round(t)), 0), n_src - 1)]
    best = [{c: (abs(c - ideal[0]) * 1e-2, None) for c in near(ideal[0])}]
    for k in range(1, count):
        row = {}
        for c in near(ideal[k]):
            got = None
            for prev in (c - 1, c - 2, c - 3, c - 4, c):
                if prev not in best[-1]:
                    continue
                v = best[-1][prev][0] + sum(min(U(q, prev), U(q, c)) for q in range(prev + 1, c)) + abs(c - ideal[k]) * 1e-2 + (1e6 if prev == c else 0)
                if got is None or v < got[0]:
                    got = (v, prev)
            if got is not None:
                row[c] = got
        best.append(row)
    c = min(best[-1], key=lambda q: (best[-1][q][0], q))
    out = [c]
    for k in range(count - 1, 0, -1):
        c = best[k][c][1]
        out.append(c)
    return out[::-1]


# The largest hole in the figure the cleaning closes (fine pixels).
HOLE = 3
# A pixel lighter (or darker) by this many levels than every pixel round it is a stray speck.
SPECK = 22
# His mail (the armoured figure's sleeves and skirt) and his mesh (the tactical vest's panels and knee
# pads) are a 1 px checker of light and dark: found in his picture where most pixels about a pixel stand
# lighter or darker than all four of theirs (MAIL_CORE of a 5 x 5 block, grown to MAIL_EDGE), and drawn at
# our scale as a clean checker of the two colours he used most there (mail()).
MAIL_FIGS = ('armored', 'tactical')
MAIL_CORE = 0.35
MAIL_EDGE = 0.2
MAIL_STEP = 12
MAIL_LEAST = 6


def mail(name):
    """His mail and mesh: [(mask of his pixels, (dark colour, light colour))], one per patch of it."""
    f = FIGURES[name]
    if name not in MAIL_FIGS:
        return []
    a, fig = figure_pixels(f)
    P = part_map(f)
    L = luma(a).astype(float)
    H, W = L.shape
    alt = np.zeros((H, W))
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            d = [L[y, x] - L[q] for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))]
            if all(v > MAIL_STEP for v in d) or all(v < -MAIL_STEP for v in d):
                alt[y, x] = 1
    den = np.zeros((H, W))
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            den[y, x] = alt[y - 2:y + 3, x - 2:x + 3].mean()
    ok = fig & ~np.isin(P, ('head', 'sword'))
    edge = (den > MAIL_EDGE) & ok
    out = []
    for c in components(edge, False):
        m = np.zeros((H, W), bool)
        for y, x in c:
            m[y, x] = True
        if (den[m] > MAIL_CORE).sum() < MAIL_LEAST:
            continue
        if name in LIT_FIGS:
            # his mesh only where he drew mesh: the panel's middle, off his line round it and its lit rim
            m = m & (den > MAIL_CORE) & ~near8(kinds(a) == 'line')
            if m.sum() < MAIL_LEAST:
                continue
        # his commonest dark and his commonest light there (the darker and the lighter half of its pixels)
        px = a[m].reshape(-1, 3)
        mid = float(np.median(luma(px)))
        pair = []
        for half in (luma(px) <= mid, luma(px) > mid):
            cols, counts = np.unique(px[half], axis=0, return_counts=True)
            pair.append(cols[min(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))])
        out.append((m, pair))
    return out


def clean(name, rgb, label):
    """The reduction cleaned with his palette only (the owner's "Reducir y limpiar yo"):
      - a pixel or two of the figure standing alone off it (a strand's tip the shrink cut off) goes;
      - a hole of up to HOLE pixels the figure walls in where his picture has none (no grey of his under
        it: the shrink parted two pieces) takes the commonest of the pixels round it; a gap he left between
        an arm and the body stays open;
      - his 1 px line all round the figure: a pixel of the figure beside the grey round it is his line;
      - a speck (a colour none of its eight neighbours has, not his line, skin, gold, white or blue) takes
        the colour most of its neighbours have, so his folds and plates read as his bands, not speckle; and
        a light speck (much lighter than everything round it) the colour round it;
      - his mail and mesh (MAIL) a 1 px checker of their two commonest colours.
    His head is kept as the shrink chose it, but for its specks. Returns (rgb, label)."""
    f = FIGURES[name]
    rgb = rgb.copy()
    label = label.copy()
    H, W = label.shape
    for c in components(label != '', True):
        if len(c) < 3:
            for y, x in c:
                label[y, x] = ''
                rgb[y, x] = 255
    a, fig = figure_pixels(f)
    grey = ~fig
    for c in components(label == '', False):
        if len(c) > HOLE or any(y in (0, H - 1) or x in (0, W - 1) for y, x in c):
            continue
        under = False
        for y, x in c:
            if label[max(0, y - 1):y + 2, max(0, x - 1):x + 2].tolist().count('head') and False:
                pass
            ny = f.origin[1] + y * f.scale
            nx = f.origin[0] + x * f.scale
            under |= grey[max(0, int(np.floor(ny))):max(0, int(np.ceil(ny + f.scale))), max(0, int(np.floor(nx))):max(0, int(np.ceil(nx + f.scale)))].sum() >= 2
        if under:
            continue
        for y, x in c:
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + dy, x + dx]]
            cols = [tuple(rgb[q]) for q in nb]
            rgb[y, x] = max(sorted(set(cols)), key=cols.count)
            labs = [label[q] for q in nb]
            label[y, x] = max(sorted(set(labs)), key=labs.count)
    figm = label != ''
    out = np.zeros_like(figm)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or out[y, x] or figm[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    line = his_line(a)
    K = np.array([[kind(rgb[y, x]) if figm[y, x] else '' for x in range(W)] for y in range(H)])
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if figm[y, x] and (out[y - 1, x] or out[y + 1, x] or out[y, x - 1] or out[y, x + 1]):
                rgb[y, x] = line
                K[y, x] = 'line'
    near = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    keepk = ('line', 'skin', 'gold', 'white', 'blue')
    src = rgb.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not figm[y, x] or K[y, x] in keepk or label[y, x] in LACED.get(name, ()):
                continue
            nb = [(y + dy, x + dx) for dy, dx in near if figm[y + dy, x + dx]]
            cols = [tuple(src[q]) for q in nb if K[q] != 'line']
            if not cols:
                continue
            mode = np.array(max(sorted(set(cols)), key=cols.count))
            if tuple(src[y, x]) in [tuple(src[q]) for q in nb]:
                continue
            # a stray speck: lighter or darker than every pixel round it by SPECK levels
            ls = [luma(src[q]) for q in nb if K[q] != 'line']
            if luma(src[y, x]) > max(ls) + SPECK or (label[y, x] != 'head' and luma(src[y, x]) < min(ls) - SPECK):
                rgb[y, x] = mode
                K[y, x] = kind(mode)
    # his mail and mesh: a 1 px checker of his two colours there, inside the figure's line
    for m, (dark, light) in mail(name):
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if label[y, x] in ('', 'head', 'sword') or K[y, x] == 'line' and (name in LIT_FIGS or not all(figm[q] for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))):
                    continue
                if not all(figm[q] for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))):
                    continue
                sy = int(np.floor(f.origin[1] + (y + 0.5) * f.scale))
                sx = int(np.floor(f.origin[0] + (x + 0.5) * f.scale))
                if 0 <= sy < m.shape[0] and 0 <= sx < m.shape[1] and m[sy, sx]:
                    rgb[y, x] = light if (x + y) % 2 == 0 else dark
    return rgb, label


_GAME = {}


def game(name):
    """His figure at our scale, cleaned: (rgb, part label), the picture every part is cut from. On the
    rogue his head is the armoured figure's head as it is cleaned there, pixel for pixel (HEAD_OF)."""
    if name not in _GAME:
        rgb, label = clean(name, *reduce(name))
        if HEAD_OF[name] != name:
            hrgb, hlabel = game(HEAD_OF[name])
            head = hlabel == 'head'
            gone = (label == 'head') & ~head
            label[gone] = ''
            rgb[gone] = 255
            label[head] = 'head'
            rgb[head] = hrgb[head]
        _GAME[name] = (rgb, label)
    rgb, label = _GAME[name]
    return rgb.copy(), label.copy()


# The parts each figure is cut into (polygons in his pixel corners, the figure's own columns), front to
# back: a pixel of his figure goes to the first part that holds it. Every pixel of the body is in one.
PARTS = {
    'armored': {
        'hand_n': [[(13, 72), (28, 72), (28, 77), (24, 80), (24, 84), (14, 84), (13, 80)]],
        # his sword: the pommel, the grip and the guard whole, the blade by its colours (and his line round
        # it), not the thighs behind
        'sword': [[(4, 64), (10, 64), (16, 71), (13, 75), (9, 75), (4, 70)],
                  [(23, 76), (31, 75), (36, 79), (36, 90), (26, 91), (22, 86), (23, 82)],
                  ([(30, 80), (37, 82), (79, 116), (84, 126), (74, 126), (30, 92)], ('blue', 'white', 'gold'))],
        'fore_n': [[(12, 61), (29, 61), (29, 76), (12, 76)]],
        'upper_n': [[(11, 46), (32, 46), (32, 61), (11, 61)]],
        'pauldron_n': [[(17, 32), (38, 32), (38, 36), (37, 40), (36, 48), (17, 48)]],
        'hand_f': [[(59, 72), (73, 72), (73, 82), (59, 82)]],
        'fore_f': [[(55, 62), (72, 62), (72, 72), (55, 72)]],
        'upper_f': [[(56, 49), (72, 49), (72, 62), (56, 62)]],
        'pauldron_f': [[(54, 33), (70, 33), (70, 49), (54, 49)]],
        'belt': [[(28, 63), (64, 63), (64, 70), (28, 70)]],
        'cuirass': [[(28, 30), (64, 30), (64, 63), (28, 63)]],
        'skirt': [[(28, 70), (64, 70), (64, 86), (28, 86)]],
        'thigh_n': [[(16, 76), (46, 76), (46, 105), (16, 105)]],
        'thigh_f': [[(46, 80), (70, 80), (70, 103), (46, 103)]],
        'boot_n': [[(16, 105), (40, 105), (40, 121), (16, 121)]],
        'foot_n': [[(14, 121), (40, 121), (40, 134), (14, 134)]],
        'boot_f': [[(44, 103), (84, 103), (84, 120), (44, 120)]],
        'foot_f': [[(44, 120), (84, 120), (84, 134), (44, 134)]],
    },
    'rogue': {
        'hand_n': [[(2, 72), (19, 72), (19, 84), (2, 84)]],
        'fore_n': [[(0, 59), (19, 59), (19, 72), (0, 72)]],
        'upper_n': [[(0, 36), (19, 36), (20, 46), (19, 59), (0, 59)]],
        'hand_f': [[(48, 72), (64, 72), (64, 84), (48, 84)]],
        'fore_f': [[(45, 62), (64, 62), (64, 72), (45, 72)]],
        'upper_f': [[(46, 36), (64, 36), (64, 62), (45, 62), (45, 50)]],
        'belt': [[(16, 63), (52, 63), (52, 70), (16, 70)]],
        'jacket': [[(16, 30), (50, 30), (50, 63), (16, 63)]],
        'thigh_n': [[(10, 70), (34, 70), (34, 105), (10, 105)]],
        'thigh_f': [[(34, 70), (58, 70), (58, 106), (34, 106)]],
        'shin_n': [[(6, 105), (32, 105), (32, 110), (6, 110)]],
        'shin_f': [[(34, 106), (58, 106), (58, 110), (34, 110)]],
        'boot_n': [[(4, 110), (28, 110), (28, 122), (4, 122)]],
        'foot_n': [[(4, 122), (28, 122), (28, 134), (4, 134)]],
        'boot_f': [[(34, 110), (60, 110), (60, 119), (34, 119)]],
        'foot_f': [[(34, 119), (66, 119), (66, 134), (34, 134)]],
    },
    'tactical': {
        'hand_n': [[(10, 76), (28, 76), (28, 85), (10, 85)]],
        'fore_n': [[(8, 62), (25, 62), (25, 76), (8, 76)]],
        'upper_n': [[(8, 36), (30, 36), (30, 50), (25, 52), (25, 62), (8, 62)]],
        'hand_f': [[(56, 74), (70, 74), (70, 84), (56, 84)]],
        'fore_f': [[(52, 62), (70, 62), (70, 74), (52, 74)]],
        'upper_f': [[(53, 36), (70, 36), (70, 62), (51, 62), (51, 52)]],
        'belt': [[(24, 66), (58, 66), (58, 73), (24, 73)]],
        'vest': [[(24, 30), (57, 30), (57, 66), (24, 66)]],
        'thigh_n': [[(16, 73), (41, 73), (41, 106), (16, 106)]],
        'thigh_f': [[(41, 73), (64, 73), (64, 105), (41, 105)]],
        'shin_n': [[(12, 106), (38, 106), (38, 109), (12, 109)]],
        'shin_f': [[(41, 105), (64, 105), (64, 106), (41, 106)]],
        'boot_n': [[(10, 109), (34, 109), (34, 122), (10, 122)]],
        'foot_n': [[(10, 122), (34, 122), (34, 134), (10, 134)]],
        'boot_f': [[(41, 106), (64, 106), (64, 120), (41, 120)]],
        'foot_f': [[(41, 120), (72, 120), (72, 134), (41, 134)]],
    },
}


def part_regions(f):
    """{part: mask of the figure's pixels} for PARTS (the head as regions() gives it); raises if a pixel of
    the body is in no part."""
    a, fig = figure_pixels(f)
    H, W, _ = a.shape
    head = head_mask(f, a, fig)
    out = {'head': head}
    owned = head.copy()
    K = kinds(a)
    for n, specs in PARTS.get(f.name, {}).items():
        out.setdefault(n, np.zeros((H, W), bool))
        for spec in specs:
            pts, takes = spec if isinstance(spec, tuple) else (spec, None)
            m = fig & inside(pts, H, W) & ~owned
            if takes:
                # his colours of these kinds, his line along them and the pale glints at their edge, not
                # what lies further off
                got = m & np.isin(K, takes)
                pale = m & (luma(a) > 90) & (np.isin(K, ('steel', 'white')) | (a[..., 2] - a[..., 0] > 20))
                # (the glints run on along the edge: every pale pixel reached from them through pale ones)
                while True:
                    more = got | (pale & near8(got))
                    if (more == got).all():
                        break
                    got = more
                m = got | (m & (K == 'line') & near8(got))
            out[n] |= m
            owned |= m
    left = fig & ~owned
    if left.any():
        ys, xs = np.nonzero(left)
        raise ValueError(f'{f.name}: {len(ys)} pixels of his figure in no part, e.g. {list(zip(xs[:8].tolist(), ys[:8].tolist()))}')
    return out


# His joints in our frame (fine pixels), read off each figure at our scale: where each of his limbs turns.
# While he wears a figure's arms or legs, the game stands our rig's joints there at rest
# (src/sprite/outfitRig.ts), so his pieces land where he drew them.
HIS = {
    'armored': {
        'shoulderN': (108.5, 154.0), 'elbowN': (106.5, 167.0), 'wristN': (105.0, 177.5), 'handN': (107.0, 181.0),
        'shoulderF': (136.0, 153.0), 'elbowF': (140.5, 166.5), 'wristF': (142.5, 176.0), 'handF': (143.0, 179.5),
        'hipN': (116.0, 178.0), 'kneeN': (114.5, 195.0), 'ankleN': (112.0, 209.5),
        'hipF': (133.0, 176.0), 'kneeF': (135.5, 193.0), 'ankleF': (136.0, 206.0),
    },
    'rogue': {
        'shoulderN': (111.0, 153.0), 'elbowN': (107.5, 166.0), 'wristN': (106.5, 175.5), 'handN': (108.0, 179.0),
        'shoulderF': (136.0, 153.0), 'elbowF': (138.0, 166.0), 'wristF': (141.0, 174.0), 'handF': (141.5, 177.5),
        'hipN': (118.0, 180.0), 'kneeN': (114.5, 194.0), 'ankleN': (112.0, 208.0),
        'hipF': (134.0, 179.0), 'kneeF': (137.0, 194.0), 'ankleF': (137.0, 207.0),
    },
    'tactical': {
        'shoulderN': (110.0, 152.0), 'elbowN': (108.0, 165.0), 'wristN': (107.0, 175.0), 'handN': (107.5, 178.5),
        'shoulderF': (137.0, 153.0), 'elbowF': (139.0, 165.0), 'wristF': (142.0, 174.5), 'handF': (142.0, 177.0),
        'hipN': (118.0, 180.0), 'kneeN': (113.0, 195.0), 'ankleN': (111.0, 209.0),
        'hipF': (134.0, 179.0), 'kneeF': (138.0, 194.0), 'ankleF': (137.0, 207.0),
    },
}


def joint(name, j):
    """His joint `j` of figure `name` in our frame (our male's for the neck, the pelvis and the head),
    a hundredth of a pixel to the lower right, so that no sum of the game's lands it on the pixel before."""
    x, y = HIS[name].get(j) or OUR_JOINTS['male'][j]
    return (x + 0.01, y + 0.01)


def angle(name, a, b):
    """The angle (degrees) from joint a to joint b of figure `name`."""
    (ax, ay), (bx, by) = joint(name, a), joint(name, b)
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def torso_angle():
    (ax, ay), (bx, by) = OUR_JOINTS['male']['pelvis'], OUR_JOINTS['male']['neck']
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def line_rgb(name='armored'):
    a, _ = figure_pixels(FIGURES[name])
    return his_line(a)


def cut(rgb, label, names):
    """The piece made of these parts of game(): their pixels, and his line of the parts round them where it
    bounds their colours (an 8-neighbour of a pixel of theirs that is not line), so it keeps its line when
    it moves apart from them. (mask, colours)"""
    own = np.isin(label, names)
    ln = np.array([[kind(rgb[y, x]) == 'line' for x in range(rgb.shape[1])] for y in range(rgb.shape[0])]) & (label != '')
    solid = own & ~ln
    return own | (ln & near8(solid) & ~np.isin(label, ('head',))), rgb.copy()


# The face (our frame: x0, y0, x1, y1): his skin, his eyes' glints and the line round and in them here
# are the face; the rest of his head is his hair.
FACE_BOX = (119, 137, 135, 151)
# His face on our male head where our face template stands (body.ts faceAnchor at idle frame 0): his near
# eye EYE_COLS[0] columns right of the anchor and his far eye EYE_COLS[1], his lash on LASH_ROW; his eyes
# from the anchor's row to EYE_ROWS rows down (above his lash, the face's own), EYE_W cells wide. One set
# for each head of his (HEAD_OF), chosen by use_head().
HEADS = {
    'armored': dict(FACE_ANCHOR=(123, 139), EYE_COLS=(0, 7), LASH_ROW=139, EYE_W=(5, 3), EYE_ROWS=3, FACE_BOX=(119, 137, 135, 151)),
    'tactical': dict(FACE_ANCHOR=(123, 139), EYE_COLS=(1, 7), LASH_ROW=140, EYE_W=(4, 3), EYE_ROWS=4, FACE_BOX=(119, 137, 135, 151)),
}
HEAD_NOW = 'armored'


def use_head(name):
    """Make the head of figure `name` the one head_pieces() and the head scripts work on."""
    global HEAD_NOW
    HEAD_NOW = name
    globals().update(HEADS[name])


use_head('armored')


def head_pieces():
    """His head (use_head()'s) cut into the face (FACE_BOX: skin, glints, his blue and the line in and round
    them) and the hair (the rest of it): {name: (mask, colours)}."""
    rgb, label = game(HEAD_NOW)
    head = label == 'head'
    K = np.array([[kind(rgb[y, x]) if head[y, x] else '' for x in range(GRID)] for y in range(GRID)])
    x0, y0, x1, y1 = FACE_BOX
    box = np.zeros_like(head)
    box[y0:y1, x0:x1] = True
    face = head & box & np.isin(K, ('skin', 'white', 'blue', 'brown'))
    face |= head & box & np.isin(K, ('line', 'steel', 'dark')) & near4(face)
    hair = head & ~face
    return {'face': (face, rgb.copy()), 'hair': (hair, rgb.copy())}


def pack(col, mask):
    """A mask's pixels as rows of palette characters, one per colour of his (exactly: his palette's
    colours lie close together in his darks, so none are merged), the origin (x0, y0) and the palette."""
    H, W = mask.shape
    grid = np.full((H, W), '.', dtype='<U1')
    palette = {}
    seen = {}
    for y in range(H):
        for x in range(W):
            if not mask[y, x]:
                continue
            h = hexc(col[y, x])
            if h not in seen:
                if len(seen) >= len(CHARS):
                    raise ValueError('more colours than characters')
                seen[h] = CHARS[len(seen)]
                palette[seen[h]] = h
            grid[y, x] = seen[h]
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    return [''.join(grid[y, x0:x1]) for y in range(y0, y1)], (int(x0), int(y0)), palette


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (our frame) that lands on the
    joint, `ang` the limb's angle at rest."""
    ox, oy = origin
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {ang:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def module(doc, consts, bases, prefix, header_import="import type { PaintedPiece } from '../painted';"):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what each
    of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours, doc, pivot
    in our frame, angle)) and where each lands in our idle frame 0, unturned (`<PREFIX>_REST`: the fine
    pixel of its first row's first cell)."""
    out = [doc, header_import, '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    found = {}
    body = []
    rest = []
    for const, mask, col, pdoc, pivot, ang in consts:
        rows, origin, palette = pack(col, mask)
        for h in palette.values():
            found[h] = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        rest.append((const, origin))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */")
    out.append(f"export const {prefix}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(found):
        out.append(f"  '{h}': '{found[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out)


def middle(col, mask, kinds_, q=0.5):
    """His colour of middle lightness among the pixels of these kinds in a piece: the base a colour slot
    recolours from."""
    found = sorted((float(luma(col[y, x])), hexc(col[y, x])) for y, x in zip(*np.nonzero(mask)) if kind(col[y, x]) in kinds_)
    return found[int(len(found) * q)][1]


def skin_base():
    """His skin's commonest tone on his face: the one base every piece of his skin recolours from (and the
    presets' skin), so in his own skin every pixel of it is his."""
    use = HEAD_NOW
    use_head('armored')
    face, col = head_pieces()['face']
    use_head(use)
    tones = [hexc(col[y, x]) for y, x in zip(*np.nonzero(face)) if kind(col[y, x]) == 'skin']
    return max(sorted(set(tones)), key=tones.count)


def header(script, what):
    """The first lines of a generated module."""
    return (f'// {what}, his pixels at our scale (tools/refs/{script} from\n'
            '// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).\n'
            '// Generated: rerun the script to change it.')


def run(argv, build):
    """A part script's main: `build()` gives the module's text, written to argv[1]."""
    if len(argv) < 2:
        sys.exit(f'usage: python3 -I {argv[0]} <out.ts>')
    write(argv[1], build())


# Where each part of a figure rides (the joint it turns about, and the limb whose angle it takes).
RIDES = {
    'cuirass': ('neck', None), 'jacket': ('neck', None), 'vest': ('neck', None),
    'belt': ('pelvis', None), 'skirt': ('pelvis', None),
    'pauldron_n': ('shoulderN', ('shoulderN', 'elbowN')), 'pauldron_f': ('shoulderF', ('shoulderF', 'elbowF')),
    'upper_n': ('shoulderN', ('shoulderN', 'elbowN')), 'upper_f': ('shoulderF', ('shoulderF', 'elbowF')),
    'fore_n': ('elbowN', ('elbowN', 'wristN')), 'fore_f': ('elbowF', ('elbowF', 'wristF')),
    'hand_n': ('wristN', ('elbowN', 'wristN')), 'hand_f': ('wristF', ('elbowF', 'wristF')),
    'thigh_n': ('hipN', ('hipN', 'kneeN')), 'thigh_f': ('hipF', ('hipF', 'kneeF')),
    'shin_n': ('kneeN', ('kneeN', 'ankleN')), 'shin_f': ('kneeF', ('kneeF', 'ankleF')),
    'boot_n': ('ankleN', ('kneeN', 'ankleN')), 'boot_f': ('ankleF', ('kneeF', 'ankleF')),
    'foot_n': ('ankleN', ('kneeN', 'ankleN')), 'foot_f': ('ankleF', ('kneeF', 'ankleF')),
}


def sword_angle(rgb, m):
    """His blade's angle (degrees): the long axis of its blue and white pixels."""
    ys, xs = np.nonzero(m & np.array([[kind(rgb[y, x]) in ('blue', 'white') for x in range(GRID)] for y in range(GRID)]))
    c = np.cov(np.stack([xs, ys]).astype(float))
    w, v = np.linalg.eigh(c)
    dx, dy = v[:, np.argmax(w)]
    if dx < 0:
        dx, dy = -dx, -dy
    return float(np.degrees(np.arctan2(dy, dx)))


def sword_grip(rgb, label, m, c):
    """His sword's grip carried on through his fist, where he drew the fist over it: from the pommel to the
    guard along the blade's line, his grip's blue between two of his line, only where his gauntlet hides it
    at rest (so at rest it adds nothing; stowed on the back or dropped the sword is whole)."""
    m = m.copy()
    c = c.copy()
    parts = [p for p in components(m, True)]
    parts.sort(key=len)
    pommel = parts[0]
    blade = max(parts, key=len)
    ang = np.radians(sword_angle(rgb, m))
    d = np.array([np.cos(ang), np.sin(ang)])
    along = lambda p: (p[1] + 0.5) * d[0] + (p[0] + 0.5) * d[1]
    # the grip's line: through the pommel's middle, along the blade
    py = np.mean([p[0] for p in pommel]) + 0.5
    px = np.mean([p[1] for p in pommel]) + 0.5
    t0 = max(along(p) for p in pommel)
    t1 = min(along(p) for p in blade)
    blue = [hexc(c[y, x]) for y, x in pommel if kind(c[y, x]) == 'blue']
    mode = max(sorted(set(blue)), key=blue.count)
    grip = np.array([int(mode[i:i + 2], 16) for i in (1, 3, 5)])
    line = line_rgb()
    hidden = np.isin(label, ('hand_n', 'fore_n'))
    for y in range(GRID):
        for x in range(GRID):
            if m[y, x] or not hidden[y, x]:
                continue
            t = (x + 0.5) * d[0] + (y + 0.5) * d[1]
            if not (t0 - 0.5 <= t <= t1 + 0.5):
                continue
            # distance across the grip's line
            q = (x + 0.5 - px) * -d[1] + (y + 0.5 - py) * d[0]
            if abs(q) <= 0.75:
                c[y, x] = grip
                m[y, x] = True
            elif abs(q) <= 1.75:
                c[y, x] = line
                m[y, x] = True
    return m, c


# What is drawn in front of each part at rest (the game's layers, ctx.ts DEPTHS: the far arm, the far leg,
# the near leg, the torso and the waist, the head, the near arm with the sword): where a part is hidden at
# rest and may be continued (complete()), so at rest nothing it adds shows.
_TORSO = ('cuirass', 'jacket', 'vest', 'belt', 'skirt', 'head')
_NEAR_ARM = ('upper_n', 'fore_n', 'hand_n', 'pauldron_n', 'sword')
_NEAR_LEG = ('thigh_n', 'shin_n', 'boot_n', 'foot_n')
_FAR_LEG = ('thigh_f', 'shin_f', 'boot_f', 'foot_f')
FRONT = {
    'thigh_n': _TORSO + _NEAR_ARM + ('shin_n', 'boot_n', 'foot_n'),
    'shin_n': _TORSO + _NEAR_ARM + ('boot_n', 'foot_n'),
    'boot_n': _TORSO + _NEAR_ARM,
    'foot_n': _TORSO + _NEAR_ARM + ('boot_n',),
    'thigh_f': _TORSO + _NEAR_ARM + _NEAR_LEG + ('shin_f', 'boot_f', 'foot_f'),
    'shin_f': _TORSO + _NEAR_ARM + _NEAR_LEG + ('boot_f', 'foot_f'),
    'boot_f': _TORSO + _NEAR_ARM + _NEAR_LEG,
    'foot_f': _TORSO + _NEAR_ARM + _NEAR_LEG + ('boot_f',),
    'upper_n': ('pauldron_n', 'fore_n', 'hand_n'),
    'upper_f': _TORSO + _NEAR_ARM + _NEAR_LEG + _FAR_LEG + ('pauldron_f', 'fore_f', 'hand_f'),
    'cuirass': ('belt', 'head') + _NEAR_ARM,
    'jacket': ('belt', 'head') + _NEAR_ARM,
    'vest': ('belt', 'head') + _NEAR_ARM,
}
# The limbs continued where something hides them at rest: each its whole shape between its two joints
# (the convex hull of its pixels and a disk at each joint as wide as the limb), his nearest pixel in each
# cell he left hidden, his line on the hull's edge.
LIMBS = {
    'thigh_n': ('hipN', 'kneeN'), 'thigh_f': ('hipF', 'kneeF'),
    'boot_n': ('kneeN', 'ankleN'), 'boot_f': ('kneeF', 'ankleF'),
    'upper_n': ('shoulderN', 'elbowN'), 'upper_f': ('shoulderF', 'elbowF'),
}


def hull(points, H, W):
    """The cells whose middles lie inside the convex hull of these (y, x) cells' middles, as a mask."""
    pts = sorted(set((x + 0.5, y + 0.5) for y, x in points))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def half(ps):
        h = []
        for p in ps:
            while len(h) >= 2 and cross(h[-2], h[-1], p) <= 0:
                h.pop()
            h.append(p)
        return h[:-1]

    hl = half(pts) + half(pts[::-1])
    m = np.zeros((H, W), bool)
    ys = [p[1] for p in hl]
    xs = [p[0] for p in hl]
    for y in range(max(0, int(min(ys)) - 1), min(H, int(max(ys)) + 2)):
        for x in range(max(0, int(min(xs)) - 1), min(W, int(max(xs)) + 2)):
            p = (x + 0.5, y + 0.5)
            m[y, x] = all(cross(hl[k], hl[(k + 1) % len(hl)], p) >= -1e-9 for k in range(len(hl)))
    return m


def complete(name, part, m, c, label):
    """A limb continued where pieces in front hide it at rest (LIMBS, FRONT): in the hull of its pixels and
    of a disk at each of its joints (as wide as the limb is at its middle), every cell hidden at rest that
    it lacks takes his nearest pixel of it that is not his line; a filled cell on the hull's edge is his
    line. At rest every cell it adds is under a piece in front of it."""
    a, b = LIMBS[part]
    (ax, ay), (bx, by) = joint(name, a), joint(name, b)
    H, W = m.shape
    line = line_rgb()
    K = np.array([[kind(c[y, x]) if m[y, x] else '' for x in range(W)] for y in range(H)])
    # the limb's half width: its pixels' distance across the bone, at their middle
    L = np.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    ys, xs = np.nonzero(m)
    t = ((xs + 0.5 - ax) * ux + (ys + 0.5 - ay) * uy) / L
    q = np.abs((xs + 0.5 - ax) * -uy + (ys + 0.5 - ay) * ux)
    mid = (t > 0.25) & (t < 0.75)
    r = float(np.percentile(q[mid], 85)) if mid.sum() > 4 else 2.5
    pts = list(zip(ys, xs))
    for jx, jy in ((ax, ay), (bx, by)):
        for dy in range(-int(r) - 1, int(r) + 2):
            for dx in range(-int(r) - 1, int(r) + 2):
                if dx * dx + dy * dy <= r * r:
                    pts.append((int(np.floor(jy)) + dy, int(np.floor(jx)) + dx))
    hm = hull(pts, H, W)
    # (only along the bone: within the limb's width of the segment between its joints, so nothing he drew
    # beside it, a blade or a tasset, widens it)
    yy, xx = np.mgrid[0:H, 0:W]
    tt = np.clip(((xx + 0.5 - ax) * ux + (yy + 0.5 - ay) * uy) / L, 0, 1)
    dist = np.hypot(xx + 0.5 - (ax + tt * L * ux), yy + 0.5 - (ay + tt * L * uy))
    hm &= dist <= r + 1.0
    allowed = np.isin(label, FRONT[part])
    add = hm & allowed & ~m
    if not add.any():
        return m, c
    # his pixels continued along the limb: each cell takes the pixel of his at the same distance across the
    # bone, nearest along it (his folds, seams and plate bands run on), of the limb's own colours (not the
    # blade's or the gold's that lie over it)
    own = [(y, x) for y, x in zip(*np.nonzero(m)) if K[y, x] not in ('line', 'blue', 'white', 'gold') and not (luma(c[y, x]) > 90 and c[y, x][2] - c[y, x][0] > 20)]
    ot = np.array([((x + 0.5 - ax) * ux + (y + 0.5 - ay) * uy) for y, x in own])
    oq = np.array([((x + 0.5 - ax) * -uy + (y + 0.5 - ay) * ux) for y, x in own])
    c = c.copy()
    for y, x in zip(*np.nonzero(add)):
        tt = (x + 0.5 - ax) * ux + (y + 0.5 - ay) * uy
        qq = (x + 0.5 - ax) * -uy + (y + 0.5 - ay) * ux
        near = np.abs(oq - qq) < 0.75
        if near.any():
            k = int(np.flatnonzero(near)[np.argmin(np.abs(ot[near] - tt))])
        else:
            k = int(np.argmin((ot - tt) ** 2 + (oq - qq) ** 2))
        c[y, x] = c[own[k]]
    out = m | add
    inner = hm & np.roll(hm, 1, 0) & np.roll(hm, -1, 0) & np.roll(hm, 1, 1) & np.roll(hm, -1, 1)
    c[add & ~inner] = line
    return out, c


def part_piece(name, part):
    """One part of figure `name` as a piece: (mask, colours, pivot in our frame, angle). A limb hidden in part
    at rest is continued there (complete())."""
    rgb, label = game(name)
    m, c = cut(rgb, label, [part])
    if part == 'sword':
        m, c = sword_grip(rgb, label, m, c)
        return m, c, joint(name, 'handN'), sword_angle(rgb, m)
    if part in LIMBS:
        m, c = complete(name, part, m, c, label)
    j, limb = RIDES[part]
    ang = angle(name, *limb) if limb else torso_angle()
    return m, c, joint(name, j), ang


def item_module(script, what, name, prefix, parts, slots):
    """The module of one item: `parts` {CONST suffix: (part, doc)} of figure `name`, `slots` {base const
    suffix: kinds} (each slot's base is his middle colour of those kinds over all the parts)."""
    consts = []
    allm = None
    allc = None
    for suffix, (part, doc) in parts.items():
        m, c, pivot, ang = part_piece(name, part)
        consts.append((f'{prefix}_{suffix}', m, c, doc, pivot, ang))
        allm = m if allm is None else allm | m
        allc = c
    bases = {f'{prefix}_{k}': middle(allc, allm, kinds_) for k, kinds_ in slots.items()}
    return module(header(script, what), consts, bases, prefix)


CLOTHS = ('steel', 'dark', 'hair', 'brown')
# Each item's module: (figure, its constants' prefix, what it is, {piece: (part, doc)}, {colour slot: his
# kinds}). The first slot takes every colour of his but his line and his skin that no other slot takes.
ITEMS = {
    'warden-plate': ('armored', 'WARDEN_PLATE', "The owner's armoured outfit: the plate cuirass and the shoulder plates", {
        'TORSO': ('cuirass', 'His cuirass: the gorget, the chest plates and the segmented belly, from his collar to the belt. It rides the torso about the neck.'),
        'SHOULDER_N': ('pauldron_n', 'His near shoulder plate. It rides the near shoulder.'),
        'SHOULDER_F': ('pauldron_f', 'His far shoulder plate, beside the chest. It rides the far shoulder.'),
    }, {'STEEL': CLOTHS}),
    'warden-mail': ('armored', 'WARDEN_MAIL', "The owner's armoured outfit: the mail sleeves", {
        'UPPER_N': ('upper_n', 'His near mail sleeve with the round elbow plate, below the shoulder plate. It rides the upper arm about the shoulder.'),
        'UPPER_F': ('upper_f', 'His far mail sleeve. It rides the upper arm about the shoulder.'),
    }, {'MAIL': CLOTHS}),
    'warden-gauntlets': ('armored', 'WARDEN_GAUNTLETS', "The owner's armoured outfit: the bracers and gauntlets", {
        'FORE_N': ('fore_n', 'His near bracer, two plates over the forearm. It rides the forearm about the elbow.'),
        'FORE_F': ('fore_f', 'His far bracer. It rides the forearm about the elbow.'),
        'HAND_N': ('hand_n', 'His near gauntlet, the fist round the sword\'s grip, his fingers bare under it. It rides the hand about the wrist.'),
        'HAND_F': ('hand_f', 'His far gauntlet, a fist, his fingers bare. It rides the hand about the wrist.'),
    }, {'STEEL': CLOTHS}),
    'warden-belt': ('armored', 'WARDEN_BELT', "The owner's armoured outfit: the belt", {
        'BELT': ('belt', 'His brown belt with its studs and the square buckle. It rides the pelvis.'),
    }, {'LEATHER': ('brown',), 'BUCKLE': ('steel', 'dark', 'hair')}),
    'warden-tassets': ('armored', 'WARDEN_TASSETS', "The owner's armoured outfit: the mail skirt and tassets", {
        'SKIRT': ('skirt', 'His mail skirt between the plate tassets, hanging from the belt over the thighs. It hangs from the pelvis.'),
    }, {'STEEL': CLOTHS}),
    'warden-cuisses': ('armored', 'WARDEN_CUISSES', "The owner's armoured outfit: the thigh plates and knee plates", {
        'THIGH_N': ('thigh_n', 'His near thigh plates and round knee plate. It rides the thigh about the hip.'),
        'THIGH_F': ('thigh_f', 'His far thigh plates and knee plate. It rides the thigh about the hip.'),
    }, {'STEEL': CLOTHS}),
    'warden-greaves': ('armored', 'WARDEN_GREAVES', "The owner's armoured outfit: the greaves and sabatons", {
        'BOOT_N': ('boot_n', 'His near greave. It rides the shin about the ankle.'),
        'BOOT_F': ('boot_f', 'His far greave. It rides the shin about the ankle.'),
        'FOOT_N': ('foot_n', 'His near sabaton. It stands on the ankle, flat on the ground.'),
        'FOOT_F': ('foot_f', 'His far sabaton. It stands on the ankle, flat on the ground.'),
    }, {'STEEL': CLOTHS}),
    'warden-sword': ('armored', 'WARDEN_SWORD', "The owner's armoured outfit: the sword", {
        'SWORD': ('sword', 'His sword: the long blue blade dithered light and dark, the gold guard, the blue grip and the gold pommel. Held by its grip at the hand joint, at his angle.'),
    }, {'BLADE': ('blue', 'white', 'steel', 'dark', 'hair', 'brown'), 'GUARD': ('gold',)}),
    'drifter-jacket': ('rogue', 'DRIFTER_JACKET', "The owner's leather rogue: the jacket", {
        'TORSO': ('jacket', 'His high-collared leather jacket with the crossed straps over the chest. It rides the torso about the neck.'),
        'UPPER_N': ('upper_n', 'His near sleeve, wrapped and quilted, from the shoulder. It rides the upper arm about the shoulder.'),
        'UPPER_F': ('upper_f', 'His far sleeve, his bare elbow under it. It rides the upper arm about the shoulder.'),
        'FORE_N': ('fore_n', 'His near sleeve\'s wrapped forearm. It rides the forearm about the elbow.'),
        'FORE_F': ('fore_f', 'His far sleeve\'s wrapped forearm. It rides the forearm about the elbow.'),
    }, {'LEATHER': CLOTHS}),
    'drifter-gloves': ('rogue', 'DRIFTER_GLOVES', "The owner's leather rogue: the fingerless gloves", {
        'HAND_N': ('hand_n', 'His near fingerless glove, a fist. It rides the hand about the wrist.'),
        'HAND_F': ('hand_f', 'His far fingerless glove, a fist. It rides the hand about the wrist.'),
    }, {'LEATHER': CLOTHS}),
    'drifter-belt': ('rogue', 'DRIFTER_BELT', "The owner's leather rogue: the belt with pouches", {
        'BELT': ('belt', 'His belt with its pouches and buckle. It rides the pelvis.'),
    }, {'LEATHER': CLOTHS}),
    'drifter-trousers': ('rogue', 'DRIFTER_TROUSERS', "The owner's leather rogue: the wrapped trousers", {
        'THIGH_N': ('thigh_n', 'His near trouser leg, wrapped, with the round knee pad. It rides the thigh about the hip.'),
        'THIGH_F': ('thigh_f', 'His far trouser leg with its knee pad. It rides the thigh about the hip.'),
        'SHIN_N': ('shin_n', 'His near trouser leg below the knee pad, tucked into the boot. It rides the shin about the knee.'),
        'SHIN_F': ('shin_f', 'His far trouser leg below the knee pad. It rides the shin about the knee.'),
    }, {'CLOTH': CLOTHS}),
    'drifter-boots': ('rogue', 'DRIFTER_BOOTS', "The owner's leather rogue: the lace-up boots", {
        'BOOT_N': ('boot_n', 'His near boot\'s laced shaft. It rides the shin about the ankle.'),
        'BOOT_F': ('boot_f', 'His far boot\'s laced shaft. It rides the shin about the ankle.'),
        'FOOT_N': ('foot_n', 'His near boot\'s foot. It stands on the ankle, flat on the ground.'),
        'FOOT_F': ('foot_f', 'His far boot\'s foot. It stands on the ankle, flat on the ground.'),
    }, {'LEATHER': CLOTHS}),
    'vanguard-vest': ('tactical', 'VANGUARD_VEST', "The owner's tactical outfit: the armoured vest", {
        'TORSO': ('vest', 'His armoured vest: the collar, the mesh panels and the plates. It rides the torso about the neck.'),
    }, {'CLOTH': CLOTHS}),
    'vanguard-sleeves': ('tactical', 'VANGUARD_SLEEVES', "The owner's tactical outfit: the short sleeves with their shoulder pads", {
        'UPPER_N': ('upper_n', 'His near short sleeve with its padded shoulder, his bare elbow under it. It rides the upper arm about the shoulder.'),
        'UPPER_F': ('upper_f', 'His far short sleeve, his bare elbow under it. It rides the upper arm about the shoulder.'),
    }, {'CLOTH': CLOTHS}),
    'vanguard-wraps': ('tactical', 'VANGUARD_WRAPS', "The owner's tactical outfit: the forearm wraps and fingerless gloves", {
        'FORE_N': ('fore_n', 'His near forearm, wrapped. It rides the forearm about the elbow.'),
        'FORE_F': ('fore_f', 'His far forearm, wrapped. It rides the forearm about the elbow.'),
        'HAND_N': ('hand_n', 'His near fingerless glove, a fist. It rides the hand about the wrist.'),
        'HAND_F': ('hand_f', 'His far fingerless glove, a fist. It rides the hand about the wrist.'),
    }, {'CLOTH': CLOTHS}),
    'vanguard-belt': ('tactical', 'VANGUARD_BELT', "The owner's tactical outfit: the utility belt", {
        'BELT': ('belt', 'His utility belt with its pouches and buckle. It rides the pelvis.'),
    }, {'CLOTH': CLOTHS}),
    'vanguard-cargo': ('tactical', 'VANGUARD_CARGO', "The owner's tactical outfit: the cargo trousers", {
        'THIGH_N': ('thigh_n', 'His near cargo trouser leg with the knee pad. It rides the thigh about the hip.'),
        'THIGH_F': ('thigh_f', 'His far cargo trouser leg with the knee pad. It rides the thigh about the hip.'),
        'SHIN_N': ('shin_n', 'His near trouser leg below the knee pad, tucked into the boot. It rides the shin about the knee.'),
        'SHIN_F': ('shin_f', 'His far trouser leg below the knee pad. It rides the shin about the knee.'),
    }, {'CLOTH': CLOTHS}),
    'vanguard-boots': ('tactical', 'VANGUARD_BOOTS', "The owner's tactical outfit: the armoured boots", {
        'BOOT_N': ('boot_n', 'His near boot\'s armoured shaft. It rides the shin about the ankle.'),
        'BOOT_F': ('boot_f', 'His far boot\'s armoured shaft. It rides the shin about the ankle.'),
        'FOOT_N': ('foot_n', 'His near boot\'s foot. It stands on the ankle, flat on the ground.'),
        'FOOT_F': ('foot_f', 'His far boot\'s foot. It stands on the ankle, flat on the ground.'),
    }, {'CLOTH': CLOTHS}),
}


def build_item(key):
    """The text of the module of ITEMS[key] (tools/refs/<key>-from-ref.py)."""
    name, prefix, what, parts, slots = ITEMS[key]
    return item_module(f'{key}-from-ref.py', what, name, prefix, parts, slots)
