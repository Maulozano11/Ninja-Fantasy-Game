"""The owner's three frames of Lyra reading (docs/reference/lyra-read-owner-reference.jpg), shared by
lyra-read-from-ref.py (her pieces) and seat-rock-from-ref.py (the rock she sits on).

His picture (2000 x 1116, 2026-10-22) is our Lyra's read pose repainted by him in three panels:
"Cuadro 1: Atenta", "Cuadro 2: Leyendo", "Cuadro 3: Pasando pagina". She sits on a grey rock with an
open dark book in both hands; in the third frame her far hand lifts the far page. His words: "copialo
exacto me encanta estas poses nuevas de sentado y leyendo es el nuevo standard", and of her hands "mira
como estan sus manos se ven excelentes copialo igual"; of the rock "puedes usar la piedra tambien como
objeto pero ese objeto cambiara dependiendo del escenario" (so the rock is a seat of its own, not hers).

His grid: about 10.4 picture pixels a pixel of his, drifting over the picture (owner_paintover.native
finds it per panel). He drew her at OUR scale: one of his pixels is one fine pixel of our sprite (her
head, face and torso lie on our Lyra's at 1.00; his figure is taller only because she sits upright on a
taller seat), so every pixel is taken one for one. The three panels line up: panel k's column x is
panel 1's column x - SHIFT[k] (they agree to the pixel on her head), and panel 1's pixel (x, y) is our
fine pixel (x + OFFSET[0], y + OFFSET[1]): his soles (row 92) on our ground row 215, her near boot where
our read pose has had it.

Every pixel of a frame belongs to one owner, the option of hers that draws it: her hair, her face (the
face shape 'fine'), the blouse (with the skin of her shoulders, arms and hands, as the blouse carries her
bare shoulder at idle), the corset, the skirt, the tabard, the belt, the boots (with the bare thighs
above them), the sword, the book (camp prop, campfx.ts) and the rock (the seat prop, seats.ts).
ZONES says which, in panel 1's columns: a pixel takes the owner of the last zone it falls in whose rule
takes its colour. His black line goes with every owner it touches, so each one is closed in his line.
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'lyra-read-owner-reference.jpg')
PITCH = 10.4
# The picture's box round each panel (they overlap: a box takes a little of its neighbours, cut below).
BOXES = [(5, 95, 760, 1085), (600, 95, 1400, 1085), (1240, 95, 1998, 1085)]
SHIFT = [0, 5, 5]
OFFSET = (74, 123)
# Panel 1's columns kept, and the rows.
COLS = 70
ROWS = 97
# His grey page, and how far from it a pixel is still page.
PAGE = (139, 139, 139)
PAGE_TOL = 14
# Colours of his within this distance (per channel) are one colour of his.
TOL = 12
# His black line: every channel below this.
LINE = 45
NAMES = ['Atenta', 'Leyendo', 'Pasando pagina']

# The neighbours' pixels in each panel's box (panel 1's columns): the next panel's rock and sword on the
# right of panel 1, the panel before's boots and book on the left of panels 2 and 3.
OTHERS = {
    0: [[(-6, 0), (3, 0), (3, 58), (2, 58), (2, 63), (3, 63), (3, 98), (-6, 98)], [(64, 52), (70, 52), (70, 98), (64, 98)], [(66, 0), (70, 0), (70, 52), (66, 52)]],
    1: [[(-6, 0), (3, 0), (3, 98), (-6, 98)], [(64, 52), (70, 52), (70, 98), (64, 98)], [(67, 0), (70, 0), (70, 52), (67, 52)]],
    2: [[(-6, 0), (3, 0), (3, 98), (-6, 98)], [(64, 52), (70, 52), (70, 98), (64, 98)], [(67, 0), (70, 0), (70, 52), (67, 52)]],
}


def _cls(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return r, g, b


def skin(m):
    r, g, b = _cls(m)
    return (r > 195) & (g > 120) & (g < 215) & (b > 85) & (b < 190) & (r - b > 45) & (r - g > 35)


def leather(m):
    """The corset's, bracers' and pauldron's colours: its browns, golds and steels (not her cream, red or skin)."""
    r, g, b = _cls(m)
    gold = (r > 150) & (g > 100) & (b < 120) & (r - b > 70) & ~skin(m)
    brown = (r >= g - 4) & (g >= b - 12) & (r < 170) & (r - g < 45)
    steel = (np.abs(r - b) < 25) & (np.abs(g - b) < 25) & (r > 60) & (r < 200)
    return gold | brown | steel


def rock(m):
    """The rock's greys and the earth's browns (not her tabard's cream, red and gold, or skin)."""
    r, g, b = _cls(m)
    cream = (r > 195) & (g > 170)
    gold = (r > 170) & (g > 100) & (b < 110) & (r - b > 80)
    red = (r - g > 45) & (b < 90) & (r > 100) & (g < 80)
    return ~cream & ~gold & ~red & ~skin(m)


def earth(m):
    """The earth under the rock and round her boots: his warm browns, lighter than the boots' leather."""
    r, g, b = _cls(m)
    return (r > 105) & (r < 175) & (g > 60) & (g < 120) & (b < 90) & (r - b > 40)


