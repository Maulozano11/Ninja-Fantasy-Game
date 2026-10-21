"""Shared helpers for lifting parts out of the owner's Scarlet picture (docs/reference/scarlet-owner-reference.jpg).

His picture (784x1168) is his own pixel art, not a paint-over of ours: a young man in a long black
coat with gold trim, a white shirt and red cravat, pinstripe trousers, tall boots and a dark sword
with a red core, in his own pixels of about 5.33 picture pixels each (147 x 219 of them; the figure
is 167 of them tall, hair top 23 to near sole 190, where ours is 93 fine pixels). So nothing is
copied 1:1: every part is brought down to our scale and fitted to our rig, segment by segment
(SEGMENTS), in his colours (PALETTE). His cape is left out (the owner did not want it).

His pixels do not sit on an exact grid: the generator drew them about PITCH apart from PHASE, but a
boundary wanders up to a picture pixel or two either way. grid() snaps each boundary of the even
grid to where his edges are, and native() takes the median of each block's inside (the blocks are
flat: inside a block of his figure the brightness varies by 2 levels at the median, against 8 on a
grid shifted half a pixel).

  BODY       the body type his preset uses (male: see below)
  JOINTS     his joints, in his pixels (near = screen-left, as ours)
  OUR_JOINTS our male rig at idle frame 0, in fine pixels of our 256 x 256 frame
  SCALE      one of his pixels in ours, overall; SEGMENTS: each part's own scale and anchor
  backward() / forward()  a segment's map, ours -> his and his -> ours
  reduced()  the reduced reference (tools/refs/scarlet-study.py): his figure at our scale on our male
             idle, without the cape, the sword turned to our weapons' way; every pixel one of his
             colours. The art target every part copies.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from
the repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, pack, save, ts_piece  # noqa: E402,F401

REF = 'docs/reference/scarlet-owner-reference.jpg'
# His pixel size and where the first boundary falls, in picture pixels (x, y): the strongest period
# of his edges across the whole picture (5.33 across, 5.31 down).
PITCH = (5.3285, 5.313)
PHASE = (0.45, 1.07)
# How far (picture pixels) a boundary may be snapped off the even grid to the edge he drew.
SNAP = 2

# His colours: his pixels (native) clustered, darkest first, plus the dark purples of his coat's
# lining clustered apart (they sit within a few steps of his greys). Rebuild with
# `python3 -I tools/refs/scarlet-study.py --palette`.
PALETTE = [
    '#040405', '#0f0407', '#26060d', '#111014', '#17101a', '#1a191e', '#211a24', '#3a0f1e',
    '#252328', '#5d0e1a', '#4e172a', '#332a1e', '#2e2d33', '#372d39', '#512619', '#601f35',
    '#84141f', '#39383c', '#7c1e2c', '#4e3c2b', '#70273e', '#a11a24', '#5e4a33', '#6f442a',
    '#87324c', '#504e52', '#a9292f', '#9e3b41', '#c72b32', '#70583c', '#9a3e58', '#646267',
    '#9c5e1a', '#846542', '#d83c44', '#ac5068', '#9e654b', '#767276', '#947650', '#e85056',
    '#b27758', '#86868a', '#a8865d', '#c88038', '#be8867', '#9c9496', '#f47278', '#ca9c75',
    '#aca7a6', '#e2af8c', '#beb9b8', '#ffa7a7', '#eabb9d', '#cfc9c8', '#f2c8aa', '#dcd6d4',
    '#f8d4b8', '#ebe6e4',
]
# One character per colour of his, in PALETTE order (for the reduced reference's rows and patches).
CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^'

# His preset's body: male. Our slender body is a woman's (isFemaleBody, with a bust) and bulky is
# broader than he is; his narrow shoulders and slim legs sit on our male body once his coat is on.
BODY = 'male'

# His joints, in his pixels (x, y; a pixel (i, j) spans i..i+1, j..j+1), found by looking at him:
# the head is the middle of his skull, the neck his chin, the shoulders the tops of his sleeves,
# the elbows where they bend, the wrists the tops of his cuffs' lower edge, the hands the middle of
# each glove, the hips in his trousers at his belt's lower edge, the knees just above his boot tops,
# the ankles where his boots are narrowest.
JOINTS = {
    'head': (78.8, 41.2),
    'neck': (80.5, 56.3),
    'shoulderN': (59.0, 67.0),
    'shoulderF': (95.0, 66.0),
    'elbowN': (54.0, 87.0),
    'elbowF': (101.0, 89.0),
    'wristN': (54.0, 108.0),
    'wristF': (104.0, 111.0),
    'handN': (54.0, 116.0),
    'handF': (105.0, 118.0),
    'pelvis': (80.0, 104.0),
    'hipN': (72.0, 104.0),
    'hipF': (89.0, 104.0),
    'kneeN': (66.0, 148.0),
    'kneeF': (91.0, 146.0),
    'ankleN': (63.0, 177.0),
    'ankleF': (92.0, 173.0),
}
# His eyes, his pixels: the middle of each iris across, the middle of the eye with its lashes down
# (his lashes are row 43, his eye rows 44 and 45). The head's anchor.
EYES = {'near': (78.5, 44.5), 'far': (86.5, 44.5)}
# Our male rig at idle frame 0 (src/sprite/compose.ts renderSprite(...).rig, design units x RES),
# in fine pixels of our 256 x 256 frame (tools/refs/scarlet-idle.mts prints it). A held sword does
# not change it.
OUR_JOINTS = {
    'head': (126.0, 138.0),
    'neck': (127.18, 147.65),
    'shoulderN': (114.01, 152.51),
    'shoulderF': (134.27, 151.81),
    'elbowN': (110.13, 164.50),
    'elbowF': (137.09, 164.08),
    'wristN': (107.62, 175.21),
    'wristF': (142.52, 173.65),
    'handN': (106.80, 178.72),
    'handF': (144.30, 176.78),
    'pelvis': (127.0, 176.87),
    'hipN': (121.58, 176.46),
    'hipF': (131.51, 173.12),
    'kneeN': (122.17, 192.65),
    'kneeF': (138.23, 187.86),
    'ankleN': (118.42, 207.59),
    'ankleF': (135.94, 203.08),
}
# Our eyes (the 'valiant' face and eyes Aiden wears): the middle of each iris across (near 126-127,
# far 132), the middle of the eye with its lashes down (lashes row 140, eye row 141).
OUR_EYES = {'near': (127.0, 141.0), 'far': (132.5, 141.0)}

# His figure is 167 of his pixels tall (hair top 23 to near sole 190); ours 93 (Aiden's hair top 125
# to the near sole 218): one of ours is 1.8 of his.
SCALE = 0.557


def turned(p, k=1, width=147):
    """A point of his picture after k quarter turns counterclockwise of his pixels (147 wide): the
    turn np.rot90 gives his pixel array."""
    x, y = p
    for _ in range(k):
        x, y = y, width - x
    return (x, y)


# His sword's line, in his pixels: the pommel's end, the grip under his glove, the middle of the
# cross-guard where the blade leaves it, and the point.
SWORD_LINE = {'pommel': (64.5, 100.5), 'grip': (53.5, 116.5), 'guard': (49.3, 123.5), 'tip': (10.0, 179.5)}
SWORD_S = 0.6


def _hilt(p):
    """A point of his sword, turned, on our rig: the grip on our near hand, at SWORD_S."""
    g, q = turned(SWORD_LINE['grip']), turned(p)
    return tuple(round(OUR_JOINTS['handN'][i] + (q[i] - g[i]) * SWORD_S, 2) for i in (0, 1))


def _eyes_anchor():
    """His eye line's middle and ours: the head scales about it."""
    h = ((EYES['near'][0] + EYES['far'][0]) / 2, (EYES['near'][1] + EYES['far'][1]) / 2)
    o = ((OUR_EYES['near'][0] + OUR_EYES['far'][0]) / 2, (OUR_EYES['near'][1] + OUR_EYES['far'][1]) / 2)
    return h, o


