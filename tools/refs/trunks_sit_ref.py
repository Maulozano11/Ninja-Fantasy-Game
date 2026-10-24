"""The owner's frame of Trunks sitting (docs/reference/trunks-sit-owner-reference.jpg), for
trunks-sit-from-ref.py.

His picture (2000 x 2000, 2026-10-22) is our Trunks (the Trunks 2 look) in our sit pose painted over by
him, without the book: he sits on a low grey rock, the near hand resting on the thigh in his black
fingerless glove, the far arm reaching forward with the open palm up, talking. His words: "ahora esta
sin el libro copia exactamente igual y usa sus dos manos como referencia y standard para futuros
disenos de personajes".

His grid: exactly 20 picture pixels a cell (owner_paintover.native). He drew Trunks larger than our
sprite: SCALE (1.17) of his cells to one fine pixel of ours, found by his head (the hair and face, which
he kept from our sit frame: 82% of his head's pixels land on ours brought down at 1.17 and 1.18, fewer at
any other scale) and his height (his soles on our ground). So, as with his Lyra throw
(lyra_throw_ref.py), the frame is brought down to our scale by keeping that many of his rows and columns
(owner_paintover.keep: those left out are the ones most like a neighbour, so his 1 px line and his folds
stay): every pixel is one of his, in his colour. Brought down, his pixel (x, y) is our fine pixel
(x + OFFSET[0], y + OFFSET[1]), where he painted over our sit frame.

His box is the whole picture: his figure keeps two cells clear of every edge of it (picture rows 42 to
1959, columns 120 to 1740), so nothing of him is near a box's edge.

Every pixel belongs to one owner, as in his read frames (trunks_read_ref.py): ZONES, in the brought-down
frame's columns and rows.
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402
import trunks_read_ref as R  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'trunks-sit-owner-reference.jpg')
PITCH = 20.0
BOXES = [(0, 0, 2000, 2000)]
SCALE = 1.17
OFFSET = (77, 131)
PAGE = R.PAGE
PAGE_TOL = R.PAGE_TOL
TOL = R.TOL
LINE = R.LINE
FRAME_EDGE = R.FRAME_EDGE
NAMES = ['Sentado (sin libro)']

_CACHE = {}


def native():
    """His cells at his own scale: (colours, figure mask, line mask)."""
    if 'native' in _CACHE:
        return _CACHE['native']
    a = P.native(REF, BOXES[0], PITCH)
    fg = np.abs(a - np.array(PAGE)).max(2) > PAGE_TOL
    fg[:FRAME_EDGE] = fg[-FRAME_EDGE:] = False
    fg[:, :FRAME_EDGE] = fg[:, -FRAME_EDGE:] = False
    m = P.merge(a, fg, TOL)
    line = fg & (m.max(2) < LINE)
    _CACHE['native'] = (m, fg, line)
    return _CACHE['native']


def frame(k=0):
    """His frame brought down to our scale: (colours (rows, cols, 3), figure mask, line mask); his own
    whites inside the figure (the white of his eyes) are his pixels."""
    if k in _CACHE:
        return _CACHE[k]
    m, fg, line = native()
    H, W = fg.shape
    rows = P.keep(int(H / SCALE), H, SCALE, P.drop_costs(m, line, fg, 0))
    cols = P.keep(int(W / SCALE), W, SCALE, P.drop_costs(m, line, fg, 1))
    sm = m[np.ix_(rows, cols)].copy()
    sfg = fg[np.ix_(rows, cols)].copy()
    close_line(m, fg, line, rows, cols, sm, sfg)
    # A single cell of white walled in by his line and his cloth is a pinhole the bringing down left where
    # two of his line's steps came together (his cape's shoulder), not a white of his (those are his eyes'
    # whites, beside his skin): it takes the cloth beside it, or his line where only his line walls it in.
    hole = R.enclosed(sfg)
    isline = sfg & (sm.max(2) < LINE)
    H2, W2 = sfg.shape
    for y, x in zip(*np.nonzero(hole)):
        nb = [q for q in ((y, x + 1), (y + 1, x), (y, x - 1), (y - 1, x)) if 0 <= q[0] < H2 and 0 <= q[1] < W2]
        if any(hole[q] for q in nb) or any(R.skin(sm[q][None, None])[0, 0] or R.eye(sm[q][None, None])[0, 0] for q in nb):
            continue
        cloth = [q for q in nb if sfg[q] and not isline[q]]
        sm[y, x] = sm[cloth[0]] if cloth else sm[nb[0]]
        sfg[y, x] = True
    # A gap of his narrowed to one pixel between two runs of his line (the tip of the white wedge between
    # his far arm and his body: two cells wide at his scale, one at ours) would read as a crack of dead
    # pixels: his line closes it there (the wedge below stays open as he drew it).
    # (only there, ARMPIT: elsewhere his one-pixel gaps are his, between the fingers of his open hand, at
    # his boot's toe)
    waist = P.inside(WAIST['box'], H2, W2)
    armpit = P.inside(ARMPIT, H2, W2)
    for _ in range(3):
        isline = sfg & (sm.max(2) < LINE)
        L_ = lambda y, x: 0 <= y < H2 and 0 <= x < W2 and isline[y, x]
        crack = [(y, x) for y, x in zip(*np.nonzero(~sfg & armpit)) if (L_(y, x - 1) and L_(y, x + 1)) or (L_(y - 1, x) and L_(y + 1, x))]
        for y, x in crack:
            sm[y, x] = sm[y, x - 1] if L_(y, x - 1) else sm[y - 1, x]
            sfg[y, x] = True
        if not crack:
            break
    sfg |= R.enclosed(sfg) & ~waist
    sline = sfg & (sm.max(2) < LINE)
    _CACHE[k] = (sm, sfg, sline)
    return _CACHE[k]


def close_line(m, fg, line, rows, cols, sm, sfg):
    """His outline kept closed as his figure is brought down. Where his line steps along a slant, each of
    his rows has its line pixel in another column, so a column left out takes one row's line pixel with
    it and opens his outline there (his cape's shoulder showed his white through it). Such a pixel of his
    line is put back in the cell beside the one it stood next to, where that cell is his white, so the
    figure stays closed in his own line. The same for his rows left out. Changes sm and sfg in place."""
    H, W = sfg.shape
    kept_c = set(cols)
    kept_r = set(rows)
    adds = []
    for r, R0 in enumerate(rows):
        for j, C in enumerate(cols):
            if not sfg[r, j] or (sm[r, j].max() < LINE):
                continue
            # a dropped column next to his column C on either side, holding his line, toward white
            for d, jj in ((-1, j - 1), (1, j + 1)):
                if not (0 <= jj < W) or sfg[r, jj]:
                    continue
                c = C + d
                if c in kept_c or not (0 <= c < fg.shape[1]) or not line[R0, c]:
                    continue
                adds.append((r, jj, m[R0, c]))
    for i, C in enumerate(cols):
        for r, R0 in enumerate(rows):
            if not sfg[r, i] or (sm[r, i].max() < LINE):
                continue
            for d, rr in ((-1, r - 1), (1, r + 1)):
                if not (0 <= rr < H) or sfg[rr, i]:
                    continue
                q = R0 + d
                if q in kept_r or not (0 <= q < fg.shape[0]) or not line[q, C]:
                    continue
                adds.append((rr, i, m[q, C]))
    for r, j, col in adds:
        sm[r, j] = col
        sfg[r, j] = True


box = R.box

# The tip of the white wedge between his far arm and his body, in the brought-down frame's cells (frame()).
ARMPIT = box(45, 37, 50, 42)
brown, lilac, skin, eye, white, grey, green, either = R.brown, R.lilac, R.skin, R.eye, R.white, R.grey, R.green, R.either

# (owner, polygon, rule), in the brought-down frame's cells (trunks_read_ref.owners)
ZONES = [
    ('cape', box(0, 14, 58, 84), brown),
    ('hair', box(25, 0, 55, 23), lilac),
    ('held', [(13, 7), (18, 7), (26, 15), (26, 17), (24, 19), (21, 19), (13, 10)], either(lilac, grey)),
    ('face', box(30, 10, 50, 27), either(skin, eye, white)),
    ('top', box(14, 26, 62, 56), lilac),
    ('top', box(14, 30, 62, 50), skin),
    # (his far forearm's darkest shading is a brown)
    ('top', box(52, 33, 61, 45), either(skin, brown)),
    # his far hand, open, palm up, in his glove; his near hand on the thigh
    ('hands', box(60, 26, 78, 42), either(grey, skin, lilac)),
    ('hands', box(37, 44, 47, 60), either(grey, skin, brown)),
    ('waist', box(20, 45, 37, 55), brown),
    ('bottom', box(14, 48, 60, 80), green),
    ('feet', box(30, 68, 64, 86), brown),
    ('seat', box(0, 58, 50, 84), either(grey, lilac)),
    ('cape', box(0, 58, 22, 84), brown),
]

# The white at his waist, right of his gloved near hand, between his shirt's front line and his far
# thigh (as in his read frames, trunks_read_ref.WAIST): the box it lies in, the bottom of his shirt's front
# line and the corner of his far thigh's top line, which the body's front joins.
WAIST = {'box': box(44, 44, 49, 50), 'shirt': (45, 44), 'corner': (47, 49)}


def owners(k=0):
    """His frame's owner per pixel, and each owner's mask with his line round it."""
    m, fg, line = frame(k)
    H, W = fg.shape
    own = np.full((H, W), '', object)
    for owner, poly, rule in ZONES:
        z = P.inside(poly, H, W) & fg & ~line & rule(m)
        own[z] = owner
    own, masks = P.own_lines(R.rock_specks(own), fg, line)
    return own, R.rock_gaps(masks)


def fill_waist(k, m, fg, line, own):
    """The white at his waist filled with his trousers, the way his Roman skirt's cloth was continued
    behind the fist (never a square block, on the line's own slant): the body's front goes on from the
    bottom of his shirt's front line straight to the corner of his far thigh's top line, his black line
    along it, and the cells inside it (between it and his gloved hand) take the colour of his trousers'
    nearest pixel. Returns {(x, y): (hex, owner)}, the filled cells, the line ones included."""
    (sx, sy), (cx, cy) = WAIST['shirt'], WAIST['corner']
    assert line[sy, sx] and line[cy, cx], "his shirt's front line and his thigh's corner"
    lines, counts = np.unique(m[line].reshape(-1, 3), axis=0, return_counts=True)
    black = P.hexs(lines[np.argmax(counts)])
    ys, xs = np.nonzero((own == 'bottom') & ~line)
    trousers = list(zip(ys.tolist(), xs.tolist()))
    out = {}
    for y in range(sy + 1, cy + 1):
        ex = cx if y == cy else int(np.floor(sx + (y - sy) * (cx - sx) / (cy - sy) + 0.5))
        if y < cy and not fg[y, ex]:
            out[(ex, y)] = (black, 'bottom')
        x = ex - 1
        while x >= 0 and not fg[y, x]:
            q = min(trousers, key=lambda t: ((t[0] - y) ** 2 + (t[1] - x) ** 2, t))
            out[(x, y)] = (P.hexs(m[q]), 'bottom')
            x -= 1
    return out
