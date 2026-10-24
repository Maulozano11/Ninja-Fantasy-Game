"""Shared helpers for lifting Aurelia's two new outfits out of the owner's sheet
(docs/reference/aurelia-outfits-owner-reference.jpg).

His sheet (2000 x 1116 JPEG, dark grey ground) shows his Aurelia three times: the white and gold robe she
already wears in the game (left: "ignora la primera porque esa ya la tenemos"), a dark sorceress (middle) and
an adventurer alchemist (right). Every figure has her head, pasted on at a coarser grid (about 5.6 picture
pixels); the bodies are drawn on a grid of 2000 / 480 picture pixels (PITCH, from PHASE), and stand about 258 of
those pixels tall, where our female stands 96. Her head is not lifted: the game draws her approved head (the face
'aurelia', her hair, her eyes), pixel for pixel, on every outfit.

So each body is brought down to our scale, as the owner decided for his big pictures (2026-10-24, "Reducir y
limpiar yo"):
  - shrunk evenly at BODY_SCALE of his pixels to one fine pixel of ours, the scale at which his shoulders,
    hands, knees and ankles fall on our fitted female rig at idle frame 0 (aurelia_rig.JOINTS), placed across by
    least squares over his joints (FIT_ON) and down so that his far sole stands on ours (his near sole is cut off
    by the sheet's lower edge);
  - then what the shrinking leaves blurry is cleaned with his palette only (reduce(), clean()): his line 1 px
    round every piece and between pieces where he drew one, each fine pixel one of his colours from the cells it
    covers (the heavier of their dark and light halves), his gold trim and thorns as continuous 1 px lines, his
    small marks (buckles, gems, studs, glints) as his own colours at their place, lone specks taken away.
Every colour is one of his (snapped(): the JPEG's noise snapped to his palette, never a new colour).

The method is the bronze warrior's (hero/bronze-warrior, tools/refs/bronze_ref.py), at the same scale; its
functions are copied here and fitted to these pictures (his ground is dark grey, not white, and the gaps he
left between an arm and the body are that grey too: real gaps, kept open).

game(outfit) is his figure at our scale as the pieces lay it at rest (the reference the idle tests check pixel
for pixel); plain(outfit) is the same shrink with nothing chosen, the pixel under each fine pixel's middle (for
the owner's "sin limpiar / limpio" sheet). Scripts import this with sys.path.insert(0, os.path.dirname(__file__))
and run with python3 -I from the repository root.
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from aurelia_rig import JOINTS  # noqa: E402
from roman_ref import CHARS, hexc, write  # noqa: E402,F401

REF = 'docs/reference/aurelia-outfits-owner-reference.jpg'
PITCH = 2000 / 480
# The picture pixel where his first whole cell starts (the strongest edges of his blocks fall there).
PHASE = (3.64, 3.47)
# His dark grey ground.
GROUND = (65, 67, 72)
GROUND_TOL = 10

# His pixels per fine pixel of ours (both outfits: they stand as the robe does, the robe as our Aurelia).
BODY_SCALE = 2.9
FIT_ON = ('shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'handN', 'handF', 'kneeN', 'kneeF', 'ankleN', 'ankleF')
# Our far shoe's last row at idle frame 0 (his far sole stands on it).
FAR_SOLE_OURS = 216

# Each outfit: where it lies in his sheet (his cells, x0..x1), his joints read off his picture (cell corners:
# the middle of the joint where his limb bends) and his far sole's last row.
OUTFITS = {
    'sorceress': {
        'cols': (170, 336),
        'sole': 261,
        'joints': {
            'neck': (240.0, 60.0),
            'shoulderN': (215.0, 75.0),
            'shoulderF': (262.0, 74.0),
            'elbowN': (205.0, 109.0),
            'elbowF': (276.0, 108.0),
            'wristN': (198.0, 134.0),
            'wristF': (279.0, 134.0),
            'handN': (193.0, 143.0),
            'handF': (284.0, 143.0),
            'pelvis': (245.0, 122.0),
            'hipN': (232.0, 124.0),
            'hipF': (260.0, 124.0),
            'kneeN': (220.0, 196.0),
            'kneeF': (268.0, 196.0),
            'ankleN': (210.0, 248.0),
            'ankleF': (272.0, 246.0),
        },
    },
    'alchemist': {
        'cols': (336, 479),
        'sole': 261,
        'joints': {
            'neck': (398.0, 60.0),
            'shoulderN': (372.0, 76.0),
            'shoulderF': (418.0, 75.0),
            'elbowN': (362.0, 108.0),
            'elbowF': (430.0, 108.0),
            'wristN': (356.0, 134.0),
            'wristF': (434.0, 134.0),
            'handN': (353.0, 143.0),
            'handF': (438.0, 145.0),
            'pelvis': (398.0, 125.0),
            'hipN': (385.0, 126.0),
            'hipF': (412.0, 126.0),
            'kneeN': (378.0, 193.0),
            'kneeF': (423.0, 193.0),
            'ankleN': (368.0, 246.0),
            'ankleF': (425.0, 246.0),
        },
    },
}


def body_offset(outfit):
    """The fine pixel his corner (0, 0) lands on: across by least squares over FIT_ON, down by his far sole on ours."""
    J = OUTFITS[outfit]['joints']
    H = np.array([J[k] for k in FIT_ON], float)
    O = np.array([JOINTS[k] for k in FIT_ON], float)
    ox = float((O[:, 0] - H[:, 0] / BODY_SCALE).mean())
    oy = (FAR_SOLE_OURS + 1) - (OUTFITS[outfit]['sole'] + 1) / BODY_SCALE
    return (round(ox, 2), round(oy, 2))


class Map:
    """Where his cell corners land in our frame: fine = his / k + off."""

    def __init__(self, k, off):
        self.k = k
        self.off = off

    def fine(self, p):
        return (p[0] / self.k + self.off[0], p[1] / self.k + self.off[1])

    def his(self, q):
        return ((q[0] - self.off[0]) * self.k, (q[1] - self.off[1]) * self.k)


def body_map(outfit):
    return Map(BODY_SCALE, body_offset(outfit))


_NATIVE = {}


def native():
    """His pixels: the median of each cell's interior, as an (H, W, 3) int array."""
    if 'n' not in _NATIVE:
        a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
        Hp, Wp, _ = a.shape
        nx = int((Wp - PHASE[0]) // PITCH)
        ny = int((Hp - PHASE[1]) // PITCH)
        out = np.zeros((ny, nx, 3))
        for j in range(ny):
            y0 = PHASE[1] + j * PITCH
            for i in range(nx):
                x0 = PHASE[0] + i * PITCH
                blk = a[int(np.ceil(y0 + 1)):int(y0 + PITCH - 1) + 1, int(np.ceil(x0 + 1)):int(x0 + PITCH - 1) + 1]
                out[j, i] = np.median(blk.reshape(-1, 3), axis=0)
        _NATIVE['n'] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE['n'].copy()


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


# His palette: colours of his within PAL_MERGE of a commoner one are that one (the JPEG's noise round each
# colour he used); a colour seen fewer than PAL_RARE times goes to his nearest commoner colour within
# PAL_RARE_MERGE.
PAL_MERGE = 9
PAL_RARE = 4
PAL_RARE_MERGE = 20


def is_ground(a):
    return np.abs(a - np.array(GROUND)).max(axis=-1) <= GROUND_TOL


def palette(a):
    """His colours, commonest first: [(rgb, count)]. His ground is not one."""
    fl = a.reshape(-1, 3)
    fg = ~is_ground(fl)
    u, c = np.unique(fl[fg], axis=0, return_counts=True)
    o = np.lexsort((u[:, 2], u[:, 1], u[:, 0], -c))
    u, c = u[o], c[o]
    left = np.ones(len(u), bool)
    pal = []
    for i in range(len(u)):
        if not left[i]:
            continue
        take = left & (np.sqrt(((u - u[i]) ** 2).sum(axis=1)) <= PAL_MERGE)
        pal.append((tuple(int(v) for v in u[i]), int(c[take].sum())))
        left &= ~take
    return pal


def snapped(a):
    """His picture with every cell in his palette's colour (his ground stays his ground colour)."""
    pal = palette(a)
    P = np.array([p for p, _ in pal])
    n = np.array([c for _, c in pal])
    common = n >= PAL_RARE
    fl = a.reshape(-1, 3)
    out = np.empty_like(fl)
    for s in range(0, len(fl), 4096):
        f = fl[s:s + 4096]
        d = ((f[:, None, :] - P[None]) ** 2).sum(axis=2)
        idx = np.argmin(d, axis=1)
        dc = np.where(common[None], d, 1e18)
        ic = np.argmin(dc, axis=1)
        rare = ~common[idx] & (dc[np.arange(len(f)), ic] <= PAL_RARE_MERGE ** 2)
        idx = np.where(rare, ic, idx)
        out[s:s + 4096] = P[idx]
    out = out.reshape(a.shape)
    out[is_ground(a)] = GROUND
    return out.astype(np.int32)


def kind(c):
    """What a colour of his is: 'ground', 'line' (his near-black line), 'dark' (his darkest cloth and leather
    inside it), 'skin', 'hair' (her blonde), 'gold', 'cream' (the blouse), 'steel' (greys: buckles, plates),
    'crimson' (the sash and the sorceress's under-skirt), 'purple' (the sorceress's dress), 'violet' (gems
    and the orb), 'green' (the tabard), 'teal' (gems), 'leather' (browns)."""
    r, g, b = (int(v) for v in c)
    if max(abs(r - GROUND[0]), abs(g - GROUND[1]), abs(b - GROUND[2])) <= GROUND_TOL:
        return 'ground'
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 9 and max(r, g, b) < 24:
        return 'line'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if s < 0.12 and L > 60:
        return 'steel'
    if L < 26 and s < 0.5:
        return 'dark'
    if g > r + 6 and g >= b - 4:
        return 'green' if g > b + 6 or L < 90 else 'teal'
    if g > r + 6 and b > r + 6:
        return 'teal'
    if b > r + 20 and b > g + 20 and L > 70:
        return 'violet' if r > g else 'teal'
    if r >= 170 and r - g >= 25 and g >= 0.5 * r and b >= 0.4 * r and b <= g + 15 and g - b < 42:
        return 'skin'
    if r > 120 and g > 80 and r - b > 50 and g > b + 30:
        return 'gold'
    if r > 180 and g > 160 and b > 110:
        return 'cream'
    if r >= b + 12 and r > g + 25 and b >= g + 6:
        return 'crimson'
    if b >= r - 6 and b > g + 6:
        return 'purple'
    if r > g + 4 and r > b:
        return 'leather' if g >= b - 2 else 'crimson'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    out = np.empty((H, W), object)
    for y in range(H):
        for x in range(W):
            out[y, x] = kind(a[y, x])
    return out


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def inside(pts, H, W):
    """The cells whose centres lie inside a polygon of his cell corners (even-odd rule)."""
    m = np.zeros((H, W), bool)
    n = len(pts)
    xs_c = np.arange(W) + 0.5
    for y in range(H):
        cy = y + 0.5
        xs = []
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 <= cy < y1) or (y1 <= cy < y0):
                xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            m[y] |= (xs[k] <= xs_c) & (xs_c < xs[k + 1])
    return m


def rect(x0, y0, x1, y1):
    """A rectangle of his cell corners."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def background(a, outfit):
    """His ground round the figure: the ground colour reached from the outfit's columns' edges, and the
    gaps he left between an arm and the body (POCKETS: his ground shut in by his figure, a real gap)."""
    H, W, _ = a.shape
    x0, x1 = OUTFITS[outfit]['cols']
    g = is_ground(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(x0, x1)] + [(y, x) for x in (x0, x1 - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and x0 <= x < x1) or bg[y, x] or not g[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    for px, py in POCKETS.get(outfit, ()):
        stack = [(py, px)]
        while stack:
            y, x = stack.pop()
            if not (0 <= y < H and x0 <= x < x1) or bg[y, x] or not g[y, x]:
                continue
            bg[y, x] = True
            stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    out = np.ones((H, W), bool)
    out[:, x0:x1] = bg[:, x0:x1]
    return out


# His ground shut in by his figure (a gap between an arm and the body, or between the legs): one cell of
# each, his cell (x, y).
POCKETS = {
    'sorceress': [(220, 100)],
    'alchemist': [(378, 100)],
}

# The kinds each piece takes.
ALL = ('line', 'dark', 'skin', 'gold', 'cream', 'steel', 'crimson', 'purple', 'violet', 'green', 'teal', 'leather')
_GLOVE_S = ('dark', 'line', 'purple', 'leather', 'steel', 'crimson')
_CLOTH_S = ('dark', 'line', 'purple', 'crimson', 'gold', 'leather', 'steel', 'violet')
_LEG_S = ('dark', 'line', 'purple', 'leather', 'steel')
_GLOVE_A = ('dark', 'line', 'leather', 'steel', 'gold', 'crimson', 'skin', 'purple')
_BRACER_A = ('dark', 'line', 'leather', 'steel', 'gold', 'green', 'teal', 'crimson', 'cream')
_CLOTH_A = ('dark', 'line', 'green', 'teal', 'gold', 'leather', 'purple')
_LEG_A = ('dark', 'line', 'leather', 'steel', 'gold', 'cream', 'crimson', 'skin')

# The pieces of each figure, front to back: (name, the regions it is cut from (polygons of his cell
# corners), the kinds of his colours it takes there). A cell of his goes to the first piece whose region holds
# it and whose kinds take it ('head' and 'staff' are her head and staff, which the game draws as they are; the
# skin his cells show between the pieces, as at her elbows, goes to no piece: there our body shows).
PARTS = {
    'sorceress': [
        ('staff', [[(284, 147), (293, 147), (293, 163), (286, 163)], rect(293, 140, 336, 230)], ALL),
        ('hand_f', [rect(274, 134, 296, 158)], _GLOVE_S),
        ('cuff_f', [rect(264, 111, 292, 136)], _GLOVE_S),
        ('hand_n', [rect(182, 137, 207, 158)], _GLOVE_S),
        ('cuff_n', [rect(186, 111, 213, 138)], _GLOVE_S),
        ('head', [[(195, 0), (300, 0), (300, 53), (263, 53), (263, 61), (254, 61), (254, 57), (240, 57), (239, 63), (228, 63), (228, 53), (195, 53)]], ALL),
        ('sash', [rect(220, 106, 285, 128), rect(256, 125, 292, 215)], ('crimson', 'line')),
        ('bodice', [[(232, 53), (270, 53), (270, 70), (263, 70), (263, 121), (232, 121)]], ALL),
        ('slit_n', [rect(226, 148, 242, 175)], ('skin', 'line')),
        ('slit_f', [rect(262, 158, 274, 175)], ('skin', 'line')),
        ('sleeve_n', [[(178, 58), (234, 58), (234, 64), (232, 108), (214, 108), (212, 140), (200, 160), (178, 160)]], _CLOTH_S),
        ('sleeve_f', [[(260, 58), (300, 58), (300, 150), (268, 150), (268, 112), (262, 112), (262, 70)]], _CLOTH_S),
        ('front', [rect(238, 120, 264, 236)], _CLOTH_S),
        ('leg_n', [[(213, 170), (240, 170), (238, 180), (232, 195), (228, 205), (222, 215), (220, 267), (196, 267), (198, 215), (206, 205), (212, 205)]], _LEG_S),
        ('near', [[(176, 118), (238, 118), (236, 150), (224, 165), (212, 172), (206, 205), (198, 215), (196, 250), (176, 250)]], _CLOTH_S),
        ('leg_f', [[(260, 170), (278, 170), (278, 240), (296, 250), (296, 267), (254, 267), (254, 205), (260, 200)]], _LEG_S),
        ('far', [[(266, 125), (300, 125), (300, 250), (278, 250), (278, 170), (266, 170)]], _CLOTH_S),
        ('lining', [[(214, 165), (288, 165), (288, 248), (196, 248)]], _CLOTH_S),
    ],
    'alchemist': [
        ('staff', [[(440, 146), (452, 146), (452, 166), (446, 166)], rect(450, 140, 479, 235)], ALL),
        ('hand_f', [rect(424, 134, 450, 160)], _GLOVE_A),
        ('bracer_f', [rect(420, 106, 446, 136)], _BRACER_A),
        ('hand_n', [rect(344, 133, 374, 160)], _GLOVE_A),
        ('bracer_n', [rect(346, 106, 377, 136)], _BRACER_A),
        ('head', [[(340, 0), (450, 0), (450, 52), (421, 52), (421, 59), (412, 59), (412, 57), (398, 57), (397, 63), (386, 63), (386, 52), (340, 52)]], ALL),
        ('pauldron', [[(358, 53), (396, 53), (396, 70), (390, 93), (358, 93)]], ('leather', 'steel', 'dark', 'line', 'gold', 'cream', 'crimson', 'skin', 'purple')),
        ('belt', [[(376, 108), (400, 108), (400, 113), (432, 111), (432, 127), (400, 133), (398, 152), (362, 152), (362, 124), (376, 124)]], ALL),
        ('sleeve_n', [rect(348, 84, 386, 113)], ('cream', 'gold', 'skin', 'line', 'leather', 'dark')),
        ('sleeve_f', [rect(422, 84, 440, 113)], ('cream', 'gold', 'skin', 'line', 'leather', 'dark')),
        ('bodice', [[(378, 52), (430, 52), (430, 113), (378, 113)]], ALL),
        ('front', [rect(396, 126, 423, 212)], _CLOTH_A),
        ('leg_n', [[(390, 146), (398, 146), (398, 205), (386, 240), (380, 267), (348, 267), (354, 240), (360, 214), (368, 205), (371, 190), (374, 180), (377, 170), (381, 160), (387, 150)]], _LEG_A),
        ('near', [[(336, 118), (398, 118), (398, 135), (386, 150), (380, 160), (376, 170), (373, 180), (371, 190), (368, 205), (360, 240), (336, 240)]], _CLOTH_A),
        ('leg_f', [[(413, 145), (431, 145), (434, 205), (436, 240), (454, 250), (454, 267), (410, 267), (413, 240), (415, 205)]], _LEG_A),
        ('far', [[(420, 118), (452, 118), (452, 245), (436, 245), (432, 200), (428, 150), (420, 150)]], _CLOTH_A),
        ('lining', [rect(368, 145, 436, 240)], ALL),
    ],
}
CELLWISE = {n for parts in PARTS.values() for n, _, _ in parts}


def components(a, K):
    """His figure's cells inside his black line, in patches (4-neighbours) of cells that are not line."""
    H, W, _ = a.shape
    solid = (K != 'line') & (K != 'ground')
    lab = np.full((H, W), -1, int)
    n = 0
    for y in range(H):
        for x in range(W):
            if not solid[y, x] or lab[y, x] >= 0:
                continue
            stack = [(y, x)]
            lab[y, x] = n
            while stack:
                q, p = stack.pop()
                for dq, dp in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = q + dq, p + dp
                    if 0 <= yy < H and 0 <= xx < W and solid[yy, xx] and lab[yy, xx] < 0:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
            n += 1
    return lab, n


# A patch of his (inside his line) goes whole to the piece most of its cells vote for, unless a second piece
# has SPLIT of them: then each cell goes its own way.
SPLIT = 0.3
FOREIGN = 8


def labels(a, K, bg, parts):
    """Which piece each cell of his is (parts order): each patch inside his line goes whole to one piece, so
    the pieces part along his own line; his line goes to the piece in front of those it bounds (the first in
    parts), or inside one piece to that piece. '' for his ground round him and what no piece takes."""
    H, W, _ = a.shape
    vote = np.full((H, W), '', object)
    for name, regions, takes in parts:
        reg = np.zeros((H, W), bool)
        for pts in regions:
            reg |= inside(pts, H, W)
        m = reg & ~bg & (vote == '') & np.isin(K, takes)
        vote[m] = name
    comp, n = components(a, K)
    out = np.full((H, W), '', object)
    order = {}
    for i, p in enumerate(parts):
        order.setdefault(p[0], i)
    for c in range(n):
        ys, xs = np.nonzero(comp == c)
        votes = {}
        for y, x in zip(ys, xs):
            if bg[y, x]:
                continue
            if vote[y, x] in CELLWISE:
                out[y, x] = vote[y, x]
            elif vote[y, x]:
                votes[vote[y, x]] = votes.get(vote[y, x], 0) + 1
        if not votes:
            continue
        ranked = sorted(votes.items(), key=lambda kv: (-kv[1], order[kv[0]]))
        if len(ranked) > 1 and ranked[1][1] >= SPLIT * len(ys):
            for y, x in zip(ys, xs):
                if not out[y, x] and not bg[y, x]:
                    out[y, x] = vote[y, x]
        else:
            for y, x in zip(ys, xs):
                if not out[y, x] and not bg[y, x] and vote[y, x]:
                    out[y, x] = ranked[0][0]
    takes = {}
    for name, _, t in parts:
        takes.setdefault(name, set()).update(t)
    foreign = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(out != '')):
        foreign[y, x] = K[y, x] not in takes[out[y, x]] and bool(vote[y, x])
    seen = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(foreign)):
        if seen[y, x]:
            continue
        group, stack = [], [(y, x)]
        seen[y, x] = True
        while stack:
            q, p = stack.pop()
            group.append((q, p))
            for dq, dp in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = q + dq, p + dp
                if 0 <= yy < H and 0 <= xx < W and foreign[yy, xx] and not seen[yy, xx] and out[yy, xx] == out[y, x]:
                    seen[yy, xx] = True
                    stack.append((yy, xx))
        if len(group) >= FOREIGN:
            for q, p in group:
                out[q, p] = vote[q, p]
    line = (K == 'line') & ~bg
    for y, x in zip(*np.nonzero(line)):
        near = set()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and out[yy, xx] and K[yy, xx] != 'line':
                    near.add(out[yy, xx])
        if near:
            out[y, x] = min(near, key=lambda q: order[q])
    for _ in range(4):
        todo = list(zip(*np.nonzero(line & (out == ''))))
        got = {}
        for y, x in todo:
            near = [out[y + dy, x + dx] for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)) if 0 <= y + dy < H and 0 <= x + dx < W and out[y + dy, x + dx]]
            if near:
                got[(y, x)] = min(near, key=lambda q: order[q])
        for (y, x), n_ in got.items():
            out[y, x] = n_
    for y, x in zip(*np.nonzero(line & (out == ''))):
        out[y, x] = vote[y, x]
    return out


