"""The owner's repaint of our Lyra's throw frames 3 and 4 (docs/reference/lyra-throw-owner-reference.jpg),
for lyra-throw-from-ref.py.

His picture (2000 x 1116, 2026-10-22) is our renders of her 'throw' frames 3 and 4 ("lanzar 3/4", the
release and the follow-through), painted over by him as "Cuadro 1" and "Cuadro 2": at the release the
sword is thrust straight out at the target; in the follow-through the near arm swings up and back over
the head, the head carried forward, and the pink patch we had behind her head is gone.

His grid: 1000/120 picture pixels a pixel of his (the same grid as his Ren paint-over), found per panel
by owner_paintover.native. His figure is drawn larger than our sprite: SCALE (about 1.35) of his pixels
to one fine pixel of ours, by her head (hair to eyes, eyes to chin), her height in the follow-through
(105 of his rows to our 78) and her legs and boots, which he kept from our frames (1.30 to 1.38). So,
as with his Ren paint-over, each frame is brought down to our scale by keeping that many of his rows and
columns (owner_paintover.keep: those left out are the ones most like a neighbour, so his 1 px line and
his folds stay): every pixel is one of his, in his colour. Brought down, frame k's pixel (x, y) is our
fine pixel (x + OFFSET[k][0], y + OFFSET[k][1]): his soles on our ground row 215, her near foot where
our throw has had it.

Every pixel belongs to one owner, as in his read frames (lyra_read_ref.py): ZONES[k], in the brought-down
frame's columns and rows.
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'lyra-throw-owner-reference.jpg')
PITCH = 1000 / 120
BOXES = [(60, 150, 1040, 1090), (1080, 150, 1900, 1090)]
SCALE = 1.35
OFFSET = [(96, 132), (97, 133)]
PAGE = (177, 177, 187)
PAGE_TOL = 14
TOL = 12
LINE = 45
NAMES = ['Cuadro 1 (soltar)', 'Cuadro 2 (seguir)']
# The rig frames of 'throw' they are.
FRAMES = [3, 4]

_CACHE = {}


def frame(k):
    """Frame k brought down to our scale: (colours (rows, cols, 3), figure mask, line mask)."""
    if k in _CACHE:
        return _CACHE[k]
    a = P.native(REF, BOXES[k], PITCH)
    fg = np.abs(a - np.array(PAGE)).max(2) > PAGE_TOL
    # (the box's own edge cells are half his page, half nothing)
    fg[:2] = fg[-2:] = False
    fg[:, :2] = fg[:, -2:] = False
    a = P.merge(a, fg, TOL)
    line = fg & (a.max(2) < LINE)
    H, W = fg.shape
    rows = P.keep(int(H / SCALE), H, SCALE, P.drop_costs(a, line, fg, 0))
    cols = P.keep(int(W / SCALE), W, SCALE, P.drop_costs(a, line, fg, 1))
    sm = a[np.ix_(rows, cols)]
    sfg = fg[np.ix_(rows, cols)]
    sline = line[np.ix_(rows, cols)]
    _CACHE[k] = (sm, sfg, sline)
    return _CACHE[k]


def skin(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return (r > 195) & (g > 120) & (g < 215) & (b > 85) & (b < 190) & (r - b > 45) & (r - g > 35)


def hair(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return ((r - g > 45) & (r < 230) & (g < 135) & (b < 110) & ~skin(m)) | ((r > b) & (r < 100) & (g < 40))


def leather(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    gold = (r > 150) & (g > 100) & (b < 120) & (r - b > 70) & ~skin(m)
    brown = (r >= g - 4) & (g >= b - 12) & (r < 170) & (r - g < 45)
    steel = (np.abs(r - b) < 25) & (np.abs(g - b) < 25) & (r > 60) & (r < 200)
    return gold | brown | steel


def cream(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return (r > 175) & (g > 150) & (b > 110) & (r - b < 80) & ~skin(m)


def tabard(m):
    """The tabard's cream, its red and gold edge and its tan lining (not the boots' dark leather)."""
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    red = (r - g > 45) & (r > 100) & (g < 90)
    gold = (r > 150) & (g > 100) & (b < 120) & (r - b > 70)
    tan = (r > 110) & (g > 80) & (r - b > 15) & (r - b < 75)
    return cream(m) | red | gold | tan


def blade(m):
    r, g, b = m[..., 0], m[..., 1], m[..., 2]
    return ~skin(m) & ~cream(m)


ZONES = {
    # Cuadro 1: the release, the sword thrust straight out
    0: [
        ('hair', [(12, 8), (64, 8), (64, 34), (48, 34), (48, 24), (38, 24), (38, 18), (30, 18), (30, 46), (12, 46)], None),
        ('face', [(49, 16), (58, 16), (58, 32), (49, 32)], None),
        ('face', [(58, 18), (62, 18), (62, 31), (58, 31)], skin),
        ('top', [(29, 18), (36, 18), (36, 24), (29, 24)], skin),
        ('top', [(30, 24), (48, 24), (48, 34), (58, 34), (58, 42), (44, 44), (30, 46)], None),
        ('armor', [(30, 24), (48, 24), (48, 34), (58, 34), (58, 42), (44, 44), (30, 46)], leather),
        ('hair', [(30, 24), (38, 24), (38, 40), (30, 40)], hair),
        ('held', [(56, 31), (88, 31), (88, 50), (56, 50)], blade),
        ('waist', [(28, 43), (53, 43), (53, 50), (28, 50)], None),
        ('bottom', [(30, 47), (54, 47), (54, 58), (30, 58)], None),
        ('skirt', [(3, 43), (38, 43), (38, 72), (3, 72)], tabard),
        ('skirt', [(24, 55), (54, 55), (52, 73), (24, 73)], tabard),
        ('feet', [(0, 58), (26, 58), (23, 66), (20, 72), (17, 86), (0, 86)], leather),
        ('feet', [(49, 55), (65, 55), (65, 86), (46, 86), (46, 60), (49, 60)], leather),
        ('skirt', [(57, 68), (70, 68), (70, 84), (57, 84)], tabard),
    ],
    # Cuadro 2: the follow-through, the near arm swung up and back over the head
    1: [
        ('hair', [(29, 12), (72, 12), (72, 40), (29, 40)], hair),
        ('face', [(59, 21), (69, 21), (69, 35), (59, 35)], None),
        ('top', [(13, 3), (31, 3), (36, 13), (43, 17), (43, 29), (35, 29), (26, 14), (13, 12)], None),
        ('armor', [(13, 3), (31, 3), (36, 13), (43, 17), (43, 29), (35, 29), (26, 14), (13, 12)], leather),
        ('top', [(34, 26), (58, 26), (58, 47), (34, 47)], None),
        ('armor', [(34, 26), (58, 26), (58, 47), (34, 47)], leather),
        ('hair', [(29, 24), (44, 24), (44, 40), (29, 40)], hair),
        ('hair', [(44, 18), (60, 18), (60, 42), (44, 42)], hair),
        ('waist', [(32, 46), (63, 46), (63, 51), (32, 51)], None),
        ('waist', [(52, 48), (63, 48), (63, 56), (52, 56)], None),
        ('bottom', [(30, 51), (52, 51), (56, 56), (56, 62), (30, 62)], None),
        ('skirt', [(4, 38), (41, 38), (41, 71), (4, 71)], tabard),
        ('skirt', [(20, 57), (52, 57), (52, 72), (20, 72)], tabard),
        ('feet', [(0, 60), (25, 60), (25, 85), (0, 85)], leather),
        ('feet', [(46, 58), (63, 58), (63, 85), (36, 85), (36, 67), (46, 67)], leather),
        ('skirt', [(48, 70), (62, 70), (62, 85), (48, 85)], tabard),
    ],
}


def owners(k):
    """Frame k's owner per pixel and each owner's mask with his line round it (lyra_read_ref.owners)."""
    m, fg, line = frame(k)
    H, W = fg.shape
    own = np.full((H, W), '', object)
    for owner, poly, rule in ZONES[k]:
        z = P.inside(poly, H, W) & fg & ~line
        if rule is not None:
            z &= rule(m)
        own[z] = owner
    return P.own_lines(own, fg, line)


def to_frame(k):
    ox, oy = OFFSET[k]
    return lambda x, y: (x + ox, y + oy)
