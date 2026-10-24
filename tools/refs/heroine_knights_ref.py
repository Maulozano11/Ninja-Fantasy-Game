"""Shared helpers for lifting the owner's three heroine knights (docs/reference/heroine-knights-owner-reference.jpg).

His picture (2000 x 1116, dark grey ground) is three new women's sets drawn in his own pixel art, side by
side, one body in one pose: a golden paladin, a dark rogue and a dragon-armoured knight, each with the same
head (long wavy auburn hair with a gold clip, green eyes) and the same longsword. His pixels are blocks of
PITCH picture pixels (240 across, from the picture's left edge; rows from PHASE_Y), and each figure is 128 of
them tall (row 5, the hair's top line, to row 131, the near sole), where our female is 92 (hair top 127 to sole
218). So nothing is copied 1:1. The owner's rule for new sets drawn bigger than our sprite (2026-10-24,
"Reducir y limpiar yo"):

  - the body is shrunk evenly onto our fitted female rig: SCALE of his pixels to one fine pixel of ours (his
    hair top to his sole, 128, on our 92). At that scale his head is our Lyra's (hair top to chin 20 fine
    pixels; his 28), so the head is shrunk evenly at the same scale, with its own choice of his rows and
    columns that keeps his eyes, brow, nose and mouth first (HEAD_WEIGHT);
  - then the shrink is cleaned with his palette only (clean()), as a structural choice of his pixels: fine
    row k of a figure shows one of his rows, chosen with his rows left out where they are most like their
    neighbours (keep()), so his 1 px line, his trim and his plate bands stay whole lines; the columns the
    same. His figure's 1 px outline stays his line; his gems are at least 2 x 2 with his highlight; his mail
    a clean checker of his two mail colours; no stray light specks.

game(fig) is a figure at our scale, cleaned: the picture every part of that set is cut from, and the one the
idle tests check pixel for pixel. A pixel of game() at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our
256 x 256 frame, our female at idle frame 0. HIS are his joints there (read off his picture), which the game
stands our rig's joints on at rest while she wears his set (src/sprite/heroineKnightsRig.ts).

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import colorsys
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from roman_ref import CHARS, hexc, near4, near8, write  # noqa: E402,F401

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, 'docs', 'reference', 'heroine-knights-owner-reference.jpg')
# His pixel in picture pixels (2000 / 240, both ways: the strongest period of his block edges), and where his
# first whole row starts (his first column starts at the picture's edge).
PITCH = 2000 / 240
PHASE_Y = 3.98
CELLS = (240, 134)
# The three figures: the first of his columns each one's 80 start at (the figures are 79 of his pixels apart).
FIGS = {'paladin': 0, 'rogue': 79, 'dragon': 158}
FIG_W = 80
# His pixels per fine pixel of ours, the body and the head (the same: at the body's scale his head is Lyra's).
SCALE = 1.39
# His colours within this many levels (each channel) of a commoner one are that one (JPEG noise).
PALETTE_TOL = 8
# His dark grey ground: a pixel within this of it, and grey, is the ground (flooded from the edge).
GROUND = (64, 65, 69)
GROUND_TOL = 9


def luma(a):
    a = np.asarray(a, np.float64)
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


_NATIVE = {}


def native():
    """His pixels: the median of each block's middle (two picture pixels in from its edges), as a (134, 240, 3)
    int array. Row 0 is the strip above his first whole row (his ground)."""
    if 'a' not in _NATIVE:
        a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
        H, W, _ = a.shape
        nx, ny = CELLS
        out = np.zeros((ny, nx, 3))
        for j in range(ny):
            for i in range(nx):
                x0 = i * PITCH
                y0 = PHASE_Y + (j - 1) * PITCH
                xa, xb = max(0, int(np.ceil(x0 + 2))), min(W, int(x0 + PITCH - 2))
                ya, yb = max(0, int(np.ceil(y0 + 2))), min(H, int(y0 + PITCH - 2))
                out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), axis=0) if xb > xa and yb > ya else GROUND
        _NATIVE['a'] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE['a'].copy()


def palette(a):
    """A picture with every colour snapped to his palette: commonest colours first, a colour within PALETTE_TOL
    of one already taken is that one (ties: the lower colour)."""
    cols, counts = np.unique(a.reshape(-1, 3), axis=0, return_counts=True)
    order = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))
    pal = []
    to = {}
    for i in order:
        c = cols[i]
        for p in pal:
            if np.abs(c - p).max() <= PALETTE_TOL:
                to[tuple(c)] = p
                break
        else:
            pal.append(c)
            to[tuple(c)] = c
    H, W, _ = a.shape
    return np.array([[to[tuple(a[y, x])] for x in range(W)] for y in range(H)])


_FIG = {}


def figure_native(fig):
    """One figure's 80 columns of his picture, snapped to its palette: (134, 80, 3)."""
    if fig not in _FIG:
        x0 = FIGS[fig]
        _FIG[fig] = palette(native()[:, x0:x0 + FIG_W])
    return _FIG[fig].copy()


def is_ground_colour(a):
    a = np.asarray(a, np.int32)
    return (np.abs(a - np.array(GROUND)).max(-1) <= GROUND_TOL) & ((a.max(-1) - a.min(-1)) <= 8)


