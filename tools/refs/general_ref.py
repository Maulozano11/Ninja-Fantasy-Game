"""Shared helpers for the owner's Roman general (docs/reference/roman-general-owner-reference.jpg): what the
tools/refs/general-*-from-ref.py scripts lift from it.

His picture (2026-10-24) shows the same Roman general twice, in his big pixel-art style (2000/256 picture
pixels a cell, as his bronze warrior): on the left in a bronze cuirass with gold spirals all over and a lion
face, gold-rimmed pauldrons, short navy sleeves, a magenta scarf and a belt with its buckle; on the right in
a gold muscle cuirass (sculpted abs and pecs, a lion face at the chest, spirals at the shoulders), studded
pauldrons with leather strips, the same sleeves and scarf, and a belt. The owner: "pasa solo conjunto de
pecho y cara y pelo": only the chest sets (one armor option each), the face and the hair (both figures share
them: they are lifted from the left one). Not his cape, skirt, bracers, greaves or sandals.

His decision for his big pictures (bronze_ref.py, 2026-10-24 "Reducir y limpiar yo") holds: the body shrunk
evenly onto our male rig (BODY_SCALE, the least-squares fit of his joints on ours), then cleaned with his
palette only, his line 1 px, his gold lines continuous (bronze_ref.clean). This module sets bronze_ref's method up for this picture: its grid, its
colours (his magenta), its pieces (each figure cut on its own, with the bronze warrior's piece names), and
where each piece lands: unlike the bronze warrior these pieces go on our own figure: each chest set is brought
down with his neck on ours, its pieces where he drew them round it (each then turns about our joint).

His head is not reduced from this picture any more: on 2026-10-30 he drew the general's head again at the
game's scale ("usa esta mejor", docs/reference/general-head-v2-owner-reference.png), one cell of his a fine
pixel of ours, and that picture is read cell by cell (head_pieces): his face and eyes and his hair, stamped on
the face anchor.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import bronze_ref as R  # noqa: E402
import engraved_ref as E  # noqa: E402

REF = 'docs/reference/roman-general-owner-reference.jpg'
# His grid: the bronze warrior's pitch; where his first cell starts (picture pixels, the least spread inside
# the cells), and the cells his landscape picture holds whole.
R.PHASE[REF] = (7.6, 4.3)
R.CELLS = (255, 190)

_kind = R.kind


def kind(c):
    """bronze_ref.kind, with his magenta (the scarf and the cape: more blue than green in a red) as the
    cloth it is, not skin."""
    r, g, b = (int(v) for v in c)
    if min(r, g, b) <= 225 and b > g + 20 and r > g + 40:
        return 'purple'
    return _kind(c)


R.kind = kind

# His joints on the left figure (his pixel corners), read off his picture; the right figure stands the same
# way, RIGHT_SHIFT cells over and down.
JOINTS_L = {
    'neck': (71.0, 39.0),
    'pelvis': (69.0, 98.0),
    'shoulderN': (40.0, 50.0),
    'shoulderF': (91.0, 50.0),
    'elbowN': (36.0, 72.0),
    'elbowF': (93.0, 74.0),
    'wristN': (39.0, 95.0),
    'wristF': (99.0, 94.0),
    'hipN': (58.0, 100.0),
    'hipF': (80.0, 99.0),
    'kneeN': (50.0, 132.0),
    'kneeF': (84.0, 130.0),
    'ankleN': (45.0, 175.0),
    'ankleF': (83.0, 172.0),
}
RIGHT_SHIFT = (132.0, 4.0)
JOINTS = {'L': JOINTS_L, 'R': {k: (x + RIGHT_SHIFT[0], y + RIGHT_SHIFT[1]) for k, (x, y) in JOINTS_L.items()}}


def body_scale():
    """His pixels per fine pixel: the least-squares fit (a scale and a shift) of his joints on our male idle's."""
    ks = sorted(JOINTS_L)
    A = np.array([JOINTS_L[k] for k in ks], float)
    O = np.array([R.JOINTS[k] for k in ks], float)
    best = None
    for s in np.arange(1.5, 3.5, 0.01):
        t = (O - A / s).mean(0)
        e = float(((O - (A / s + t)) ** 2).sum())
        if best is None or e < best[0] - 1e-12:
            best = (e, round(float(s), 2))
    return best[1]


