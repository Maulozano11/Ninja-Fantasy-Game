"""Shared helpers for lifting the tactical set out of the owner's paint-over
(docs/reference/tactical-coat-owner-reference.jpg).

The owner (2026-10-21) sent two pictures of a silver-haired ninja to show clothing for the sets, not a
new character: "con el personaje solo queria q vieras el chaleco sin capa y con capa ... el chaleco no es
de jonin parece mas como tactico militar solo cambiale los colores y no lo hagas personaje es parte de
los sets". His coat picture (2000x2000) is our male (idle frame 0) painted over in his own pixels of 20
picture pixels each (a 100 x 100 grid from the picture's corner), like his Ren picture: one of his pixels
is one fine pixel of our sprites, and a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of
our 256 x 256 frame, so JOINTS are the Aiden picture's. His vest-only picture
(docs/reference/tactical-vest-owner-reference.jpg) is drawn at another scale (about 18 picture pixels a
cell, 110 cells across, the figure about 107 px tall), so it is not lifted: it shows what the coat hides
(the vest's sides go on to the arms).

What is lifted (each its own creator option): the padded vest, the long open coat with its red lining,
the open-toe shin boots and the short glove on the far wrist. His hair, his face and the lightning in his
near hand are not copied: where the lightning (and its blue light on the coat) covers the coat, the
coat is continued from his own pixels.

pieces() cuts his figure into the pieces the items stamp (src/sprite/painted.ts). Each piece is a region
of his picture (cells, his pixel coordinates) and the kinds of his colours it takes there (kind()).
Where a piece is hidden in his picture it is filled by continuing his pixels and closed on his line;
only cells something in front hides are filled, so where he shows white it stays white.

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

REF = 'docs/reference/tactical-coat-owner-reference.jpg'
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
# How far from our rig's his feet stand at rest (his pixels): his near boot is on our near foot, his far
# boot 1 px further back and 5 px lower than our far foot (as on his Ren).
LEG_SHIFT = {'N': (0, 0), 'F': (-1, 5)}
# His far wrist (where the cuff of his glove starts): his far arm hangs about 3 px lower than ours.
HIS_WRIST_F = (67.0, 56.0)
# His black line: darker than this (luma). His darkest cloth, inside the line, is lighter.
LINE_LUMA = 8
# Where the lightning and its light are (cells x0, y0, x1, y1 exclusive): there his bluish and white
# colours are the lightning's, not the coat's or the skin's.
BOLT_BOX = (8, 44, 53, 84)


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
    """What a colour of his is: 'white', 'line' (his black), 'bolt' (a lightning blue), 'red' (the
    coat's lining), 'skin', 'green' (the vest), 'hair' (his lavender silver) or 'dark' (his black cloth
    and greys)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L > 225 and max(r, g, b) - min(r, g, b) <= 30:
        return 'white'
    if L < LINE_LUMA:
        return 'line'
    if b > r + 25 and L > 45:
        return 'bolt'
    if r > 60 and g < 0.4 * r and b < 0.5 * r:
        return 'red'
    if r > b + 25 and r >= g:
        return 'skin'
    if g > r + 3 and g > b + 3 and L > 22:
        return 'green'
    if L > 120:
        return 'hair'
    return 'dark'


def kinds(a):
    """kind() of every cell; in BOLT_BOX the whites and the blue-lit colours are the lightning's (and
    his warm greys the arm's), and out of it his bluish lights are his hair's."""
    H, W, _ = a.shape
    K = np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])
    x0, y0, x1, y1 = BOLT_BOX
    box = np.zeros((H, W), bool)
    box[y0:y1, x0:x1] = True
    lit = (a[..., 2] - a[..., 0] > 16) & (luma(a) >= LINE_LUMA)
    K[box & ((K == 'white') | lit)] = 'bolt'
    # (and his warm greys there are the shaded edge of the near arm and fist, not the coat)
    K[box & (K == 'dark') & (a[..., 0] - a[..., 2] > 8)] = 'skin'
    K[~box & (K == 'bolt')] = 'hair'
    return K


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def his_skin(a):
    """His base skin: the commonest light colour of his face (colours within 3 counted as one, as pack
    does). The character's skin moves every skin colour of his as far (src/sprite/painted.ts skinTone)."""
    seen = []
    for y in range(28, 35):
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