# ---------------------------------------------------------------------------------------------------
# Bringing his figure down to our scale (bronze_ref.py reduce, his ground for the white round him)
# ---------------------------------------------------------------------------------------------------
FIG = 0.5
LINE_IN = 0.7
# His face's line where it covers this much (his brows and lids are drawn heavy and black: half a pixel of
# them is his lid line at our scale, not a reddish shadow).
LINE_IN_OF = {'face': 0.5}
FLAT = 34
# How much of a pixel his dark half must cover to win it (pick_colour); MODE 'mode' takes the commonest
# colour under it whatever its lightness.
DARK_WINS = 'balance'
# MODE 'surface': after that, each pixel left on his light half takes the shade of its material (his ramp)
# nearest the lightness of his surface round it, so his bronze reads as smooth plates in his shades rather
# than his brush's grain; the pixels on his dark half (SURFACE_DARK: all of them) keep his dark.
MODE = 'surface'
BIG_PATCH = 200
# The dark share a piece's pixel needs to be dark, where it is not DARK_WINS (his face: his red eyes and
# lash are dark against his skin, and must stay).
DARK_WINS_OF = {'face': 0.45}
# Pieces whose every pixel is his commonest colour under it (his leather chest's dark leather, its fine quilting
# and the laces' bars left to his marks).
COMMONEST = ('lchest',)
# The fine pixels his small marks were laid on in the last reduce(): the cleaning keeps them (they are his
# highlights, not specks).
MARKS = set()
SMOOTH = 2
# Pieces whose pixels are not smoothed with their neighbours' (his face's eyes and mouth are single pixels;
# the skirt's meander and studs, the hair's strands are drawn fine).
NO_SMOOTH = ('face', 'hair', 'diadem', 'skirt')
FEATURE = (2, 30)
FEATURE_CONTRAST = 45
NO_FEATURES = ('face',)
KEEP_SPLIT = ('face', 'hair', 'diadem')
SURFACE_DARK = 0.0
# Pieces whose surface is all one material of his (his iron pauldrons: his grey iron, never his gold trim
# spread over it; the cleaning draws his trim back as his lines).
SURFACE_KIND = {'lpauldron_n': 'leather', 'lpauldron_f': 'leather'}
SURFACE_GREY = 18