def ground(a, seeds=()):
    """His ground: the grey reached from the picture's edge (or from `seeds`, (x, y)) through ground colours."""
    H, W, _ = a.shape
    g = is_ground_colour(a)
    out = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    stack += [(y, x) for x, y in seeds]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or out[y, x] or not g[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return out


# The ground he left inside a figure's outline, walled in by her (a pixel of each, x, y in the figure's own
# columns): the gaps between an arm and the body, between the cape and a leg. Real gaps: they stay open.
POCKETS = {
    'paladin': [(23, 32), (22, 75), (60, 107)],
    'rogue': [(25, 31), (23, 32), (53, 49), (19, 97), (9, 102), (64, 106)],
    'dragon': [(25, 31), (23, 32), (60, 108)],
}


def figure_mask(fig):
    """A figure's pixels: not his ground (nor the ground he walled in, POCKETS)."""
    a = figure_native(fig)
    m = ~ground(a, POCKETS[fig])
    # (the dark grey bar he left over the hair's top line, row 4, is no part of her)
    m[:TOP] = False
    return m


def is_line(a):
    """His black line: near black, darker than any of his cloth."""
    return luma(a) < 16


def kind(c):
    """What a colour of his is: 'line' (his near black), 'white' (the glints of the eyes and the brightest
    ivory), 'skin', 'hair' (auburn), 'gold', 'red' (crimson cloth), 'blue' (the gems), 'green' (the eyes, the
    dragon's tabard and eye), 'cyan' (the blade), 'steel' (greys, silver, mail), 'ivory' (the paladin's plate),
    'copper' (the dragon's scales), 'ember' (the cape's glowing veins), 'plum' (the rogue's leather) or 'dark'
    (shadows, leather, cloth in shade)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 16:
        return 'line'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    hd = h * 360
    if L > 225 and s < 0.12:
        return 'white'
    if b > r + 20 and g > r + 20 and L > 150:
        return 'cyan'
    if b > r + 25 and b >= g - 10 and s > 0.35:
        return 'blue' if g < b - 20 else 'cyan'
    if g > r + 20 and g > b - 10 and s > 0.3:
        return 'cyan' if b > g - 25 and L > 120 else 'green'
    if s < 0.16:
        return 'steel' if L < 175 else 'ivory'
    if 38 <= hd <= 62 and s > 0.45 and L > 95:
        return 'gold'
    if 30 <= hd <= 60 and s <= 0.45 and L > 120:
        return 'ivory'
    if 10 <= hd <= 32 and s > 0.85 and L > 90 and r > 200:
        return 'ember'
    if 14 <= hd <= 32 and 0.25 <= s <= 0.62 and L > 150:
        return 'skin'
    if (hd >= 335 or hd <= 8) and s > 0.45:
        return 'red'
    if 280 <= hd < 335:
        return 'plum'
    return 'warm'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


KIND_RGB = {
    'line': (0, 0, 0), 'white': (255, 255, 255), 'skin': (255, 190, 160), 'hair': (170, 70, 30), 'gold': (240, 190, 40),
    'red': (200, 20, 40), 'blue': (30, 60, 220), 'green': (20, 160, 60), 'cyan': (60, 230, 230), 'steel': (140, 140, 150),
    'ivory': (235, 225, 190), 'copper': (200, 110, 70), 'ember': (255, 110, 0), 'plum': (120, 40, 110), 'warm': (110, 70, 50),
    'dark': (50, 40, 40),
}


def save(arr, path, k=8):
    img = Image.fromarray(np.asarray(arr).astype(np.uint8))
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)


# His figure's rows (the hair's top to the near sole) and the fine rows they shrink to.
TOP, SOLE = 5, 131
ROWS = 92


def cols_of(fig):
    """How many fine columns a figure's width shrinks to (its own columns at SCALE, as its rows)."""
    xs = np.nonzero(figure_mask(fig).any(0))[0]
    return int(round((xs.max() - xs.min()) * (ROWS - 1) / (SOLE - TOP))) + 1
# The face (his pixels, in a figure's own columns): his eyes, brow, nose and mouth weigh HEAD_WEIGHT times as
# much as the rest when his rows and columns are chosen, so they are the ones kept.
FACE_WEIGHT_BOX = (40, 16, 60, 32)
HEAD_WEIGHT = 4.0


def unlikeness(a, K, m, w, axis):
    """How unlike two of his rows (axis 0) or columns (axis 1) are inside the figure `m`, each pixel weighing
    w: U(i, j). His line against anything else, gold or a gem against anything else and the figure's edge
    count most; a lit row against the body of a plate (10 to 25 levels) counts as a band he drew."""
    if axis == 1:
        a, K, m, w = a.transpose(1, 0, 2), K.T, m.T, w.T
    n = a.shape[0]
    memo = {}
    strong = ('line', 'gold', 'blue', 'white', 'green', 'cyan')

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
        k = np.where(m[i] != m[j], 6.0, k)
        memo[key] = float((k * both * np.maximum(w[i], w[j])).sum())
        return memo[key]

    return U


def keep(first, last, count, U, reach=3, must=()):
    """Which of his rows (or columns) fine rows 0..count-1 show: the first `first` and the last `last` (his
    figure's own ends, so his outline is kept), and between them fine row k about his row
    first + k * (last - first) / (count - 1), within two or three of it, one after another or with rows left
    out between. Leaving rows out between two kept ones costs how unlike each is to the nearer of those two
    (unlikeness()): so his line, his trim and a plate's lit row are kept, and rows like their neighbours go.
    The rows in `must` are always kept."""
    step = (last - first) / (count - 1)
    ideal = [first + k * step for k in range(count)]
    near = lambda t: [c for c in range(int(np.floor(t)) - 2, int(np.floor(t)) + 4) if first <= c <= last]
    best = [{first: (0.0, None)}]
    for k in range(1, count):
        row = {}
        for c in ([last] if k == count - 1 else near(ideal[k])):
            got = None
            for prev in range(c - 1, c - 1 - reach, -1):
                if prev not in best[-1]:
                    continue
                v = best[-1][prev][0] + sum(1e9 if q in must else min(U(q, prev), U(q, c)) for q in range(prev + 1, c)) + abs(c - ideal[k]) * 1e-2
                if got is None or v < got[0]:
                    got = (v, prev)
            if got is not None:
                row[c] = got
        best.append(row)
    c = last
    out = [c]
    for k in range(count - 1, 0, -1):
        c = best[k][c][1]
        out.append(c)
    return out[::-1]


def weights(fig):
    a = figure_native(fig)
    w = np.ones(a.shape[:2])
    x0, y0, x1, y1 = FACE_WEIGHT_BOX
    w[y0:y1, x0:x1] = HEAD_WEIGHT
    return w


_KEEP = {}

# His head (the paladin's, which all three share) is shrunk on its own, at the body's scale, by his rows and
# columns chosen one by one for his face (the owner: the face stays readable; his eyes, iris, brow, nose and
# mouth first): every row of his brow (20), lash (21), eye (22), the row under it (23), his mouth (27), his
# chin (30) and the line under it (31), his hair's top line (5); every column of his near eye (43-47), of his
# far eye and nose (50-54) and of the gold clip's bar and loop (33, 34, 36-38). Left out are rows and columns
# of plain hair, forehead and cheek, each next to one like it.
HEAD_ROWS_KEPT = [5, 7, 9, 10, 11, 12, 13, 14, 16, 18, 19, 20, 21, 22, 23, 25, 27, 28, 30, 31]
HEAD_COLS_KEPT = [28, 30, 32, 33, 34, 35, 36, 37, 38, 40, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 56, 58, 61]


def head_kept():
    """The rows and columns of his head that its fine rows and columns show: (rows, cols)."""
    return HEAD_ROWS_KEPT, HEAD_COLS_KEPT


def kept(fig):
    """The rows and columns of his figure that its fine rows and columns show: (rows, cols)."""
    if fig not in _KEEP:
        a = figure_native(fig)
        m = figure_mask(fig)
        K = kinds(a)
        w = weights(fig)
        xs = np.nonzero(m.any(0))[0]
        rows = keep(TOP, SOLE, ROWS, unlikeness(a, K, m, w, 0))
        cols = keep(int(xs.min()), int(xs.max()), cols_of(fig), unlikeness(a, K, m, w, 1))
        _KEEP[fig] = (rows, cols)
    return _KEEP[fig]


def shrunk(fig):
    """His figure shrunk by kept(): (rgb, mask), every pixel one of his."""
    a = figure_native(fig)
    m = figure_mask(fig)
    rows, cols = kept(fig)
    return a[np.ix_(rows, cols)], m[np.ix_(rows, cols)]


def plain(fig):
    """His figure shrunk with nothing chosen: each fine pixel his pixel under its middle (the "sin limpiar"
    side of the owner's comparison). (rgb, mask)."""
    a = figure_native(fig)
    m = figure_mask(fig)
    xs = np.nonzero(m.any(0))[0]
    n = cols_of(fig)
    rows = [int(round(TOP + k * (SOLE - TOP) / (ROWS - 1))) for k in range(ROWS)]
    cols = [int(round(xs.min() + k * (xs.max() - xs.min()) / (n - 1))) for k in range(n)]
    return a[np.ix_(rows, cols)], m[np.ix_(rows, cols)]


def inside(pts, H, W):
    """The cells (y, x) whose middles are inside a polygon (his pixel corners), as a mask."""
    poly = np.asarray(pts, float)
    yy, xx = np.mgrid[0:H, 0:W]
    px, py = xx + 0.5, yy + 0.5
    res = np.zeros((H, W), bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        res ^= ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi)
        j = i
    return res


def strip(p0, p1, half):
    """A polygon round the segment p0-p1, `half` his pixels to each side and past each end."""
    (x0, y0), (x1, y1) = p0, p1
    d = np.array([x1 - x0, y1 - y0], float)
    d /= np.hypot(*d)
    n = np.array([-d[1], d[0]])
    a = np.array(p0) - d * half
    b = np.array(p1) + d * half
    return [tuple(a + n * half), tuple(b + n * half), tuple(b - n * half), tuple(a - n * half)]


# The parts of each figure (his pixels, in the figure's own columns), front to back: a pixel of the figure
# goes to the first part whose polygon holds it. 'cape' takes what none of the others holds. The sword is
# one longsword in all three (SWORD: its pommel, the grip under the fist, the guard and its quillons, the
# blade); his near fist over its grip.
SWORD = [
    [(10, 64), (16, 64), (16, 72), (10, 72)],
    [(24, 69), (33, 68), (33, 75), (31, 77), (32, 84), (24, 89), (17, 89), (17, 79), (21, 77), (24, 74)],
]
# His blade down the middle of each figure's (x = BLADE[fig][0] * y + BLADE[fig][1], his pixels), from the guard
# to the point: its pixels are the blade's own colours within BLADE_HALF of that line.
BLADE = {'paladin': (0.996, -50.56), 'rogue': (0.982, -49.49), 'dragon': (1.007, -52.21)}
BLADE_ROWS = (78, 125)
BLADE_HALF = 2.2
BLADE_KINDS = ('cyan', 'steel', 'blue', 'white', 'ivory', 'line')


def sword_mask(fig):
    """The sword's pixels in a figure: from his blade's colours down its middle (BLADE), every pixel of his
    reached through the sword's polygons (SWORD) and the blade's strip without crossing his black line, and
    his line round them there. Only his sword's own colours (SWORD_KINDS): where her dark cloth meets the guard
    without a line of his between, the fill stops."""
    a = figure_native(fig)
    H, W, _ = a.shape
    K = kinds(a)
    line = is_line(a)
    env = blade_mask(fig, H, W, BLADE_HALF + 1.5)
    for pts in SWORD:
        env |= inside(pts, H, W)
    env &= figure_mask(fig)
    seeds = blade_mask(fig, H, W, 2.0) & np.isin(K, ('cyan', 'white', 'ivory'))
    # (the pommel past the fist: his steel and gold in its polygon)
    seeds |= inside(SWORD[0], H, W) & np.isin(K, ('steel', 'gold', 'ivory', 'white'))
    out = np.zeros((H, W), bool)
    st = list(zip(*np.nonzero(seeds)))
    while st:
        y, x = st.pop()
        if out[y, x] or not env[y, x] or line[y, x] or K[y, x] not in SWORD_KINDS + ('green',):
            continue
        out[y, x] = True
        st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return out | (line & env & near8(out))


def blade_mask(fig, H, W, half=BLADE_HALF):
    m, c = BLADE[fig]
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.abs((xx + 0.5) - (m * (yy + 0.5) + c)) / np.hypot(1, m)
    return (d <= half) & (yy >= BLADE_ROWS[0]) & (yy <= BLADE_ROWS[1])


HEAD = [(28, 2), (61, 2), (61, 31), (55, 33), (42, 33), (36, 29), (28, 29)]
PARTS = ['blade', 'handN', 'foreN', 'upperN', 'pauldN', 'head', 'belt', 'skirt', 'torso', 'pauldF', 'upperF', 'foreF', 'handF',
         'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF', 'hairBack', 'cape']
POLYS = {
    'paladin': {
        'handN': [[(16, 68), (24, 68), (24, 77), (16, 77)]],
        'foreN': [[(18, 57), (28, 57), (28, 68), (18, 68)]],
        'upperN': [[(18, 47), (28, 47), (28, 57), (18, 57)]],
        'pauldN': [[(28, 27), (42, 27), (42, 51), (28, 51), (22, 47), (22, 37), (27, 33)]],
        'belt': [[(36, 59), (61, 59), (61, 66), (36, 66)], [(30, 60), (44, 60), (44, 76), (30, 76)]],
        'skirt': [[(43, 64), (58, 64), (58, 113), (43, 113)]],
        'torso': [[(36, 29), (56, 29), (56, 59), (36, 59)]],
        'pauldF': [[(54, 28), (65, 28), (65, 49), (55, 49)]],
        'upperF': [[(55, 49), (65, 49), (65, 59), (55, 59)]],
        'foreF': [[(56, 59), (66, 59), (66, 69), (56, 69)]],
        'handF': [[(58, 69), (69, 69), (69, 82), (58, 82)]],
        'thighN': [[(30, 66), (44, 66), (44, 89), (30, 89)]],
        'shinN': [[(27, 88), (41, 88), (41, 101), (38, 104), (38, 120), (24, 120), (24, 104), (27, 100)]],
        'footN': [[(17, 120), (39, 120), (39, 133), (17, 133)]],
        'thighF': [[(55, 76), (65, 76), (65, 91), (55, 91)]],
        'shinF': [[(48, 91), (65, 91), (65, 119), (48, 119)]],
        'footF': [[(47, 118), (73, 118), (73, 131), (47, 131)]],
        'hairBack': [[(8, 26), (31, 26), (31, 32), (24, 36), (21, 47), (18, 63), (8, 63)]],
    },
    'rogue': {
        'handN': [[(15, 66), (28, 66), (28, 72), (24, 74), (22, 77), (21, 81), (15, 81)]],
        'foreN': [[(18, 57), (30, 57), (30, 66), (18, 66)]],
        'upperN': [[(19, 45), (33, 45), (33, 57), (19, 57)]],
        'pauldN': [[(23, 27), (47, 27), (47, 44), (40, 47), (31, 52), (23, 52)]],
        'belt': [[(33, 57), (61, 57), (61, 68), (33, 68)], [(51, 66), (58, 66), (58, 96), (51, 96)]],
        'skirt': [[(22, 66), (62, 66), (62, 112), (22, 112)]],
        'torso': [[(34, 29), (55, 29), (55, 57), (34, 57)]],
        'pauldF': [[(50, 27), (60, 27), (60, 47), (50, 47)]],
        'upperF': [[(55, 46), (64, 46), (64, 57), (55, 57)]],
        'foreF': [[(56, 57), (67, 57), (67, 66), (56, 66)]],
        'handF': [[(57, 66), (71, 66), (71, 82), (57, 82)]],
        'thighN': [[(36, 82), (45, 82), (45, 92), (36, 92)]],
        'shinN': [[(33, 91), (42, 91), (42, 100), (36, 104), (35, 118), (23, 118), (25, 104), (31, 100)]],
        'footN': [[(21, 118), (36, 118), (36, 132), (21, 132)]],
        'thighF': [[(49, 84), (56, 84), (56, 91), (49, 91)]],
        'shinF': [[(55, 91), (64, 91), (64, 101), (59, 104), (59, 117), (48, 117), (49, 104), (55, 100)]],
        'footF': [[(46, 116), (72, 116), (72, 131), (46, 131)]],
        'hairBack': [[(8, 26), (26, 26), (26, 50), (20, 58), (8, 58)]],
    },
    'dragon': {
        'handN': [[(15, 68), (25, 68), (25, 73), (22, 76), (21, 79), (15, 79)]],
        'foreN': [[(17, 57), (29, 57), (29, 68), (17, 68)]],
        'upperN': [[(18, 49), (31, 49), (31, 57), (18, 57)]],
        'pauldN': [[(17, 29), (41, 29), (41, 50), (31, 52), (17, 52)]],
        'belt': [[(28, 57), (62, 57), (62, 68), (28, 68)], [(29, 62), (45, 62), (45, 75), (29, 75)]],
        'skirt': [[(43, 65), (56, 65), (56, 100), (43, 100)]],
        'torso': [[(37, 29), (56, 29), (56, 57), (37, 57)]],
        'pauldF': [[(52, 28), (66, 28), (66, 49), (55, 49)]],
        'upperF': [[(55, 48), (66, 48), (66, 59), (55, 59)]],
        'foreF': [[(56, 59), (68, 59), (68, 69), (56, 69)]],
        'handF': [[(57, 69), (70, 69), (70, 83), (57, 83)]],
        'thighN': [[(27, 70), (44, 70), (44, 92), (27, 92)]],
        'shinN': [[(25, 92), (37, 92), (37, 104), (36, 121), (23, 121), (24, 104)]],
        'footN': [[(17, 120), (39, 120), (39, 133), (17, 133)]],
        'thighF': [[(55, 70), (64, 70), (64, 93), (55, 93)]],
        'shinF': [[(54, 92), (64, 92), (64, 104), (59, 106), (59, 120), (48, 120), (49, 104), (54, 100)]],
        'footF': [[(44, 119), (71, 119), (71, 131), (44, 131)]],
        'hairBack': [[(8, 26), (24, 26), (24, 32), (19, 40), (19, 58), (8, 58)]],
    },
}
# The sword's own colours (his steel, blade cyan, gem blue, gold and his line): what the sword's polygons take.
SWORD_KINDS = ('cyan', 'steel', 'blue', 'white', 'gold', 'ivory', 'line')
# Where a figure's parts overlap otherwise than PARTS has them: the rogue's legs stand in front of her torn
# skirt's tatters.
ORDER = {'rogue': PARTS[:7] + ['thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF', 'skirt', 'torso', 'pauldF', 'upperF', 'foreF', 'handF', 'hairBack', 'cape']}
for _f in POLYS:
    POLYS[_f]['blade'] = SWORD
    POLYS[_f]['head'] = [HEAD]


# A cell (his colours walled in by his line) goes whole to the part most of it is in, if that is at least this
# much of it; else each of its pixels to its own part.
CELL_MAJORITY = 0.7
# (cells bigger than this, where his dark cloth runs into the next part without a line, go pixel by pixel)
CELL_MAX = 60


def components(mask, conn8=False):
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


_LABELS = {}


def labels(fig, skip=()):
    """Which part each pixel of a figure is (a (134, 80) array of part names, '' off the figure): each part's
    polygons (POLYS, SHARED) front to back, then snapped to his line: a cell of his colours walled in by his
    line goes whole to the part most of it is in (CELL_MAJORITY), and his line between parts to the frontmost
    part beside it."""
    key = (fig, tuple(skip))
    if key in _LABELS:
        return _LABELS[key].copy()
    a = figure_native(fig)
    m = figure_mask(fig)
    H, W = m.shape
    raw = np.full((H, W), '', dtype='<U10')
    free = m.copy()
    polys = POLYS[fig]
    for name in [n for n in ORDER.get(fig, PARTS) if n not in skip]:
        if name == 'cape':
            raw[free] = 'cape'
            break
        got = np.zeros((H, W), bool)
        for pts in polys.get(name, []):
            got |= inside(pts, H, W)
        got &= free
        if name == 'blade':
            got = sword_mask(fig) & free
        raw[got] = name
        free &= ~got
    out = raw.copy()
    line = is_line(a) & m
    for c in components(m & ~line):
        names = [raw[y, x] for y, x in c]
        best = max(sorted(set(names)), key=names.count)
        if len(c) <= CELL_MAX and names.count(best) >= CELL_MAJORITY * len(c):
            for y, x in c:
                out[y, x] = best
    rank = {n: i for i, n in enumerate(PARTS)}
    for y, x in zip(*np.nonzero(line)):
        nb = [out[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and m[y + dy, x + dx] and not line[y + dy, x + dx]]
        if nb:
            out[y, x] = min(nb, key=lambda n: rank[n])
    _LABELS[key] = out
    return out.copy()


GRID = 256
# Where a figure lands in our 256 x 256 frame (our female at idle frame 0): his hair's top row on our row 127
# and his near sole's row on our 218 (kept()), his column ANCHOR[0] on our column ANCHOR[1].
FRAME_TOP = 127
ANCHOR = (50, 127)
# The parts every set shares, lifted once from the paladin (the hair, face and sword he drew the same three
# times, within a pixel): in the rogue's and the dragon's game() they are the paladin's, where hers are.
SHARED_PARTS = ('head', 'hairBack', 'blade')
SHARED_FROM = 'paladin'


def to_frame(fig):
    """(rows, cols): our frame's row and column for each of the figure's kept rows and columns."""
    rows, cols = kept(fig)
    i = min(range(len(cols)), key=lambda k: (abs(cols[k] - ANCHOR[0]), k))
    x0 = ANCHOR[1] - i
    return [FRAME_TOP + k for k in range(len(rows))], [x0 + k for k in range(len(cols))]


def frame_of(fig, x, y):
    """His point (x, y) of a figure (his pixels, the figure's own columns) in our frame (fine pixels): where it
    falls between the kept rows and columns round it."""
    rows, cols = kept(fig)
    fr, fc = to_frame(fig)
    return (float(np.interp(x, np.array(cols) + 0.5, np.array(fc) + 0.5)), float(np.interp(y, np.array(rows) + 0.5, np.array(fr) + 0.5)))


def head_layer():
    """The shared head (the paladin's) shrunk on its own (head_kept()) into our frame, all of it: (rgb, label),
    label 'head' where it is."""
    ha = figure_native(SHARED_FROM)
    hl = labels(SHARED_FROM)
    hr, hc = head_kept()
    i = min(range(len(hc)), key=lambda k: (abs(hc[k] - ANCHOR[0]), k))
    hrgb = np.zeros((GRID, GRID, 3), np.int32)
    hlab = np.full((GRID, GRID), '', dtype='<U10')
    y0, x0 = FRAME_TOP, ANCHOR[1] - i
    hs = hl[np.ix_(hr, hc)]
    hlab[y0:y0 + len(hr), x0:x0 + len(hc)] = np.where(hs == 'head', 'head', '')
    hrgb[y0:y0 + len(hr), x0:x0 + len(hc)] = ha[np.ix_(hr, hc)]
    return hrgb, hlab


def raw_frame(fig):
    """A figure shrunk (kept()) into our frame before the shared parts and the cleaning: (rgb, label), label ''
    off the figure. Its head is the shared head shrunk on its own (head_kept()), laid where the game draws it
    (over what is behind it, DRAWN), the figure's own parts continued under where its own head was."""
    a = figure_native(fig)
    lab = labels(fig)
    rows, cols = kept(fig)
    fr, fc = to_frame(fig)
    rgb = np.zeros((GRID, GRID, 3), np.int32)
    out = np.full((GRID, GRID), '', dtype='<U10')
    sub = a[np.ix_(rows, cols)]
    sl = lab[np.ix_(rows, cols)]
    rgb[fr[0]:fr[-1] + 1, fc[0]:fc[-1] + 1] = sub
    out[fr[0]:fr[-1] + 1, fc[0]:fc[-1] + 1] = sl
    hrgb, hlab = head_layer()
    return lay(rgb, out, hrgb, hlab, ('head',))


def lay(rgb, lab, srgb, slab, shared, under=None):
    """`shared` parts (srgb, slab) laid on a figure (rgb, lab) where the game draws them over what is there
    (DRAWN: nothing of the figure's in front of them); where the figure's own such parts showed and the laid
    ones do not cover them, its own parts under them continue (the commonest part of its neighbours, a ring at
    a time, its nearest pixel), and what nothing is under is the ground. Returns (rgb, label)."""
    rgb = rgb.copy()
    lab = lab.copy()
    own = np.isin(lab, shared)
    rank = {n: i for i, n in enumerate(DRAWN)}
    behind = np.vectorize(lambda o, t: bool(t) and ((not o) or o in shared or rank[o] < rank[t]))(lab, slab)
    theirs = np.isin(slab, shared) & behind
    rgb[theirs] = srgb[theirs]
    lab[theirs] = slab[theirs]
    left = own & ~theirs
    # where the figure's own part under them is known (`under`: its labels with the shared parts left out), its
    # own pixels there are that part's
    if under is not None:
        known = left & (under != '') & ~np.isin(under, shared)
        lab[known] = under[known]
        left &= ~known
    for _ in range(8):
        if not left.any():
            break
        grow = []
        for y, x in zip(*np.nonzero(left)):
            nb = [(y + dy, x + dx) for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)) if lab[y + dy, x + dx] and not left[y + dy, x + dx] and lab[y + dy, x + dx] not in shared]
            if nb:
                names = [lab[q] for q in nb]
                n = max(sorted(set(names)), key=names.count)
                solid = [q for q in nb if lab[q] == n and not is_line(rgb[q])]
                q = solid[0] if solid else next(q for q in nb if lab[q] == n)
                grow.append((y, x, n, rgb[q]))
        if not grow:
            break
        for y, x, n, c in grow:
            lab[y, x] = n
            rgb[y, x] = c
            left[y, x] = False
    lab[left] = ''
    return rgb, lab


