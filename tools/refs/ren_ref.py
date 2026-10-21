"""Shared helpers for lifting parts out of the owner's Ren picture (docs/reference/ren-owner-reference.jpg).

His picture (2000x2000) is our Ren (male, idle frame 0) painted over by the owner as the new standard
for characters, in his own pixels of 20 picture pixels each (a 100 x 100 grid from the picture's
corner): one of his pixels is one fine pixel of our sprites, as in his Aiden picture
(tools/refs/aiden_ref.py). Lined up with our male at idle frame 0 (his head, collar, chest and arms on
ours), a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame, the
same offset as his Aiden picture, so JOINTS are the Aiden picture's.

His legs stand a little apart from our rig's (the near foot 5 px further back, the far one 5 px
lower: LEG_SHIFT). The leg pieces are cut about his own hip, knee and ankle (ours moved by LEG_SHIFT)
and hang from ours; worn together, his trousers and boots move the whole leg back by LEG_SHIFT, so at
rest they are exactly where he drew them (src/sprite/items/night.ts legShift).

pieces() cuts his figure into the pieces the items stamp (src/sprite/painted.ts). Each is a region of
his picture (REGIONS: a polygon in his pixel corners) and the kinds of his colours it takes there
(kind()), less what a piece in front of it already took, with his black line where it bounds the
piece's colours. Where a piece is hidden in his picture (the skirt and trousers behind his sword, the
chest under the near sleeve and the belt, the grip in his fist, the forearms under the gloves) it is
filled by continuing his pixels (continue_along), and closed on his line; only cells that something in
front hides are filled, so where he shows white it stays white.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import CHARS, hexc, inside, near4, near8, write  # noqa: E402,F401

REF = 'docs/reference/ren-owner-reference.jpg'
PITCH = 20
OFFSET = (75, 120)
# Our male rig at idle frame 0, in his pixels (as in tools/refs/aiden_ref.py: the same offset).
JOINTS = {
    'head': (51.0, 18.0),
    'neck': (52.18, 27.65),
    'shoulderN': (39.01, 32.51),
    'shoulderF': (59.27, 31.81),
    'elbowN': (35.13, 44.50),
    'elbowF': (62.09, 44.08),
    'wristN': (32.62, 55.21),
    'wristF': (67.52, 53.65),
    'handN': (31.80, 58.72),
    'handF': (69.30, 56.78),
    'pelvis': (52.0, 56.87),
    'hipN': (46.58, 56.46),
    'hipF': (56.51, 53.12),
    'kneeN': (47.17, 72.65),
    'kneeF': (63.23, 67.86),
    'ankleN': (43.42, 87.59),
    'ankleF': (60.94, 83.08),
}
# Our face template's anchor (body.ts faceAnchor: the near eye's lash row) on his picture.
ANCHOR = (48, 19)
# How far from our rig's his legs stand at rest (his pixels; ren-trousers-from-ref.py writes it into the
# game as NIGHT_LEG_SHIFT).
LEG_SHIFT = {'N': (-5, 0), 'F': (-1, 5)}
# His black line: darker than this (luma). His darkest cloth and hair, inside the line, are lighter.
LINE_LUMA = 8


def native(path=REF):
    """His pixels: the median of each block's interior, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = a.shape[0] // PITCH
    out = np.zeros((n, n, 3))
    for j in range(n):
        for i in range(n):
            c = a[j * PITCH + 3:(j + 1) * PITCH - 3, i * PITCH + 3:(i + 1) * PITCH - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kind(c):
    """What a colour of his is: 'white' (the white round him, and his brightest glints), 'line' (his
    navy black), 'skin', 'gold', 'blue' (his eyes, the sword's wrap and blade), 'silver' (buttons,
    studs, the boots' bands) or 'dark' (his black cloth and his hair, greys and blue-greys)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L > 225:
        # the white round him, or (inside his figure) the brightest glints of the blade and the guard
        return 'gold' if b < r - 40 else 'white'
    if L < LINE_LUMA:
        return 'line'
    if r > b + 25 and r >= g:
        if b < 0.45 * r and g > 0.45 * r and r > 90:
            return 'gold'
        return 'skin'
    if b > r + 45 and b > 110:
        return 'blue'
    if L > 105:
        return 'silver'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def pack(col, mask):
    """roman_ref.pack: rows of palette characters (colours of his within 3 share one), the origin
    (x0, y0) in his pixels and the palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def packed(hexv, palette):
    """The colour of the palette a colour of his was packed as (pack merges colours within 3)."""
    c = [int(hexv[k:k + 2], 16) for k in (1, 3, 5)]
    for h in palette.values():
        if max(abs(int(h[k:k + 2], 16) - c[i]) for i, k in enumerate((1, 3, 5))) <= 3:
            return h
    raise ValueError(hexv + ' is not in the palette')


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


def module(doc, consts, bases, prefix, kinds_of=None):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what
    each of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours,
    doc, pivot in his pixels, angle[, joint in his pixels when the pivot is not on our joint])) and where
    each piece lands in our idle frame 0 (`<PREFIX>_REST`: the fine pixel of its first row's first cell,
    unturned). `kinds_of(rgb, CONST)` says what a colour is in a piece (kind() by default)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    found = {}
    body = []
    rest = []
    for const, mask, col, pdoc, pivot, ang, *jt in consts:
        rows, origin, palette = pack(col, mask)
        for h in palette.values():
            rgb = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
            k = kinds_of(rgb, const) if kinds_of else kind(rgb)
            if found.get(h, k) != k:
                raise ValueError(f'{h} is {found[h]} in one piece and {k} in {const}')
            found[h] = k
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        j = jt[0] if jt else pivot
        rest.append((const, [origin[i] + OFFSET[i] + int(np.floor(j[i])) - int(np.floor(pivot[i])) for i in (0, 1)]))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/ren_ref.py kind). */")
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