def footprint(M, i, j):
    """The cells of his under fine pixel (i, j) and how much of the pixel each covers."""
    x0, y0 = M.his((i, j))
    x1, y1 = M.his((i + 1, j + 1))
    out = []
    for y in range(int(np.floor(y0)), int(np.ceil(y1))):
        wy = min(y + 1, y1) - max(y, y0)
        if wy <= 0:
            continue
        for x in range(int(np.floor(x0)), int(np.ceil(x1))):
            wx = min(x + 1, x1) - max(x, x0)
            if wx > 0:
                out.append((y, x, wx * wy / ((x1 - x0) * (y1 - y0))))
    return out


def ramps(a, lab, K):
    """Each piece's colours of each kind ({(piece, kind): [rgb, ...] darkest first}), those he used at least
    RAMP_MIN times in it: the shades a pixel of that piece and material is picked from (MODE 'ramp')."""
    seen = {}
    H, W = lab.shape
    for y in range(H):
        for x in range(W):
            if lab[y, x] and K[y, x] not in ('line', 'ground'):
                key = (lab[y, x], K[y, x])
                c = tuple(int(v) for v in a[y, x])
                seen.setdefault(key, {})
                seen[key][c] = seen[key].get(c, 0) + 1
    out = {}
    for key, cs in seen.items():
        keep = [c for c, n in cs.items() if n >= RAMP_MIN] or [max(cs, key=lambda c: cs[c])]
        out[key] = sorted(keep, key=lambda c: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], c))
    return out


RAMP_MIN = 3


def split_colours(cells, a):
    """His cells under a fine pixel split into a dark and a light half (Otsu): (dark colour, light colour,
    how much of the pixel the dark half covers), each half's commonest colour. All near one lightness
    (within FLAT): that colour twice and 0."""
    L = [(float(luma(a[y, x])), w, tuple(int(v) for v in a[y, x])) for y, x, w in cells]
    lo, hi = min(l for l, _, _ in L), max(l for l, _, _ in L)

    def commonest(group):
        tally = {}
        for _, w, c in group:
            tally[c] = tally.get(c, 0) + w
        return max(sorted(tally), key=lambda c: tally[c])

    if hi - lo <= FLAT:
        c = commonest(L)
        return c, c, 0.0
    best, cut = -1, None
    for t in sorted(set(l for l, _, _ in L))[:-1]:
        d = [(l, w) for l, w, _ in L if l <= t]
        u = [(l, w) for l, w, _ in L if l > t]
        wd, wu = sum(w for _, w in d), sum(w for _, w in u)
        md, mu = sum(l * w for l, w in d) / wd, sum(l * w for l, w in u) / wu
        score = wd * wu * (md - mu) ** 2
        if score > best + 1e-9:
            best, cut = score, t
    dark = [c for c in L if c[0] <= cut]
    light = [c for c in L if c[0] > cut]
    wd = sum(w for _, w, _ in dark)
    return commonest(dark), commonest(light), wd / (wd + sum(w for _, w, _ in light))


def pick_colour(cells, a, K=None, ramp=None, piece=None):
    """One of his colours for a fine pixel: the cells (y, x, weight) of one piece under it."""
    if MODE == 'ramp' and ramp is not None:
        # the material most of it is (his darks and line count with the material they shade), and that
        # material's shade of his nearest the pixel's mean lightness
        w_kind = {}
        for y, x, w in cells:
            k = K[y, x]
            if k not in ('line', 'dark', 'white'):
                w_kind[k] = w_kind.get(k, 0) + w
        if w_kind:
            m = max(sorted(w_kind), key=lambda k: w_kind[k])
            r = ramp.get((piece, m))
            if r:
                tot = sum(w for _, _, w in cells)
                mean = sum(float(luma(a[y, x])) * w for y, x, w in cells) / tot
                return min(r, key=lambda c: (abs(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] - mean), c))
    L = [(float(luma(a[y, x])), w, tuple(int(v) for v in a[y, x])) for y, x, w in cells]
    lo, hi = min(l for l, _, _ in L), max(l for l, _, _ in L)
    group = L
    if hi - lo > FLAT and MODE == 'split':
        # the split of his cells into a dark and a light half that parts them most (Otsu)
        best, cut = -1, None
        for t in sorted(set(l for l, _, _ in L))[:-1]:
            d = [(l, w) for l, w, _ in L if l <= t]
            u = [(l, w) for l, w, _ in L if l > t]
            wd, wu = sum(w for _, w in d), sum(w for _, w in u)
            md, mu = sum(l * w for l, w in d) / wd, sum(l * w for l, w in u) / wu
            score = wd * wu * (md - mu) ** 2
            if score > best + 1e-9:
                best, cut = score, t
        dark = [c for c in L if c[0] <= cut]
        light = [c for c in L if c[0] > cut]
        wd = sum(w for _, w, _ in dark)
        group = dark if wd > DARK_WINS * (wd + sum(w for _, w, _ in light)) else light
    tally = {}
    for _, w, c in group:
        tally[c] = tally.get(c, 0) + w
    return max(sorted(tally), key=lambda c: tally[c])