# The parts back to front as the game draws them (src/sprite/ctx.ts DEPTHS, and within a depth the items in
# compose.ts SLOT_ORDER, each item its pieces in turn): the cape, the long hair, the far
# arm, the legs, the skirt, the torso, the belt, the head, the sword, the near arm.
DRAWN = ['cape', 'hairBack', 'upperF', 'pauldF', 'foreF', 'handF', 'thighF', 'footF', 'shinF', 'thighN', 'footN', 'shinN', 'skirt',
         'torso', 'belt', 'head', 'blade', 'upperN', 'pauldN', 'foreN', 'handN']
# (the rogue's hood and collar are her cape's: the collar over her corset, the hood over her near arm)
DRAWN_OF = {'rogue': [n for n in DRAWN if n not in ('pauldF', 'pauldN')]}
DRAWN_OF['rogue'].insert(DRAWN_OF['rogue'].index('torso') + 1, 'pauldF')
DRAWN_OF['rogue'].append('pauldN')


def composed(fig):
    """A figure shrunk into our frame with the shared parts the paladin's (SHARED_PARTS: the head already is,
    raw_frame()): her long hair and her sword laid as the game draws them (lay()). (rgb, label)."""
    rgb, lab = raw_frame(fig)
    if fig == SHARED_FROM:
        return rgb, lab
    prgb, plab = raw_frame(SHARED_FROM)
    # under her own sword, where the paladin's does not lie, her own pixels are the parts he drew there
    rows, cols = kept(fig)
    fr, fc = to_frame(fig)
    under = np.full((GRID, GRID), '', dtype='<U10')
    alt = labels(fig, skip=('blade',))[np.ix_(rows, cols)]
    under[fr[0]:fr[-1] + 1, fc[0]:fc[-1] + 1] = alt
    under[lab != 'blade'] = ''
    return lay(rgb, lab, prgb, np.where(np.isin(plab, ('hairBack', 'blade')), plab, ''), ('hairBack', 'blade'), under)


