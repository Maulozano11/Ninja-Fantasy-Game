"""Shared helpers for lifting parts out of the owner's three knights (docs/reference/three-knights-owner-reference.jpg).

His picture (2000x1116, grey background) is three new male characters side by side, drawn by him in his own
pixel art: a 240 x 135 grid of his pixels, 2000/240 picture pixels each (GRID_PHASE: his block edges fall at
x = 0 and y = 4 of the picture, measured on the edges of his blocks over the whole picture). From the left:
the silver paladin (white fur mantle, gold-trimmed plate, red cape), the dark knight (blackened plate and
mail, a leather tabard, a tattered cape) and the dragon knight (copper scale armour, horned pauldrons, gems,
an ember-veined cape). The three share one head and one stance: the dark knight stands SHIFT['dark'] of his
pixels to the right of the paladin, the dragon knight SHIFT['dragon'] (their silhouettes laid over each
other), so one set of joints serves the three.

His figures stand about 125 of his pixels tall, from the hair's top to the soles, where ours stands 94. The
owner's answer on new sets drawn bigger than our sprite (2026-10-24, "Reducir y limpiar yo"):

  - the body is shrunk evenly at the scale that fits our male rig: BODY_SCALE of his pixels to one fine
    pixel of ours (his neck to his near sole, 93.5 of his pixels, against our male's 70.4 at idle frame 0);
  - the head (hair, face and eyes) is shrunk evenly at the scale that makes it our Roman head's size:
    HEAD_SCALE (his hair's top to his chin, 29 of his pixels, against the Roman head's 24);
  - then what is left blurry or muddy is cleaned with his palette only (clean()): his 1 px outline round the
    figure, his gold trim, his plates, mail, fur, scales, gems and the flame blade read as he drew them,
    choosing among his own pixels; nothing new.

How a region is shrunk (tools/refs/samurai_ref.py's method, the samurai's): fine row k shows one of his rows,
each within about one of where the scale puts it, one after another or with his rows left out between;
those left out are the ones most like a neighbour (unlikeness()), so his 1 px line, his trims and his
seams stay where they can. Columns the same. Every pixel of the result is one of his pixels, his colour
snapped to his palette (palette(): colours within PALETTE_TOL of a commoner colour of his are that colour,
JPEG noise).

game(fig) is that figure at our scale: the picture its parts are cut from, and the one the idle tests check
pixel for pixel (src/sprite/knightRefPixels.ts). A pixel of game() at (x, y) sits at (x + OFFSET[fig][0],
y + OFFSET[fig][1]) of our 256 x 256 frame, our male at idle frame 0. HIS_NATIVE are his joints (the
paladin's, read off his picture; the others' are the same, SHIFT to the right).

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

REF = 'docs/reference/three-knights-owner-reference.jpg'
PITCH = (2000 / 240, 2000 / 240)
GRID_PHASE = (0.0, 4.0 - 2000 / 240)
CELLS = (240, 135)
# His colours within this many levels (each channel) of a commoner one are that one (JPEG noise).
PALETTE_TOL = 8
# His pixels per fine pixel of ours: the body, and the head.
BODY_SCALE = 4 / 3
HEAD_SCALE = 1.2

FIGURES = ('paladin', 'dark', 'dragon')
# How far right of the paladin each figure stands (his pixels): his body, and his head (the heads are one
# head, each laid where it matches best).
SHIFT = {'paladin': 0, 'dark': 77, 'dragon': 156}
HEAD_SHIFT = {'paladin': 0, 'dark': 76, 'dragon': 155}
# The columns of his picture each figure is in.
FIG_COLS = {'paladin': (0, 81), 'dark': (81, 158), 'dragon': (158, 240)}

# His joints (the paladin's, his pixels): where each of his limbs turns. In our frame (his_joint()) they
# are where the game stands our rig's joints at rest in his sets (src/sprite/knightRig.ts).
HIS_NATIVE = {
    'neck': (46.0, 37.0),
    'pelvis': (46.0, 71.0),
    'shoulderN': (24.0, 46.0),
    'elbowN': (22.0, 60.0),
    'wristN': (22.0, 71.0),
    'handN': (23.0, 75.0),
    'shoulderF': (61.0, 46.0),
    'elbowF': (63.0, 58.0),
    'wristF': (64.0, 69.0),
    'handF': (65.0, 74.0),
    'hipN': (39.0, 72.0),
    'kneeN': (34.0, 94.0),
    'ankleN': (30.0, 120.0),
    'hipF': (53.0, 70.0),
    'kneeF': (58.0, 92.0),
    'ankleF': (55.0, 118.0),
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
# His near sole's row (the paladin's; his line under the sabaton) and our male's.
HIS_SOLE = 130
OUR_SOLE = 218
PAD = 8
_CACHE = {}


def _disk(key, make):
    """make(), kept on disk between runs when KNIGHTS_CACHE names a folder (keyed by this file's source and the
    picture's bytes, so a changed script or picture makes it again): the part scripts share one reduction."""
    folder = os.environ.get('KNIGHTS_CACHE')
    if not folder:
        return make()
    import hashlib
    import pickle
    h = hashlib.sha256()
    with open(os.path.abspath(__file__), 'rb') as f:
        h.update(f.read())
    with open(REF, 'rb') as f:
        h.update(f.read())
    path = os.path.join(folder, f'{key}-{h.hexdigest()[:16]}.pkl')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return pickle.load(f)
    got = make()
    os.makedirs(folder, exist_ok=True)
    with open(path + '.tmp', 'wb') as f:
        pickle.dump(got, f)
    os.replace(path + '.tmp', path)
    return got


def shift_of(fig):
    return SHIFT[fig]


def offset(fig):
    """Where game(fig)'s pixel (0, 0) lies in our frame: his near sole's line on our near sole's row, his neck
    over our neck's column."""
    nx, _ = HIS_NATIVE['neck']
    sx = int(np.floor((nx + SHIFT[fig]) / BODY_SCALE)) + PAD
    sy = int(np.floor(HIS_SOLE / BODY_SCALE)) + PAD
    return (int(np.floor(OUR_JOINTS['male']['neck'][0])) - sx, OUR_SOLE - sy)


def his_joint(name, fig='paladin'):
    """His joint `name` in our frame (fine pixels), a hundredth of a pixel to the lower right of where he
    turns, so that no sum of the game's lands it on the pixel before."""
    x, y = HIS_NATIVE[name]
    ox, oy = offset(fig)
    return (round((x + SHIFT[fig]) / BODY_SCALE + PAD + ox, 3) + 0.01, round(y / BODY_SCALE + PAD + oy, 3) + 0.01)


def luma(a):
    a = np.asarray(a)
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def native(path=REF):
    """His pixels: the median of each block's middle, as a (135, 240, 3) int array."""
    if 'native' in _CACHE:
        return _CACHE['native'].copy()
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx, ny = CELLS
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            x0 = GRID_PHASE[0] + i * PITCH[0]
            y0 = GRID_PHASE[1] + j * PITCH[1]
            xa, xb = max(0, int(np.ceil(x0 + 2))), min(W, int(x0 + PITCH[0] - 2))
            ya, yb = max(0, int(np.ceil(y0 + 2))), min(H, int(y0 + PITCH[1] - 2))
            out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), axis=0) if xb > xa and yb > ya else 137
    _CACHE['native'] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _CACHE['native'].copy()


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
    return np.array([[to[tuple(a[y, x])] for x in range(W)] for y in range(H)])


def his():
    """His picture snapped to his palette (cached)."""
    if 'his' not in _CACHE:
        _CACHE['his'] = _disk('his', lambda: palette(native()))
    return _CACHE['his'].copy()


def is_bg(a):
    """His grey background: a neutral grey about 137 (round the figures, and the gaps he left inside them)."""
    a = np.asarray(a)
    return (a.max(axis=-1) - a.min(axis=-1) <= 4) & (np.abs(luma(a) - 137) <= 8)


