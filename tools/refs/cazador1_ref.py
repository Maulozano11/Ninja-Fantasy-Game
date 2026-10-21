"""Shared helpers for lifting parts out of the owner's Cazador 1 (docs/reference/cazador1-owner-reference.jpg).

His picture (2000 x 2000) is our first Hunter-nin (`enemyCharacter('hunter', 0)`, male, idle frame 0, no
headband) painted over by the owner, in his own pixels of 20 picture pixels each (a 100 x 100 grid from
the picture's corner, measured: the cell edges fall on multiples of 20 and the middle of each cell is one
colour). One of his pixels is one fine pixel of our sprites. Lined up with our male at idle frame 0 (his
collar, vest and arms on ours), a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our
256 x 256 frame. JOINTS are our male rig's joints at that frame and FACE our face anchor (the near eye's
lash start, src/sprite/body.ts faceAnchor), in his pixels.

His redesign: black messy hair; a white oni mask with red markings and two red horns (his redesign of
the old fox mask); the dark grey armoured vest with a layered shoulder guard on the near shoulder, the
dark under-suit's sleeve on the far one and grey arm guards on both forearms; black trousers; black
open-toe boots; and the naginata held low, its wooden shaft through the near fist, its steel blade
across the legs and a steel cap on the butt over the near shoulder.

PIECES cuts his figure into the pieces the items stamp (src/sprite/painted.ts). Each piece is a region of
his picture (polygons in his pixel corners, or row spans) that claims, in order, the cells of the kinds
it takes; his black line goes to every piece whose own cells it touches inside its region (a line
between two pieces belongs to both, so each keeps it when they part). Where a piece is hidden in his
picture (the vest under the near shoulder guard, his legs and boots behind the naginata, the far
sleeve and arm guard behind the vest, the hair under the horns, the mask under the hair's strands),
it is filled by continuing his pixels (fill_* below), so it shows his cloth when what covers it moves.

Every piece is pinned with its pivot on our joint (in his pixels) and stamped at the angle its limb
has at rest: at rest every pixel lands where he drew it, whatever our joints, and in other poses it
turns about our joint.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repo root.
"""

import colorsys
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

REF = 'docs/reference/cazador1-owner-reference.jpg'
PITCH = 20.0
PHASE = (0.0, 0.0)
SIZE = 100
OFFSET = (74, 118)
# Our male rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (52.0, 20.0),
    'neck': (53.18, 29.65),
    'pelvis': (53.0, 58.87),
    'shoulderN': (40.01, 34.51),
    'shoulderF': (60.27, 33.81),
    'elbowN': (36.13, 46.50),
    'elbowF': (63.09, 46.08),
    'wristN': (33.62, 57.21),
    'wristF': (68.52, 55.65),
    'handN': (32.80, 60.72),
    'handF': (70.30, 58.78),
    'hipN': (47.58, 58.46),
    'hipF': (57.51, 55.12),
    'kneeN': (48.17, 74.65),
    'kneeF': (64.23, 69.86),
    'ankleN': (44.42, 89.59),
    'ankleF': (61.94, 85.08),
}
# Our face anchor at idle frame 0 on the male body (faceAnchor's nx, ny), in his pixels.
FACE = (49, 21)


def native(path=REF):
    """His pixels: the median of each cell's middle (a JPEG), as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    out = np.zeros((SIZE, SIZE, 3))
    for j in range(SIZE):
        for i in range(SIZE):
            x0 = int(round(PHASE[0] + i * PITCH))
            y0 = int(round(PHASE[1] + j * PITCH))
            c = a[y0 + 4:y0 + int(PITCH) - 4, x0 + 4:x0 + int(PITCH) - 4].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def background(a):
    """The white around him, reached from the picture's edge (the white of his mask is inside his hair)."""
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
    """What a colour of his is, before any piece says more: 'line' (his black), 'red' (the mask's paint,
    the horns, the blood), 'skin', 'white' (the porcelain), 'wood' (the shaft's browns), 'dark' (the
    near-black hair, under-suit and trousers) or 'grey' (steel)."""
    r, g, b = (int(v) for v in c)
    if max(r, g, b) <= 12:
        return 'line'
    if r > 90 and g < 0.45 * r and b < 0.6 * r and r - g > 50:
        return 'red'
    if min(r, g, b) >= 180 and r >= b + 4:
        return 'white'
    if r >= 140 and r > b + 35 and g > 0.45 * r:
        return 'skin'
    if r > 60 and r > b + 20 and r >= g:
        return 'wood'
    if luma(np.array([r, g, b], float)) < 58:
        return 'dark'
    return 'grey'


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