BODY_SCALE = body_scale()

# His head stands on his neck as he drew it, his chin over the scarf: the game raises it HEAD_UP rows over
# ours (src/sprite/generalHead.ts, as his Roman head is raised), so the face anchor his head pieces are stamped
# from is that much higher than our male idle's.
HEAD_UP = 3
R.ANCHOR = (R.ANCHOR[0], R.ANCHOR[1] - HEAD_UP)

CHEST = ('cuirass', 'scarf', 'pauldron_n', 'pauldron_f', 'sleeve_n', 'sleeve_f')
HEAD_PIECES = ('face', 'hair')

# His new head (docs/reference/general-head-v2-owner-reference.png, 2026-10-30, "usa esta mejor"): the
# general's face, eyes and hair drawn by him at the game's scale, one cell of his a fine pixel of ours, read cell
# by cell, not reduced. His grid: the pitch of his cells in picture pixels, where the first cell starts and how
# many cells the picture holds (the grid of least spread inside the cells). A cell's colour is the median of
# its central 9 x 9 picture pixels (his cells are flat inside; the blur at their edges is left out). His panel
# grey (within HEAD_BG of the first cell) is the background where it reaches the picture's edge: the whites he
# closed in his line (his eyes) are his. His colours are then snapped to his palette of the first general
# picture as it came down to our scale (HEAD_PALETTE: the 34 colours of his face and hair there, the readings
# he approved: the same hair browns and the same skin, so the head matches his sets), each to the nearest by
# the sum of the channels' differences (two as near: the first in the list, which is in hex order).
HEAD_REF = 'docs/reference/general-head-v2-owner-reference.png'
HEAD_PITCH = 27.7
HEAD_PHASE = (9, 15)
HEAD_CELLS = (24, 25)
HEAD_BG = 30
HEAD_PALETTE = (
    '#02021c', '#1a0a16', '#26121d', '#2c1014', '#2e1427', '#341a1e', '#3a2024', '#3e2a26', '#42241e', '#441b27',
    '#4e2d26', '#512a1c', '#5a3226', '#623236', '#623828', '#6c3e26', '#70343b', '#824d2e', '#85443c', '#8d5842',
    '#984a44', '#996238', '#a16a42', '#a6724a', '#b2675c', '#b27640', '#b47057', '#b59e88', '#b87e4d', '#bc8546',
    '#bcaa9d', '#c77756', '#e09868', '#e6e5e1',
)
# His cell (0, 0) in our frame at male idle frame 0 (where the first reading's hair began), and his rows that
# are the head: from row HEAD_ROWS down he drew his scarf and shoulders, which the game draws from his first
# picture. HEAD_NOT: his cells at the left edge of rows 18-19 that are the scarf's corner and its clasp's
# white, not the head.
HEAD_AT = (112, 125)
HEAD_ROWS = 20
HEAD_NOT = ((0, 18), (1, 18), (0, 19), (1, 19))
# The face among his cells: his skin and his eyes' whites wherever they are, and inside his hairline
# (FACE_COLS: the face's first and last column on each row of his) all else he drew there, his brows, lashes,
# irises and the jaw's lines. The rest of his cells are the hair, with his line round it; the hair is drawn
# in front, so at rest the two are his picture.
FACE_COLS = {7: (16, 17), 8: (13, 18), 9: (8, 19), 10: (6, 19), 11: (6, 19), 12: (6, 19), 13: (6, 19), 14: (8, 19),
             15: (8, 19), 16: (8, 19), 17: (7, 19), 18: (7, 19), 19: (7, 19)}
# His eyes' cells with the letters bronze_ref.eye_states gives the template (L his lash, w his white, i his
# iris), so the lid states the game needs come from his own pixels.
HEAD_EYES = {'L': ((12, 11), (13, 11), (14, 11), (18, 11)), 'w': ((12, 12), (14, 12)), 'i': ((13, 12), (18, 12))}
# Under his hair the face has a skull, for another hair on his face: an ellipse (centre, radii, in his cells)
# of his lit skin with his line at its edge. Under the scarf his neck goes on: his last row of it repeated
# NECK_ROWS rows down, as the first reading's face was continued (the scarf covers them at rest).
SKULL = ((12.5, 8.5), 7.0, 7.5)
NECK_ROWS = 4