def kind(c):
    """What a colour of his is: 'line' (his black), 'white' (the glints, the fur's lights), 'warm' (warm greys: the fur's), 'skin', 'gold'
    (trim, studs, the blade's pale core), 'flame' (bright reds and oranges: the blade, the gems, the embers,
    the dragon's lit scales), 'red' (the capes, the eyes, deep reds), 'brown' (hair, leather, gloves, the
    dragon's dark scales), 'steel' (the plates' greys and the fur's) or 'dark' (navies, blackened steel)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 14:
        return 'line'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if L > 205 and s < 0.14:
        return 'white'
    if 0.07 <= h <= 0.17 and s > 0.4 and L > 105:
        return 'gold'
    if s > 0.55 and (h > 0.94 or h < 0.07) and L > 88:
        return 'flame'
    if 0.02 <= h < 0.09 and 0.25 < s <= 0.62 and L > 125:
        return 'skin'
    if (h > 0.88 or h < 0.03) and s > 0.45:
        return 'red'
    if 0.02 <= h < 0.14 and s > 0.3:
        return 'brown'
    if s < 0.3 and L >= 55:
        return 'warm' if r > b + 6 else 'steel'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def his_line(a):
    """His black line: the commonest of his line colours."""
    ln = luma(a) < 14
    cols, counts = np.unique(a[ln].reshape(-1, 3), axis=0, return_counts=True)
    i = max(range(len(cols)), key=lambda i: (counts[i], -int(cols[i].sum())))
    return cols[i]


# ---------------------------------------------------------------------------------------------------------
# Regions
# ---------------------------------------------------------------------------------------------------------

# The regions of his picture each part is cut from (polygons in his pixel corners, the paladin's: the others'
# are SHIFT to the right, REGIONS_FIG replacing some), front to back: a pixel of his figure goes to the first
# region that holds it and whose kinds take it (TAKES; all kinds where none is given). His figure's pixels no
# region takes go to the nearest region that took a pixel (the edges of a piece).
ARMOUR = ('line', 'white', 'skin', 'gold', 'brown', 'steel', 'warm', 'dark')
FUR = ('white', 'warm', 'line', 'dark')
HILT = ('line', 'dark', 'gold', 'red', 'flame', 'brown', 'steel', 'white', 'warm')
REGIONS = {
    'head': ([(29, 2), (66, 2), (66, 25), (57, 25), (57, 31), (56, 31), (56, 33), (54, 33), (54, 36), (53, 36), (53, 37), (47, 37),
              (47, 36), (45, 36), (45, 35), (44, 35), (44, 34), (42, 34), (42, 33), (41, 33), (41, 30), (35, 30), (35, 25), (32, 25),
              (32, 20), (29, 20)], ('line', 'skin', 'red', 'brown', 'dark', 'flame', 'white', 'steel')),
    'blade': ([(33, 77), (41, 77), (84, 114), (84, 124), (75, 124), (31, 89)], 'blade'),
    'hilt': ([(6, 61), (13, 61), (17, 66), (20, 70), (20, 74), (17, 74), (14, 70), (14, 69), (6, 67)], HILT),
    'guard': ([(32, 72), (37, 72), (37, 75), (35, 77), (35, 80), (33, 83), (30, 84), (29, 85), (28, 86), (27, 87), (26, 89), (22, 89),
               (22, 87), (24, 85), (25, 83), (26, 80), (27, 77), (29, 75)], HILT),
    'hand_n': ([(17, 72), (29, 72), (29, 81), (21, 81), (17, 77)], ARMOUR),
    'fore_n': ([(13, 58), (30, 58), (30, 72), (13, 72)], ARMOUR),
    'upper_n': ([(13, 49), (30, 49), (30, 58), (13, 58)], ARMOUR),
    'fur': ([(16, 20), (35, 20), (35, 30), (37, 30), (37, 36), (36, 40), (16, 40)], FUR),
    'fur_f': ([(54, 24), (68, 24), (68, 41), (57, 41), (57, 36), (54, 36)], FUR),
    'pauldron_n': ([(13, 36), (40, 36), (40, 40), (38, 40), (38, 50), (13, 50)], ARMOUR),
    'hand_f': ([(61, 70), (72, 70), (72, 81), (61, 81)], ARMOUR),
    'fore_f': ([(58, 56), (70, 56), (70, 71), (61, 71), (61, 63), (58, 63)], ARMOUR),
    'belt': ([(34, 59), (60, 59), (60, 64), (54, 64), (54, 71), (45, 71), (45, 64), (34, 64)], ARMOUR),
    'chest': ([(36, 31), (57, 31), (57, 59), (36, 59)], ARMOUR),
    'pauldron_f': ([(53, 36), (70, 36), (70, 48), (53, 48)], ARMOUR),
    'upper_f': ([(56, 48), (70, 48), (70, 56), (56, 56)], ARMOUR),
    'tasset_n': ([(30, 63), (43, 63), (43, 80), (30, 80)], ARMOUR),
    'tasset_c': ([(44, 63), (58, 63), (58, 82), (54, 91), (46, 91), (44, 82)], ARMOUR),
    'tasset_f': ([(59, 63), (65, 63), (65, 82), (59, 82)], ARMOUR),
    'knee_n': ([(24, 89), (42, 89), (42, 103), (24, 103)], ARMOUR),
    'shin_n': ([(23, 102), (40, 102), (40, 117), (23, 117)], ARMOUR),
    'foot_n': ([(20, 115), (42, 115), (42, 133), (20, 133)], ARMOUR),
    'knee_f': ([(52, 87), (65, 87), (65, 99), (52, 99)], ARMOUR),
    'shin_f': ([(48, 98), (63, 98), (63, 116), (48, 116)], ARMOUR),
    'foot_f': ([(48, 113), (76, 113), (76, 129), (48, 129)], ARMOUR),
    'thigh_n': ([(30, 64), (47, 64), (47, 98), (30, 98)], ARMOUR),
    'thigh_f': ([(46, 64), (64, 64), (64, 96), (46, 96)], ARMOUR),
    'cape_f': ([(58, 50), (80, 50), (80, 116), (58, 116)], None),
    'cape': ([(0, 40), (80, 40), (80, 128), (0, 128)], None),
}
# Per figure: regions replaced ((polygon in that figure's own coordinates, not shifted; takes)) or dropped (None).
REGIONS_FIG = {
    'paladin': {},
    'dark': {
        'fur': None, 'fur_f': None,
        # his dark iron cross-guard: a bar across the blade's line, under his fist
        'guard': ([(101, 85), (109, 71), (112, 73), (104, 88)], HILT),
    },
    # The dragon knight's scales are his reds and oranges, the cape's colours: his regions are drawn round
    # each piece (his picture's coordinates) and take every kind; the cape takes what they leave.
    'dragon': {
        'fur': None, 'fur_f': None,
        'blade': ([(189, 78), (195, 78), (237, 113), (237, 119), (230, 122), (187, 88)], 'strip'),
        'hilt': ([(160, 61), (168, 60), (176, 67), (177, 72), (173, 73), (160, 68)], None),
        # his dragon guard: horns across the blade's line round his red gem
        'guard': ([(177, 86), (188, 69), (194, 72), (190, 81), (183, 90)], None),
        'hand_n': ([(172, 70), (186, 70), (186, 80), (172, 80)], None),
        'fore_n': ([(171, 57), (186, 57), (186, 70), (171, 70)], None),
        'upper_n': ([(167, 48), (186, 48), (186, 57), (167, 57)], None),
        'pauldron_n': ([(170, 22), (190, 22), (190, 33), (200, 35), (200, 50), (166, 50), (166, 40)], None),
        'hand_f': ([(214, 68), (231, 68), (231, 82), (214, 82)], None),
        'fore_f': ([(213, 56), (229, 56), (229, 68), (213, 68)], None),
        'belt': ([(192, 61), (214, 61), (214, 70), (192, 70)], None),
        'chest': ([(190, 29), (213, 29), (213, 61), (190, 61)], None),
        'pauldron_f': ([(209, 26), (226, 26), (226, 49), (209, 49)], None),
        'upper_f': ([(211, 48), (227, 48), (227, 56), (211, 56)], None),
        'tasset_n': ([(186, 70), (200, 70), (200, 87), (186, 87)], None),
        'tasset_c': ([(200, 70), (213, 70), (213, 96), (200, 96)], None),
        'tasset_f': ([(213, 70), (219, 70), (219, 88), (213, 88)], None),
        'knee_n': ([(180, 87), (199, 87), (199, 102), (180, 102)], None),
        'shin_n': ([(180, 101), (197, 101), (197, 120), (180, 120)], None),
        'foot_n': ([(175, 118), (199, 118), (199, 134), (175, 134)], None),
        'knee_f': ([(207, 86), (222, 86), (222, 99), (207, 99)], None),
        'shin_f': ([(203, 98), (221, 98), (221, 118), (203, 118)], None),
        'foot_f': ([(199, 113), (235, 113), (235, 130), (199, 130)], None),
        'thigh_n': ([(186, 72), (201, 72), (201, 100), (186, 100)], None),
        'thigh_f': ([(201, 72), (222, 72), (222, 98), (201, 98)], None),
    },
}


def blade_mask(a, K, poly):
    """His flame blade: on each row inside its strip, from the first pixel of flame to the last (his core and
    edges between), with his line on either end."""
    H, W, _ = a.shape
    m = inside(poly, H, W)
    out = np.zeros((H, W), bool)
    for y in range(H):
        xs = [x for x in np.nonzero(m[y])[0] if K[y, x] == 'flame']
        if not xs:
            continue
        x0, x1 = min(xs), max(xs)
        while x0 - 1 >= 0 and m[y, x0 - 1] and K[y, x0 - 1] in ('gold', 'white'):
            x0 -= 1
        while x1 + 1 < W and m[y, x1 + 1] and K[y, x1 + 1] in ('gold', 'white'):
            x1 += 1
        out[y, x0:x1 + 1] = True
        for x in (x0 - 1, x1 + 1):
            if 0 <= x < W and K[y, x] == 'line':
                out[y, x] = True
    # his line above and below the blade's ends (the tip, the edges' steps)
    edge = near4(out) & (K == 'line') & m
    return out | edge


# Which region each item's piece is, and how each group of regions is shrunk:
#   'keep'  whole rows and columns of his kept (plates, arms, legs, the belt, the sword);
#   'read'  each fine pixel one of his colours under it, nearest their mean (cloth and fur), its specks
#           then taken off by clean().
GROUPS = {
    'cape': (('cape', 'cape_f'), 'read'),
    'pauldron_f': (('pauldron_f',), 'keep'),
    'arm_f': (('upper_f', 'fore_f', 'hand_f'), 'keep'),
    'leg_f': (('thigh_f', 'knee_f', 'shin_f', 'foot_f'), 'keep'),
    'leg_n': (('thigh_n', 'knee_n', 'shin_n', 'foot_n'), 'keep'),
    'skirt': (('tasset_n', 'tasset_c', 'tasset_f'), 'keep'),
    'chest': (('chest',), 'keep'),
    'belt': (('belt',), 'keep'),
    'fur': (('fur', 'fur_f'), 'keep'),
    'pauldron_n': (('pauldron_n',), 'keep'),
    'arm_n': (('upper_n', 'fore_n', 'hand_n'), 'keep'),
    'sword': (('hilt', 'blade'), 'keep'),
    # (the dark knight's and the dragon's guards on their own, each fine pixel read from his under it: a thin
    # bar across the blade's line keeps its run where whole rows and columns would break it; the paladin's
    # broad gold guard is shrunk with the hilt, GROUPS_FIG)
    'guard': (('guard',), 'read'),
}
GROUPS_FIG = {'paladin': {'sword': (('hilt', 'guard', 'blade'), 'keep'), 'guard': ((), 'read')}}
# Back to front: each group over what is behind it.
GROUP_ORDER = ('cape', 'pauldron_f', 'arm_f', 'leg_f', 'leg_n', 'skirt', 'chest', 'belt', 'fur', 'pauldron_n', 'arm_n', 'sword', 'guard')


def regions_of(fig):
    """{region: polygon in his picture's coordinates} for this figure."""
    out = {}
    over = REGIONS_FIG[fig]
    for n, pts in REGIONS.items():
        if n in over:
            if over[n] is not None:
                out[n] = over[n]
            continue
        poly, takes = pts
        out[n] = ([(x + SHIFT[fig], y) for x, y in poly], takes)
    for n, pts in over.items():
        if n not in REGIONS and pts is not None:
            out[n] = pts
    return out


def head_poly(fig):
    return [(x + HEAD_SHIFT[fig], y) for x, y in REGIONS['head'][0]]


def figure_mask(a, fig):
    H, W, _ = a.shape
    x0, x1 = FIG_COLS[fig]
    m = ~is_bg(a)
    m[:, :x0] = False
    m[:, x1:] = False
    return m


def labels(fig, a=None):
    """The region of every pixel of his figure ('' for none): the first region that holds it and takes its
    kind; what none takes, the nearest region's that took a pixel (the head is the paladin's head, in every
    figure laid where it matches: labelled 'head' only on the paladin)."""
    if a is None:
        a = his()
    H, W, _ = a.shape
    fm = figure_mask(a, fig)
    K = kinds(a)
    lab = np.full((H, W), '', dtype='<U12')
    for n, (pts, takes) in regions_of(fig).items():
        if takes == 'blade':
            m = fm & blade_mask(a, K, pts) & (lab == '')
        elif takes == 'strip':
            m = fm & inside(pts, H, W) & (lab == '')
        else:
            m = fm & inside(pts, H, W) & (lab == '')
        if n == 'head':
            m &= inside(head_poly(fig), H, W)
        if takes and takes not in ('blade', 'strip'):
            m &= np.isin(K, takes)
        lab[m] = n
    # the rest: the nearest labelled pixel's region (4-neighbour rings)
    left = fm & (lab == '')
    while left.any():
        got = False
        for y, x in zip(*np.nonzero(left)):
            for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                q = (y + dy, x + dx)
                if 0 <= q[0] < H and 0 <= q[1] < W and lab[q] and not left[q]:
                    lab[y, x] = lab[q]
                    got = True
                    break
        left = fm & (lab == '')
        if not got:
            break
    return lab


# ---------------------------------------------------------------------------------------------------------
# Shrinking (tools/refs/samurai_ref.py's method)
# ---------------------------------------------------------------------------------------------------------

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
    those two (unlikeness()): his line and his gold are kept, rows like their neighbours go."""
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
SKIN_COVER = 0.4


def reading(a, K, line, m, scale, origin, j, i, first=False):
    """What fine pixel (i, j) of a region `m` shrunk by `scale` about his point `origin` shows: one of his
    colours under its footprint (None where less than half of it is his figure). His line where it covers
    LINE_COVER of the footprint; else a glint of his eyes; else his gold where it covers GOLD_COVER; else, of
    the colours under it, the one nearest their mean."""
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
    pick = [c for c in cells if K[c[1], c[2]] != 'line']
    if first and cover('skin') >= SKIN_COVER:
        # his face before his hair's dark reds: the cheek beside the eye reads as his skin, not a smear
        pick = [c for c in pick if K[c[1], c[2]] == 'skin']
    elif cover('gold') >= GOLD_COVER:
        pick = [c for c in pick if K[c[1], c[2]] == 'gold']
    mean = sum(w * a[y, x] for w, y, x in pick) / sum(w for w, y, x in pick)
    best = min(pick, key=lambda c: (int(np.abs(a[c[1], c[2]] - mean).sum()), c[1], c[2]))
    return a[best[1], best[2]], cells


# The point the head is shrunk about (the paladin's, his pixels): his chin's line over his neck. It lands
# where the body's shrink puts each figure's chin, so the head stays on his neck.
HEAD_ANCHOR = (50.0, 37.0)


def frame_size(a):
    H, W, _ = a.shape
    return (int(np.ceil(H / BODY_SCALE)) + 2 * PAD, int(np.ceil(W / BODY_SCALE)) + 2 * PAD)


def reduce(fig, blade=True):
    """The figure at our scale before cleaning: (rgb, which region each pixel came from, '' for none), in a
    frame whose (0, 0) is fine pixel (-PAD, -PAD) of the body's shrink about his picture's corner. Every fine
    pixel is one of his pixels (GROUPS says how each group chooses them); the head is the paladin's head,
    read pixel by pixel at HEAD_SCALE about his chin and laid on this figure's chin."""
    a = his()
    lab = labels(fig, a)
    K = kinds(a)
    line = his_line(a)
    size = frame_size(a)
    rgb = np.full(size + (3,), 255, np.int32)
    label = np.full(size, '', dtype='<U12')

    def put(names, m, scale, origin, at, how, src_lab):
        ys, xs = np.nonzero(m)
        j0 = int(np.floor((ys.min() - origin[1]) / scale))
        j1 = int(np.ceil((ys.max() + 1 - origin[1]) / scale))
        i0 = int(np.floor((xs.min() - origin[0]) / scale))
        i1 = int(np.ceil((xs.max() + 1 - origin[0]) / scale))
        if how == 'read':
            for j in range(j0, j1):
                for i in range(i0, i1):
                    got = reading(a, K, line, m, scale, origin, j, i, first=True)
                    if got is None:
                        continue
                    c, cells = got
                    y, x = at[1] + j + PAD, at[0] + i + PAD
                    rgb[y, x] = c
                    share = {}
                    for w, cy, cx in cells:
                        share[src_lab[cy, cx]] = share.get(src_lab[cy, cx], 0) + w
                    label[y, x] = max(sorted(share), key=lambda n: share[n])
            return
        rows = keep(m.shape[0], j1 - j0, scale, origin[1] + j0 * scale, unlikeness(a, K, m, 0))
        cols = keep(m.shape[1], i1 - i0, scale, origin[0] + i0 * scale, unlikeness(a, K, m, 1))
        for jj, r in enumerate(rows):
            for ii, c in enumerate(cols):
                if m[r, c]:
                    y, x = at[1] + j0 + jj + PAD, at[0] + i0 + ii + PAD
                    rgb[y, x] = a[r, c]
                    label[y, x] = src_lab[r, c]

    for g in GROUP_ORDER:
        names, how = GROUPS_FIG.get(fig, {}).get(g, GROUPS[g])
        m = np.isin(lab, names)
        if m.any():
            put(names, m, BODY_SCALE, (0.0, 0.0), (0, 0), how, lab)
    # the blade redrawn clean (the dark knight's is laid on after, game())
    if fig != 'dark' and blade:
        clean_blade(rgb, label, lab, a, line)
    # the head: the paladin's
    plab = labels('paladin', a) if fig != 'paladin' else lab
    hm = plab == 'head'
    hx, hy = HEAD_ANCHOR
    # (on every figure where it lands on the paladin in our frame: one head, one place on the rig)
    at = (int(round(hx / BODY_SCALE)) + offset('paladin')[0] - offset(fig)[0], int(round(hy / BODY_SCALE)) + offset('paladin')[1] - offset(fig)[1])
    put(('head',), hm, HEAD_SCALE, HEAD_ANCHOR, at, 'read', plab)
    return rgb, label


# The flame blade is redrawn clean at our scale (the owner's "the flame blade as clean bands of his oranges with
# a bright core"): its axis and half width fitted on his blade, each fine pixel across it one band of his
# colours (BLADE_BANDS of them between his line on either edge, each his commonest colour on the line of his
# blade nearest that distance from the axis), in two stretches along it (from the guard, and the tip from BLADE_TIP of its
# length), his line round it. Every colour is his.
BLADE_BANDS = 4
BLADE_TIP = 0.8


def blade_fit(lab, a):
    """His blade's axis: (centre, along, across, (t0, t1), half width at each whole t, half width of the
    bands, colours by (stretch, band)), in his pixels. Fitted on his flame (his flame, core and glints, not
    his line nor what lies beside the blade)."""
    K = kinds(a)
    m = (lab == 'blade') & np.isin(K, ('flame', 'gold', 'white'))
    ys, xs = np.nonzero(m)
    P = np.stack([xs + 0.5, ys + 0.5], 1)
    c = P.mean(0)
    d = np.linalg.svd(P - c)[2][0]
    if d[0] < 0:
        d = -d
    n = np.array([-d[1], d[0]])
    t = (P - c) @ d
    q = (P - c) @ n
    # (the middle of his blade across: his flame is not always even about the fitted axis)
    c = c + n * float(np.median(q))
    q = q - float(np.median(q))
    t0, t1 = float(t.min()), float(t.max())
    half = {}
    for k in range(int(np.floor(t0)) - 1, int(np.ceil(t1)) + 2):
        sel = np.abs(t - k) <= 2.5
        half[k] = float(np.percentile(np.abs(q[sel]), 90)) if sel.sum() >= 3 else 0.0
    hw = float(np.median([v for v in half.values() if v > 0]))
    # (no wider than his blade is along most of it: by the guard his flame meets the guard's own)
    half = {k: min(v, hw + 0.4) for k, v in half.items()}
    # his colours inside his line, by stretch along and band across (all of his blade's pixels there)
    mb = (lab == 'blade') & (K != 'line')
    ys2, xs2 = np.nonzero(mb)
    P2 = np.stack([xs2 + 0.5, ys2 + 0.5], 1) - c
    t2, q2 = P2 @ d, P2 @ n
    table = {}
    for z, (za, zb) in enumerate(((t0, t0 + (t1 - t0) * BLADE_TIP), (t0 + (t1 - t0) * BLADE_TIP, t1))):
        for b in range(BLADE_BANDS):
            # the band's middle, at his nearest pixel across: his commonest colour on that line of his blade
            # (his bright core stays a line of his core, his edge his edge)
            mid = -hw + (b + 0.5) * 2 * hw / BLADE_BANDS
            off = int(np.floor(mid + 0.5))
            pick = lambda zz, o, ks: [tuple(a[ys2[i], xs2[i]]) for i in range(len(xs2)) if int(np.floor(q2[i] + 0.5)) == o and zz[0] <= t2[i] <= zz[1] and K[ys2[i], xs2[i]] in ks]
            fire = ('flame', 'gold', 'white')
            got = pick((za, zb), off, fire) or pick((t0, t1), off, fire) or pick((t0, t1), off, fire + ('red',))
            table[(z, b)] = max(sorted(set(got)), key=got.count)
    return c, d, n, (t0, t1), half, hw, table


def clean_blade(rgb, label, lab, a, line):
    """The blade in the reduction redrawn clean (see BLADE_BANDS) where the shrink put it."""
    c, d, n, (t0, t1), half, hw, table = blade_fit(lab, a)
    H, W = label.shape
    inside_ = np.zeros((H, W), bool)
    band = np.zeros((H, W), int)
    zone = np.zeros((H, W), int)
    for y in range(H):
        for x in range(W):
            p = np.array([(x - PAD + 0.5) * BODY_SCALE, (y - PAD + 0.5) * BODY_SCALE])
            t = float((p - c) @ d)
            q = float((p - c) @ n)
            if t < t0 or t > t1:
                continue
            w = half.get(int(round(t)), 0.0)
            if abs(q) <= w:
                inside_[y, x] = True
                band[y, x] = min(BLADE_BANDS - 1, max(0, int((q + hw) / (2 * hw) * BLADE_BANDS)))
                zone[y, x] = 1 if (t - t0) / (t1 - t0) >= BLADE_TIP else 0
    ring = near8(inside_) & ~inside_
    was = label == 'blade'
    keep_out = np.isin(label, ('hilt', 'guard', 'hand_n'))
    for y, x in zip(*np.nonzero(inside_ & ~keep_out)):
        rgb[y, x] = table[(zone[y, x], band[y, x])]
        label[y, x] = 'blade'
    for y, x in zip(*np.nonzero(ring & ~keep_out & (was | (label == '') | inside_))):
        rgb[y, x] = line
        label[y, x] = 'blade'
    for y, x in zip(*np.nonzero(ring & ~keep_out & ~was & (label != ''))):
        rgb[y, x] = line
        label[y, x] = 'blade'
    # what was his blade and is not now: what is round it
    for y, x in zip(*np.nonzero(was & ~inside_ & ~ring)):
        nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < W and label[y + dy, x + dx] not in ('', 'blade')]
        if nb:
            rgb[y, x] = mode_of([tuple(rgb[q]) for q in nb])
            label[y, x] = mode_of([label[q] for q in nb])
        else:
            label[y, x] = ''
            rgb[y, x] = 255


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


