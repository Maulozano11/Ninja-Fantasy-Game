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
    'wristN': (42.0, 89.5),
    'handN': (45.0, 97.0),
    'shoulderF': (88.0, 47.0),
    'elbowF': (92.0, 72.0),
    'wristF': (97.0, 88.0),
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
    """His lacing dots: a red pixel with no red beside it (4-neighbours) on a plate."""
    red = K == 'red'
    H, W = red.shape
    out = np.zeros_like(red)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if red[y, x] and not (red[y - 1, x] or red[y + 1, x] or red[y, x - 1] or red[y, x + 1]):
                out[y, x] = True
    return out


# How much of a fine pixel's footprint (of his pixels' area) his line, gold or a glint must cover for the
# fine pixel to show it (reading()).
LINE_COVER = 0.45
GOLD_COVER = 0.25
GLINT_COVER = 0.15


def reading(a, K, D, line, m, scale, origin, j, i):
    """What fine pixel (i, j) of a region `m` shrunk by `scale` about his point `origin` shows: one of his
    colours under its footprint (None where less than half of it is his figure). His line where it covers
    LINE_COVER of the footprint; else a glint of his eyes; else a lacing dot of his whose middle is in it;
    else his gold where it covers GOLD_COVER; else, of the colours under it, the one nearest their mean."""
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
    if cover('line') >= LINE_COVER:
        return line, cells
    if cover('white') >= GLINT_COVER:
        w, y, x = max((c for c in cells if K[c[1], c[2]] == 'white'), key=lambda c: (c[0], -c[1], -c[2]))
        return a[y, x], cells
    dot = [(y, x) for w, y, x in cells if D[y, x] and y0 <= y + 0.5 < y1 and x0 <= x + 0.5 < x1]
    if dot:
        return a[dot[0]], cells
    pick = [c for c in cells if K[c[1], c[2]] != 'line']
    if cover('gold') >= GOLD_COVER:
        pick = [c for c in pick if K[c[1], c[2]] == 'gold']
    mean = sum(w * a[y, x] for w, y, x in pick) / sum(w for w, y, x in pick)
    best = min(pick, key=lambda c: (int(np.abs(a[c[1], c[2]] - mean).sum()), c[1], c[2]))
    return a[best[1], best[2]], cells


