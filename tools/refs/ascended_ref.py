"""Shared helpers for lifting parts out of the owner's Ascended paint-over (docs/reference/ascended-owner-reference.jpg).

His picture (2000 x 2000) is our male in Ascended Spikes, the Rogue Storm Cloak, the Wrap Kimono, the Wide
Hakama, the Cloth Sash, Bandage Wraps and Foot Wraps (idle frame 0) painted over by the owner, in his own
pixels of 20 picture pixels each (a 100 x 100 grid from the picture's corner, measured from his black
outline: every edge between two of his colours falls on a multiple of 20). One of his pixels is one fine
pixel of our sprites. Lined up with our male at idle frame 0 (his collar, kimono, sleeves and fists on
ours), a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame. JOINTS are
our male rig's joints at that frame, in his pixels. (His eyes sit a row lower than ours; our face is ours.)

His redesign: golden spikes with a dark brown line; a black cloak with a high scarf collar wound round
the neck, falling over both shoulders and down the near side in front of the near leg, torn at the hem,
with a dark red lining and bright red tatters; a beige kimono with a navy crossed collar and wide sleeves
to just below the elbow; a blue sash with a long panel hanging across the far thigh; black wide hakama;
the forearms and fists bound in bandages with the fingers bare; bandaged shins and bare toes.

His legs stand wider than ours (his near foot 7 px further back and 4 px higher, his far foot 2 px back and
2 px lower): the hakama hangs from our hips and knees where he drew it, and the feet are moved onto our
ankles (FOOT_SHIFT, as the Roman sandals are, tools/refs/roman_ref.py).

pieces() cuts his figure into the pieces the items stamp (src/sprite/painted.ts). Each piece is a region of
his picture (polygons in his pixel corners, or row spans) that claims, in order, the cells of the kinds it
takes; his black line goes to every piece whose own cells it touches inside its region (a line between
two pieces belongs to both, so each keeps it when they part). Where a piece is hidden in his picture (the
kimono under the sash and the collar, the far hakama leg under the sash, the cloak's front and back behind
the body and the near arm, the hair behind the forehead, the forearms' bandages under the sleeves' cuffs,
the sleeves under the cloak on the shoulders, the shins' bandages under the hakama) it is filled by
continuing his pixels, so it shows his cloth when what covers it moves.

Debug: python3 -I tools/refs/ascended_ref.py <tinted.png> [pieces.png] draws his picture with each piece
tinted (the cells nobody takes in magenta: his face and the V of his chest, which are ours) and every
piece with its continued cells crossed.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repo root.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

REF = 'docs/reference/ascended-owner-reference.jpg'
PITCH = 20.0
SIZE = 100
OFFSET = (74, 117)
# Our male rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (52.0, 21.0),
    'neck': (53.18, 30.65),
    'pelvis': (53.0, 59.87),
    'shoulderN': (40.01, 35.51),
    'shoulderF': (60.27, 34.81),
    'elbowN': (36.13, 47.50),
    'elbowF': (63.09, 47.08),
    'wristN': (33.62, 58.21),
    'wristF': (68.52, 56.65),
    'handN': (32.80, 61.72),
    'handF': (70.30, 59.78),
    'hipN': (47.58, 59.46),
    'hipF': (57.51, 56.12),
    'kneeN': (48.17, 75.65),
    'kneeF': (64.23, 70.86),
    'ankleN': (44.42, 90.59),
    'ankleF': (61.94, 86.08),
}
# Our face anchor at idle frame 0 on the male body (body.ts faceAnchor: the near eye's lash start), in his
# pixels: his hair is pinned there, so at rest it is where he drew it. (He drew his eyes a row lower than
# ours; our face is ours.)
FACE = (49, 22)
# How far each of his feet is moved to stand on ours (his sole on our sole, his foot's middle over ours, in
# our idle frame 0): his near foot stands 7 px further back and 4 px higher than our near foot, his far
# foot 2 px further back and 2 px lower. Each foot and its bandaged shin hang from our ankle less this.
FOOT_SHIFT = {'n': (7, 4), 'f': (2, -2)}


def his_ankle(s):
    """The cell of his picture that lands on our ankle (s: 'n' or 'f')."""
    x, y = JOINTS['ankle' + s.upper()]
    dx, dy = FOOT_SHIFT[s]
    return (x - dx, y - dy)


def native(path=REF):
    """His pixels: the median of each cell's middle (a JPEG), as a (100, 100, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    out = np.zeros((SIZE, SIZE, 3))
    for j in range(SIZE):
        for i in range(SIZE):
            x0 = int(round(i * PITCH))
            y0 = int(round(j * PITCH))
            c = a[y0 + 4:y0 + int(PITCH) - 4, x0 + 4:x0 + int(PITCH) - 4].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def background(a):
    """The white around him, reached from the picture's edge."""
    H, W, _ = a.shape
    L = luma(a)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= 225:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


