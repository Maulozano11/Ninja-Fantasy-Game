"""Shared helpers for lifting parts out of the owner's samurai picture (docs/reference/samurai-owner-reference.jpg).

His picture (1493x2000, white background) is a new character drawn on its own, not a paint-over of our
sprite: his pixels are blocks of PITCH picture pixels (a 128 x 171 grid from GRID_PHASE), and his figure is
about 166 of his pixels tall, from the topknot to the soles, where ours is 94. The owner's rule for these
new sets (2026-10-24, "Reducir y limpiar yo"):

  - the body is shrunk evenly at the scale that fits our male rig: BODY_SCALE of his pixels to one fine
    pixel of ours (his legs, arms and neck-to-sole against our male's at idle frame 0);
  - the head (hair, topknot, face and eyes) is shrunk evenly at the scale that makes it our Roman head's
    size: HEAD_SCALE (his lash row to chin against the Roman face's, and his hair's height);
  - then what is left blurry or muddy is cleaned with his palette only (clean()): his 1 px outline round
    the figure, his lacing dots, plate bands and gold trim, choosing among his own pixels; nothing new.

How a region is shrunk (shrink()): fine row k shows one of his rows, each within about one of where the
scale puts it, one after another or with his rows left out between; those left out are the ones most
like a neighbour (drop_costs()), so his 1 px line, his seams and his dots stay where they can. Columns
the same. Every pixel of the result is one of his pixels, his colour snapped to his palette (palette():
the colours within PALETTE_TOL of a commoner colour of his are that colour, JPEG noise).

game() is his figure at our scale: the picture every part is cut from, and the one the idle test checks
pixel for pixel (src/sprite/samuraiRefPixels.ts). A pixel of game() at (x, y) sits at (x + OFFSET[0],
y + OFFSET[1]) of our 256 x 256 frame, our male at idle frame 0. HIS are his joints there (read off his
picture), JOINTS our male's.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import CHARS, hexc, inside, near4, near8, write  # noqa: E402,F401

REF = 'docs/reference/samurai-owner-reference.jpg'
# His pixel: picture pixels across and down (fitted on the edges of his blocks over the whole picture).
PITCH = (11.738, 11.719)
# The picture corner of his first whole block.
GRID_PHASE = (7.3 - 11.738, 0.0)
CELLS = (128, 171)
# His colours within this many levels (each channel) of a commoner one are that one (JPEG noise).
PALETTE_TOL = 8
# His pixels per fine pixel of ours: the body, and the head.
BODY_SCALE = 1.8
HEAD_SCALE = 1.3
# The head region (his pixels): everything above HEAD_TO, less his near shoulder guard's top.
HEAD_TO = 39
HEAD_COLS = (48, 94)
SODE_TOP = [(40, 34), (58, 34), (58, 39), (40, 39)]
# The point the head is shrunk about (his pixels): his chin over his neck. It lands where the body's
# shrink puts it, so the head stays on his neck.
HEAD_ANCHOR = (71.0, 39.0)

# Where game()'s pixel (0, 0) lies in our 256 x 256 frame: his near sole on our near sole's row (218), his
# neck over our neck's column.
OFFSET = (76, 112)
# His joints, read off his picture (his pixels): where each of his limbs turns. In our frame (his_joint())
# they are where the game stands our rig's joints at rest when he wears his set (src/sprite/samuraiRig.ts).
HIS_NATIVE = {
    'neck': (70.0, 40.0),
    'pelvis': (69.0, 93.0),
    'shoulderN': (44.0, 49.0),
    'elbowN': (42.0, 71.0),
    'wristN': (42.0, 92.0),
    'handN': (45.0, 97.0),
    'shoulderF': (88.0, 47.0),
    'elbowF': (92.0, 72.0),
    'wristF': (97.0, 90.0),
    'handF': (99.0, 95.0),
    'hipN': (57.0, 98.0),
    'kneeN': (52.0, 130.0),
    'ankleN': (46.0, 155.0),
    'hipF': (80.0, 96.0),
    'kneeF': (90.0, 130.0),
    'ankleF': (87.0, 155.0),
}
# Our rigs at idle frame 0 (src/sprite/rig.ts drawRig, fine pixels of our frame).
OUR_JOINTS = {
    'male': {
        'head': (126.0, 138.0), 'neck': (127.18, 147.65), 'pelvis': (127.0, 176.87),
        'shoulderN': (114.01, 152.51), 'shoulderF': (134.27, 151.81), 'elbowN': (110.13, 164.50), 'elbowF': (137.09, 164.08),
        'wristN': (107.62, 175.21), 'wristF': (142.52, 173.65), 'handN': (106.80, 178.72), 'handF': (144.30, 176.78),
        'hipN': (121.58, 176.46), 'hipF': (131.51, 173.12), 'kneeN': (122.17, 192.65), 'kneeF': (138.23, 187.86),
        'ankleN': (118.42, 207.59), 'ankleF': (135.94, 203.08),
    },
    'bulky': {
        'head': (126.0, 138.0), 'neck': (127.14, 147.44), 'pelvis': (127.0, 177.86),
        'shoulderN': (110.36, 152.42), 'shoulderF': (136.65, 151.51), 'elbowN': (106.37, 164.80), 'elbowF': (139.97, 164.08),
        'wristN': (103.76, 175.89), 'wristF': (145.22, 174.19), 'handN': (102.77, 180.10), 'handF': (147.21, 178.03),
        'hipN': (120.08, 177.50), 'hipF': (132.77, 174.06), 'kneeN': (120.64, 193.29), 'kneeF': (139.35, 188.42),
        'ankleN': (117.02, 207.64), 'ankleF': (137.06, 203.05),
    },
}


def his_joint(name):
    """His joint `name` in our frame (fine pixels), a hundredth of a pixel to the lower right of where he
    turns, so that no sum of the game's lands it on the pixel before."""
    x, y = HIS_NATIVE[name]
    return (round(x / BODY_SCALE + PAD + OFFSET[0], 3) + 0.01, round(y / BODY_SCALE + PAD + OFFSET[1], 3) + 0.01)


