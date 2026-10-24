"""Shared helpers for lifting parts out of the owner's four heroine pictures.

  lyra     docs/reference/lyra-owner-reference.jpg     (provisional "Lyra, la Espada Dorada")
  elise    docs/reference/elise-owner-reference.jpg    (provisional "Elise, la Espada Celeste")
  saya     docs/reference/saya-owner-reference.jpg     (provisional "Saya, la Sombra Carmesí")
  aurelia  docs/reference/aurelia-owner-reference.jpg  (provisional "Aurelia, la Sacerdotisa del Alba")

All four are his own pixel art on white: a woman in 3/4 view facing right, standing as our sprites
stand. Lyra and Elise (1493 x 2000) are one body in one pose, pixel for pixel (only the clothes, the
hair and the colours differ): her pixel is 7.81 picture pixels, 190 x 256 of them, and she is 256 of
them tall (hair top 0 to the near sole 255). Saya (2000 x 2000) and Aurelia (1932 x 1932) are two
more bodies of the same kind, each its own (Saya's limbs are thicker, Aurelia's stance narrower):
200 x 200 pixels of 10 and 9.66 picture pixels, 198 of them tall (2 to 199). Ours is 91 (the female
body's skull top 128 to the near sole 218), so nothing is copied 1:1: every part is brought down to
our scale and fitted to our female rig (src/sprite/rig.ts 'female' at idle frame 0) segment by
segment (SEGMENTS), in each picture's own colours (PALETTES).

Her pixels sit on an even grid that wanders by a picture pixel or so (Lyra and Elise; Saya's and
Aurelia's are exact): grid() snaps each boundary of the even grid to where her edges are, native()
takes the median of each block's inside.

  native(which)       her pixels, (H, W, 3) int: 256 x 190 (lyra, elise), 200 x 200 (saya, aurelia)
  background(a)       the white round her
  figure(which)       her figure: not the white round her nor the white she walls in (HOLES), and
                      the light round her weapon (GLOW, glow(which))
  JOINTS[which]       her joints in her pixels (lyra and elise share one dict: the same body)
  EYES[which]         her eyes (the head's anchor)
  OUR_JOINTS          our female rig at idle frame 0, in fine pixels of our 256 x 256 frame
  OUR_EYES            our female's eyes ('standard' eyes)
  SEGMENTS[which]     how each part of her lands on our rig; backward() / forward() its maps
  PALETTES[which]     each picture's colours; rgb(which), quantize(a, which)
  reduced(which)      the reduced reference (tools/refs/heroine-study.py): her figure at our scale on
                      our female idle, every pixel one of that picture's colours; reduced_parts() which
                      part each pixel is, reduced_layers() each part alone

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from
the repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, pack, save, ts_piece  # noqa: E402,F401

REFS = {
    'lyra': 'docs/reference/lyra-owner-reference.jpg',
    'elise': 'docs/reference/elise-owner-reference.jpg',
    'saya': 'docs/reference/saya-owner-reference.jpg',
    'aurelia': 'docs/reference/aurelia-owner-reference.jpg',
}
WHICH = ('lyra', 'elise', 'saya', 'aurelia')
NAMES = {
    'lyra': ('Lyra, the Gilded Blade', 'Lyra, la Espada Dorada'),
    'elise': ('Elise, the Azure Blade', 'Elise, la Espada Celeste'),
    'saya': ('Saya, the Crimson Shade', 'Saya, la Sombra Carmesí'),
    'aurelia': ('Aurelia, the Dawn Priestess', 'Aurelia, la Sacerdotisa del Alba'),
}
# Her pixel size and where the first boundary falls, in picture pixels (x, y): the strongest period
# of her edges across each whole picture. Lyra 7.8060 x 7.8115 from 5.57, 0.14 and Elise 7.8055 x
# 7.8120 from 5.61, 0.02 share one grid (2000 / 256 = 7.8125 down). Saya's is exactly 10 from 0
# (a 200 x 200 picture blown up ten times); Aurelia's 9.66 from 0 (the same, shrunk to 1932).
PITCH = {'lyra': (7.806, 7.812), 'elise': (7.806, 7.812), 'saya': (10.0, 10.0), 'aurelia': (9.66, 9.66)}
PHASE = {'lyra': (5.57, 0.14), 'elise': (5.61, 0.02), 'saya': (0.0, 0.0), 'aurelia': (0.0, 0.0)}
# How far (picture pixels) a boundary may be snapped off the even grid to the edge she drew.
SNAP = 1
GRID = 256


def _edges(L, axis):
    """Edge strength at each boundary along an axis (0: x, 1: y), summed across the picture; the
    picture's own edges count as the strongest."""
    g = np.zeros(L.shape[1 - axis] + 1)
    g[1:-1] = np.abs(np.diff(L, axis=1 - axis)).sum(axis)
    g[0] = g[-1] = g.max() * 4
    return g


