"""Shared helpers for lifting parts out of the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg).

His picture (1493x2000) is his own pixel art, not a paint-over of our sprite: his pixels are 2000/256
picture pixels each (a 190 x 255 grid from PHASE), and his figure is about 250 of them tall, ours 94-96.
His second picture of the same warrior (bronze-warrior-leather-chest-owner-reference.jpg, the same
framing and grid) only changes the chest; its leather cuirass is lifted from it by its own script.

So his figure is brought down to our scale, as the owner decided (2026-10-24, "Reducir y limpiar yo"):
  - the body (cuirass, pauldrons, cape and scarf, skirt, arms, legs) is shrunk evenly at BODY_SCALE of his
    pixels to one fine pixel of ours, the scale and place that lay his joints (HIS_JOINTS) best on our male
    rig at idle frame 0 (JOINTS, least squares: body_fit());
  - the head (hair and braid, diadem, face and eyes) is shrunk evenly at HEAD_SCALE, the scale that makes
    his head the size of his Roman head in the game, with his near eye's lash on the Roman face's
    (HEAD_ANCHOR), keeping his black line and his red eyes;
  - then what the reduction leaves blurry is cleaned in his palette only (reduce()): his line 1 px round
    every piece and between pieces where he drew one, each fine pixel one of his colours taken from the
    cells of his it covers (the commoner of their dark and light halves), and lone specks taken away.
Every colour is one of his (snapped(): the picture's JPEG noise snapped to his palette, never a new
colour). The scripts write the cleaned reduction itself (the pieces and his figure at our scale,
src/sprite/bronzeRefPixels.ts), so the idle test is pixel for pixel against it.

PARTS cuts his figure into the pieces the items stamp (src/sprite/painted.ts): each is a region of his
picture (a polygon in his pixel corners) and the kinds of his colours it takes there, less what a piece
listed before it took. Where a piece is hidden in his picture (the near upper arm under the pauldron,
the chest under the scarf, the thighs under the skirt), it is filled by continuing his pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import colorsys
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from roman_ref import CHARS, hexc, inside, near4, near8, write  # noqa: E402,F401

REF = 'docs/reference/bronze-warrior-owner-reference.jpg'
REF_LEATHER = 'docs/reference/bronze-warrior-leather-chest-owner-reference.jpg'
PITCH = 2000 / 256
# Where his first cell starts in each picture (picture pixels), found by the least spread inside the cells.
PHASE = {REF: (4.9, 0.3), REF_LEATHER: (4.6, 0.0)}
CELLS = (190, 255)

# Our male rig at idle frame 0, fine pixels (src/sprite/rig.ts drawRig; bronze.test.ts checks them).
JOINTS = {
    'neck': (127.180, 147.650),
    'pelvis': (127.0, 176.874),
    'shoulderN': (114.006, 152.513),
    'shoulderF': (134.270, 151.805),
    'elbowN': (110.131, 164.502),
    'elbowF': (137.094, 164.084),
    'wristN': (107.622, 175.212),
    'wristF': (142.523, 173.652),
    'handN': (106.801, 178.717),
    'handF': (144.299, 176.783),
    'hipN': (121.582, 176.463),
    'hipF': (131.512, 173.116),
    'kneeN': (122.171, 192.652),
    'kneeF': (138.233, 187.856),
    'ankleN': (118.422, 207.589),
    'ankleF': (135.936, 203.084),
}
# His joints, read off his picture (his pixel corners): the middle of each joint where his limb bends.
HIS_JOINTS = {
    'neck': (103.0, 58.0),
    'pelvis': (99.0, 148.0),
    'shoulderN': (68.0, 72.0),
    'shoulderF': (128.0, 72.0),
    'elbowN': (58.5, 106.0),
    'elbowF': (131.5, 107.0),
    'wristN': (61.0, 139.0),
    'wristF': (139.5, 137.0),
    'handN': (63.0, 147.0),
    'handF': (142.0, 144.0),
    'hipN': (84.0, 150.0),
    'hipF': (114.0, 147.0),
    'kneeN': (76.0, 190.0),
    'kneeF': (122.0, 190.0),
    'ankleN': (66.5, 232.0),
    'ankleF': (118.5, 232.0),
}
# The body: his pixels per fine pixel (the owner's ~2.85, 2026-10-24), across where the least-squares fit
# of his joints (FIT_ON) on ours puts it, and down so that his near sole stands on ours (his last row of
# the near shoe, SOLE_HIS, on our near foot's last row at idle, SOLE_OURS): his legs are shorter than ours,
# and fitted on the joints alone he would float above the ground.
BODY_SCALE = 2.85
FIT_ON = ('shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristF', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF')
SOLE_HIS = 251
SOLE_OURS = 218
# The head (hair and braid, diadem, face and neck): his pixels per fine pixel, the scale that makes his
# head the size of his Roman head in the game (the near eye 7 px from the far one, chin to lash 9 rows),
# grown about his chin (HIS_CHIN), which stays where the body's scale puts it, on his neck.
HEAD_SCALE = 1.9
HIS_CHIN = (106.0, 53.0)
HEAD_PARTS = ('hair', 'diadem', 'face')


def body_offset():
    """The fine pixel his corner (0, 0) lands on at BODY_SCALE: across by least squares over FIT_ON, down
    by his near sole on ours."""
    H = np.array([HIS_JOINTS[k] for k in FIT_ON], float)
    O = np.array([JOINTS[k] for k in FIT_ON], float)
    ox = float((O[:, 0] - H[:, 0] / BODY_SCALE).mean())
    oy = (SOLE_OURS + 1) - (SOLE_HIS + 1) / BODY_SCALE
    return (round(ox, 2), round(oy, 2))


BODY_OFFSET = body_offset()


class Map:
    """Where his cell corners land in our frame: fine = his / k + off."""

    def __init__(self, k, off):
        self.k = k
        self.off = off

    def fine(self, p):
        return (p[0] / self.k + self.off[0], p[1] / self.k + self.off[1])

    def his(self, q):
        return ((q[0] - self.off[0]) * self.k, (q[1] - self.off[1]) * self.k)


BODY = Map(BODY_SCALE, BODY_OFFSET)
_chin = BODY.fine(HIS_CHIN)
HEAD = Map(HEAD_SCALE, (round(_chin[0] - HIS_CHIN[0] / HEAD_SCALE, 2), round(_chin[1] - HIS_CHIN[1] / HEAD_SCALE, 2)))


def map_of(name):
    return HEAD if name in HEAD_PARTS else BODY


def native(path=REF):
    """His pixels: the median of each cell's interior, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    px, py = PHASE[path]
    nx, ny = CELLS
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        y0, y1 = int(round(py + j * PITCH)), int(round(py + (j + 1) * PITCH))
        for i in range(nx):
            x0, x1 = int(round(px + i * PITCH)), int(round(px + (i + 1) * PITCH))
            out[j, i] = np.median(a[y0 + 2:y1 - 2, x0 + 2:x1 - 2].reshape(-1, 3), axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


# His palette: colours of his within PAL_MERGE of a commoner one are that one (the JPEG's noise round each
# colour he used); a colour seen fewer than PAL_RARE times goes to his nearest commoner colour within
# PAL_RARE_MERGE.
PAL_MERGE = 10
PAL_RARE = 6
PAL_RARE_MERGE = 24


def palette(a):
    """His colours, commonest first: [(rgb, count)]. White (the background) is not one."""
    fl = a.reshape(-1, 3)
    fg = fl.min(axis=1) <= 225
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
    """His picture with every cell in his palette's colour (white stays white)."""
    pal = palette(a)
    P = np.array([p for p, _ in pal])
    n = np.array([c for _, c in pal])
    common = n >= PAL_RARE
    fl = a.reshape(-1, 3)
    d = ((fl[:, None, :] - P[None]) ** 2).sum(axis=2)
    idx = np.argmin(d, axis=1)
    # A rare colour: his nearest common colour, if near enough.
    dc = np.where(common[None], d, 1e18)
    ic = np.argmin(dc, axis=1)
    rare = ~common[idx] & (dc[np.arange(len(fl)), ic] <= PAL_RARE_MERGE ** 2)
    idx = np.where(rare, ic, idx)
    out = P[idx].reshape(a.shape)
    white = a.min(axis=2) > 225
    out[white] = 255
    return out.astype(np.int32)


def background(a):
    """The white round him, reached from the picture's edge."""
    H, W, _ = a.shape
    white = a.min(axis=2) > 225
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not white[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


def kind(c):
    """What a colour of his is: 'white', 'line' (his navy black), 'dark' (his near-blacks of any hue, inside
    his line), 'red' (his eyes), 'skin', 'gold' (the
    bronze's yellows and oranges, his gold trim), 'leather' (his browns), 'steel' (greys), 'purple' (the
    cape and scarf), 'navy' (the skirt's blue) or 'hair' (his blue-blacks and blue-greys)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if min(r, g, b) > 225:
        return 'white'
    if max(r, g) < 14 and b < 36:
        return 'line'
    if L < 22:
        return 'dark'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if r > 110 and g < 0.35 * r and b < 0.35 * r:
        return 'red'
    if s < 0.13 and L > 40:
        return 'steel'
    if r > b + 8 and r >= g:
        if r >= 150 and b >= 0.45 * r and g >= 0.5 * r:
            return 'skin'
        if r >= 120 and g - b > 0.25 * (r - b) and b < 0.6 * r and r - g < 0.62 * (r - b):
            return 'gold'
        if r > 95 and b > 0.42 * r:
            return 'skin'
        return 'leather'
    if r > g + 4 and b > g + 6:
        return 'purple'
    if b > r + 18 and b > g + 6:
        return 'navy'
    return 'hair'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def rect(x0, y0, x1, y1):
    """A rectangle of his pixel corners."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


ALL = ('line', 'dark', 'red', 'skin', 'gold', 'leather', 'steel', 'purple', 'navy', 'hair')
METAL = ('gold', 'leather', 'steel', 'hair', 'dark', 'line')
CLOTH = ('purple', 'dark', 'line')
# The pieces of his figure, front to back: (name, the regions it is cut from (polygons in his pixel
# corners), the kinds of his colours it takes there). A cell votes for the first entry whose region holds
# it and whose kinds take it (a piece may have more than one entry); each patch inside his line then goes
# to the piece most of its cells vote for, unless a second piece has SPLIT of them, and then each cell goes
# its own way (labels()).
PARTS = [
    # the near arm, in front of everything it crosses
    ('fist_n', [[(47, 132), (70, 132), (70, 139), (74, 139), (74, 163), (47, 163)]], ('skin', 'leather', 'steel', 'hair', 'dark', 'line')),
    ('bracer_n', [rect(42, 103, 70, 134)], METAL),
    ('clasp', [rect(86, 59, 100, 74)], ('gold', 'leather', 'dark', 'line')),
    # the scarf round the neck, behind the near pauldron's dome and in front of the chest
    ('scarf', [[(62, 46), (136, 46), (136, 82), (112, 82), (100, 74), (94, 60), (88, 58), (70, 56), (62, 56)]], CLOTH),
    ('pauldron_n', [[(50, 52), (70, 53), (86, 56), (86, 74), (88, 76), (88, 99), (46, 99), (46, 76), (50, 76)]], METAL),
    ('arm_n', [rect(44, 84, 76, 112)], ('skin', 'line')),
    # the head: the diadem over the hair, the face under it
    ('diadem', [rect(81, 20, 94, 28), [(101, 21), (121, 21), (121, 29), (116, 29), (116, 32), (108, 32), (108, 29), (101, 29)]], ('gold', 'leather', 'dark', 'line')),
    ('face', [rect(84, 28, 123, 62)], ('skin', 'red', 'steel', 'leather', 'dark', 'line')),
    # his braid (from where it leaves his head, with its bronze bands) and his hair
    ('braid', [rect(26, 62, 60, 86)], ('gold', 'leather')),
    ('braid', [[(20, 34), (70, 34), (70, 52), (66, 52), (62, 74), (50, 76), (46, 100), (20, 100)]], ('hair', 'navy', 'steel', 'dark', 'line')),
    ('hair', [[(20, 0), (140, 0), (140, 64), (104, 64), (84, 52), (66, 52), (62, 74), (50, 76), (46, 100), (20, 100)]], ('hair', 'navy', 'steel', 'dark', 'line')),
    ('cuirass', [[(78, 56), (121, 56), (121, 98), (124, 98), (124, 131), (78, 131)]], METAL),
    ('pauldron_f', [[(118, 58), (142, 58), (142, 99), (122, 99), (122, 90), (118, 90)]], METAL),
    ('arm_f', [rect(118, 84, 140, 114)], ('skin', 'line')),
    ('bracer_f', [rect(122, 104, 150, 140)], METAL),
    ('fist_f', [rect(126, 132, 154, 158)], ('skin', 'leather', 'steel', 'hair', 'dark', 'line')),
    ('skirt', [[(60, 118), (136, 118), (136, 150), (142, 150), (142, 182), (60, 182)]], ('navy', 'gold', 'leather', 'steel', 'hair', 'dark', 'line')),
    ('thigh_n', [rect(64, 160, 100, 190)], ('skin', 'line')),
    ('shoe_n', [rect(48, 228, 80, 254)], METAL),
    ('greave_n', [rect(56, 177, 96, 234)], METAL + ('skin', 'red')),
    ('thigh_f', [rect(104, 170, 134, 194)], ('skin', 'line')),
    ('shoe_f', [rect(102, 228, 152, 250)], METAL),
    ('greave_f', [rect(102, 177, 140, 234)], METAL + ('skin', 'red')),
    ('cape', [rect(0, 48, 140, 240)], CLOTH),
]


def components(a, K):
    """His figure's cells inside his black line, in patches (4-neighbours) of cells that are not line."""
    H, W, _ = a.shape
    solid = (K != 'line') & (K != 'white')
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
# Pieces that take their cells one by one, whatever patch they lie in (the diadem: no line of his
# parts it from the forehead's skin).
CELLWISE = ('diadem',)
FOREIGN = 8


# His second picture's set (bronze-warrior-leather-chest-owner-reference.jpg; the owner, 2026-10-24: "si solo
# agrega ese conjunto (el pecho y hombreras y mangas)"): the leather chest with its high navy collar and the
# square clasp on it, the dark iron pauldrons, the short navy sleeves with gold cuffs. Cut from his second
# picture before the rest of PARTS (which only give these their neighbours there).
PARTS_LEATHER = [
    ('lpauldron_n', [[(50, 51), (88, 51), (88, 72), (90, 84), (50, 84)]], METAL),
    ('sleeve_n', [rect(46, 78, 84, 102)], ('navy', 'gold', 'leather', 'hair', 'steel', 'dark', 'line')),
    ('lcollar', [rect(86, 44, 114, 71)], ('navy', 'gold', 'leather', 'hair', 'steel', 'dark', 'line')),
    ('lpauldron_f', [[(122, 52), (138, 52), (138, 84), (127, 84), (127, 66), (122, 66)]], METAL),
    ('sleeve_f', [rect(124, 78, 140, 101)], ('navy', 'gold', 'leather', 'hair', 'steel', 'dark', 'line')),
    ('lchest', [[(78, 60), (127, 60), (127, 132), (78, 132)]], METAL),
]
LEATHER_PIECES = tuple(n for n, _, _ in PARTS_LEATHER)


def all_parts():
    return PARTS_LEATHER + PARTS


def labels(a, parts=None):
    """Which piece each cell of his is (PARTS order): each patch inside his line goes whole to one piece, so
    the pieces part along his own line; his line goes to the piece in front of those it bounds (the first in
    PARTS), or inside one piece to that piece. '' for the white round him."""
    parts = PARTS if parts is None else parts
    H, W, _ = a.shape
    K = kinds(a)
    bg = background(a)
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
            if vote[y, x] in CELLWISE:
                out[y, x] = vote[y, x]
            elif vote[y, x]:
                votes[vote[y, x]] = votes.get(vote[y, x], 0) + 1
        if not votes:
            continue
        ranked = sorted(votes.items(), key=lambda kv: (-kv[1], order[kv[0]]))
        if len(ranked) > 1 and ranked[1][1] >= SPLIT * len(ys):
            for y, x in zip(ys, xs):
                if not out[y, x]:
                    out[y, x] = vote[y, x] or ranked[0][0]
        else:
            for y, x in zip(ys, xs):
                if not out[y, x]:
                    out[y, x] = ranked[0][0]
    # Cells of a kind their piece never takes (the scarf's purple in a patch of the pauldron's), in groups of
    # FOREIGN or more side by side: their own vote. (A lone cell of such a colour is a shade of the piece.)
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
    # His line: the piece in front among the pieces it bounds (8-neighbours), else the piece it lies in.
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
    # Line cells with no solid neighbour (his line two cells thick): the piece of the line beside them in
    # front, spread a cell at a time; a line far from every piece goes to its region's piece.
    for _ in range(4):
        todo = list(zip(*np.nonzero(line & (out == ''))))
        got = {}
        for y, x in todo:
            near = [out[y + dy, x + dx] for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)) if 0 <= y + dy < H and 0 <= x + dx < W and out[y + dy, x + dx]]
            if near:
                got[(y, x)] = min(near, key=lambda q: order[q])
        for (y, x), n in got.items():
            out[y, x] = n
    for y, x in zip(*np.nonzero(line & (out == ''))):
        out[y, x] = vote[y, x]
    return out