def middle(a, pieces, names, want, q=0.5):
    """His colour of middle lightness among his own pixels of these kinds in these pieces (half of them
    lighter, half darker; with `q`, that fraction of them darker): the base a colour slot recolours
    from. Pixels continued where a piece is hidden do not count."""
    found = []
    for n in names:
        m, c = pieces[n]
        for y, x in zip(*np.nonzero(m)):
            if (c[y, x] == a[y, x]).all() and kind(c[y, x]) in want:
                found.append((float(luma(c[y, x])), hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


# ---------------------------------------------------------------------------------------------------
# The regions of his picture each piece is cut from (polygons in his pixel corners), in the order they
# claim his colours: a pixel goes to the first piece whose region holds it and whose kinds take it.
# The gloves and the sword are in front of everything they cross; the rest from the top down.
# ---------------------------------------------------------------------------------------------------
REGIONS = {
    'glove_n': [(29, 49.5), (39.5, 49.5), (39.5, 63), (29, 63)],
    'glove_f': [(61, 49.5), (71, 49.5), (71, 61), (61, 61)],
    # The sword: the pommel and wrapped grip up to the fist, the guard, the blade to its point. It takes
    # his blues, golds and silvers there, and his dark steel only in the pommel and the guard (KATANA_DARK).
    'katana': [(20, 48), (27, 48), (36, 55), (37, 56), (46, 61), (82, 89), (82, 96), (74, 96), (62.5, 84), (44, 71), (35, 68), (34, 60), (20, 54)],
    'hair': [(36, 2), (67, 2), (67, 26), (36, 26)],
    'sleeve_n': [(30, 28), (44.5, 28), (44.5, 41), (30, 41)],
    'sleeve_f': [(58.5, 28), (67, 28), (67, 41), (58.5, 41)],
    'fore_n': [(29, 39.5), (40.5, 39.5), (40.5, 50), (29, 50)],
    'fore_f': [(61, 39.5), (70, 39.5), (70, 52), (61, 52)],
    'jacket': [(38, 26), (62, 26), (62, 48), (38, 48)],
    'belt': [(39, 47.5), (62, 47.5), (62, 54.5), (39, 54.5)],
    'skirt': [(33, 54), (68, 54), (68, 78), (33, 78)],
    'trousers_n': [(33, 74), (54, 74), (54, 82), (33, 82)],
    'trousers_f': [(54, 74), (66, 74), (66, 82), (54, 82)],
    'boot_n': [(32, 82.5), (45, 82.5), (45, 100), (32, 100)],
    'boot_f': [(54, 82.5), (75, 82.5), (75, 100), (54, 100)],
}
KATANA_DARK = [
    [(22, 49.5), (27, 49.5), (31, 53), (31, 57), (28, 57), (22, 53)],
    [(35.5, 57.5), (43.5, 57.5), (45, 59), (45, 63), (42, 67), (35, 67), (35, 62)],
]
# The blade's line (from the guard to the point) and how far from it its pixels lie.
KATANA_BLADE = ((41.0, 63.0), (80.0, 93.5))
KATANA_BLADE_HALF = 3.2
TAKES = {
    'glove_n': ('dark', 'silver', 'skin'),
    'glove_f': ('dark', 'silver', 'skin'),
    'katana': ('blue', 'gold', 'silver', 'white'),
    'hair': ('dark', 'silver'),
    # His forearms: his skin and the dark warm line he drew round it.
    'fore_n': ('skin', 'dark'),
    'fore_f': ('skin', 'dark'),
    'jacket': ('dark', 'silver', 'blue'),
    'boot_n': ('dark', 'silver', 'gold', 'skin', 'white'),
    'boot_f': ('dark', 'silver', 'gold', 'skin', 'white'),
}
DEFAULT_TAKES = ('dark', 'silver', 'gold')
# His face from the lash row down (x0, y0, x1, y1, exclusive): the hair takes only the line beside its
# strands there.
FACE_BOX = (48, 19, 61, 30)


def night_skin(a):
    """His base skin: the commonest light colour of his face (colours within 3 counted as one, as pack
    does). The character's skin moves every skin colour of his as far (src/sprite/painted.ts skinTone)."""
    seen = []
    for y in range(20, 27):
        for x in range(48, 58):
            c = a[y, x]
            if kind(c) != 'skin' or luma(c[None])[0] < 140:
                continue
            for k, (ref, n) in enumerate(seen):
                if np.abs(ref - c).max() <= 3:
                    seen[k] = (ref, n + 1)
                    break
            else:
                seen.append((c, 1))
    return hexc(max(seen, key=lambda s: s[1])[0])


def gaps(a):
    """The white he left inside his figure (between the near arm and the body): pure white patches of
    six pixels or more not reached from the picture's edge. His glints are smaller or tinted."""
    H, W, _ = a.shape
    pure = (a.min(axis=2) > 245) & (a.max(axis=2) - a.min(axis=2) <= 4) & ~background(a)
    out = np.zeros((H, W), bool)
    seen = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(pure)):
        if seen[y, x]:
            continue
        comp, stack = [], [(y, x)]
        while stack:
            q, p = stack.pop()
            if 0 <= q < H and 0 <= p < W and pure[q, p] and not seen[q, p]:
                seen[q, p] = True
                comp.append((q, p))
                stack += [(q + 1, p), (q - 1, p), (q, p + 1), (q, p - 1)]
        if len(comp) >= 6:
            for q, p in comp:
                out[q, p] = True
    # and the one white pixel he left between the grip and the near fist
    for x, y in GAP_PIXELS:
        out[y, x] = True
    return out


GAP_PIXELS = [(30, 53)]


def segment(a):
    """His figure split into the regions' pieces: {name: mask} of his own pixels (no fills yet)."""
    H, W, _ = a.shape
    K = kinds(a)
    bg = background(a) | gaps(a)
    line = K == 'line'
    owned = np.zeros((H, W), bool)
    masks = {}
    for n, pts in REGIONS.items():
        m = inside(pts, H, W) & ~bg & ~owned & np.isin(K, TAKES.get(n, DEFAULT_TAKES))
        if n == 'katana':
            for q in KATANA_DARK:
                m |= inside(q, H, W) & ~owned & ~bg & (K != 'line')
            # Only the sword itself: past the guard its silver and white are the blade's within
            # KATANA_BLADE_HALF of the blade's line (a stud of the skirt beside it is the skirt's), and
            # loose pixels are not the sword's.
            hilt = np.logical_or.reduce([inside(q, H, W) for q in KATANA_DARK])
            m &= hilt | ~np.isin(K, ('silver', 'white')) | band(*KATANA_BLADE, KATANA_BLADE_HALF)
            m = patches(m, 8)
        owned |= m
        masks[n] = m
    out = near4(bg)
    for n, pts in REGIONS.items():
        reg = inside(pts, H, W)
        ink = line & reg & near8(masks[n])
        if n == 'hair':
            # Over his face only the line that edges a strand (side by side with it) is the hair's: the
            # lashes, the nose and the jaw are the face's.
            fx0, fy0, fx1, fy1 = FACE_BOX
            face = np.zeros((H, W), bool)
            face[fy0:fy1, fx0:fx1] = True
            ink &= ~face | near4(masks[n])
        # His line spikes standing out past the colours (hair tips, the blade's point): line pixels on
        # the white round him joined to the line already taken.
        while True:
            more = line & reg & ~ink & near8(ink) & out & ~near8(owned & ~masks[n])
            if not more.any():
                break
            ink |= more
        masks[n] = masks[n] | ink
    # His line left between pieces (where the near arm meets the chest, the fist the guard, the skirt's
    # side the guard): the first piece beside it takes it.
    for y, x in zip(*np.nonzero(line & ~bg)):
        if any(m[y, x] for m in masks.values()):
            continue
        for n in REGIONS:
            if near8_at(masks[n], y, x):
                masks[n][y, x] = True
                break
    return masks, K, bg


def patches(m, least):
    """The 8-connected patches of a mask of at least `least` cells."""
    H, W = m.shape
    seen = np.zeros((H, W), int)
    out = np.zeros((H, W), bool)
    k = 0
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        k += 1
        comp, stack = [], [(y, x)]
        seen[y, x] = k
        while stack:
            q, p = stack.pop()
            comp.append((q, p))
            for dq in (-1, 0, 1):
                for dp in (-1, 0, 1):
                    a, b = q + dq, p + dp
                    if 0 <= a < H and 0 <= b < W and m[a, b] and not seen[a, b]:
                        seen[a, b] = k
                        stack.append((a, b))
        if len(comp) >= least:
            for q, p in comp:
                out[q, p] = True
    return out


def near8_at(m, y, x):
    H, W = m.shape
    return any(m[q, p] for q in range(max(0, y - 1), min(H, y + 2)) for p in range(max(0, x - 1), min(W, x + 2)))


# ---------------------------------------------------------------------------------------------------
# What his picture hides of each piece, continued from his own pixels.
# ---------------------------------------------------------------------------------------------------

def continue_along(col, src, hidden, axis, period, line_edge=None, black=None):
    """Fills the cells of `hidden` from the source cells: each takes the colour of the first source
    cell `period`, 2 `period`... cells back along `axis` (dx, dy), else that far the other way, else
    the nearest source cell in its row, so his folds, seams and studs run on through it. Filled cells
    become sources for the next ones. Cells of `line_edge` take his black line (the hidden part's
    outline)."""
    H, W = src.shape
    dx, dy = axis
    n = float(np.hypot(dx, dy))
    dx, dy = dx / n, dy / n
    s = src.copy()
    c = col.copy()
    todo = sorted(zip(*np.nonzero(hidden)))
    while todo:
        rest, done = [], []
        for y, x in todo:
            if line_edge is not None and line_edge[y, x]:
                c[y, x] = black
                continue
            got = None
            for sign in (-1, 1):
                for k in range(1, 40):
                    q = int(np.floor(y + 0.5 + sign * dy * period * k))
                    p = int(np.floor(x + 0.5 + sign * dx * period * k))
                    if not (0 <= q < H and 0 <= p < W):
                        break
                    if s[q, p]:
                        got = c[q, p]
                        break
                if got is not None:
                    break
            if got is None:
                xs = np.nonzero(s[y])[0]
                if len(xs):
                    got = c[y, xs[np.argmin(np.abs(xs - x))]]
            if got is None:
                rest.append((y, x))
                continue
            c[y, x] = got
            done.append((y, x))
        for y, x in done:
            s[y, x] = True
        if rest and len(rest) == len(todo):
            raise ValueError('cells with nothing to continue from: %r' % rest[:5])
        todo = rest
    return c


def band(p0, p1, half, H=100, W=100, y_from=None, y_to=None):
    """The cells whose centres lie within `half` of the segment p0-p1 (his pixels), optionally only
    rows y_from..y_to."""
    ys, xs = np.mgrid[0:H, 0:W]
    px, py = xs + 0.5, ys + 0.5
    (x0, y0), (x1, y1) = p0, p1
    vx, vy = x1 - x0, y1 - y0
    t = np.clip(((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy), 0, 1)
    m = np.hypot(px - (x0 + t * vx), py - (y0 + t * vy)) <= half
    if y_from is not None:
        m &= ys >= y_from
    if y_to is not None:
        m &= ys <= y_to
    return m


def edge4(shape):
    """The cells of a shape with a 4-neighbour outside it."""
    p = np.pad(shape, 1)
    return shape & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def his_joint(name, side):
    """Where his leg's joint is in his picture: ours moved by LEG_SHIFT."""
    x, y = JOINTS[name]
    return (x + LEG_SHIFT[side][0], y + LEG_SHIFT[side][1])


def rows_from(y0, H=100, W=100):
    m = np.zeros((H, W), bool)
    m[y0:] = True
    return m


# The jacket's outline where the sleeves and the belt hide it: from the collar to the hips, its near
# side on his line at x = 41 (as below the near sleeve), its far side at x = 60.
JACKET_SHAPE = [(41, 28), (61, 28), (61, 55), (41, 55)]
# The skirt's outline where his fist, the guard and the blade hide it: its near side on his line at
# x = 35, its hem from his near hem (row 76) straight to his far hem (row 73).
SKIRT_SHAPE = [(35, 54.5), (67, 54.5), (67, 74), (58, 74), (51, 77), (35, 77)]
# The sword's grip line: from his pommel through where his wrap goes into the fist to where it comes
# out by the guard (his pixels).
KATANA_GRIP = ((26.0, 52.6), (38.0, 61.0))
# Each leg's trousers: a band this wide about his leg's line, from the hip down into the boot (rows
# past TROUSER_TO are the boot's).
TROUSER_HALF = {'N': 5.5, 'F': 4.5}
# Each bare forearm's half width about the arm's line, where it runs on under the glove.
FORE_HALF = {'N': 3.4, 'F': 2.6}
TROUSER_TO = {'N': 84, 'F': 84}
# The first row of each boot's foot (the shaft above it turns with the shin).
BOOT_FOOT_FROM = {'N': 90, 'F': 89}
# Where his far thigh shows through the slit of his skirt (his blue-black cloth between the panels).
FAR_SLIT = (58, 60, 61, 74)  # x0, y0, x1, y1 (exclusive)
# The hair's back: his face hidden behind it down to the row above his eyes, and his ear.
FOREHEAD_TO = 19
EAR_BOX = (43, 18, 47, 23)


def pieces(a):
    """His figure cut into pieces, with what his picture hides of them continued: {name: (mask, colours)}."""
    H, W, _ = a.shape
    masks, K, bg = segment(a)
    black = his_line(a)
    line = K == 'line'
    rows = np.arange(H)[:, None]
    out = {n: (m.copy(), a.copy()) for n, m in masks.items()}
    front = lambda *names: np.logical_or.reduce([masks[n] for n in names])

    # The jacket: under the near sleeve his chest runs on from beside it (his folds run across), under
    # the belt it runs on down (his rows above again); its sides close on his line. (The far sleeve is
    # behind the body: where it shows past the chest, the chest ends.)
    shape = inside(JACKET_SHAPE, H, W)
    m = masks['jacket']
    hid = shape & ~m & (front('sleeve_n', 'hair') | (rows >= 48))
    edge = edge4(shape) & hid & (rows < 54)
    side = hid & (rows < 48)
    c = continue_along(a, m & ~line, side, (1, 0), 3, edge, black)
    low = hid & ~side
    c = continue_along(c, (m & ~line) | (side & ~edge), low, (0, 1), 4, edge, black)
    out['jacket'] = (m | hid, c)

    # The skirt: under his fist, the guard and the blade his panels, seams and studs run on down their
    # columns (his studs every 4 rows); its near side and hem close on his line.
    shape = inside(SKIRT_SHAPE, H, W)
    m = masks['skirt']
    hid = shape & ~m & front('glove_n', 'glove_f', 'katana')
    edge = edge4(shape) & hid
    c = continue_along(a, m & ~line, hid, (0, 1), 4, edge, black)
    out['skirt'] = (m | hid, c)

    # The grip in his fist: his wrap (a lit blue row between dark ones, in his line) runs on along the
    # sword's line from where it goes into the fist to where it comes out by the guard.
    m = masks['katana']
    g0, g1 = KATANA_GRIP
    # (only where a piece in front hides it: where his picture shows white beside the grip, it is white)
    grip = band(g0, g1, 2.3) & ~m & ~bg & front('glove_n')
    core = band(g0, g1, 1.45) & grip
    c = continue_along(a, m & ~line & band(g0, g1, 2.3), core, (g1[0] - g0[0], g1[1] - g0[1]), 3)
    c[grip & ~core] = black
    out['katana'] = (m | grip, c)

    # His bare forearms run on down to the wrist under his gloves (his skin continued down the arm, his
    # line on its sides), so a hand that is not his fist (open, pointing, a sign) still meets the arm.
    for s in ('N', 'F'):
        n = 'fore_' + s.lower()
        m = masks[n]
        e, w = JOINTS['elbow' + s], JOINTS['wrist' + s]
        d = (w[0] - e[0], w[1] - e[1])
        L = float(np.hypot(*d))
        end = (w[0] + d[0] / L * 1.5, w[1] + d[1] / L * 1.5)
        arm = band(e, end, FORE_HALF[s])
        hid = arm & ~m & masks['glove_' + s.lower()]
        edge = edge4(arm) & hid
        c = continue_along(a, m & (K == 'skin'), hid, d, 1, edge, black)
        out[n] = (m | hid, c)

    # The trousers: each leg's band about his leg's line, his visible cloth kept, the rest his cloth
    # continued up each column from the first of his pixels below (his folds run on up the leg as long
    # creases), its sides on his line.
    for s in ('N', 'F'):
        n = 'trousers_' + s.lower()
        m = masks[n]
        hip, knee, ankle = his_joint('hip' + s, s), his_joint('knee' + s, s), his_joint('ankle' + s, s)
        leg = band(hip, knee, TROUSER_HALF[s]) | band(knee, ankle, TROUSER_HALF[s], y_to=TROUSER_TO[s])
        hid = leg & ~m & ~bg  # only what something in front of it hides: where he shows white, it is white
        edge = edge4(leg) & hid
        src = m & ~line
        if s == 'F':
            x0, y0, x1, y1 = FAR_SLIT
            slit = np.zeros((H, W), bool)
            slit[y0:y1, x0:x1] = True
            src = src | (slit & masks['skirt'] & (K == 'dark') & ((a[..., 2] - a[..., 0]) >= 14))
        c = continue_along(a, src, hid, (0, 1), 1, edge, black)
        out[n] = (m | hid, c)

    # The boots: the shaft (with its cuff) above the foot; the shaft runs on two rows under the foot's
    # top (his two rows above it again), so the shin can turn without a gap at the ankle.
    for s in ('N', 'F'):
        n = 'boot_' + s.lower()
        m = masks[n]
        top = BOOT_FOOT_FROM[s]
        shaft = m & (rows < top)
        c = a.copy()
        run = np.zeros((H, W), bool)
        for x in np.nonzero(shaft[top - 1])[0]:
            for k in (0, 1):
                run[top + k, x] = True
                c[top + k, x] = a[top - 2 + k, x]
        out[n + '_shin'] = (shaft | run, c)
        out[n + '_foot'] = (m & (rows >= top), a.copy())
        del out[n]

    out['hair_back'] = hair_back(a, K, bg, masks['hair'])
    return out


def hair_back(a, K, bg, front):
    """His hair with what his face hides filled in (behind the forehead between his strands, and behind
    his ear): each hidden cell takes the colour of the nearest of his hair pixels above it, so his
    strands run on down. Drawn behind the head, it shows only where a head is narrower than ours."""
    H, W = front.shape
    hidden = np.zeros((H, W), bool)
    for y in range(FOREHEAD_TO + 1):
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    ex0, ey0, ex1, ey1 = EAR_BOX
    hidden[ey0:ey1, ex0:ex1] = True
    hidden &= ~bg & ~front
    c = continue_along(a, front & (K != 'line'), hidden, (0, 1), 1)
    return front | hidden, c


def compose(pieces_, names, box=(18, 0, 82, 100)):
    """The pieces drawn back to front in `names` order, as RGBA in `box` of his picture."""
    x0, y0, x1, y1 = box
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for n in names:
        m, c = pieces_[n]
        for y, x in zip(*np.nonzero(m)):
            if y0 <= y < y1 and x0 <= x < x1:
                out[y - y0, x - x0, :3] = c[y, x]
                out[y - y0, x - x0, 3] = 255
    return out


def study(a, pieces_, names, path, box=(18, 0, 82, 100)):
    """His picture beside the pieces lifted out of it (drawn back to front in `names` order), at 8x."""
    x0, y0, x1, y1 = box
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((y1 - y0, x1 - x0, 1), 255, np.uint8)], axis=2)
    gap = np.zeros((y1 - y0, 2, 4), np.uint8)
    save(np.concatenate([his, gap, compose(pieces_, names, box)], axis=1), path)