def _snap(g, pitch, phase, R=SNAP, lam=400.0):
    """Her block boundaries along one axis: each within R picture pixels of the even grid (pitch,
    phase), where her edges are strongest, no block more than two picture pixels off the pitch. The
    JPEG's own 8 x 8 blocks leave faint edges every 8 picture pixels, as strong as hers in the white
    round her: lam keeps a boundary on the even grid unless an edge of hers pulls it off."""
    n = len(g) - 1
    lo, hi = int(np.floor(pitch)) - 2, int(np.ceil(pitch)) + 2
    u = [phase + k * pitch for k in range(int((n - phase) / pitch) + 2)]
    u = [x for x in u if -0.5 <= x <= n + 0.5]
    best = []
    for i, x in enumerate(u):
        row = {}
        for c in range(int(np.floor(x)) - R, int(np.floor(x)) + R + 2):
            if not 0 <= c <= n:
                continue
            s = g[c] - lam * abs(c - x)
            if i == 0:
                row[c] = (s, None)
                continue
            opts = [(best[i - 1][q][0] + s, q) for q in best[i - 1] if lo <= c - q <= hi]
            if opts:
                row[c] = max(opts)
        best.append(row)
    i = len(best) - 1
    c = max(best[i], key=lambda q: best[i][q][0])
    out = []
    while i >= 0:
        out.append(c)
        c = best[i][c][1]
        i -= 1
    return out[::-1]


_GRID_CACHE = {}


def grid(which):
    """Her block boundaries in picture pixels: (xs, ys)."""
    if which not in _GRID_CACHE:
        a = np.asarray(Image.open(REFS[which]).convert('RGB')).astype(np.float64)
        L = luma(a)
        _GRID_CACHE[which] = (_snap(_edges(L, 0), PITCH[which][0], PHASE[which][0]),
                              _snap(_edges(L, 1), PITCH[which][1], PHASE[which][1]))
    return _GRID_CACHE[which]


_NATIVE_CACHE = {}


def native(which):
    """Her pixels: the median of each block's inside (a picture pixel in from its edges), as an
    (H, W, 3) int array."""
    if which not in _NATIVE_CACHE:
        a = np.asarray(Image.open(REFS[which]).convert('RGB')).astype(np.int32)
        xs, ys = grid(which)
        out = np.zeros((len(ys) - 1, len(xs) - 1, 3))
        for j in range(len(ys) - 1):
            for i in range(len(xs) - 1):
                c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
                out[j, i] = np.median(c, axis=0)
        _NATIVE_CACHE[which] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE_CACHE[which].copy()