def kind(c):
    """What a colour of his is, before any piece says more: 'line' (his black), 'red' (the cloak's
    lining and tatters), 'blue' (the sash, and the kimono's navy collar), 'gold' (the hair), 'skin',
    'beige' (the kimono, the bandages and their brown shading) or 'dark' (the cloak, the scarf and the
    hakama: near-black greys)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L <= 12:
        return 'line'
    if r > 70 and r > 2.2 * g and r > 1.5 * b:
        return 'red'
    if b > r + 12 and b > g + 4 and L > 18:
        return 'blue'
    if r > 120 and g > 0.62 * r and b < 0.55 * g:
        return 'gold'
    if r >= 150 and r > g + 22 and r > b + 30 and g > 0.5 * r and b > 0.35 * r:
        return 'skin'
    if r > g + 4 and g >= b - 2 and (L > 70 or r > b + 14):
        return 'beige'
    return 'dark'


def bandage_kind(c):
    """A colour of his bandages and the bare skin they leave: 'line' (his black and his near-black brown
    outline), 'skin' (his pinks and salmons: red far over green) or 'cloth' (the bandage's beiges and
    browns)."""
    r, g, b = (int(v) for v in c)
    if 0.299 * r + 0.587 * g + 0.114 * b < 24:
        return 'line'
    return 'skin' if r - g >= 45 else 'cloth'


def inside(pts, H=SIZE, W=SIZE):
    """The cells whose centres lie inside a polygon of his pixel corners (even-odd rule)."""
    m = np.zeros((H, W), bool)
    n = len(pts)
    for y in range(H):
        cy = y + 0.5
        xs = []
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 <= cy < y1) or (y1 <= cy < y0):
                xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for x in range(W):
                if xs[k] <= x + 0.5 < xs[k + 1]:
                    m[y, x] = True
    return m


def spans(rows):
    """The cells of row spans: {row: (x0, x1) or [(x0, x1), ...]}, inclusive."""
    m = np.zeros((SIZE, SIZE), bool)
    for y, s in rows.items():
        for x0, x1 in (s if isinstance(s, list) else [s]):
            m[y, x0:x1 + 1] = True
    return m


def near8(m):
    g = m.copy()
    g[1:] |= m[:-1]
    g[:-1] |= m[1:]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    g[1:, 1:] |= m[:-1, :-1]
    g[1:, :-1] |= m[:-1, 1:]
    g[:-1, 1:] |= m[1:, :-1]
    g[:-1, :-1] |= m[1:, 1:]
    return g


def near4(m):
    g = m.copy()
    g[1:] |= m[:-1]
    g[:-1] |= m[1:]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    return g


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def kinds(a):
    return np.array([[kind(a[y, x]) for x in range(SIZE)] for y in range(SIZE)])




def warmth(a):
    """His warm colours (hair, skin, kimono, bandages and their browns: red over blue) and cool ones
    (the cloak, the scarf and the hakama: near-black greys and navies, blue over red). His near-whites (the
    lit folds of the sleeves and bandages) are warm: his cool cloth is never that light."""
    return (a[..., 0] > a[..., 2] + 6) | (luma(a.astype(float)) > 150)


# ---------------------------------------------------------------------------------------------------
# The regions of his picture each piece is cut from. Row spans are {row: (first, last)} cells, inclusive.
# ---------------------------------------------------------------------------------------------------


def rows_span(r0, r1, x0, x1):
    return {y: (x0, x1) for y in range(r0, r1 + 1)}


# The head: his hair over it, down to the scarf. Below the brows (FACE_LOW) the face is ours, his eyes,
# brows, ear and mouth included, but for his golden strands over it; over the forehead (FOREHEAD) only his
# strands are taken.
HEAD = spans(rows_span(0, 28, 28, 68))
FACE_LOW = spans(rows_span(21, 31, 46, 58))
FOREHEAD = spans(rows_span(17, 20, 46, 58))
# Behind the head his hair goes on over these rows and columns (behind his forehead and ear).
HAIR_BACK_ROWS = (16, 22)
HAIR_BACK_COLS = (42, 60)
# The scarf wound round the neck and the cloak's collar over the shoulders, to the line on his kimono.
COLLAR = spans({**rows_span(25, 32, 33, 66), 33: (33, 66), 34: (33, 66), 35: (33, 66)})
# The cloak lying over each shoulder, above the sleeve.
MANTLE_N = spans(rows_span(36, 38, 32, 46))
MANTLE_F = spans(rows_span(36, 39, 59, 67))
# The near arm: the wide sleeve to its slanting cuff, the bandaged forearm, the fist (sharing two rows
# with the forearm about the wrist).
SLEEVE_N = spans({**rows_span(37, 49, 28, 43), 50: (29, 42), 51: (39, 42)})
WRAP_N = spans(rows_span(50, 60, 29, 41))
FIST_N = spans(rows_span(59, 66, 29, 42))
SLEEVE_F = spans(rows_span(36, 50, 62, 71))
WRAP_F = spans(rows_span(49, 60, 62, 71))
FIST_F = spans(rows_span(59, 66, 62, 72))
WRIST_OVERLAP = 2
# The sash: the band round the waist and its panel hanging across the far thigh.
SASH = spans({49: (46, 62), 50: (46, 62), 51: (46, 62), 52: (46, 62), 53: (46, 62), 54: (46, 63), 55: (46, 63), 56: (45, 63),
              57: (50, 64), 58: (50, 64), 59: (51, 65), 60: (52, 65), 61: (52, 65), 62: (53, 66), 63: (54, 66), 64: (54, 67),
              65: (53, 67), 66: (56, 68), 67: (57, 68), 68: (58, 68), 69: (59, 68), 70: (59, 63), 71: (60, 61)})
# The kimono: from under the scarf to its hem below the sash on the near side.
KIMONO = spans({**rows_span(33, 48, 46, 61), **rows_span(49, 55, 46, 62), **rows_span(56, 63, 44, 54)})
# The rows of the V opening (his chest between the lapels is skin: ours shows there).
V_ROWS = (36, 47)
# Under the sash his kimono goes on in the cloth of these rows above it, repeated.
KIMONO_TILE = (41, 47)
V_COLS = (49, 59)
# The cloak's front edge hanging from the near shoulder in front of the near leg: between the sleeve and
# the kimono, between the forearm and the kimono, then down to its torn hem. Its right line is the near
# hakama leg's left line below the waist.
PANEL_RIGHT = {**{y: 47 for y in range(36, 50)}, **{y: 46 for y in range(50, 64)}, 64: 44, 65: 44, **{y: 43 for y in range(66, 71)},
               **{y: 42 for y in range(71, 76)}, **{y: 41 for y in range(76, 82)}, **{y: 40 for y in range(82, 88)}}
PANEL_LEFT = {**{y: 42 for y in range(36, 50)}, **{y: 37 for y in range(50, 64)}, 64: 39, 65: 39, 66: 35, 67: 35, 68: 35,
              **{y: 34 for y in range(69, 74)}, **{y: 33 for y in range(74, 79)}, **{y: 32 for y in range(79, 82)}, 82: 31, 83: 30,
              **{y: 31 for y in range(84, 88)}}
PANEL = spans({y: (PANEL_LEFT[y], PANEL_RIGHT[y]) for y in PANEL_RIGHT})
# Where the panel goes on behind the near arm (hidden in his picture): from this column to its own cells.
PANEL_BEHIND_ARM = (38, 63, 35)
# The hakama legs, each between its lines; the near one's left line is the panel's right line.
HAKAMA_N_RIGHT = {63: 53, 64: 53, 65: 53, 66: 53, 67: 53, 68: 53, 69: 53, 70: 53, 71: 51, 72: 51, 73: 50, 74: 50, 75: 50, 76: 49,
                  77: 49, 78: 48, 79: 48, 80: 48, 81: 47, 82: 46, 83: 45, 84: 44}
HAKAMA_N = spans({y: ({63: 44, 83: 40, 84: 40}.get(y, PANEL_RIGHT.get(y, 44)), HAKAMA_N_RIGHT[y]) for y in HAKAMA_N_RIGHT})
HAKAMA_F_LEFT = {**{y: 53 for y in range(63, 75)}, 75: 54, 76: 54, 77: 53, 78: 53, 79: 54, 80: 55, 81: 55, 82: 54, 83: 53, 84: 56}
HAKAMA_F_RIGHT = {**{y: 67 for y in range(63, 72)}, 72: 65, 73: 65, 74: 65, 75: 66, 76: 66, 77: 66, 78: 66, **{y: 65 for y in range(79, 85)}}
HAKAMA_F = spans({y: (HAKAMA_F_LEFT[y], HAKAMA_F_RIGHT[y]) for y in HAKAMA_F_LEFT})
# The top of the hakama, round the hips: it rides the torso, over the tops of both legs.
SEAT_ROWS = (63, 68)
KNEE_OVERLAP = 2
# The feet: the bandaged shin, and the foot (they share a row or two about the ankle).
# (The near shin's top rows are crossed by the cloak's tatters: the near foot starts below them, and his
# turns are repeated up from there.)
FOOT_N = spans(rows_span(88, 97, 30, 44))
FOOT_F = spans(rows_span(83, 96, 54, 73))
SHIN_TO = {'n': 91, 'f': 90}
# From this row his toes' red creases are the feet's (above it the reds are the cloak's tatters).
TOES_FROM = 92
FOOT_FROM = {'n': 90, 'f': 89}
# Rows of his bandage turns repeated up the shin under the hakama, and the period of his turns.
SHIN_UP = {'n': 10, 'f': 6}
WRAP_PERIOD = 4
# The cloak hangs from the shoulders to its torn hem; behind the body it is continued down to here.
CLOAK_ROWS = (25, 92)
CLOAK_FILL_TO = 86


def labels(a):
    """His figure cut into pieces: {name: mask} (his own cells, his line shared by the pieces it bounds),
    K (kinds), bg (the white round him)."""
    K = kinds(a)
    L = luma(a.astype(float))
    bg = background(a)
    fig = ~bg
    line = (K == 'line') & fig
    warm = warmth(a) & fig & ~line
    red = (K == 'red') & fig
    cool = fig & ~line & ~warm
    skin = K == 'skin'
    r, b = a[..., 0].astype(float), a[..., 2].astype(float)
    g = a[..., 1].astype(float)
    # His golds: the gold kind, his pale yellow highlights (green near red, unlike skin) and his browns.
    golden = (K == 'gold') | (warm & (g > 0.8 * r) & ~red)
    hairish = golden | (warm & (b < 0.45 * r) & ~red & ~skin)
    blue = K == 'blue'
    rows = np.arange(SIZE)[:, None] + np.zeros((1, SIZE), int)
    regions = [
        ('hair', HEAD & warm & ~skin & ~red & ~blue & (~FACE_LOW | golden) & (~FOREHEAD | hairish), HEAD & ~FACE_LOW),
        ('collar', COLLAR & cool, COLLAR),
        ('mantle_n', MANTLE_N & cool, MANTLE_N),
        ('mantle_f', MANTLE_F & cool, MANTLE_F),
        ('sleeve_n', SLEEVE_N & warm & ~red, SLEEVE_N),
        ('wrap_n', WRAP_N & warm & ~red, WRAP_N),
        ('fist_n', FIST_N & warm & ~red, FIST_N),
        ('sleeve_f', SLEEVE_F & warm & ~red, SLEEVE_F),
        ('wrap_f', WRAP_F & warm & ~red, WRAP_F),
        ('fist_f', FIST_F & warm & ~red, FIST_F),
        ('sash', SASH & fig & ~line, SASH),
        ('kimono', KIMONO & ((warm & ~red) | blue), KIMONO),
        ('panel', PANEL & (cool | red), PANEL),
        ('hakama_n', HAKAMA_N & cool & ~red, HAKAMA_N),
        ('hakama_f', HAKAMA_F & cool & ~red, HAKAMA_F),
        ('foot_n', FOOT_N & warm & (~red | (rows >= TOES_FROM)), FOOT_N),
        ('foot_f', FOOT_F & warm & (~red | (rows >= TOES_FROM)), FOOT_F),
        ('cloak', spans(rows_span(CLOAK_ROWS[0], CLOAK_ROWS[1], 0, SIZE - 1)) & (cool | red), spans(rows_span(CLOAK_ROWS[0], CLOAK_ROWS[1], 0, SIZE - 1))),
    ]
    owned = np.zeros((SIZE, SIZE), bool)
    masks = {}
    for n, m, _ in regions:
        m = m & ~owned & ~line
        owned |= m
        masks[n] = m
    # The V opening: his chest between the lapels is not the kimono's.
    vhole = np.zeros((SIZE, SIZE), bool)
    for y in range(V_ROWS[0], V_ROWS[1] + 1):
        xs = [x for x in range(V_COLS[0], V_COLS[1] + 1) if blue[y, x]]
        if len(xs) < 2:
            continue
        runs = []
        for x in xs:
            if runs and x == runs[-1][1] + 1:
                runs[-1][1] = x
            else:
                runs.append([x, x])
        if len(runs) < 2:
            continue
        for x in range(runs[0][1] + 1, runs[-1][0]):
            if not blue[y, x] and not line[y, x]:
                vhole[y, x] = True
    masks['kimono'] &= ~vhole
    # The far sleeve's left edge is the kimono's right line (his brown): both keep it.
    edge = masks['kimono'] & near4(masks['sleeve_f']) & (L < 90)
    masks['sleeve_f'] = masks['sleeve_f'] | edge
    # His line: to every piece whose own cells it touches inside its region; then the line cells left
    # (tips, a line between two lines) to the pieces whose line they touch.
    took = np.zeros((SIZE, SIZE), bool)
    for n, _, reg in regions:
        got = line & reg & near8(masks[n])
        if n == 'hair':
            got &= ~FACE_LOW
        masks[n] = masks[n] | got
        took |= got
    for _ in range(2):
        for n, _, reg in regions:
            got = line & reg & ~took & near8(masks[n])
            masks[n] = masks[n] | got
            took |= got
    # A line cell no region holds goes to the first piece it touches (the corner where two regions meet).
    for touch in (lambda m: m & ~line, lambda m: m):
        for n, _, _ in regions:
            got = line & ~took & near8(touch(masks[n])) & ~FACE_LOW
            masks[n] = masks[n] | got
            took |= got
    return masks, K, bg, vhole


# ---------------------------------------------------------------------------------------------------
# What his picture hides, continued from his pixels.
# ---------------------------------------------------------------------------------------------------


def from_column(a, own, hidden, cols, up=True, down=True):
    """Each hidden cell takes the colour of the nearest of the piece's own cells up or down its column
    (above first, at equal distance). Returns the cells that found one."""
    done = np.zeros((SIZE, SIZE), bool)
    for y, x in zip(*np.nonzero(hidden)):
        for d in range(1, SIZE):
            hit = None
            for yy in ([y - d] if up else []) + ([y + d] if down else []):
                if 0 <= yy < SIZE and own[yy, x]:
                    hit = yy
                    break
            if hit is not None:
                cols[y, x] = a[hit, x]
                done[y, x] = True
                break
    return done


def from_row(a, own, hidden, cols):
    """Each hidden cell takes the colour of the nearest of the piece's own cells along its row, or, with
    none on its row, of the nearest of them anywhere (the first of equals, top to bottom, left to right)."""
    oy, ox = np.nonzero(own)
    for y, x in zip(*np.nonzero(hidden)):
        xs = np.nonzero(own[y])[0]
        if len(xs):
            cols[y, x] = a[y, xs[np.argmin(np.abs(xs - x) * 2 + (xs > x))]]
        elif len(oy):
            k = int(np.argmin((oy - y) ** 2 + (ox - x) ** 2))
            cols[y, x] = a[oy[k], ox[k]]


def tile(a, own, hidden, cols, period=WRAP_PERIOD, step=1):
    """Each hidden cell takes the colour a whole number of `period` rows below it (step 1) or above it
    (step -1) among the piece's own cells, so his bandage turns and folds run on unbroken. Returns the
    cells that found one."""
    done = np.zeros((SIZE, SIZE), bool)
    for y, x in zip(*np.nonzero(hidden)):
        yy = y + step * period
        while 0 <= yy < SIZE and not own[yy, x]:
            yy += step * period
        if 0 <= yy < SIZE:
            cols[y, x] = a[yy, x]
            done[y, x] = True
    return done


def row_hull(m, r0, r1):
    """The cells between the first and last cell of `m` on each row from r0 to r1."""
    h = np.zeros((SIZE, SIZE), bool)
    for y in range(r0, r1 + 1):
        xs = np.nonzero(m[y])[0]
        if len(xs):
            h[y, xs.min():xs.max() + 1] = True
    return h


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours} (his pixels, and his pixels continued
    where the piece is hidden), {name: continued cells}, K, bg, the V opening."""
    masks, K, bg, vhole = labels(a)
    line = (K == 'line') & ~bg
    cols = {n: a.copy() for n in masks}
    filled = {n: np.zeros((SIZE, SIZE), bool) for n in masks}
    rows = np.arange(SIZE)[:, None] + np.zeros((1, SIZE), int)

    def add(n, m):
        m = m & ~masks[n]
        filled[n] |= m
        masks[n] = masks[n] | m
        return m

    # The hair behind the head: what his face hides between the strands of his fringe and round the ear,
    # each cell taking the colour of the nearest of his strands above it (they run on down).
    own = masks['hair'] & ~line
    masks['hair_back'] = masks['hair'].copy()
    cols['hair_back'] = a.copy()
    filled['hair_back'] = np.zeros((SIZE, SIZE), bool)
    hid = row_hull(masks['hair'], HAIR_BACK_ROWS[0], HAIR_BACK_ROWS[1]) & ~masks['hair'] & spans(rows_span(0, SIZE - 1, HAIR_BACK_COLS[0], HAIR_BACK_COLS[1]))
    hid = add('hair_back', hid)
    got = from_column(a, own, hid, cols['hair_back'], down=False)
    from_row(a, own, hid & ~got, cols['hair_back'])

    # The kimono under the scarf (from his cloth below it), under the sash and beside its lower near part
    # (from his cloth above): inside its outline, never in the V.
    own = masks['kimono'] & ~line
    hull = row_hull(masks['kimono'] | masks['sash'] & spans(rows_span(49, 56, 46, 62)), 33, 63) & ~vhole
    hull &= spans({**rows_span(33, 48, 47, 61), **rows_span(49, 55, 47, 61), **rows_span(56, 63, 45, 61)})
    hid = add('kimono', hull & (rows <= 35))
    from_column(a, own, hid, cols['kimono'], up=False)
    hid = add('kimono', hull & (rows >= 49))
    got = tile(a, own & warmth(a) & (rows >= KIMONO_TILE[0]) & (rows <= KIMONO_TILE[1]), hid, cols['kimono'], KIMONO_TILE[1] - KIMONO_TILE[0] + 1, -1)
    from_row(a, own & warmth(a) & (rows >= KIMONO_TILE[0]) & (rows <= KIMONO_TILE[1]), hid & ~got, cols['kimono'])

    # Each sleeve under the cloak over its shoulder: his line on its top is the cloak's, and the sleeve
    # goes on up to the shoulder in his cloth below it (only where the cloak covers it at rest), so a
    # raised arm shows no gap at the shoulder.
    # (The near sleeve is drawn over the scarf, so only the cloth on the near shoulder hides it; the far
    # sleeve is behind the body.)
    for n, top, cover in (('sleeve_n', 33, ('mantle_n',)), ('sleeve_f', 33, ('mantle_f', 'collar'))):
        mantle = cover[0]
        m = masks[n]
        cloth = m & ~line & ~masks['kimono']
        first = int(np.nonzero(cloth.any(axis=1))[0].min())
        xs = np.nonzero(cloth[first + 2])[0]
        top_line = m & line & (rows <= first + 1) & masks[mantle]
        masks[n] = m & ~top_line
        hid = spans({y: (int(xs.min()), int(xs.max())) for y in range(top, first + 2)}) & ~cloth & np.logical_or.reduce([masks[c] for c in cover])
        hid = add(n, hid)
        from_column(a, cloth, hid, cols[n], up=False)

    # Each bandaged forearm under its sleeve's cuff, up to our elbow: his turns repeated up the arm.
    for n, elbow in (('wrap_n', 'elbowN'), ('wrap_f', 'elbowF')):
        m = masks[n]
        first = int(np.nonzero(m.any(axis=1))[0].min())
        span = row_hull(m, first + 1, first + 3)
        lo = int(np.nonzero(span.any(axis=0))[0].min())
        hi = int(np.nonzero(span.any(axis=0))[0].max())
        top = int(np.floor(JOINTS[elbow][1])) - 1
        hid = add(n, spans({y: (lo, hi) for y in range(top, first)}))
        tile(a, m & (rows >= first + 2), hid, cols[n])

    # The fist and the forearm share WRIST_OVERLAP rows about the wrist, so the wrist stays closed.
    for w, f in (('wrap_n', 'fist_n'), ('wrap_f', 'fist_f')):
        top_f = int(np.nonzero(masks[f].any(axis=1))[0].min())
        bot_w = int(np.nonzero(masks[w].any(axis=1))[0].max())
        share_f = masks[w] & (rows > bot_w - WRIST_OVERLAP)
        share_w = masks[f] & (rows < top_f + WRIST_OVERLAP)
        masks[f] = masks[f] | share_f
        masks[w] = masks[w] | share_w

    # The cloak's front edge behind the near arm: from its left line's column to its own cells, each cell
    # from his cloth below it (his folds run on up), so it shows whole when the arm swings away.
    r0, r1, x0 = PANEL_BEHIND_ARM
    own = masks['panel']
    hid = np.zeros((SIZE, SIZE), bool)
    for y in range(r0, r1 + 1):
        xs = np.nonzero(own[y])[0]
        if len(xs):
            hid[y, x0:xs.min()] = True
    hid = add('panel', hid & ~bg)
    from_column(a, own & (rows >= 66), hid, cols['panel'], up=False)

    # The far hakama leg under the sash: each column from his cloth below it (past his leg's edge, the
    # nearest of his cloth along the row).
    own = masks['hakama_f'] & ~line
    hid = add('hakama_f', spans({y: (HAKAMA_F_LEFT[y] + 1, HAKAMA_F_RIGHT[y] - 1) for y in range(63, 72)}) & ~masks['hakama_f'])
    got = from_column(a, own, hid, cols['hakama_f'], up=False)
    from_row(a, own, hid & ~got, cols['hakama_f'])

    # The top of the hakama round the hips, from both legs.
    seat = (masks['hakama_n'] | masks['hakama_f']) & (rows >= SEAT_ROWS[0]) & (rows <= SEAT_ROWS[1])
    masks['seat'] = seat
    cols['seat'] = a.copy()
    cols['seat'][masks['hakama_f']] = cols['hakama_f'][masks['hakama_f']]
    filled['seat'] = (filled['hakama_f']) & seat

    # Each hakama leg parts at our knee: above it the thigh, below it the shin, sharing KNEE_OVERLAP rows.
    for s in ('n', 'f'):
        leg = 'hakama_' + s
        knee = int(np.floor(JOINTS['knee' + s.upper()][1]))
        masks['shin_' + s] = masks[leg] & (rows >= knee - KNEE_OVERLAP)
        cols['shin_' + s] = cols[leg].copy()
        filled['shin_' + s] = filled[leg] & masks['shin_' + s]
        masks['thigh_' + s] = masks[leg] & (rows < knee + KNEE_OVERLAP)
        cols['thigh_' + s] = cols[leg].copy()
        filled['thigh_' + s] = filled[leg] & masks['thigh_' + s]

    # Each foot: the bandaged shin (his turns repeated SHIN_UP rows up, under the hakama), the foot.
    for s in ('n', 'f'):
        m = masks['foot_' + s]
        cols['wshin_' + s] = a.copy()
        masks['wshin_' + s] = m & (rows <= SHIN_TO[s])
        filled['wshin_' + s] = np.zeros((SIZE, SIZE), bool)
        first = int(np.nonzero(m.any(axis=1))[0].min())
        span = row_hull(m, first, first + 2)
        lo = int(np.nonzero(span.any(axis=0))[0].min())
        hi = int(np.nonzero(span.any(axis=0))[0].max())
        hid = spans({y: (lo, hi) for y in range(first - SHIN_UP[s], first)})
        masks['wshin_' + s] |= hid
        filled['wshin_' + s] |= hid
        tile(a, m, hid, cols['wshin_' + s])
        masks['wfoot_' + s] = m & (rows >= FOOT_FROM[s])
        cols['wfoot_' + s] = a.copy()
        filled['wfoot_' + s] = np.zeros((SIZE, SIZE), bool)

    # The cloak behind the body, down to CLOAK_FILL_TO: inside its outline on each row, each cell from his
    # cloth below it in its column (the lining between the legs runs on up), else the nearest along its row.
    own = masks['cloak'] & ~line
    hull = spans(rows_span(30, CLOAK_FILL_TO, 0, SIZE - 1)) & ~bg & ~masks['cloak']
    hid = add('cloak', hull)
    got = from_column(a, own & (rows > 40), hid, cols['cloak'], up=False)
    from_row(a, own, hid & ~got, cols['cloak'])
    return masks, cols, filled, K, bg