# Each part of him on our rig. Our proportions are not his: our head is bigger for the body, our
# shoulders square and broad, our legs shorter, our hands and feet bigger, our far arm and leg
# further out. So each part has its own map:
#   'sim'     scale s about his point `his`, which lands on our point `our`
#   'column'  a body column: rows of knots (his y, our y, his middle x, our middle x, sx); between
#             knots everything is linear (his y -> our y, and x scaled by sx about the middle line);
#             past the end knots the end runs go on
#   'chain'   his limb line (points `his`) laid on ours (`our`), each run lengthwise by the ratio of
#             the two runs and across by `width`; before the first point the first run goes on, past
#             the last point `end` takes over (a 'sim')
# The sword is turned a quarter turn counterclockwise first ('quarter_turns'; its points are in the
# turned picture): that lays his blade from down-left at 55 degrees to down-right at 35, the way our
# swords hang at rest (our flame longsword's angle is 35.2), exactly, pixel for pixel.
_EH, _EO = _eyes_anchor()
SEGMENTS = {
    # hair and face: 0.68 (our head is bigger for the body than his: his eyes 8 apart, ours 5.5); his
    # eyes on ours, so his eyes are where our eye shapes draw theirs, his hair top lands at 126.4 (over
    # our skull's top, 127) and his chin at 149.2, on his collar
    'head': {'kind': 'sim', 's': 0.68, 'his': _EH, 'our': _EO},
    # the coat (collar, lapels, body and skirt), shirt, cravat, belt and its ornaments: 0.57 across;
    # 0.6 down from his chin to his belt (on our waistband, 174), 0.49 below it so his coat's hem lands
    # on our shins (202) as his lands on his boot tops
    'torso': {'kind': 'column', 'knots': [(56.3, 147.65, 80.0, 127.0, 0.57), (99.0, 174.0, 80.0, 127.0, 0.57),
                                          (160.0, 204.0, 80.0, 127.0, 0.57)]},
    # each leg (his trousers in the coat's opening, his boot) on ours: 0.5 down from his belt to his
    # sole (his near sole on our near sole's bottom row, 218; his far one on our far one's, 210); across
    # 0.6 at the trousers widening to 0.8 at the boot's foot, so his boots cover our bigger feet; the
    # middle line follows our leg
    'legN': {'kind': 'column', 'knots': [(104.0, 175.5, 73.5, 122.0, 0.6), (150.0, 198.5, 67.5, 120.0, 0.72),
                                         (191.0, 219.1, 62.0, 118.0, 0.8)]},
    'legF': {'kind': 'column', 'knots': [(104.0, 174.0, 89.0, 132.0, 0.6), (147.0, 192.0, 89.5, 136.5, 0.7),
                                         (186.0, 211.1, 94.0, 139.5, 0.76)]},
    # the coat's near shoulder, the sleeve and its cuff along our arm (0.61 along the upper arm, 0.52 the
    # forearm, 0.7 across so it covers our arm and its broad shoulder); his fingerless glove about the
    # wrist at 0.68 (our fists are bigger than his)
    'armN': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')],
             'our': [OUR_JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')], 'width': 0.7,
             'end': {'s': 0.68, 'his': JOINTS['wristN'], 'our': OUR_JOINTS['wristN']}},
    # his far sleeve is a sliver beside his coat (the rest is behind it); ours hangs clear of the body,
    # so our far arm wears his near sleeve, laid along our far arm as on our near one; his far glove
    # about our far wrist at 0.68
    'armF': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')],
             'our': [OUR_JOINTS[j] for j in ('shoulderF', 'elbowF', 'wristF')], 'width': 0.7},
    'handF': {'kind': 'sim', 's': 0.68, 'his': JOINTS['wristF'], 'our': OUR_JOINTS['wristF']},
    # the sword, turned: the hilt (pommel, grip, cross-guard) at 0.6 with the grip under his glove on our
    # near hand; the blade from the guard along its line at 0.6 (41 of our pixels, the whole sword 58),
    # and 0.8 across so his black line, his steel edges and his red core all stay (6 to 7 of our pixels
    # wide, as our flame longsword)
    'hilt': {'kind': 'sim', 'quarter_turns': 1, 's': SWORD_S, 'his': turned(SWORD_LINE['grip']), 'our': OUR_JOINTS['handN']},
    'blade': {'kind': 'chain', 'quarter_turns': 1, 'his': [turned(SWORD_LINE[k]) for k in ('guard', 'tip')],
              'our': [_hilt(SWORD_LINE['guard']), _hilt(SWORD_LINE['tip'])], 'width': 0.8},
}
# The parts that share a map with another.
SEGMENTS['lining'] = SEGMENTS['torso']
SEGMENTS['handN'] = {'kind': 'sim', **SEGMENTS['armN']['end']}