def background(a, light=228, seeds=()):
    """The white round her, reached from the picture's edge (or from `seeds`, (x, y)) through pixels
    lighter than `light`."""
    H, W, _ = a.shape
    L = luma(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    stack += [(y, x) for x, y in seeds]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= light:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


# The white she leaves inside her outline, walled in by her (a pixel of each, x, y): between her near
# arm and her coat or skirt, between her hair and her shoulder, between Saya's thighs. Her white
# clothes (Elise's breastplate and boots, Aurelia's dress) and her highlights are not.
HOLES = {
    'lyra': [(60, 112), (60, 49), (50, 70)],
    'elise': [(60, 112), (56, 56)],
    'saya': [(70, 48), (75, 93), (103, 119)],
    'aurelia': [],
}


# The light round her weapon, pale on his white (polygon in her pixels, and which of her pixels in it
# are the light's): Lyra's cyan sparkles, Elise's and Saya's golden glow, Aurelia's rays from the
# pearl. It is hers though lighter than the white flood lets through.
GLOW = {
    'lyra': ([(40, 140), (90, 160), (150, 225), (150, 250), (40, 250)], lambda a: a[..., 2] > a[..., 0] + 30),
    'elise': ([(40, 140), (90, 160), (150, 225), (150, 250), (40, 250)], lambda a: a[..., 0] > a[..., 2] + 25),
    'saya': ([(0, 110), (70, 110), (150, 165), (150, 195), (0, 195)], lambda a: a[..., 0] > a[..., 2] + 25),
    'aurelia': ([(138, 120), (196, 120), (196, 200), (138, 200)], lambda a: a[..., 0] > a[..., 2] + 20),
}


def inside(poly, xs, ys):
    """Even-odd test of points against a polygon."""
    poly = np.asarray(poly, float)
    res = np.zeros(np.broadcast(xs, ys).shape, bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        cond = ((yi > ys) != (yj > ys)) & (xs < (xj - xi) * (ys - yi) / (yj - yi + 1e-12) + xi)
        res ^= cond
        j = i
    return res


def glow(which):
    """Her weapon's light (GLOW): (H, W) bool."""
    N = native(which)
    poly, test = GLOW[which]
    H, W = N.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    return inside(poly, xx + 0.5, yy + 0.5) & test(N) & (luma(N) < 252)


def figure(which):
    """Her figure: every pixel of hers that is not the white round her or a hole (HOLES), and the
    light round her weapon (GLOW)."""
    return ~background(native(which), seeds=HOLES[which]) | glow(which)


# Her joints, in her pixels (x, y; a pixel (i, j) spans i..i+1, j..j+1), found by looking at her
# (near = screen-left, as ours): the head is the middle of her skull, the neck under her chin, the
# shoulders the tops of her upper arms, the elbows where her sleeves bend (at her waist, as ours),
# the wrists where her cuffs end, the hands the middle of each hand, the pelvis and hips at the top
# of her thighs under the skirt, the knees the middle of her knee guards or the bend of her boots,
# the ankles where her boots are narrowest. The far hip is as high as the near one in all four (ours
# is 3.5 higher: our far leg steps out to the right).
TEMPLATE = {
    'head': (96.0, 24.0),
    'neck': (101.0, 50.0),
    'shoulderN': (69.0, 64.0),
    'shoulderF': (114.0, 63.0),
    'elbowN': (58.0, 100.0),
    'elbowF': (120.0, 103.0),
    'wristN': (51.0, 124.0),
    'wristF': (124.0, 126.0),
    'handN': (45.0, 131.0),
    'handF': (127.0, 135.0),
    'pelvis': (98.0, 124.0),
    'hipN': (89.0, 127.0),
    'hipF': (108.0, 127.0),
    'kneeN': (73.0, 186.0),
    'kneeF': (107.0, 186.0),
    'ankleN': (63.0, 234.0),
    'ankleF': (109.0, 233.0),
}
JOINTS = {
    'lyra': TEMPLATE,
    'elise': TEMPLATE,
    'saya': {
        'head': (106.0, 22.0),
        'neck': (107.0, 43.0),
        'shoulderN': (89.0, 56.0),
        'shoulderF': (120.0, 55.0),
        'elbowN': (81.0, 82.0),
        'elbowF': (127.0, 82.0),
        'wristN': (73.0, 99.0),
        'wristF': (130.0, 100.0),
        'handN': (68.0, 106.0),
        'handF': (131.0, 108.0),
        'pelvis': (106.0, 99.0),
        'hipN': (97.0, 101.0),
        'hipF': (116.0, 101.0),
        'kneeN': (82.0, 150.0),
        'kneeF': (116.0, 150.0),
        'ankleN': (77.0, 181.0),
        'ankleF': (118.0, 182.0),
    },
    'aurelia': {
        'head': (100.0, 20.0),
        'neck': (104.0, 42.0),
        'shoulderN': (88.0, 54.0),
        'shoulderF': (118.0, 54.0),
        'elbowN': (76.0, 80.0),
        'elbowF': (125.0, 80.0),
        'wristN': (69.0, 101.0),
        'wristF': (130.0, 101.0),
        'handN': (66.0, 110.0),
        'handF': (131.0, 109.0),
        'pelvis': (106.0, 95.0),
        'hipN': (97.0, 98.0),
        'hipF': (116.0, 98.0),
        'kneeN': (82.0, 146.0),
        'kneeF': (121.0, 147.0),
        'ankleN': (77.0, 184.0),
        'ankleF': (122.0, 183.0),
    },
}
# Her eyes, her pixels: the middle of each iris across, the middle of the eye with its lashes down.
# The head scales about their middle.
EYES = {
    'lyra': {'near': (99.0, 31.0), 'far': (109.5, 31.0)},
    'elise': {'near': (99.0, 31.0), 'far': (109.5, 31.0)},
    'saya': {'near': (105.5, 27.0), 'far': (115.5, 27.0)},
    'aurelia': {'near': (102.5, 26.5), 'far': (114.5, 26.5)},
}
# Our female rig at idle frame 0 (src/sprite/compose.ts renderSprite(...).rig, design units x RES),
# in fine pixels of our 256 x 256 frame (tools/refs/heroine-idle.mts prints it).
OUR_JOINTS = {
    'head': (126.00, 140.00),
    'neck': (127.24, 149.84),
    'shoulderN': (116.52, 154.62),
    'shoulderF': (132.68, 154.05),
    'elbowN': (112.82, 166.03),
    'elbowF': (135.22, 165.78),
    'wristN': (110.46, 176.16),
    'wristF': (140.49, 174.74),
    'handN': (109.75, 179.23),
    'handF': (142.09, 177.46),
    'pelvis': (127.00, 177.47),
    'hipN': (119.88, 177.11),
    'hipF': (132.94, 173.66),
    'kneeN': (120.45, 193.10),
    'kneeF': (139.58, 188.21),
    'ankleN': (116.78, 207.65),
    'ankleF': (137.28, 203.04),
}
# Our female's 'standard' eyes: the near iris is columns 125-126, the far one column 132; the eyes
# from their lashes (row 139) to their lower edge (row 143).
OUR_EYES = {'near': (126.0, 141.5), 'far': (132.5, 141.5)}
# Our female body at idle frame 0: the skull's top row and the near sole's last row.
OUR_TOP, OUR_SOLE = 128, 218


def _mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


# How each of her bodies lands on ours. Ours is not hers: our head is a third bigger for the body
# (she is 5.1 to 5.4 heads tall, ours 4.1), our neck and torso shorter and wider, our feet and hands
# bigger, our far leg steps out where her near one does (her legs are as long as ours for the
# height: the crotch is at 58% of it in both; tools/refs/heroine-proportions.py). So each part has
# its own map:
#   'sim'     scaled (sx across, sy down) about her point `her`, which lands on our point `our`
#   'column'  a body column: rows of knots (her y, our y, her middle x, our middle x, sx); between
#             knots everything is linear (her y -> our y, and x scaled by sx about the middle line);
#             past the end knots the end runs go on
#   'chain'   her limb line (points `her`) laid on ours (`our`), each run lengthwise by the ratio of
#             the two runs and across by `width`; past the last point `end` takes over (a 'sim')
# Numbers per body (BODY_FIT): the head's scale (sx keeps her eyes as far apart as ours, sy puts her
# hair top a pixel over our skull and her chin on ours), the torso's knots (neck, shoulders, waist,
# pelvis, the skirt's hem), the long hair's and the coat's knots, the limbs' widths, the hand and foot
# scale, the weapon's scale (her weapon keeps her angle: our swords hang at 52 at rest, hers at 51
# to 52).
BODY_FIT = {
    'template': {
        'head': (0.56, 0.51),
        # her y, our y, her middle x, our middle x, sx
        'torso': [(47.0, 150.5, 101.0, 127.5, 0.42), (64.0, 154.6, 96.0, 125.5, 0.40), (103.0, 168.0, 98.0, 126.5, 0.40),
                  (124.0, 177.5, 98.0, 127.0, 0.44), (148.0, 183.0, 98.0, 128.0, 0.46)],
        'coat': [(112.0, 172.0, 96.0, 127.5, 0.40), (186.0, 193.1, 92.0, 128.5, 0.40), (224.0, 204.5, 90.0, 128.5, 0.40)],
        'arm': 0.42, 'leg': 0.42, 'hand': 0.46, 'foot': 0.5, 'weapon': 0.36,
    },
    'saya': {
        'head': (0.65, 0.62),
        'torso': [(41.0, 150.5, 108.0, 127.5, 0.5), (56.0, 154.6, 104.0, 125.5, 0.5), (82.0, 168.0, 106.0, 126.5, 0.5),
                  (99.0, 177.5, 106.0, 127.0, 0.52), (117.0, 182.5, 106.0, 128.0, 0.54)],
        'coat': [(90.0, 173.5, 106.0, 127.5, 0.5), (150.0, 193.1, 100.0, 128.5, 0.5), (181.0, 207.6, 98.0, 128.5, 0.5)],
        'arm': 0.48, 'leg': 0.48, 'hand': 0.55, 'foot': 0.55, 'weapon': 0.46,
    },
    'aurelia': {
        'head': (0.55, 0.6),
        'torso': [(40.0, 150.5, 105.0, 127.5, 0.48), (54.0, 154.6, 103.0, 125.5, 0.47), (80.0, 168.0, 106.0, 126.5, 0.47),
                  (95.0, 177.5, 106.0, 127.0, 0.5), (113.0, 182.5, 106.0, 128.0, 0.52)],
        'coat': [(95.0, 177.5, 106.0, 127.5, 0.48), (146.0, 193.1, 102.0, 128.5, 0.48), (184.0, 207.6, 100.0, 128.5, 0.48)],
        'arm': 0.48, 'leg': 0.48, 'hand': 0.55, 'foot': 0.55, 'weapon': 0.46,
    },
}
FIT_OF = {'lyra': 'template', 'elise': 'template', 'saya': 'saya', 'aurelia': 'aurelia'}


def _segments(which):
    J, E, F = JOINTS[which], EYES[which], BODY_FIT[FIT_OF[which]]
    eh = _mid(E['near'], E['far'])
    eo = _mid(OUR_EYES['near'], OUR_EYES['far'])
    sx, sy = F['head']
    head = {'kind': 'sim', 'sx': sx, 'sy': sy, 'her': eh, 'our': eo}
    # her chin row and ours: the hair below it follows the torso, above it the head
    chin_her = F['torso'][0][0]
    chin_our = eo[1] + (chin_her - eh[1]) * sy
    # the long hair: the head's map down to her chin, then the torso's knots (her hair falls down her
    # back as our body runs), its middle line on her eyes' at the chin, on the torso's below
    hair = [(eh[1] - 60.0, eo[1] - 60.0 * sy, eh[0], eo[0], sx), (chin_her, chin_our, eh[0], eo[0], sx)]
    hair += [k for k in F['torso'][2:]]
    seg = {
        'head': head,
        'hair': {'kind': 'column', 'knots': hair},
        'torso': {'kind': 'column', 'knots': F['torso']},
        'coat': {'kind': 'column', 'knots': F['coat']},
    }
    for side in 'NF':
        seg['arm' + side] = {'kind': 'chain', 'her': [J[j + side] for j in ('shoulder', 'elbow', 'wrist')],
                             'our': [OUR_JOINTS[j + side] for j in ('shoulder', 'elbow', 'wrist')], 'width': F['arm'],
                             'end': {'s': F['hand'], 'her': J['wrist' + side], 'our': OUR_JOINTS['wrist' + side]}}
        seg['hand' + side] = {'kind': 'sim', 'sx': F['hand'], 'sy': F['hand'], 'her': J['wrist' + side], 'our': OUR_JOINTS['wrist' + side]}
        seg['leg' + side] = {'kind': 'chain', 'her': [J[j + side] for j in ('hip', 'knee', 'ankle')],
                             'our': [OUR_JOINTS[j + side] for j in ('hip', 'knee', 'ankle')], 'width': F['leg'],
                             'end': {'s': F['foot'], 'her': J['ankle' + side], 'our': OUR_JOINTS['ankle' + side]}}
    # the weapon in her near hand, about our near hand, at her angle (Aurelia's staff in her far hand)
    w = F['weapon']
    hand = 'handF' if which == 'aurelia' else 'handN'
    seg['weapon'] = {'kind': 'sim', 'sx': w, 'sy': w, 'her': J[hand], 'our': OUR_JOINTS[hand]}
    return seg


SEGMENTS = {w: _segments(w) for w in WHICH}


def _lin(v, xs, ys):
    """Piecewise linear through (xs, ys), the end runs going on."""
    v = np.asarray(v, float)
    xs, ys = np.asarray(xs, float), np.asarray(ys, float)
    out = np.interp(v, xs, ys)
    lo, hi = v < xs[0], v > xs[-1]
    out = np.where(lo, ys[0] + (v - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]), out)
    out = np.where(hi, ys[-1] + (v - xs[-1]) * (ys[-1] - ys[-2]) / (xs[-1] - xs[-2]), out)
    return out


def _column(seg, y, src, dst):
    k = np.asarray(seg['knots'], float)
    ys = {'her': k[:, 0], 'our': k[:, 1]}
    mx = {'her': k[:, 2], 'our': k[:, 3]}
    return _lin(y, ys[src], ys[dst]), _lin(y, ys[src], mx[src]), _lin(y, ys[src], mx[dst]), _lin(y, ys[src], k[:, 4])


def _chain(seg, q, inverse):
    """A chain's map, ours -> hers (inverse False: q in ours) or hers -> ours (q in hers). Each point
    goes by the run nearest to it; past the last point, the end piece about it."""
    src, dst = ('our', 'her') if not inverse else ('her', 'our')
    A = [np.asarray(p, float) for p in seg[src]]
    B = [np.asarray(p, float) for p in seg[dst]]
    w = seg['width'] if not inverse else 1 / seg['width']
    best = np.full(len(q), np.inf)
    out = np.zeros_like(q)
    for k in range(len(A) - 1):
        a, b, ha, hb = A[k], A[k + 1], B[k], B[k + 1]
        d, hd = b - a, hb - ha
        t = ((q - a) @ d) / (d @ d)
        n = np.array([-d[1], d[0]]) / np.hypot(*d)
        hn = np.array([-hd[1], hd[0]]) / np.hypot(*hd)
        off = (q - a) @ n
        dist = np.hypot(*(q - (a + np.clip(t, 0, 1)[:, None] * d)).T)
        p = ha + t[:, None] * hd + (off / w)[:, None] * hn
        better = dist < best - 1e-9
        out[better] = p[better]
        best = np.where(better, dist, best)
    e = seg.get('end')
    if e:
        a, b = A[-2], A[-1]
        d = b - a
        past = ((q - b) @ d) / (d @ d) > 0
        es, ea, eb = (e['s'], e['our'], e['her']) if not inverse else (1 / e['s'], e['her'], e['our'])
        out[past] = np.asarray(eb, float) + (q[past] - np.asarray(ea, float)) / es
    return out


def backward(seg, q):
    """Our points (N, 2) -> her points (N, 2) for a segment of SEGMENTS[which]."""
    q = np.asarray(q, float)
    if seg['kind'] == 'sim':
        s = np.array([seg['sx'], seg['sy']])
        return np.asarray(seg['her'], float) + (q - np.asarray(seg['our'], float)) / s
    if seg['kind'] == 'column':
        y, m_src, m_dst, sx = _column(seg, q[:, 1], 'our', 'her')
        return np.stack([m_dst + (q[:, 0] - m_src) / sx, y], 1)
    return _chain(seg, q, False)


def forward(seg, p):
    """Her points (N, 2) -> our points (N, 2) for a segment (the inverse of backward)."""
    p = np.asarray(p, float)
    if seg['kind'] == 'sim':
        s = np.array([seg['sx'], seg['sy']])
        return np.asarray(seg['our'], float) + (p - np.asarray(seg['her'], float)) * s
    if seg['kind'] == 'column':
        y, m_src, m_dst, sx = _column(seg, p[:, 1], 'her', 'our')
        return np.stack([m_dst + (p[:, 0] - m_src) * sx, y], 1)
    return _chain(seg, p, True)


# Each picture's colours: her figure's pixels (native) clustered, darkest first. Rebuild with
# `python3 -I tools/refs/heroine-study.py --palette <which>`.
PALETTES = {
    'lyra': [
        '#04010d', '#04101c', '#160a17', '#300918', '#091c28', '#3b0d21', '#2a1c24', '#590f26', '#352628', '#2a2a37',
        '#133c3b', '#691f24', '#473435', '#61301c', '#792824', '#8c1c35', '#404049', '#503b3c', '#464654', '#2e525e',
        '#6c4636', '#634947', '#246a48', '#963b2b', '#824a24', '#844440', '#565862', '#a6442d', '#4c6978', '#935623',
        '#795d58', '#477483', '#b24f33', '#9c5d27', '#686a74', '#966234', '#3e808d', '#a85a53', '#488895', '#8b7061',
        '#727882', '#ab6f31', '#489b62', '#688493', '#b47831', '#c06960', '#9a7e6a', '#788c9a', '#d07344', '#c8756a',
        '#be8442', '#4eb570', '#3eb6b5', '#8799a3', '#ac937a', '#a29881', '#ce9242', '#d88674', '#98a4aa', '#40cccb',
        '#d39c58', '#bb9f88', '#7ebe90', '#df9180', '#daa14c', '#4ecfd6', '#3ee2e2', '#9ebcc3', '#b0b6bc', '#cbb194',
        '#eea692', '#cfb599', '#e8b45e', '#46ece8', '#3af4f0', '#55f2f1', '#a6ced6', '#f4c66e', '#c7d0d4', '#badac6',
        '#aadde3', '#e4d0af', '#fdd36c', '#a6efe8', '#fdceb0', '#fed982', '#d4e4ea', '#ffe29c', '#ffe7b8', '#f6e8cd',
        '#cef5f3', '#dcf6f7', '#fbfdfd',
    ],
    'elise': [
        '#080613', '#1a101a', '#181b37', '#052c67', '#342325', '#26263e', '#1b2858', '#4c2924', '#26396d', '#0e447e',
        '#573027', '#263d7d', '#4e3739', '#354566', '#683c30', '#464754', '#115893', '#2d5090', '#614a48', '#764534',
        '#525368', '#804936', '#385c9e', '#345ea9', '#3662af', '#1276b0', '#865339', '#7d564c', '#4068ac', '#686771',
        '#905f3c', '#9b5754', '#6a6b80', '#9e6637', '#787782', '#5e7faa', '#a47043', '#b76660', '#a0765a', '#8b8076',
        '#b27b44', '#c67169', '#88889b', '#b88652', '#8d8ea0', '#a99271', '#c48d52', '#2bc3d8', '#d68271', '#d78876',
        '#cb9658', '#9f9fac', '#cf9b48', '#a6a09b', '#79aed9', '#b7a684', '#a8a8b9', '#d4a362', '#e59580', '#ddac5a',
        '#beaf9e', '#dcb06e', '#b6b6bd', '#e6b75e', '#d2bb94', '#f3ae92', '#c4c4ce', '#ecc476', '#e0c79d', '#ced0dc',
        '#f4d389', '#facdac', '#e3d9cc', '#f8dc92', '#fce89e', '#eaeaf3', '#feeeb8', '#efeff9', '#fefae0', '#fefef9',
    ],
    'saya': [
        '#02010d', '#050416', '#14101f', '#1d1d32', '#1f2241', '#4b0f30', '#302525', '#641a36', '#343545', '#6e1c38',
        '#453631', '#7c1d36', '#2e3e5d', '#314161', '#534239', '#842b3c', '#704336', '#3f5177', '#604f46', '#7d4c37',
        '#ad333f', '#bb2e3e', '#575b67', '#0a79c0', '#85543e', '#a04641', '#a95443', '#088cce', '#6c6e78', '#647299',
        '#9d6e44', '#c16244', '#8d7768', '#7e7f8e', '#be7064', '#b6834e', '#9094a4', '#989492', '#c48e42', '#a8927c',
        '#d8826e', '#c69151', '#dc8c76', '#a0a4b2', '#d4a35d', '#d8a84c', '#c9a880', '#c1b3a1', '#eba789', '#e2b668',
        '#e8ba58', '#b7becc', '#e6c486', '#f7c962', '#cacdd5', '#f4c8a5', '#f6d886', '#d6dae6', '#fbe499', '#eae3cb',
        '#feeeb5', '#f2f1f1', '#fef6d8', '#fefefc',
    ],
    'aurelia': [
        '#030101', '#070504', '#130f17', '#06285b', '#36221f', '#4a312c', '#583622', '#563832', '#7e2c34', '#6c4427',
        '#5a4a42', '#a02f36', '#794f38', '#226ba3', '#6e5a52', '#86583d', '#8e6447', '#966536', '#796e67', '#a55e55',
        '#8b7675', '#a17354', '#329cbd', '#a9793c', '#8e7b79', '#5897c6', '#b88744', '#c7796d', '#b38761', '#a08c84',
        '#c4934c', '#a9968b', '#d68a7a', '#b39f8f', '#c79e76', '#d4a251', '#73bcda', '#acb1b6', '#e89e88', '#c2b0a2',
        '#deb05c', '#d8b286', '#bebdbd', '#ecc268', '#f2b69a', '#d2c2b2', '#e6c593', '#d6c7b7', '#a9d8e7', '#f9ccaa',
        '#fcd77a', '#eadeca', '#c6e9f5', '#f9dfac', '#feefc6', '#f9f2e1', '#ffffff',
    ],
}


def rgb(which):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PALETTES[which]], np.int32)