# The regions of his picture each part is cut from (polygons in his pixel corners), front to back: a pixel
# of his figure goes to the first region that holds it. GROUPS are shrunk together (one choice of his rows
# and columns for each), so the bands, seams and dots of one part line up with each other.
REGIONS = {
    'hand_n': [(35, 89), (51, 89), (51, 95), (52, 95), (52, 105), (42, 105), (42, 100), (35, 100)],
    'kote_n': [(30, 71), (50, 71), (50, 89), (30, 89)],
    'sode_n': [(30, 33), (60, 33), (61, 38), (57, 47), (51, 50), (51, 64), (30, 64)],
    'sleeve_n': [(30, 64), (51, 64), (51, 50), (57, 47), (61, 38), (62, 38), (62, 66), (55, 66), (55, 71), (30, 71)],
    'obi': [(49, 76), (87, 76), (87, 88), (78, 88), (78, 98), (70, 98), (70, 88), (49, 88)],
    'hand_f': [(93, 88), (106, 88), (106, 102), (93, 102)],
    'kote_f': [(87, 73), (104, 73), (104, 88), (87, 88)],
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
    'cape': [(3, 86), (44, 86), (44, 121), (40, 121), (38, 142), (31, 157), (3, 157)],
    'hakama': [(30, 98), (98, 98), (98, 143), (30, 143)],
}
GROUPS = {
    'arm_n': ('hand_n', 'kote_n', 'sleeve_n'),
    'sode_n': ('sode_n',),
    'arm_f': ('hand_f', 'kote_f', 'sleeve_f', 'sode_f'),
    'do': ('do',),
    'obi': ('obi',),
    'kusazuri': ('kusazuri',),
    'hakama': ('hakama', 'knee_n', 'knee_f'),
    'leg_n': ('shin_n', 'foot_n'),
    'leg_f': ('shin_f', 'foot_f'),
    'cape': ('cape', 'cape_f'),
}


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
    picture's corner. Each fine pixel is one of his pixels (reading()), and its region the one most of its
    footprint is in."""
    R = regions(a)
    K = kinds(a)
    D = dots(a, K)
    line = his_line(a)
    H, W, _ = a.shape
    size = (int(np.ceil(H / BODY_SCALE)) + 2 * PAD, int(np.ceil(W / BODY_SCALE)) + 2 * PAD)
    rgb = np.full(size + (3,), 255, np.int32)
    label = np.full(size, '', dtype='<U10')

    def put(names, scale, origin, at):
        m = np.zeros(R['head'].shape, bool)
        for n in names:
            m |= R[n]
        ys, xs = np.nonzero(m)
        for j in range(int(np.floor((ys.min() - origin[1]) / scale)), int(np.ceil((ys.max() + 1 - origin[1]) / scale))):
            for i in range(int(np.floor((xs.min() - origin[0]) / scale)), int(np.ceil((xs.max() + 1 - origin[0]) / scale))):
                got = reading(a, K, D, line, m, scale, origin, j, i)
                if got is None:
                    continue
                c, cells = got
                y, x = at[1] + j + PAD, at[0] + i + PAD
                rgb[y, x] = c
                share = {n: sum(w for w, cy, cx in cells if R[n][cy, cx]) for n in names}
                label[y, x] = max(names, key=lambda n: share[n])

    # back to front: each group over what is behind it
    for g in ('cape', 'arm_f', 'leg_f', 'leg_n', 'hakama', 'kusazuri', 'do', 'obi', 'sode_n', 'arm_n'):
        put(GROUPS[g], BODY_SCALE, (0.0, 0.0), (0, 0))
    # the head about his chin, which lands where the body's shrink puts that point
    hx, hy = HEAD_ANCHOR
    put(('head',), HEAD_SCALE, HEAD_ANCHOR, (int(round(hx / BODY_SCALE)), int(round(hy / BODY_SCALE))))
    return rgb, label


PAD = 12


def his_line(a):
    """His black line: the commonest of his line colours."""
    ln = is_line(a)
    cols, counts = np.unique(a[ln].reshape(-1, 3), axis=0, return_counts=True)
    i = max(range(len(cols)), key=lambda i: (counts[i], -int(cols[i].sum())))
    return cols[i]


def clean(rgb, label, line):
    """The reduction cleaned with his palette only (the owner's "Reducir y limpiar yo"):
      - his 1 px line all round the figure: a pixel of the figure beside the white round it is his line;
      - a lone speck (a pixel unlike all four neighbours, which are one colour of his among themselves)
        takes that colour, unless it is his line, a glint, gold or a lacing dot (a red pixel on a plate):
        what the shrink left of a fold or a mottle he drew bigger;
      - his line never stands in a row of two where one of its pixels has no line pixel beside it along
        the run: a pixel of line touching the figure's inside on both sides across is kept.
    Returns (rgb, label)."""
    rgb = rgb.copy()
    label = label.copy()
    fig = label != ''
    H, W = fig.shape
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
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not fig[y, x] or K[y, x] in ('line', 'white', 'gold', 'red'):
                continue
            nb = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            if not all(fig[q] for q in nb):
                continue
            c0 = rgb[nb[0]]
            if all((rgb[q] == c0).all() for q in nb) and not (rgb[y, x] == c0).all():
                rgb[y, x] = c0
                K[y, x] = kind(c0)
    # His lacing dots stand 3 to 5 of his pixels apart: shrunk, one beside another (8-neighbours) is a
    # smear of red. Of two touching dots the first (row by row) stays; the other takes the commonest colour
    # of its neighbours that is not red or his line (the plate it sits on).
    kept = np.zeros_like(fig)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if K[y, x] != 'red' or any(K[q] == 'red' for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))):
                continue
            if kept[y - 1:y + 2, x - 1:x + 2].any():
                nb = [tuple(rgb[y + dy, x + dx]) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and K[y + dy, x + dx] not in ('red', 'line', '')]
                if nb:
                    c = max(sorted(set(nb)), key=nb.count)
                    rgb[y, x] = c
                    K[y, x] = kind(c)
                    continue
            kept[y, x] = True
    return rgb, label


_GAME = {}


def game():
    """His figure at our scale, cleaned: (rgb, region label), the picture every part is cut from."""
    if 'g' not in _GAME:
        a = palette(native())
        rgb, label = reduce(a)
        _GAME['line'] = his_line(a)
        _GAME['g'] = clean(rgb, label, _GAME['line'])
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


def continue_rows(col, mask, rows, x_to, direction, line, period=1, close=True, inset=0, allowed=None):
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
        src = [inner - direction * k for k in range(period)]
        if not all(0 <= q < m.shape[1] and mask[y, q] and kind(col[y, q]) != 'line' for q in src):
            continue
        x = edge
        k = 0
        while (x - x_to) * direction < 0:
            x += direction
            if m[y, x] or (allowed is not None and not allowed[y, x]):
                continue
            c[y, x] = col[y, src[k % period]]
            m[y, x] = True
            filled[y, x] = True
            k += 1
        last = [q for q in np.nonzero(filled[y])[0]]
        if close and last:
            q = min(last) if direction < 0 else max(last)
            c[y, q] = line
    return m, c, filled


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


# Which side of the crotch his hakama's legs part: game() columns left of it are the near leg's.
CROTCH_X = 49
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


def pieces(rgb=None, label=None):
    """game() cut into the pieces the items stamp: {name: (mask, colours)} in game() pixels. Each piece is
    its regions' pixels with his line round them (cut()); where something in front hides it at rest and a
    pose shows it, it is continued from his pixels (continue_rows, continue_cols), closed on his line:
      sleeve_n, sleeve_f  his mail up under the shoulder guard to the shoulder
      do                  the chest under the near arm, out to the near shoulder
      thigh_n, thigh_f    the hakama's legs (parted at CROTCH_X) up under the tassets to the hips
      cape                the cape behind the near leg, across to the far leg
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
    m, c, _ = continue_rows(c, m, range(ys.min() + 1, ys.max()), int(np.floor(sx)), -1, line, inset=3, allowed=under('sode_n', 'sleeve_n', 'kote_n', 'hand_n', 'head'))
    out['do'] = (m, c)
    # the hakama's legs, up under the tassets to the hips
    hk, hc = cut(rgb, label, ['hakama'])
    xx = np.arange(rgb.shape[1])[None, :]
    for s, side in (('n', xx < CROTCH_X), ('f', xx >= CROTCH_X)):
        m = hk & side
        hy = his_game('hip' + s.upper())[1]
        ys, xs = np.nonzero(m)
        front = under('knee_n', 'knee_f', 'kusazuri', 'obi', 'hand_n', 'hand_f', 'shin_n', 'shin_f')
        m, c = fill_spans(hc, m, line, front)
        ys, xs = np.nonzero(m)
        m, c, _ = continue_cols(c, m, range(xs.min() + 1, xs.max()), int(np.floor(hy)) - 1, -1, line, inset=1, allowed=front)
        out['thigh_' + s] = (m, c)
    # the cape behind the near leg, across to the far leg
    m, c = cut(rgb, label, ['cape', 'cape_f'])
    left = m & (xx < 40)
    far_x = int(np.floor(his_game('hipF')[0]))
    ys, xs = np.nonzero(left)
    m2, c2, _ = continue_rows(c, left, range(ys.min() + 2, ys.max() - 1), far_x, 1, line, close=False, allowed=label != '')
    out['cape'] = (m2 | m, np.where((m & ~left)[..., None], c, c2))
    # the head: face and hair
    head = label == 'head'
    x0, y0, x1, y1 = FACE_BOX
    box = np.zeros_like(head)
    box[y0:y1, x0:x1] = True
    face = head & box & ~np.isin(K, ('hair', 'line'))
    face |= head & box & (K == 'line') & near4(face)
    out['face'] = (face, rgb.copy())
    hair = head & ~(face & (K != 'line'))
    out['hair'] = (hair, rgb.copy())
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