def native(path=REF):
    """His pixels: the median of each block's middle, as a (171, 128, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx, ny = CELLS
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            x0 = GRID_PHASE[0] + i * PITCH[0]
            y0 = GRID_PHASE[1] + j * PITCH[1]
            xa, xb = max(0, int(np.ceil(x0 + 3))), min(W, int(x0 + PITCH[0] - 3))
            ya, yb = max(0, int(np.ceil(y0 + 3))), min(H, int(y0 + PITCH[1] - 3))
            out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), axis=0) if xb > xa and yb > ya else 255
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def palette(a):
    """His picture with every colour snapped to his palette: commonest colours first, a colour within
    PALETTE_TOL of one already taken is that one (ties: the lower colour)."""
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
    out = np.array([[to[tuple(a[y, x])] for x in range(W)] for y in range(H)])
    return out


def is_bg(a):
    return luma(a) > 225


def is_line(a):
    """His black line: navy black, darker than his darkest hair, cloth and lacquer."""
    return luma(a) < 14


def kind(c):
    """What a colour of his is: 'line' (his navy black), 'white' (the glints in his eyes), 'hair' (his
    blue-blacks and blue-greys), 'skin', 'gold' (the trim, the sash, the straps), 'red' (the lacing, the
    hakama, the cape and the cords), 'steel' (the plates' greys) or 'dark' (his lacquer, mail and leather)."""
    import colorsys
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 14:
        return 'line'
    if L > 180 and max(r, g, b) - min(r, g, b) < 30:
        return 'white'
    h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if s_ > 0.6 and (h > 0.88 or h < 0.035) and r > 45:
        return 'red'
    if b > r + 4 and L < 90:
        return 'hair'
    if 0.075 <= h <= 0.12 and s_ > 0.5 and L > 85:
        return 'gold'
    if h < 0.075 and s_ > 0.42 and L > 95 and b > 0.35 * r:
        return 'skin'
    if s_ < 0.22 and L > 50:
        return 'steel'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def dots(a, K):
    """His lacing dots: a red pixel on a plate with at most one red beside it (4-neighbours: his dots are
    one pixel or two stacked), the rest of its neighbours his plate (steel or dark)."""
    red = K == 'red'
    H, W = red.shape
    out = np.zeros_like(red)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not red[y, x]:
                continue
            nb = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            if sum(red[q] for q in nb) <= 1 and sum(K[q] in ('steel', 'dark') for q in nb) >= 2:
                out[y, x] = True
    return out


def lone_red(K):
    """A red pixel of his with no red beside it (4-neighbours): what the head's reading takes as a dot."""
    red = K == 'red'
    out = np.zeros_like(red)
    out[1:-1, 1:-1] = red[1:-1, 1:-1] & ~(red[:-2, 1:-1] | red[2:, 1:-1] | red[1:-1, :-2] | red[1:-1, 2:])
    return out


def undotted(a, K, D):
    """His picture with his lacing dots taken off the plates: each dot pixel the plate's colour beside it on
    its row (left first, past the other pixel of a two-pixel dot), so the plates shrink by their bands and
    edges alone and the dots are laid back on a grid after (plate_dots())."""
    b = a.copy()
    H, W = D.shape
    for y, x in zip(*np.nonzero(D)):
        for d in (1, 2, -1, -2, 3, -3):
            q = x - d
            if 0 <= q < W and not D[y, q] and K[y, q] in ('steel', 'dark'):
                b[y, x] = a[y, q]
                break
    return b


def unlikeness(a, K, m, axis):
    """How unlike two of his rows (axis 0) or columns (axis 1) are inside region `m`: U(i, j). His line
    against anything else, gold against anything else and the region's edge count most; a lit rim against
    the plate's body (10 to 25 levels) counts as a band he drew."""
    if axis == 1:
        a, K, m = a.transpose(1, 0, 2), K.T, m.T
    n = a.shape[0]
    memo = {}

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
        k = np.where((K[i] != K[j]) & ((K[i] == 'line') | (K[j] == 'line') | (K[i] == 'gold') | (K[j] == 'gold')), 6.0, k)
        k = np.where(m[i] != m[j], 6.0, k)
        memo[key] = float((k * both).sum())
        return memo[key]

    return U


def keep(n_src, count, scale, origin, U):
    """Which of his rows (or columns) fine rows 0..count-1 show: fine row k about his row
    origin + (k + 0.5) * scale - 0.5, within two or three rows of it, one after another or with up to three
    rows left out between. Leaving rows out between two kept ones costs how unlike each is to the nearer of
    those two (unlikeness()): so a run of a plate's body rows keeps one of them between its lit rim and the
    next gap line, his line and his gold are kept, and rows like their neighbours go."""
    ideal = [origin + (k + 0.5) * scale - 0.5 for k in range(count)]
    near = lambda t: [c for c in range(int(np.floor(t)) - 2, int(np.floor(t)) + 4) if 0 <= c < n_src]
    best = [{c: (abs(c - ideal[0]) * 1e-2, None) for c in near(ideal[0])}]
    for k in range(1, count):
        row = {}
        for c in near(ideal[k]):
            got = None
            for prev in (c - 1, c - 2, c - 3, c - 4):
                if prev not in best[-1]:
                    continue
                v = best[-1][prev][0] + sum(min(U(q, prev), U(q, c)) for q in range(prev + 1, c)) + abs(c - ideal[k]) * 1e-2
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


# How much of a fine pixel's footprint (of his pixels' area) his line, gold or a glint must cover for the
# fine pixel to show it (reading()).
LINE_COVER = 0.45
GOLD_COVER = 0.25
GLINT_COVER = 0.15
RED_COVER = 0.2


def reading(a, K, D, line, m, scale, origin, j, i, first=False):
    """What fine pixel (i, j) of a region `m` shrunk by `scale` about his point `origin` shows: one of his
    colours under its footprint (None where less than half of it is his figure). A lacing dot (or a pixel
    of his cord) whose middle is in it; else his line where it covers LINE_COVER of the footprint; else a
    glint of his eyes;
    else his gold where it covers GOLD_COVER; else, of the colours under it, the one nearest their mean.
    `first`: the first reading, the one his head keeps (the owner chose it, 2026-10-24: "la cabeza esta
    mejor la de antes"): his line first, then a glint, then a dot, then gold, no cord rule."""
    H, W = m.shape
    y0, y1 = origin[1] + j * scale, origin[1] + (j + 1) * scale
    x0, x1 = origin[0] + i * scale, origin[0] + (i + 1) * scale
    cells = []
    for y in range(max(0, int(np.floor(y0))), min(H, int(np.ceil(y1)))):
        for x in range(max(0, int(np.floor(x0))), min(W, int(np.ceil(x1)))):
            w = (min(y1, y + 1) - max(y0, y)) * (min(x1, x + 1) - max(x0, x))
            if w > 1e-9 and m[y, x]:
                cells.append((w, y, x))
    tot = scale * scale
    fw = sum(c[0] for c in cells)
    if fw < 0.5 * tot:
        return None
    cover = lambda k: sum(w for w, y, x in cells if K[y, x] == k) / fw
    dot = [(y, x) for w, y, x in cells if D[y, x] and y0 <= y + 0.5 < y1 and x0 <= x + 0.5 < x1]
    if dot and not first:
        return a[dot[0]], cells
    if cover('line') >= LINE_COVER:
        return line, cells
    if cover('white') >= GLINT_COVER:
        w, y, x = max((c for c in cells if K[c[1], c[2]] == 'white'), key=lambda c: (c[0], -c[1], -c[2]))
        return a[y, x], cells
    if dot:
        return a[dot[0]], cells
    pick = [c for c in cells if K[c[1], c[2]] != 'line']
    if cover('red') >= RED_COVER and cover('red') < 0.9 and not first:
        # a red cord through his hair or his armour (on his red cloth every pixel is red)
        pick = [c for c in pick if K[c[1], c[2]] == 'red']
    elif cover('gold') >= GOLD_COVER:
        pick = [c for c in pick if K[c[1], c[2]] == 'gold']
    mean = sum(w * a[y, x] for w, y, x in pick) / sum(w for w, y, x in pick)
    best = min(pick, key=lambda c: (int(np.abs(a[c[1], c[2]] - mean).sum()), c[1], c[2]))
    return a[best[1], best[2]], cells


# The regions of his picture each part is cut from (polygons in his pixel corners), front to back: a pixel
# of his figure goes to the first region that holds it. GROUPS are shrunk together (one choice of his rows
# and columns for each), so the bands, seams and dots of one part line up with each other.
REGIONS = {
    'hand_n': [(35, 92), (51, 92), (51, 95), (52, 95), (52, 105), (42, 105), (42, 100), (35, 100)],
    'kote_n': [(30, 71), (50, 71), (50, 92), (30, 92)],
    'sode_n': [(30, 33), (60, 33), (61, 38), (57, 47), (51, 50), (51, 64), (30, 64)],
    'sleeve_n': [(30, 64), (51, 64), (51, 50), (57, 47), (61, 38), (62, 38), (62, 66), (55, 66), (55, 71), (30, 71)],
    'obi': [(49, 76), (87, 76), (87, 88), (78, 88), (78, 98), (70, 98), (70, 88), (49, 88)],
    'hand_f': [(93, 90), (106, 90), (106, 102), (93, 102)],
    'kote_f': [(87, 73), (104, 73), (104, 90), (87, 90)],
    'sleeve_f': [(86, 58), (94, 58), (94, 64), (101, 64), (101, 73), (86, 73)],
    'sode_f': [(86, 33), (101, 33), (101, 64), (94, 64), (94, 58), (86, 58)],
    'do': [(50, 33), (87, 33), (87, 79), (50, 79)],
    'kusazuri': [(44, 86), (98, 86), (98, 121), (44, 121)],
    'knee_n': [(43, 123), (61, 123), (61, 138), (43, 138)],
    'knee_f': [(84, 123), (98, 123), (98, 137), (84, 137)],
    'shin_n': [(37, 136), (57, 136), (57, 153), (37, 153)],
    'foot_n': [(33, 152), (57, 152), (57, 171), (33, 171)],
    'shin_f': [(75, 134), (98, 134), (98, 155), (75, 155)],
    'foot_f': [(73, 154), (107, 154), (107, 169), (73, 169)],
    'cape_f': [(96, 106), (104, 106), (104, 146), (96, 146)],
    'cape': [(3, 86), (44, 86), (44, 121), (41, 121), (39, 142), (31, 157), (3, 157)],
    'hakama_n': [(30, 98), (66, 98), (66, 143), (30, 143)],
    'hakama_f': [(66, 98), (98, 98), (98, 143), (66, 143)],
}
# How each group of regions is shrunk:
#   'plates'  his lamellar plates (the do, the tassets, the shoulder guards): whole rows and columns of his
#             kept (keep()), so each lame keeps its gap line, its lit top row and its body, and his gold
#             trims stay continuous lines; his lacing dots are taken off first and laid back one per dot of
#             his where it lands, never two touching (plate_dots());
#   'keep'    whole rows and columns of his kept (the arms, the legs, the sash, the knee guards, the head);
#   'read'    each fine pixel one of his colours under it, nearest their mean (the cloth: the cape, the
#             hakama), its specks then taken off by clean().
GROUPS = {
    'arm_n': (('hand_n', 'kote_n', 'sleeve_n'), 'keep'),
    'sode_n': (('sode_n',), 'plates'),
    'arm_f': (('hand_f', 'kote_f', 'sleeve_f'), 'keep'),
    'sode_f': (('sode_f',), 'plates'),
    'do': (('do',), 'plates'),
    'obi': (('obi',), 'keep'),
    # each panel of the tassets with its own lames (they curve round the hip at different heights)
    'kz_n': (('kz_n',), 'plates'),
    'kz_c': (('kz_c',), 'plates'),
    'kz_f': (('kz_f',), 'plates'),
    'hakama': (('hakama_n', 'hakama_f'), 'read'),
    'knee_n': (('knee_n',), 'keep'),
    'knee_f': (('knee_f',), 'keep'),
    'leg_n': (('shin_n', 'foot_n'), 'keep'),
    'leg_f': (('shin_f', 'foot_f'), 'keep'),
    'cape': (('cape', 'cape_f'), 'read'),
}
# Where a group's lames run straight across (his pixel columns x0, x1): its rows are chosen by what they
# show there (each lame's gap line, lit top row and body), not by the cords and mail beside them.
LAME_COLS = {'do': (69, 85)}
# His tassets' panels (his pixel columns where each begins): the near panel, the front panel, the far panel.
KUSAZURI_PANELS = {'kz_n': 0, 'kz_c': 68, 'kz_f': 87}
# Back to front: each group over what is behind it.
GROUP_ORDER = ('cape', 'sode_f', 'arm_f', 'leg_f', 'leg_n', 'hakama', 'knee_f', 'knee_n', 'kz_f', 'kz_n', 'kz_c', 'do', 'obi', 'sode_n', 'arm_n')


def regions(a):
    """{region: mask of his picture} for every region of REGIONS, and 'head' (his head: everything above
    HEAD_TO, less his near shoulder guard's top)."""
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    # the white round him, and the white he left between his arms and his body (a real gap); only in his
    # head is white his (the glints of his eyes)
    in_head = (yy < HEAD_TO) & (xx >= HEAD_COLS[0]) & (xx < HEAD_COLS[1])
    fig = ~background(a) & ~((luma(a) > 225) & ~in_head)
    head = fig & (yy < HEAD_TO) & (xx >= HEAD_COLS[0]) & (xx < HEAD_COLS[1]) & ~inside(SODE_TOP, H, W)
    out = {'head': head}
    owned = head.copy()
    for n, pts in REGIONS.items():
        m = fig & inside(pts, H, W) & ~owned
        owned |= m
        out[n] = m
    left = fig & ~owned
    if left.any():
        ys, xs = np.nonzero(left)
        raise ValueError(f'{len(ys)} pixels of his figure in no region, e.g. {list(zip(xs[:8], ys[:8]))}')
    return out


def reduce(a):
    """His figure at our scale before cleaning (game() cleans it): (rgb, which region each pixel came
    from, '' for none), in a frame whose (0, 0) is fine pixel (-PAD, -PAD) of the body's shrink about his
    picture's corner. Every fine pixel is one of his pixels (GROUPS says how each group chooses them)."""
    R = regions(a)
    xx = np.arange(R['head'].shape[1])[None, :]
    starts = sorted(KUSAZURI_PANELS.items(), key=lambda kv: kv[1])
    for k, (n, x0) in enumerate(starts):
        x1 = starts[k + 1][1] if k + 1 < len(starts) else xx.shape[1]
        R[n] = R['kusazuri'] & (xx >= x0) & (xx < x1)
    K = kinds(a)
    D = dots(a, K)
    line = his_line(a)
    flat = undotted(a, K, D)
    FK = kinds(flat)
    H, W, _ = a.shape
    size = (int(np.ceil(H / BODY_SCALE)) + 2 * PAD, int(np.ceil(W / BODY_SCALE)) + 2 * PAD)
    rgb = np.full(size + (3,), 255, np.int32)
    label = np.full(size, '', dtype='<U10')

    def put(names, scale, origin, at, how, lames=None, marks=None, first=False):
        m = np.zeros(R['head'].shape, bool)
        for n in names:
            m |= R[n]
        ys, xs = np.nonzero(m)
        j0 = int(np.floor((ys.min() - origin[1]) / scale))
        j1 = int(np.ceil((ys.max() + 1 - origin[1]) / scale))
        i0 = int(np.floor((xs.min() - origin[0]) / scale))
        i1 = int(np.ceil((xs.max() + 1 - origin[0]) / scale))
        if how == 'read':
            for j in range(j0, j1):
                for i in range(i0, i1):
                    got = reading(a, K, D if marks is None else marks, line, m, scale, origin, j, i, first)
                    if got is None:
                        continue
                    c, cells = got
                    y, x = at[1] + j + PAD, at[0] + i + PAD
                    rgb[y, x] = c
                    share = {n: sum(w for w, cy, cx in cells if R[n][cy, cx]) for n in names}
                    label[y, x] = ALIAS.get(max(names, key=lambda n: share[n]), max(names, key=lambda n: share[n]))
            return
        src, SK = (flat, FK) if how == 'plates' else (a, K)
        rm = m
        if lames:
            rm = m.copy()
            rm[:, :lames[0]] = False
            rm[:, lames[1]:] = False
        rows = keep(m.shape[0], j1 - j0, scale, origin[1] + j0 * scale, unlikeness(src, SK, rm, 0))
        cols = keep(m.shape[1], i1 - i0, scale, origin[0] + i0 * scale, unlikeness(src, SK, m, 1))
        for jj, r in enumerate(rows):
            for ii, c in enumerate(cols):
                if m[r, c]:
                    y, x = at[1] + j0 + jj + PAD, at[0] + i0 + ii + PAD
                    rgb[y, x] = src[r, c]
                    n = next(n for n in names if R[n][r, c])
                    label[y, x] = ALIAS.get(n, n)
        if how == 'plates':
            plate_dots(a, D & m, rows, cols, (at[0] + i0 + PAD, at[1] + j0 + PAD), rgb, label)

    for g in GROUP_ORDER:
        names, how = GROUPS[g]
        put(names, BODY_SCALE, (0.0, 0.0), (0, 0), how, lames=LAME_COLS.get(g))
    # the head about his chin, which lands where the body's shrink puts that point: read pixel by pixel as he
    # chose it (first=True; his lone red pixels the dots, lone_red())
    hx, hy = HEAD_ANCHOR
    at = (int(round(hx / BODY_SCALE)), int(round(hy / BODY_SCALE)))
    put(('head',), HEAD_SCALE, HEAD_ANCHOR, at, 'read', marks=lone_red(K), first=True)
    return rgb, label


def plate_dots(a, D, rows, cols, at, rgb, label):
    """His lacing dots laid back on the shrunk plates: each dot of his (a pixel or two stacked) on the fine
    pixel whose kept row and column are nearest it, in his colour, where the plate's body is (not his line,
    gold or a lit rim, not another region), and never touching another dot (8-neighbours), so they stand in
    his columns and rows as a grid, not a smear."""
    rows = np.array(rows)
    cols = np.array(cols)
    placed = set()
    seen = np.zeros_like(D)
    for y, x in sorted(zip(*np.nonzero(D))):
        if seen[y, x]:
            continue
        seen[y, x] = True
        if y + 1 < D.shape[0] and D[y + 1, x]:
            seen[y + 1, x] = True
        fy = at[1] + int(np.argmin(np.abs(rows - y)))
        fx = at[0] + int(np.argmin(np.abs(cols - x)))
        if not label[fy, fx] or kind(rgb[fy, fx]) not in ('steel', 'dark'):
            continue
        if any((fy + dy, fx + dx) in placed for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
            continue
        rgb[fy, fx] = a[y, x]
        placed.add((fy, fx))


PAD = 12
# The head's two parts are one region, his head.
ALIAS = {'kz_n': 'kusazuri', 'kz_c': 'kusazuri', 'kz_f': 'kusazuri'}


def his_line(a):
    """His black line: the commonest of his line colours."""
    ln = is_line(a)
    cols, counts = np.unique(a[ln].reshape(-1, 3), axis=0, return_counts=True)
    i = max(range(len(cols)), key=lambda i: (counts[i], -int(cols[i].sum())))
    return cols[i]


# The largest hole in the figure the cleaning closes (fine pixels).
HOLE = 3


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


# The cloth read pixel by pixel (GROUPS 'read'): its specks are taken off by clean().
CLOTH = ('hakama_n', 'hakama_f', 'cape', 'cape_f')
# His mail (a fine checker of two of his colours) on these regions.
MAIL = ('sleeve_n', 'sleeve_f')


def head_first(rgb, K, fig, head):
    """His head cleaned as at first (the owner chose that head): a lone speck of his head (unlike all four
    neighbours, which are one colour among themselves) takes that colour unless it is his line, a glint,
    gold or red; of two red pixels of his head standing alone and touching (8-neighbours), the first, row by
    row, stays and the other takes the commonest colour round it that is not red or his line."""
    H, W = fig.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not head[y, x] or K[y, x] in ('line', 'white', 'gold', 'red'):
                continue
            nb = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            if not all(fig[q] for q in nb):
                continue
            c0 = rgb[nb[0]]
            if all((rgb[q] == c0).all() for q in nb) and not (rgb[y, x] == c0).all():
                rgb[y, x] = c0
                K[y, x] = kind(c0)
    kept = np.zeros_like(fig)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not head[y, x] or K[y, x] != 'red' or any(K[q] == 'red' for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))):
                continue
            if kept[y - 1:y + 2, x - 1:x + 2].any():
                nb = [tuple(rgb[y + dy, x + dx]) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and K[y + dy, x + dx] not in ('red', 'line', '')]
                if nb:
                    c = max(sorted(set(nb)), key=nb.count)
                    rgb[y, x] = c
                    K[y, x] = kind(c)
                    continue
            kept[y, x] = True