def head_cells():
    """His new head picture cell by cell: (colours (rows, columns, 3) snapped to HEAD_PALETTE, which cells are
    his (not the background))."""
    img = np.asarray(Image.open(HEAD_REF).convert('RGB')).astype(np.int32)
    cols, rows = HEAD_CELLS
    red = np.zeros((rows, cols, 3), np.int32)
    for j in range(rows):
        y0 = int(np.floor(HEAD_PHASE[1] + HEAD_PITCH * (j + 0.5))) - 4
        for i in range(cols):
            x0 = int(np.floor(HEAD_PHASE[0] + HEAD_PITCH * (i + 0.5))) - 4
            red[j, i] = np.median(img[max(0, y0):y0 + 9, max(0, x0):x0 + 9].reshape(-1, 3), axis=0)
    grey = np.abs(red - red[0, 0]).max(axis=2) <= HEAD_BG
    bg = np.zeros((rows, cols), bool)
    stack = [(j, i) for j in range(rows) for i in range(cols) if (j in (0, rows - 1) or i in (0, cols - 1)) and grey[j, i]]
    while stack:
        j, i = stack.pop()
        if bg[j, i] or not grey[j, i]:
            continue
        bg[j, i] = True
        stack += [(j + dj, i + di) for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= j + dj < rows and 0 <= i + di < cols]
    P = np.array([[int(h[k:k + 2], 16) for k in (1, 3, 5)] for h in HEAD_PALETTE], np.int32)
    out = np.zeros_like(red)
    for j, i in zip(*np.nonzero(~bg)):
        out[j, i] = P[np.abs(P - red[j, i]).sum(axis=1).argmin()]
    return out, ~bg


_head_pieces = None