# The largest hole in the figure the cleaning closes (fine pixels).
HOLE = 3
# The cloth and fur read pixel by pixel: their specks are taken off by clean().
CLOTH = ('cape', 'cape_f')
# The fur: his whites and greys in FUR_TONES bands of lightness (fur_tufts()).
FUR = ('fur', 'fur_f')
FUR_TONES = 5
# Only his light fur is banded; his dark tips and shadows stay as he drew them.
FUR_LIGHT = 110


def mode_of(cols):
    return max(sorted(set(cols)), key=cols.count)


def clean(rgb, label, line, a):
    """The reduction cleaned with his palette only (the owner's "Reducir y limpiar yo"):
      - a pixel or two of the figure standing alone off it (a strand's tip the shrink cut off) goes;
      - a hole of up to HOLE pixels the figure walls in where his picture has none (no grey of his under it:
        the shrink parted two pieces) takes the commonest of his pixels round it; a gap he left between an
        arm and the body stays open;
      - his 1 px line all round the figure: a pixel of the figure beside the background round it is his line;
      - on his cloth and fur (CLOTH), a speck (a colour none of its eight neighbours has) takes the colour
        most of its neighbours have, so his folds and tufts read as his, not speckle (his line stays);
      - a light speck (a pixel much lighter than everything round it that is not his gold, off the face and
        the blade): what the shrink kept of a highlight he drew bigger takes the colour round it.
    Returns (rgb, label)."""
    rgb = rgb.copy()
    label = label.copy()
    H, W = label.shape
    head = label == 'head'
    for c in [c for c in components(label != '', True) if len(c) < 3] + [c for c in components(head, True) if len(c) < 4]:
        for y, x in c:
            label[y, x] = ''
            rgb[y, x] = 255
    his_bg = is_bg(a)
    for c in components(label == '', False):
        if len(c) > HOLE or any(y in (0, H - 1) or x in (0, W - 1) for y, x in c):
            continue
        under = False
        for y, x in c:
            ny, nx = (y - PAD) * BODY_SCALE, (x - PAD) * BODY_SCALE
            under |= his_bg[max(0, int(np.floor(ny))):int(np.ceil(ny + BODY_SCALE)), max(0, int(np.floor(nx))):int(np.ceil(nx + BODY_SCALE))].any()
        if under:
            continue
        for y, x in c:
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + dy, x + dx]]
            rgb[y, x] = mode_of([tuple(rgb[q]) for q in nb])
            label[y, x] = mode_of([label[q] for q in nb])
    # a 1 px slit between two pieces the shrink parted (figure on both sides, across or up and down) where
    # his picture has none: what is round it
    for _ in range(3):
        slits = []
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if label[y, x] or not ((label[y, x - 1] and label[y, x + 1]) or (label[y - 1, x] and label[y + 1, x])):
                    continue
                ny, nx = (y - PAD) * BODY_SCALE, (x - PAD) * BODY_SCALE
                if his_bg[max(0, int(np.floor(ny))):int(np.ceil(ny + BODY_SCALE)), max(0, int(np.floor(nx))):int(np.ceil(nx + BODY_SCALE))].any():
                    continue
                slits.append((y, x))
        for y, x in slits:
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + dy, x + dx]]
            rgb[y, x] = mode_of([tuple(rgb[q]) for q in nb])
            label[y, x] = mode_of([label[q] for q in nb])
        if not slits:
            break
    fig = label != ''
    out = np.zeros_like(fig)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or out[y, x] or fig[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    # (and the gaps he left inside the figure: background too)
    gap = ~fig & ~out
    K = np.array([[kind(rgb[y, x]) if fig[y, x] else '' for x in range(W)] for y in range(H)])
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if fig[y, x] and not head[y, x] and any(out[q] or gap[q] for q in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))):
                rgb[y, x] = line
                K[y, x] = 'line'
    near = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    # (read from the figure as it stands before this pass: a speck taken off never makes its neighbour one)
    was = rgb.copy()
    Kw = K.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not fig[y, x] or K[y, x] == 'line' or head[y, x]:
                continue
            nb = [(y + dy, x + dx) for dy, dx in near if fig[y + dy, x + dx]]
            cols = [tuple(was[q]) for q in nb if Kw[q] != 'line']
            if not cols:
                continue
            mode = np.array(mode_of(cols))
            if label[y, x] in CLOTH and tuple(rgb[y, x]) not in cols:
                rgb[y, x] = mode
                K[y, x] = kind(mode)
            elif label[y, x] not in ('blade',) and K[y, x] != 'gold' and luma(rgb[y, x]) > 150 and all(luma(was[q]) < luma(rgb[y, x]) - 50 for q in nb):
                rgb[y, x] = mode
                K[y, x] = kind(mode)
    return rgb, label