# ---------------------------------------------------------------------------------------------------
# Bringing his figure down to our scale
# ---------------------------------------------------------------------------------------------------
# A fine pixel is a piece's where at least FIG of it is that piece. It is his line where his line covers
# LINE_IN of the piece's cells under it (a line of his running through it), and round every piece where it
# meets the white, a piece behind it, or where his line parted two pieces. Otherwise it takes one of his
# colours under it: of the piece's cells under it split into their dark and light halves, the heavier
# half's commonest colour (so a pixel is his engraving or his bronze, not a muddy mean of both); where the
# cells under it are all near one lightness (within FLAT), simply their commonest colour.
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
            if lab[y, x] and K[y, x] not in ('line', 'white'):
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


def reduce(a, lab, names, M, K=None, own=None):
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
    order = {}
    for i, p in enumerate(all_parts()):
        order.setdefault(p[0], i)
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
    if MOTIF:
        motif_lines(a, lab, names, M, K, who, col, feet)
    # His small marks (a stud, a glint, a tassel's strand, a key of the meander: a patch of his between
    # FEATURE cells inside his line, standing out from what is round it by FEATURE_CONTRAST in lightness):
    # each in its own commonest colour at the fine pixel its middle lands on (the biggest where several do),
    # so each reads as his mark and not as a blur.
    if FEATURE and (not MOTIF or FEATURE_ALSO):
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
    # His eyes (EYE_KINDS: his red irises and their whites) where they cover EYE_SHARE of a pixel (more for the
    # iris, so his red does not run down onto the cheek below it): that pixel is the eye, never his line or
    # skin, the iris in his brightest red under it and the white in his commonest white, and the pixel above
    # each is his lid line (his heavy black lid, which at our scale falls between two rows), so each eye reads
    # as a lid, a small white and a red iris.
    eye = []
    for (j, i), cells in feet.items():
        if who[j, i] not in EYE_PIECES:
            continue
        tot = sum(w for _, _, w in cells)
        for k in EYE_KINDS:
            # (his iris: every red of his there, his darkest reds round the pupil too)
            is_k = (lambda y, x: int(a[y, x][0]) >= 0x30 and int(a[y, x][0]) > 2.5 * max(int(a[y, x][1]), int(a[y, x][2]))) if k == 'red' else (lambda y, x: K[y, x] == k)
            mine = [(y, x, w) for y, x, w in cells if is_k(y, x) and lab[y, x] == who[j, i]]
            if sum(w for _, _, w in mine) >= EYE_SHARE[k] * tot:
                tally = {}
                for y, x, w in mine:
                    t = tuple(int(v) for v in a[y, x])
                    tally[t] = tally.get(t, 0) + w
                col[j, i] = max(sorted(tally), key=lambda t: t[0]) if k == 'red' else max(sorted(tally), key=lambda t: tally[t])
                isl[j, i] = False
                eye.append((j, i))
                break
    for j, i in eye:
        if who[j - 1, i] in EYE_PIECES and (j - 1, i) not in eye:
            col[j - 1, i] = black
            isl[j - 1, i] = True
    return who, col, isl