def head_pieces():
    """His face and his hair in our frame at male idle frame 0, from his new head picture: {name: (mask,
    colours, line)}. The face is his skin and eyes wherever they are and all he drew inside his hairline, with
    a skull under the hair and his neck continued under the scarf; the hair is the rest, with his line."""
    global _head_pieces
    if _head_pieces is not None:
        return _head_pieces
    cells, his = head_cells()
    H = W = 256
    cols = HEAD_CELLS[0]
    out = {n: (np.zeros((H, W), bool), np.zeros((H, W, 3), np.int32), np.zeros((H, W), bool)) for n in HEAD_PIECES}
    black = np.array([int(HEAD_PALETTE[0][k:k + 2], 16) for k in (1, 3, 5)], np.int32)
    x0, y0 = HEAD_AT

    def put(name, x, y, c):
        m, col, isl = out[name]
        m[y, x] = True
        col[y, x] = c
        isl[y, x] = R.material(c, name) == 'line'

    for j in range(HEAD_ROWS):
        lo, hi = FACE_COLS.get(j, (1, 0))
        for i in range(cols):
            if not his[j, i] or (i, j) in HEAD_NOT:
                continue
            c = cells[j, i]
            face = R.material(c, 'face') in ('skin', 'white') or lo <= i <= hi
            put('face' if face else 'hair', x0 + i, y0 + j, c)
    fm, fc, fl = out['face']
    # the skull under the hair, in his commonest skin
    tally = {}
    for y, x in zip(*np.nonzero(fm & ~fl)):
        if R.material(fc[y, x], 'face') == 'skin':
            k = tuple(int(v) for v in fc[y, x])
            tally[k] = tally.get(k, 0) + 1
    lit = max(sorted(tally), key=lambda k: tally[k])
    (cx, cy), rx, ry = SKULL
    added = [(y0 + j, x0 + i) for j in range(HEAD_ROWS) for i in range(cols)
             if ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1 and not fm[y0 + j, x0 + i]]
    for y, x in added:
        fm[y, x] = True
        fc[y, x] = lit
    for y, x in added:
        if not all(fm[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            fc[y, x] = black
            fl[y, x] = True
    # his neck continued under the scarf: his last row from the line before its first skin cell to its end
    y = y0 + HEAD_ROWS - 1
    xs = [x for x in range(x0, x0 + cols) if fm[y, x] and R.material(fc[y, x], 'face') == 'skin']
    first = xs[0] - 1 if fl[y, xs[0] - 1] else xs[0]
    last = max(x for x in range(x0, x0 + cols) if fm[y, x])
    for k in range(1, NECK_ROWS + 1):
        fm[y + k, first:last + 1] = fm[y, first:last + 1]
        fc[y + k, first:last + 1] = fc[y, first:last + 1]
        fl[y + k, first:last + 1] = fl[y, first:last + 1]
    _head_pieces = out
    return out


def head_given():
    """His eyes' pixels for bronze_ref.eye_states: {(y, x): letter}."""
    x0, y0 = HEAD_AT
    return {(y0 + j, x0 + i): letter for letter, cells in HEAD_EYES.items() for i, j in cells}


_eyes = R.eyes


def eyes(m, c, given=None):
    """bronze_ref.eyes with his lashes given as 'L': each eye's box starts at its lash row, which is not
    counted as the eye."""
    return _eyes(m, c, {q: l for q, l in given.items() if l != 'L'} if given else given)


R.eyes = eyes


def body_map(fig, name):
    """Where a figure's chest set lands: his cells shrunk by BODY_SCALE, his neck on ours at male idle frame 0,
    the whole set as he drew it round it (each piece then turns about our joint: bronze_ref.PIVOT)."""
    joint = 'neck'
    hx, hy = JOINTS[fig][joint]
    ox, oy = R.JOINTS[joint]
    return R.Map(BODY_SCALE, (ox - hx / BODY_SCALE, oy - hy / BODY_SCALE))


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def shifted(poly, d):
    return [(x + d[0], y + d[1]) for x, y in poly]


METAL = R.METAL + ('skin', 'red', 'steel')
NAVY = ('navy', 'hair', 'steel', 'dark', 'line')
CLOTH = ('purple', 'red', 'dark', 'line')
ANY = R.ALL + ('white',)
# Each figure's pieces, front to back (bronze_ref.labels): what this picture gives (CHEST) and, so they part
# from them along his line, his face and hair (which hide the scarf; the head itself is read from his second
# picture: head_pieces), his arms ('arm_*', in front of the chest where they cross it) and the rest of him
# ('other': his cape, skirt, bracers, legs and sandals).
PARTS = {
    'L': [
        ('arm_n', [rect(24, 62, 52, 80)], ('skin', 'line')),
        # his face inside his hairline, ear and jaw, and his neck under the chin
        ('face', [[(64, 13), (83, 13), (84, 24), (82, 31), (78, 35), (72, 37), (66, 37), (61, 33), (58, 28), (57, 22), (61, 21), (63, 17)], rect(60, 33, 76, 42)], ('skin', 'steel', 'red', 'dark', 'line', 'leather', 'white')),
        # the round clasp pinning the scarf goes with it, in front of the cuirass
        ('scarf', [rect(59, 40, 69, 50)], METAL),
        ('scarf', [[(42, 32), (98, 32), (98, 52), (62, 50), (44, 46)]], CLOTH),
        ('pauldron_n', [[(27, 37), (58, 37), (58, 59), (27, 59)]], METAL),
        ('sleeve_n', [rect(26, 49, 57, 69)], NAVY),
        ('hair', [[(46, 0), (90, 0), (90, 27), (85, 27), (84, 13), (64, 12), (57, 21), (57, 35), (46, 35)]], R.ALL),
        ('pauldron_f', [rect(85, 36, 99, 56)], METAL),
        ('cuirass', [[(51, 37), (95, 37), (95, 94), (51, 94)]], METAL),
        ('sleeve_f', [rect(85, 50, 99, 71)], NAVY),
        ('arm_f', [rect(86, 64, 104, 82)], ('skin', 'line')),
        ('other', [rect(0, 0, 128, 190)], ANY),
    ],
    'R': [
        ('arm_n', [shifted(rect(24, 62, 52, 82), RIGHT_SHIFT)], ('skin', 'line')),
        # (his face here is the left one's twin: not lifted, only kept out of the scarf)
        ('face', [shifted([(64, 13), (83, 13), (84, 24), (82, 31), (78, 35), (72, 37), (66, 37), (61, 33), (58, 28), (57, 22), (61, 21), (63, 17)], RIGHT_SHIFT), shifted(rect(60, 33, 76, 42), RIGHT_SHIFT)], ('skin', 'steel', 'red', 'dark', 'line', 'leather', 'white')),
        ('scarf', [rect(189, 43, 199, 53)], METAL),
        ('scarf', [shifted([(42, 32), (98, 32), (98, 52), (62, 50), (44, 46)], RIGHT_SHIFT)], CLOTH),
        ('pauldron_n', [[(158, 40), (187, 40), (187, 70), (158, 70)]], METAL),
        ('sleeve_n', [rect(157, 56, 186, 73)], NAVY),
        ('pauldron_f', [rect(216, 40, 232, 60)], METAL),
        ('cuirass', [[(181, 40), (227, 40), (227, 95), (181, 95)]], METAL),
        ('sleeve_f', [rect(215, 54, 232, 75)], NAVY),
        ('arm_f', [shifted(rect(86, 64, 104, 82), RIGHT_SHIFT)], ('skin', 'line')),
        ('other', [rect(128, 0, 255, 190)], ANY),
    ],
}

# What hides what among them (bronze_ref.FRONT: (behind, in front)), besides the bronze warrior's.
# His lines here do not close every piece off from the next (the cuirass's gold runs into the strips, the
# scarf into the cape): a patch with a second piece's cells in it at all is parted cell by cell, along the
# pieces' outlines.
R.SPLIT = 0.05

R.FRONT += [('sleeve_n', 'pauldron_n'), ('sleeve_f', 'pauldron_f'), ('pauldron_f', 'cuirass'), ('sleeve_f', 'cuirass'),
            ('cuirass', 'sleeve_n'), ('face', 'scarf'), ('hair', 'scarf'), ('cuirass', 'other'), ('scarf', 'other')]
# His motifs, each where he drew it (his cells, per figure): on the spiral cuirass his nine spirals in three
# rows, his lion face at the top of the chest and the square buckle of its belt; on the muscle cuirass the
# spiral at each shoulder, the lion face at the chest and its buckle. Laid at our scale as the bronze
# warrior's are (engraved_ref.motifs), each a clean reading among his pixels.
MOTIFS = {
    'L': [
        ('spiral', (61.5, 52.5), 5.0), ('lion', (73.5, 52.0), 6.5), ('spiral', (86.5, 52.5), 5.0),
        ('spiral', (60.0, 66.0), 5.0), ('spiral', (73.5, 66.0), 5.0), ('spiral', (87.0, 66.0), 4.5),
        ('spiral', (61.0, 78.5), 4.5), ('spiral', (73.5, 78.5), 4.5), ('spiral', (86.0, 78.5), 4.5),
        ('square', (73.5, 87.0), 4.5),
    ],
    'R': [
        ('spiral', (186.5, 47.5), 5.0), ('lion', (205.5, 50.0), 7.0), ('spiral', (222.5, 48.0), 4.5),
        ('square', (205.5, 87.5), 4.5),
    ],
}
R.MOTIFS = []
# How his plates are read at our scale (engraved_ref, after the owner's verdict on the first reductions,
# 2026-10-29): each cuirass and pauldron is his bronze or gold in his shades, his gold engraving and rims as
# light marks, his dark seams and shadows as dark marks and his line through the piece where he drew it, so the
# spirals, the lion, the plates and the studs read and nothing is a blend.
BRONZE = ('gold', 'leather', 'skin')
GOLD = ('gold', 'skin')
# (the pauldrons: his gold rims and studs in his brightest gold outright and his seams in his darkest, by
# what covers a pixel alone, so his dense arcs stay apart; his seams sooner than the cuirass's: the owner,
# 2026-10-30, on the first reading: a wash)
PAULDRON = dict(delta=20, mark_min=0.38, line_min=0.4, ends=True, land=False)
PLATES = {
    # the spiral cuirass: his gold lines on his bronze, the dark engraving between them shading the plate
    ('L', 'cuirass'): E.Plate(BRONZE, darks=False, motifs=MOTIFS['L']),
    # the muscle cuirass: his gold plates, their dark seams (the abs, the pecs) as his dark marks
    ('R', 'cuirass'): E.Plate(BRONZE, motifs=MOTIFS['R']),
    ('L', 'pauldron_n'): E.Plate(BRONZE, **PAULDRON), ('L', 'pauldron_f'): E.Plate(BRONZE, **PAULDRON),
    ('R', 'pauldron_n'): E.Plate(BRONZE, **PAULDRON), ('R', 'pauldron_f'): E.Plate(BRONZE, **PAULDRON),
}
_more_of = R.more_of


def more_of_for(fig):
    """What each piece is continued over besides what hides it (bronze_ref.more_of), on this figure: the
    chest up under the scarf to the neck."""
    J = JOINTS[fig]

    def more(name, H, W):
        if name == 'cuirass':
            nx, ny = J['neck']
            return R.inside(rect(nx - 18, ny - 2, nx + 20, ny + 12), H, W)
        if name in ('sleeve_n', 'sleeve_f'):
            # up under the pauldron round the shoulder (a raised arm shows it)
            S = name[-1].upper()
            return R.capsule(J['shoulder' + S], J['shoulder' + S], 9, H, W)
        return _more_of(name, H, W) if name.startswith('arm_') else None
    return more


def load():
    """His picture snapped to his palette, and each figure's pieces: (a, {'L': labels, 'R': labels})."""
    a = R.snapped(R.native(REF))
    K = R.kinds(a)
    bg = R.background(a)
    labs = {}
    for f in ('L', 'R'):
        lab = R.labels(a, PARTS[f])
        # his eyes' whites (white, so in no patch of his): the face's, inside its outline
        for name, regions, _ in PARTS[f]:
            if name == 'face':
                for pts in regions:
                    lab[R.inside(pts, *lab.shape) & (K == 'white') & ~bg & (lab == '')] = 'face'
        labs[f] = lab
    return a, labs


# A piece whole (the owner's rules for his pictures, 2026-10-29: whole pieces, no holes, no stray pixels, a
# clean 1 px outline): a speck of it detached from the rest (under FRAGMENT pixels) is dropped, a hole inside
# it takes its neighbours' colour, a notch in its edge (a pixel three of whose neighbours are the piece) is
# closed with his line, and a lone pixel darker or lighter than every neighbour of its piece by SPECK_LUMA (his
# dark fold on a sleeve, a glint on the scarf, which at our scale is one pixel of noise) takes their colour.
FRAGMENT = 6
SPECK_LUMA = 24


def whole(m, col, isl, black, keep=(), specks=True):
    H, W = m.shape
    lum = lambda c: 0.299 * int(c[0]) + 0.587 * int(c[1]) + 0.114 * int(c[2])
    nb4 = lambda y, x: [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < W]
    # 1. detached specks (8-neighbours)
    seen = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        group, stack = [], [(y, x)]
        seen[y, x] = True
        while stack:
            q, p = stack.pop()
            group.append((q, p))
            for dq in (-1, 0, 1):
                for dp in (-1, 0, 1):
                    yy, xx = q + dq, p + dp
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        if len(group) < FRAGMENT:
            for q in group:
                m[q] = False
                isl[q] = False
    # 2. holes: what is not the piece and cannot reach the frame's edge without crossing it
    out = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if out[y, x] or m[y, x]:
            continue
        out[y, x] = True
        stack += nb4(y, x)
    for y, x in zip(*np.nonzero(~m & ~out)):
        tally = {}
        for q in nb4(y, x):
            if m[q] and not isl[q]:
                c = tuple(int(v) for v in col[q])
                tally[c] = tally.get(c, 0) + 1
        m[y, x] = True
        if tally:
            col[y, x] = max(sorted(tally), key=lambda c: tally[c])
        else:
            col[y, x] = black
            isl[y, x] = True
    # 3. notches in the edge
    for _ in range(2):
        add = [(y, x) for y, x in zip(*np.nonzero(~m)) if sum(1 for q in nb4(y, x) if m[q]) >= 3]
        for y, x in add:
            m[y, x] = True
            col[y, x] = black
            isl[y, x] = True
    # 4. lone specks
    fixed = col.copy()
    for y, x in zip(*np.nonzero(m & ~isl)):
        if (y, x) in keep or not specks:
            continue
        nb = [q for q in nb4(y, x) if m[q] and not isl[q]]
        if len(nb) < 3:
            continue
        mine = lum(col[y, x])
        ls = [lum(col[q]) for q in nb]
        if all(l >= mine + SPECK_LUMA for l in ls) or all(l <= mine - SPECK_LUMA for l in ls):
            tally = {}
            for q in nb:
                c = tuple(int(v) for v in col[q])
                tally[c] = tally.get(c, 0) + 1
            fixed[y, x] = max(sorted(tally), key=lambda c: tally[c])
    col[:] = fixed
    return m, col, isl


def piece(a, labs, fig, name):
    """A piece of a figure at our scale, continued under what hides it and made whole (whole): (mask,
    colours, line). The head pieces come from his second picture (head_pieces)."""
    if name in HEAD_PIECES:
        return head_pieces()[name]
    R.more_of = more_of_for(fig)
    R.HIS_JOINTS = JOINTS[fig]
    M = body_map(fig, name)
    if (fig, name) in PLATES:
        # (a plate's lone light pixel is his stud or his glint, read by engraved_ref: not a speck)
        m, c, isl = E.piece(a, labs[fig], name, M, PLATES[(fig, name)])
        return whole(m, c, isl, R.his_line(a), specks=False)
    m, c, isl = R.piece(a, labs[fig], name, M)
    return whole(m, c, isl, R.his_line(a))


# Where each piece is stamped from: our joint (the scripts bring his joint onto it) or the face anchor.
def fine_joint(name):
    if name == 'anchor':
        return (R.ANCHOR[0] + 0.5, R.ANCHOR[1] + 0.5)
    return R.JOINTS[name]


R.fine_joint = fine_joint

# The game's order at rest, back to front (src/sprite/ctx.ts DEPTHS, as items/general.ts draws them).
GAME_ORDER = [
    ('farArm.cloth', 'sleeve_f'),
    ('farArm.armor', 'pauldron_f'),
    ('torso.armor', 'cuirass'),
    ('head.body', 'face'),
    ('hairFront', 'hair'),
    ('capeFront', 'scarf'),
    ('nearArm.cloth', 'sleeve_n'),
    ('nearArm.armor', 'pauldron_n'),
]


def header(script, what, args='', refs=(REF,)):
    pics = ' and '.join(f'docs/reference/{os.path.basename(r)}' for r in refs)
    return (f'// {what}\n// Lifted from the owner\'s Roman general ({pics}) and\n'
            f'// brought down to our scale by tools/refs/{script} (tools/refs/general_ref.py).\n'
            f'// Generated: rerun the script to change it:\n//   python3 -I tools/refs/{script}{args}\n')


def run(script, out, what, consts, prefix, bases=None, refs=(REF,)):
    """A part script's work: its pieces (consts: (CONST, figure, piece name, doc)) brought down and written
    to `out` as a TypeScript module."""
    a, labs = load() if any(n not in HEAD_PIECES for _, _, n, _ in consts) else (None, None)
    pieces = {(f, n): piece(a, labs, f, n) for _, f, n, _ in consts}
    b = bases(pieces) if bases else None
    text = R.module(header(script, what, f' {out}', refs), [(c, pieces[(f, n)], d, n) for c, f, n, d in consts], prefix, b)
    R.write(out, text)
    return pieces


def middle(pieces, keys, kinds_wanted, q=0.5):
    """His colour of middle lightness among these pieces' pixels of these materials: a colour slot's base."""
    found = []
    for key in keys:
        m, c, isl = pieces[key]
        for y, x in zip(*np.nonzero(m & ~isl)):
            if R.material(c[y, x], key[1]) in kinds_wanted:
                found.append((float(R.luma(c[y, x])), R.hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]