REDUCED = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'scarlet-reduced.npy')
GRID = 256


def _column(seg, y, src, dst):
    """A column's knots as arrays: the y's we come from and go to, both middles, sx."""
    k = np.asarray(seg['knots'], float)
    ys = {'his': k[:, 0], 'our': k[:, 1]}
    mx = {'his': k[:, 2], 'our': k[:, 3]}
    t_y = _lin(y, ys[src], ys[dst])
    return t_y, _lin(y, ys[src], mx[src]), _lin(y, ys[src], mx[dst]), _lin(y, ys[src], k[:, 4])


def _lin(v, xs, ys):
    """Piecewise linear through (xs, ys), the end runs going on."""
    v = np.asarray(v, float)
    out = np.interp(v, xs, ys)
    lo, hi = v < xs[0], v > xs[-1]
    out = np.where(lo, ys[0] + (v - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]), out)
    out = np.where(hi, ys[-1] + (v - xs[-1]) * (ys[-1] - ys[-2]) / (xs[-1] - xs[-2]), out)
    return out


def _chain(seg, q, inverse):
    """A chain's map, ours -> his (inverse False: q in ours) or his -> ours (q in his). Each point goes
    by the run nearest to it; past the last point, the end piece about it."""
    src, dst = ('our', 'his') if not inverse else ('his', 'our')
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
        es, ea, eb = (e['s'], e['our'], e['his']) if not inverse else (1 / e['s'], e['his'], e['our'])
        out[past] = np.asarray(eb, float) + (q[past] - np.asarray(ea, float)) / es
    return out