# Where his mail is (the dark knight's): the pieces it is on.
MAIL_ON = ('chest', 'upper_n', 'upper_f', 'pauldron_n', 'pauldron_f')


def mail_area(a, lab):
    """His mail in his picture: where his pixels make a checker (each lighter or darker than all four of its
    neighbours, by MAIL_STEP levels), most of a 3 x 3 window round it, on the pieces of MAIL_ON. (mask, his
    two mail colours: the dark and the light.)"""
    L = luma(a)
    H, W = L.shape
    ext = np.zeros((H, W), bool)
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            nb = [L[y - 1, x], L[y + 1, x], L[y, x - 1], L[y, x + 1]]
            ext[y, x] = all(v > L[y, x] + MAIL_STEP for v in nb) or all(v < L[y, x] - MAIL_STEP for v in nb)
    on = np.isin(lab, MAIL_ON)
    ext &= on
    dens = np.zeros((H, W))
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            dens += np.roll(np.roll(ext, dy, 0), dx, 1)
    m = (dens >= 5) & on
    if not m.any():
        return m, None
    cols = [tuple(a[y, x]) for y, x in zip(*np.nonzero(m & ext))]
    Ls = sorted(set(cols), key=lambda c: luma(np.array(c)))
    darks = [c for c in cols if luma(np.array(c)) < np.median([luma(np.array(v)) for v in cols])]
    lights = [c for c in cols if c not in darks]
    return m, (np.array(mode_of(darks)), np.array(mode_of(lights)))