def his_line():
    """His black line: the commonest of his line colours over the three figures."""
    a = np.concatenate([figure_native(f).reshape(-1, 3) for f in FIGS])
    ln = a[is_line(a)]
    cols, counts = np.unique(ln, axis=0, return_counts=True)
    i = max(range(len(cols)), key=lambda i: (counts[i], -int(cols[i].sum())))
    return cols[i]


# The largest hole in the figure the cleaning closes (fine pixels).
HOLE = 3
# His mail (a checker of two of his colours) on these parts of these figures.
MAIL = {'rogue': ('upperN', 'upperF')}
# His cloth, whose specks the cleaning takes off (his gold, embers and line stay).
CLOTH = {'paladin': ('cape',), 'rogue': ('cape', 'skirt', 'pauldN', 'pauldF', 'thighN', 'thighF', 'shinN', 'shinF'), 'dragon': ('cape',)}


def mail_colours(fig, rgb, lab):
    """His mail's two colours: the commonest two greys (kind steel) on his mail parts, the darker first."""
    m = np.isin(lab, MAIL[fig]) & np.array([[kind(rgb[y, x]) == 'steel' for x in range(GRID)] for y in range(GRID)])
    cols, counts = np.unique(rgb[m].reshape(-1, 3), axis=0, return_counts=True)
    top = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))[:2]
    return sorted((cols[i] for i in top), key=lambda c: luma(c))