EYE_PIECES = ('face',)
EYE_KINDS = ('red', 'steel')
EYE_SHARE = {'red': 0.35, 'steel': 0.2}


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
# Which piece of his is in front of which where they meet (behind, in front). A piece is continued under
# the pieces in front of it by UNDER of his cells, each continued cell his nearest own colour, so turned
# apart from them in a pose it is still his whole piece closed by its own line, and at rest the piece in
# front covers what was continued.
FRONT = [
    ('braid', 'pauldron_n'), ('braid', 'scarf'), ('braid', 'hair'),
    ('scarf', 'pauldron_n'), ('scarf', 'clasp'), ('scarf', 'face'),
    ('cuirass', 'scarf'), ('cuirass', 'pauldron_n'), ('cuirass', 'arm_n'), ('cuirass', 'clasp'), ('cuirass', 'bracer_n'),
    ('pauldron_f', 'scarf'), ('pauldron_f', 'cuirass'),
    ('arm_f', 'pauldron_f'), ('arm_f', 'cuirass'), ('arm_f', 'bracer_f'), ('bracer_f', 'fist_f'),
    ('skirt', 'cuirass'), ('skirt', 'fist_n'), ('skirt', 'bracer_n'), ('skirt', 'fist_f'), ('skirt', 'bracer_f'),
    ('arm_n', 'pauldron_n'), ('arm_n', 'bracer_n'), ('bracer_n', 'fist_n'),
    ('thigh_n', 'skirt'), ('thigh_n', 'greave_n'), ('thigh_f', 'skirt'), ('thigh_f', 'greave_f'),
    ('shoe_n', 'greave_n'), ('shoe_f', 'greave_f'), ('greave_f', 'greave_n'), ('greave_f', 'skirt'), ('greave_n', 'skirt'),
    ('hair', 'diadem'), ('face', 'diadem'), ('face', 'hair'),
    # his second picture's set
    ('lchest', 'lcollar'), ('lchest', 'lpauldron_n'), ('lchest', 'sleeve_n'), ('lchest', 'arm_n'), ('lchest', 'bracer_n'), ('lchest', 'scarf'),
    ('lpauldron_f', 'lcollar'), ('lpauldron_f', 'scarf'), ('lpauldron_f', 'lchest'), ('sleeve_f', 'lpauldron_f'), ('sleeve_f', 'lchest'),
    ('sleeve_n', 'lpauldron_n'), ('arm_n', 'sleeve_n'), ('arm_f', 'sleeve_f'), ('scarf', 'lcollar'),
]
UNDER = 6