MAIL_STEP = 18


def lay_mail(rgb, label, fig):
    """His mail at our scale as a clean 1 px checker of his two mail colours (the owner's rule), wherever the
    shrink put a fine pixel whose middle is on his mail; his line and his straps' leather stay."""
    a = his()
    m, two = mail_area(a, labels(fig, a))
    if two is None:
        return
    H, W = label.shape
    for y in range(H):
        for x in range(W):
            if label[y, x] not in MAIL_ON:
                continue
            ny, nx = int((y - PAD + 0.5) * BODY_SCALE), int((x - PAD + 0.5) * BODY_SCALE)
            if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and kind(rgb[y, x]) not in ('line', 'brown', 'gold'):
                rgb[y, x] = two[(x + y) % 2]


def gems(a, lab):
    """His glowing gems (the dragon knight's): clusters of his pure reds (red over 225, green under 80) on his
    armour, joined when within two of his pixels. For each: (his centre, his gem red, his highlight: the
    lightest of his fire colours within two pixels)."""
    r, g = a[..., 0], a[..., 1]
    m = (r > 225) & (g < 80) & ~np.isin(lab, ('blade', 'cape', 'cape_f', 'hilt', 'guard', ''))
    grown = near8(m) | m
    out = []
    K = kinds(a)
    for c in components(grown, True):
        px = [p for p in c if m[p]]
        if not px:
            continue
        cy = float(np.mean([p[0] for p in px])) + 0.5
        cx = float(np.mean([p[1] for p in px])) + 0.5
        red = np.array(mode_of([tuple(a[p]) for p in px]))
        near_ = [(y, x) for y in range(int(cy) - 2, int(cy) + 3) for x in range(int(cx) - 2, int(cx) + 3) if K[y, x] in ('flame', 'gold', 'white')]
        hi = max(near_, key=lambda q: (float(luma(a[q])), -q[0], -q[1]))
        out.append(((cx, cy), red, a[hi]))
    return out