def reduce(a, lab, names, M, K=None, own=None, order=None):
    """The pieces `names` of his figure brought down to our scale by M, in our 256 x 256 frame: `who` (which
    piece each fine pixel is, '' for none), `col` (its colour, one of his) and `isl` (whether it is his line).

    1. Each fine pixel is the piece that covers most of it (if his figure covers FIG of it), in one of his
       colours under it (pick_colour); his line where his line covers LINE_IN of it and runs on into the
       line next to it.
    2. His line round each piece where it meets the white, and between two pieces or two broad patches of
       one piece (BIG_PATCH cells or more: a strap and the skirt, the pauldron's rim and its strips) where
       his picture has his line between them, on the side of the piece that owns his line there.
    3. Cleaned in his palette only: of two lines side by side inside a piece (his line falling across two
       fine pixels), the one his line covers less takes its colour again; a lone pixel lighter or darker
       than every neighbour, that his colours under it barely hold (SPECK), takes its neighbours' colour."""
    if K is None:
        K = kinds(a)
    H, W = lab.shape
    line = K == 'line'
    black = his_line(a)
    order = order or {n: i for i, n in enumerate(names)}
    sel = np.isin(lab, list(names))
    ramp = ramps(a, lab, K)
    comp, nc = components(a, K)
    size = np.bincount(comp[comp >= 0].ravel(), minlength=nc)
    ys, xs = np.nonzero(sel)
    fx0, fy0 = M.fine((xs.min(), ys.min()))
    fx1, fy1 = M.fine((xs.max() + 1, ys.max() + 1))
    G = 256
    who = np.full((G, G), '', object)
    col = np.zeros((G, G, 3), np.int32)
    isl = np.zeros((G, G), bool)
    MARKS.clear()
    mark_col = {}
    frac = np.zeros((G, G))
    support = np.ones((G, G))
    patch = np.full((G, G), -1, int)
    feet = {}
    halves = {}
    surf = {}
    dfrac = np.zeros((G, G))
    for j in range(int(np.floor(fy0)), int(np.ceil(fy1))):
        for i in range(int(np.floor(fx0)), int(np.ceil(fx1))):
            cells = [(y, x, w) for y, x, w in footprint(M, i, j) if 0 <= y < H and 0 <= x < W]
            cover = {}
            for y, x, w in cells:
                n = lab[y, x]
                if n in names:
                    cover[n] = cover.get(n, 0) + w
            if not cover or sum(cover.values()) < FIG:
                continue
            n = max(sorted(cover, key=lambda q: order[q]), key=lambda q: cover[q])
            mine = [(y, x, w) for y, x, w in cells if lab[y, x] == n]
            feet[(j, i)] = cells
            who[j, i] = n
            frac[j, i] = sum(w for y, x, w in mine if line[y, x]) / cover[n]
            solid = [(y, x, w) for y, x, w in mine if not line[y, x]] or mine
            dk, lt, fd = split_colours(solid, a)
            halves[(j, i)] = (dk, lt)
            # the lightness of his surface under it (the light half, or all of it when flat) and its material
            Ls = sorted((float(luma(a[y, x])), w, K[y, x]) for y, x, w in solid if n not in SURFACE_KIND or K[y, x] == SURFACE_KIND[n]) or sorted((float(luma(a[y, x])), w, K[y, x]) for y, x, w in solid)
            wsum = sum(w for _, w, _ in Ls)
            if fd > 0:
                lthr = 0.299 * dk[0] + 0.587 * dk[1] + 0.114 * dk[2]
                lights = [(l, w, k) for l, w, k in Ls if l > lthr] or Ls
            else:
                lights = Ls
            surf[(j, i)] = (sum(l * w for l, w, _ in lights) / sum(w for _, w, _ in lights), max(sorted(set(k for _, _, k in lights)), key=lambda k: sum(w for _, w, kk in lights if kk == k)))
            dfrac[j, i] = fd
            c = dk if fd > DARK_WINS_OF.get(n, DARK_WINS if DARK_WINS != 'balance' else 0.5) else lt
            if n in COMMONEST:
                tally = {}
                for y, x, w in solid:
                    t = tuple(int(v) for v in a[y, x])
                    tally[t] = tally.get(t, 0) + w
                c = max(sorted(tally), key=lambda t: tally[t])
            col[j, i] = c
            support[j, i] = sum(w for y, x, w in solid if max(abs(int(a[y, x][k]) - c[k]) for k in range(3)) <= 40) / cover[n]
            big = {}
            for y, x, w in solid:
                if comp[y, x] >= 0 and size[comp[y, x]] >= BIG_PATCH:
                    big[comp[y, x]] = big.get(comp[y, x], 0) + w
            if big:
                patch[j, i] = max(sorted(big), key=lambda q: big[q])
    fig = who != ''
    # The dark or light half of each pixel, decided on its dark share smoothed with its neighbours' in the
    # same piece (SMOOTH: its own share counts that many times), so his engraving and his bronze come out in
    # clusters as his brush strokes do, not in single pixels.
    if SMOOTH:
        sm = {}
        for (j, i), (dk, lt) in halves.items():
            n = who[j, i]
            if n in NO_SMOOTH or n in COMMONEST:
                continue
            tot, wsum = SMOOTH * dfrac[j, i], SMOOTH
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    q = (j + dj, i + di)
                    if (dj or di) and who[q] == n and q in halves:
                        tot += dfrac[q]
                        wsum += 1
            sm[(j, i)] = tot / wsum
        # DARK_WINS 'balance': each piece as dark as his is, its dark half on as many of its pixels (those whose
        # smoothed dark share is the greatest) as his dark half covers of it
        cut = {}
        if DARK_WINS == 'balance':
            for n in set(who[q] for q in sm):
                qs = [q for q in sm if who[q] == n and tuple(halves[q][0]) != tuple(halves[q][1])]
                if not qs:
                    continue
                share = float(np.mean([dfrac[q] for q in qs]))
                vals = sorted((sm[q] for q in qs), reverse=True)
                k = int(round(share * len(vals)))
                cut[n] = vals[k - 1] - 1e-9 if k > 0 else 2.0
        for (j, i), v_ in sm.items():
            dk, lt = halves[(j, i)]
            n = who[j, i]
            t = DARK_WINS_OF.get(n, cut.get(n, DARK_WINS if DARK_WINS != 'balance' else 0.5))
            col[j, i] = dk if v_ > t else lt
    if MODE == 'surface':
        # the light half's lightness smoothed with its neighbours', as the material's shade of his nearest it
        for (j, i), (dk, lt) in halves.items():
            n = who[j, i]
            if n in KEEP_SPLIT or tuple(col[j, i]) == tuple(dk) and dfrac[j, i] > SURFACE_DARK:
                continue
            l0, k0 = surf[(j, i)]
            k0 = SURFACE_KIND.get(n, k0)
            tot, wsum = 2 * l0, 2
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    q = (j + dj, i + di)
                    if (dj or di) and who[q] == n and q in surf and (surf[q][1] == k0 or n in SURFACE_KIND):
                        tot += surf[q][0]
                        wsum += 1
            r = ramp.get((n, k0))
            if r and n in SURFACE_KIND:
                # (his greys of it, not the brown leather of the same kind)
                r = [c for c in r if max(c) - min(c) <= SURFACE_GREY] or r
            if r:
                m = tot / wsum
                col[j, i] = min(r, key=lambda c: (abs(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] - m), c))
    # His small marks (a stud, a glint, a tassel's strand, a key of the meander: a patch of his between
    # FEATURE cells inside his line, standing out from what is round it by FEATURE_CONTRAST in lightness):
    # each in its own commonest colour at the fine pixel its middle lands on (the biggest where several do),
    # so each reads as his mark and not as a blur.
    if FEATURE:
        marks = {}
        for c in range(nc):
            if not (FEATURE[0] <= size[c] <= FEATURE[1]):
                continue
            cy, cx = np.nonzero(comp == c)
            n = lab[cy[0], cx[0]]
            if n not in names or n in NO_FEATURES:
                continue
            ring = set()
            for y, x in zip(cy, cx):
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H and 0 <= xx < W and comp[yy, xx] != c and lab[yy, xx] == n and not line[yy, xx]:
                            ring.add((yy, xx))
            if not ring:
                continue
            mine = float(np.mean([luma(a[y, x]) for y, x in zip(cy, cx)]))
            round_ = float(np.mean([luma(a[y, x]) for y, x in ring]))
            if abs(mine - round_) < FEATURE_CONTRAST:
                continue
            tally = {}
            for y, x in zip(cy, cx):
                t = tuple(int(v) for v in a[y, x])
                tally[t] = tally.get(t, 0) + 1
            fx, fy = M.fine((cx.mean() + 0.5, cy.mean() + 0.5))
            q = (int(np.floor(fy)), int(np.floor(fx)))
            marks.setdefault(q, []).append((len(cy), max(sorted(tally), key=lambda t: tally[t]), n))
        for q, ms in marks.items():
            # (where his marks crowd into one pixel, the biggest of them)
            size_, c_, n_ = max(ms)
            if who[q] == n_:
                col[q] = c_
                MARKS.add(q)
                mark_col[q] = c_
    # 1. his line through the pixel
    cand = fig & (frac >= np.vectorize(lambda n: LINE_IN_OF.get(n, LINE_IN))(who))
    for j, i in zip(*np.nonzero(cand)):
        if any(cand[j + dj, i + di] for dj in (-1, 0, 1) for di in (-1, 0, 1) if dj or di):
            isl[j, i] = True
    # 2. round the pieces: the white, and his line between two pieces or two broad patches
    owner_line = {}
    for (j, i), cells in feet.items():
        t = {}
        for y, x, w in cells:
            if line[y, x] and lab[y, x]:
                t[lab[y, x]] = t.get(lab[y, x], 0) + w
        owner_line[(j, i)] = t
    for j, i in zip(*np.nonzero(fig)):
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (j + dj, i + di)
            if not fig[q]:
                # the edge of the piece: his line where he drew his line round it there (or where the piece
                # was continued under another: no colour of his closes it); where his piece ends in its own
                # colour (the diadem's brown edge), that colour
                cells = feet[(j, i)]
                tot = sum(w for _, _, w in cells)
                lw = sum(w for y, x, w in around(cells, H, W) if line[y, x])
                cont = own is not None and sum(w for y, x, w in cells if lab[y, x] and not own[y, x]) > 0.5 * tot
                if cont or lw >= SIL_LINE * tot or K[cells[0][0], cells[0][1]] == 'dark':
                    isl[j, i] = True
                continue
            n, m = who[j, i], who[q]
            if n == m and (patch[j, i] == patch[q] or patch[j, i] < 0 or patch[q] < 0):
                continue
            # his line between them, and whose it is
            here, there = owner_line[(j, i)], owner_line[q]
            amount = sum(here.values()) + sum(there.values())
            if amount < BETWEEN:
                continue
            mine = here.get(n, 0) + there.get(n, 0)
            theirs = here.get(m, 0) + there.get(m, 0)
            if n != m and mine < theirs:
                continue
            if n == m and frac[j, i] < frac[q]:
                continue
            isl[j, i] = True
    # 3. two lines side by side inside a piece: the one his line covers less is its colour again
    for j, i in zip(*np.nonzero(isl)):
        for dj, di in ((0, 1), (1, 0)):
            q = (j + dj, i + di)
            r0 = (j - dj, i - di)
            r1 = (j + 2 * dj, i + 2 * di)
            if not isl[q] or who[q] != who[j, i]:
                continue
            if not (fig[r0] and fig[r1] and not isl[r0] and not isl[r1]):
                continue
            if frac[j, i] < frac[q]:
                isl[j, i] = False
            elif frac[q] < frac[j, i]:
                isl[q] = False
    # lone specks
    lum = luma(col.astype(float))
    fixed = col.copy()
    for j, i in zip(*np.nonzero(fig & ~isl)):
        nb = [(j + dj, i + di) for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)) if fig[j + dj, i + di] and not isl[j + dj, i + di] and who[j + dj, i + di] == who[j, i]]
        if len(nb) < 3 or support[j, i] >= SPECK:
            continue
        ls = [lum[q] for q in nb]
        if lum[j, i] > max(ls) + 8 or lum[j, i] < min(ls) - 8:
            tally = {}
            for q in nb:
                c = tuple(int(v) for v in col[q])
                tally[c] = tally.get(c, 0) + 1
            fixed[j, i] = max(sorted(tally), key=lambda c: tally[c])
    col = fixed
    col[isl] = black
    # his marks (a buckle, a gem, a stud) over his line inside the piece: at our scale the line he drew round
    # each would cover it, and the mark is what reads (never on the piece's edge, where his line closes it)
    if MARKS_OVER_LINE:
        for q in MARKS:
            j, i = q
            if all(fig[j + dj, i + di] for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                col[q] = mark_col[q]
                isl[q] = False
    return who, col, isl


def around(cells, H, W):
    """A fine pixel's cells and the cells round them (each with the weight of the cell it borders)."""
    seen = {}
    for y, x, w in cells:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W:
                    seen[(yy, xx)] = max(seen.get((yy, xx), 0), w)
    return [(y, x, w) for (y, x), w in seen.items()]


# How much of his line (in a fine pixel and the cells round it) makes a piece's edge his line.
SIL_LINE = 0.05
# How much of his line two neighbouring fine pixels must hold for his line to part them (reduce, step 2).
BETWEEN = 0.25
# A lone pixel his colours under it hold less than this much of is a speck (reduce, step 3).
SPECK = 0.45


# ---------------------------------------------------------------------------------------------------
# His pieces on their own, continued under the pieces in front of them
# ---------------------------------------------------------------------------------------------------

# 1 px lines; his motifs (spirals, the lion, the meander) as their cleanest reading among his pixels: each in
# his own colours of that motif, at its place.
# ---------------------------------------------------------------------------------------------------
CLEAN = True
# A pixel unlike three or four of its four neighbours, which agree on one colour of his, takes that colour,
# unless it differs from it by less than SPECK_LUMA in lightness (a shade, not a speck).
SPECK_LUMA = 16
# His gold trim: a run of his light cells (TRIM_DELTA lighter than the piece round it) at least TRIM_LEN of
# his cells long and thin (no more than TRIM_THICK of his cells across, on average).
TRIM_DELTA = 30
TRIM_LEN = 8
# His gold trim and thorns over his line inside a piece (the thin black line he drew round them would cover
# them at our scale); his marks the same (reduce).
TRIM_OVER_LINE = True
MARKS_OVER_LINE = True
TRIM_THICK = 1.7

def commonest(cells, a):
    tally = {}
    for y, x in cells:
        t = tuple(int(v) for v in a[y, x])
        tally[t] = tally.get(t, 0) + 1
    return max(sorted(tally), key=lambda t: tally[t]) if tally else None


def clean(a, lab, name, m, col, isl, M, K=None):
    H, W = lab.shape
    K = kinds(a) if K is None else K
    Lg = luma(a.astype(float))
    mine = lab == name
    keep = isl.copy()
    for q in MARKS:
        keep[q] = True
    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    # 1. specks
    for _ in range(2):
        out = col.copy()
        for j, i in zip(*np.nonzero(m & ~keep)):
            nb = [tuple(int(v) for v in col[j + dj, i + di]) for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)) if m[j + dj, i + di] and not isl[j + dj, i + di]]
            if len(nb) < 3:
                continue
            tally = {}
            for c in nb:
                tally[c] = tally.get(c, 0) + 1
            c, n = max(sorted(tally.items()), key=lambda kv: kv[1])
            if n >= 3 and c != tuple(int(v) for v in col[j, i]) and abs(lum(c) - lum(col[j, i])) >= SPECK_LUMA:
                out[j, i] = c
        col[:] = out
    # 2. his gold trim as continuous lines
    ys, xs = np.nonzero(mine)
    mid = np.zeros((H, W))
    for y, x in zip(ys, xs):
        win = Lg[max(0, y - 2):y + 3, max(0, x - 2):x + 3][mine[max(0, y - 2):y + 3, max(0, x - 2):x + 3]]
        mid[y, x] = np.median(win)
    light = mine & (Lg > mid + TRIM_DELTA) & (K != 'line')
    seen = np.zeros((H, W), bool)
    taken = set()
    runs = []
    for y, x in zip(*np.nonzero(light)):
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
                    if 0 <= yy < H and 0 <= xx < W and light[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        gy = [q for q, _ in group]
        gx = [p for _, p in group]
        ext = max(max(gy) - min(gy), max(gx) - min(gx)) + 1
        if ext >= TRIM_LEN and len(group) / ext <= TRIM_THICK:
            runs.append((len(group), group))
    for _, group in sorted(runs, key=lambda r: (-r[0], r[1][0])):
        c = commonest(group, a)
        for y, x in group:
            fx, fy = M.fine((x + 0.5, y + 0.5))
            q = (int(np.floor(fy)), int(np.floor(fx)))
            if not m[q] or (isl[q] and not (TRIM_OVER_LINE and all(m[q[0] + dj, q[1] + di] for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1))))):
                continue
            isl[q] = False
            col[q] = c
            keep[q] = True
            taken.add(q)