def backward(seg, q):
    """Our points (N, 2) -> his points (N, 2) for a segment of SEGMENTS (a turned segment's in the
    turned picture)."""
    q = np.asarray(q, float)
    if seg['kind'] == 'sim':
        return np.asarray(seg['his'], float) + (q - np.asarray(seg['our'], float)) / seg['s']
    if seg['kind'] == 'column':
        y, m_src, m_dst, sx = _column(seg, q[:, 1], 'our', 'his')
        return np.stack([m_dst + (q[:, 0] - m_src) / sx, y], 1)
    return _chain(seg, q, False)


def forward(seg, p):
    """His points (N, 2) -> our points (N, 2) for a segment (the inverse of backward)."""
    p = np.asarray(p, float)
    if seg['kind'] == 'sim':
        return np.asarray(seg['our'], float) + (p - np.asarray(seg['his'], float)) * seg['s']
    if seg['kind'] == 'column':
        y, m_src, m_dst, sx = _column(seg, p[:, 1], 'his', 'our')
        return np.stack([m_dst + (p[:, 0] - m_src) * sx, y], 1)
    return _chain(seg, p, True)


def _edges(L, axis):
    """Edge strength at each boundary along an axis (0: x, 1: y), summed across the picture."""
    g = np.zeros(L.shape[1 - axis] + 1)
    g[1:-1] = np.abs(np.diff(L, axis=1 - axis)).sum(axis)
    return g


def _snap(g, pitch, phase, R=SNAP, lam=40.0):
    """His block boundaries along one axis: each within R picture pixels of the even grid (pitch,
    phase), where his edges are strongest, no block narrower than 4 or wider than 7."""
    n = len(g) - 1
    u = [phase + k * pitch for k in range(int((n - phase) / pitch) + 1)]
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
            opts = [(best[i - 1][q][0] + s, q) for q in best[i - 1] if 4 <= c - q <= 7]
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