def fronts_of(name):
    return {f for b, f in FRONT if b == name} | ({n for n, _, _ in all_parts()} - {'cape'} if name == 'cape' else set())


def continue_under(a, lab, name, reach=None, more=None):
    """The piece `name` with what the pieces in front of it hide continued (his cells only, in his colours):
    (mask, colours). `reach`: how many of his cells under them (UNDER); `more`: a mask of cells to fill
    besides (what a script continues further: an arm up under its pauldron), filled the same way."""
    H, W = lab.shape
    K = kinds(a)
    mine = lab == name
    front = np.isin(lab, list(fronts_of(name)))
    reach = UNDER if reach is None else reach
    col = a.copy()
    filled = mine.copy()
    # his own colour nearest, spread a cell at a time (his line stays where it is; only his colours spread)
    # (his face is continued from his skin only, not from the shadows the hair and diadem cast on it)
    src = mine & ((K == 'skin') if name == 'face' else (K != 'line'))
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


def reduce_piece(a, lab, name, mask=None, colours=None, M=None):
    """One piece of his alone at our scale (reduce): (mask, colours, line) in our 256 x 256 frame, his line
    all round it. With `mask`/`colours`: the piece continued (continue_under)."""
    if mask is None:
        mask, colours = continue_under(a, lab, name)
    aa = np.full(a.shape, 255, np.int32)
    aa[mask] = colours[mask]
    ll = np.full(lab.shape, '', object)
    ll[mask] = name
    M = M or map_of(name)
    who, col, isl = reduce(aa, ll, [name], M, own=(lab == name))
    m = who == name
    if CLEAN:
        clean(aa, ll, name, m, col, isl, M)
    return m, col, isl


# His figure in his second picture's set: the leather chest and its collar for the cuirass and its clasp,
# the iron pauldrons for the bronze ones, and the sleeves on the upper arms, under the pauldrons.
def leather_order():
    swap = {'cuirass': 'lchest', 'clasp': 'lcollar', 'pauldron_n': 'lpauldron_n', 'pauldron_f': 'lpauldron_f'}
    out = []
    for d, n in GAME_ORDER:
        out.append((d, swap.get(n, n)))
        if n == 'arm_f':
            out.append(('farArm.cloth', 'sleeve_f'))
        if n == 'arm_n':
            out.append(('nearArm.cloth', 'sleeve_n'))
    return out


# The game draws each piece at a depth (src/sprite/ctx.ts DEPTHS); at rest his figure is the pieces drawn
# back to front in that order (GAME_ORDER: within one depth, as the items draw them).
GAME_ORDER = [
    ('capeBack', 'cape'),
    ('hairBack', 'braid'),
    ('farArm.body', 'arm_f'),
    ('farArm.armor', 'bracer_f'),
    ('farArm.armor', 'pauldron_f'),
    ('farLeg.body', 'thigh_f'),
    ('farLeg.feet', 'shoe_f'),
    ('farLeg.armor', 'greave_f'),
    ('nearLeg.body', 'thigh_n'),
    ('nearLeg.feet', 'shoe_n'),
    ('nearLeg.armor', 'greave_n'),
    ('skirt', 'skirt'),
    ('torso.armor', 'cuirass'),
    ('farHand.front', 'fist_f'),
    ('head.body', 'face'),
    ('hairFront', 'hair'),
    ('head.gear', 'diadem'),
    # the scarf round the neck in front of the head's neck, the clasp on it
    ('capeFront', 'scarf'),
    ('capeFront', 'clasp'),
    ('nearArm.body', 'arm_n'),
    ('nearArm.armor', 'pauldron_n'),
    ('nearArm.over', 'bracer_n'),
    ('nearArm.over', 'fist_n'),
]


def figure(a, lab, pieces=None, order=None):
    """His figure at our scale as the game draws it at rest: each piece alone (reduce_piece, or `pieces`:
    {name: (mask, colours, line)}), back to front in GAME_ORDER. (256, 256, 4) RGBA, and which piece each
    pixel is."""
    out = np.zeros((256, 256, 4), np.uint8)
    who = np.full((256, 256), '', object)
    for _, name in (order or GAME_ORDER):
        m, c, _ = pieces[name] if pieces and name in pieces else piece(a, lab, name)
        out[m, :3] = c[m]
        out[m, 3] = 255
        who[m] = name
    return out, who


# ---------------------------------------------------------------------------------------------------
# Writing the pieces as TypeScript
# ---------------------------------------------------------------------------------------------------
# Our face template's anchor at male idle frame 0 (body.ts faceAnchor nx, ny: his head stands where our
# head stands, on his longer neck): his head pieces are stamped from it.
ANCHOR = (123, 139)
# Where each piece is stamped from (a joint of his, or the face anchor) and the segment whose angle it
# takes (his torso: pelvis to neck).
PIVOT = {
    'cape': ('neck', ('pelvis', 'neck')),
    'scarf': ('neck', ('pelvis', 'neck')),
    'clasp': ('neck', ('pelvis', 'neck')),
    'cuirass': ('neck', ('pelvis', 'neck')),
    'skirt': ('pelvis', ('pelvis', 'neck')),
    'braid': ('anchor', None),
    'hair': ('anchor', None),
    'diadem': ('anchor', None),
    'face': ('anchor', None),
    'lchest': ('neck', ('pelvis', 'neck')),
    'lcollar': ('neck', ('pelvis', 'neck')),
}
for s in ('n', 'f'):
    S = s.upper()
    PIVOT.update({
        f'pauldron_{s}': (f'shoulder{S}', (f'shoulder{S}', f'elbow{S}')),
        f'lpauldron_{s}': (f'shoulder{S}', (f'shoulder{S}', f'elbow{S}')),
        f'sleeve_{s}': (f'shoulder{S}', (f'shoulder{S}', f'elbow{S}')),
        f'arm_{s}': (f'shoulder{S}', (f'shoulder{S}', f'elbow{S}')),
        f'bracer_{s}': (f'elbow{S}', (f'elbow{S}', f'wrist{S}')),
        f'fist_{s}': (f'wrist{S}', (f'wrist{S}', f'hand{S}')),
        f'thigh_{s}': (f'hip{S}', (f'hip{S}', f'knee{S}')),
        f'greave_{s}': (f'knee{S}', (f'knee{S}', f'ankle{S}')),
        f'shoe_{s}': (f'ankle{S}', (f'knee{S}', f'ankle{S}')),
    })