def mail_colours(a):
    """His mail's two colours: the commonest two of his blue-black and blue-grey (kind 'hair') pixels on
    his sleeves, the darker first."""
    R = regions(a)
    m = (R['sleeve_n'] | R['sleeve_f']) & (kinds(a) == 'hair')
    cols, counts = np.unique(a[m].reshape(-1, 3), axis=0, return_counts=True)
    top = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))[:2]
    return sorted((cols[i] for i in top), key=lambda c: luma(c))


def clean(rgb, label, line, mail, a):
    """The reduction cleaned with his palette only (the owner's "Reducir y limpiar yo"):
      - his 1 px line all round the figure: a pixel of the figure beside the white round it is his line;
      - his mail a 1 px checker of his two mail colours (mail_colours()) wherever the shrink left his mail;
      - on his cloth (CLOTH), a speck (a colour none of its eight neighbours has) takes the colour most of
        its neighbours have, so his folds read as his folds, not speckle (his line stays);
      - a light speck off his face (a pixel much lighter than everything round it that is not his gold):
        what the shrink kept of a highlight he drew bigger takes the colour round it;
      - a pixel or two of the figure standing alone off it (a strand's tip the shrink cut off) goes;
      - a hole of up to HOLE pixels the figure walls in where his picture has none (no white of his under
        it: the shrink parted two pieces or a piece) takes the commonest of his pixels round it; a gap he
        left between an arm and the body stays open.
    Returns (rgb, label)."""
    rgb = rgb.copy()
    label = label.copy()
    H, W = label.shape
    head = label == 'head'
    # (and a strand's tip of his head standing apart from his head: at rest it touches the collar, moved it floats)
    loose = [c for c in components(label != '', True) if len(c) < 3]
    loose += [c for c in components(head, True) if len(c) < 4]
    for c in loose:
        if True:
            for y, x in c:
                label[y, x] = ''
                rgb[y, x] = 255
    his_white = (luma(a) > 225)
    for c in components(label == '', False):
        if len(c) > HOLE or any(y in (0, H - 1) or x in (0, W - 1) for y, x in c):
            continue
        if any(head[y + dy, x + dx] for y, x in c for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            continue
        under = False
        for y, x in c:
            ny, nx = (y - PAD) * BODY_SCALE, (x - PAD) * BODY_SCALE
            under |= his_white[int(np.floor(ny)):int(np.ceil(ny + BODY_SCALE)), int(np.floor(nx)):int(np.ceil(nx + BODY_SCALE))].any()
        if under:
            continue
        for y, x in c:
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + dy, x + dx]]
            cols = [tuple(rgb[q]) for q in nb]
            rgb[y, x] = max(sorted(set(cols)), key=cols.count)
            labs = [label[q] for q in nb]
            label[y, x] = max(sorted(set(labs)), key=labs.count)
    fig = label != ''
    out = np.zeros_like(fig)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or out[y, x] or fig[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    K = np.array([[kind(rgb[y, x]) if fig[y, x] else '' for x in range(W)] for y in range(H)])
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if fig[y, x] and (out[y - 1, x] or out[y + 1, x] or out[y, x - 1] or out[y, x + 1]):
                rgb[y, x] = line
                K[y, x] = 'line'
    # his head as the owner chose it (2026-10-24, "la cabeza esta mejor la de antes"): the first cleaning
    head_first(rgb, K, fig, head)
    # his mail checker
    for y in range(H):
        for x in range(W):
            if label[y, x] in MAIL and K[y, x] == 'hair':
                rgb[y, x] = mail[(x + y) % 2]
    near = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not fig[y, x] or K[y, x] == 'line' or head[y, x]:
                continue
            nb = [(y + dy, x + dx) for dy, dx in near if fig[y + dy, x + dx]]
            cols = [tuple(rgb[q]) for q in nb if K[q] != 'line']
            if not cols:
                continue
            mode = np.array(max(sorted(set(cols)), key=cols.count))
            if label[y, x] in CLOTH and tuple(rgb[y, x]) not in cols:
                rgb[y, x] = mode
                K[y, x] = kind(mode)
            elif label[y, x] != 'head' and K[y, x] != 'gold' and luma(rgb[y, x]) > 150 and all(luma(rgb[q]) < luma(rgb[y, x]) - 50 for q in nb):
                rgb[y, x] = mode
                K[y, x] = kind(mode)
    return rgb, label


_GAME = {}


def game():
    """His figure at our scale, cleaned: (rgb, region label), the picture every part is cut from."""
    if 'g' not in _GAME:
        a = palette(native())
        rgb, label = reduce(a)
        _GAME['line'] = his_line(a)
        _GAME['g'] = clean(rgb, label, _GAME['line'], mail_colours(a), a)
    rgb, label = _GAME['g']
    return rgb.copy(), label.copy()


def line_rgb():
    """His black line's colour."""
    game()
    return _GAME['line'].copy()



def frame_mask(label, names):
    return np.isin(label, names)


def cut(rgb, label, names, line_from_others=True):
    """The piece made of these regions of game(): their pixels, and his line of the regions round them where
    it bounds their colours (an 8-neighbour of a pixel of theirs that is not line), so it keeps its line
    when it moves apart from them. (mask, colours)"""
    own = np.isin(label, names)
    if line_from_others:
        ln = np.array([[kind(rgb[y, x]) == 'line' for x in range(rgb.shape[1])] for y in range(rgb.shape[0])]) & (label != '')
        solid = own & ~ln
        own = own | (ln & near8(solid))
    return own, rgb.copy()


def continue_rows(col, mask, rows, x_to, direction, line, period=1, close=True, inset=0, allowed=None, from_x=None):
    """A piece continued along its rows where something in front hides it: on each row of `rows`, from the
    piece's last pixel toward `direction` (-1 left, 1 right) on to column `x_to`, his pixels of that row
    repeated (the `period` pixels inside its line there, `inset` more pixels in), closed on his line at the
    end. Only cells the piece does not have are filled; his own pixels are untouched. Returns (mask,
    colours, filled). With `allowed`, only those cells are filled (what hides the piece at rest), so at rest
    the piece adds nothing to the figure."""
    m = mask.copy()
    c = col.copy()
    filled = np.zeros_like(m)
    for y in rows:
        xs = np.nonzero(mask[y])[0]
        if not len(xs):
            continue
        edge = xs.min() if direction < 0 else xs.max()
        # his colours just inside the edge (past his line there)
        inner = edge
        while 0 <= inner < m.shape[1] and mask[y, inner] and kind(col[y, inner]) == 'line':
            inner -= direction
        inner -= direction * inset
        # (from_x: each row's colour at that column of his, the middle of a plate band, carried out)
        src = [from_x] if from_x is not None else [inner - direction * k for k in range(period)]
        if not all(0 <= q < m.shape[1] and mask[y, q] and kind(col[y, q]) != 'line' for q in src):
            # his line or a gap there: the first pixel of his further in that is not his line
            q = inner
            while 0 <= q < m.shape[1] and mask[y, q] and kind(col[y, q]) == 'line':
                q -= direction
            if not (0 <= q < m.shape[1] and mask[y, q]) or from_x is not None:
                continue
            src = [q]
        x = edge
        k = 0
        while (x - x_to) * direction < 0:
            x += direction
            if m[y, x] or (allowed is not None and not allowed[y, x]):
                continue
            c[y, x] = col[y, src[k % len(src)]]
            m[y, x] = True
            filled[y, x] = True
            k += 1
        last = [q for q in np.nonzero(filled[y])[0]]
        if close and last:
            q = min(last) if direction < 0 else max(last)
            c[y, q] = line
    return m, c, filled


def hull(points, H, W):
    """The cells inside the convex hull of these (y, x) points (their middles), as a mask."""
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
    for y in range(H):
        for x in range(W):
            p = (x + 0.5, y + 0.5)
            m[y, x] = all(cross(hl[k], hl[(k + 1) % len(hl)], p) >= -1e-9 for k in range(len(hl)))
    return m


def fill_hull(col, mask, extra, allowed, line):
    """A limb piece filled out to its whole shape where pieces in front hide it at rest: the convex hull of
    its pixels and `extra` (cells it reaches under: a knee guard, up to the hip), and in it every cell
    `allowed` (hidden at rest) the piece does not have takes its nearest pixel of his that is not his line;
    a filled cell on the hull's edge is his line."""
    H, W = mask.shape
    pts = list(zip(*np.nonzero(mask | extra)))
    hm = hull(pts, H, W)
    add = hm & allowed & ~mask
    src = [(y, x) for y, x in zip(*np.nonzero(mask)) if kind(col[y, x]) != 'line']
    c = col.copy()
    for y, x in zip(*np.nonzero(add)):
        q = min(src, key=lambda p: ((p[0] - y) ** 2 + (p[1] - x) ** 2, p))
        c[y, x] = col[q]
    m = mask | add
    edge = add & ~(np.roll(hm, 1, 0) & np.roll(hm, -1, 0) & np.roll(hm, 1, 1) & np.roll(hm, -1, 1))
    c[edge] = line
    return m, c


def fill_spans(col, mask, line, allowed=None):
    """What a piece has left open inside it along each row (where a piece in front of it took his pixels: a
    knee guard over the hakama): his nearest colour on the row that is not his line, the one to the left
    first."""
    m = mask.copy()
    c = col.copy()
    for y in range(m.shape[0]):
        xs = np.nonzero(mask[y])[0]
        if len(xs) < 2:
            continue
        for x in range(xs.min(), xs.max() + 1):
            if mask[y, x] or (allowed is not None and not allowed[y, x]):
                continue
            got = None
            for d in range(1, m.shape[1]):
                for q in (x - d, x + d):
                    if 0 <= q < m.shape[1] and mask[y, q] and kind(col[y, q]) != 'line':
                        got = col[y, q]
                        break
                if got is not None:
                    break
            if got is not None:
                c[y, x] = got
                m[y, x] = True
    return m, c


def continue_cols(col, mask, cols, y_to, direction, line, period=1, close=True, inset=0, allowed=None):
    """continue_rows down (direction 1) or up (-1) the columns."""
    m, c, f = continue_rows(col.transpose(1, 0, 2), mask.T, cols, y_to, direction, line, period, close, inset, None if allowed is None else allowed.T)
    return m.T, c.transpose(1, 0, 2), f.T


def module(doc, consts, bases, prefix, header_import="import type { PaintedPiece } from '../painted';"):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what each
    of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours, doc, pivot
    in our frame, angle)) and where each lands in our idle frame 0, unturned (`<PREFIX>_REST`: the fine
    pixel of its first row's first cell). Mask and colours are game()'s, whose (0, 0) is OFFSET."""
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
            rgb = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
            found[h] = kind(rgb)
        # the pivot in game() pixels
        pv = (pivot[0] - OFFSET[0], pivot[1] - OFFSET[1])
        body.append(ts_piece(const, pdoc, rows, origin, palette, pv, ang))
        rest.append((const, (origin[0] + OFFSET[0], origin[1] + OFFSET[1])))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */")
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


def pack(col, mask):
    """aiden_ref.pack with roman_ref's longer alphabet."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (game() pixels) that lands on
    the joint, `ang` the limb's angle at rest."""
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


def middle(col, mask, kinds_, q=0.5):
    """His colour of middle lightness among the pixels of these kinds in a piece: the base a colour slot
    recolours from."""
    found = sorted((float(luma(col[y, x])), hexc(col[y, x])) for y, x in zip(*np.nonzero(mask)) if kind(col[y, x]) in kinds_)
    return found[int(len(found) * q)][1]


def angle(a, b):
    """The angle (degrees) from joint a to joint b, his."""
    (ax, ay), (bx, by) = his_joint(a), his_joint(b)
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def side_by_side(game_rgb, mask, path, box, k=8, title=('Tu dibujo', 'En el juego')):
    """His picture beside a part lifted out of game() (box in our frame: x0, y0, x1, y1), at the same scale:
    his picture shrunk to our scale by drawing, the part as the game has it, with Spanish labels."""
    from PIL import ImageDraw
    a = native()
    x0, y0, x1, y1 = box
    W, H = (x1 - x0) * k, (y1 - y0) * k
    # his picture at the body's scale, lined up with our frame
    nx0 = (x0 - OFFSET[0] - PAD) * BODY_SCALE
    ny0 = (y0 - OFFSET[1] - PAD) * BODY_SCALE
    his = Image.fromarray(a.astype(np.uint8)).crop((int(round(nx0)), int(round(ny0)), int(round(nx0 + (x1 - x0) * BODY_SCALE)), int(round(ny0 + (y1 - y0) * BODY_SCALE)))).resize((W, H), Image.NEAREST)
    ours = np.full((y1 - y0, x1 - x0, 3), 255, np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            gy, gx = y - OFFSET[1], x - OFFSET[0]
            if 0 <= gy < mask.shape[0] and 0 <= gx < mask.shape[1] and mask[gy, gx]:
                ours[y - y0, x - x0] = game_rgb[gy, gx]
    ours = Image.fromarray(ours).resize((W, H), Image.NEAREST)
    im = Image.new('RGB', (2 * W + 30, H + 40), 'white')
    im.paste(his, (10, 30))
    im.paste(ours, (W + 20, 30))
    d = ImageDraw.Draw(im)
    d.text((10, 8), title[0], fill=(0, 0, 0))
    d.text((W + 20, 8), title[1], fill=(0, 0, 0))
    tmp = path + '.tmp.png'
    im.save(tmp)
    os.replace(tmp, path)


# The face (game() pixels: x0, y0, x1, y1): his skin, his eyes' glints and the line round and in them
# here are the face; the rest of his head is his hair.
FACE_BOX = (45, 21, 61, 34)


# His face on our male head raised HEAD_UP fine pixels (the game raises the head that far in his face,
# samuraiRig.ts): our face template's anchor (body.ts faceAnchor: the near eye's lash row) then lands on
# FACE_ANCHOR of our frame, his near eye's lash starting EYE_COLS[0] columns right of it and his far eye's
# EYE_COLS[1].
HEAD_UP = 2
FACE_ANCHOR = (123, 137)
EYE_COLS = (3, 9)
# His eyes (our frame): the lash rows and his glints' row, the near eye 5 cells wide, the far 3, and his
# pupil in each (the lash pixel over his glint's side, which the eye colour moves).
EYE_W = (5, 3)
PUPIL = {'near': (128, 137), 'far': (133, 137)}


def his_game(name):
    """His joint in game() pixels."""
    x, y = his_joint(name)
    return (x - OFFSET[0], y - OFFSET[1])


# How many rows of the cape's top are carried on behind the tassets, and how far below his chest the do
# is carried on under the sash.
CAPE_BAND = 3
DO_BELOW = 6
# His chin's row below the face anchor: his head's line below it that bounds none of his head is the collar's.
CHIN_ROWS = 7


def pieces(rgb=None, label=None):
    """game() cut into the pieces the items stamp: {name: (mask, colours)} in game() pixels. Each piece is
    its regions' pixels with his line round them (cut()); where something in front hides it at rest and a
    pose shows it, it is continued from his pixels (continue_rows, continue_cols), closed on his line:
      sleeve_n, sleeve_f  his mail up under the shoulder guard to the shoulder
      do                  the chest under the near arm, out to the near shoulder, and down under the sash
      thigh_n, thigh_f    the hakama's legs, under the knee guards and up under the tassets to the hips
      cape                behind the tassets, on to the middle of the back
    The head is cut into the face (FACE_BOX: skin, glints and the line in and round them) and the hair
    (the rest of his head: hair, cords and line)."""
    if rgb is None:
        rgb, label = game()
    line = line_rgb()
    K = np.array([[kind(rgb[y, x]) if label[y, x] else '' for x in range(rgb.shape[1])] for y in range(rgb.shape[0])])
    out = {}
    under = lambda *names: np.isin(label, names)
    for n in ('hand_n', 'kote_n', 'sode_n', 'obi', 'hand_f', 'kote_f', 'sode_f', 'kusazuri', 'knee_n', 'knee_f', 'shin_n', 'foot_n', 'shin_f', 'foot_f'):
        out[n] = cut(rgb, label, [n])
    # mail under the shoulder guards, up to the shoulders
    for s in ('n', 'f'):
        m, c = cut(rgb, label, ['sleeve_' + s])
        sx, sy = his_game('shoulder' + s.upper())
        ys, xs = np.nonzero(m)
        cols = range(xs.min() + 1, xs.max())
        m, c, _ = continue_cols(c, m, cols, int(np.floor(sy)) - 2, -1, line, period=2, inset=1, allowed=under('sode_' + s, 'head'))
        out['sleeve_' + s] = (m, c)
    # the chest under the near arm, out to the near shoulder
    m, c = cut(rgb, label, ['do'])
    sx, sy = his_game('shoulderN')
    ys, xs = np.nonzero(m)
    m, c, _ = continue_rows(c, m, range(ys.min() + 1, ys.max()), int(np.floor(sx)), -1, line, allowed=under('sode_n', 'sleeve_n', 'kote_n', 'hand_n', 'head'), from_x=int(np.floor(his_game('neck')[0])) - 4)
    # and down under the sash to the tassets (a torso lengthened in a pose never parts from the sash)
    ys, xs = np.nonzero(m)
    m, c, _ = continue_cols(c, m, range(xs.min() + 1, xs.max()), ys.max() + DO_BELOW, 1, line, inset=1, allowed=under('obi', 'kusazuri', 'hand_n', 'kote_n', 'hand_f', 'kote_f'))
    out['do'] = (m, c)
    # the hakama's legs: each leg his cloth, under its knee guard his cloth beside it along the row, and up
    # under the tassets to the hip each column of his carried up (his folds run on up the thigh)
    for s in ('n', 'f'):
        m, c = cut(rgb, label, ['hakama_' + s])
        hx, hy = his_game('hip' + s.upper())
        # the leg's whole shape: his cloth, his knee guard over it, and up to the hip as wide as his leg
        reach = under('knee_' + s)
        ys, xs = np.nonzero(m)
        top = int(np.floor(hy)) - 1
        for x in (xs.min(), xs.max()):
            reach[top, x] = True
        front = under('knee_n', 'knee_f', 'kusazuri', 'obi', 'hand_n', 'hand_f', 'shin_n', 'shin_f')
        m, c = fill_hull(c, m, reach, front, line)
        out['thigh_' + s] = (m, c)
    # the cape: his cloth as he drew it, and its top CAPE_BAND rows behind his tassets carried on to the
    # near hip along each row (it hangs from behind the waist: moved, it never comes away from the body); behind the legs
    # it is the legs' to show
    m, c = cut(rgb, label, ['cape'])
    ys, xs = np.nonzero(m)
    hidden = under('kusazuri', 'obi', 'hand_n', 'kote_n')
    m, c, _ = continue_rows(c, m, range(ys.min(), ys.min() + CAPE_BAND), int(np.floor(his_game('hipN')[0])), 1, line, close=False, allowed=hidden)
    out['cape'] = (m, c)
    out['cape_f'] = cut(rgb, label, ['cape_f'])
    # the head: face and hair
    head = label == 'head'
    x0, y0, x1, y1 = FACE_BOX
    box = np.zeros_like(head)
    box[y0:y1, x0:x1] = True
    face = head & box & ~np.isin(K, ('hair', 'line'))
    face |= head & box & (K == 'line') & near4(face)
    out['face'] = (face, rgb.copy())
    hair = head & ~(face & (K != 'line'))
    # his line at the head's foot that bounds nothing of his head (it lies along the collar between the hair
    # and the far shoulder): drawn only while the head stands on the neck as at rest (samurai.ts), so it
    # never floats beside the chin
    solid = head & (K != 'line')
    below_chin = np.zeros_like(head)
    below_chin[FACE_ANCHOR[1] - OFFSET[1] + CHIN_ROWS:, :] = True
    collar = hair & (K == 'line') & ~near8(solid) & below_chin
    out['hair'] = (hair & ~collar, rgb.copy())
    out['collar'] = (collar, rgb.copy())
    return out


def header(script, what):
    """The first lines of a generated module."""
    return (f'// {what}, his pixels at our scale (tools/refs/{script} from\n'
            '// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).\n'
            '// Generated: rerun the script to change it.')


def rest_angle(body, a, b):
    """Our rig's angle (degrees) from joint a to joint b at idle frame 0 (OUR_JOINTS)."""
    (ax, ay), (bx, by) = OUR_JOINTS[body][a], OUR_JOINTS[body][b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def run(argv, build):
    """A part script's main: `build()` gives the module's text, written to argv[1]."""
    if len(argv) < 2:
        sys.exit(f'usage: python3 -I {argv[0]} <out.ts>')
    write(argv[1], build())


def plain(a=None):
    """His figure shrunk evenly at the same two scales with nothing chosen: each fine pixel his pixel under
    its middle (for the owner's "sin limpiar / limpio" comparison). (rgb, mask) in game()'s frame."""
    if a is None:
        a = palette(native())
    R = regions(a)
    H, W, _ = a.shape
    size = (int(np.ceil(H / BODY_SCALE)) + 2 * PAD, int(np.ceil(W / BODY_SCALE)) + 2 * PAD)
    rgb = np.full(size + (3,), 255, np.int32)
    mask = np.zeros(size, bool)
    body = np.zeros((H, W), bool)
    for n, m in R.items():
        if n != 'head':
            body |= m

    def put(m, scale, origin, at):
        for y in range(size[0]):
            for x in range(size[1]):
                sy = int(np.floor(origin[1] + (y - PAD - at[1] + 0.5) * scale))
                sx = int(np.floor(origin[0] + (x - PAD - at[0] + 0.5) * scale))
                if 0 <= sy < H and 0 <= sx < W and m[sy, sx]:
                    rgb[y, x] = a[sy, sx]
                    mask[y, x] = True

    put(body, BODY_SCALE, (0.0, 0.0), (0, 0))
    hx, hy = HEAD_ANCHOR
    put(R['head'], HEAD_SCALE, HEAD_ANCHOR, (int(round(hx / BODY_SCALE)), int(round(hy / BODY_SCALE))))
    return rgb, mask