def lay_gems(rgb, label, fig):
    """His gems at our scale at least 2 x 2 (the owner's rule): his gem red on the fine pixels his gem's middle
    falls among, his highlight on the upper left one."""
    a = his()
    for (cx, cy), red, hi in gems(a, labels(fig, a)):
        fx, fy = cx / BODY_SCALE + PAD, cy / BODY_SCALE + PAD
        x0, y0 = int(np.floor(fx - 0.5)), int(np.floor(fy - 0.5))
        for y in (y0, y0 + 1):
            for x in (x0, x0 + 1):
                if label[y, x] and label[y, x] not in ('blade', 'hilt', 'guard'):
                    rgb[y, x] = hi if (y, x) == (y0, x0) else red


def fur_tufts(rgb, label):
    """His fur as clumpy tufts of his whites and greys, not noise (the owner's rule for the fur): each fur pixel
    of his lighter than FUR_LIGHT takes his commonest colour in its band of lightness (FUR_TONES even bands
    up to his lightest: his whites, creams and light greys all stay; his dark tips stay his), and a tone standing alone
    (none of its four neighbours shares it) takes the tone most of its eight neighbours have."""
    H, W = label.shape
    m = np.isin(label, FUR) & (luma(rgb) >= FUR_LIGHT)
    if not m.any():
        return
    ys, xs = np.nonzero(m)
    Ls = np.array([float(luma(rgb[y, x])) for y, x in zip(ys, xs)])
    lo, hi = float(Ls.min()), float(Ls.max()) + 1e-6
    band = np.minimum(FUR_TONES - 1, ((Ls - lo) / (hi - lo) * FUR_TONES).astype(int))
    tones = {}
    for b in sorted(set(band.tolist())):
        cols = [tuple(rgb[ys[i], xs[i]]) for i in range(len(ys)) if band[i] == b]
        tones[b] = np.array(mode_of(cols))
    T = np.full((H, W), -1)
    for i in range(len(ys)):
        T[ys[i], xs[i]] = band[i]
    T0 = T.copy()
    for y, x in zip(ys, xs):
        n4 = [T0[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < W]
        if T0[y, x] not in n4:
            n8 = [T0[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and T0[y + dy, x + dx] >= 0]
            if n8:
                T[y, x] = mode_of(n8)
    for y, x in zip(ys, xs):
        rgb[y, x] = tones[T[y, x]]


def game(fig):
    """His figure at our scale, cleaned: (rgb, region label), the picture every part is cut from."""
    key = ('game', fig)
    if key not in _CACHE:
        def make():
            a = his()
            rgb, label = reduce(fig)
            if fig == 'dark':
                paste_blade(rgb, label, 'paladin', fig)
            rgb, label = clean(rgb, label, his_line(a), a)
            fur_tufts(rgb, label)
            if fig == 'dark':
                lay_mail(rgb, label, fig)
            if fig == 'dragon':
                lay_gems(rgb, label, fig)
            # one head on the three, one blade on the paladin and the dark knight: laid on again after the
            # cleaning, so each is the very piece the game stamps
            if fig != 'paladin':
                paste_piece(rgb, label, 'paladin', fig, 'head')
            if fig == 'dark':
                paste_piece(rgb, label, 'paladin', fig, 'blade')
            return rgb, label
        _CACHE[key] = _disk('game-' + fig, make)
    rgb, label = _CACHE[key]
    return rgb.copy(), label.copy()


def paste_blade(rgb, label, src, fig):
    """The blade of figure `src` (game(src)) laid on this figure where it stands in our frame (the paladin's and
    the dark knight's are one blade he drew twice): this figure's own blade goes (what was under it, what is
    round it), the other's lands over it."""
    srgb, slab = game(src)
    dx = offset(fig)[0] - offset(src)[0]
    dy = offset(fig)[1] - offset(src)[1]
    H, W = label.shape
    was = label == 'blade'
    for y, x in zip(*np.nonzero(was)):
        label[y, x] = ''
        rgb[y, x] = 255
    for y, x in zip(*np.nonzero(slab == 'blade')):
        Y, X = y - dy, x - dx
        if 0 <= Y < H and 0 <= X < W and label[Y, X] not in ('hilt', 'guard', 'hand_n'):
            rgb[Y, X] = srgb[y, x]
            label[Y, X] = 'blade'
    for _ in range(3):
        for y, x in zip(*np.nonzero(was & (label == ''))):
            nb = [(y + q, x + p) for q, p in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + q, x + p] not in ('', 'blade')]
            if nb:
                rgb[y, x] = mode_of([tuple(rgb[q]) for q in nb])
                label[y, x] = mode_of([label[q] for q in nb])


def paste_piece(rgb, label, src, fig, name):
    """The `name` pixels of game(src) laid exactly on this figure where they stand in our frame; this figure's
    own `name` pixels the other has not take what is round them, or the background."""
    srgb, slab = game(src)
    dx = offset(fig)[0] - offset(src)[0]
    dy = offset(fig)[1] - offset(src)[1]
    H, W = label.shape
    theirs = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(slab == name)):
        Y, X = y - dy, x - dx
        if 0 <= Y < H and 0 <= X < W:
            theirs[Y, X] = True
            rgb[Y, X] = srgb[y, x]
            label[Y, X] = name
    left = (label == name) & ~theirs
    for _ in range(3):
        for y, x in zip(*np.nonzero(left)):
            nb = [(y + q, x + p) for q, p in ((1, 0), (-1, 0), (0, 1), (0, -1)) if label[y + q, x + p] not in ('', name)]
            if nb:
                rgb[y, x] = mode_of([tuple(rgb[q]) for q in nb])
                label[y, x] = mode_of([label[q] for q in nb])
                left[y, x] = False
    for y, x in zip(*np.nonzero(left)):
        label[y, x] = ''
        rgb[y, x] = 255


def line_rgb():
    """His black line's colour."""
    return his_line(his())


def our_frame(fig, rgb=None, label=None):
    """game(fig) laid in our 256 x 256 frame: (rgb, mask, label)."""
    if rgb is None:
        rgb, label = game(fig)
    ox, oy = offset(fig)
    out = np.zeros((256, 256, 3), np.int32)
    m = np.zeros((256, 256), bool)
    lab = np.full((256, 256), '', dtype='<U12')
    ys, xs = np.nonzero(label != '')
    for y, x in zip(ys, xs):
        Y, X = y + oy, x + ox
        if 0 <= Y < 256 and 0 <= X < 256:
            out[Y, X] = rgb[y, x]
            m[Y, X] = True
            lab[Y, X] = label[y, x]
    return out, m, lab


# ---------------------------------------------------------------------------------------------------------
# Cutting into pieces (tools/refs/samurai_ref.py's helpers)
# ---------------------------------------------------------------------------------------------------------

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