def colour_distance(a, b):
    """A redmean-weighted RGB distance (a and b broadcast over their last axis)."""
    a = np.asarray(a, np.float64)
    b = np.asarray(b, np.float64)
    d = a - b
    rm = (a[..., 0] + b[..., 0]) / 2
    return np.sqrt((2 + rm / 256) * d[..., 0] ** 2 + 4 * d[..., 1] ** 2 + (2 + (255 - rm) / 256) * d[..., 2] ** 2) / 3


def quantize(a, which, allowed=None):
    """Each pixel's nearest colour of hers: an array of PALETTES[which] indices (allowed: only these)."""
    P = rgb(which)
    idx = list(range(len(P))) if allowed is None else list(allowed)
    d = np.stack([colour_distance(a, P[i]) for i in idx], -1)
    return np.asarray(idx)[d.argmin(-1)]


DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
# The parts of the reduced reference, back to front where they overlap (each its own layer in
# reduced_layers()): her long hair behind her, the coat's tails behind her legs, the far arm and
# hand, the legs, the skirt, the torso, the near arm, the hair in front of her (braid, side locks),
# the head, the glow round the weapon, the weapon (Saya's second blade, the blade or Aurelia's
# staff, the hilt or the staff's head), her near hand over the grip; Saya's scabbard and scarf.
PART_NAMES = ['hair', 'coat', 'scabbard', 'armF', 'handF', 'legF', 'legN', 'skirt', 'torso', 'scarf', 'armN',
              'hairFront', 'head', 'glow', 'blade2', 'blade', 'hilt', 'handN']