def hair(m):
    """His auburns and the dark maroon of her hair's shadows."""
    r, g, b = _cls(m)
    return ((r - g > 45) & (r < 215) & (g < 130) & (b < 110) & ~skin(m)) | ((r > b) & (r < 100) & (g < 40))


def lining(m):
    """Her tabard's lining over the rock: his tan and its darker stripes."""
    r, g, b = _cls(m)
    return (r > 110) & (r - b > 18) & (r - b < 70) & (g > 80)


ZONES = [
    ('hair', [(10, 0), (52, 0), (52, 22), (43, 22), (43, 28), (26, 28), (26, 32), (23, 32), (23, 50), (10, 50)], None),
    ('face', [(34, 8), (47, 8), (47, 12), (34, 12)], skin),
    ('face', [(36, 12), (45, 12), (45, 22), (43, 25), (40, 26), (36, 26)], None),
    ('top', [(23, 24), (32, 24), (32, 27), (36, 27), (36, 26), (44, 26), (44, 22), (52, 22), (52, 30), (45, 30), (45, 35), (39, 35), (39, 47), (30, 47), (28, 45), (22, 45), (22, 30)], None),
    ('armor', [(23, 24), (32, 24), (32, 27), (36, 27), (36, 26), (44, 26), (44, 22), (52, 22), (52, 30), (45, 30), (45, 35), (39, 35), (39, 47), (30, 47), (28, 45), (22, 45), (22, 30)], leather),
    # her hair over the near shoulder, in front of the blouse
    ('hair', [(30, 22), (36, 22), (36, 32), (32, 32), (30, 29)], hair),
    ('book', [(45, 30), (50, 30), (50, 27), (66, 27), (66, 47), (39, 47), (39, 35), (45, 35)], None),
    ('top', [(45, 30), (50, 30), (50, 27), (66, 27), (66, 47), (39, 47), (39, 35), (45, 35)], skin),
    ('waist', [(27, 45), (53, 45), (53, 50), (27, 50)], None),
    ('bottom', [(30, 50), (56, 50), (56, 55), (52, 62), (36, 62), (30, 56)], None),
    ('feet', [(38, 53), (66, 53), (66, 94), (44, 94), (44, 62), (38, 62)], None),
    ('skirt', [(26, 45), (38, 45), (30, 62), (46, 62), (46, 77), (21, 77), (21, 84), (8, 84), (6, 64), (14, 58)], None),
    ('held', [(1, 58), (16, 46), (19, 43), (27, 43), (27, 51), (10, 62), (1, 64)], None),
    ('seat', [(0, 62), (7, 62), (8, 76), (21, 76), (21, 77), (46, 77), (46, 84), (44, 86), (44, 94), (64, 94), (64, 98), (0, 98)], rock),
    ('seat', [(44, 82), (66, 82), (66, 98), (44, 98)], earth),
    # her near hand at the book's foot, in front of the belt
    ('top', [(38, 37), (52, 37), (52, 48), (38, 48)], skin),
]
# Zones of one frame only, laid after ZONES (panel 1's columns).
FRAME_ZONES = {
    0: [],
    1: [],
    # the far hand lifting the far page, above the book
    2: [('book', [(50, 23), (64, 23), (64, 30), (50, 30)], None), ('top', [(50, 23), (64, 23), (64, 32), (50, 32)], skin)],
}

_CACHE = {}


def frame(k):
    """Panel k in panel 1's columns: (merged colours (ROWS, COLS, 3), figure mask, line mask), the figure
    being his pixels that are not his page or a neighbour's."""
    if k in _CACHE:
        return _CACHE[k]
    a = P.native(REF, BOXES[k], PITCH)
    s = SHIFT[k]
    out = np.zeros((ROWS, COLS, 3), int)
    out[:, :] = PAGE
    h = min(ROWS, a.shape[0])
    w = min(COLS, a.shape[1] - s)
    out[:h, :w] = a[:h, s:s + w]
    fg = np.abs(out - np.array(PAGE)).max(2) > PAGE_TOL
    for poly in OTHERS[k]:
        fg &= ~P.inside(poly, ROWS, COLS)
    fg[0] = False
    m = P.merge(out, fg, TOL)
    line = fg & (m.max(2) < LINE)
    _CACHE[k] = (m, fg, line)
    return _CACHE[k]


def owners(k):
    """Panel k's owner per pixel: ZONES then FRAME_ZONES[k] over the pixels that are not his line (a
    pixel no zone takes goes with the nearest owner), and each owner's mask with his line round it
    (owner_paintover.own_lines)."""
    m, fg, line = frame(k)
    own = np.full((ROWS, COLS), '', object)
    for owner, poly, rule in ZONES + FRAME_ZONES[k]:
        z = P.inside(poly, ROWS, COLS) & fg & ~line
        if rule is not None:
            z &= rule(m)
        own[z] = owner
    return P.own_lines(own, fg, line)


def to_frame(x, y):
    """Panel 1's column and row to our fine pixel."""
    return x + OFFSET[0], y + OFFSET[1]