def fine_joint(name):
    """His joint (or the face anchor) at our scale, in our frame at rest."""
    if name == 'anchor':
        return (ANCHOR[0] + 0.5, ANCHOR[1] + 0.5)
    return BODY.fine(HIS_JOINTS[name])


def fine_angle(seg):
    if seg is None:
        return -90.0
    (ax, ay), (bx, by) = fine_joint(seg[0]), fine_joint(seg[1])
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the fine pixel (of our frame at rest)
    that lands on the joint, `ang` the limb's angle at rest."""
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


def pack(col, mask):
    """A mask's pixels as rows of palette characters, one per colour exactly (his two pictures' colours can
    lie within a few levels of each other, and each must stay his own), the origin (x0, y0) in our frame and
    the palette."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    palette, chars = {}, {}
    rows = []
    for y in range(y0, y1):
        r = ''
        for x in range(x0, x1):
            if not mask[y, x]:
                r += '.'
                continue
            h = hexc(col[y, x])
            if h not in chars:
                chars[h] = CHARS[len(chars)]
                palette[chars[h]] = h
            r += chars[h]
        rows.append(r)
    return rows, (x0, y0), palette


def module(header, consts, prefix, bases=None, painted='../painted'):
    """A generated TypeScript module: the colours each slot recolours from (`bases`), the pieces (`consts`:
    (CONST, (mask, colours, line), doc, piece name)), what each of a piece's colours is (`<CONST>_KIND`,
    material()) and where each lands at rest (`<PREFIX>_REST`: the fine pixel of its first row's first cell)."""
    out = [header, f"import type {{ PaintedPiece }} from '{painted}';", '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    body = []
    rest = []
    for const, (m, c, isl), pdoc, name in consts:
        rows, origin, palette = pack(c, m)
        joint, seg = PIVOT[name]
        body.append(ts_piece(const, pdoc, rows, origin, palette, fine_joint(joint), fine_angle(seg)))
        found = {h: material([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], name) for h in palette.values()}
        names = sorted(set(found.values()))
        body.append(f"/** What each colour of {const} is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */")
        body.append(f"export const {const}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
        for h in sorted(found):
            body.append(f"  '{h}': '{found[h]}',")
        body += ['};', '']
        rest.append((const, origin))
    out.append("/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out)


LINE = (1, 2, 22)
# The pieces his skin shows in: there his skin is the character's skin.
SKIN_PIECES = ('face', 'arm_n', 'arm_f', 'fist_n', 'fist_f', 'thigh_n', 'thigh_f')
DARK = 30


def material(rgb, name):
    """What a colour of his is for the colour slots: 'line' (his black line), 'dark' (his near-blacks of
    any hue, kept as they are), 'skin' (in the pieces his skin shows in), 'red' (his eyes), 'white' (his
    eyes' whites), 'grey' (steel), 'purple' (the cape), 'navy' (the skirt's cloth), 'hair' or 'warm' (his
    bronze, gold, leather and browns)."""
    if tuple(int(v) for v in rgb) == LINE or kind(rgb) == 'line':
        return 'line'
    k = kind(rgb)
    if float(luma(np.array(rgb, float))) < DARK:
        return 'dark'
    if k == 'red':
        return 'red'
    if name in SURFACE_KIND and max(int(v) for v in rgb) - min(int(v) for v in rgb) <= SURFACE_GREY:
        # his iron's warm greys are the iron, not his trim's gold
        return 'grey'
    if name == 'face' and k == 'steel':
        return 'white'
    if k == 'skin':
        return 'skin' if name in SKIN_PIECES else 'warm'
    if k == 'steel':
        return 'grey'
    if k in ('purple', 'navy', 'hair'):
        return k
    return 'warm'


def header(script, what, args='', ref='bronze-warrior-owner-reference.jpg'):
    return (f'// {what}\n// Lifted from the owner\'s bronze warrior (docs/reference/{ref}) and\n'
            f'// brought down to our scale by tools/refs/{script} (tools/refs/bronze_ref.py).\n'
            f'// Generated: rerun the script to change it:\n//   python3 -I tools/refs/{script}{args}\n')


def middle_colour(pieces, names, kinds_wanted, q=0.5):
    """His colour of middle lightness among the pieces' pixels of these materials (material()): the base a
    colour slot recolours from."""
    found = []
    for n in names:
        m, c, isl = pieces[n]
        for y, x in zip(*np.nonzero(m & ~isl)):
            if material(c[y, x], n) in kinds_wanted:
                found.append((float(luma(c[y, x])), hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def load(path=REF):
    """His picture snapped to his palette, and its pieces (labels); his second picture cut for its set."""
    a = snapped(native(path))
    return a, labels(a, all_parts() if path == REF_LEATHER else PARTS)


def capsule(a_pt, b_pt, r, H, W):
    """His cells within r of the segment between two of his points."""
    ys, xs = np.mgrid[0:H, 0:W]
    px, py = xs + 0.5, ys + 0.5
    (ax, ay), (bx, by) = a_pt, b_pt
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(px - ax - t * dx, py - ay - t * dy) <= r


def ellipse_mask(c, rx, ry, H, W):
    ys, xs = np.mgrid[0:H, 0:W]
    return ((xs + 0.5 - c[0]) / rx) ** 2 + ((ys + 0.5 - c[1]) / ry) ** 2 <= 1


# What each piece is continued over besides UNDER (his cells, whatever is in front of them there): what
# a pose shows of it that he hid.
#   the upper arms    up under the pauldron to the shoulder (a raised arm)
#   the thighs        up under the skirt to the hip (a kick, a step)
#   the chest         up under the scarf to the neck (without the cape)
#   the face          the forehead under the diadem, the skull under the hair (other hair, or none),
#                     the neck under the scarf
#   the skirt         up under the cuirass's lower lip
#   the cape          behind the body and the legs (a step shows it between them)
def more_of(name, H, W):
    J = HIS_JOINTS
    if name.startswith('arm_'):
        S = name[-1].upper()
        return capsule(J['shoulder' + S], J['elbow' + S], 9, H, W)
    if name.startswith('thigh_'):
        S = name[-1].upper()
        return capsule(J['hip' + S], J['knee' + S], 10, H, W)
    if name in ('cuirass', 'lchest'):
        return inside(rect(78, 58, 124, 70), H, W)
    if name == 'face':
        return ellipse_mask((102, 32), 17, 21, H, W) | inside(rect(94, 50, 116, 64), H, W)
    if name == 'skirt':
        return inside(rect(66, 110, 136, 124), H, W)
    if name == 'cape':
        return inside([(58, 58), (116, 58), (118, 170), (112, 228), (80, 232), (56, 214)], H, W)
    return None


# How a piece is continued over more_of: 'up', each column going on upward as his rows below it are,
# mirrored about its first own cell (his pattern runs on, not one colour smeared); else his nearest colour.
MORE_MODE = {'cuirass': 'up', 'lchest': 'up', 'skirt': 'up', 'arm_n': 'up', 'arm_f': 'up', 'thigh_n': 'up', 'thigh_f': 'up'}


def mirrored_up(a, lab, name, more):
    """The cells of `more` above the piece, each column going on upward as his rows below it are: each cell
    the piece's own cell as far below the piece's top in that column as it is above it (the top of the
    nearest column with any, for a column he drew none of), his line kept out (the nearest own cell
    of his colours in that row, then further down)."""
    H, W = lab.shape
    K = kinds(a)
    own = (lab == name) & (K != 'line')
    col = a.copy()
    got = np.zeros((H, W), bool)
    tops = {x: int(np.nonzero(own[:, x])[0].min()) for x in range(W) if own[:, x].any()}
    if not tops:
        return got, col
    for x in range(W):
        if not more[:, x].any():
            continue
        top = tops.get(x, tops[min(tops, key=lambda c: (abs(c - x), c))])
        for y in range(top - 1, -1, -1):
            if not more[y, x] or (lab[y, x] == name):
                continue
            for yy in range(min(2 * top - y, H - 1), H):
                xs = [c for c in range(x - 3, x + 4) if 0 <= c < W and own[yy, c]]
                if xs:
                    c = min(xs, key=lambda c: (abs(c - x), c))
                    col[y, x] = a[yy, c]
                    got[y, x] = True
                    break
    return got, col


def piece(a, lab, name, M=None):
    """A piece of his at our scale, continued under what hides it (continue_under, more_of): (mask,
    colours, line)."""
    H, W = lab.shape
    more = more_of(name, H, W)
    # only under his figure: never into the white round him
    more = None if more is None else more & (lab != '')
    if more is not None and MORE_MODE.get(name) == 'up':
        got, up = mirrored_up(a, lab, name, more)
        mask, colours = continue_under(a, lab, name, more=more & ~got)
        colours[got] = up[got]
        mask = mask | got
    else:
        mask, colours = continue_under(a, lab, name, more=more)
    return reduce_piece(a, lab, name, mask, colours, M)


def run(script, out, what, consts, prefix, bases=None, study=None, path=REF):
    """A part script's work: its pieces (consts: (CONST, piece name, doc)) brought down and written to `out`
    as a TypeScript module, and with `study` a sheet of his crop beside them at 8x."""
    a, lab = load(path)
    pieces = {name: piece(a, lab, name) for _, name, _ in consts}
    b = bases(pieces) if bases else None
    text = module(header(script, what, f' {out}', os.path.basename(path)), [(c, pieces[n], d, n) for c, n, d in consts], prefix, b)
    write(out, text)
    if study:
        study_sheet(a, lab, pieces, study)
    return pieces


def study_sheet(a, lab, pieces, path):
    """His cells of these pieces beside the pieces at our scale, each at the same size (8x ours)."""
    k = 8
    tiles = []
    for name, (m, c, isl) in pieces.items():
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min() - 1, xs.max() + 2, ys.min() - 1, ys.max() + 2
        ours = np.full((y1 - y0, x1 - x0, 3), 235, np.uint8)
        sub = m[y0:y1, x0:x1]
        ours[sub] = c[y0:y1, x0:x1][sub]
        M = map_of(name)
        hx0, hy0 = M.his((x0, y0))
        hx1, hy1 = M.his((x1, y1))
        his = np.full(a.shape, 235, np.uint8)
        his[lab == name] = a[lab == name]
        crop = his[max(0, int(hy0)):int(np.ceil(hy1)), max(0, int(hx0)):int(np.ceil(hx1))]
        A = Image.fromarray(crop).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
        B = Image.fromarray(ours).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
        t = Image.new('RGB', (A.width * 2 + 8, A.height), 'white')
        t.paste(A, (0, 0))
        t.paste(B, (A.width + 8, 0))
        tiles.append(t)
    W = sum(t.width for t in tiles) + 16 * len(tiles)
    H = max(t.height for t in tiles)
    sheet = Image.new('RGB', (W, H), 'white')
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0))
        x += t.width + 16
    sheet.save(path)


# ---------------------------------------------------------------------------------------------------
# His engraving, folds and trim rebuilt as lines (the owner, 2026-10-24: spirals as a continuous 1 px line
# of his dark engraving on his bronze, the lion as a few of his key dark cells, the meander as a regular
# pattern on his gold, the cloth's folds as a few clear lines of his darkest tones, not speckle)
# ---------------------------------------------------------------------------------------------------
# A cell of his is a mark (his engraving, a fold, a line of gold trim) where it is MOTIF_DELTA darker or
# lighter than the middle of the piece round it (MOTIF_R cells each way), in a run of MOTIF_MIN or more such
# cells. Each mark cell lands on the fine pixel its middle lands on, so a 1-cell line of his is a 1-px line
# of ours, unbroken; the pixels between keep his surface's commonest colour. The marks are laid strongest
# first (the cells of his longest lines), never four in a square and never more than MOTIF_CROWD round one
# pixel, so they stay lines and do not clot into blots.
MOTIF = False
MOTIF_PIECES = ('cuirass', 'clasp', 'pauldron_n', 'pauldron_f', 'bracer_n', 'bracer_f', 'skirt', 'greave_n', 'greave_f', 'shoe_n', 'shoe_f', 'cape', 'scarf', 'braid')
MOTIF_DELTA = 28
MOTIF_R = 2
MOTIF_MIN = 3
MOTIF_CROWD = 3
MOTIF_BASE = True
FEATURE_ALSO = False


def motif_lines(a, lab, names, M, K, who, col, feet):
    H, W = lab.shape
    Lg = luma(a.astype(float))
    for n in names:
        if n not in MOTIF_PIECES:
            continue
        mk = lab == n
        if not mk.any():
            continue
        ys, xs = np.nonzero(mk)
        mid = np.zeros((H, W))
        for y, x in zip(ys, xs):
            y0, y1, x0, x1 = max(0, y - MOTIF_R), min(H, y + MOTIF_R + 1), max(0, x - MOTIF_R), min(W, x + MOTIF_R + 1)
            win = Lg[y0:y1, x0:x1][mk[y0:y1, x0:x1]]
            mid[y, x] = np.median(win)
        sign = np.zeros((H, W), int)
        sign[mk & (Lg < mid - MOTIF_DELTA)] = -1
        sign[mk & (Lg > mid + MOTIF_DELTA)] = 1
        # runs of marks (8-neighbours, one sign)
        size = np.zeros((H, W), int)
        seen = np.zeros((H, W), bool)
        for y, x in zip(*np.nonzero(sign)):
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
                        if 0 <= yy < H and 0 <= xx < W and not seen[yy, xx] and sign[yy, xx] == sign[y, x]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
            for q, p in group:
                size[q, p] = len(group)
        # the pixels between: his surface's commonest colour under each (his marks left out)
        for (j, i), cells in (feet.items() if MOTIF_BASE else ()):
            if who[j, i] != n:
                continue
            surf = [(y, x, w) for y, x, w in cells if lab[y, x] == n and sign[y, x] == 0 and K[y, x] != 'line']
            if surf:
                tally = {}
                for y, x, w in surf:
                    t = tuple(int(v) for v in a[y, x])
                    tally[t] = tally.get(t, 0) + w
                col[j, i] = max(sorted(tally), key=lambda t: tally[t])
        # the marks, strongest first
        cand = {}
        for y, x in zip(*np.nonzero(sign)):
            if size[y, x] < MOTIF_MIN:
                continue
            fx, fy = M.fine((x + 0.5, y + 0.5))
            q = (int(np.floor(fy)), int(np.floor(fx)))
            if who[q] != n:
                continue
            c = cand.setdefault((q, int(sign[y, x])), [0, {}])
            c[0] += size[y, x]
            t = tuple(int(v) for v in a[y, x])
            c[1][t] = c[1].get(t, 0) + 1
        taken = {}
        for (q, sg), (wt, tally) in sorted(cand.items(), key=lambda kv: (-kv[1][0], kv[0])):
            if q in taken:
                continue
            j, i = q
            crowd = sum(1 for dj in (-1, 0, 1) for di in (-1, 0, 1) if (dj or di) and (j + dj, i + di) in taken)
            if crowd > MOTIF_CROWD:
                continue
            square = False
            for dj, di in ((-1, -1), (-1, 0), (0, -1), (0, 0)):
                block = [(j + dj + a_, i + di + b_) for a_ in (0, 1) for b_ in (0, 1)]
                if all(b == q or taken.get(b) == sg for b in block):
                    square = True
            if square:
                continue
            taken[q] = sg
            col[j, i] = max(sorted(tally), key=lambda t: tally[t])


# ---------------------------------------------------------------------------------------------------
# Keeping his rows and columns (as Ren's cast arms were brought down: tools/refs/ren-cast-arms-from-ref.py
# keep()): each fine row of ours shows one whole row of his, each fine column one whole column, picked near
# where the even shrink puts it, so that the rows and columns kept are those that carry his lines and
# edges. Every fine pixel is then one of his cells, his colour at his place, and a line of his along a kept
# row or column stays a whole 1 px line.
# ---------------------------------------------------------------------------------------------------
KEEP_SLACK = 1.0      # how far (his cells) a kept row may stand from where the even shrink puts it
KEEP_DRIFT = 0.15     # what straying from there costs, against what a row's lines are worth (per cell)


def importance(a, mask, axis):
    """What each of his rows (axis 0) or columns (axis 1) carries inside `mask`: how many of its cells
    differ from the cells beside them across it (his lines, edges and engraving)."""
    L = luma(a.astype(float))
    if axis == 1:
        L, mask = L.T, mask.T
    n = L.shape[0]
    out = np.zeros(n)
    for r in range(n):
        m = mask[r]
        if not m.any():
            continue
        up = L[r - 1] if r > 0 else L[r]
        dn = L[r + 1] if r + 1 < n else L[r]
        d = np.maximum(np.abs(L[r] - up), np.abs(L[r] - dn))
        out[r] = float((m * (d > 24)).sum())
    return out


def keep_axis(imp, first, count, off, k):
    """Which of his rows (or columns) fine rows first..first+count-1 show (off: where his 0 lands in ours,
    k: his cells per fine pixel): increasing, each within KEEP_SLACK of the even shrink's, worth the most."""
    ideal = [(f + 0.5 - off) * k - 0.5 for f in range(first, first + count)]
    n = len(imp)
    val = lambda c: imp[c] if 0 <= c < n else 0.0
    scale_ = max(1.0, float(np.mean(imp[imp > 0])) if (imp > 0).any() else 1.0)
    cands = [[c for c in range(int(np.floor(t - KEEP_SLACK)), int(np.ceil(t + KEEP_SLACK)) + 1)] for t in ideal]
    best = [{c: (-val(c) + KEEP_DRIFT * scale_ * abs(c - ideal[0]), None) for c in cands[0]}]
    for j in range(1, count):
        row = {}
        for c in cands[j]:
            opts = [(v + (-val(c) + KEEP_DRIFT * scale_ * abs(c - ideal[j])), p) for p, (v, _) in best[-1].items() if p < c]
            if opts:
                row[c] = min(opts)
        best.append(row)
    c = min(best[-1], key=lambda q: (best[-1][q][0], q))
    out = [c]
    for j in range(count - 1, 0, -1):
        c = best[j][c][1]
        out.append(c)
    return out[::-1]


def reduce_keep(a, lab, names, M):
    """The pieces `names` at our scale by keeping his rows and columns: (who, colours) in our frame."""
    H, W = lab.shape
    sel = np.isin(lab, list(names))
    ys, xs = np.nonzero(sel)
    fx0, fy0 = M.fine((xs.min(), ys.min()))
    fx1, fy1 = M.fine((xs.max() + 1, ys.max() + 1))
    i0, i1, j0, j1 = int(np.floor(fx0)), int(np.ceil(fx1)), int(np.floor(fy0)), int(np.ceil(fy1))
    cols = keep_axis(importance(a, sel, 1), i0, i1 - i0, M.off[0], M.k)
    rows = keep_axis(importance(a, sel, 0), j0, j1 - j0, M.off[1], M.k)
    who = np.full((256, 256), '', object)
    col = np.zeros((256, 256, 3), np.int32)
    for jj, y in enumerate(rows):
        for ii, x in enumerate(cols):
            if 0 <= y < H and 0 <= x < W and sel[y, x]:
                who[j0 + jj, i0 + ii] = lab[y, x]
                col[j0 + jj, i0 + ii] = a[y, x]
    return who, col


# ---------------------------------------------------------------------------------------------------
# Cleaning a piece at our scale (the owner's rules, 2026-10-24): no stray specks; his gold trim as continuous
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
TRIM_THICK = 1.7
# His motifs, each where he drew it (his cells): (what, piece, centre, radius in his cells).
MOTIFS = [
    ('spiral', 'cuirass', (95.5, 79.5), 5.5),
    ('spiral', 'cuirass', (121.0, 82.5), 4.5),
    ('lion', 'cuirass', (112.5, 114.5), 11.0),
    ('spiral', 'pauldron_f', (122.5, 82.5), 4.5),
    ('spiral', 'bracer_n', (55.5, 113.5), 4.5),
    ('spiral', 'bracer_n', (55.5, 125.5), 4.5),
    ('ring', 'clasp', (92.5, 66.5), 4.5),
    ('ring', 'greave_n', (74.0, 190.0), 6.5),
    ('ring', 'greave_f', (125.0, 189.0), 6.0),
    ('strap', 'cuirass', ((100.5, 75.5), (118.5, 95.5)), 1.5),
    # his second picture: the spiral on the leather chest's near edge panel, the belt's square buckle
    ('spiral', 'lchest', (92.5, 77.5), 4.5),
    ('square', 'lchest', (111.5, 122.0), 4.5),
    # its laced front: the lace down the middle, his bronze bars across it
    ('laces', 'lchest', ((111.5, 78.5), (111.5, 87.5), (111.5, 95.5), (111.5, 103.5), (111.5, 112.5)), 2.0),
]
# The spiral at our scale, by its size in fine pixels: L his line of the spiral, . his plate between.
SPIRALS = {
    3: ['LLL', 'L.L', '.LL'],
    4: ['.LLL', 'L..L', 'L.LL', 'L...'],
    5: ['.LLL.', 'L...L', 'L.L.L', 'L.LL.', '.L...'],
}
# The skirt's meander: his gold border along the hem, at our scale a gold line over a row of gold keys
# every other pixel (the cleanest reading of his keys, 6 of his cells apart, at 2 of ours).
MEANDER_FROM = 162
MEANDER_GOLD = 0.2


def commonest(cells, a):
    tally = {}
    for y, x in cells:
        t = tuple(int(v) for v in a[y, x])
        tally[t] = tally.get(t, 0) + 1
    return max(sorted(tally), key=lambda t: tally[t]) if tally else None


def clean(a, lab, name, m, col, isl, M):
    H, W = lab.shape
    K = kinds(a)
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
            if not m[q] or isl[q]:
                continue
            col[q] = c
            keep[q] = True
            taken.add(q)
    # 3. his motifs
    for what, piece, at, R in MOTIFS:
        if piece != name:
            continue
        if what == 'laces':
            laces(a, name, m, col, isl, keep, M, list(at), R, K, mine)
            continue
        cx, cy = at
        if what == 'strap':
            strap(a, lab, name, m, col, isl, keep, M, (cx, cy), R, K, Lg, mine)
            continue

        disk = [(y, x) for y in range(int(cy - R), int(cy + R) + 1) for x in range(int(cx - R), int(cx + R) + 1)
                if 0 <= y < H and 0 <= x < W and mine[y, x] and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= R * R and K[y, x] != 'line']
        if not disk:
            continue
        ls = sorted(disk, key=lambda q: (Lg[q], q))
        dark = commonest(ls[:len(ls) // 3], a)
        lite = commonest(ls[-len(ls) // 3:], a)
        mid_ = commonest(ls[len(ls) // 3:-len(ls) // 3] or ls, a)
        fx, fy = M.fine((cx, cy))
        rf = R / M.k
        if what in ('spiral', 'ring', 'square'):
            n = max(3, min(5, int(round(2 * rf))))
            x0, y0 = int(round(fx - n / 2)), int(round(fy - n / 2))
            # his spiral's line: gold on a dark plate, or dark on a gold one (whichever he drew more thinly)
            on_dark = sum(1 for q in disk if Lg[q] > Lg[ls[len(ls) // 2]]) < len(disk) / 2
            line_c, plate_c = (lite, dark) if on_dark else (dark, lite)
            rows = SPIRALS[n] if what == 'spiral' else ['L' * n] + ['L' + '.' * (n - 2) + 'L'] * (n - 2) + ['L' * n] if what == 'square' else ['.' + 'L' * (n - 2) + '.'] + ['L' + '.' * (n - 2) + 'L'] * (n - 2) + ['.' + 'L' * (n - 2) + '.']
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    q = (y0 + j, x0 + i)
                    if not m[q] or isl[q]:
                        continue
                    col[q] = line_c if ch == 'L' else plate_c
                    keep[q] = True
        elif what == 'lion':
            # his medallion: a rim of his darkest bronze round it, and inside each pixel the shade of his (of
            # LION_TONES shades of his medallion, by lightness) nearest the mean lightness of his cells under it,
            # so his lion's head reads by its light and dark masses (mane, face, eye) as his does from afar
            ls_ = sorted(disk, key=lambda q: (Lg[q], q))
            tones = [commonest(ls_[int(len(ls_) * t / LION_TONES):int(len(ls_) * (t + 1) / LION_TONES)], a) for t in range(LION_TONES)]
            rim = commonest(ls_[:max(1, len(ls_) // 8)], a)
            for j in range(int(fy - rf) - 1, int(fy + rf) + 2):
                for i in range(int(fx - rf) - 1, int(fx + rf) + 2):
                    d = np.hypot(i + 0.5 - fx, j + 0.5 - fy)
                    if d > rf or not m[j, i] or isl[j, i]:
                        continue
                    keep[j, i] = True
                    if d > rf - 1:
                        col[j, i] = rim
                        continue
                    cells = [(y, x, w) for y, x, w in footprint(M, i, j) if 0 <= y < H and 0 <= x < W and mine[y, x]]
                    if not cells:
                        continue
                    mean = sum(float(Lg[y, x]) * w for y, x, w in cells) / sum(w for _, _, w in cells)
                    col[j, i] = min(tones, key=lambda c: (abs(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] - mean), c))
    # 4. the meander along the skirt's hem
    if name == 'skirt':
        gold = mine & (K == 'gold')
        band = np.zeros(m.shape, bool)
        for j, i in zip(*np.nonzero(m & ~isl)):
            x0_, y0_ = M.his((i, j))
            x1_, y1_ = M.his((i + 1, j + 1))
            if y0_ < MEANDER_FROM:
                continue
            cells = [(y, x) for y in range(int(y0_), int(np.ceil(y1_))) for x in range(int(x0_), int(np.ceil(x1_))) if 0 <= y < H and 0 <= x < W]
            if cells and sum(1 for q in cells if gold[q]) >= MEANDER_GOLD * len(cells):
                band[j, i] = True
        g_c = commonest([q for q in zip(*np.nonzero(gold)) if q[0] >= MEANDER_FROM], a)
        navy = commonest([q for q in zip(*np.nonzero(mine & (K == 'navy'))) if q[0] >= MEANDER_FROM], a)
        for i in range(256):
            js = [j for j in range(256) if band[j, i]]
            if not js:
                continue
            top = js[0]
            col[top, i] = g_c
            if band[top + 1, i] or (m[top + 1, i] and not isl[top + 1, i]):
                col[top + 1, i] = g_c if i % 2 == 0 else navy
            for j in js[2:]:
                if j > top + 1:
                    col[j, i] = navy


LION_TONES = 4


def laces(a, name, m, col, isl, keep, M, pts, R, K, mine):
    """His laced front: the lace a 1 px line of his line's colour from the first bar to the last, each of his
    bars a pixel of his gold on it."""
    H, W = mine.shape
    gold = [(y, x) for y in range(H) for x in range(W) if mine[y, x] and K[y, x] == 'gold' and min(abs(x + 0.5 - px) + abs(y + 0.5 - py) for px, py in pts) <= 6]
    # his bars' gold: the commonest of the lighter half of his gold there
    gold.sort(key=lambda q: (float(luma(a[q].astype(float))), q))
    g = commonest(gold[len(gold) // 2:], a)
    black = his_line(a)
    f = [M.fine(p) for p in pts]
    x = int(np.floor(np.mean([q[0] for q in f])))
    for j in range(int(np.floor(f[0][1])), int(np.floor(f[-1][1])) + 1):
        if m[j, x] and not isl[j, x]:
            col[j, x] = black
            keep[j, x] = True
    for fx, fy in f:
        q = (int(np.floor(fy)), x)
        if m[q] and g is not None:
            col[q] = g
            keep[q] = True


def strap(a, lab, name, m, col, isl, keep, M, pts, R, K, Lg, mine):
    """His leather strap across the chest: a 1 px line of his strap's colour (the darker half of his cells
    along it) from one end to the other."""
    H, W = lab.shape
    (ax, ay), (bx, by) = pts
    along = [(y, x) for y in range(int(min(ay, by)) - 1, int(max(ay, by)) + 2) for x in range(int(min(ax, bx)) - 2, int(max(ax, bx)) + 3)
             if 0 <= y < H and 0 <= x < W and mine[y, x] and K[y, x] != 'line' and
             abs((bx - ax) * (y + 0.5 - ay) - (by - ay) * (x + 0.5 - ax)) / np.hypot(bx - ax, by - ay) <= R]
    if not along:
        return
    c = commonest(sorted(along, key=lambda q: (Lg[q], q))[:max(1, len(along) // 2)], a)
    (fax, fay), (fbx, fby) = M.fine((ax, ay)), M.fine((bx, by))
    n = int(np.ceil(max(abs(fbx - fax), abs(fby - fay)))) + 1
    for t in range(n):
        q = (int(np.floor(fay + (fby - fay) * t / (n - 1))), int(np.floor(fax + (fbx - fax) * t / (n - 1))))
        if m[q] and not isl[q]:
            col[q] = c
            keep[q] = True