# ---------------------------------------------------------------------------------------------------
# His pieces on their own, continued under the pieces in front of them
# ---------------------------------------------------------------------------------------------------
# A piece is continued under the pieces in front of it (FRONT[outfit]: (behind, in front)) by UNDER of his
# cells, each continued cell his nearest own colour, so turned apart from them in a pose it is still his whole
# piece closed by its own line, and at rest the piece in front covers what was continued.
UNDER = 6
FRONT = {
    'sorceress': [
        ('bodice', 'head'), ('bodice', 'sleeve_n'), ('bodice', 'sleeve_f'), ('bodice', 'sash'),
        ('sleeve_n', 'cuff_n'), ('sleeve_n', 'hand_n'), ('sleeve_n', 'head'),
        ('sleeve_f', 'cuff_f'), ('sleeve_f', 'hand_f'), ('sleeve_f', 'bodice'), ('sleeve_f', 'sash'), ('sleeve_f', 'head'),
        ('cuff_n', 'hand_n'), ('cuff_f', 'hand_f'), ('cuff_f', 'staff'), ('hand_f', 'staff'),
        ('sash', 'hand_f'), ('sash', 'cuff_f'), ('sash', 'staff'),
        ('front', 'sash'),
        ('near', 'sash'), ('near', 'hand_n'), ('near', 'cuff_n'), ('near', 'sleeve_n'), ('near', 'leg_n'), ('near', 'slit_n'),
        ('far', 'sash'), ('far', 'hand_f'), ('far', 'cuff_f'), ('far', 'staff'), ('far', 'leg_f'),
        ('lining', 'leg_n'), ('lining', 'leg_f'), ('lining', 'front'), ('lining', 'near'), ('lining', 'far'), ('lining', 'slit_n'), ('lining', 'slit_f'), ('lining', 'sash'),
        ('leg_n', 'near'), ('leg_n', 'front'), ('leg_n', 'lining'),
        ('leg_f', 'front'), ('leg_f', 'far'), ('leg_f', 'sash'), ('leg_f', 'lining'),
        ('slit_n', 'front'), ('slit_n', 'near'), ('slit_f', 'front'), ('slit_f', 'sash'), ('slit_f', 'far'),
    ],
    'alchemist': [
        ('bodice', 'head'), ('bodice', 'pauldron'), ('bodice', 'belt'), ('bodice', 'sleeve_n'), ('bodice', 'sleeve_f'), ('bodice', 'bracer_f'),
        ('sleeve_n', 'pauldron'), ('sleeve_n', 'bracer_n'), ('sleeve_n', 'bodice'),
        ('sleeve_f', 'bracer_f'), ('sleeve_f', 'bodice'), ('sleeve_f', 'belt'),
        ('pauldron', 'head'),
        ('bracer_n', 'hand_n'), ('bracer_f', 'hand_f'), ('hand_f', 'staff'), ('bracer_f', 'staff'),
        ('belt', 'hand_n'), ('belt', 'bracer_n'), ('belt', 'hand_f'), ('belt', 'bracer_f'),
        ('front', 'belt'),
        ('near', 'belt'), ('near', 'hand_n'), ('near', 'bracer_n'), ('near', 'leg_n'),
        ('far', 'belt'), ('far', 'hand_f'), ('far', 'bracer_f'), ('far', 'staff'), ('far', 'leg_f'),
        ('lining', 'leg_n'), ('lining', 'leg_f'), ('lining', 'front'), ('lining', 'near'), ('lining', 'far'), ('lining', 'belt'),
        ('leg_n', 'near'), ('leg_n', 'front'), ('leg_n', 'belt'), ('leg_n', 'lining'),
        ('leg_f', 'front'), ('leg_f', 'far'), ('leg_f', 'belt'), ('leg_f', 'hand_f'), ('leg_f', 'lining'),
    ],
}
# How far (his cells) each piece goes on under those in front of it, where not UNDER.
REACH = {'lining': 60}
# What a piece is continued over besides (his cells, whatever is in front of them there): what a pose shows
# of it that he hid (MORE, in his cells: a polygon per piece).
MORE = {
    'sorceress': {
        # the corset on under the sash to the hips (it closes the dress there without the sash)
        'bodice': [[(232, 106), (264, 106), (266, 132), (230, 132)]],
        # the lining behind her legs, from under the sash to its hem
        'lining': [[(222, 125), (282, 125), (286, 236), (206, 236)]],
    },
    'alchemist': {
        'bodice': [[(380, 108), (428, 108), (430, 134), (378, 134)]],
        # the blouse's sleeves on down under the bracers to the wrists (the bracers are their own item)
        'sleeve_n': [[(352, 100), (378, 100), (372, 136), (348, 136)]],
        'sleeve_f': [[(424, 100), (440, 100), (444, 136), (426, 136)]],
        # the legs on up under the belt and the satchel to the hips
        'leg_n': [[(380, 126), (400, 126), (398, 150), (378, 150)]],
        'lining': [[(380, 128), (424, 128), (428, 228), (370, 228)]],
    },
}


def fronts_of(outfit, name):
    return {f for b, f in FRONT[outfit] if b == name}


def continue_under(a, K, lab, name, fronts, reach=None, more=None):
    """The piece `name` with what the pieces `fronts` hide continued (his cells only, in his colours):
    (mask, colours). `reach`: how many of his cells under them (UNDER); `more`: a mask of cells to fill
    besides (what a pose shows that he hid), filled the same way."""
    H, W = lab.shape
    mine = lab == name
    front = np.isin(lab, list(fronts)) if fronts else np.zeros((H, W), bool)
    reach = UNDER if reach is None else reach
    col = a.copy()
    filled = mine.copy()
    src = mine & (K != 'line')
    dist = np.full((H, W), 10 ** 6, int)
    dist[src] = 0
    frontier = list(zip(*np.nonzero(src)))
    allow = front | (more if more is not None else np.zeros((H, W), bool))
    step = 0
    while frontier:
        step += 1
        nxt = []
        for y, x in frontier:
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and allow[yy, xx] and not filled[yy, xx] and dist[yy, xx] > step:
                    near_more = more is not None and more[yy, xx]
                    if step > reach and not near_more:
                        continue
                    dist[yy, xx] = step
                    filled[yy, xx] = True
                    col[yy, xx] = col[y, x]
                    nxt.append((yy, xx))
        frontier = sorted(set(nxt))
    return filled, col


def reduce_piece(a, K, lab, name, M, mask=None, colours=None):
    """One piece of his alone at our scale (reduce, then clean): (mask, colours, line) in our 256 x 256
    frame, his line all round it. With `mask`/`colours`: the piece continued (continue_under)."""
    if mask is None:
        mask, colours = lab == name, a
    aa = np.full(a.shape, GROUND, np.int32)
    aa[mask] = colours[mask]
    ll = np.full(lab.shape, '', object)
    ll[mask] = name
    KK = K.copy()
    KK[~mask] = 'ground'
    KK[mask] = kinds(aa[mask][None])[0]
    who, col, isl = reduce(aa, ll, [name], M, K=KK, own=(lab == name))
    m = who == name
    if CLEAN:
        clean(aa, ll, name, m, col, isl, M, KK)
    return m, col, isl


def plain(a, lab, M, names=None):
    """His pieces shrunk evenly with nothing chosen: each fine pixel his cell under its middle (for the
    owner's "sin limpiar / limpio" sheet). (256, 256, 4) RGBA."""
    out = np.zeros((256, 256, 4), np.uint8)
    H, W = lab.shape
    sel = lab != '' if names is None else np.isin(lab, list(names))
    for j in range(256):
        for i in range(256):
            x, y = M.his((i + 0.5, j + 0.5))
            x, y = int(np.floor(x)), int(np.floor(y))
            if 0 <= y < H and 0 <= x < W and sel[y, x]:
                out[j, i, :3] = a[y, x]
                out[j, i, 3] = 255
    return out


_LOAD = {}
# A folder to keep his snapped picture and its kinds in between runs (only speed: the same picture gives the
# same arrays), from the environment; none by default.
CACHE = os.environ.get('AURELIA_OUTFITS_CACHE')


def snapped_kinds():
    """His picture snapped to his palette, and its kinds."""
    if CACHE and os.path.exists(os.path.join(CACHE, 'snapped.npy')):
        return np.load(os.path.join(CACHE, 'snapped.npy')), np.load(os.path.join(CACHE, 'kinds.npy'), allow_pickle=True)
    a = snapped(native())
    K = kinds(a)
    if CACHE:
        os.makedirs(CACHE, exist_ok=True)
        np.save(os.path.join(CACHE, 'snapped.npy'), a)
        np.save(os.path.join(CACHE, 'kinds.npy'), K)
    return a, K


def load(outfit):
    """His picture snapped to his palette, its kinds, the ground round this outfit and its pieces' labels."""
    if outfit not in _LOAD:
        a, K = snapped_kinds()
        K = K.copy()
        bg = background(a, outfit)
        # his ground's grey inside his figure (not a gap he left) is a colour of his: his lit glove, a fold
        K[(K == 'ground') & ~bg] = 'steel'
        K[bg] = 'ground'
        lab = labels(a, K, bg, PARTS[outfit])
        _LOAD[outfit] = (a, K, bg, lab)
    return _LOAD[outfit]


# ---------------------------------------------------------------------------------------------------
# The structural reduction (reduce2): his cloth in its commonest colour, his strokes as 1 px lines
# ---------------------------------------------------------------------------------------------------
# At a third of his size his thin strokes (the gold thorns and trim, the buckles, the laces, the light
# pattern on the skirt, the folds he drew in his darkest tones) fall between our pixels: averaged, they are
# lost or smeared into blots. So each stroke of his is thinned to its middle line (thin()) and that line laid
# on the fine pixels its cells' middles land on (one after another a third of a pixel apart: an unbroken 1 px
# line), each pixel in his own colour of the stroke; the cloth round them is the commonest of his cloth's
# colours under each pixel; his line closes the piece's edge; a gem is a 2 x 2 of his gem with his highlight.
# A stroke is a run of his cells LIGHT_T lighter (or DARK_T darker) than the middle of his piece round it
# (STROKE_R cells each way), at least STROKE_MIN cells.
LIGHT_T = 28
DARK_T = 22
STROKE_R = 3
STROKE_MIN = 3
# A fine pixel is his line where his line covers this much of it (his strong inner lines).
LINE_IN2 = 0.75
# How a fine pixel's cloth colour is chosen: 'mean', his colour under it nearest the mean of his cells
# there; 'mode', his commonest colour under it.
BASE = 'mean'
# His line between two of his pieces where it covers this much of the two pixels across the edge.
EDGE_LINE = 0.3
# His gem colours (kinds) and how many of his cells make a gem.
GEM_KINDS = ('violet', 'teal')
GEM_MIN = 3