def continue_plain(col, mask, rows, x_to, direction, line, allowed):
    """A plate continued along its rows where something in front hides it (the chest under the near arm): on
    each row, from the piece's edge toward `direction` to column `x_to`, the commonest colour of his
    plate (not his line nor his gold, so no trim runs on as stripes), the same on every row, closed on his
    line. Only `allowed` cells (hidden at rest) are filled. Returns (mask, colours)."""
    m = mask.copy()
    c = col.copy()
    body = [tuple(col[y, x]) for y, x in zip(*np.nonzero(mask)) if kind(col[y, x]) in ('steel', 'warm', 'brown', 'red', 'dark')]
    fill = np.array(mode_of(body))
    for y in rows:
        xs = np.nonzero(mask[y])[0]
        if not len(xs):
            continue
        x = xs.min() if direction < 0 else xs.max()
        last = None
        while (x - x_to) * direction < 0:
            x += direction
            if not (0 <= x < m.shape[1]) or m[y, x]:
                continue
            if not allowed[y, x]:
                break
            c[y, x] = fill
            m[y, x] = True
            last = x
        if last is not None:
            c[y, last] = line
    return m, c


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


def fill_hull(col, mask, extra, allowed, line, along=None, src_kinds=None, fill_with=None):
    """A limb piece filled out to its whole shape where pieces in front hide it at rest: the convex hull of
    its pixels and `extra` (cells it reaches under: a knee guard, up to the hip), and in it every cell
    `allowed` (hidden at rest) the piece does not have takes its nearest pixel of his that is not his line;
    a filled cell on the hull's edge is his line. With `along` (a step (dy, dx)), a cell takes instead the
    first pixel of his that is not his line found stepping that way from it (his folds carried on along
    their run), its nearest only where that way meets none."""
    H, W = mask.shape
    pts = list(zip(*np.nonzero(mask | extra)))
    hm = hull(pts, H, W)
    add = hm & allowed & ~mask
    src = [(y, x) for y, x in zip(*np.nonzero(mask)) if kind(col[y, x]) != 'line' and (src_kinds is None or kind(col[y, x]) in src_kinds)]
    if not src:
        return mask.copy(), col.copy()
    c = col.copy()
    for y, x in zip(*np.nonzero(add)):
        q = None
        if along is not None:
            yy, xx = y + along[0], x + along[1]
            while 0 <= yy < H and 0 <= xx < W:
                if mask[yy, xx] and kind(col[yy, xx]) != 'line':
                    q = (yy, xx)
                    break
                yy, xx = yy + along[0], xx + along[1]
        if fill_with is not None:
            c[y, x] = fill_with
            continue
        if q is None:
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