def unclaimed(masks, bg):
    m = ~bg
    for v in masks.values():
        m &= ~v
    return m


# ---------------------------------------------------------------------------------------------------
# Packing: rows of palette characters, one per colour of his.
# ---------------------------------------------------------------------------------------------------

# His picture is a JPEG with many near colours: colours within 3 of each other in every channel share
# one character, with a long alphabet (Latin-1, Greek and Cyrillic letters; one UTF-16 unit each, as
# rotsprite.ts reads the rows).
CHARS = (
    'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'
    + ''.join(chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7))
    + ''.join(chr(c) for c in range(0x391, 0x3CA) if c != 0x3A2)
    + ''.join(chr(c) for c in range(0x410, 0x450))
)


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def rgb(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]


def pack(col, mask):
    """A mask's pixels as rows of palette characters, the origin (x0, y0) in his pixels and the palette."""
    grid = np.full((SIZE, SIZE), '.', dtype='<U1')
    palette = {}
    seen = []
    for y in range(SIZE):
        for x in range(SIZE):
            if not mask[y, x]:
                continue
            c = col[y, x]
            for ch, ref in seen:
                if np.abs(ref - c).max() <= 3:
                    grid[y, x] = ch
                    break
            else:
                ch = CHARS[len(seen)]
                seen.append((ch, c))
                palette[ch] = hexc(c)
                grid[y, x] = ch
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    return [''.join(grid[y, x0:x1]) for y in range(y0, y1)], (int(x0), int(y0)), palette


