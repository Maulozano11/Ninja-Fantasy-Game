"""Shared helpers for lifting parts out of the owner's Solen picture (docs/reference/solen-owner-reference.jpg).

His picture (2000x2000) is our Solen (male, idle frame 0) painted over by the owner, in his own pixels of
20 picture pixels each (a 100 x 100 grid from the picture's corner): one of his pixels is one fine pixel of
our sprites, as in his Aiden and Roman pictures. He painted it over the same window of our frame as his
Roman picture (tools/refs/roman_ref.py): a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of
our 256 x 256 frame, and our male rig's joints at idle frame 0 are roman_ref.JOINTS. His head, chest, near
arm and hips are where ours are, and his legs stand wide as in his Roman picture, so the pieces that ride
the legs are moved onto ours. He drew the far arm thinner and closer to the body than ours (FAR_OUT): his far
pieces stay where he drew them and our far arm is moved under them at rest.

His words (2026-10-21): "ok aqui esta el nuevo diseño de personaje de ren y solen remplaza lo que tenemos
por esto es el nuevo estandar". His Solen is a repaint of his Roman picture: the same arms, hands, legs and
laced sandals (the sandals are his Roman ones, feet_gladiator_sandals), with spiky dark hair and red eyes,
a dark grey cowl with gold studs and a white stud on the far shoulder, a dark grey cape, a steel segmented
cuirass with a red sash and a thin brown strap, steel bracers, a brown studded skirt over a red tunic, navy
trousers with gold studs and an ice-blue longsword.

PIECES cuts his figure into the pieces the items stamp (src/sprite/painted.ts): each is a region of his
picture (a polygon in his pixel corners) and the kinds of colour it takes there, keeping only the black
line that bounds its own colours. Where a piece is hidden in his picture (the cape behind his arm, sword and
legs, the skirt and trousers behind the sword) it is filled by continuing his pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import roman_ref as RR  # noqa: E402
from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import CHARS, HIS_ANKLES, JOINTS, OFFSET, OUR_SOLES, angle, hexc, inside, near4, near8, ts_piece, write  # noqa: E402,F401

REF = 'docs/reference/solen-owner-reference.jpg'
PITCH = 20.0


def native(path=REF):
    """His pixels: the median of each 20 x 20 block's interior, as a (100, 100, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx, ny = int(round(W / PITCH)), int(round(H / PITCH))
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            y0, x0 = int(round(j * PITCH)), int(round(i * PITCH))
            c = a[y0 + 3:int(round((j + 1) * PITCH)) - 3, x0 + 3:int(round((i + 1) * PITCH)) - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


KINDS = ('line', 'skin', 'red', 'gold', 'leather', 'steel', 'stud', 'white', 'grey', 'navy', 'ice')


def kind(c):
    """What a colour of his is, by colour alone (regions settle the rest: his hair and his trousers share
    the navy, his cowl and cape the grey): 'line' (his black), 'skin', 'red', 'gold' (studs), 'leather'
    (his browns), 'steel' (light blue-grey metal), 'white', 'grey' (his dark neutral cloth), 'navy' or
    'ice' (the sword's bright blues)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if L < 26 and max(r, g, b) < 48:
        return 'line'
    if L > 200 and s < 0.12:
        return 'white'
    if b > r + 40 and L > 120:
        return 'ice'
    if r > 160 and g > 120 and b < 0.65 * r and r - g < 80 and g > b + 40:
        return 'gold'
    if r > 70 and g < 0.42 * r and b < 0.55 * r:
        return 'red'
    if r > 120 and r > g + 25 and g > b and b > 0.46 * r:
        return 'skin'
    if b >= r - 4 and L > 95:
        return 'steel'
    if L > 110 and s < 0.25 and r >= b:
        return 'stud'
    if r > g + 12 and g >= b - 4 and r > 55:
        return 'leather'
    if b > r + 12:
        return 'navy'
    return 'grey'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


KIND_RGB = {
    'line': (0, 0, 0), 'skin': (255, 180, 140), 'red': (220, 0, 0), 'gold': (255, 220, 0), 'leather': (140, 80, 20),
    'steel': (170, 190, 220), 'stud': (200, 120, 255), 'white': (255, 255, 255), 'grey': (90, 90, 90), 'navy': (20, 40, 160), 'ice': (0, 230, 255),
}


def kind_map(a):
    """His figure as a map of kinds (the white around him in pale pink)."""
    K = kinds(a)
    bg = background(a)
    out = np.zeros(a.shape, np.uint8)
    for k, rgb in KIND_RGB.items():
        out[K == k] = rgb
    out[bg] = (255, 235, 240)
    return out


# The regions of his picture each piece is cut from (polygons in his pixel corners) and the kinds of
# colour it takes there, in the order they claim his colours: a pixel goes to the first piece whose
# region holds it and whose kinds take it.
REGIONS = {
    # The white stud on the far shoulder (over the cowl's end).
    'stud_f': ([(59.6, 31), (66, 31), (66, 38.6), (59.6, 38.6)], ('white', 'stud', 'grey', 'steel')),
    # The cowl: wound round the neck under the chin and over both shoulders, its two gold studs.
    'cowl': ([(29.6, 28), (37, 25), (44, 23), (60, 23), (64, 27), (64.6, 31), (64.6, 36), (58.6, 36), (58.6, 35), (45.6, 35), (45.6, 35.6), (40, 35.6), (36.6, 34.6), (34, 34), (31, 35), (29.6, 33)], ('grey', 'gold')),
    # His navy sleeves under the cowl.
    'sleeve_n': ([(33, 32), (46, 32), (46, 41), (33, 41)], ('navy',)),
    # The bare upper arms in his skin, shoulder to bracer.
    'arm_n': ([(30, 36), (42, 36), (42, 49), (30, 49)], ('skin', 'red', 'leather')),
    'arm_f': ([(59.6, 37), (66, 37), (66, 48), (59.6, 48)], ('skin', 'red', 'leather', 'navy')),
    # The steel bracers, below the elbow to the wrist.
    'bracer_n': ([(27.6, 43.6), (38, 43.6), (38, 55), (27.6, 55)], ('steel', 'navy', 'grey', 'stud', 'white')),
    'bracer_f': ([(58.6, 46), (68, 46), (68, 54), (58.6, 54)], ('steel', 'navy', 'grey', 'stud', 'white')),
    # The far fist, hanging closed beside the skirt.
    'hand_f': ([(63.6, 53.6), (70, 53.6), (70, 61), (63.6, 61)], ('skin', 'leather', 'red')),
    # The near fist round the sword's grip.
    'hand_n': ([(30.6, 54.6), (38.6, 54.6), (38.6, 63), (30.6, 63)], ('skin', 'leather', 'red')),
    # The sword: pommel, grip, guard and blade.
    'sword': (None, ('ice', 'steel', 'white', 'navy', 'stud')),
    # The steel cuirass with its red sash and the brown strap.
    'chest': ([(40.6, 33), (61.6, 33), (61.6, 52), (50.6, 52), (50.6, 51), (40.6, 51)], ('steel', 'navy', 'red', 'leather', 'gold', 'stud', 'white', 'grey')),
    # The studded leather strips over the red tunic, to its hem.
    'skirt': ([(36.6, 49), (67, 49), (67, 70), (36.6, 70)], ('leather', 'red', 'stud', 'gold')),
    # The navy trousers with their gold studs, each leg.
    'thigh_n': ([(33, 66), (49.6, 66), (49.6, 82), (33, 82)], ('navy', 'gold')),
    'thigh_f': ([(49.6, 66), (66, 66), (66, 82), (49.6, 82)], ('navy', 'gold')),
    # His laced sandals (his Roman ones repainted: the laces, the skin between them, the soles).
    'sandal_n': ([(35.6, 77.6), (44.6, 77.6), (44.6, 82.6), (42.6, 82.6), (42.6, 99), (33.6, 99), (33.6, 91.6), (34.6, 91.6), (34.6, 87.6), (35.6, 87.6), (35.6, 82.6), (34, 82.6), (34, 81.6), (35.6, 81.6)], ('skin', 'grey', 'leather')),
    'sandal_f': ([(54.6, 77.6), (63, 77.6), (63, 87.6), (70, 87.6), (70, 96), (54.6, 96)], ('skin', 'grey', 'leather')),
    # The cape behind it all (not his sandals' dark straps).
    'cape': ([(26, 26), (46, 26), (46, 62), (60, 62), (60, 79.4), (54.6, 79.4), (54.6, 92), (42.6, 92), (42.6, 79.4), (34.6, 79.4), (34.6, 92), (4, 92), (4, 60)], ('grey', 'navy')),
}

# His far arm against ours at rest (our male idle frame 0, fine pixels): he drew it thinner and nearer the
# body, the upper arm a 2 px strip of skin between the chest's edge and his line at x 64 (ours reaches 68),
# the bracer's middle 2 px and the fist's 1 px left of our forearm's and hand's. His far pieces are pinned
# where he drew them and turn about our far joints moved FAR_OUT (the bracer's middle against our forearm's),
# and src/sprite/items/clothes.ts (founderFarOut) moves our far arm there under them while it hangs as at rest.
FAR_OUT = (-2, 0)

# His legs against ours at rest (fine pixels): his near sandal (his Roman one, pixel for pixel) stands 6 px
# further back than ours lands on our near leg, his far sandal 2 px back and 5 px lower (it is his Roman one
# drawn 2 px shorter in the shin). His trousers stay where he drew them and turn about our knees moved this
# far; src/sprite/items/founderOut.ts (founderLegOut) moves our legs and his sandals there while they stand
# as at rest.
LEG_OUT = {'N': (-6, 0), 'F': (-2, 5)}

# The pieces drawn behind the rest of him.
BEHIND = ('cape',)

# The sword's line (through his blade's bright pixels, fitted once): a point on it and its angle (screen
# degrees). Along it (t, toward the point) his pommel is at -42, his grip runs under the fist to the guard
# at -27..-22 and the blade from there to the point at 28; across it (s) the grip and pommel are about 2 px
# from the line, the guard 8 and the blade 3.5 (with his line).
SWORD_AT = (58.07, 76.62)
SWORD_ANGLE = 35.05
SWORD_PARTS = ((-44.5, -27.0, 2.8), (-27.0, -22.0, 8.5), (-22.0, 29.5, 3.6))


def sword_frame(H=100, W=100):
    """Every pixel's place along the sword (t) and across it (s), from SWORD_AT."""
    ys, xs = np.mgrid[0:H, 0:W]
    d = np.array([np.cos(np.radians(SWORD_ANGLE)), np.sin(np.radians(SWORD_ANGLE))])
    t = (xs + 0.5 - SWORD_AT[0]) * d[0] + (ys + 0.5 - SWORD_AT[1]) * d[1]
    s = -(xs + 0.5 - SWORD_AT[0]) * d[1] + (ys + 0.5 - SWORD_AT[1]) * d[0]
    return t, s


def sword_zone(H=100, W=100):
    t, s = sword_frame(H, W)
    z = np.zeros((H, W), bool)
    for t0, t1, half in SWORD_PARTS:
        z |= (t >= t0) & (t < t1) & (np.abs(s) <= half)
    return z


def region(n, H=100, W=100):
    pts = REGIONS[n][0]
    return sword_zone(H, W) if pts is None else inside(pts, H, W)


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def label(n4, H, W):
    """Connected labels (4-neighbours) of a mask."""
    lab = np.zeros((H, W), int)
    k = 0
    for y, x in zip(*np.nonzero(n4)):
        if lab[y, x]:
            continue
        k += 1
        stack = [(y, x)]
        while stack:
            q, p = stack.pop()
            if 0 <= q < H and 0 <= p < W and n4[q, p] and not lab[q, p]:
                lab[q, p] = k
                stack += [(q + 1, p), (q - 1, p), (q, p + 1), (q, p - 1)]
    return lab, k


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours} (his pixels, and his pixels continued where
    the piece is hidden), and {name: mask of the continued pixels}."""
    H, W, _ = a.shape
    # The white round him. Inside his figure every white is his (the white stud, the sword's glints): he left
    # no gaps of paper there.
    bg = background(a)
    K = kinds(a)
    line = (K == 'line') & ~bg
    owned = np.zeros((H, W), bool)
    masks, cols, filled = {}, {}, {}
    for n, (_pts, takes) in REGIONS.items():
        m = region(n, H, W) & ~bg & ~owned & np.isin(K, takes)
        if n == 'sword':
            # The blade's dark blues are a clear blue (green well over red); the trousers' navy it crosses,
            # nearly as much red as green, is not the sword's.
            t, _s = sword_frame(H, W)
            m &= ~((K == 'navy') & (a[..., 1].astype(int) - a[..., 0] < 15) & (t > SWORD_PARTS[2][0]))
        owned |= m
        masks[n] = m
        cols[n] = a.copy()
        filled[n] = np.zeros((H, W), bool)
    solid = {n: m.copy() for n, m in masks.items()}
    for n in REGIONS:
        # (his line just past the region's edge too, where it bounds the piece)
        lines = line & near8(region(n, H, W)) & near8(solid[n])
        if n in BEHIND:
            # A piece behind the others keeps only the line that bounds it alone: not the outline of an arm,
            # the sword or a leg in front of it (that is continued over as the piece's own).
            lines &= ~near8(~bg & ~line & ~solid[n])
        masks[n] = masks[n] | lines
    black = his_line(a)
    fill_cape(a, K, bg, masks, cols, filled, black)
    for n, shape in HIDDEN.items():
        clone_fill(a, K, bg, n, inside(shape, H, W), masks, cols, filled, black)
    return masks, cols, filled


# Where a piece goes on under what covers it in his picture (polygons in his pixel corners): the skirt's
# left strips and hem behind his near hand and the sword's guard, the trousers behind the blade and under
# the skirt's hem.
HIDDEN = {
    'skirt': [(37.6, 51), (45, 51), (49, 57), (49, 70), (42, 70), (37.6, 65)],
    'thigh_n': [(36.6, 64), (48.6, 64), (48.6, 80), (36.6, 80)],
    'thigh_f': [(53.6, 66), (64.6, 66), (64.6, 80), (53.6, 80)],
    # The far sandal's laced shin behind the blade.
    'sandal_f': [(56, 79.6), (62, 79.6), (62, 88.6), (56, 88.6)],
}
# The pieces that hang behind a piece continued by clone_fill: where he shows them, it is not hidden.
UNDER = {'skirt': ('thigh_n', 'thigh_f'), 'thigh_n': ('sandal_n',), 'thigh_f': ('sandal_f',)}
# The shifts a hidden patch may be cloned from (his pixels this far across and down): the skirt's strips
# repeat about every 5 px across, the trousers run on down the leg and across.
CLONE_SHIFTS = [(dx, dy) for dx in range(-12, 13) for dy in range(-6, 7) if (dx, dy) != (0, 0)]


def clone_fill(a, K, bg, n, shape, masks, cols, filled, black):
    """A piece continued where it is hidden: the hidden part of its shape (neither the piece nor the white
    round him) cloned whole from his visible pixels of the piece one shift away (the shift that finds the
    most of it, the shortest of equals), so his strips, folds and studs run on. A hidden pixel whose
    source is not the piece takes the piece's nearest pixel in its row. Where the patch meets the white
    round him, his black line closes it."""
    H, W, _ = a.shape
    m = masks[n]
    own = m & (K != 'line')
    outside = background(a)
    # Not where he shows the white round him, his cape or another piece that hangs behind this one (it is
    # that he drew there, not this piece).
    hidden = shape & ~m & ~outside & ~bg & ~(masks['cape'] & ~filled['cape'])
    for b in UNDER.get(n, ()):
        hidden &= ~(masks[b] & ~filled[b])
    pts = list(zip(*np.nonzero(hidden)))
    if not pts:
        return
    # His studs are not cloned: a stud stays where he put it (the cloth round it is cloned instead).
    ok = lambda y, x: 0 <= y < H and 0 <= x < W and own[y, x] and K[y, x] != 'gold'
    best = max(CLONE_SHIFTS, key=lambda d: (sum(1 for y, x in pts if ok(y + d[1], x + d[0])), -abs(d[0]) - abs(d[1]), d))
    c = cols[n]
    for y, x in pts:
        sy, sx = y + best[1], x + best[0]
        if ok(sy, sx):
            c[y, x] = a[sy, sx]
        else:
            row = np.nonzero(own[y] & (K[y] != 'gold'))[0]
            if not len(row):
                continue
            c[y, x] = a[y, row[np.argmin(np.abs(row - x))]]
        m[y, x] = True
        filled[n][y, x] = True
    # His black line round what was continued, where it meets what is not the piece.
    edge = filled[n] & ~near4(~m)
    edge = filled[n] & ~edge
    c[edge] = black


# His cape's folds run down and back (toward the lower left): a hidden pixel takes the colour of the cloth
# up its fold, this far across per row up.
CAPE_FOLD = 0.5


def fill_cape(a, K, bg, masks, cols, filled, black):
    """The cape with what his arm, sword, legs and body hide continued.

    Below his near arm the cape hangs behind the sword's hilt, his legs and his body; our arm, sword and legs
    stand elsewhere in other poses (and our legs at rest), so it shows there. Every column from the cape's
    back edge to CAPE_RIGHT runs from the shoulders (CAPE_TOP, or his cloth's top where it is higher) down
    to its hem: where his hem is hidden by a leg it is drawn straight between his hem on either side (past
    the last of his hems, level with it), closed by his black line. Each hidden pixel takes the colour of
    the cloth up its fold (his folds run on unbroken), else the nearest cloth in its row.
    """
    H, W, _ = a.shape
    m = masks['cape']
    cloth = m & (K != 'line')
    outside = bg
    seen = [x for x in range(W) if m[:, x].any()]
    cols_x = list(range(min(seen), CAPE_RIGHT + 1))
    hem, top, open_ = {}, {}, {}
    for x in cols_x:
        ys = np.nonzero(m[:, x])[0]
        hem[x] = int(ys.max()) if len(ys) else 0
        top[x] = min(int(ys.min()) if len(ys) else H, CAPE_TOP if x >= CAPE_TOP_FROM else H)
        open_[x] = len(ys) > 0 and (hem[x] + 1 >= H or outside[hem[x] + 1, x])
    xs_open = [x for x in cols_x if open_[x]]
    for x in cols_x:
        if open_[x]:
            continue
        lo = max([q for q in xs_open if q < x], default=None)
        hi = min([q for q in xs_open if q > x], default=None)
        if lo is not None and hi is not None:
            hem[x] = max(hem[x], int(round(hem[lo] + (hem[hi] - hem[lo]) * (x - lo) / (hi - lo))))
        elif lo is not None:
            hem[x] = max(hem[x], hem[lo])
    # His cape's back edge behind his near bracer and the sword's hilt: drawn straight between his edge above
    # and below them, in his line.
    e0, e1 = CAPE_EDGE
    left = lambda y: int(np.nonzero(m[y])[0].min())
    edge = {}
    for y in range(e0 + 1, e1):
        xe = int(round(left(e0) + (left(e1) - left(e0)) * (y - e0) / (e1 - e0)))
        for x in range(xe, W):
            if m[y, x]:
                break
            top[x] = min(top[x], y)
        if not m[y, xe]:
            edge[y] = xe
    c = cols['cape']
    for x in cols_x:
        for y in range(top[x], hem[x] + 1):
            if m[y, x] or outside[y, x]:
                continue
            # Up its fold, else down it (behind the body his folds come up from the cloth below the arm):
            # the nearer.
            src = None
            for k in range(1, H):
                hit = [(sx, sy) for sx, sy in ((int(round(x + CAPE_FOLD * k)), y - k), (int(round(x - CAPE_FOLD * k)), y + k)) if 0 <= sy < H and 0 <= sx < W and cloth[sy, sx]]
                if hit:
                    src = a[hit[0][1], hit[0][0]]
                    break
            if src is None:
                row = np.nonzero(cloth[y])[0]
                if not len(row):
                    continue
                src = a[y, row[np.argmin(np.abs(row - x))]]
            c[y, x] = black if y == hem[x] else src
            m[y, x] = True
            filled['cape'][y, x] = True
    for y, x in edge.items():
        c[y, x] = black


# The cape behind the body: from his cloth's back edge to this column (behind the far leg, where he shows
# it below the trousers), from the shoulders (this row, from this column on) down.
CAPE_RIGHT = 57
# The rows of his cape's back edge on either side of his near bracer and the sword's hilt, which hide it.
CAPE_EDGE = (42, 58)
CAPE_TOP = 30
CAPE_TOP_FROM = 30


def pack(col, mask):
    """aiden_ref.pack with roman_ref's longer alphabet: rows of palette characters (colours of his within 3
    share one), the origin (x0, y0) in his pixels and the palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def middle(a, masks, cols, names, kinds_, q=0.5):
    """His colour of middle lightness among the pixels of these kinds in these pieces (with `q`, that
    fraction of them darker): the base a colour slot recolours from. Only his own pixels count, not those
    continued where the piece is hidden."""
    found = []
    for n in names:
        for y, x in zip(*np.nonzero(masks[n])):
            if (cols[n][y, x] == a[y, x]).all() and kind(cols[n][y, x]) in kinds_:
                found.append((float(luma(cols[n][y, x])), hexc(cols[n][y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def module(masks, cols, doc, consts, bases, prefix, extra=''):
    """A generated TypeScript module: his colours each slot recolours from (`bases`, name -> hex), what each
    of his colours is (`<prefix>_KIND`, hex -> kind), the pieces (`consts`: (CONST, piece, doc, pivot in his
    pixels, angle[, joint in his pixels when the pivot is not on our joint])) and where each piece lands in
    our idle frame 0 unturned (`<prefix>_REST`: the fine pixel of its first row's first cell)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    kinds_ = {}
    body = []
    rest = []
    for const, n, pdoc, pivot, ang, *joint in consts:
        rows, origin, palette = pack(cols[n], masks[n])
        for h in palette.values():
            kinds_[h] = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        j = joint[0] if joint else pivot
        rest.append((const, [origin[i] + OFFSET[i] + int(np.floor(j[i])) - int(np.floor(pivot[i])) for i in (0, 1)]))
    names = ' | '.join(f"'{k}'" for k in KINDS)
    out.append('/** What each of his colours is, as the script sorts them (tools/refs/solen_ref.py kind). */')
    out.append(f'export const {prefix}_KIND: Record<string, {names}> = {{')
    for h in sorted(kinds_):
        out.append(f"  '{h}': '{kinds_[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    if extra:
        out += [extra, '']
    out += body
    return '\n'.join(out)


def study(a, masks, cols, names, path, box=(6, 2, 86, 100), filled=None):
    """His picture beside the pieces lifted out of it (drawn back to front in `names` order), at 8x; with
    `filled`, a third panel marks the pixels continued where he hid them (magenta checks)."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.full((H, W, 4), 0, np.uint8)
    marked = np.full((H, W, 4), 0, np.uint8)
    for n in names:
        for y, x in zip(*np.nonzero(masks[n])):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = cols[n][y, x]
                lifted[y - y0, x - x0, 3] = 255
                marked[y - y0, x - x0] = lifted[y - y0, x - x0]
                if filled is not None and filled[n][y, x] and (x + y) % 2:
                    marked[y - y0, x - x0] = (255, 0, 255, 255)
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    gap = np.zeros((H, 2, 4), np.uint8)
    panels = [his, gap, lifted] + ([gap, marked] if filled is not None else [])
    save(np.concatenate(panels, axis=1), path)