def pack(col, mask):
    """roman_ref.pack: rows of palette characters (colours of his within 3 share one), the origin
    (x0, y0) in his pixels and the palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


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
    each of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, (mask, colours),
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
    for const, (mask, col), pdoc, pivot, ang, *jt in consts:
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
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/tactical_ref.py kind). */")
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


def middle(a, pieces_, want, q=0.5):
    """His colour of middle lightness among his own pixels of these kinds in these pieces (with `q`, that
    fraction of them darker): the base a colour slot recolours from. Continued pixels do not count."""
    found = []
    for m, c in pieces_:
        for y, x in zip(*np.nonzero(m)):
            if (c[y, x] == a[y, x]).all() and kind(c[y, x]) in want:
                found.append((float(luma(c[y, x])), hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


# ---------------------------------------------------------------------------------------------------
# Continuing his pixels where something in front hides them.
# ---------------------------------------------------------------------------------------------------

def continue_along(col, src, hidden, axis, period, line_edge=None, black=None, signs=(-1, 1)):
    """Fills the cells of `hidden` from the source cells: each takes the colour of the first source
    cell `period`, 2 `period`... cells along `axis` (dx, dy) the way of the first of `signs` (-1 back,
    1 forward), else the other way, else the nearest source cell in its row, so his folds and seams run
    on through it. Filled cells become sources for the next ones. Cells of `line_edge` take his black
    line (the hidden part's outline). (As tools/refs/ren_ref.py continue_along.)"""
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
            for sign in signs:
                for k in range(1, 60):
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


def tile_rows(col, src, hidden, least=4):
    """Fills the cells of `hidden` with his cloth of the nearest row that has `least` cells of it or more
    (the row itself, else the rows below, else above): his cells of that row laid side by side again and
    again across it, each hidden cell taking the one its column falls on, so his vertical folds run on
    behind what hides them."""
    H, W = src.shape
    c = col.copy()
    has = [np.nonzero(src[y])[0] for y in range(H)]
    for y, x in zip(*np.nonzero(hidden)):
        order = [y] + list(range(y + 1, H)) + list(range(y - 1, -1, -1))
        yy = next(q for q in order if len(has[q]) >= least)
        xs = has[yy]
        c[y, x] = col[yy, xs[(x - xs[0]) % len(xs)]]
    return c


def commonest(a, m):
    """His commonest colour among the cells of a mask (colours within 3 counted as one, as pack does)."""
    seen = []
    for y, x in zip(*np.nonzero(m)):
        c = a[y, x]
        for k, (ref, n) in enumerate(seen):
            if np.abs(ref - c).max() <= 3:
                seen[k] = (ref, n + 1)
                break
        else:
            seen.append((c, 1))
    return max(seen, key=lambda s: s[1])[0]


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


def cells(x0, y0, x1, y1, H=100, W=100):
    """The cells x0..x1-1, y0..y1-1 (his pixels)."""
    m = np.zeros((H, W), bool)
    m[y0:y1, x0:x1] = True
    return m


def his_joint(name, side):
    """Where his leg's joint is in his picture: ours moved by LEG_SHIFT."""
    x, y = JOINTS[name]
    return (x + LEG_SHIFT[side][0], y + LEG_SHIFT[side][1])


# ---------------------------------------------------------------------------------------------------
# The pieces.
# ---------------------------------------------------------------------------------------------------

# The vest: its padded front with the black binding at the top and the two dark bands at the bottom,
# to its right line (x 61). On the near side his line at x 47 is the coat's lapel edge: under the lapel
# (x 44-47) the vest goes on to the side of the torso, his panels running on from the columns beside it,
# one pad (4 cells) over, and it closes on his line at x 43 (his vest-only picture shows it reaching
# the arms).
VEST = (48, 35, 62, 63)
VEST_SIDE = (43, 35, 48, 63)
# The coat's standing collar beside the jaw, on the near side and the far side of the neck.
COLLAR = [(44, 30, 49, 35), (44, 35, 48, 38), (57, 30, 62, 36)]
# The coat's near sleeve over the shoulder, and the far one (a little of it shows past the far lapel).
SLEEVE_N = (32, 33, 44, 47)
SLEEVE_F = (64, 35, 67, 45)
# The far lapel: the strip of coat between the vest and the far arm.
LAPEL_F = (62, 33, 64, 63)
# The near front of the coat: its lapel beside the vest (x 44-47 from under the collar), then the panel
# that hangs from under the near sleeve in front of the near leg to the hem.
FRONT_N_LAPEL = (44, 38, 48, 63)
FRONT_N_PANEL = (12, 38, 47, 94)
# Its outer edge where the sleeve, the lightning and the near arm hide it: straight lines from the
# shoulder (x 41 at row 38, under the sleeve) to the sleeve's back corner (x 32 at row 44), then down to
# where his line shows again (x 27 at row 72). Under the sleeve the panel goes on up to row 38, so a
# sleeve that turns away with the arm uncovers his cloth, not a hole.
FRONT_EDGE = ((41.0, 38), (32.4, 44), (27.0, 72))
# The first row his red lining shows at the hem.
LINING_FROM = 78
# The coat's back: the far panel past the far leg and the lining between the legs; below the vest,
# behind the trousers and the boots, it is continued from his cloth.
BACK_FAR = (62, 44, 73, 93)
BACK_BETWEEN = (47, 78, 62, 93)
BACK_HIDDEN = (46, 60, 66, 92)
# The boots. Each shaft runs from its top line down to the foot (BOOT_FOOT_FROM); the near shaft is
# under the coat's hem down to row 90 (its line), so it is continued up the shin to its top line
# (BOOT_N_TOP), as high above the sole as his far boot's.
BOOT_N = (39, 91, 49, 99)
BOOT_F = [(56, 80, 65, 89), (56, 89, 72, 96)]
BOOT_FOOT_FROM = {'N': 93, 'F': 89}
BOOT_N_TOP = 83
BOOT_N_HALF = 4.5
# The short glove on the far wrist: his dark cuff with its glint (his bare fist below it is our hand).
GLOVE_F = (64, 54, 70, 59)


def pieces(a):
    """His figure cut into pieces, with what his picture hides of them continued: {name: (mask, colours)}."""
    H, W, _ = a.shape
    K = kinds(a)
    black = his_line(a)
    line = K == 'line'
    bg = background(a)
    rows = np.arange(H)[:, None]
    out = {}
    box = lambda b: cells(*b, H, W)
    take = lambda region, want: region & np.isin(K, want)

    def lined(region, want):
        # his cloth of these kinds in the region, and his line there that touches it
        m = take(region, want)
        return m | (region & line & near8(m))

    # The vest, and its side under the near lapel.
    m = take(box(VEST), ('green', 'dark', 'line'))
    side = box(VEST_SIDE)
    hid = side & ~m
    edge = side & (np.arange(W)[None, :] == VEST_SIDE[0])
    c = continue_along(a, m & ~line, hid, (1, 0), 4, edge, black, signs=(1,))
    out['vest'] = (m | hid, c)

    # The coat's collar and sleeves and the far lapel: his cloth and line.
    collar = np.logical_or.reduce([lined(box(b), ('dark',)) for b in COLLAR])
    out['collar'] = (collar, a.copy())
    out['sleeve_n'] = (lined(box(SLEEVE_N), ('dark',)), a.copy())
    out['sleeve_f'] = (lined(box(SLEEVE_F), ('dark',)), a.copy())
    out['lapel_f'] = (lined(box(LAPEL_F), ('dark',)), a.copy())

    # The near front: the lapel, and the panel down to the hem. Where the lightning, its light and the
    # near arm cover it, his cloth runs on up from below (his long folds), closed on its outer edge.
    sleeve = out['sleeve_n'][0]
    lapel = take(box(FRONT_N_LAPEL), ('dark', 'line'))
    cloth = take(box(FRONT_N_PANEL), ('dark', 'red', 'line')) & ~sleeve & ~bg & ~box(BOOT_N) & (rows >= 44)
    # (his red up by the arm is the arm's shaded line; the lining shows only at the hem)
    cloth &= ~((K == 'red') & (rows < LINING_FROM))
    shape = np.zeros((H, W), bool)
    edge = np.zeros((H, W), bool)
    for y in range(FRONT_N_PANEL[1], FRONT_N_PANEL[3]):
        if y <= FRONT_EDGE[-1][1]:
            (ex0, ey0), (ex1, ey1) = next((p, q) for p, q in zip(FRONT_EDGE, FRONT_EDGE[1:]) if y <= q[1])
            xl = int(np.floor(ex0 + (ex1 - ex0) * (y - ey0) / (ey1 - ey0)))
        else:
            xs = np.nonzero(cloth[y])[0]
            if not len(xs):
                continue
            xl = int(xs.min())
        shape[y, xl:FRONT_N_PANEL[2]] = True
        edge[y, xl] = True
    shape &= ~box(BOOT_N)
    # its top under the sleeve closes on his line too
    edge |= shape & (rows == FRONT_N_PANEL[1])
    # (his loose sparks past the edge are the lightning's)
    cloth &= shape
    # (the lightning's white reaches the white round him, but inside the coat's edge it hides the coat)
    covers = np.isin(K, ('bolt', 'skin')) | ((K == 'white') & ~bg)
    # his line round the arm and the fist (not the coat's): line cells beside the skin or the lightning
    covers |= line & near8(np.isin(K, ('bolt', 'skin'))) & shape
    own = (cloth & ~covers) | lapel
    hid = shape & ~own & (covers | sleeve)
    # (only his black cloth runs up: the red lining stays at the hem)
    c = continue_along(a, own & (K == 'dark'), hid, (0, 1), 1, edge & hid, black, signs=(1, -1))
    out['front_n'] = (own | hid, c)

    # The back: the far panel and the lining; behind what hides it, his cloth tiled across each row.
    far = take(box(BACK_FAR), ('dark', 'red', 'line')) & ~out['lapel_f'][0] & ~out['sleeve_f'][0]
    # (the dark warm line round his far arm and fist is the arm's, not the coat's)
    far &= ~(near8(K == 'skin') & (rows < 66))
    between = box(BACK_BETWEEN) & (K == 'red')
    between |= box(BACK_BETWEEN) & line & near4(between)
    for b in BOOT_F + [GLOVE_F]:
        far &= ~box(b)
    own = far | between
    # Behind the trousers the cloth is the coat's shaded inside: his commonest coat black; from where
    # his lining shows at the hem down, his lining and cloth of the row laid across it again.
    hid = box(BACK_HIDDEN) & ~own & ~bg
    c = tile_rows(a, own & ~line, hid & (rows >= LINING_FROM + 4))
    c[hid & (rows < LINING_FROM + 4)] = commonest(a, own & (K == 'dark'))
    out['back'] = (own | hid, c)

    # The boots: the shaft above the foot turns with the shin, the foot stays flat.
    boot_n = lined(box(BOOT_N), ('dark', 'skin'))
    boot_f = np.logical_or.reduce([lined(box(b), ('dark', 'skin')) for b in BOOT_F])
    for s, m in (('N', boot_n), ('F', boot_f)):
        top = BOOT_FOOT_FROM[s]
        shaft = m & (rows < top)
        c = a.copy()
        if s == 'N':
            # His near shaft runs on up the shin under the coat (his two rows above the foot again and
            # again), its sides and top on his line.
            knee, ankle = his_joint('kneeN', 'N'), his_joint('ankleN', 'N')
            up = band(ankle, knee, BOOT_N_HALF, H, W, y_from=BOOT_N_TOP, y_to=BOOT_N[1] - 1)
            hidden = up & ~shaft
            e = edge4(up | shaft) & hidden
            c = continue_along(a, shaft & ~line, hidden, (knee[0] - ankle[0], knee[1] - ankle[1]), 2, e, black, signs=(-1,))
            shaft = shaft | hidden
        # the shaft runs on two rows under the foot's top (his two rows above it again), so the shin
        # can turn without a gap at the ankle
        run = np.zeros((H, W), bool)
        for x in np.nonzero(shaft[top - 1])[0]:
            for k in (0, 1):
                run[top + k, x] = True
                c[top + k, x] = c[top - 2 + k, x]
        out['boot_' + s.lower() + '_shin'] = (shaft | run, c)
        out['boot_' + s.lower() + '_foot'] = (m & (rows >= top), a.copy())

    # The glove: his cuff, its glint and its line (his fist below is bare: its skin stays ours).
    g = box(GLOVE_F)
    warm = (a[..., 0] - a[..., 2]) > 45
    out['glove_f'] = (g & ~bg & (np.isin(K, ('dark', 'line')) | ((K == 'skin') & ~warm)), a.copy())
    return out


def compose(pieces_, names, box=(10, 20, 76, 100)):
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


def study(a, pieces_, names, path, box=(10, 20, 76, 100)):
    """His picture beside the pieces lifted out of it (drawn back to front in `names` order), at 8x."""
    x0, y0, x1, y1 = box
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((y1 - y0, x1 - x0, 1), 255, np.uint8)], axis=2)
    gap = np.zeros((y1 - y0, 2, 4), np.uint8)
    save(np.concatenate([his, gap, compose(pieces_, names, box)], axis=1), path)