def key(k):
    return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (his pixels) that lands on
    the joint, `ang` the limb's angle at rest."""
    ox, oy = origin
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {ang:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def middle(a, masks, cols, names, test, q=0.5):
    """His colour of middle lightness among his own pixels of these pieces that pass `test` (half of
    them lighter, half darker; with `q`, that fraction darker): the base a colour slot recolours from."""
    found = []
    for n in names:
        for y, x in zip(*np.nonzero(masks[n])):
            c = cols[n][y, x]
            if (c == a[y, x]).all() and test(c):
                found.append((float(luma(c.astype(float))), hexc(c)))
    found.sort()
    return found[min(len(found) - 1, int(len(found) * q))][1]


def his_skin(a, masks, cols):
    """His lit skin: the bare skin of his fists and toes, nine tenths of it darker. It stands for the
    character's skin colour, which our bodies show in the light: the bandages' skin recolours from it, so
    a character of this skin shows every skin pixel of his."""
    return middle(a, masks, cols, ['fist_n', 'fist_f', 'wfoot_n', 'wfoot_f'], lambda c: bandage_kind(c) == 'skin', 0.9)


def commonest(a, masks, names, test):
    """His commonest colour among his own pixels of these pieces that pass `test` (the first of equals)."""
    seen = {}
    for n in names:
        for y, x in zip(*np.nonzero(masks[n])):
            if test(a[y, x]):
                h = hexc(a[y, x])
                seen[h] = seen.get(h, 0) + 1
    return max(sorted(seen), key=lambda h: seen[h])


def emit(masks, cols, specs, bases, kind_of, prefix, kind_type, doc, imports="import type { PaintedPiece } from '../painted';"):
    """A generated TypeScript module: the colours the slots recolour from (`bases`), what each colour of
    his is (`<PREFIX>_KIND`), where each piece lands in our male idle frame 0 (`<PREFIX>_REST`: the fine
    pixel of its first row's first cell, unturned) and the pieces. `specs`: (CONST, piece, doc, pivot in his
    pixels, angle[, (dx, dy) it is moved by from where he drew it]). `kind_of(piece, hex)` says what each
    colour of his is."""
    kinds_ = {}
    pieces_ = []
    for const, n, d, pivot, ang, *moved in specs:
        rows, origin, palette = pack(cols[n], masks[n])
        for h in palette.values():
            k = kind_of(n, h)
            if kinds_.get(h, k) != k:
                raise SystemExit(f'{h} is {kinds_[h]} in one piece and {k} in {n}')
            kinds_[h] = k
        pieces_.append((const, d, rows, origin, palette, pivot, ang, moved[0] if moved else (0, 0)))
    out = [doc, imports, '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    out.append('/** What each colour of his is, as the script sorts them; his black line is never tinted. */')
    out.append(f'export const {prefix}_KIND: Record<string, {kind_type}> = {{')
    for h in sorted(kinds_):
        out.append(f"  '{h}': '{kinds_[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, _d, _r, origin, _p, _pv, _a, (dx, dy) in pieces_:
        out.append(f'  {const}: [{origin[0] + OFFSET[0] + dx}, {origin[1] + OFFSET[1] + dy}],')
    out += ['};', '']
    for const, d, rows, origin, palette, pivot, ang, _m in pieces_:
        out.append(ts_piece(const, d, rows, origin, palette, pivot, ang))
    return '\n'.join(out)


def sheet(masks, cols, filled, names, path, k=10):
    """Each piece on its own at k x (his pixels as they are cut, the continued cells crossed in red),
    side by side in `names` order, for the study folder."""
    from PIL import ImageDraw
    tiles = []
    for n in names:
        ys, xs = np.nonzero(masks[n])
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        t = np.full((y1 - y0, x1 - x0, 3), 236, np.uint8)
        m = masks[n][y0:y1, x0:x1]
        t[m] = cols[n][y0:y1, x0:x1][m]
        im = Image.fromarray(t).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for y, x in zip(*np.nonzero(filled[n][y0:y1, x0:x1])):
            d.line((x * k + 2, y * k + 2, x * k + k - 3, y * k + k - 3), fill=(230, 40, 40))
            d.line((x * k + k - 3, y * k + 2, x * k + 2, y * k + k - 3), fill=(230, 40, 40))
        tiles.append((n, im))
    W = sum(im.width for _, im in tiles) + 12 * (len(tiles) + 1)
    H = max(im.height for _, im in tiles) + 30
    out = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(out)
    x = 12
    for n, im in tiles:
        out.paste(im, (x, 24))
        d.text((x, 6), n, fill=(0, 0, 0))
        x += im.width + 12
    out.save(path)


TINTS = [(255, 80, 80), (80, 200, 80), (80, 120, 255), (240, 200, 40), (200, 80, 220), (40, 210, 210), (255, 140, 40), (150, 150, 255),
         (120, 255, 160), (255, 120, 200), (160, 90, 40), (40, 90, 160)]


def debug_sheet(a, masks, bg, path, k=12):
    """His picture with each piece's own cells tinted, the cells nobody took in magenta, a 5 px grid."""
    from PIL import ImageDraw
    img = a.astype(float).copy()
    for i, (n, m) in enumerate(masks.items()):
        t = np.array(TINTS[i % len(TINTS)], float)
        img[m] = img[m] * 0.5 + t * 0.5
    un = unclaimed(masks, bg)
    img[un] = (255, 0, 255)
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((SIZE * k, SIZE * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i in range(0, SIZE + 1, 5):
        d.line((i * k, 0, i * k, SIZE * k), fill=(255, 0, 0) if i % 10 == 0 else (255, 190, 190))
        d.line((0, i * k, SIZE * k, i * k), fill=(255, 0, 0) if i % 10 == 0 else (255, 190, 190))
        d.text((i * k + 2, 2), str(i), fill=(0, 0, 0))
        d.text((2, i * k + 2), str(i), fill=(0, 0, 0))
    for n, m in masks.items():
        ys, xs = np.nonzero(m)
        if len(ys):
            d.text((xs.mean() * k, ys.mean() * k), n, fill=(0, 0, 0))
    im.save(path)
    return int(un.sum())


OWN = ['hair', 'collar', 'mantle_n', 'mantle_f', 'sleeve_n', 'wrap_n', 'fist_n', 'sleeve_f', 'wrap_f', 'fist_f', 'sash', 'kimono',
       'panel', 'hakama_n', 'hakama_f', 'foot_n', 'foot_f', 'cloak']


if __name__ == '__main__':
    # Debug: python3 -I tools/refs/ascended_ref.py <out.png> [pieces.png]: his picture with each piece's
    # own cells tinted (the cells nobody took in magenta), and every piece with its continued cells.
    a = native()
    masks, cols, filled, K, bg = pieces(a)
    print('unclaimed', debug_sheet(a, {n: masks[n] & ~filled[n] for n in OWN}, bg, sys.argv[1]))
    if len(sys.argv) > 2:
        sheet(masks, cols, filled, [n for n in masks if n not in ('hakama_n', 'hakama_f', 'foot_n', 'foot_f')], sys.argv[2], k=8)