def thin(mask):
    """Zhang-Suen thinning: the middle line of each stroke, 1 cell wide, as a mask."""
    m = np.pad(mask.astype(np.uint8), 1)
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            P = [np.roll(np.roll(m, dy, 0), dx, 1) for dy, dx in ((1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1))]
            # P2 (north) .. P9 clockwise
            p2, p3, p4, p5, p6, p7, p8, p9 = P
            B = sum(P)
            seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
            A = sum(((seq[k] == 0) & (seq[k + 1] == 1)).astype(int) for k in range(8))
            if step == 0:
                c = (p2 * p4 * p6 == 0) & (p4 * p6 * p8 == 0)
            else:
                c = (p2 * p4 * p8 == 0) & (p2 * p6 * p8 == 0)
            rm = (m == 1) & (B >= 2) & (B <= 6) & (A == 1) & c
            if rm.any():
                m[rm] = 0
                changed = True
    return m[1:-1, 1:-1].astype(bool)


def local_middle(L, mask, r):
    """The median lightness of the piece's cells within r of each cell."""
    H, W = mask.shape
    out = np.zeros((H, W))
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        y0, y1, x0, x1 = max(0, y - r), y + r + 1, max(0, x - r), x + r + 1
        w = L[y0:y1, x0:x1][mask[y0:y1, x0:x1]]
        out[y, x] = np.median(w)
    return out


# A stroke is thin: its cells over its middle line's (STROKE_THICK across on average); a broader patch of
# lighter or darker cells is a surface of his (the skin under the collar), which the cloth's reading keeps.
STROKE_THICK = 2.3


def strokes(a, K, mask):
    """His light and dark strokes in a piece: (light, dark, cells) - the light and the dark strokes thinned to
    their middle lines, and all their cells."""
    L = luma(a.astype(float))
    solid = mask & (K != 'line')
    mid = local_middle(L, solid, STROKE_R)
    out = []
    cells = np.zeros_like(mask)
    for m in (solid & (L > mid + LIGHT_T), solid & (L < mid - DARK_T)):
        keep = np.zeros_like(m)
        lab_, n = components_mask(m)
        for c in range(n):
            g = lab_ == c
            if g.sum() < STROKE_MIN:
                continue
            t = thin(g)
            if g.sum() <= STROKE_THICK * max(1, t.sum()):
                keep |= t
                cells |= g
        out.append(keep)
    return out[0], out[1], cells


def components_mask(m):
    """The 8-connected parts of a mask: (labels, count)."""
    H, W = m.shape
    lab_ = np.full((H, W), -1, int)
    n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab_[y, x] >= 0:
            continue
        st = [(y, x)]
        lab_[y, x] = n
        while st:
            q, p = st.pop()
            for dq in (-1, 0, 1):
                for dp in (-1, 0, 1):
                    yy, xx = q + dq, p + dp
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and lab_[yy, xx] < 0:
                        lab_[yy, xx] = n
                        st.append((yy, xx))
        n += 1
    return lab_, n


def reduce2(a, K, mask, M, black, gems=True, outline_inner=True, his_gap=frozenset()):
    """A piece of his (`mask`: his cells, `a` their colours, K their kinds) at our scale: (m, col, isl) in our
    256 x 256 frame (isl: his line)."""
    H, W = mask.shape
    G = 256
    m = np.zeros((G, G), bool)
    col = np.zeros((G, G, 3), np.int32)
    isl = np.zeros((G, G), bool)
    light, dark, stroke = strokes(a, K, mask)
    ys, xs = np.nonzero(mask)
    fx0, fy0 = M.fine((xs.min(), ys.min()))
    fx1, fy1 = M.fine((xs.max() + 1, ys.max() + 1))
    for j in range(int(np.floor(fy0)), int(np.ceil(fy1))):
        for i in range(int(np.floor(fx0)), int(np.ceil(fx1))):
            cells = [(y, x, w) for y, x, w in footprint(M, i, j) if 0 <= y < H and 0 <= x < W]
            mine = [(y, x, w) for y, x, w in cells if mask[y, x]]
            if sum(w for _, _, w in mine) < FIG:
                continue
            m[j, i] = True
            tot = sum(w for _, _, w in mine)
            lw = sum(w for y, x, w in mine if K[y, x] == 'line')
            if lw >= LINE_IN2 * tot:
                isl[j, i] = True
                col[j, i] = black
                continue
            pick = [(y, x, w) for y, x, w in mine if K[y, x] != 'line'] or mine
            if BASE == 'mode':
                pick = [(y, x, w) for y, x, w in pick if not stroke[y, x]] or pick
                tally = {}
                for y, x, w in pick:
                    t = tuple(int(v) for v in a[y, x])
                    tally[t] = tally.get(t, 0) + w
                col[j, i] = max(sorted(tally), key=lambda t: tally[t])
            else:
                # the colour of his under it nearest the mean of his cells there (his line counted in as far
                # as it covers the pixel: what the eye sees of it from afar)
                mean = sum(w * a[y, x].astype(float) for y, x, w in mine) / tot
                cand = sorted(set(tuple(int(v) for v in a[y, x]) for y, x, w in pick))
                col[j, i] = min(cand, key=lambda t: (float(((np.array(t) - mean) ** 2).sum()), t))
    # his strokes: dark folds first, his light strokes over them
    for s in (dark, light):
        for y, x in zip(*np.nonzero(s)):
            fx, fy = M.fine((x + 0.5, y + 0.5))
            q = (int(np.floor(fy)), int(np.floor(fx)))
            if m[q]:
                col[q] = a[y, x]
                isl[q] = False
    # his gems: 2 x 2, his highlight at the top left, his gem's middle colour and its dark
    if gems:
        gm = mask & np.isin(K, GEM_KINDS)
        lab_, n = components_mask(gm)
        for c in range(n):
            cy, cx = np.nonzero(lab_ == c)
            if len(cy) < GEM_MIN:
                continue
            fx, fy = M.fine((cx.mean() + 0.5, cy.mean() + 0.5))
            i0, j0 = int(np.floor(fx - 0.5)), int(np.floor(fy - 0.5))
            cs = sorted((tuple(int(v) for v in a[y, x]) for y, x in zip(cy, cx)), key=lambda t: (0.299 * t[0] + 0.587 * t[1] + 0.114 * t[2], t))
            hl, mid_, dk = cs[-1], cs[len(cs) // 2], cs[0]
            for (dj, di), c_ in (((0, 0), hl), ((0, 1), mid_), ((1, 0), mid_), ((1, 1), dk)):
                q = (j0 + dj, i0 + di)
                if m[q]:
                    col[q] = c_
                    isl[q] = False
    # his line round the piece: where it meets his ground (the figure's edge, or a gap he left), and where it
    # meets another piece of his with his line between them (EDGE_LINE of the two pixels' cells)
    def cells_of(j, i):
        return [(y, x, w) for y, x, w in footprint(M, i, j) if 0 <= y < H and 0 <= x < W]
    edge = []
    for j, i in zip(*np.nonzero(m)):
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if m[j + dj, i + di]:
                continue
            out_ = cells_of(j + dj, i + di)
            tot = sum(w for _, _, w in out_)
            ground = sum(w for y, x, w in out_ if K[y, x] == 'ground' or (y, x) in his_gap)
            both = out_ + cells_of(j, i)
            lw = sum(w for y, x, w in both if K[y, x] == 'line') / sum(w for _, _, w in both)
            if ground >= 0.5 * tot or lw >= EDGE_LINE or outline_inner:
                edge.append((j, i))
                break
    for q in edge:
        col[q] = black
        isl[q] = True
    return m, col, isl


# ---------------------------------------------------------------------------------------------------
# The pieces at our scale
# ---------------------------------------------------------------------------------------------------
_FINE = {}


def continued(outfit, name):
    """A piece of his continued under what hides it (FRONT, REACH, MORE): (mask, colours, kinds) in his cells."""
    a, K, bg, lab = load(outfit)
    H, W = lab.shape
    fronts = fronts_of(outfit, name)
    more = None
    if name in MORE[outfit]:
        more = np.zeros((H, W), bool)
        for pts in MORE[outfit][name]:
            more |= inside(pts, H, W)
        more &= ~bg
    mask, col = continue_under(a, K, lab, name, fronts, REACH.get(name), more)
    KK = K.copy()
    new = mask & (lab != name)
    for y, x in zip(*np.nonzero(new)):
        KK[y, x] = kind(col[y, x])
    return mask, col, KK


def fine(outfit, name):
    """A piece at our scale: (m, col, isl) in our 256 x 256 frame at our female's idle frame 0."""
    key = (outfit, name)
    if key not in _FINE:
        a, K, bg, lab = load(outfit)
        mask, col, KK = continued(outfit, name)
        _FINE[key] = reduce2(col, KK, mask, body_map(outfit), his_line(a), outline_inner=False)
    m, c, isl = _FINE[key]
    return m.copy(), c.copy(), isl.copy()


def own_fine(outfit, name):
    """What of a piece shows at rest where he drew it (its own cells, not the continued ones), at our scale."""
    a, K, bg, lab = load(outfit)
    M = body_map(outfit)
    own = lab == name
    m, _, _ = fine(outfit, name)
    out = np.zeros_like(m)
    H, W = own.shape
    for j, i in zip(*np.nonzero(m)):
        cells = [(y, x, w) for y, x, w in footprint(M, i, j) if 0 <= y < H and 0 <= x < W]
        if sum(w for y, x, w in cells if own[y, x]) >= FIG * sum(w for _, _, w in cells):
            out[j, i] = True
    return out


# ---------------------------------------------------------------------------------------------------
# Cutting the pieces for the rig, and writing them as TypeScript
# ---------------------------------------------------------------------------------------------------
# How far a forearm's piece reaches on under its upper arm's at the elbow (fine pixels; as Aurelia's sleeves).
UNDER_ELBOW = 3


def seg_angle(a, b):
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def along(p, a, b):
    """How far p lies along a -> b (fine pixels) past a."""
    d = np.array(b, float) - np.array(a, float)
    n = np.hypot(*d)
    return ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n


def split_at(m, a, b, at, reach=0):
    """A piece cut across the segment a -> b at the joint `at` (perpendicular to a -> b): (before, after) masks.
    `after` reaches `reach` fine pixels on under `before`, a pixel inside its edge."""
    before = np.zeros_like(m)
    after = np.zeros_like(m)
    inner = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            inner &= np.roll(np.roll(m, dy, 0), dx, 1)
    d = np.array(b, float) - np.array(a, float)
    u = d / np.hypot(*d)
    for j, i in zip(*np.nonzero(m)):
        s = (i + 0.5 - at[0]) * u[0] + (j + 0.5 - at[1]) * u[1]
        if s < 0:
            before[j, i] = True
            if s >= -reach and inner[j, i]:
                after[j, i] = True
        else:
            after[j, i] = True
    return before, after


def edge_line(m, col, extra, black):
    """The cells of `extra` (a piece's reach under another) on the piece's edge drawn in his line, so the reach,
    shown, is closed."""
    col = col.copy()
    for j, i in zip(*np.nonzero(extra)):
        if not all(m[j + dj, i + di] for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            col[j, i] = black
    return col


class Palette:
    """One letter per colour of his across a module's pieces ('k' his line, '.' empty), letters in the order of
    the roles they recolour by and then from light to dark."""

    def __init__(self, line, roles):
        self.line = hexc(line)
        self.roles = roles
        self.found = {}

    def add(self, m, col, role_of):
        for j, i in zip(*np.nonzero(m)):
            h = hexc(col[j, i])
            if h != self.line:
                self.found.setdefault(h, role_of(col[j, i]))

    def build(self):
        order = list(self.roles) + [None]
        hs = sorted(self.found, key=lambda h: (order.index(self.found[h]) if self.found[h] in order else len(order), -float(luma(np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], float))), h))
        chars = [c for c in CHARS if c not in 'k.\\\'']
        self.char = {h: chars[k] for k, h in enumerate(hs)}
        self.char[self.line] = 'k'
        self.hex = {c: h for h, c in self.char.items()}

    def rows(self, m, col):
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        rows = [''.join(self.char[hexc(col[y, x])] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
        return rows, (x0, y0)

    def chars_of(self, role):
        return ''.join(sorted(c for h, c in self.char.items() if self.found.get(h) == role))


def key(k):
    """A letter as an object key in TypeScript (quoted unless it is a name)."""
    return k if k.isidentifier() else "'" + k + "'"


def ts_painted(name, doc, pal, m, col, pivot, angle):
    """A PaintedPiece (src/sprite/painted.ts): its pivot the fine pixel of our frame on the joint at rest."""
    rows, (ox, oy) = pal.rows(m, col)
    used = sorted({c for r in rows for c in r if c != '.'}, key=lambda c: (c != 'k', c))
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {angle:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(c)}: '{pal.hex[c]}'," for c in used]
    out += ['  },', '};', '']
    return '\n'.join(out)


def fill_rows(rows):
    """For each pixel of his line on the piece's edge, the colour just inside it ('.' elsewhere): the game
    puts that colour where such a pixel is pulled inside the moved piece (aureliaLower.ts placePiece)."""
    H, W = len(rows), len(rows[0])
    at = lambda x, y: rows[y][x] if 0 <= x < W and 0 <= y < H else '.'  # noqa: E731
    out = []
    for y in range(H):
        row = ''
        for x in range(W):
            ch = rows[y][x]
            if not (ch == 'k' and any(at(x + dx, y + dy) == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))):
                row += '.'
                continue
            inner = 'k'
            for d in range(1, 4):
                near = [at(x + dx * d, y + dy * d) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))]
                near = [c for c in near if c not in '.k']
                if near:
                    inner = near[0]
                    break
            row += inner
        out.append(row)
    return out