def under_ground(fig, ys, xs):
    """Whether his picture has ground under any of these fine pixels (a gap he drew)."""
    a = figure_native(fig)
    m = figure_mask(fig)
    rows, cols = kept(fig)
    fr, fc = to_frame(fig)
    for y, x in zip(ys, xs):
        j, i = y - fr[0], x - fc[0]
        if 0 <= j < len(rows) and 0 <= i < len(cols):
            r0 = rows[j]
            r1 = rows[j + 1] if j + 1 < len(rows) else r0 + 1
            c0 = cols[i]
            c1 = cols[i + 1] if i + 1 < len(cols) else c0 + 1
            if not m[r0:r1, c0:c1].all():
                return True
    return False


def clean(fig, rgb, lab):
    """The shrink cleaned with his palette only (the owner's "Reducir y limpiar yo"):
      - a pixel or two of the figure standing alone off it (a strand's tip the shrink cut off) goes;
      - a hole of up to HOLE pixels the figure walls in where his picture has none (no ground of his under
        it) takes the commonest of his pixels round it; a gap he left (an arm and the body) stays open;
      - his line one colour (his commonest near black: the others are the JPEG's), and 1 px all round the
        figure: a pixel of the figure beside the ground round it is his line;
      - his mail a 1 px checker of his two mail colours (mail_colours());
      - on his cloth (CLOTH) a speck (a colour none of its eight neighbours has) takes the colour most of its
        neighbours have, so his folds read as folds (his gold, embers and line stay);
      - a light speck (much lighter than everything round it, not his gold, gems, blade or eyes) takes the
        colour round it.
    Returns (rgb, label)."""
    rgb = rgb.copy()
    lab = lab.copy()
    H, W = lab.shape
    line = his_line()
    for c in components(lab != '', True):
        if len(c) < 3:
            for y, x in c:
                lab[y, x] = ''
                rgb[y, x] = 0
    for c in components(lab == '', False):
        if len(c) > HOLE or any(y in (0, H - 1) or x in (0, W - 1) for y, x in c):
            continue
        if under_ground(fig, [y for y, x in c], [x for y, x in c]):
            continue
        for y, x in c:
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if lab[y + dy, x + dx]]
            cols = [tuple(rgb[q]) for q in nb]
            rgb[y, x] = max(sorted(set(cols)), key=cols.count)
            labs = [lab[q] for q in nb]
            lab[y, x] = max(sorted(set(labs)), key=labs.count)
    fig_m = lab != ''
    out = np.zeros_like(fig_m)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or out[y, x] or fig_m[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    K = np.array([[kind(rgb[y, x]) if fig_m[y, x] else '' for x in range(W)] for y in range(H)])
    # his line is one colour (its near blacks are the JPEG's)
    rgb[K == 'line'] = line
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if fig_m[y, x] and (out[y - 1, x] or out[y + 1, x] or out[y, x - 1] or out[y, x + 1]):
                rgb[y, x] = line
                K[y, x] = 'line'
    if fig in MAIL:
        mail = mail_colours(fig, rgb, lab)
        for y in range(H):
            for x in range(W):
                if lab[y, x] in MAIL[fig] and K[y, x] == 'steel':
                    rgb[y, x] = mail[(x + y) % 2]
    near = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    keepk = ('line', 'gold', 'ember', 'blue', 'white', 'green', 'cyan')
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not fig_m[y, x] or K[y, x] in keepk or lab[y, x] in ('head', 'blade'):
                continue
            nb = [(y + dy, x + dx) for dy, dx in near if fig_m[y + dy, x + dx]]
            cols = [tuple(rgb[q]) for q in nb if K[q] != 'line']
            if not cols:
                continue
            mode = np.array(max(sorted(set(cols)), key=cols.count))
            if lab[y, x] in CLOTH.get(fig, ()) and tuple(rgb[y, x]) not in cols:
                rgb[y, x] = mode
                K[y, x] = kind(mode)
            elif luma(rgb[y, x]) > 150 and all(luma(rgb[q]) < luma(rgb[y, x]) - 50 for q in nb):
                rgb[y, x] = mode
                K[y, x] = kind(mode)
    if fig in SCALES:
        scales(fig, rgb, lab)
    gems(fig, rgb, lab)
    return rgb, lab


# The dragon's scale armour (the owner: scales a regular pattern): these parts' copper is laid as rows of
# scales, his light where he lit the armour and his shadow where he shaded it.
SCALES = {'dragon': ('torso', 'pauldF', 'upperN', 'upperF', 'foreN', 'foreF', 'handF', 'thighN', 'thighF', 'shinN', 'shinF')}
SCALE_KINDS = ('warm', 'red', 'skin', 'plum')
# One scale, 4 across and 2 down (each row of scales two across from the one above, so their edges run as
# overlapping arcs): its lit top, its body and its shaded edge, as steps down his copper (0 his light for that
# part of the armour, 2 the darkest).
SCALE_TILE = [
    [0, 0, 1, 2],
    [1, 1, 2, 1],
]


def scales(fig, rgb, lab):
    """His copper on the scale parts (SCALES) laid as a regular pattern of scales (SCALE_TILE) in his own
    colours: a ramp of five of his copper colours (the commonest at each fifth of their lightness), and at each
    pixel how lit he drew the armour there (the mean lightness round it), so the pattern keeps his light and
    shade. His line round each part and his longer lines inside it (the edges of his plates), his brightest
    lights, his gold, steel and gems stay."""
    H, W = lab.shape
    m = np.isin(lab, SCALES[fig])
    K = np.array([[kind(rgb[y, x]) if m[y, x] else '' for x in range(W)] for y in range(H)])
    copper = m & np.isin(K, SCALE_KINDS)
    # his line inside a part (the gaps between his scales) goes with the scales; his line round the part stays
    inner_line = m & (K == 'line')
    # (a speck of it: his longer lines inside, the edges of his plates, stay)
    for c in components(inner_line, True):
        if len(c) > 2:
            continue
        for y, x in c:
            if all(0 <= y + dy < H and 0 <= x + dx < W and lab[y + dy, x + dx] == lab[y, x] for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                copper[y, x] = True
    # his copper ramp: the commonest of his copper colours (hue up to 30 degrees, saturated) at each fifth of
    # its lightness, darkest first
    pix = [tuple(rgb[y, x]) for y, x in zip(*np.nonzero(m & np.isin(K, SCALE_KINDS)))]
    def is_copper(c):
        h, sat, v = colorsys.rgb_to_hsv(*(np.array(c) / 255))
        return (h * 360 <= 30 or h * 360 >= 350) and sat > 0.3 and v > 0.25
    pix = [c for c in pix if is_copper(c)]
    if len(pix) < 20:
        return
    lum_of = np.array([luma(c) for c in pix])
    ramp = []
    for q in (0.1, 0.3, 0.5, 0.7, 0.92):
        t = np.quantile(lum_of, q)
        near = [c for c, l in zip(pix, lum_of) if abs(l - t) <= 12]
        ramp.append(max(sorted(set(near)), key=near.count))
    L = luma(rgb.astype(float))
    lums = []
    lum = {}
    for y, x in zip(*np.nonzero(copper)):
        q = [(y + dy, x + dx) for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2) if 0 <= y + dy < H and 0 <= x + dx < W and m[y + dy, x + dx] and K[y + dy, x + dx] != 'line']
        lum[(y, x)] = np.mean([L[p] for p in q]) if q else L[y, x]
        lums.append(lum[(y, x)])
    # how lit the armour is here: which fifth of the parts' light
    edges = np.quantile(lums, [0.2, 0.4, 0.6, 0.8])
    # his brightest lights (the shine on a shoulder or a knee) stay his
    shine = np.quantile(lum_of, 0.96)
    for (y, x), l in lum.items():
        if L[y, x] >= shine and K[y, x] != 'line':
            continue
        band = y // 2
        step = SCALE_TILE[y % 2][(x + 2 * (band % 2)) % 4]
        lit = int(np.searchsorted(edges, l))
        rgb[y, x] = ramp[max(0, min(4, lit + 1 - step))]


# A gem of his (his blue, GEM_KINDS) of at least GEM_LEAST pixels is at least 2 x 2 at our scale; a single
# pixel of his that is an eye (EYES: the dragon pauldron's green eye) is kept.
GEM_KINDS = ('blue',)
GEM_LEAST = 3
EYES = {'dragon': [(30, 37)]}


def gems(fig, rgb, lab):
    """His gems at our scale (the owner: gems at least 2 x 2 with his highlight): each gem of his laid on the box
    its corners shrink to, at least 2 x 2, each cell his gem pixel nearest it, his lightest pixel (the
    highlight) on the cell nearest it; only on its own part. His eyes on the pauldron: his pixel where it
    lands."""
    a = figure_native(fig)
    K = kinds(a)
    nl = labels(fig)
    for c in components(np.isin(K, GEM_KINDS), True):
        if len(c) < GEM_LEAST:
            continue
        part = nl[c[0]]
        ys = [p[0] for p in c]
        xs = [p[1] for p in c]
        fx0, fy0 = frame_of(fig, min(xs), min(ys))
        fx1, fy1 = frame_of(fig, max(xs) + 1, max(ys) + 1)
        x0, y0 = int(np.floor(fx0)), int(np.floor(fy0))
        w = max(2, int(round(fx1 - fx0)))
        h = max(2, int(round(fy1 - fy0)))
        cells = [(y, x) for y in range(y0, y0 + h) for x in range(x0, x0 + w) if lab[y, x] == part]
        if not cells:
            continue
        for y, x in cells:
            # his gem pixel nearest this cell's middle, in his pixels
            gx = min(xs) + (x - x0 + 0.5) / w * (max(xs) + 1 - min(xs))
            gy = min(ys) + (y - y0 + 0.5) / h * (max(ys) + 1 - min(ys))
            q = min(c, key=lambda p: ((p[1] + 0.5 - gx) ** 2 + (p[0] + 0.5 - gy) ** 2, p))
            rgb[y, x] = a[q]
        hi = max(c, key=lambda p: (luma(a[p]), -p[0], -p[1]))
        hx = x0 + (hi[1] + 0.5 - min(xs)) / (max(xs) + 1 - min(xs)) * w
        hy = y0 + (hi[0] + 0.5 - min(ys)) / (max(ys) + 1 - min(ys)) * h
        y, x = min(cells, key=lambda p: ((p[1] + 0.5 - hx) ** 2 + (p[0] + 0.5 - hy) ** 2, p))
        rgb[y, x] = a[hi]
    for ex, ey in EYES.get(fig, []):
        fx, fy = frame_of(fig, ex + 0.5, ey + 0.5)
        x, y = int(np.floor(fx)), int(np.floor(fy))
        if lab[y, x] == nl[ey, ex]:
            rgb[y, x] = a[ey, ex]


_GAME = {}


def game(fig):
    """A figure at our scale in our frame, cleaned: (rgb, label). Every part of its set is cut from it, and the
    idle test checks the game against it pixel for pixel. Its shared parts (her head, long hair and sword) are
    the shared pieces' pixels (shared()), the same in all three."""
    if fig not in _GAME:
        rgb, lab = clean(fig, *composed(fig))
        if fig != SHARED_FROM:
            srgb, slab = shared()
            m = np.isin(lab, SHARED_PARTS) & (slab != '')
            rgb[m] = srgb[m]
        _GAME[fig] = (rgb, lab)
    rgb, lab = _GAME[fig]
    return rgb.copy(), lab.copy()


def shared():
    """The shared parts as the pieces have them: (rgb, label) in our frame. Her head is the whole shared head
    (head_layer()), as the paladin's game() has it where it shows there and his line one colour elsewhere (where
    the paladin's pauldron hides it, the rogue's mantle may not); her long hair and her sword the paladin's
    game()'s."""
    if 'shared' not in _GAME:
        prgb, plab = game(SHARED_FROM)
        hrgb, hlab = head_layer()
        rgb = np.zeros_like(prgb)
        lab = np.full_like(plab, '')
        rgb[hlab != ''] = hrgb[hlab != '']
        lab[hlab != ''] = 'head'
        rgb[is_line(rgb) & (lab != '')] = his_line()
        for n in SHARED_PARTS:
            m = plab == n
            rgb[m] = prgb[m]
            lab[m] = n
        _GAME['shared'] = (rgb, lab)
    rgb, lab = _GAME['shared']
    return rgb.copy(), lab.copy()


def plain_frame(fig):
    """A figure shrunk evenly with nothing chosen, in our frame (each fine pixel his pixel under its middle):
    the "sin limpiar" side of the owner's comparison. (rgb, mask)."""
    a = figure_native(fig)
    m = figure_mask(fig)
    fr, fc = to_frame(fig)
    rows, cols = kept(fig)
    rgb = np.zeros((GRID, GRID, 3), np.int32)
    mask = np.zeros((GRID, GRID), bool)
    for j in range(len(fr)):
        for i in range(len(fc)):
            sy = int(np.floor(rows[0] + (j + 0.5) * (rows[-1] + 1 - rows[0]) / len(fr)))
            sx = int(np.floor(cols[0] + (i + 0.5) * (cols[-1] + 1 - cols[0]) / len(fc)))
            if m[sy, sx]:
                rgb[fr[j], fc[i]] = a[sy, sx]
                mask[fr[j], fc[i]] = True
    return rgb, mask


# His joints, read off his paladin (his pixels; the three stand alike, within a pixel in our frame): where each
# of her limbs turns. In our frame (his_joint()) they are where the game stands the rig's joints at rest while
# she wears his sets (src/sprite/heroineKnightsRig.ts).
HIS_NATIVE = {
    'neck': (50.0, 32.0),
    'shoulderN': (29.0, 41.0),
    'elbowN': (23.0, 57.0),
    'wristN': (21.0, 68.0),
    'handN': (20.0, 72.0),
    'shoulderF': (58.0, 40.0),
    'elbowF': (60.0, 58.0),
    'wristF': (62.0, 69.0),
    'handF': (63.0, 75.0),
    'pelvis': (49.0, 70.0),
    'hipN': (41.0, 72.0),
    'hipF': (56.0, 71.0),
    'kneeN': (34.0, 96.0),
    'kneeF': (59.0, 96.0),
    'ankleN': (29.0, 121.0),
    'ankleF': (55.0, 121.0),
}
# Her face in our frame: her near eye's lash row and first column (the face anchor: the near eye is the five
# columns from there, the far eye the three from FAR_EYE further on), as his paladin's head lands.
FACE_ANCHOR = (122, 139)
FAR_EYE = 6


def his_joint(name):
    """His joint `name` in our frame (fine pixels), a hundredth of a pixel to the lower right of where it falls,
    so that no sum of the game's lands it on the pixel before."""
    x, y = frame_of(SHARED_FROM, *HIS_NATIVE[name])
    return (round(x, 3) + 0.01, round(y, 3) + 0.01)


def angle(a, b):
    """The angle (degrees, screen: 0 right, + clockwise) from his joint a to his joint b."""
    (ax, ay), (bx, by) = his_joint(a), his_joint(b)
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def grip():
    """Where his near fist holds the grip in our frame: the game's grip point (src/sprite/grip.ts gripPoint), 0.9
    design units (1.8 fine pixels) on from his hand joint away from his wrist."""
    hx, hy = his_joint('handN')
    wx, wy = his_joint('wristN')
    d = np.hypot(hx - wx, hy - wy)
    return (hx + 1.8 * (hx - wx) / d, hy + 1.8 * (hy - wy) / d)


def cut(rgb, lab, names, line_from_others=True):
    """The piece made of these parts of game(): their pixels, and his line of the parts round them where it
    bounds their colours (an 8-neighbour of a pixel of theirs that is not line), so it keeps its line when it
    moves apart from them. (mask, colours) in our frame."""
    own = np.isin(lab, names)
    if line_from_others:
        ln = is_line(rgb) & (lab != '')
        solid = own & ~ln
        own = own | (ln & near8(solid))
    return own, rgb.copy()


# Which part's colours may be skin: her face, and the rogue's thighs through her torn skirt. Anywhere else a
# skin-like colour of his is the cloth's or the copper's own light (kind 'warm').
SKIN_PARTS = ('head', 'thighN', 'thighF')


def piece_kind(c, skin_ok):
    k = kind(c)
    if k == 'skin' and not skin_ok:
        return 'warm'
    return k


def module(doc, consts, bases, prefix, header_import="import type { PaintedPiece } from '../painted';"):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what each of
    his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours, doc, pivot in
    our frame, angle, skin_ok)) and where each lands in our female idle frame 0, unturned (`<PREFIX>_REST`: the
    fine pixel of its first row's first cell)."""
    out = [doc, header_import, '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    found = {}
    body = []
    rest = []
    for const, mask, col, pdoc, pivot, ang, skin_ok in consts:
        rows, origin, pal = pack(col, mask)
        for h in pal.values():
            rgb = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
            k = piece_kind(rgb, skin_ok)
            if found.get(h, k) != k:
                k = 'warm' if 'skin' in (k, found[h]) else k
            found[h] = k
        body.append(ts_piece(const, pdoc, rows, origin, pal, pivot, ang))
        rest.append((const, origin))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/heroine_knights_ref.py kind). */")
    out.append(f"export const {prefix}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(found):
        out.append(f"  '{h}': '{found[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out)


def pack(col, mask):
    """aiden_ref.pack with roman_ref's longer alphabet."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def ts_piece(name, doc, rows, origin, pal, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the fine pixel (our frame) that lands on
    the joint, `ang` the limb's angle at rest."""
    ox, oy = origin
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {ang:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in pal.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def middle(col, mask, kinds_, q=0.5, skin_ok=False):
    """His colour of middle lightness among the pixels of these kinds in a piece: the base a colour slot
    recolours from."""
    found = sorted((float(luma(col[y, x])), hexc(col[y, x])) for y, x in zip(*np.nonzero(mask)) if piece_kind(col[y, x], skin_ok) in kinds_)
    return found[int(len(found) * q)][1] if found else None


def header(script, what):
    """The first lines of a generated module."""
    return (f'// {what}, his pixels at our scale (tools/refs/{script} from\n'
            '// docs/reference/heroine-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/heroine_knights_ref.py).\n'
            '// Generated: rerun the script to change it.')


def run(argv, build):
    """A part script's main: `build()` gives the module's text, written to argv[1]."""
    if len(argv) < 2:
        sys.exit(f'usage: python3 -I {argv[0]} <out.ts>')
    write(argv[1], build())


SETS = ('paladin', 'rogue', 'dragon')


# Her face (our frame: x0, y0, x1, y1, inclusive): from her brows (FACE_BROW) down everything of her head there
# (brows, eyes, nose, mouth, cheeks, chin and his line round them), above them only her forehead's skin; the
# rest of the head is her hair.
FACE_BOX = (121, 134, 132, 146)
FACE_BROW = 138


# How each part is continued where the parts in front of it hide it at rest (complete()): along its columns
# (an arm, a leg, a tabard's stripes, long hair) or its rows (the torso, the belt, the cape behind her).
FILL_AXIS = {'torso': 'rows', 'belt': 'rows', 'cape': 'rows', 'skirt': 'cols', 'pauldN': 'cols', 'pauldF': 'cols',
             'upperN': 'cols', 'upperF': 'cols', 'foreN': 'cols', 'foreF': 'cols', 'thighN': 'cols', 'thighF': 'cols',
             'shinN': 'cols', 'shinF': 'cols', 'hairBack': 'cols'}


def hull(mask):
    """The cells inside the convex hull of a mask's cells (their middles)."""
    ys, xs = np.nonzero(mask)
    pts = sorted(set((x + 0.5, y + 0.5) for y, x in zip(ys, xs)))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def half(ps):
        h = []
        for p in ps:
            while len(h) >= 2 and cross(h[-2], h[-1], p) <= 0:
                h.pop()
            h.append(p)
        return h[:-1]

    hl = half(pts) + half(pts[::-1])
    H, W = mask.shape
    yy, xx = np.mgrid[0:H, 0:W]
    px, py = xx + 0.5, yy + 0.5
    out = np.ones((H, W), bool)
    for k in range(len(hl)):
        a, b = hl[k], hl[(k + 1) % len(hl)]
        out &= (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]) >= -1e-9
    return out


# What a continued part copies (complete()): his cloth's own body, not its trim, gems, embers or the blade's light.
FILL_NOT = {'cape': ('gold', 'blue', 'cyan', 'ember', 'steel', 'ivory', 'white', 'green'), 'skirt': ('blue', 'cyan', 'white'),
            # (the rogue's bare thigh shows only where her skirt is torn: under it, her leggings)
            'thighN': ('blue', 'cyan', 'skin'), 'thighF': ('blue', 'cyan', 'skin')}


# The joints a part reaches to under what hides it (its hull takes them in): the torso to the shoulders, a limb
# to the joints at its ends, the cape up to the shoulders.
REACH = {'torso': ('shoulderN', 'shoulderF', 'neck'), 'upperN': ('shoulderN', 'elbowN'), 'upperF': ('shoulderF', 'elbowF'),
         'foreN': ('elbowN', 'wristN'), 'foreF': ('elbowF', 'wristF'), 'thighN': ('hipN', 'kneeN'), 'thighF': ('hipF', 'kneeF'),
         'shinN': ('kneeN', 'ankleN'), 'shinF': ('kneeF', 'ankleF'), 'cape': ('shoulderN', 'shoulderF')}
# The cape behind her body is its lining in shade: one colour of his (the commonest of its darker half), not
# streaks of its edges carried across.
FLAT = ('cape',)


def complete(lab, name, mask, col, axis, fig=SHARED_FROM):
    """A piece continued where the parts drawn in front of it (DRAWN) hide it at rest, within the hull of its
    own cells: each hidden cell takes the piece's nearest pixel of his that is not his line along its columns
    or rows (axis), else the nearest at all; a filled cell on the hull's edge is his line. At rest nothing
    changes: the parts in front cover every filled cell. Returns (mask, colours)."""
    order = DRAWN_OF.get(fig, DRAWN)
    rank = {n: i for i, n in enumerate(order)}
    front = np.isin(lab, [n for n in order if rank[n] > rank[name]])
    reach = mask.copy()
    for j in REACH.get(name, ()):
        x, y = his_joint(j)
        reach[int(y), int(x)] = True
    hm = hull(reach)
    add = hm & front & ~mask
    if not add.any():
        return mask, col
    c = col.copy()
    solid = mask & ~is_line(col)
    bad = FILL_NOT.get(name, ('blue', 'cyan'))
    solid &= ~np.array([[solid[y, x] and kind(col[y, x]) in bad for x in range(GRID)] for y in range(GRID)])
    sy, sx = np.nonzero(solid)
    if not len(sy):
        return mask, col
    flat = None
    if name in FLAT:
        cl = [tuple(col[y, x]) for y, x in zip(sy, sx)]
        med = np.median([luma(c) for c in cl])
        dark = [c for c in cl if luma(c) <= med]
        flat = np.array(max(sorted(set(dark)), key=dark.count))
    for y, x in zip(*np.nonzero(add)):
        if flat is not None:
            c[y, x] = flat
            continue
        if axis == 'cols':
            cand = [(abs(yy - y), yy, x) for yy in np.nonzero(solid[:, x])[0]]
        else:
            cand = [(abs(xx - x), y, xx) for xx in np.nonzero(solid[y])[0]]
        if not cand:
            d = (sy - y) ** 2 + (sx - x) ** 2
            k = int(np.argmin(d))
            cand = [(0, sy[k], sx[k])]
        _, qy, qx = min(cand)
        c[y, x] = col[qy, qx]
    m = mask | add
    edge = add & ~(np.roll(hm, 1, 0) & np.roll(hm, -1, 0) & np.roll(hm, 1, 1) & np.roll(hm, -1, 1))
    c[edge] = his_line()
    return m, c


def set_pieces(fig):
    """A set's game() cut into the pieces its items stamp: {part: (mask, colours)} in our frame, each a part's
    pixels with his line round them (cut()), continued where the parts in front of it hide it at rest
    (complete()), so it is whole when it moves apart from them."""
    rgb, lab = game(fig)
    out = {}
    for n in ('torso', 'pauldN', 'pauldF', 'upperN', 'upperF', 'foreN', 'foreF', 'handN', 'handF', 'belt', 'skirt',
              'thighN', 'thighF', 'shinN', 'shinF', 'footN', 'footF', 'cape'):
        m, c = cut(rgb, lab, [n])
        if n in FILL_AXIS and m.any():
            m, c = complete(lab, n, m, c, FILL_AXIS[n], fig)
        out[n] = (m, c)
    return out


def head_pieces():
    """The shared parts (shared()) cut into the face, the hair over it and the long hair behind:
    {name: (mask, colours)} in our frame."""
    rgb, lab = shared()
    head = lab == 'head'
    K = np.array([[kind(rgb[y, x]) if head[y, x] else '' for x in range(GRID)] for y in range(GRID)])
    x0, y0, x1, y1 = FACE_BOX
    box = np.zeros_like(head)
    box[y0:y1 + 1, x0:x1 + 1] = True
    yy = np.arange(GRID)[:, None]
    face = head & box & ((yy >= FACE_BROW) | (K == 'skin'))
    hair = head & ~face
    # his line round the face goes with it too
    ln = is_line(rgb) & head
    face_l = face | (ln & near4(face & ~ln))
    glab = game(SHARED_FROM)[1]
    return {'face': (face_l, rgb.copy()), 'hair': (hair, rgb.copy()), 'hairBack': complete(glab, 'hairBack', *cut(rgb, lab, ['hairBack']), 'cols'),
            'sword': cut(rgb, lab, ['blade'], False)}


# How each part of a set rides the rig: (joint it turns about, the limb's angle from joint to joint at rest).
RIDES = {
    'torso': ('neck', ('pelvis', 'neck')),
    'pauldN': ('shoulderN', ('shoulderN', 'elbowN')),
    'pauldF': ('shoulderF', ('shoulderF', 'elbowF')),
    'upperN': ('shoulderN', ('shoulderN', 'elbowN')),
    'upperF': ('shoulderF', ('shoulderF', 'elbowF')),
    'foreN': ('elbowN', ('elbowN', 'wristN')),
    'foreF': ('elbowF', ('elbowF', 'wristF')),
    'handN': ('wristN', ('elbowN', 'wristN')),
    'handF': ('wristF', ('elbowF', 'wristF')),
    'belt': ('pelvis', ('pelvis', 'neck')),
    'skirt': ('pelvis', ('pelvis', 'neck')),
    'thighN': ('hipN', ('hipN', 'kneeN')),
    'thighF': ('hipF', ('hipF', 'kneeF')),
    'shinN': ('kneeN', ('kneeN', 'ankleN')),
    'shinF': ('kneeF', ('kneeF', 'ankleF')),
    'footN': ('ankleN', None),
    'footF': ('ankleF', None),
    'cape': ('neck', ('pelvis', 'neck')),
}
CONST = {'torso': 'TORSO', 'pauldN': 'PAULD_N', 'pauldF': 'PAULD_F', 'upperN': 'UPPER_N', 'upperF': 'UPPER_F', 'foreN': 'FORE_N',
         'foreF': 'FORE_F', 'handN': 'HAND_N', 'handF': 'HAND_F', 'belt': 'BELT', 'skirt': 'SKIRT', 'thighN': 'THIGH_N',
         'thighF': 'THIGH_F', 'shinN': 'SHIN_N', 'shinF': 'SHIN_F', 'footN': 'FOOT_N', 'footF': 'FOOT_F', 'cape': 'CAPE'}


def set_module(script, what, prefix, parts, docs, bases):
    """The module of one kind of part for all three sets: for each set its pieces (`parts`, each riding the rig
    as RIDES says; `docs`: set -> part -> what it is) and the colours its slots recolour from (`bases`: set ->
    {slot: (part names, kinds)}), as HK_<SET>_<PART> and HK_<SET>_<SLOT>."""
    consts = []
    out_bases = {}
    for fig in SETS:
        P = set_pieces(fig)
        for n in (parts[fig] if isinstance(parts, dict) else parts):
            mask, col = P[n]
            if not mask.any():
                continue
            joint, seg = RIDES[n]
            ang = angle(*seg) if seg else 0.0
            consts.append((f'HK_{fig.upper()}_{CONST[n]}', mask, col, docs[fig][n], his_joint(joint), ang, n in SKIN_PARTS and fig == 'rogue'))
        for slot, (names, ks) in bases.get(fig, {}).items():
            m = np.zeros((GRID, GRID), bool)
            col = None
            for n in names:
                m |= P[n][0]
                col = P[n][1]
            out_bases[f'HK_{fig.upper()}_{slot}'] = middle(col, m, ks)
    return module(header(script, what), consts, out_bases, prefix)