def module(doc, consts, bases, prefix, header_import="import type { PaintedPiece } from '../painted';"):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what each
    of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, fig, mask, colours, doc,
    pivot in our frame, angle); mask and colours are game(fig)'s) and where each lands in our idle frame 0,
    unturned (`<PREFIX>_REST`: the fine pixel of its first row's first cell)."""
    out = [doc, header_import, '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    found = {}
    body = []
    rest = []
    for const, fig, mask, col, pdoc, pivot, ang in consts:
        rows, origin, pal = pack(col, mask)
        for h in pal.values():
            found[h] = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        ox, oy = offset(fig)
        pv = (pivot[0] - ox, pivot[1] - oy)
        body.append(ts_piece(const, pdoc, rows, origin, pal, pv, ang))
        rest.append((const, (origin[0] + ox, origin[1] + oy)))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/knights_ref.py kind). */")
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


def header(script, what):
    """The first lines of a generated module."""
    return (f'// {what}, his pixels at our scale (tools/refs/{script} from\n'
            '// docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py).\n'
            '// Generated: rerun the script to change it.')


def angle(a, b):
    """The angle (degrees) from his joint a to his joint b."""
    (ax, ay), (bx, by) = his_joint(a), his_joint(b)
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def rest_angle(body, a, b):
    """Our rig's angle (degrees) from joint a to joint b at idle frame 0 (OUR_JOINTS)."""
    (ax, ay), (bx, by) = OUR_JOINTS[body][a], OUR_JOINTS[body][b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def run(argv, build):
    """A part script's main: `build()` gives the module's text, written to argv[1]."""
    if len(argv) < 2:
        sys.exit(f'usage: python3 -I {argv[0]} <out.ts>')
    write(argv[1], build())


SET_NAME = {'paladin': 'PALADIN', 'dark': 'DARK', 'dragon': 'DRAGON'}


def his_game(name, fig):
    """His joint in game(fig) pixels (the shared joints, the paladin's, in our frame)."""
    x, y = his_joint(name)
    ox, oy = offset(fig)
    return (x - ox, y - oy)


# The face (our frame: x0, y0, x1, y1): his skin, his eyes' glints and the line round and in them here are
# the face; the rest of his head is his hair.
FACE_BOX = (120, 135, 136, 150)
# His eyes in our frame: the near eye's lash row (the face anchor's row, where the game draws eyes), and
# where each eye starts from the face anchor's column (FACE_ANCHOR[0], our male's at rest).
FACE_ANCHOR = (123, 139)
HEAD_UP = 139 - FACE_ANCHOR[1]
EYE_COLS = (2, 9)
EYE_W = (6, 4)


def pieces(fig):
    """game(fig) cut into the pieces the items stamp: {name: (mask, colours)} in game(fig) pixels. Each piece
    is its regions' pixels with his line round them (cut()); where something in front hides it at rest and a
    pose shows it, it is continued from his pixels, closed on his line:
      upper_n, upper_f   the upper arm up under the pauldron to the shoulder
      chest              under the near arm out to the near shoulder, and down under the belt
      thigh_n, thigh_f   the thigh's whole shape under the tassets, the knee and the sword
      knee_*, shin_*     what the sword hides, along each row
      tasset_*           what the sword and the hand hide, along each row
      cape               behind the body from panel to panel along each row (it hangs behind him)
    The head (the paladin's) is cut into the face (FACE_BOX: skin, glints and the line in and round them) and
    the hair (the rest of his head)."""
    key = ('pieces', fig)
    if key not in _CACHE:
        _CACHE[key] = _disk('pieces-' + fig, lambda: _pieces(fig))
    return {k: (m.copy(), c.copy()) for k, (m, c) in _CACHE[key].items()}


def _pieces(fig):
    rgb, label = game(fig)
    line = line_rgb()
    H, W = label.shape
    K = np.array([[kind(rgb[y, x]) if label[y, x] else '' for x in range(W)] for y in range(H)])
    under = lambda *names: np.isin(label, names)
    out = {}
    for n in ('hand_n', 'fore_n', 'pauldron_n', 'hand_f', 'fore_f', 'pauldron_f', 'belt', 'foot_n', 'foot_f', 'fur', 'fur_f'):
        if (label == n).any():
            out[n] = cut(rgb, label, [n])
    out['hilt'] = cut(rgb, label, ['hilt', 'guard'])
    out['blade'] = cut(rgb, label, ['blade'])
    sword = ('blade', 'hilt', 'guard', 'hand_n')
    # the upper arms up under the pauldrons to the shoulders
    for s in ('n', 'f'):
        m, c = cut(rgb, label, ['upper_' + s])
        sx, sy = his_game('shoulder' + s.upper(), fig)
        ys, xs = np.nonzero(m)
        m, c, _ = continue_cols(c, m, range(xs.min() + 1, xs.max()), int(np.floor(sy)) - 2, -1, line, inset=1, allowed=under('pauldron_' + s, 'fur', 'fur_f', 'head'))
        out['upper_' + s] = (m, c)
    # the chest out to the near shoulder under the near arm, and down under the belt
    m, c = cut(rgb, label, ['chest'])
    sx, sy = his_game('shoulderN', fig)
    ys, xs = np.nonzero(m)
    m, c = continue_plain(c, m, range(ys.min() + 1, ys.max()), int(np.floor(sx)), -1, line, allowed=under('pauldron_n', 'upper_n', 'fur', 'head'))
    ys, xs = np.nonzero(m)
    m, c, _ = continue_cols(c, m, range(xs.min() + 1, xs.max()), ys.max() + 4, 1, line, inset=1, allowed=under('belt', 'tasset_n', 'tasset_c', 'tasset_f', 'hand_n', 'hand_f'))
    out['chest'] = (m, c)
    # the thighs' whole shape under what hides them
    for s in ('n', 'f'):
        m, c = cut(rgb, label, ['thigh_' + s])
        if not m.any():
            out['thigh_' + s] = (m, c)
            continue
        hx, hy = his_game('hip' + s.upper(), fig)
        kx, ky = his_game('knee' + s.upper(), fig)
        reach = np.zeros_like(m)
        reach[int(np.floor(hy)) - 1, int(np.floor(hx)) - 3:int(np.floor(hx)) + 4] = True
        reach[int(np.floor(ky)), int(np.floor(kx)) - 3:int(np.floor(kx)) + 4] = True
        front = under('tasset_n', 'tasset_c', 'tasset_f', 'belt', 'knee_n', 'knee_f', *sword)
        m, c = fill_hull(c, m, reach, front, line)
        out['thigh_' + s] = (m, c)
    # a thigh he hid whole (the dragon knight's near thigh under his tassets and knee): his other thigh, laid
    # from its hip to this one's, where the figure hides it at rest
    for s, o in (('n', 'f'), ('f', 'n')):
        if out['thigh_' + s][0].sum() >= 12:
            continue
        om, oc = out['thigh_' + o]
        (hx, hy), (gx, gy) = his_game('hip' + s.upper(), fig), his_game('hip' + o.upper(), fig)
        dx, dy = int(round(hx - gx)), int(round(hy - gy))
        m = np.zeros_like(om)
        c = oc.copy()
        hidden = (label != '') & ~under('thigh_' + s)
        for y, x in zip(*np.nonzero(om)):
            Y, X = y + dy, x + dx
            if 0 <= Y < H and 0 <= X < W and hidden[Y, X]:
                m[Y, X] = True
                c[Y, X] = oc[y, x]
        out['thigh_' + s] = (m, c)
    # what the sword hides of each leg: the knee guard and the greave filled out together to their whole
    # shape, a cell above the knee joint's row the knee guard's, below it the greave's
    for sd in ('n', 'f'):
        km, kc = cut(rgb, label, ['knee_' + sd])
        sm, sc = cut(rgb, label, ['shin_' + sd])
        um = km | sm
        uc = np.where(km[..., None], kc, sc)
        if um.any():
            fm, fc = fill_hull(uc, um, np.zeros_like(um), under(*sword), line)
            ky = his_game('knee' + sd.upper(), fig)[1] + 2
            rows_ = np.arange(H)[:, None]
            add = fm & ~um
            km2 = km | (add & (rows_ < ky))
            sm2 = sm | (add & (rows_ >= ky))
            out['knee_' + sd] = (km2, np.where(km2[..., None], fc, kc))
            out['shin_' + sd] = (sm2, np.where(sm2[..., None], fc, sc))
    # what the sword hides of the tassets, along each row
    for n in ('tasset_n', 'tasset_c', 'tasset_f'):
        m, c = cut(rgb, label, [n])
        if m.any():
            m, c = fill_spans(c, m, line, allowed=under(*sword))
        out[n] = (m, c)
    # the cape: its panels and, along each row, behind the body between them
    m, c = cut(rgb, label, ['cape', 'cape_f'])
    body = (label != '') & ~under('cape', 'cape_f')
    m, c = fill_spans(c, m, line, allowed=body)
    # and up behind the body to the shoulders (it hangs from them): the inside of his cape, in the darkest of
    # his four commonest cape reds (its shadow behind him)
    reach = np.zeros_like(m)
    for j in ('shoulderN', 'shoulderF'):
        jx, jy = his_game(j, fig)
        reach[int(np.floor(jy)), int(np.floor(jx))] = True
    reds = [tuple(c[y, x]) for y, x in zip(*np.nonzero(m)) if kind(c[y, x]) == 'red']
    shade = min(sorted(set(reds), key=lambda q: (-reds.count(q), q))[:4], key=lambda q: float(luma(np.array(q))))
    m, c = fill_hull(c, m, reach, body, line, fill_with=np.array(shade))
    out['cape'] = (m, c)
    # the head: face and hair
    head = label == 'head'
    ox, oy = offset(fig)
    x0, y0, x1, y1 = FACE_BOX
    box = np.zeros_like(head)
    box[y0 - oy:y1 - oy, x0 - ox:x1 - ox] = True
    face = head & box & ~np.isin(K, ('red', 'brown', 'line', 'dark'))
    face |= head & box & np.isin(K, ('line', 'red', 'dark', 'brown')) & near4(face) & (np.arange(H)[:, None] >= FACE_ANCHOR[1] - oy)
    out['face'] = (face, rgb.copy())
    hair = head & ~face
    # bits of his head apart from his hair (a speck by the cheek, his chin's line under the jaw) are the face's,
    # so the hair is one piece and the face keeps its outline under any hairstyle
    comps = sorted(components(hair, True), key=len)
    by_face = near8(face)
    for comp in comps[:-1]:
        if (len(comp) < 6 or all(kind(rgb[q]) == 'line' for q in comp)) and any(by_face[q] for q in comp):
            for q in comp:
                hair[q] = False
                face[q] = True
    out['face'] = (face, rgb.copy())
    out['hair'] = (hair, rgb.copy())
    return out


def torso_angle():
    return rest_angle('male', 'pelvis', 'neck')


# Where each piece turns at rest and its angle there: (joint, (from, to) for the angle, or None for the
# torso's). The pieces riding the torso are pinned where he drew them by the game (knights.ts).
PIVOTS = {
    'chest': ('neck', None), 'pauldron_n': ('shoulderN', ('shoulderN', 'elbowN')), 'pauldron_f': ('shoulderF', ('shoulderF', 'elbowF')),
    'fur': ('neck', None), 'fur_f': ('neck', None),
    'upper_n': ('shoulderN', ('shoulderN', 'elbowN')), 'fore_n': ('elbowN', ('elbowN', 'wristN')), 'hand_n': ('wristN', ('elbowN', 'wristN')),
    'upper_f': ('shoulderF', ('shoulderF', 'elbowF')), 'fore_f': ('elbowF', ('elbowF', 'wristF')), 'hand_f': ('wristF', ('elbowF', 'wristF')),
    'belt': ('pelvis', None), 'tasset_n': ('pelvis', None), 'tasset_c': ('pelvis', None), 'tasset_f': ('pelvis', None),
    'thigh_n': ('hipN', ('hipN', 'kneeN')), 'thigh_f': ('hipF', ('hipF', 'kneeF')),
    'knee_n': ('kneeN', ('kneeN', 'ankleN')), 'knee_f': ('kneeF', ('kneeF', 'ankleF')),
    'shin_n': ('ankleN', ('kneeN', 'ankleN')), 'shin_f': ('ankleF', ('kneeF', 'ankleF')),
    'foot_n': ('ankleN', ('kneeN', 'ankleN')), 'foot_f': ('ankleF', ('kneeF', 'ankleF')),
    'cape': ('neck', None),
}


def entry(fig, piece, doc, P=None):
    """A module entry for piece `piece` of figure `fig`: KNIGHT_<SET>_<PIECE>."""
    if P is None:
        P = pieces(fig)
    m, c = P[piece]
    joint, seg = PIVOTS[piece]
    ang = torso_angle() if seg is None else angle(*seg)
    return (f'KNIGHT_{SET_NAME[fig]}_{piece.upper()}', fig, m, c, doc, his_joint(joint), ang)


def base(fig, names, kinds_, q=0.5, P=None):
    """His colour of middle lightness among the pixels of these kinds in these pieces of a figure: the base a
    colour slot recolours from."""
    if P is None:
        P = pieces(fig)
    found = []
    for n in names:
        m, c = P[n]
        found += [(float(luma(c[y, x])), hexc(c[y, x])) for y, x in zip(*np.nonzero(m)) if kind(c[y, x]) in kinds_]
    found.sort()
    return found[int(len(found) * q)][1] if found else None