def ts_skirt(name, doc, pal, m, col, ncols, hang, open_top=0, front=0, far=False, lining=False):
    """A skirt's piece (aureliaLower.ts SkirtPiece): his pixels on our female at idle frame 0 and the columns
    it hangs from (NCOLS evenly across it, top to bottom)."""
    rows, (ox, oy) = pal.rows(m, col)
    H, W = len(rows), len(rows[0])
    xs = [ox + round(W * i / (ncols - 1)) for i in range(ncols)]
    used = sorted({c for r in rows for c in r if c != '.'}, key=lambda c: (c != 'k', c))
    roles = {c: pal.found[pal.hex[c]] for c in used if c != 'k' and pal.found.get(pal.hex[c])}
    out = [f'/** {doc} */', f'export const {name}: SkirtPiece = {{', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  fill: [']
    out += [f"    '{r}'," for r in fill_rows(rows)]
    out += ['  ],', f'  origin: [{ox}, {oy}],',
            '  cols: [' + ', '.join(f'[{x}, {oy}, {x}, {oy + H}]' for x in xs) + '],',
            f"  hang: {'true' if hang else 'false'},", f'  openTop: {open_top},', f'  front: {front},',
            '  colors: { ' + ', '.join(f"{key(c)}: '{pal.hex[c]}'" for c in used) + ' },',
            '  roles: { ' + ', '.join(f"{key(c)}: '{v}'" for c, v in roles.items()) + ' },']
    if far:
        out.append('  far: true,')
    if lining:
        out.append('  lining: true,')
    out.append(f"  line: '{pal.line}',")
    out += ['};', '']
    return '\n'.join(out)


def header(script, what):
    return (f'// {what}: the owner\'s pixels from his sheet of Aurelia\'s outfits\n'
            f'// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by\n'
            f'// tools/refs/{script} (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.\n')


def module_head(script, what, pal, prefix, bases, skin=None, imports="import type { PaintedPiece } from '../painted';"):
    """The top of a generated module: its import, his line, the colours each slot recolours from, the letters of
    each slot and of his skin."""
    out = [header(script, what), imports, '', '/** His black line (never recoloured). */', f"export const {prefix}_LINE = '{pal.line}';",
           '/** The colours the slots recolour from: at these every pixel stays his. */', f'export const {prefix}_BASE: Record<string, string> = {{']
    out += [f"  {k}: '{v}'," for k, v in bases.items()]
    out += ['};', '/** The letters of each slot\'s colours. */', f'export const {prefix}_CHARS: Record<string, string> = {{']
    out += [f"  {r}: '{pal.chars_of(r)}'," for r in pal.roles if pal.chars_of(r)]
    out += ['};']
    if skin:
        out += ['/** His skin\'s letters: drawn in the body\'s skin, at these shades of it. */', f'export const {prefix}_SKIN: Record<string, number> = {{ ' + ', '.join(f'{key(c)}: {v}' for c, v in skin.items()) + ' };']
    out.append('')
    return '\n'.join(out)


def commonest_of(pal, m_cols, role):
    """His commonest colour of a role across these pieces: the slot's base."""
    tally = {}
    for m, col in m_cols:
        for j, i in zip(*np.nonzero(m)):
            h = hexc(col[j, i])
            if pal.found.get(h) == role:
                tally[h] = tally.get(h, 0) + 1
    return max(sorted(tally), key=lambda h: tally[h]) if tally else None


def run(argv, build):
    """A part script's main: `build()` gives the module's text, written to argv[1]."""
    if len(argv) < 2:
        sys.exit(f'usage: python3 -I {argv[0]} <out.ts>')
    write(argv[1], build())


# ---------------------------------------------------------------------------------------------------
# The items' modules (one script per item writes one: tools/refs/aurelia-<outfit>-<item>-from-ref.py)
# ---------------------------------------------------------------------------------------------------
J = JOINTS


def role_by_kind(table):
    """A colour's slot by its kind (table: kind -> slot; missing kinds take the table's None entry)."""
    return lambda c: table.get(kind(c), table.get(None))


def skin_shades(pal):
    """His skin letters' shades of the body's skin, by lightness: his lightest skin the base (3), then the
    shadow (2), the deep shadow (1)."""
    hs = sorted((h for h, r in pal.found.items() if r == 'skin'), key=lambda h: -float(luma(np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float))))
    out = {}
    for k, h in enumerate(hs):
        out[pal.char[h]] = 3 if k == 0 else 2 if k <= max(1, len(hs) // 2) else 1
    return out


def lower_edge(m):
    """Per column, the lowest row of a mask (-1 where the column has none), filled in from the nearest column."""
    cols = {i: int(np.nonzero(m[:, i])[0].max()) for i in range(m.shape[1]) if m[:, i].any()}
    return cols


def below_band(m, band):
    """The cells of `m` lower than the band's lower edge in their column (the nearest column of the band where
    it has none there)."""
    edge = lower_edge(band)
    out = np.zeros_like(m)
    if not edge:
        return out
    ks = sorted(edge)
    for j, i in zip(*np.nonzero(m)):
        e = edge.get(i)
        if e is None:
            e = edge[min(ks, key=lambda q: (abs(q - i), q))]
        if j > e:
            out[j, i] = True
    return out


def vestment_bodice(outfit, script, prefix, band_piece, roles, what):
    """The bodice's module (VestmentArt's bodice, waist and torso span): his bodice down to the band's lower
    edge, and below it the bodice carried on to the hips (under the skirts)."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    m, col, isl = fine(outfit, 'bodice')
    band, _, _ = fine(outfit, band_piece)
    waist = below_band(m, band)
    # the waist closed by his line at its lower edge and sides (it shows only without the skirt)
    wcol = col.copy()
    for j, i in zip(*np.nonzero(waist)):
        if not all(waist[j + dj, i + di] or (dj < 0 and m[j + dj, i + di]) for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            wcol[j, i] = black
    top = m & ~waist
    pal = Palette(black, ['cloth', 'leather', 'gold', 'gem', 'skin'])
    pal.add(top, col, role_by_kind(roles))
    pal.add(waist, wcol, role_by_kind(roles))
    pal.build()
    skin = skin_shades(pal)
    neck = J['neck']
    ang = seg_angle(J['pelvis'], neck)
    bases = {r: commonest_of(pal, [(top, col)], r) for r in ('cloth', 'leather', 'gold', 'gem')}
    bases = {k: v for k, v in bases.items() if v}
    # what of our torso the bodice stands for, below the neck along the torso: from FROM rows under the neck on
    # both sides (above, the sleeves cover the shoulders: they are their own item), to the waist's lower edge
    ys = np.nonzero(waist.any(1))[0]
    to = (ys.max() + 1 if len(ys) else np.nonzero(top.any(1))[0].max() + 1) - neck[1]
    out = [module_head(script, what, pal, prefix, bases, skin)]
    out.append('/** What of our torso the bodice stands for, in fine pixels below the neck along the torso: [near side from, far side from, to]. */')
    out.append(f'export const {prefix}_TORSO_SPAN: [number, number, number] = [{TORSO_FROM:.2f}, {TORSO_FROM:.2f}, {to:.2f}];')
    out.append('')
    out.append(ts_painted(f'{prefix}_BODICE', f'The bodice to the lower edge of the {band_piece} (pivot: the base of the neck).', pal, top, col, neck, ang))
    out.append(ts_painted(f'{prefix}_WAIST', f'The bodice carried on under the {band_piece} to the hips (pivot: the base of the neck).', pal, waist, wcol, neck, ang))
    return '\n'.join(out)


# Where the bodices stand for our torso, below the neck (fine pixels): from the bust down (the sleeves are their
# own item and cover the shoulders).
TORSO_FROM = 6.0


def arm_pieces(outfit, name, side):
    """A sleeve (or a bracer) cut at our elbow: (upper, fore, col) - the forearm's piece reaching on under the
    upper arm's by UNDER_ELBOW, closed in his line there."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    m, col, isl = fine(outfit, name)
    sh, el = J['shoulder' + side], J['elbow' + side]
    upper, fore = split_at(m, sh, el, el, UNDER_ELBOW)
    col = edge_line(fore, col, fore & upper, black)
    return upper, fore, col


def sleeves(outfit, script, prefix, names, roles, what, span_fore=None):
    """The sleeves' module (VestmentArt's sleeves): each sleeve's upper arm and forearm pieces and what of our arm
    they stand for (the whole upper arm; on the forearm to `span_fore` of the way to the wrist, or to the
    sleeve's lower edge)."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    parts = {}
    pal = Palette(black, ['cloth', 'trim', 'gold', 'skin'])
    for side, name in zip(('N', 'F'), names):
        upper, fore, col = arm_pieces(outfit, name, side)
        parts[side] = (upper, fore, col)
        pal.add(upper, col, role_by_kind(roles))
        pal.add(fore, col, role_by_kind(roles))
    pal.build()
    skin = skin_shades(pal)
    bases = {r: commonest_of(pal, [(u, c) for u, f, c in parts.values()] + [(f, c) for u, f, c in parts.values()], r) for r in ('cloth', 'trim', 'gold')}
    bases = {k: v for k, v in bases.items() if v}
    out = [module_head(script, what, pal, prefix, bases, skin)]
    for side, (upper, fore, col) in parts.items():
        sh, el, wr = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        which = 'near' if side == 'N' else 'far'
        out.append(ts_painted(f'{prefix}_UPPER_{side}', f'The {which} sleeve to the elbow (pivot: the shoulder).', pal, upper, col, sh, seg_angle(sh, el)))
        out.append(ts_painted(f'{prefix}_FORE_{side}', f'The {which} sleeve from the elbow (pivot: the elbow).', pal, fore, col, el, seg_angle(el, wr)))
        if span_fore is None:
            ys, xs = np.nonzero(fore)
            t = max(along((x + 0.5, y + 1.0), el, wr) for y, x in zip(ys, xs)) / np.hypot(wr[0] - el[0], wr[1] - el[1])
        else:
            t = span_fore
        out.append(f'/** What of our {which} arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */')
        out.append(f'export const {prefix}_SPAN_{side}: [number, number] = [-1.000, {t:.3f}];')
        out.append('')
    return '\n'.join(out)


def hands(outfit, script, prefix, names, roles, what):
    """The gloves' (or bracers') module: each forearm's cuff (pivot: the elbow) and his gloved fist at rest (pivot:
    the hand), and his glove's four tones (his line, dark, middle, light) that our hands take in other poses."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    pal = Palette(black, ['glove', 'leather', 'metal', 'gem', 'trim', 'skin'])
    got = {}
    for side, (cuff, fist) in zip(('N', 'F'), names):
        cm, cc, _ = fine(outfit, cuff)
        fm, fc, _ = fine(outfit, fist)
        got[side] = (cm, cc, fm, fc)
        pal.add(cm, cc, role_by_kind(roles))
        pal.add(fm, fc, role_by_kind(roles))
    pal.build()
    bases = {r: commonest_of(pal, [(v[0], v[1]) for v in got.values()] + [(v[2], v[3]) for v in got.values()], r) for r in ('glove', 'leather', 'metal', 'gem', 'trim')}
    bases = {k: v for k, v in bases.items() if v}
    out = [module_head(script, what, pal, prefix, bases)]
    # his glove's tones, on the near fist: the darkest, middle and lightest of its colours that are not his line
    fm, fc = got['N'][2], got['N'][3]
    tones = sorted({hexc(fc[j, i]) for j, i in zip(*np.nonzero(fm)) if hexc(fc[j, i]) != pal.line}, key=lambda h: float(luma(np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float))))
    pick = [pal.line, tones[0], tones[len(tones) // 2], tones[-1]] if tones else [pal.line] * 4
    out.append('/** His glove in four tones, our hand\'s shades 0-3 (his line, dark, middle, light): our hands take them in every pose but rest. */')
    out.append(f"export const {prefix}_TONES: [string, string, string, string] = [{', '.join(repr(h) for h in pick)}];")
    out.append('')
    for side, (cm, cc, fm, fc) in got.items():
        el, wr, hd = J['elbow' + side], J['wrist' + side], J['hand' + side]
        which = 'near' if side == 'N' else 'far'
        out.append(ts_painted(f'{prefix}_CUFF_{side}', f'The {which} forearm\'s piece (pivot: the elbow).', pal, cm, cc, el, seg_angle(el, wr)))
        out.append(ts_painted(f'{prefix}_FIST_{side}', f'His {which} gloved fist at rest (pivot: the hand).', pal, fm, fc, hd, seg_angle(wr, hd)))
    return '\n'.join(out).replace("'#", "'#")


# How many columns each skirt piece hangs from, whether it hangs, and whether it is the far panel or the lining.
SKIRT = {
    'front': (2, True, False, False),
    'near': (3, True, False, False),
    'far': (2, True, True, False),
    'lining': (4, True, False, True),
}


def rows_above(m, band):
    """How many of a piece's top rows lie above the band's lower edge (they go under it)."""
    ys = np.nonzero(m.any(1))[0]
    by = np.nonzero(band.any(1))[0]
    if not len(ys) or not len(by):
        return 0
    return max(0, int(by.max()) + 1 - int(ys.min()))


def skirt(outfit, script, prefix, band_piece, roles, what, slits=()):
    """The skirt's module (SkirtPiece for aureliaLower.ts): the lining, the far and near panels and the front panel,
    each with its columns; and his bare thighs in the slits (pivot: the knee)."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    band, _, _ = fine(outfit, band_piece)
    pal = Palette(black, ['cloth', 'trim', 'gold', 'lining', 'skin'])
    got = {}
    for n in SKIRT:
        m, c, _ = fine(outfit, n)
        got[n] = (m, c)
        pal.add(m, c, role_by_kind(roles['lining'] if n == 'lining' else roles['panel']))
    sl = {}
    for side, n in slits:
        m, c, _ = fine(outfit, n)
        sl[side] = (m, c)
        pal.add(m, c, lambda c_: 'skin' if kind(c_) == 'skin' else None)
    pal.build()
    bases = {r: commonest_of(pal, list(got.values()), r) for r in ('cloth', 'trim', 'gold', 'lining')}
    bases = {k: v for k, v in bases.items() if v}
    skin_lit = commonest_of(pal, list(sl.values()), 'skin')
    out = [module_head(script, what, pal, prefix, bases, imports="import type { PaintedPiece } from '../painted';\nimport type { SkirtPiece } from './aureliaLower';")]
    if sl:
        out.append('/** His lit skin in the slits: a body\'s skin recolours his slit pixels from it (at it they stay his). */')
        out.append(f"export const {prefix}_SLIT_SKIN = '{skin_lit}';")
        out.append('')
    for n, (ncols, hang, far, lining) in SKIRT.items():
        m, c = got[n]
        top = rows_above(m, band)
        front = top + SKIRT_FRONT if n in ('near', 'far') else 0
        doc = {'front': 'The front panel under the band.', 'near': 'The near side panel.', 'far': 'The far side panel.', 'lining': 'The cloth behind and between her legs, carried on behind them to its hem.'}[n]
        out.append(ts_skirt(f'{prefix}_{n.upper()}', doc, pal, m, c, ncols, hang, open_top=top, front=front, far=far, lining=lining))
    for side, (m, c) in sl.items():
        hip, kn = J['hip' + side], J['knee' + side]
        which = 'near' if side == 'N' else 'far'
        out.append(ts_painted(f'{prefix}_SLIT_{side}', f'His bare {which} thigh in the slit (pivot: the knee).', pal, m, c, kn, seg_angle(hip, kn)))
    return '\n'.join(out)


# The rows of a side panel drawn in front of its thigh below the band (the panel hangs over the thigh's top).
SKIRT_FRONT = 6


def waist(outfit, script, prefix, name, roles, what, tails_from):
    """The sash's (or belt's) module: the band riding the torso, and what hangs from it below his row `tails_from`
    (the sash's tails, the satchel), hanging with the thighs."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    m, c, _ = fine(outfit, name)
    M = body_map(outfit)
    fy = M.fine((0, tails_from))[1]
    tails = m.copy()
    tails[:int(np.floor(fy)), :] = False
    band = m & ~tails
    pal = Palette(black, ['sash', 'leather', 'metal', 'glass', 'gold'])
    pal.add(m, c, role_by_kind(roles))
    pal.build()
    bases = {r: commonest_of(pal, [(m, c)], r) for r in pal.roles}
    bases = {k: v for k, v in bases.items() if v}
    out = [module_head(script, what, pal, prefix, bases, imports="import type { SkirtPiece } from './aureliaLower';")]
    out.append(ts_skirt(f'{prefix}_BAND', 'The band round the waist (it rides the torso).', pal, band, c, 3, False))
    if tails.any():
        out.append(ts_skirt(f'{prefix}_HANG', 'What hangs from it, swinging a little with the thighs.', pal, tails, c, 2, True))
    return '\n'.join(out)


def boots(outfit, script, prefix, names, roles, what):
    """The boots' module (BootArt): on each leg the piece over the knee (pivot: the knee), the shin's (pivot: the
    ankle) and the shoe (flat, pivot: the ankle), where the shoe meets the shin and where our leg goes."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    M = body_map(outfit)
    HJ = OUTFITS[outfit]['joints']
    pal = Palette(black, ['cloth', 'leather', 'metal', 'gold', 'skin'])
    got = {}
    for side, n in zip(('N', 'F'), names):
        m, c, _ = fine(outfit, n)
        hip, kn, an = J['hip' + side], J['knee' + side], J['ankle' + side]
        thigh, rest = split_at(m, hip, kn, kn)
        # the shoe: below his ankle (his ankle's row at our scale, a row under the shin's end)
        ay = int(np.floor(M.fine(HJ['ankle' + side])[1])) + 1
        foot = rest.copy()
        foot[:ay, :] = False
        shin = rest & ~foot
        # the shin's piece reaches on under the shoe by two rows (the shoe is drawn over it)
        shin |= rest & (np.arange(256)[:, None] < ay + 2)
        got[side] = (thigh, shin, foot, c, ay)
        pal.add(m, c, role_by_kind(roles))
    pal.build()
    bases = {r: commonest_of(pal, [(v[0] | v[1] | v[2], v[3]) for v in got.values()], r) for r in ('cloth', 'leather', 'metal', 'gold')}
    bases = {k: v for k, v in bases.items() if v}
    out = [module_head(script, what, pal, prefix, bases)]
    for side, (thigh, shin, foot, c, ay) in got.items():
        hip, kn, an = J['hip' + side], J['knee' + side], J['ankle' + side]
        which = 'near' if side == 'N' else 'far'
        out.append(ts_painted(f'{prefix}_THIGH_{side}', f'The {which} boot over the knee and what of the leg above it (pivot: the knee).', pal, thigh, c, kn, seg_angle(hip, kn)))
        out.append(ts_painted(f'{prefix}_SHIN_{side}', f'The {which} boot from the knee to the ankle (pivot: the ankle).', pal, shin, c, an, seg_angle(kn, an)))
        out.append(ts_painted(f'{prefix}_FOOT_{side}', f'The {which} shoe, flat (pivot: the ankle).', pal, foot, c, an, 0.0))
        ys, xs = np.nonzero(foot)
        top = ys.min()
        tx = xs[ys == top].mean() + 0.5
        out.append(f'/** Where the {which} shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */')
        out.append(f'export const {prefix}_JOIN_{side}: [number, number] = [{np.floor(tx - an[0]):.2f}, {top - np.floor(an[1]):.2f}];')
        ys, xs = np.nonzero(thigh)
        cut = max(-along((x + 0.5, y + 0.5), hip, kn) + along(kn, hip, kn) for y, x in zip(ys, xs))
        out.append(f'/** How far above the {which} knee our leg goes under the boot (fine pixels along the thigh). */')
        out.append(f'export const {prefix}_CUT_{side} = {cut - 0.25:.2f};')
        out.append('')
    return '\n'.join(out)


def piece_module(outfit, script, prefix, name, roles, what, joint, seg):
    """A module of one piece (the pauldron): pivot on `joint`, at the angle of the segment `seg`."""
    a, K, bg, lab = load(outfit)
    black = his_line(a)
    m, c, _ = fine(outfit, name)
    pal = Palette(black, ['leather', 'metal', 'gold'])
    pal.add(m, c, role_by_kind(roles))
    pal.build()
    bases = {r: commonest_of(pal, [(m, c)], r) for r in pal.roles}
    bases = {k: v for k, v in bases.items() if v}
    out = [module_head(script, what, pal, prefix, bases)]
    out.append(ts_painted(f'{prefix}_PIECE', what + '.', pal, m, c, J[joint], seg_angle(J[seg[0]], J[seg[1]])))
    return '\n'.join(out)