def _load(which, kind):
    return np.load(os.path.join(DATA, f'heroine-{which}-{kind}.npy'), allow_pickle=False)


def reduced_index(which):
    """The reduced reference as PALETTES[which] indices in our frame (255 where she is not)."""
    d = _load(which, 'reduced')
    idx, (x0, y0) = d[:-1], d[-1, :2]
    out = np.full((GRID, GRID), 255, np.uint8)
    out[y0:y0 + idx.shape[0], x0:x0 + idx.shape[1]] = idx
    return out


def reduced(which):
    """The reduced reference in our 256 x 256 frame: (GRID, GRID, 4) uint8 RGBA, transparent where
    she is not. Every opaque pixel is one of PALETTES[which]."""
    idx = reduced_index(which)
    out = np.zeros((GRID, GRID, 4), np.uint8)
    m = idx < len(PALETTES[which])
    out[m, :3] = rgb(which)[idx[m]]
    out[m, 3] = 255
    return out


def reduced_parts(which):
    """Which part of her each pixel of the reduced reference came from, in our frame: a dict of
    (GRID, GRID) bool masks, one per PART_NAMES."""
    d = _load(which, 'parts')
    lab, (x0, y0) = d[:-1], d[-1, :2]
    out = {}
    for i, name in enumerate(PART_NAMES):
        m = np.zeros((GRID, GRID), bool)
        m[y0:y0 + lab.shape[0], x0:x0 + lab.shape[1]] = lab == i
        out[name] = m
    return out


def reduced_layers(which):
    """Each part of the reduced reference alone, in our frame, what the parts in front of it hide
    included, before the line between parts: a dict of (GRID, GRID) PALETTES[which] indices (255
    where empty)."""
    d = _load(which, 'layers')
    out = {}
    for i, name in enumerate(PART_NAMES):
        lay, (x0, y0) = d[i, :-1], d[i, -1, :2]
        m = np.full((GRID, GRID), 255, np.uint8)
        m[y0:y0 + lay.shape[0], x0:x0 + lay.shape[1]] = lay
        out[name] = m
    return out