def band(p0, p1, r):
    """The cells whose centres lie within r of the segment p0-p1."""
    ys, xs = np.mgrid[0:SIZE, 0:SIZE] + 0.5
    (ax, ay), (bx, by) = p0, p1
    dx, dy = bx - ax, by - ay
    t = np.clip(((xs - ax) * dx + (ys - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(xs - ax - t * dx, ys - ay - t * dy) <= r


def near8(m):
    g = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            g |= np.roll(np.roll(m, dy, 0), dx, 1)
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


# ---------------------------------------------------------------------------------------------------
# The regions of his picture each piece is cut from, in the order they claim his cells: a cell goes to
# the first piece whose region holds it and whose kinds take it (None: every kind but his line).
# Row spans are {row: (first, last)} cells, inclusive.
# ---------------------------------------------------------------------------------------------------

# The shaft, a band along his two straight runs (he drew it a pixel and a half lower past the near fist):
# from the steel cap over the near shoulder into the fist, and out of the fist to the blade's collar.
SHAFT_UP = ((11.5, 42.5), (28.5, 59.5))
SHAFT_LOW = ((32.0, 62.0), (45.5, 75.5))
CAP = inside([(4, 40), (13, 40), (13, 47), (4, 47)])
BLADE = spans({
    73: (55, 57),
    74: [(43, 47), (54, 57)],
    75: [(43, 48), (54, 57)],
    76: (44, 57),
    77: (45, 57),
    78: (46, 56),
    79: (46, 56),
    80: (41, 55),
    81: (41, 54),
    82: (41, 55),
    83: (45, 56),
    84: (47, 57),
    85: (49, 58),
    86: (50, 59),
    87: (51, 60),
    88: (53, 61),
    89: (54, 62),
    90: (56, 63),
})
WEAPON = band(*SHAFT_UP, 1.6) | band(*SHAFT_LOW, 1.6) | BLADE | CAP
WEAPON_LINE = band(*SHAFT_UP, 2.6) | band(*SHAFT_LOW, 2.6) | BLADE | CAP

FIST_N = spans({56: (30, 36), 57: (28, 35), 58: (28, 35), 59: (28, 36), 60: (27, 37), 61: (27, 37), 62: (27, 37), 63: (28, 33), 64: (29, 33), 65: (31, 34)})
FIST_F = spans({54: (67, 70), 55: (66, 71), 56: (65, 71), 57: (65, 72), 58: (66, 72), 59: (66, 72), 60: (66, 71), 61: (66, 70), 62: (68, 69)})
GUARD_N = spans({28: (35, 43), 29: (35, 43), 30: (34, 43), 31: (33, 44), 32: (32, 44), 33: (32, 45), 34: (32, 45), 35: (32, 45), 36: (31, 45),
                 37: (30, 44), 38: (30, 44), 39: (29, 43), 40: (29, 43), 41: (30, 43), 42: (32, 42), 43: (34, 41)})
# The vest's sides: its left line under the near arm, its right line against the far arm.
VEST_RIGHT = {**{y: 62 for y in (29, 30)}, **{y: 63 for y in range(31, 42)}, **{y: 62 for y in range(42, 52)}, **{y: 63 for y in range(52, 56)}, 56: 64}
VEST = spans({y: (40 if y < 44 else 41, VEST_RIGHT[y]) for y in range(29, 57)})
UPPER_F = spans({y: (VEST_RIGHT[y], 70) for y in range(29, 47)})
FORE_F = spans({y: (VEST_RIGHT[y], 73) for y in range(47, 56)})
HEAD = inside([(33, 3), (68, 3), (68, 29), (33, 29)])

REGIONS = [
    # The near fist round the shaft, and the far fist.
    ('fist_n', FIST_N, None, None),
    ('fist_f', FIST_F, None, None),
    ('weapon', WEAPON, None, WEAPON_LINE),
    # The horns over his hair, the mask, the hair.
    ('horns', inside([(46, 4), (52, 4), (52, 12), (46, 12)]) | inside([(57, 4), (63, 4), (63, 12), (57, 12)]), ('red',), None),
    ('mask', inside([(47, 15), (61, 15), (61, 30), (47, 30)]), ('white', 'red', 'skin', 'dark'), None),
    ('hair', HEAD, None, None),
    # The near shoulder guard, then the near arm's bare skin above the elbow and its arm guard below.
    ('guard_n', GUARD_N, ('grey', 'dark'), None),
    ('upper_n', inside([(28, 42), (42, 42), (42, 47), (28, 47)]), ('skin', 'wood'), None),
    ('fore_n', inside([(28, 47), (41, 47), (41, 57), (28, 57)]), None, None),
    # The far arm: the under-suit's sleeve and the bare skin to the elbow, then the arm guard.
    ('upper_f', UPPER_F, None, None),
    ('fore_f', FORE_F, None, None),
    # The vest over the under-suit, from the collar (and the neck in shadow over it) to its lower line.
    ('vest', VEST, None, None),
    # The trousers' waist band, then each leg down to the boot.
    ('waist', inside([(40, 57), (67, 57), (67, 60), (40, 60)]), None, None),
    ('thigh_n', inside([(39, 60), (55, 60), (55, 76), (39, 76)]), None, None),
    ('thigh_f', inside([(55, 60), (69, 60), (69, 79), (55, 79)]), None, None),
    ('boot_n', inside([(36, 76), (50, 76), (50, 94), (36, 94)]), None, None),
    ('foot_n', inside([(36, 94), (50, 94), (50, 99), (36, 99)]), None, None),
    ('boot_f', inside([(55, 78), (70, 78), (70, 91), (55, 91)]), None, None),
    ('foot_f', inside([(55, 91), (74, 91), (74, 95), (55, 95)]), None, None),
]
# Rows the thigh and shin pieces of a trouser leg share about the knee; rows repeated down the shin.
KNEE_OVERLAP = 2
SHIN_TILE = 5
# The mask's top rows: there his dark cells are the hair's strands over the mask, not the mask's eyes.
MASK_EYES_FROM = 20


def labels(a):
    """His figure cut into pieces: {name: mask} (his own cells; his line shared by the pieces it bounds),
    K (kinds), bg (the white round him and in the gaps of his figure)."""
    K = np.array([[kind(a[y, x]) for x in range(SIZE)] for y in range(SIZE)])
    mask_box = inside([(47, 15), (61, 15), (61, 30), (47, 30)])
    # The white round him and the white gaps his arm, legs and shaft close off (not his mask's white).
    bg = background(a) | ((luma(a) > 225) & ~mask_box)
    fig = ~bg
    line = (K == 'line') & fig
    owned = np.zeros((SIZE, SIZE), bool)
    masks = {}
    rows = np.arange(SIZE)[:, None] + np.zeros((1, SIZE), int)
    for n, reg, takes, _ in REGIONS:
        m = reg & fig & ~owned & ~line
        if takes is not None:
            m &= np.isin(K, takes)
        if n == 'mask':
            # His dark cells are the mask's (its eye holes) only between its white and red ones on their
            # row and below the eyes' top: the others are the hair's, beside it and over it.
            light = m & (K != 'dark')
            span = np.zeros((SIZE, SIZE), bool)
            for y in range(SIZE):
                xs = np.nonzero(light[y])[0]
                if len(xs):
                    span[y, xs.min() + 1:xs.max()] = True
            m &= (K != 'dark') | (span & (rows >= MASK_EYES_FROM))
        owned |= m
        masks[n] = m
    # His line: to every piece whose own cells it touches inside its region; then the line cells left
    # (the tips of his hair, a line between two lines) to the pieces whose line they touch.
    took = np.zeros((SIZE, SIZE), bool)
    for n, reg, _, lreg in REGIONS:
        r = reg if lreg is None else lreg
        got = line & r & near8(masks[n])
        masks[n] = masks[n] | got
        took |= got
    for _ in range(2):
        for n, reg, _, lreg in REGIONS:
            r = reg if lreg is None else lreg
            got = line & r & ~took & near8(masks[n])
            masks[n] = masks[n] | got
            took |= got
    return masks, K, bg


# ---------------------------------------------------------------------------------------------------
# What his picture hides, continued from his pixels.
# ---------------------------------------------------------------------------------------------------


def from_column(a, own, hidden, cols, up=True, down=True):
    """Each hidden cell takes the colour of the nearest of the piece's own cells up or down its column
    (above first, at equal distance)."""
    for y, x in zip(*np.nonzero(hidden)):
        best = None
        for d in range(1, SIZE):
            for yy in ([y - d] if up else []) + ([y + d] if down else []):
                if 0 <= yy < SIZE and own[yy, x]:
                    best = yy
                    break
            if best is not None:
                break
        if best is not None:
            cols[y, x] = a[best, x]


def from_row(a, own, hidden, cols):
    """Each hidden cell takes the colour of the nearest of the piece's own cells along its row."""
    for y, x in zip(*np.nonzero(hidden)):
        xs = np.nonzero(own[y])[0]
        if len(xs):
            cols[y, x] = a[y, xs[np.argmin(np.abs(xs - x) * 2 + (xs > x))]]


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours}: his pixels, and where a piece is
    hidden in his picture his pixels continued (FILLED: {name: mask of the continued cells})."""
    masks, K, bg = labels(a)
    cols = {n: a.copy() for n in masks}
    filled = {n: np.zeros((SIZE, SIZE), bool) for n in masks}
    black = np.array([0, 0, 0])
    line = (K == 'line') & ~bg

    def add(n, m):
        m = m & ~masks[n]
        filled[n] |= m
        masks[n] = masks[n] | m
        return m

    # The shaft behind the near fist: his upper run continued along itself through the fist (its cross
    # section, line and wood, moved down the shaft one cell at a time), to where it comes out below.
    (x0, y0), (x1, y1) = SHAFT_UP
    hid = band((x0, y0), (x1 + 6, y1 + 6), 2.2) & FIST_N & (np.arange(SIZE)[:, None] >= 57)
    hid = add('weapon', hid)
    for y, x in sorted(zip(*np.nonzero(hid))):
        if masks['weapon'][y - 1, x - 1]:
            cols['weapon'][y, x] = cols['weapon'][y - 1, x - 1]
        else:
            # Past the edge of his cross-section: not the shaft's.
            masks['weapon'][y, x] = False
            filled['weapon'][y, x] = False

    # The vest under the near shoulder guard: its left line goes on up the column it runs down below the
    # guard, to the collar; inside it each column takes his colour from the first vest cell below.
    own = masks['vest'] & ~line
    edge = 41
    hid = add('vest', spans({y: (edge, VEST_RIGHT[y]) for y in range(29, 44)}) & masks['guard_n'] & ~line)
    hid |= add('vest', spans({y: (edge, edge) for y in range(30, 44)}))
    for y, x in zip(*np.nonzero(hid)):
        if x == edge:
            cols['vest'][y, x] = black
    from_column(a, own, hid & (np.arange(SIZE)[None, :] > edge), cols['vest'], up=False)

    # The far arm behind the vest: our far upper arm and forearm, as wide as ours, filled along each row
    # from his sleeve, skin and arm guard where they show, and closed by his line on the arm's near edge.
    J = JOINTS
    for n, (p, q), r in (('upper_f', ('shoulderF', 'elbowF'), 4.2), ('fore_f', ('elbowF', 'wristF'), 3.6)):
        sil = band(J[p], J[q], r) & spans({y: (50, 73) for y in (range(29, 47) if n == 'upper_f' else range(47, 56))})
        own = masks[n] & ~line
        hid = add(n, sil & masks['vest'] & ~masks[n])
        from_row(a, own, hid, cols[n])
        for y in range(SIZE):
            xs = np.nonzero(sil[y] | masks[n][y])[0]
            if len(xs) and hid[y, xs.min()]:
                cols[n][y, xs.min()] = black

    # His legs and boots behind the naginata: each column continued from the leg's own cells above it
    # (the boots from below, as their shafts run down to the feet), inside the leg's outline.
    covered = masks['weapon']
    near_thigh = inside([(42, 60), (55, 60), (55, 63), (54, 66), (53, 69), (52, 73), (52, 76), (42, 76)])
    hid = add('thigh_n', near_thigh & covered)
    from_column(a, masks['thigh_n'] & ~filled['thigh_n'], hid, cols['thigh_n'], down=False)
    near_boot = inside([(40, 76), (48, 76), (48, 94), (40, 94)])
    hid = add('boot_n', near_boot & covered)
    from_column(a, masks['boot_n'] & ~filled['boot_n'], hid, cols['boot_n'], up=False)
    far_boot = inside([(58, 79), (68, 79), (68, 91), (58, 91)])
    hid = add('boot_f', far_boot & covered)
    from_column(a, masks['boot_f'] & ~filled['boot_f'], hid, cols['boot_f'], down=False)
    far_foot = inside([(58, 91), (72, 91), (72, 94), (58, 94)])
    hid = add('foot_f', far_foot & covered)
    from_column(a, masks['foot_f'] & ~filled['foot_f'], hid, cols['foot_f'], up=False)

    # Each trouser leg parts at our knee: above it the thigh (it rides the thigh), below it the shin (it
    # rides the shin), the two sharing KNEE_OVERLAP rows so the knee stays closed as it bends. Under his
    # boots the shin goes on down to our ankle: his last rows above the boot repeated down the leg, moved
    # across as our shin slants, and closed by his black line as a hem.
    for s, top, bottom in (('n', 76, 89), ('f', 79, 86)):
        leg = 'thigh_' + s
        knee = int(np.floor(JOINTS['knee' + s.upper()][1]))
        shin = 'shin_' + s
        masks[shin] = masks[leg] & (np.arange(SIZE)[:, None] >= knee - KNEE_OVERLAP)
        cols[shin] = cols[leg].copy()
        filled[shin] = filled[leg] & masks[shin]
        masks[leg] = masks[leg] & (np.arange(SIZE)[:, None] < knee + KNEE_OVERLAP)
        filled[leg] &= masks[leg]
        (kx, ky), (ax, ay) = JOINTS['knee' + s.upper()], JOINTS['ankle' + s.upper()]
        slope = (ax - kx) / (ay - ky)
        src = list(range(top - SHIN_TILE, top))
        m, c = masks[shin], cols[shin]
        whole = m | masks[leg]
        for y in range(top, bottom + 1):
            sy = src[(y - top) % SHIN_TILE]
            dx = int(round((y - sy) * slope))
            for x in np.nonzero(whole[sy])[0]:
                if 0 <= x + dx < SIZE and not m[y, x + dx]:
                    m[y, x + dx] = True
                    c[y, x + dx] = c[sy, x]
                    filled[shin][y, x + dx] = True
        for x in np.nonzero(m[bottom])[0]:
            m[bottom + 1, x] = True
            c[bottom + 1, x] = black
            filled[shin][bottom + 1, x] = True

    # The hair under the horns: each hidden cell inside his hair's outline takes the nearest hair along
    # its row; the mask under the hair's strands takes the nearest of the mask's own colours.
    own = masks['hair'] & ~line
    sil = np.zeros((SIZE, SIZE), bool)
    for y in range(SIZE):
        xs = np.nonzero(masks['hair'][y])[0]
        if len(xs):
            sil[y, xs.min():xs.max() + 1] = True
    hid = add('hair', sil & masks['horns'] & ~line)
    from_row(a, own, hid, cols['hair'])
    own = masks['mask'] & ~line
    sil = np.zeros((SIZE, SIZE), bool)
    for y in range(SIZE):
        xs = np.nonzero(own[y])[0]
        if len(xs):
            sil[y, xs.min():xs.max() + 1] = True
    hid = add('mask', sil & masks['hair'])
    from_row(a, own, hid, cols['mask'])
    return masks, cols, filled, K, bg


def unclaimed(a, masks, bg):
    """The cells of his figure no piece took (for the debug sheet)."""
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


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (his pixels) that lands on
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


def module(doc, prefix, bases, kinds, pieces, kind_type):
    """A generated TypeScript module: the colours the slots recolour from (`bases`), what each colour of
    his is (`<PREFIX>_KIND`), where each piece lands in our idle frame 0 (`<PREFIX>_REST`: the fine pixel
    of its first row's first cell) and the pieces. `pieces`: (CONST, doc, rows, origin, palette, pivot,
    angle)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    out.append('/** What each colour of his is, as the script sorts them; his black line is never tinted. */')
    out.append(f'export const {prefix}_KIND: Record<string, {kind_type}> = {{')
    for h in sorted(kinds):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, _d, _r, origin, _p, _pv, _a in pieces:
        out.append(f'  {const}: [{origin[0] + OFFSET[0]}, {origin[1] + OFFSET[1]}],')
    out += ['};', '']
    for const, d, rows, origin, palette, pivot, ang in pieces:
        out.append(ts_piece(const, d, rows, origin, palette, pivot, ang))
    return '\n'.join(out)


def his_skin(a, masks, cols):
    """His lit skin (four fifths of the skin of his bare arms and fists is darker): it stands for the
    character's skin colour, which our bodies show in the light. Every piece with skin of his recolours
    from it, so a character of this skin shows every skin pixel of his."""
    return middle(a, masks, cols, ['upper_n', 'fore_n', 'fist_n'], lambda c: kind(c) in ('skin', 'wood', 'red'), 0.8)


def emit(masks, cols, specs, bases, kind_of, prefix, kind_type, doc):
    """The module text for `specs`: (CONST, piece, doc, pivot in his pixels, angle). `kind_of(piece, hex)`
    says what each colour of his is."""
    kinds = {}
    out = []
    for const, n, d, pivot, ang in specs:
        rows, origin, palette = pack(cols[n], masks[n])
        for h in palette.values():
            k = kind_of(n, h)
            if kinds.get(h, k) != k:
                raise SystemExit(f'{h} is {kinds[h]} in one piece and {k} in {n}')
            kinds[h] = k
        out.append((const, d, rows, origin, palette, pivot, ang))
    return module(doc, prefix, bases, kinds, out, kind_type)


def rgb(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]


def sheet(masks, cols, filled, names, path, k=8):
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


# ---------------------------------------------------------------------------------------------------
# Debug sheet: his picture with each piece tinted, the cells nobody took in magenta.
# ---------------------------------------------------------------------------------------------------

TINTS = [(255, 80, 80), (80, 200, 80), (80, 120, 255), (240, 200, 40), (200, 80, 220), (40, 210, 210), (255, 140, 40), (150, 150, 255), (120, 255, 160), (255, 120, 200)]


def debug_sheet(a, masks, bg, path, k=12):
    from PIL import ImageDraw
    img = a.astype(float).copy()
    for i, (n, m) in enumerate(masks.items()):
        t = np.array(TINTS[i % len(TINTS)], float)
        img[m] = img[m] * 0.55 + t * 0.45
    un = unclaimed(a, masks, bg)
    img[un] = (255, 0, 255)
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((SIZE * k, SIZE * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i in range(0, SIZE + 1, 5):
        d.line((i * k, 0, i * k, SIZE * k), fill=(255, 0, 0) if i % 10 == 0 else (255, 180, 180))
        d.line((0, i * k, SIZE * k, i * k), fill=(255, 0, 0) if i % 10 == 0 else (255, 180, 180))
        d.text((i * k + 2, 2), str(i), fill=(0, 0, 0))
        d.text((2, i * k + 2), str(i), fill=(0, 0, 0))
    for i, n in enumerate(masks):
        ys, xs = np.nonzero(masks[n])
        if len(ys):
            d.text((xs.mean() * k, ys.mean() * k), n, fill=(0, 0, 0))
    im.save(path)
    return int(un.sum())


if __name__ == '__main__':
    a = native()
    masks, cols, filled, K, bg = pieces(a)
    print('unclaimed', debug_sheet(a, {n: m & ~filled[n] for n, m in masks.items()}, bg, sys.argv[1]))