def grid(path=REF):
    """His block boundaries in picture pixels: (xs, ys), 148 and 220 of them."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    L = luma(a)
    return _snap(_edges(L, 0), PITCH[0], PHASE[0]), _snap(_edges(L, 1), PITCH[1], PHASE[1])


def native(path=REF):
    """His pixels: the median of each block's inside (a picture pixel in from its edges), as an
    (H, W, 3) int array, 219 x 147."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    xs, ys = grid(path)
    out = np.zeros((len(ys) - 1, len(xs) - 1, 3))
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def background(a, light=210):
    """The white around him, reached from the picture's edge through pixels lighter than `light`
    (his shirt is as light, but walled in by his coat)."""
    H, W, _ = a.shape
    L = luma(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= light:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


def rgb(hexes=PALETTE):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hexes], np.int32)


def colour_distance(a, b):
    """A redmean-weighted RGB distance (a and b broadcast over their last axis)."""
    a = np.asarray(a, np.float64)
    b = np.asarray(b, np.float64)
    d = a - b
    rm = (a[..., 0] + b[..., 0]) / 2
    return np.sqrt((2 + rm / 256) * d[..., 0] ** 2 + 4 * d[..., 1] ** 2 + (2 + (255 - rm) / 256) * d[..., 2] ** 2) / 3


def quantize(a, allowed=None):
    """Each pixel's nearest colour of his: an array of PALETTE indices (allowed: only these)."""
    P = rgb()
    idx = list(range(len(P))) if allowed is None else list(allowed)
    d = np.stack([colour_distance(a, P[i]) for i in idx], -1)
    return np.asarray(idx)[d.argmin(-1)]


def reduced():
    """The reduced reference in our 256 x 256 frame: (GRID, GRID, 4) uint8 RGBA, transparent where
    he is not. Every opaque pixel is one of PALETTE."""
    idx = reduced_index()
    out = np.zeros((GRID, GRID, 4), np.uint8)
    m = idx < len(PALETTE)
    out[m, :3] = rgb()[idx[m]]
    out[m, 3] = 255
    return out


def reduced_index():
    """The reduced reference as PALETTE indices in our frame (255 where he is not)."""
    d = np.load(REDUCED, allow_pickle=False)
    idx, (x0, y0) = d[:-1], d[-1, :2]
    out = np.full((GRID, GRID), 255, np.uint8)
    out[y0:y0 + idx.shape[0], x0:x0 + idx.shape[1]] = idx
    return out


def reduced_parts():
    """Which part of him each pixel of the reduced reference came from, in our frame: a dict of
    (GRID, GRID) bool masks (head, torso, lining, armN, handN, armF, handF, legN, legF, hilt, blade)."""
    d = np.load(REDUCED.replace('.npy', '-parts.npy'), allow_pickle=False)
    lab, (x0, y0) = d[:-1], d[-1, :2]
    out = {}
    for i, name in enumerate(PART_NAMES):
        m = np.zeros((GRID, GRID), bool)
        m[y0:y0 + lab.shape[0], x0:x0 + lab.shape[1]] = lab == i
        out[name] = m
    return out


def reduced_layers():
    """Each part of the reduced reference alone, in our frame, what the parts in front of it hide
    included (the coat under the arms, the trousers under the coat, the sword's grip under the fist),
    before his black line round the figure: a dict of (GRID, GRID) PALETTE indices (255 where empty)."""
    d = np.load(REDUCED.replace('.npy', '-layers.npy'), allow_pickle=False)
    out = {}
    for i, name in enumerate(PART_NAMES):
        lay, (x0, y0) = d[i, :-1], d[i, -1, :2]
        m = np.full((GRID, GRID), 255, np.uint8)
        m[y0:y0 + lay.shape[0], x0:x0 + lay.shape[1]] = lay
        out[name] = m
    return out


PART_NAMES = ['head', 'torso', 'lining', 'armN', 'handN', 'armF', 'handF', 'legN', 'legF', 'hilt', 'blade']
